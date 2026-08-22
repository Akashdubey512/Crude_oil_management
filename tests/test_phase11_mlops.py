"""
Phase 11 MLOps Lifecycle Integration Tests
"""

import os
import json
import pytest
import shutil
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient
from src.api.main import app

from src.models.model_registry import (
    register_model, update_model_status, get_champion_model, _load_registry,
    compute_schema_hash, compute_config_hash, hash_file
)
from src.api.services.model_promotion import (
    evaluate_promotion_policy, promote_challenger_to_champion, rollback_to_version
)
from src.api.services.retrain_recommendation import check_retrain_status
from src.api.services.model_monitoring import get_production_monitoring_diagnostics
from src.features.feature_pipeline import FEATURE_COLS

client = TestClient(app)

@pytest.fixture(scope="module")
def mock_mlops_data():
    """Builds a temporary model registry and folder for MLOps test cases."""
    temp_registry_dir = r"D:\hackathon project\energy-resilience\data\manifests"
    os.makedirs(temp_registry_dir, exist_ok=True)
    
    # Save a backup of the current registry if it exists
    backup_path = os.path.join(temp_registry_dir, "model_registry.json.bak")
    original_path = os.path.join(temp_registry_dir, "model_registry.json")
    if os.path.exists(original_path):
        shutil.copyfile(original_path, backup_path)
        
    yield
    
    # Restore original registry
    if os.path.exists(backup_path):
        shutil.copyfile(backup_path, original_path)
        os.remove(backup_path)

def test_fingerprinting():
    """Verify schema and config hash utilities work correctly."""
    schema_hash1 = compute_schema_hash(FEATURE_COLS)
    schema_hash2 = compute_schema_hash(FEATURE_COLS)
    assert schema_hash1 == schema_hash2

    config_hash1 = compute_config_hash({"learning_rate": 0.05, "max_depth": 4})
    config_hash2 = compute_config_hash({"max_depth": 4, "learning_rate": 0.05})
    assert config_hash1 == config_hash2

def test_registry_lifecycle(mock_mlops_data):
    """Test model registration, status updates, and retrieval."""
    key = register_model(
        model_name="XGBoost",
        corridor_id="HORMUZ",
        version="9.9",
        training_start="2024-01-01",
        training_end="2024-12-31",
        feature_version="1.0",
        feature_count=len(FEATURE_COLS),
        dataset_hashes={"model_features.csv": "hash123"},
        parameters={"max_depth": 4},
        metrics={"validation": {"roc_auc": 0.90, "pr_auc": 0.80, "brier_score": 0.05, "f1": 0.85}},
        artifact_path="nonexistent_path.pkl",
        status="CANDIDATE"
    )
    
    # Verify Candidate registration
    registry = _load_registry()
    assert key in registry
    assert registry[key]["status"] == "CANDIDATE"
    assert registry[key]["feature_schema_hash"] is not None

    # Promote to Champion
    update_model_status(key, "CHAMPION", reason="Initial Champion")
    registry = _load_registry()
    assert registry[key]["status"] == "CHAMPION"
    assert registry[key]["promoted_at"] is not None

    # Verify Champion retrieval
    champ = get_champion_model("HORMUZ")
    assert champ["version"] == "9.9"

    # Retire model
    update_model_status(key, "RETIRED")
    registry = _load_registry()
    assert registry[key]["status"] == "RETIRED"
    assert registry[key]["retired_at"] is not None

