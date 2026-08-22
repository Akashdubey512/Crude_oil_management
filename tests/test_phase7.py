"""
Phase 7 Test Suite — Hardened API Observability & Explainability

Validates:
  - GET /api/prices schema, fields, and history length
  - GET /api/data-status list structure, 11 sources, and statuses
  - GET /api/models/explainability for HORMUZ, SUEZ, and RED_SEA (404)
  - Parameter validation and error code consistency
"""

import pytest
from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)


# ─── Brent Price API ──────────────────────────────────────────────────────────
class TestPricesAPI:
    def test_prices_endpoint_returns_200(self):
        r = client.get("/api/prices")
        assert r.status_code == 200

    def test_prices_schema_fields(self):
        r = client.get("/api/prices")
        body = r.json()
        
        assert "latest_price" in body
        assert "latest_date" in body
        assert "daily_return" in body
        assert "volatility_7d" in body
        assert "volatility_28d" in body
        assert "data_freshness" in body
        assert "source" in body
        assert "historical_prices" in body
        
        assert isinstance(body["latest_price"], float)
        assert isinstance(body["historical_prices"], list)
        assert len(body["historical_prices"]) > 0

    def test_prices_with_limit(self):
        r = client.get("/api/prices?limit=10")
        assert r.status_code == 200
        body = r.json()
        assert len(body["historical_prices"]) <= 10


# ─── Data Status & Observability ──────────────────────────────────────────────
class TestDataStatusAPI:
    def test_data_status_returns_200(self):
        r = client.get("/api/data-status")
        assert r.status_code == 200

    def test_data_status_list_structure(self):
        r = client.get("/api/data-status")
        body = r.json()
        assert isinstance(body, list)
        assert len(body) == 11  # 11 data feeds monitored

    def test_data_status_fields(self):
        r = client.get("/api/data-status")
        for record in r.json():
            assert "source_name" in record
            assert "latest_date" in record
            assert "status" in record
            assert "source_url" in record
            assert "limitation" in record
            assert record["status"] in ["FRESH", "STALE", "UNAVAILABLE", "PARTIAL"]


# ─── Model Explainability ─────────────────────────────────────────────────────
class TestExplainabilityAPI:
    @pytest.mark.parametrize("corridor", ["HORMUZ", "BAB_EL_MANDEB", "SUEZ", "RED_SEA"])
    def test_explainability_returns_200(self, corridor):
        r = client.get(f"/api/models/explainability?corridor_id={corridor}")
        assert r.status_code == 200
        body = r.json()
        assert body["corridor_id"] == corridor
        assert "model_name" in body
        assert "global_importance" in body
        assert isinstance(body["global_importance"], list)

    def test_red_sea_explainability_returns_200(self):
        # RED_SEA now has a trained model and explainability
        r = client.get("/api/models/explainability?corridor_id=RED_SEA")
        assert r.status_code == 200
        body = r.json()
        assert body["corridor_id"] == "RED_SEA"
        assert len(body["global_importance"]) > 0

    def test_invalid_corridor_explainability_returns_404(self):
        r = client.get("/api/models/explainability?corridor_id=MALACCA")
        assert r.status_code == 404
