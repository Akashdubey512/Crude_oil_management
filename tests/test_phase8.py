"""
Phase 8 Test Suite — Decision Intelligence & Scenario Simulation

Validates:
  - GET /api/risk/{corridor_id}/history endpoint & data structure
  - GET /api/risk/comparison endpoint
  - POST /api/scenarios/simulate endpoint using real model predictions, explanation generation, and recommendations
  - Red Sea remains UNKNOWN and raises error for simulation requests
"""

import pytest
from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)


# ─── Risk History API ─────────────────────────────────────────────────────────
class TestRiskHistoryAPI:
    @pytest.mark.parametrize("corridor", ["HORMUZ", "BAB_EL_MANDEB", "SUEZ"])
    def test_history_endpoint_returns_200(self, corridor):
        r = client.get(f"/api/risk/{corridor}/history")
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body, list)
        if len(body) > 0:
            item = body[0]
            assert "date" in item
            assert "corridor_id" in item
            assert "risk_probability" in item
            assert "risk_level" in item
            assert "is_disrupted" in item
            assert item["corridor_id"] == corridor
            assert 0.0 <= item["risk_probability"] <= 1.0
            assert item["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL", "UNKNOWN"]

    def test_history_with_date_range(self):
        r = client.get("/api/risk/HORMUZ/history?start_date=2026-01-01&end_date=2026-03-31")
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body, list)
        for item in body:
            assert item["date"] >= "2026-01-01"
            assert item["date"] <= "2026-03-31"

    def test_red_sea_history_returns_valid_list(self):
        """RED_SEA is now a modeled corridor (via Bab-el-Mandeb proxy) with stored predictions.
        The history endpoint returns accumulated prediction records from the DB.
        Phase 10 added RED_SEA as a first-class modeled corridor so an empty list is no longer expected."""
        r = client.get("/api/risk/RED_SEA/history")
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body, list)
        # RED_SEA has prediction history from Phase 10 onwards
        # Each item must contain the required schema fields
        for item in body:
            assert "corridor_id" in item
            assert item["corridor_id"] == "RED_SEA"
            assert "risk_level" in item
            assert item["risk_level"] in ("LOW", "MODERATE", "HIGH")

    def test_invalid_corridor_history_returns_404(self):
        r = client.get("/api/risk/INVALID_CORRIDOR/history")
        assert r.status_code == 404


# ─── Corridor Comparison API ──────────────────────────────────────────────────
class TestCorridorComparisonAPI:
    def test_comparison_endpoint_returns_200(self):
        r = client.get("/api/risk/comparison")
        assert r.status_code == 200
        body = r.json()
        assert "comparison_date" in body
        assert "items" in body
        assert isinstance(body["items"], list)
        assert len(body["items"]) == 4  # Hormuz, Bab-el-Mandeb, Suez, Red Sea

    def test_comparison_items_schema(self):
        r = client.get("/api/risk/comparison")
        body = r.json()
        
        red_sea_item = None
        for item in body["items"]:
            assert "corridor_id" in item
            assert "name" in item
            assert "risk_level" in item
            assert "probability" in item
            assert "risk_score" in item
            assert "primary_driver" in item
            assert "vessel_volume_status" in item
            assert "geopolitical_status" in item
            assert "data_freshness_traffic" in item
            
            if item["corridor_id"] == "RED_SEA":
                red_sea_item = item

        # Verify RED_SEA constraints (now fully modeled in Phase 10)
        assert red_sea_item is not None
        assert red_sea_item["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
        assert isinstance(red_sea_item["probability"], float)
        assert isinstance(red_sea_item["risk_score"], float)
        assert red_sea_item["vessel_volume_status"] in ["NORMAL", "DROP", "CONGESTION", "UNKNOWN"]
        assert red_sea_item["geopolitical_status"] in ["NORMAL", "ELEVATED", "UNKNOWN"]


# ─── Scenario Simulation API ──────────────────────────────────────────────────
class TestScenarioSimulationAPI:
    @pytest.mark.parametrize("corridor", ["HORMUZ", "BAB_EL_MANDEB", "SUEZ", "RED_SEA"])
    def test_simulation_success(self, corridor):
        payload = {
            "corridor_id": corridor,
            "tanker_transit_multiplier": 0.8,
            "gpr_multiplier": 1.5,
            "brent_price_multiplier": 1.1,
            "brent_volatility_multiplier": 1.5,
            "infrastructure_disruption": True
        }
        r = client.post("/api/scenarios/simulate", json=payload)
        assert r.status_code == 200
        body = r.json()
        
        assert body["corridor_id"] == corridor
        assert "baseline_probability" in body
        assert "baseline_risk_level" in body
        assert "simulated_probability" in body
        assert "simulated_risk_level" in body
        assert "probability_delta" in body
        assert "feature_mutations" in body
        assert "explanation" in body
        assert "recommendation" in body
        
        assert 0.0 <= body["baseline_probability"] <= 1.0
        assert 0.0 <= body["simulated_probability"] <= 1.0
        assert len(body["feature_mutations"]) > 0
        assert len(body["explanation"]) > 0
        assert len(body["recommendation"]) > 0

    def test_simulation_red_sea_success(self):
        payload = {
            "corridor_id": "RED_SEA",
            "tanker_transit_multiplier": 0.8,
        }
        r = client.post("/api/scenarios/simulate", json=payload)
        # Should succeed because Red Sea is now fully modeled in Phase 10
        assert r.status_code == 200
        body = r.json()
        assert body["corridor_id"] == "RED_SEA"
        assert body["simulated_probability"] is not None

    def test_simulation_mutates_correctly(self):
        payload = {
            "corridor_id": "HORMUZ",
            "tanker_transit_multiplier": 0.5,
        }
        r = client.post("/api/scenarios/simulate", json=payload)
        assert r.status_code == 200
        body = r.json()
        mutations = body["feature_mutations"]
        assert "tanker_count" in mutations
        assert mutations["tanker_count"]["simulated"] == mutations["tanker_count"]["baseline"] * 0.5
        assert mutations["anomaly_flag"]["simulated"] == 1
        assert mutations["anomaly_type_drop"]["simulated"] == 1
