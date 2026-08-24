"""
Upgraded Model Registry — Phase 11
Manages model artifacts, metadata, and MLOps lifecycle status:
  CANDIDATE, VALIDATED, CHALLENGER, CHAMPION, RETIRED, REJECTED
"""

import os
import json
import datetime
import hashlib
from typing import Dict, Any, List, Optional

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MANIFEST_DIR = os.path.join(os.getenv("DATA_DIR", os.path.join(PROJECT_ROOT, "data")), "manifests")
REGISTRY_PATH = os.path.join(MANIFEST_DIR, "model_registry.json")
MODELS_DIR = os.getenv("MODEL_DIR", os.path.join(PROJECT_ROOT, "models"))

os.makedirs(MANIFEST_DIR, exist_ok=True)

def hash_file(path: str) -> str:
    """Returns the SHA256 hash of a file's content."""
    if not os.path.exists(path):
        return "FILE_NOT_FOUND"
    sha = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(8192)
            if not chunk:
                break
            sha.update(chunk)
    return sha.hexdigest()

def compute_string_hash(text: str) -> str:
    """Returns the SHA256 hash of a string."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def compute_schema_hash(feature_cols: list) -> str:
    """Returns the SHA256 hash of the feature schema (sorted column names)."""
    sorted_cols = sorted(feature_cols)
    schema_str = ",".join(sorted_cols)
    return compute_string_hash(schema_str)

def compute_config_hash(params: dict) -> str:
    """Returns the SHA256 hash of the training hyperparameters/configuration."""
    sorted_keys = sorted(params.keys())
    config_list = [f"{k}={params[k]}" for k in sorted_keys]
    config_str = ";".join(config_list)
    return compute_string_hash(config_str)

def _load_registry() -> dict:
    """Loads the model registry from JSON."""
    if os.path.exists(REGISTRY_PATH):
        try:
            with open(REGISTRY_PATH, "r") as f:
                registry = json.load(f)
            # Registries created on Windows contain absolute ``D:\\...`` paths.
            # Resolve them to the deployed model directory without mutating the
            # source manifest, so the same artifact bundle works on Linux/Render.
            for entry in registry.values():
                artifact_path = entry.get("artifact_path")
                if artifact_path and not os.path.exists(artifact_path):
                    filename = artifact_path.replace("\\", "/").rsplit("/", 1)[-1]
                    deployed_path = os.path.join(MODELS_DIR, filename)
                    if os.path.exists(deployed_path):
                        entry["artifact_path"] = deployed_path
            return registry
        except Exception:
            return {}
    return {}

def _save_registry(registry: dict) -> None:
    """Saves the model registry to JSON."""
    with open(REGISTRY_PATH, "w") as f:
        json.dump(registry, f, indent=2)

def register_model(
    model_name: str,
    corridor_id: str,
    version: str,
    training_start: str,
    training_end: str,
    feature_version: str,
    feature_count: int,
    dataset_hashes: dict,
    parameters: dict,
    metrics: dict,
    artifact_path: str,
    status: str = "CANDIDATE",
    calibration_metrics: Optional[dict] = None,
    drift_metrics: Optional[dict] = None,
) -> str:
    """
    Registers a trained model in the upgraded model registry.
    Ensures dataset fingerprinting and MLOps status tracking are preserved.
    """
    registry = _load_registry()
    
    # Calculate schema and config fingerprints
    from src.features.feature_pipeline import FEATURE_COLS
    schema_hash = compute_schema_hash(FEATURE_COLS)
    config_hash = compute_config_hash(parameters)
    
    ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
    # Key includes model version to allow multiple iterations
    key = f"{model_name}__{corridor_id.upper()}__{version}"
    
    # Preserve promotion dates if overwriting or updating
    existing_entry = registry.get(key, {})
    promoted_at = existing_entry.get("promoted_at", None)
    retired_at = existing_entry.get("retired_at", None)
    promotion_reason = existing_entry.get("promotion_reason", None)
    rejection_reason = existing_entry.get("rejection_reason", None)

    registry[key] = {
        "model_name": model_name,
        "corridor_id": corridor_id.upper(),
        "version": version,
        "training_start": training_start,
        "training_end": training_end,
        "feature_version": feature_version,
        "feature_count": feature_count,
        "dataset_hashes": dataset_hashes,
        "dataset_hash": dataset_hashes.get("model_features.csv") or dataset_hashes.get("redsea_features.csv") or "UNKNOWN",
        "feature_schema_hash": schema_hash,
        "config_hash": config_hash,
        "parameters": parameters,
        "metrics": metrics,
        "calibration_metrics": calibration_metrics or {},
        "drift_metrics": drift_metrics or {},
        "artifact_path": artifact_path,
        "status": status,
        "created_at": existing_entry.get("created_at", ts),
        "updated_at": ts,
        "promoted_at": promoted_at,
        "retired_at": retired_at,
        "promotion_reason": promotion_reason,
        "rejection_reason": rejection_reason,
    }
    
    _save_registry(registry)
    return key

import threading
REGISTRY_LOCK = threading.Lock()

def update_model_status(
    key: str,
    status: str,
    reason: Optional[str] = None,
) -> None:
    """Updates the status and logs promotion/rejection/retirement events."""
    with REGISTRY_LOCK:
        if os.path.exists(REGISTRY_PATH):
            try:
                with open(REGISTRY_PATH, "r") as f:
                    registry = json.load(f)
            except Exception:
                registry = {}
        else:
            registry = {}

        if key not in registry:
            raise ValueError(f"Model key '{key}' not found in registry.")
            
        entry = registry[key]
        
        # Guard: Prevent promoting a model that is currently REJECTED
        if status == "CHAMPION" and entry.get("status") == "REJECTED":
            raise ValueError(f"Promotion rejected: Model '{key}' is in REJECTED status.")
            
        ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
        entry["status"] = status
        entry["updated_at"] = ts
        
        if status == "CHAMPION":
            entry["promoted_at"] = ts
            entry["promotion_reason"] = reason
            # Retire any other CHAMPION for this corridor
            corridor = entry["corridor_id"]
            for other_key, other_entry in registry.items():
                if other_key != key and other_entry.get("corridor_id") == corridor and other_entry.get("status") == "CHAMPION":
                    other_entry["status"] = "RETIRED"
                    other_entry["retired_at"] = ts
                    other_entry["updated_at"] = ts
        elif status == "REJECTED":
            entry["rejection_reason"] = reason
        elif status == "RETIRED":
            entry["retired_at"] = ts
            
        with open(REGISTRY_PATH, "w") as f:
            json.dump(registry, f, indent=4)

def get_champion_model(corridor_id: str) -> dict:
    """Returns the CHAMPION registry entry for a corridor."""
    registry = _load_registry()
    for entry in registry.values():
        if entry.get("corridor_id") == corridor_id.upper() and entry.get("status") == "CHAMPION":
            return entry
    return {}

def get_registry() -> dict:
    """Exposes the full registry."""
    return _load_registry()

# ---------------------------------------------------------------------------
# Backward-compatibility aliases (Phase ≤4 imports)
# ---------------------------------------------------------------------------
def get_best_model(corridor_id: str) -> dict:
    """Alias for get_champion_model — preserved for backward compatibility with Phase 4 tests."""
    return get_champion_model(corridor_id)
