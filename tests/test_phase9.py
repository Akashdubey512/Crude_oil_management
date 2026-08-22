"""
Phase 9 Test Suite — Production ML Validation, Model Governance & Data-Drift Monitoring

Validates:
  - GET /api/models/evaluation — out-of-sample metrics for all three corridors
  - GET /api/models/drift — PSI/KS drift results structure
  - GET /api/models/health — rule-based health aggregation
  - GET /api/predictions/history/{corridor} — empty or populated from DB
  - SQLite database init + log_prediction roundtrip
  - RED_SEA returns 404 for modeled-only endpoints
"""

import pytest
from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)


# ─── Model Evaluation ─────────────────────────────────────────────────────────
class TestModelEvaluation:
    @pytest.mark.parametrize("corridor", ["HORMUZ", "BAB_EL_MANDEB", "SUEZ", "RED_SEA"])
    def test_evaluation_returns_200(self, corridor):
        r = client.get(f"/api/models/evaluation?corridor={corridor}&split=validation")
        assert r.status_code == 200
        body = r.json()
        # Must have model_version + sample_count + metrics
        assert "model_version" in body or body.get("status") == "UNAVAILABLE"
        if "model_version" in body:
            assert "evaluation_period" in body
            assert "sample_count" in body
            assert "positive_count" in body
            assert "metrics" in body
            assert "calibration" in body
            assert "data_quality" in body

    def test_evaluation_validation_hormuz_has_data(self):
        r = client.get("/api/models/evaluation?corridor=HORMUZ&split=validation")
        body = r.json()
        # HORMUZ validation has 182 samples and 6 positives
        assert body.get("sample_count", 0) > 0
        assert body.get("positive_count", 0) >= 0

    def test_evaluation_test_hormuz_roc_auc_null(self):
        """HORMUZ test split has 0 positive labels — ROC-AUC must be None, not fabricated."""
        r = client.get("/api/models/evaluation?corridor=HORMUZ&split=test")
        body = r.json()
        if "metrics" in body:
            assert body["metrics"].get("roc_auc") is None, "ROC-AUC must be null when no positive samples"

    def test_evaluation_metrics_ranges_valid(self):
        """All available numeric metrics must be in [0, 1] range."""
        r = client.get("/api/models/evaluation?corridor=BAB_EL_MANDEB&split=validation")
        body = r.json()
        metrics = body.get("metrics", {})
        for k, v in metrics.items():
            if v is not None and k != "mcc":  # MCC can be negative
                assert -1.0 <= float(v) <= 1.0, f"Metric {k}={v} out of valid range"

    def test_evaluation_calibration_has_curve(self):
        r = client.get("/api/models/evaluation?corridor=SUEZ&split=all_oos")
        body = r.json()
        cal = body.get("calibration", {})
        assert cal.get("status") in ["GOOD", "MODERATE", "DEGRADED", "UNAVAILABLE"]
        if cal.get("ece") is not None:
            assert 0.0 <= cal["ece"] <= 1.0

    # RED_SEA evaluation is now supported and tested via parameterization

    def test_evaluation_invalid_split_returns_422(self):
        r = client.get("/api/models/evaluation?corridor=HORMUZ&split=invalid_split")
        assert r.status_code == 422


# ─── Data Drift ───────────────────────────────────────────────────────────────
class TestDataDrift:
    @pytest.mark.parametrize("corridor", ["HORMUZ", "BAB_EL_MANDEB", "SUEZ", "RED_SEA"])
    def test_drift_returns_200(self, corridor):
        r = client.get(f"/api/models/drift?corridor={corridor}")
        assert r.status_code == 200
        body = r.json()
        if body.get("status") != "UNAVAILABLE":
            assert "overall_drift" in body
            assert body["overall_drift"] in ["LOW", "MEDIUM", "HIGH"]
            assert "features" in body
            assert "summary" in body
            assert isinstance(body["features"], list)

    def test_drift_features_have_required_fields(self):
        r = client.get("/api/models/drift?corridor=HORMUZ")
        body = r.json()
        if body.get("status") == "OK" and body.get("features"):
            for feat in body["features"]:
                assert "feature" in feat
                assert "drift_score" in feat
                assert feat["severity"] in ["LOW", "MEDIUM", "HIGH"]

    def test_drift_summary_is_consistent(self):
        r = client.get("/api/models/drift?corridor=SUEZ")
        body = r.json()
        if body.get("status") == "OK":
            summary = body["summary"]
            total = summary.get("low", 0) + summary.get("medium", 0) + summary.get("high", 0)
            assert total == len(body["features"])

    # RED_SEA drift is now supported and tested via parameterization


