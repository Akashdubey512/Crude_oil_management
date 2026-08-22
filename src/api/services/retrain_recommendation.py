"""
Retraining Recommendation Service — Phase 11
Analyzes drift, health, and feed freshness metrics to issue structured model retraining recommendations.
"""

from typing import Dict, Any, List
from src.api.services.drift_detection import detect_data_drift
from src.api.services.model_health_service import evaluate_model_health

def check_retrain_status(corridor_id: str) -> Dict[str, Any]:
    """
    Evaluates drift, calibration, performance, and freshness indicators to recommend retraining.
    """
    corridor_upper = corridor_id.upper()
    reasons = []
    severity = "LOW"
    retrain_recommended = False

    # 1. Check feature drift
    try:
        drift_res = detect_data_drift(corridor_upper, current_split="all_oos")
        if drift_res.get("status") == "OK":
            overall_drift = drift_res.get("overall_drift", "LOW")
            if overall_drift == "HIGH":
                reasons.append("High feature distribution drift detected (PSI/KS checks failed).")
                retrain_recommended = True
                severity = "HIGH"
            elif overall_drift == "MEDIUM":
                reasons.append("Moderate feature drift detected. Retraining recommended to align with shifts.")
                retrain_recommended = True
                severity = "MEDIUM"
    except Exception as e:
        reasons.append(f"Drift monitoring check failed: {e}")

    # 2. Check model health and diagnostics
    try:
        health_res = evaluate_model_health(corridor_upper)
        status = health_res.get("status", "GOOD")
        perf_status = health_res.get("performance_status", "GOOD")
        cal_status = health_res.get("calibration_status", "GOOD")
        freshness_status = health_res.get("freshness_status", "FRESH")

        if perf_status == "DEGRADED":
            reasons.append("Out-of-sample prediction performance (ROC-AUC) has degraded.")
            retrain_recommended = True
            severity = "CRITICAL" if severity != "CRITICAL" else severity

        if cal_status == "DEGRADED":
            reasons.append("Model calibration error (ECE) exceeds acceptable bounds.")
            retrain_recommended = True
            severity = "HIGH" if severity in ["LOW", "MEDIUM"] else severity

        if freshness_status == "STALE":
            reasons.append("External data feeds are stale (>7 days old).")
            # Don't strictly require ML retraining for data freshness, but add warning
            if severity == "LOW":
                severity = "MEDIUM"
                
    except Exception as e:
        reasons.append(f"Health diagnostics check failed: {e}")

    if not reasons:
        reasons.append("Model performance is stable. No retraining triggers met.")

    # Phase 12: Record metrics
    from src.api.metrics import ML_RETRAIN_RECOMMENDATIONS
    ML_RETRAIN_RECOMMENDATIONS.labels(corridor=corridor_upper, severity=severity).inc()

    return {
        "corridor": corridor_upper,
        "retrain_recommended": retrain_recommended,
        "reasons": reasons,
        "severity": severity
    }
