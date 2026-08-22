"""
Phase 10 Test Suite — Red Sea Dedicated ML, Data Fusion & Production Integration

Validates:
  - Red Sea data integration (corridor daily traffic has RED_SEA)
  - Red Sea feature matrix (RED_SEA is in model_features.csv)
  - Red Sea models are trained and recorded in model_registry.json
  - Red Sea explanations (SHAP files exist for RED_SEA)
  - GET /api/risk/RED_SEA returns a valid, schema-compliant risk level and factors
  - GET /api/models/evaluation?corridor=RED_SEA split validation/test outputs
  - GET /api/models/drift?corridor=RED_SEA data drift outputs
  - GET /api/models/health?corridor=RED_SEA model health outputs
"""

import os
import json
import pytest
import pandas as pd
from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)

PROCESSED_DIR = r"D:\hackathon project\energy-resilience\data\processed"
MANIFEST_DIR = r"D:\hackathon project\energy-resilience\data\manifests"
REPORTS_DIR = r"D:\hackathon project\energy-resilience\reports\model_evaluation"


class TestPhase10RedSea:
    def test_traffic_data_has_red_sea(self):
        """Verify that corridor_traffic_daily.csv contains RED_SEA corridor records."""
        path = os.path.join(PROCESSED_DIR, "corridor_traffic_daily.csv")
        assert os.path.exists(path), f"{path} is missing"
        df = pd.read_csv(path)
        assert "RED_SEA" in df["corridor_id"].unique()
        
    def test_anomalies_data_has_red_sea(self):
        """Verify that corridor_anomalies.csv contains RED_SEA corridor records."""
        path = os.path.join(PROCESSED_DIR, "corridor_anomalies.csv")
        assert os.path.exists(path), f"{path} is missing"
        df = pd.read_csv(path)
        assert "RED_SEA" in df["corridor_id"].unique()

    def test_features_has_red_sea(self):
        """Verify that model_features.csv contains RED_SEA features and target labels."""
        path = os.path.join(PROCESSED_DIR, "model_features.csv")
        assert os.path.exists(path), f"{path} is missing"
        df = pd.read_csv(path)
        assert "RED_SEA" in df["corridor_id"].unique()
        df_rs = df[df["corridor_id"] == "RED_SEA"]
        assert len(df_rs) > 0
        # Should have target labels
        assert "is_disrupted" in df_rs.columns
        assert df_rs["is_disrupted"].sum() > 0, "RED_SEA must have positive disruption events"

    def test_model_registry_has_red_sea(self):
        """Verify that model_registry.json contains entries for RED_SEA models."""
        path = os.path.join(MANIFEST_DIR, "model_registry.json")
        assert os.path.exists(path), f"{path} is missing"
        with open(path, "r") as f:
            registry = json.load(f)
        rs_keys = [k for k in registry.keys() if "RED_SEA" in k]
        assert len(rs_keys) > 0, "No model registry entries found for RED_SEA"

    def test_explainability_files_exist_for_red_sea(self):
        """Verify that explanation JSON files exist for RED_SEA models."""
        for m in ["xgboost", "randomforest", "logisticregression"]:
            path = os.path.join(REPORTS_DIR, f"explanation_{m}_red_sea.json")
            assert os.path.exists(path), f"{path} is missing"
            with open(path, "r") as f:
                data = json.load(f)
            assert data["corridor_id"] == "RED_SEA"
            assert "global_importance" in data
            assert len(data["global_importance"]) > 0

    def test_api_risk_red_sea(self):
        """Verify that GET /api/risk/RED_SEA returns a valid response."""
        r = client.get("/api/risk/RED_SEA")
        assert r.status_code == 200
        body = r.json()
        assert body["corridor"] == "RED_SEA"
        assert body["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
        assert body["risk_score"] is not None
        assert 0.0 <= body["probability"] <= 1.0
        assert "risk_decomposition" in body
        assert "top_factors" in body
        assert len(body["top_factors"]) > 0
        assert "limitations" in body
        # Ensure it has our Red Sea specific limitations
        assert any("RED_SEA" in limit for limit in body["limitations"])

    def test_api_evaluation_red_sea(self):
        """Verify that GET /api/models/evaluation?corridor=RED_SEA returns valid metrics."""
        r = client.get("/api/models/evaluation?corridor=RED_SEA&split=test")
        assert r.status_code == 200
        body = r.json()
        if body.get("status") != "UNAVAILABLE":
            assert "metrics" in body
            assert "sample_count" in body
            assert body["sample_count"] > 0
            
    def test_api_drift_red_sea(self):
        """Verify that GET /api/models/drift?corridor=RED_SEA returns data drift assessment."""
        r = client.get("/api/models/drift?corridor=RED_SEA")
        assert r.status_code == 200
        body = r.json()
        if body.get("status") != "UNAVAILABLE":
            assert "overall_drift" in body
            assert "features" in body
            
    def test_api_health_red_sea(self):
        """Verify that GET /api/models/health?corridor=RED_SEA returns model health report."""
        r = client.get("/api/models/health?corridor=RED_SEA")
        assert r.status_code == 200
        body = r.json()
        assert "status" in body
        assert body["status"] in ["GOOD", "DEGRADED", "CRITICAL"]
        assert "recommendations" in body
