"""
Corridor Risk Engine — Phase 4

Generates corridor-level risk records by loading trained models and
computing risk probabilities and risk level classifications.

Risk levels (documented thresholds):
  LOW:      risk_probability < 0.10
  MODERATE: 0.10 <= risk_probability < 0.25
  HIGH:     0.25 <= risk_probability < 0.50
  CRITICAL: risk_probability >= 0.50

Threshold rationale:
  - LOW/MODERATE boundary (0.10): ~4x the base rate of ~2.5% disruptions per day.
    Represents an elevated signal worth monitoring.
  - MODERATE/HIGH boundary (0.25): ~10x base rate. Requires operational attention.
  - HIGH/CRITICAL boundary (0.50): Model assigns disruption as more likely than not.
    Immediate advisory-level alert.
"""

import os
import pickle
import json
import datetime
import numpy as np
import pandas as pd

from src.features.feature_pipeline import FEATURE_COLS, MODELED_CORRIDORS
from src.features.geopolitical_features import build_geopolitical_features
from src.features.maritime_features import build_maritime_features
from src.features.energy_features import build_energy_features

MODELS_DIR = r"D:\hackathon project\energy-resilience\models"
PROCESSED_DIR = r"D:\hackathon project\energy-resilience\data\processed"

MODEL_VERSION = "1.0"

# Risk threshold boundaries
RISK_THRESHOLDS = {
    "LOW": 0.10,
    "MODERATE": 0.25,
    "HIGH": 0.50,
    "CRITICAL": 1.01,  # sentinel
}


def _classify_risk(prob: float) -> str:
    if prob < RISK_THRESHOLDS["LOW"]:
        return "LOW"
    elif prob < RISK_THRESHOLDS["MODERATE"]:
        return "MODERATE"
    elif prob < RISK_THRESHOLDS["HIGH"]:
        return "HIGH"
    else:
        return "CRITICAL"


def _load_best_model(corridor_id: str) -> tuple:
    """Loads the best available model artifact for a corridor."""
    for prefix, mname in [("xgb", "XGBoost"), ("rf", "RandomForest"), ("lr", "LogisticRegression")]:
        mpath = os.path.join(MODELS_DIR, f"{prefix}_{corridor_id.lower()}_v{MODEL_VERSION}.pkl")
        if os.path.exists(mpath):
            with open(mpath, "rb") as f:
                artifact = pickle.load(f)
            return artifact, mname
    return None, None


def get_corridor_risk(corridor_id: str, timestamp: datetime.date) -> dict:
    """
    Computes the corridor-level risk record for a single corridor on a given date.
    Returns a structured risk record dict.
    """
    artifact, model_name = _load_best_model(corridor_id)
    if artifact is None:
        return {
            "corridor": corridor_id,
            "timestamp": str(timestamp),
            "status": "NO_MODEL",
            "risk_probability": None,
            "risk_level": "UNKNOWN",
        }

    model = artifact["model"]
    feature_medians = artifact["feature_medians"]

    # Build a 90-day window ending at timestamp to compute rolling features
    date_end = pd.Timestamp(timestamp)
    date_start = date_end - pd.Timedelta(days=120)
    date_index = pd.date_range(start=date_start, end=date_end, freq="D")

    df_geo = build_geopolitical_features(date_index, corridor_id)
    df_mar = build_maritime_features(date_index, corridor_id)
    df_ene = build_energy_features(date_index)

    df = df_geo.merge(df_mar, on="date", how="left")
    df = df.merge(df_ene, on="date", how="left")
    df["date"] = pd.to_datetime(df["date"])

    # Lag all feature columns by 1 day to match training alignment
    df = df.sort_values("date").reset_index(drop=True)
    for col in FEATURE_COLS:
        if col in df.columns:
            df[col] = df[col].shift(1)

    row = df[df["date"] == date_end]
    if row.empty:
        return {
            "corridor": corridor_id,
            "timestamp": str(timestamp),
            "status": "NO_DATA",
            "risk_probability": None,
            "risk_level": "UNKNOWN",
        }

    X = row[FEATURE_COLS].fillna(feature_medians)

    if hasattr(model, "predict_proba"):
        prob = float(model.predict_proba(X)[:, 1][0])
    else:
        prob = float(model.predict(X)[0])

    risk_level = _classify_risk(prob)

    # Extract leading indicators for transparency
    row_data = row.iloc[0]
    leading_indicators = {
        "gpr_daily": float(row_data.get("gpr_daily", np.nan)) if pd.notna(row_data.get("gpr_daily")) else None,
        "tanker_decline_ratio_28d": float(row_data.get("tanker_decline_ratio_28d", np.nan)) if pd.notna(row_data.get("tanker_decline_ratio_28d")) else None,
        "brent_volatility_28d": float(row_data.get("brent_volatility_28d", np.nan)) if pd.notna(row_data.get("brent_volatility_28d")) else None,
        "corridor_events_28d": float(row_data.get("corridor_events_28d", 0)),
        "anomaly_flag": int(row_data.get("anomaly_flag", 0)),
    }

    return {
        "corridor": corridor_id,
        "timestamp": str(timestamp),
        "risk_probability": round(prob, 4),
        "risk_level": risk_level,
        "confidence": "model-based",
        "leading_indicators": leading_indicators,
        "top_risk_factors": [],  # Populated by service layer using explainability
        "traffic_signal": "DROP" if row_data.get("anomaly_type_drop", 0) == 1 else "NORMAL",
        "geopolitical_signal": "ELEVATED" if (row_data.get("gpr_daily", 0) or 0) > 150 else "NORMAL",
        "sanctions_signal": "ELEVATED" if (row_data.get("corridor_sanctions_28d", 0) or 0) > 0 else "NORMAL",
        "market_signal": "VOLATILE" if (row_data.get("brent_volatility_28d", 0) or 0) > 0.02 else "NORMAL",
        "supply_signal": "NORMAL",
        "model_version": MODEL_VERSION,
        "feature_version": "1.0",
        "data_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }


def get_all_corridor_risks(timestamp: datetime.date) -> list:
    """Returns risk records for all modeled corridors."""
    return [get_corridor_risk(c, timestamp) for c in MODELED_CORRIDORS]


def get_historical_risk(
    corridor_id: str,
    start_date: str,
    end_date: str,
) -> pd.DataFrame:
    """
    Returns model risk probabilities for all dates in [start_date, end_date]
    from the pre-computed model_features.csv.
    """
    features_path = os.path.join(PROCESSED_DIR, "model_features.csv")
    df = pd.read_csv(features_path)
    df["date"] = pd.to_datetime(df["date"])

    df_corr = df[
        (df["corridor_id"] == corridor_id) &
        (df["date"] >= pd.Timestamp(start_date)) &
        (df["date"] <= pd.Timestamp(end_date))
    ].copy()

    if df_corr.empty:
        return pd.DataFrame()

    artifact, model_name = _load_best_model(corridor_id)
    if artifact is None:
        return pd.DataFrame()

    model = artifact["model"]
    feature_medians = artifact["feature_medians"]
    X = df_corr[FEATURE_COLS].fillna(feature_medians)

    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(X)[:, 1]
    else:
        probs = model.predict(X).astype(float)

    df_corr["risk_probability"] = probs
    df_corr["risk_level"] = [_classify_risk(p) for p in probs]
    return df_corr[["date", "corridor_id", "risk_probability", "risk_level", "is_disrupted"]]
