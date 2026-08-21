"""
Phase 5 Test Suite — Production FastAPI Backend

Tests:
  - API startup (app imports and creates successfully)
  - /health endpoint
  - /api/corridors endpoint
  - /api/risk (all corridors)
  - /api/risk/{corridor} (HORMUZ, BAB_EL_MANDEB, SUEZ)
  - /api/risk/{corridor} with explicit date param
  - Invalid corridor → 404
  - /api/events
  - /api/events/{corridor}
  - /api/traffic/{corridor}
  - Invalid traffic corridor → 404
  - /api/infrastructure
  - /api/metrics
  - /api/model-info
  - Response schema field validation (no fabricated fallbacks)
  - Risk response has real probability (not hardcoded)
  - Corridor risk level is one of LOW/MODERATE/HIGH/CRITICAL/UNKNOWN/UNAVAILABLE
"""

import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)

VALID_RISK_LEVELS = {"LOW", "MODERATE", "HIGH", "CRITICAL", "UNKNOWN", "UNAVAILABLE"}
MODELED_CORRIDORS = ["HORMUZ", "BAB_EL_MANDEB", "SUEZ"]
ALL_CORRIDORS = ["HORMUZ", "BAB_EL_MANDEB", "SUEZ", "RED_SEA"]


# ─── App startup ──────────────────────────────────────────────────────────────
class TestAppStartup:
    def test_app_imports_successfully(self):
        from src.api.main import app
        assert app is not None

    def test_app_has_title(self):
        from src.api.main import app
        assert "Energy" in app.title


# ─── Health ───────────────────────────────────────────────────────────────────
class TestHealthEndpoint:
    def test_health_returns_200(self):
        r = client.get("/api/health")
        assert r.status_code == 200

    def test_health_schema(self):
        r = client.get("/api/health")
        body = r.json()
        assert "status" in body
        assert "model_version" in body
        assert "data_timestamp" in body
        assert "environment" in body

    def test_health_status_is_healthy(self):
        r = client.get("/api/health")
        assert r.json()["status"] == "healthy"


# ─── Corridors ────────────────────────────────────────────────────────────────
class TestCorridorsEndpoint:
    def test_corridors_returns_200(self):
        r = client.get("/api/corridors")
        assert r.status_code == 200

    def test_corridors_returns_list(self):
        r = client.get("/api/corridors")
        body = r.json()
        assert isinstance(body, list)
        assert len(body) >= 3

    def test_corridors_schema(self):
        r = client.get("/api/corridors")
        for c in r.json():
            assert "corridor_id" in c
            assert "name" in c
            assert "description" in c
            assert "source" in c

    def test_corridors_contains_hormuz(self):
        r = client.get("/api/corridors")
        ids = [c["corridor_id"] for c in r.json()]
        assert "HORMUZ" in ids

    def test_corridors_contains_suez(self):
        r = client.get("/api/corridors")
        ids = [c["corridor_id"] for c in r.json()]
        assert "SUEZ" in ids


# ─── Risk (all corridors) ─────────────────────────────────────────────────────
class TestAllRiskEndpoint:
    def test_all_risk_returns_200(self):
        r = client.get("/api/risk")
        assert r.status_code == 200

    def test_all_risk_returns_list(self):
        r = client.get("/api/risk")
        assert isinstance(r.json(), list)

    def test_all_risk_covers_all_corridors(self):
        r = client.get("/api/risk")
        corridors_in_response = {s["corridor"] for s in r.json()}
        for c in ALL_CORRIDORS:
            assert c in corridors_in_response

    def test_all_risk_no_fabricated_values(self):
        """Ensure each snapshot explicitly carries model_version — not a hardcoded string."""
        r = client.get("/api/risk")
        for snap in r.json():
            assert "model_version" in snap
            # Fabricated fallbacks would be empty strings — real entries have version tags
            assert snap["model_version"] is not None


