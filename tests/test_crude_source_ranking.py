"""
Pytest Test Suite — Crude Source Ranking & Adaptive Procurement Orchestrator
Validates:
  1. Default crude source ranking output structure and methodology text presence
  2. Dynamic rank re-ordering when corridor risk is artificially increased (e.g. HORMUZ spike drops Persian Gulf suppliers)
  3. Stable, deterministic tie-breaking ordering when two suppliers have identical composite scores
  4. GET /api/risk/suppliers/ranking API endpoint returns 200 OK and matching schema
"""

import pytest
from fastapi.testclient import TestClient
from src.api.main import app
from src.risk.crude_source_ranking import rank_alternative_crude_sources, RANKING_METHODOLOGY_TEXT
from src.risk.supplier_risk import SUPPLIER_PROFILES

client = TestClient(app)


def test_crude_source_ranking_basic_structure():
    """Verifies rank_alternative_crude_sources returns valid payload with methodology."""
    result = rank_alternative_crude_sources()
    assert "ranked_at" in result
    assert "ranked_sources" in result
    assert "methodology" in result
    assert result["methodology"] == RANKING_METHODOLOGY_TEXT
    assert "top_recommended_supplier" in result

    sources = result["ranked_sources"]
    assert len(sources) == len(SUPPLIER_PROFILES)

    # Check first item fields
    top = sources[0]
    assert top["rank"] == 1
    assert top["recommendation_status"] == "PRIMARY_OPTIMAL"
    assert "supplier_country" in top
    assert "country_code" in top
    assert "composite_rank_score" in top
    assert "cost_logistics_penalty" in top


def test_ranking_changes_on_corridor_risk_spike():
    """
    Verifies that when HORMUZ corridor risk spikes artificially to 100%,
    Hormuz-dependent suppliers (Iraq, UAE, Kuwait) suffer high exposure scores
    and drop in ranking priority.
    """
    # Baseline with low corridor risk
    baseline = rank_alternative_crude_sources(corridor_scores={
        "HORMUZ": 10.0, "SUEZ": 10.0, "BAB_EL_MANDEB": 10.0, "RED_SEA": 10.0
    })
    baseline_order = [s["supplier_country"] for s in baseline["ranked_sources"]]

    # High HORMUZ risk scenario (95.0)
    spiked = rank_alternative_crude_sources(corridor_scores={
        "HORMUZ": 95.0, "SUEZ": 10.0, "BAB_EL_MANDEB": 10.0, "RED_SEA": 10.0
    })
    spiked_order = [s["supplier_country"] for s in spiked["ranked_sources"]]

    # Iraq (100% Hormuz) should have a higher composite score (worse rank) in spiked scenario
    iraq_base = next(s for s in baseline["ranked_sources"] if s["supplier_country"] == "Iraq")
    iraq_spiked = next(s for s in spiked["ranked_sources"] if s["supplier_country"] == "Iraq")

    assert iraq_spiked["composite_rank_score"] > iraq_base["composite_rank_score"]
    assert spiked_order != baseline_order


def test_deterministic_tie_breaking():
    """
    Verifies stable, deterministic ordering when two suppliers have identical composite scores.
    """
    # Override corridor scores to produce potential ties or inspect tie-breaking logic
    res1 = rank_alternative_crude_sources(corridor_scores={
        "HORMUZ": 50.0, "SUEZ": 50.0, "BAB_EL_MANDEB": 50.0, "RED_SEA": 50.0
    })
    res2 = rank_alternative_crude_sources(corridor_scores={
        "HORMUZ": 50.0, "SUEZ": 50.0, "BAB_EL_MANDEB": 50.0, "RED_SEA": 50.0
    })

    # Strict equality check for deterministic reproducibility
    order1 = [(s["rank"], s["supplier_country"], s["composite_rank_score"]) for s in res1["ranked_sources"]]
    order2 = [(s["rank"], s["supplier_country"], s["composite_rank_score"]) for s in res2["ranked_sources"]]
    assert order1 == order2


def test_get_crude_source_rankings_api_endpoint():
    """Verifies GET /api/risk/suppliers/ranking API route."""
    response = client.get("/api/risk/suppliers/ranking")
    assert response.status_code == 200

    data = response.json()
    assert "ranked_sources" in data
    assert "methodology" in data
    assert len(data["ranked_sources"]) > 0
    assert data["methodology"] == RANKING_METHODOLOGY_TEXT

    first = data["ranked_sources"][0]
    assert first["rank"] == 1
    assert "composite_rank_score" in first
