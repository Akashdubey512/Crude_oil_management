"""
Phase 18 Test Suite — Brief Gaps Resolution
Validates:
  1. Supplier Exposure Risk Service & GET /api/risk/suppliers endpoint (per-supplier risk overlay)
  2. Cascading Economic & GDP Impact Engine & POST /api/scenarios/simulate (refining -> price -> GDP cascade)
"""

import pytest
from fastapi.testclient import TestClient
from src.api.main import app
from src.risk.supplier_risk import compute_supplier_risk_exposures, METHODOLOGY_TEXT as SUPPLIER_METHODOLOGY
from src.risk.economic_impact import calculate_cascading_economic_impact, ELASTICITY_FORMULA_TEXT, METHODOLOGY_TEXT as ECON_METHODOLOGY

client = TestClient(app)


# ─── 1. Supplier Exposure Tests ───────────────────────────────────────────────

def test_supplier_risk_exposure_calculation():
    """Tests supplier risk exposure calculation and response to corridor risk changes."""
    # Baseline corridor scores: all LOW (10.0)
    base_scores = {"HORMUZ": 10.0, "SUEZ": 10.0, "BAB_EL_MANDEB": 10.0, "RED_SEA": 10.0}
    res_base = compute_supplier_risk_exposures(base_scores)

    assert "suppliers" in res_base
    assert res_base["methodology"] == SUPPLIER_METHODOLOGY
    suppliers_base = {s["supplier_country"]: s["exposure_score"] for s in res_base["suppliers"]}
    assert suppliers_base["Iraq"] == 10.0

    # High HORMUZ risk score (80.0)
    high_hormuz_scores = {"HORMUZ": 80.0, "SUEZ": 10.0, "BAB_EL_MANDEB": 10.0, "RED_SEA": 10.0}
    res_high = compute_supplier_risk_exposures(high_hormuz_scores)
    suppliers_high = {s["supplier_country"]: s["exposure_score"] for s in res_high["suppliers"]}

    # Iraq (100% Hormuz) exposure score should jump from 10.0 to 80.0
    assert suppliers_high["Iraq"] == 80.0
    # Saudi Arabia (85% Hormuz, 15% Red Sea) score should be 0.85*80 + 0.15*10 = 69.5
    assert abs(suppliers_high["Saudi Arabia"] - 69.5) < 0.01
    # Russia (0% Hormuz) score should stay at 10.0
    assert suppliers_high["Russia"] == 10.0


def test_supplier_risk_api_endpoint():
    """Tests GET /api/risk/suppliers API endpoint."""
    response = client.get("/api/risk/suppliers")
    assert response.status_code == 200

    data = response.json()
    assert "suppliers" in data
    assert "methodology" in data
    assert len(data["suppliers"]) >= 5
    assert data["methodology"] == SUPPLIER_METHODOLOGY

    item = data["suppliers"][0]
    assert "supplier_country" in item
    assert "import_share_pct" in item
    assert "exposure_score" in item
    assert "risk_level" in item


# ─── 2. Cascading GDP & Economic Impact Tests ─────────────────────────────────

def test_cascading_economic_impact_calculation():
    """Tests cascading economic impact calculations and scaling behavior."""
    # Baseline scenario (no price shock, no transit drop)
    res_base = calculate_cascading_economic_impact(
        brent_baseline_usd=75.0,
        brent_simulated_usd=75.0,
        tanker_transit_multiplier=1.0,
        infrastructure_disruption=False,
    )
    assert res_base["daily_import_cost_delta_usd_m"] == 0.0
    assert res_base["annualized_import_bill_delta_usd_b"] == 0.0
    assert res_base["estimated_gdp_growth_impact_pct"] == 0.0
    assert res_base["elasticity_formula"] == ELASTICITY_FORMULA_TEXT
    assert res_base["methodology_note"] == ECON_METHODOLOGY

    # Moderate shock: 20% price increase ($75 -> $90), 20% transit drop
    res_mod = calculate_cascading_economic_impact(
        brent_baseline_usd=75.0,
        brent_simulated_usd=90.0,
        tanker_transit_multiplier=0.8,
        infrastructure_disruption=False,
    )
    assert res_mod["refining_throughput_drop_pct"] == 20.0
    assert res_mod["daily_import_cost_delta_usd_m"] > 0
    assert res_mod["annualized_import_bill_delta_usd_b"] > 0
    assert res_mod["estimated_gdp_growth_impact_pct"] < 0.0  # Negative GDP impact

    # Severe shock: 50% price increase ($75 -> $112.5), 50% transit drop + infrastructure disruption
    res_sev = calculate_cascading_economic_impact(
        brent_baseline_usd=75.0,
        brent_simulated_usd=112.5,
        tanker_transit_multiplier=0.5,
        infrastructure_disruption=True,
    )
    assert res_sev["refining_throughput_drop_pct"] == 65.0  # 50% transit + 15% infra
    # Severe shock GDP impact magnitude must be greater than moderate shock
    assert abs(res_sev["estimated_gdp_growth_impact_pct"]) > abs(res_mod["estimated_gdp_growth_impact_pct"])


def test_scenario_simulation_economic_impact_integration():
    """Integration test: verifies /api/scenarios/simulate returns economic_impact payload."""
    payload = {
        "corridor_id": "HORMUZ",
        "tanker_transit_multiplier": 0.7,  # 30% drop
        "gpr_multiplier": 2.0,
        "brent_price_multiplier": 1.3,     # 30% price surge
        "infrastructure_disruption": True,
    }
    response = client.post("/api/scenarios/simulate", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert "economic_impact" in data
    econ = data["economic_impact"]
    assert econ is not None
    assert econ["daily_import_cost_delta_usd_m"] > 0
    assert econ["annualized_import_bill_delta_usd_b"] > 0
    assert econ["estimated_gdp_growth_impact_pct"] < 0
    assert econ["refining_throughput_drop_pct"] == 45.0  # 30% transit + 15% infra
    assert "elasticity_formula" in econ
    assert "methodology_note" in econ
