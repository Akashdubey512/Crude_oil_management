"""
Risk Service — Phase 5

Wraps the Phase 4 risk engine (src/risk/corridor_risk.py) to produce
fully validated, schema-compliant risk snapshot responses for the API.

Key responsibilities:
  - Load the best available Phase 4 trained model for each corridor.
  - Compute risk probability and level via corridor_risk.get_corridor_risk().
  - Compute 5-vector risk decomposition.
  - Attach top SHAP/coefficient risk factors from saved explanation files.
  - Compute data freshness from actual file timestamps.
  - Return documented model limitations (never fabricate risk values).
  - Return model evaluation metrics from the model registry.
"""

import os
import json
import datetime
import pandas as pd
from typing import Dict, Any, List, Optional

DATA_DIR = os.getenv("DATA_DIR", r"D:\hackathon project\energy-resilience\data")
STAGING_DIR = os.path.join(DATA_DIR, "staging")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
MANIFEST_DIR = os.path.join(DATA_DIR, "manifests")
REPORTS_DIR = r"D:\hackathon project\energy-resilience\reports\model_evaluation"
MODELS_DIR = os.getenv("MODEL_DIR", r"D:\hackathon project\energy-resilience\models")

SUPPORTED_CORRIDORS = {
    "HORMUZ": "Strait of Hormuz",
    "BAB_EL_MANDEB": "Bab-el-Mandeb Strait",
    "SUEZ": "Suez Canal",
    "RED_SEA": "Red Sea",
}

MODEL_LIMITATIONS = [
    "GDELT event coverage is sparse before July 2026 — event-confirmation criterion not met for most historical drops.",
    "GFW AIS vessel observations excluded (no API credentials) — PortWatch transit counts used as proxy.",
    "Perfect test-set ROC-AUC (1.000) reflects limited positive cases in the out-of-time window (Apr–Aug 2026), not proven production accuracy.",
    "Class imbalance: ~1.4–2.4% positive rate per corridor. Model tuned for recall; may trigger false positives if thresholds are lowered.",
    "PPAC data does not specify country-of-origin for crude imports — aggregate national totals used as supply proxy.",
    "Monthly PPAC indicators are lagged by 1 month — supply-side signals reflect previous month's conditions.",
]


def _get_data_freshness() -> Dict[str, str]:
    """Returns the most recent data date from each key data source."""
    freshness = {}

    # Traffic freshness
    traffic_path = os.path.join(PROCESSED_DIR, "corridor_traffic_daily.csv")
    if os.path.exists(traffic_path):
        df = pd.read_csv(traffic_path)
        freshness["traffic"] = str(df["date"].max()) if "date" in df.columns else "UNAVAILABLE"
    else:
        freshness["traffic"] = "UNAVAILABLE"

    # Geopolitical/GPR freshness
    gpr_path = os.path.join(STAGING_DIR, "geopolitical_risk.csv")
    if os.path.exists(gpr_path):
        df = pd.read_csv(gpr_path)
        freshness["geopolitical"] = str(df["date"].max()) if "date" in df.columns else "UNAVAILABLE"
    else:
        freshness["geopolitical"] = "UNAVAILABLE"

    # Brent price freshness
    price_path = os.path.join(STAGING_DIR, "crude_prices.csv")
    if os.path.exists(price_path):
        df = pd.read_csv(price_path)
        freshness["price"] = str(df["date"].max()) if "date" in df.columns else "UNAVAILABLE"
    else:
        freshness["price"] = "UNAVAILABLE"

    return freshness


def _get_top_factors(corridor_id: str) -> List[str]:
    """Loads global SHAP/coefficient feature importances from explanation files."""
    for model_name in ["xgboost", "randomforest", "logisticregression"]:
        exp_path = os.path.join(
            REPORTS_DIR, f"explanation_{model_name}_{corridor_id.lower()}.json"
        )
        if os.path.exists(exp_path):
            with open(exp_path) as f:
                exp_data = json.load(f)
            return [item.get("feature", "") for item in exp_data.get("global_importance", [])[:5]]
    return []


def _normalize_decomposition(raw_decomp: dict) -> Dict[str, float]:
    """
    Maps the 5-group raw decomposition from risk_decomposition.py to the
    5-vector schema (geopolitical, maritime, energy_market, infrastructure, historical_pattern).
    All values clamped [0, 1] and treated as relative weights — they do NOT sum to 1.
    """
    def safe(key: str) -> float:
        v = raw_decomp.get(key, {})
        if isinstance(v, dict):
            return float(v.get("normalized_contribution") or 0.0)
        return 0.0

    total = max(
        safe("geopolitical_risk") + safe("sanctions_risk") + safe("maritime_risk") +
        safe("market_risk") + safe("supply_risk"), 1e-9
    )

    return {
        "geopolitical": round(safe("geopolitical_risk") / total, 4),
        "maritime": round(safe("maritime_risk") / total, 4),
        "energy_market": round(safe("market_risk") / total, 4),
        "infrastructure": round(safe("supply_risk") / total, 4),
        "historical_pattern": round(safe("sanctions_risk") / total, 4),
    }