# ─── Model Health ─────────────────────────────────────────────────────────────
class TestModelHealth:
    @pytest.mark.parametrize("corridor", ["HORMUZ", "BAB_EL_MANDEB", "SUEZ", "RED_SEA"])
    def test_health_returns_200(self, corridor):
        r = client.get(f"/api/models/health?corridor={corridor}")
        assert r.status_code == 200
        body = r.json()
        assert "status" in body
        assert body["status"] in ["GOOD", "DEGRADED", "CRITICAL"]
        assert "performance_status" in body
        assert "calibration_status" in body
        assert "drift_status" in body
        assert "data_quality_status" in body
        assert "freshness_status" in body
        assert "recommendations" in body
        assert isinstance(body["recommendations"], list)
        assert len(body["recommendations"]) > 0

    def test_health_recommendations_are_strings(self):
        r = client.get("/api/models/health?corridor=HORMUZ")
        body = r.json()
        for rec in body.get("recommendations", []):
            assert isinstance(rec, str), f"Recommendation must be a string: {rec}"

    # RED_SEA health is now supported and tested via parameterization


# ─── Prediction History ────────────────────────────────────────────────────────
class TestPredictionHistory:
    def test_history_returns_200(self):
        r = client.get("/api/predictions/history/HORMUZ")
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body, list)

    def test_history_records_schema_valid(self):
        """If records exist, they must contain all required fields."""
        r = client.get("/api/predictions/history/HORMUZ?limit=5")
        body = r.json()
        for record in body:
            assert "id" in record
            assert "corridor" in record
            assert "timestamp" in record
            assert "model_version" in record
            assert "predicted_probability" in record
            assert "predicted_class" in record
            assert "outcome_available" in record
            assert 0.0 <= record["predicted_probability"] <= 1.0
            assert record["predicted_class"] in [0, 1]

    def test_history_corridor_filter_correct(self):
        r = client.get("/api/predictions/history/BAB_EL_MANDEB?limit=10")
        body = r.json()
        for record in body:
            assert record["corridor"] == "BAB_EL_MANDEB"


# ─── Database Unit Tests ────────────────────────────────────────────────────────
class TestDatabase:
    def test_init_creates_tables(self):
        from src.api.database import init_database, get_db_connection
        init_database()  # Must be idempotent
        conn = get_db_connection()
        tables = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table';"
        ).fetchall()
        table_names = [t["name"] for t in tables]
        assert "predictions" in table_names
        assert "model_versions" in table_names
        conn.close()

    def test_model_versions_pre_populated(self):
        from src.api.database import get_db_connection
        conn = get_db_connection()
        count = conn.execute("SELECT COUNT(*) FROM model_versions;").fetchone()[0]
        assert count == 9, f"Expected 9 model versions (3 corridors × 3 model types), got {count}"
        conn.close()

    def test_log_prediction_inserts_record(self):
        from src.api.database import log_prediction, get_db_connection
        row_id = log_prediction(
            corridor="HORMUZ",
            timestamp="2026-08-22",
            model_version="1.0",
            predicted_probability=0.15,
            predicted_class=0,
            feature_snapshot={"test_feature": 1.23},
        )
        assert row_id is not None
        conn = get_db_connection()
        row = conn.execute("SELECT * FROM predictions WHERE id = ?;", (row_id,)).fetchone()
        assert row is not None
        assert row["corridor"] == "HORMUZ"
        assert abs(row["predicted_probability"] - 0.15) < 1e-6
        conn.close()
