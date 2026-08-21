"""
Model Registry — Phase 4

Tracks all training runs, parameters, metrics, dataset hashes,
and artifact paths in data/manifests/model_registry.json.
"""

import os
import json
import datetime
import hashlib

MANIFEST_DIR = r"D:\hackathon project\energy-resilience\data\manifests"
REGISTRY_PATH = os.path.join(MANIFEST_DIR, "model_registry.json")

os.makedirs(MANIFEST_DIR, exist_ok=True)


def _load_registry() -> dict:
    if os.path.exists(REGISTRY_PATH):
        with open(REGISTRY_PATH, "r") as f:
            return json.load(f)
    return {}


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
) -> str:
    """
    Registers a trained model run in the model registry JSON.
    Returns the registry key for this entry.
    """
    registry = _load_registry()

    ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
    key = f"{model_name}__{corridor_id}__{version}"

    registry[key] = {
        "model_name": model_name,
        "corridor_id": corridor_id,
        "version": version,
        "training_start": training_start,
        "training_end": training_end,
        "feature_version": feature_version,
        "feature_count": feature_count,
        "dataset_hashes": dataset_hashes,
        "parameters": parameters,
        "metrics": metrics,
        "artifact_path": artifact_path,
        "registered_at": ts,
    }

    with open(REGISTRY_PATH, "w") as f:
        json.dump(registry, f, indent=2)

    return key


def get_best_model(corridor_id: str, metric: str = "roc_auc") -> dict:
    """Returns the registry entry with the highest metric value for a corridor."""
    registry = _load_registry()
    candidates = {
        k: v for k, v in registry.items()
        if v.get("corridor_id") == corridor_id and metric in v.get("metrics", {})
    }
    if not candidates:
        return {}
    best_key = max(candidates, key=lambda k: candidates[k]["metrics"][metric])
    return candidates[best_key]


def get_registry() -> dict:
    return _load_registry()


def hash_file(path: str) -> str:
    if not os.path.exists(path):
        return "FILE_NOT_FOUND"
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()