def get_risk_snapshot(corridor_id: str, prediction_date: Optional[str] = None) -> Dict[str, Any]:
    """
    Returns a fully schema-compliant risk snapshot for a single corridor.
    Raises ValueError for unknown corridors or missing models.
    """
    if corridor_id.upper() not in SUPPORTED_CORRIDORS:
        raise ValueError(f"Unknown corridor: '{corridor_id}'. Supported: {list(SUPPORTED_CORRIDORS.keys())}")

    # Determine prediction date — use latest PortWatch date available
    if prediction_date:
        try:
            target_date = datetime.date.fromisoformat(prediction_date)
        except ValueError:
            raise ValueError(f"Invalid date format: '{prediction_date}'. Use YYYY-MM-DD.")
    else:
        traffic_path = os.path.join(PROCESSED_DIR, "corridor_traffic_daily.csv")
        if os.path.exists(traffic_path):
            df = pd.read_csv(traffic_path)
            latest = df["date"].max()
            target_date = datetime.date.fromisoformat(latest)
        else:
            target_date = datetime.date.today()

    # RED_SEA: no independent model — return structured unavailability response
    if corridor_id.upper() == "RED_SEA":
        return {
            "corridor": "RED_SEA",
            "risk_score": None,
            "risk_level": "UNKNOWN",
            "probability": None,
            "prediction_date": str(target_date),
            "model_version": "N/A",
            "data_freshness": _get_data_freshness(),
            "risk_decomposition": {
                "geopolitical": None,
                "maritime": None,
                "energy_market": None,
                "infrastructure": None,
                "historical_pattern": None,
            },
            "top_factors": [],
            "limitations": [
                "No independent trained model for RED_SEA.",
                "RED_SEA geopolitical events are accessible via /api/events/RED_SEA.",
            ],
        }

    # Load risk via Phase 4 service
    from src.risk.service import get_corridor_risk_with_explanation
    try:
        risk_rec = get_corridor_risk_with_explanation(corridor_id.upper(), target_date)
    except Exception as e:
        raise RuntimeError(f"Risk engine error for {corridor_id}: {e}")

    prob = risk_rec.get("risk_probability")
    if prob is None:
        raise RuntimeError(
            f"No risk probability available for {corridor_id} on {target_date}. "
            "Check that model artifacts and feature data exist."
        )

    # Normalize decomposition to the 5-vector API schema
    raw_decomp = risk_rec.get("risk_decomposition", {})
    decomp = _normalize_decomposition(raw_decomp)

    top_factors = risk_rec.get("top_risk_factors") or _get_top_factors(corridor_id.upper())

    return {
        "corridor": corridor_id.upper(),
        "risk_score": round(prob * 100, 4),   # Scale to 0–100 risk score
        "risk_level": risk_rec.get("risk_level", "UNKNOWN"),
        "probability": round(prob, 6),
        "prediction_date": str(target_date),
        "model_version": risk_rec.get("model_version", "unknown"),
        "data_freshness": _get_data_freshness(),
        "risk_decomposition": decomp,
        "top_factors": top_factors,
        "limitations": MODEL_LIMITATIONS,
    }


def get_all_risk_snapshots() -> List[Dict[str, Any]]:
    """Returns risk snapshots for all supported corridors."""
    results = []
    for corridor_id in SUPPORTED_CORRIDORS:
        try:
            results.append(get_risk_snapshot(corridor_id))
        except RuntimeError as e:
            # Append an explicit unavailability record — never fabricate values
            results.append({
                "corridor": corridor_id,
                "risk_score": None,
                "risk_level": "UNAVAILABLE",
                "probability": None,
                "prediction_date": str(datetime.date.today()),
                "model_version": "N/A",
                "data_freshness": _get_data_freshness(),
                "risk_decomposition": {
                    "geopolitical": None, "maritime": None,
                    "energy_market": None, "infrastructure": None,
                    "historical_pattern": None,
                },
                "top_factors": [],
                "limitations": [str(e)] + MODEL_LIMITATIONS,
            })
    return results


def get_model_info(corridor_id: str) -> Dict[str, Any]:
    """Returns Phase 4 model card info for a corridor from the model registry."""
    registry_path = os.path.join(MANIFEST_DIR, "model_registry.json")
    if not os.path.exists(registry_path):
        raise RuntimeError("Model registry not found. Run Phase 4 training scripts first.")

    with open(registry_path) as f:
        registry = json.load(f)

    # Pick the best entry for this corridor (XGBoost preferred)
    for model_prefix in ["XGBoost", "RandomForest", "LogisticRegression"]:
        key = f"{model_prefix}__{corridor_id.upper()}__1.0"
        if key in registry:
            entry = registry[key]
            from src.features.feature_pipeline import FEATURE_COLS
            return {
                "model_name": entry["model_name"],
                "version": entry["version"],
                "training_start": entry["training_start"],
                "training_end": entry["training_end"],
                "features_used": FEATURE_COLS,
                "limitations": MODEL_LIMITATIONS,
                "metrics": entry["metrics"],
            }

    raise RuntimeError(f"No model registry entry found for corridor: {corridor_id}")


def get_all_model_metrics() -> Dict[str, Any]:
    """Returns aggregated model metrics from the Phase 4 comparison report."""
    report_path = os.path.join(REPORTS_DIR, "model_comparison.json")
    if not os.path.exists(report_path):
        raise RuntimeError("Model comparison report not found. Run Phase 4 training scripts first.")

    with open(report_path) as f:
        return json.load(f)
