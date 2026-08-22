"""
Model Health Status Service — Phase 9

Aggregates model performance, calibration ECE, feature drift, data quality, and freshness
into an explainable health index with deterministic rule-based recommendations.
"""

import os
import datetime
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

from src.api.services.model_evaluation import evaluate_model_performance
from src.api.services.drift_detection import detect_data_drift
from src.api.services.risk_service import _get_data_freshness

# Max days before data feeds are flagged as STALE
FRESHNESS_THRESHOLD_DAYS = 7


def evaluate_model_health(corridor_id: str, model_version: str = "1.0") -> Dict[str, Any]:
    """
    Computes a transparent health assessment of the corridor model.
    """
    corridor_upper = corridor_id.upper()
    recommendations = []

    # 1. Fetch Evaluation Metrics (Out-of-sample)
    eval_res = evaluate_model_performance(corridor_upper, model_version, split_select="all_oos")
    if eval_res.get("status") == "UNAVAILABLE":
        # Fallback to validation split if out-of-sample has zero records
        eval_res = evaluate_model_performance(corridor_upper, model_version, split_select="validation")

    if eval_res.get("status") == "UNAVAILABLE":
        performance_status = "UNAVAILABLE"
        calibration_status = "UNAVAILABLE"
        data_quality_status = "UNAVAILABLE"
        missing_rate = 0.0
    else:
        # Evaluate Performance status
        metrics = eval_res.get("metrics", {})
        roc_auc = metrics.get("roc_auc")
        brier = metrics.get("brier_score", 0.0)
        recall = metrics.get("recall")

        if roc_auc is not None:
            if roc_auc >= 0.70:
                performance_status = "GOOD"
            elif roc_auc >= 0.50:
                performance_status = "MODERATE"
            else:
                performance_status = "DEGRADED"
                recommendations.append("Poor performance (ROC-AUC < 0.50). Model is performing worse than random guessing on out-of-sample data.")
        else:
            # Fallback based on Brier Score (closer to 0 is better)
            if brier < 0.05:
                performance_status = "GOOD"
            elif brier < 0.15:
                performance_status = "MODERATE"
            else:
                performance_status = "DEGRADED"

        if recall is not None and recall < 0.30 and eval_res.get("positive_count", 0) > 0:
            recommendations.append("Poor recall: Model is missing a significant proportion of positive disruption events.")

        # Calibration status
        calibration_status = eval_res.get("calibration", {}).get("status", "UNAVAILABLE")
        if calibration_status == "DEGRADED":
            recommendations.append("Poor calibration (ECE >= 0.15). Recalibration should be evaluated before using probability as a decision threshold.")

        # Data Quality status
        missing_rate = eval_res.get("data_quality", {}).get("missing_rate", 0.0)
        if missing_rate < 0.05:
            data_quality_status = "GOOD"
        elif missing_rate < 0.15:
            data_quality_status = "MODERATE"
        else:
            data_quality_status = "DEGRADED"
            recommendations.append("Data quality is degraded due to high missing feature values. Validate ingestion pipelines.")

    # 2. Fetch Data Drift Status
    drift_res = detect_data_drift(corridor_upper, current_split="all_oos")
    if drift_res.get("status") == "UNAVAILABLE":
        drift_status = "UNAVAILABLE"
    else:
        drift_status = drift_res.get("overall_drift", "LOW")
        if drift_status == "HIGH":
            recommendations.append("HIGH DATA DRIFT: Retrain model after validating current feature distribution.")
        elif drift_status == "MEDIUM":
            recommendations.append("Moderate data drift detected. Monitor feature distributions for potential divergence.")

    # 3. Fetch Data Freshness Status
    freshness = _get_data_freshness()
    freshness_status = "FRESH"
    stale_sources = []
    today = datetime.date.today()

    for source, date_str in freshness.items():
        if date_str == "UNAVAILABLE":
            continue
        try:
            source_date = datetime.date.fromisoformat(date_str)
            days_elapsed = (today - source_date).days
            if days_elapsed > FRESHNESS_THRESHOLD_DAYS:
                stale_sources.append(f"{source} ({days_elapsed} days stale)")
        except ValueError:
            pass

    if stale_sources:
        freshness_status = "STALE"
        recommendations.append(f"Prediction reliability is reduced because current external data feeds are stale: {', '.join(stale_sources)}.")

    # 4. Overall Health Status Decision
    # CRITICAL: If performance or data quality is DEGRADED, or if feeds are extremely stale
    # DEGRADED: If drift is HIGH, calibration is DEGRADED, or data is stale
    # GOOD: Otherwise
    if performance_status == "DEGRADED" or data_quality_status == "DEGRADED":
        overall_status = "CRITICAL"
    elif drift_status == "HIGH" or calibration_status == "DEGRADED" or freshness_status == "STALE":
        overall_status = "DEGRADED"
    else:
        overall_status = "GOOD"

    # Default recommendation if healthy
    if not recommendations:
        recommendations.append("Model health is optimal. Continue normal monitoring.")

    return {
        "status": overall_status,
        "performance_status": performance_status,
        "calibration_status": calibration_status,
        "drift_status": drift_status,
        "data_quality_status": data_quality_status,
        "freshness_status": freshness_status,
        "recommendations": recommendations
    }
