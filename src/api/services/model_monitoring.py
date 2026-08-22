"""
Model Monitoring & Production Diagnostic Service — Phase 11
Analyzes actual predictions from predictions.db, computes rolling statistics, and flags drift.
"""

import os
import json
import sqlite3
import datetime
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple
from src.api.database import DB_PATH

def fetch_predictions(corridor: str) -> pd.DataFrame:
    """Fetches logged prediction history from SQLite db."""
    if not os.path.exists(DB_PATH):
        return pd.DataFrame()
    try:
        conn = sqlite3.connect(DB_PATH)
        df = pd.read_sql_query(
            "SELECT * FROM predictions WHERE corridor = ? ORDER BY timestamp ASC",
            conn,
            params=[corridor.upper()]
        )
        conn.close()
        return df
    except Exception:
        return pd.DataFrame()

def calculate_rolling_metrics(
    df: pd.DataFrame,
    days_window: int = 30
) -> Dict[str, Any]:
    """
    Computes performance metrics over a rolling time window if actual labels are available.
    """
    if df.empty:
        return {"status": "INSUFFICIENT_LABELS", "reason": "No logged predictions found."}

    # Parse timestamps
    df["timestamp_dt"] = pd.to_datetime(df["timestamp"])
    max_date = df["timestamp_dt"].max()
    cutoff_date = max_date - pd.Timedelta(days=days_window)
    df_window = df[df["timestamp_dt"] >= cutoff_date].copy()

    # If window is empty
    if len(df_window) < 5:
        return {
            "status": "INSUFFICIENT_LABELS",
            "reason": f"Fewer than 5 predictions in the last {days_window} days."
        }

    # Count entries with outcomes
    df_outcomes = df_window[df_window["outcome_available"] == 1]
    if len(df_outcomes) < 3 or df_outcomes["actual_outcome"].sum() == 0:
        return {
            "status": "INSUFFICIENT_LABELS",
            "reason": f"Insufficient actual outcomes available in {days_window}d window."
        }

    y_true = df_outcomes["actual_outcome"].values
    y_prob = df_outcomes["predicted_probability"].values
    y_pred = df_outcomes["predicted_class"].values

    # Compute metrics safely
    from sklearn.metrics import brier_score_loss, f1_score, accuracy_score
    brier = float(brier_score_loss(y_true, y_prob))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    accuracy = float(accuracy_score(y_true, y_pred))

    # ECE
    from src.api.services.model_evaluation import calculate_ece
    ece = calculate_ece(y_true, y_prob)

    return {
        "status": "OK",
        "sample_count": len(df_outcomes),
        "brier_score": round(brier, 4),
        "f1_score": round(f1, 4),
        "accuracy": round(accuracy, 4),
        "ece": round(ece, 4)
    }

def get_production_monitoring_diagnostics(corridor: str) -> Dict[str, Any]:
    """
    Main aggregator for production model governance dashboard queries.
    """
    df = fetch_predictions(corridor)
    if df.empty:
        return {
            "prediction_count": 0,
            "avg_probability": None,
            "prob_distribution": [],
            "risk_level_distribution": {"LOW": 0, "MODERATE": 0, "HIGH": 0, "CRITICAL": 0},
            "rolling_performance": {
                "7d": {"status": "INSUFFICIENT_LABELS", "reason": "No logged predictions."},
                "30d": {"status": "INSUFFICIENT_LABELS", "reason": "No logged predictions."},
                "90d": {"status": "INSUFFICIENT_LABELS", "reason": "No logged predictions."}
            }
        }

    # Count and averages
    pred_count = len(df)
    avg_prob = float(df["predicted_probability"].mean())

    # Risk level counts
    levels = {"LOW": 0, "MODERATE": 0, "HIGH": 0, "CRITICAL": 0}
    for p in df["predicted_probability"]:
        if p < 0.10:
            levels["LOW"] += 1
        elif p < 0.25:
            levels["MODERATE"] += 1
        elif p < 0.50:
            levels["HIGH"] += 1
        else:
            levels["CRITICAL"] += 1

    # Probability distribution bins
    hist, edges = np.histogram(df["predicted_probability"], bins=10, range=(0, 1))
    prob_dist = [
        {"bin": f"{edges[i]:.1f}-{edges[i+1]:.1f}", "count": int(hist[i])}
        for i in range(10)
    ]

    # Rolling window stats
    perf_7d = calculate_rolling_metrics(df, 7)
    perf_30d = calculate_rolling_metrics(df, 30)
    perf_90d = calculate_rolling_metrics(df, 90)

    return {
        "prediction_count": pred_count,
        "avg_probability": round(avg_prob, 4),
        "prob_distribution": prob_dist,
        "risk_level_distribution": levels,
        "rolling_performance": {
            "7d": perf_7d,
            "30d": perf_30d,
            "90d": perf_90d
        }
    }