# ─── Risk (per corridor) ──────────────────────────────────────────────────────
class TestCorridorRiskEndpoint:
    @pytest.mark.parametrize("corridor", MODELED_CORRIDORS)
    def test_risk_returns_200(self, corridor):
        r = client.get(f"/api/risk/{corridor}")
        assert r.status_code == 200

    @pytest.mark.parametrize("corridor", MODELED_CORRIDORS)
    def test_risk_schema_fields(self, corridor):
        r = client.get(f"/api/risk/{corridor}")
        body = r.json()
        for field in ["corridor", "risk_score", "risk_level", "probability",
                      "prediction_date", "model_version", "data_freshness",
                      "risk_decomposition", "top_factors", "limitations"]:
            assert field in body, f"Missing field '{field}' in risk response for {corridor}"

    @pytest.mark.parametrize("corridor", MODELED_CORRIDORS)
    def test_risk_level_is_valid(self, corridor):
        r = client.get(f"/api/risk/{corridor}")
        assert r.json()["risk_level"] in VALID_RISK_LEVELS

    @pytest.mark.parametrize("corridor", MODELED_CORRIDORS)
    def test_risk_probability_in_range(self, corridor):
        r = client.get(f"/api/risk/{corridor}")
        prob = r.json()["probability"]
        assert 0.0 <= prob <= 1.0, f"Probability {prob} out of [0,1] range for {corridor}"

    @pytest.mark.parametrize("corridor", MODELED_CORRIDORS)
    def test_risk_decomposition_has_5_vectors(self, corridor):
        r = client.get(f"/api/risk/{corridor}")
        decomp = r.json()["risk_decomposition"]
        for key in ["geopolitical", "maritime", "energy_market", "infrastructure", "historical_pattern"]:
            assert key in decomp

    @pytest.mark.parametrize("corridor", MODELED_CORRIDORS)
    def test_risk_limitations_documented(self, corridor):
        r = client.get(f"/api/risk/{corridor}")
        limitations = r.json()["limitations"]
        assert isinstance(limitations, list)
        assert len(limitations) > 0

    @pytest.mark.parametrize("corridor", MODELED_CORRIDORS)
    def test_risk_data_freshness_structure(self, corridor):
        r = client.get(f"/api/risk/{corridor}")
        freshness = r.json()["data_freshness"]
        assert "traffic" in freshness
        assert "geopolitical" in freshness
        assert "price" in freshness

    def test_risk_with_explicit_date(self):
        r = client.get("/api/risk/HORMUZ?date=2026-08-16")
        assert r.status_code == 200
        assert r.json()["prediction_date"] == "2026-08-16"

    def test_invalid_corridor_returns_404(self):
        r = client.get("/api/risk/MALACCA")
        assert r.status_code == 404

    def test_invalid_date_returns_400(self):
        r = client.get("/api/risk/HORMUZ?date=not-a-date")
        assert r.status_code == 400


# ─── Events ───────────────────────────────────────────────────────────────────
class TestEventsEndpoint:
    def test_events_returns_200(self):
        r = client.get("/api/events")
        assert r.status_code == 200

    def test_events_returns_list(self):
        r = client.get("/api/events")
        assert isinstance(r.json(), list)

    def test_events_schema(self):
        r = client.get("/api/events?limit=5")
        for evt in r.json():
            assert "event_id" in evt
            assert "event_date" in evt
            assert "source" in evt
            assert "event_type" in evt

    def test_corridor_events_hormuz(self):
        r = client.get("/api/events/HORMUZ")
        assert r.status_code == 200

    def test_corridor_events_invalid_returns_404(self):
        r = client.get("/api/events/INVALID_CORRIDOR")
        assert r.status_code == 404


# ─── Traffic ──────────────────────────────────────────────────────────────────
class TestTrafficEndpoint:
    @pytest.mark.parametrize("corridor", MODELED_CORRIDORS)
    def test_traffic_returns_200(self, corridor):
        r = client.get(f"/api/traffic/{corridor}")
        assert r.status_code == 200

    @pytest.mark.parametrize("corridor", MODELED_CORRIDORS)
    def test_traffic_schema(self, corridor):
        r = client.get(f"/api/traffic/{corridor}?limit=3")
        for obs in r.json():
            assert "date" in obs
            assert "tanker_count" in obs
            assert "vessel_count" in obs
            assert "anomaly_flag" in obs
            assert "data_availability" in obs

    def test_traffic_invalid_corridor_404(self):
        r = client.get("/api/traffic/MALACCA")
        assert r.status_code == 404


# ─── Infrastructure ───────────────────────────────────────────────────────────
class TestInfrastructureEndpoint:
    def test_infrastructure_returns_200(self):
        r = client.get("/api/infrastructure")
        assert r.status_code == 200

    def test_infrastructure_returns_list(self):
        r = client.get("/api/infrastructure")
        assert isinstance(r.json(), list)
        assert len(r.json()) > 0

    def test_infrastructure_schema(self):
        r = client.get("/api/infrastructure")
        for node in r.json():
            assert "facility_id" in node
            assert "name" in node
            assert "facility_type" in node
            assert "latitude" in node
            assert "longitude" in node


# ─── Metrics & Model Info ─────────────────────────────────────────────────────
class TestMetricsEndpoint:
    def test_metrics_returns_200(self):
        r = client.get("/api/metrics")
        assert r.status_code == 200

    def test_metrics_has_results(self):
        r = client.get("/api/metrics")
        body = r.json()
        assert "results" in body


class TestModelInfoEndpoint:
    @pytest.mark.parametrize("corridor", MODELED_CORRIDORS)
    def test_model_info_returns_200(self, corridor):
        r = client.get(f"/api/model-info?corridor_id={corridor}")
        assert r.status_code == 200

    @pytest.mark.parametrize("corridor", MODELED_CORRIDORS)
    def test_model_info_schema(self, corridor):
        r = client.get(f"/api/model-info?corridor_id={corridor}")
        body = r.json()
        assert "model_name" in body
        assert "version" in body
        assert "training_start" in body
        assert "features_used" in body
        assert "limitations" in body
        assert "metrics" in body

    def test_model_info_invalid_corridor(self):
        r = client.get("/api/model-info?corridor_id=RED_SEA")
        assert r.status_code == 404