def test_promotion_policy_checks(mock_mlops_data):
    """Verify challenger checks identify policy rejections."""
    # Register a Challenger that has high drift
    drift_key = register_model(
        model_name="XGBoost",
        corridor_id="SUEZ",
        version="11.1",
        training_start="2024-01-01",
        training_end="2024-12-31",
        feature_version="1.0",
        feature_count=len(FEATURE_COLS),
        dataset_hashes={"model_features.csv": "hash123"},
        parameters={"max_depth": 4},
        metrics={"validation": {"roc_auc": 0.95, "pr_auc": 0.90, "brier_score": 0.04, "f1": 0.90}},
        artifact_path="nonexistent_path.pkl",
        status="CANDIDATE",
        drift_metrics={"psi_scores": {"gpr_daily": 0.60}} # PSI > 0.50 triggers drift failure
    )
    
    passes_policy, reason = evaluate_promotion_policy(drift_key)
    assert not passes_policy
    assert "Severe data drift detected" in reason

    # Register a Challenger that has high calibration error
    calib_key = register_model(
        model_name="XGBoost",
        corridor_id="SUEZ",
        version="11.2",
        training_start="2024-01-01",
        training_end="2024-12-31",
        feature_version="1.0",
        feature_count=len(FEATURE_COLS),
        dataset_hashes={"model_features.csv": "hash123"},
        parameters={"max_depth": 4},
        metrics={"validation": {"roc_auc": 0.95, "pr_auc": 0.90, "brier_score": 0.04, "f1": 0.90}},
        artifact_path="nonexistent_path.pkl",
        status="CANDIDATE",
        calibration_metrics={"ece": 0.20} # ECE >= 0.15 triggers failure
    )
    passes_policy, reason = evaluate_promotion_policy(calib_key)
    assert not passes_policy
    assert "Calibration is unacceptable" in reason

def test_retraining_recommendation_logic():
    """Verify retraining recommendation reports triggers properly."""
    res = check_retrain_status("RED_SEA")
    assert "corridor" in res
    assert "retrain_recommended" in res
    assert "reasons" in res
    assert "severity" in res
    assert isinstance(res["reasons"], list)

def test_api_registry_endpoints():
    """Verify registry versions and champion endpoints return 200."""
    r = client.get("/api/models/registry")
    assert r.status_code == 200
    
    r = client.get("/api/models/RED_SEA/versions")
    assert r.status_code == 200
    
    r = client.get("/api/models/RED_SEA/comparison")
    assert r.status_code == 200

def test_api_retrain_status():
    """Verify retrain status returns valid schema."""
    r = client.get("/api/models/RED_SEA/retrain-status")
    assert r.status_code == 200
    body = r.json()
    assert body["corridor"] == "RED_SEA"
    assert "retrain_recommended" in body
    assert "severity" in body

def test_api_promotion_authorization_required():
    """Verify promote/rollback operations fail without admin credentials."""
    payload = {"challenger_key": "XGBoost__RED_SEA__2.0", "reason": "System promote"}
    
    # 1. No role header -> 403
    r = client.post("/api/models/RED_SEA/promote", json=payload)
    assert r.status_code == 403
    
    # 2. Viewer role -> 403
    r = client.post("/api/models/RED_SEA/promote", json=payload, headers={"X-Admin-Role": "viewer"})
    assert r.status_code == 403

    # 3. Rollback viewer role -> 403
    rollback_payload = {"rollback_key": "XGBoost__RED_SEA__1.0", "reason": "System rollback"}
    r = client.post("/api/models/RED_SEA/rollback", json=rollback_payload, headers={"X-Admin-Role": "viewer"})
    assert r.status_code == 403

def test_api_model_card_retrieval():
    """Verify model card endpoint returns markdown."""
    r = client.get("/api/models/RED_SEA/model-card")
    assert r.status_code == 200
    body = r.json()
    assert body["corridor"] == "RED_SEA"
    assert "markdown" in body
    assert "Bab el-Mandeb" in body["markdown"]

def test_api_monitoring_endpoint():
    """Verify monitoring diagnostics return counts and distribution."""
    r = client.get("/api/models/RED_SEA/monitoring")
    assert r.status_code == 200
    body = r.json()
    assert "prediction_count" in body
    assert "avg_probability" in body
    assert "risk_level_distribution" in body
