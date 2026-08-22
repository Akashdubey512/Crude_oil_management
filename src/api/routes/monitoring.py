"""
Monitoring Routes — Phase 9

Exposes model evaluation, data drift, model health, and prediction history endpoints.
All metrics are computed from real trained models and real data — never fabricated.
"""

import os
import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query

from src.api.services.model_evaluation import evaluate_model_performance
from src.api.services.drift_detection import detect_data_drift
from src.api.services.model_health_service import evaluate_model_health
from src.api.schemas import (
    ModelEvaluationResponse, ModelEvaluationMetrics, CalibrationInfo, CalibrationBinEntry,
    DriftResponse, DriftFeatureItem, DriftResponseSummary,
    ModelHealthResponse,
    PredictionRecordResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()

MODELED_CORRIDORS = {"HORMUZ", "BAB_EL_MANDEB", "SUEZ", "RED_SEA"}


# ─── Model Evaluation ────────────────────────────────────────────────────────

@router.get("/models/evaluation", tags=["Monitoring"])
def get_model_evaluation(
    corridor: str = Query("HORMUZ", description="Corridor ID: HORMUZ, BAB_EL_MANDEB, SUEZ, RED_SEA"),
    model_version: str = Query("1.0", description="Model version to evaluate"),
    split: str = Query("all_oos", description="Split to evaluate on: validation, test, or all_oos"),
):
    """
    Returns out-of-sample model evaluation metrics including ROC-AUC, PR-AUC, F1,
    Brier Score, Log Loss, specificity, MCC, confusion matrix, and calibration curve.

    All metrics are computed on real held-out data. If positive labels are absent in
    the selected split, classification metrics (ROC-AUC, PR-AUC, MCC) are returned as null.
    """
    corridor_upper = corridor.upper()
    if corridor_upper not in MODELED_CORRIDORS:
        raise HTTPException(
            status_code=404,
            detail=f"No model available for corridor '{corridor}'. Modeled corridors: {sorted(MODELED_CORRIDORS)}"
        )

    valid_splits = {"validation", "test", "all_oos"}
    if split not in valid_splits:
        raise HTTPException(status_code=422, detail=f"Invalid split '{split}'. Must be one of: {sorted(valid_splits)}")

    try:
        result = evaluate_model_performance(corridor_upper, model_version=model_version, split_select=split)
    except Exception as e:
        logger.error(f"Model evaluation failed for {corridor_upper}: {e}")
        raise HTTPException(status_code=500, detail=f"Evaluation engine error: {str(e)}")

    if result.get("status") == "UNAVAILABLE":
        return {
            "status": "UNAVAILABLE",
            "reason": result.get("reason", "Insufficient validated historical observations")
        }

    # Build typed response
    metrics_raw = result.get("metrics", {})
    cal_raw = result.get("calibration", {})
    cal_curve = [
        CalibrationBinEntry(
            bin_midpoint=b["bin_midpoint"],
            predicted_prob=b["predicted_prob"],
            observed_freq=b["observed_freq"]
        )
        for b in cal_raw.get("curve", [])
    ]

    return ModelEvaluationResponse(
        model_version=result.get("model_version", model_version),
        evaluation_period=result.get("evaluation_period", {}),
        sample_count=result.get("sample_count", 0),
        positive_count=result.get("positive_count", 0),
        negative_count=result.get("negative_count", 0),
        metrics=ModelEvaluationMetrics(**metrics_raw),
        calibration=CalibrationInfo(
            status=cal_raw.get("status", "UNAVAILABLE"),
            ece=cal_raw.get("ece"),
            curve=cal_curve,
        ),
        data_quality=result.get("data_quality", {}),
    )


# ─── Data Drift ──────────────────────────────────────────────────────────────

@router.get("/models/drift", tags=["Monitoring"])
def get_data_drift(
    corridor: str = Query("HORMUZ", description="Corridor ID: HORMUZ, BAB_EL_MANDEB, SUEZ"),
    current_period: str = Query("all_oos", description="Current period split: validation, test, or all_oos"),
):
    """
    Returns feature-level data drift analysis between the training reference distribution
    and the current out-of-sample distribution using PSI and KS-test.

    Severity: LOW (PSI < 0.10), MEDIUM (0.10-0.25), HIGH (>= 0.25).
    """
    corridor_upper = corridor.upper()
    if corridor_upper not in MODELED_CORRIDORS:
        raise HTTPException(
            status_code=404,
            detail=f"No model available for corridor '{corridor}'. Modeled corridors: {sorted(MODELED_CORRIDORS)}"
        )

    try:
        result = detect_data_drift(corridor_upper, current_split=current_period)
    except Exception as e:
        logger.error(f"Drift detection failed for {corridor_upper}: {e}")
        raise HTTPException(status_code=500, detail=f"Drift detection error: {str(e)}")

    if result.get("status") == "UNAVAILABLE":
        return {
            "status": "UNAVAILABLE",
            "reason": result.get("reason", "Insufficient current observations")
        }

    summary_raw = result.get("summary", {"low": 0, "medium": 0, "high": 0})
    features = [
        DriftFeatureItem(
            feature=f["feature"],
            drift_method=f["drift_method"],
            drift_score=f["drift_score"],
            threshold=f["threshold"],
            severity=f["severity"],
            recommendation=f.get("recommendation"),
        )
        for f in result.get("features", [])
    ]

    return DriftResponse(
        status=result.get("status", "OK"),
        overall_drift=result.get("overall_drift", "LOW"),
        features=features,
        summary=DriftResponseSummary(
            low=summary_raw.get("low", 0),
            medium=summary_raw.get("medium", 0),
            high=summary_raw.get("high", 0),
        ),
    )


# ─── Model Health ────────────────────────────────────────────────────────────

@router.get("/models/health", tags=["Monitoring"])
def get_model_health(
    corridor: str = Query("HORMUZ", description="Corridor ID: HORMUZ, BAB_EL_MANDEB, SUEZ"),
    model_version: str = Query("1.0", description="Model version to assess"),
):
    """
    Returns a transparent model health assessment combining performance, calibration ECE,
    feature drift, data quality, and data freshness into actionable statuses.
    Status: GOOD | DEGRADED | CRITICAL.
    """
    corridor_upper = corridor.upper()
    if corridor_upper not in MODELED_CORRIDORS:
        raise HTTPException(
            status_code=404,
            detail=f"No model available for corridor '{corridor}'. Modeled corridors: {sorted(MODELED_CORRIDORS)}"
        )

    try:
        result = evaluate_model_health(corridor_upper, model_version)
    except Exception as e:
        logger.error(f"Model health evaluation failed for {corridor_upper}: {e}")
        raise HTTPException(status_code=500, detail=f"Health engine error: {str(e)}")

    return ModelHealthResponse(
        status=result["status"],
        performance_status=result["performance_status"],
        calibration_status=result["calibration_status"],
        drift_status=result["drift_status"],
        data_quality_status=result["data_quality_status"],
        freshness_status=result["freshness_status"],
        recommendations=result["recommendations"],
    )


# ─── Prediction History ──────────────────────────────────────────────────────

@router.get("/predictions/history/{corridor}", tags=["Monitoring"])
def get_prediction_history(
    corridor: str,
    limit: int = Query(100, ge=1, le=1000, description="Maximum prediction records to return"),
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)"),
    model_version: Optional[str] = Query(None, description="Filter by model version"),
):
    """
    Returns chronological prediction history records for a corridor from persistent SQLite store.
    Records are immutable — once logged, they are never modified or deleted.
    """
    corridor_upper = corridor.upper()
    from src.api.database import get_db_connection

    try:
        conn = get_db_connection()
        query = "SELECT * FROM predictions WHERE corridor = ?"
        params: list = [corridor_upper]

        if start_date:
            query += " AND timestamp >= ?"
            params.append(start_date)
        if end_date:
            query += " AND timestamp <= ?"
            params.append(end_date)
        if model_version:
            query += " AND model_version = ?"
            params.append(model_version)

        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)

        rows = conn.execute(query, params).fetchall()
        conn.close()

        return [
            PredictionRecordResponse(
                id=row["id"],
                corridor=row["corridor"],
                timestamp=row["timestamp"],
                model_version=row["model_version"],
                predicted_probability=row["predicted_probability"],
                predicted_class=row["predicted_class"],
                confidence=row["confidence"],
                actual_outcome=row["actual_outcome"],
                outcome_available=bool(row["outcome_available"]),
                created_at=row["created_at"],
            )
            for row in rows
        ]
    except Exception as e:
        logger.error(f"Prediction history query failed for {corridor_upper}: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction history unavailable: {str(e)}")


# ─── Governed MLOps Endpoints ──────────────────────────────────────────────────
from fastapi import Header
from src.api.schemas import (
    PromotionRequest, RollbackRequest, RetrainStatusResponse,
    PromotionResponse, RollbackResponse
)
from src.models.model_registry import _load_registry, get_champion_model
from src.api.services.model_promotion import promote_challenger_to_champion, rollback_to_version
from src.api.services.retrain_recommendation import check_retrain_status
from src.api.services.model_monitoring import get_production_monitoring_diagnostics

@router.get("/models/registry", tags=["MLOps"])
def get_full_registry():
    """Returns the entire model registry."""
    return _load_registry()

@router.get("/models/{corridor}/versions", tags=["MLOps"])
def get_corridor_versions(corridor: str):
    """Returns historical versions and status logs for a corridor."""
    corridor_upper = corridor.upper()
    registry = _load_registry()
    versions = [v for v in registry.values() if v.get("corridor_id") == corridor_upper]
    return sorted(versions, key=lambda x: x.get("created_at", ""), reverse=True)

@router.get("/models/{corridor}/champion", tags=["MLOps"])
def get_corridor_champion(corridor: str):
    """Returns the current CHAMPION model for a corridor."""
    champ = get_champion_model(corridor.upper())
    if not champ:
        raise HTTPException(status_code=404, detail=f"No CHAMPION model found for corridor {corridor.upper()}.")
    return champ

@router.get("/models/{corridor}/challenger", tags=["MLOps"])
def get_corridor_challenger(corridor: str):
    """Returns active challenger (CANDIDATE/CHALLENGER) models for a corridor."""
    corridor_upper = corridor.upper()
    registry = _load_registry()
    candidates = [
        v for v in registry.values()
        if v.get("corridor_id") == corridor_upper and v.get("status") in ["CANDIDATE", "CHALLENGER"]
    ]
    return sorted(candidates, key=lambda x: x.get("created_at", ""), reverse=True)

@router.get("/models/{corridor}/comparison", tags=["MLOps"])
def get_champion_challenger_comparison(corridor: str):
    """Compares metrics between the current Champion and the latest Challenger."""
    corridor_upper = corridor.upper()
    registry = _load_registry()
    
    models = sorted(
        [v for v in registry.values() if v.get("corridor_id") == corridor_upper],
        key=lambda x: x.get("created_at", ""),
        reverse=True
    )
    
    champion = {}
    challenger = {}
    for m in models:
        if m.get("status") == "CHAMPION" and not champion:
            champion = m
        elif m.get("status") in ["CANDIDATE", "CHALLENGER", "REJECTED"] and not challenger:
            challenger = m
            
    return {"corridor": corridor_upper, "champion": champion, "challenger": challenger}

@router.get("/models/{corridor}/retrain-status", response_model=RetrainStatusResponse, tags=["MLOps"])
def get_retrain_status(corridor: str):
    """Evaluates drift and performance to recommend model retraining."""
    corridor_upper = corridor.upper()
    if corridor_upper not in MODELED_CORRIDORS:
        raise HTTPException(status_code=404, detail=f"Corridor '{corridor}' is not modeled.")
    return check_retrain_status(corridor_upper)

@router.post("/models/{corridor}/promote", response_model=PromotionResponse, tags=["MLOps"])
def promote_challenger(
    corridor: str,
    req: PromotionRequest,
    x_admin_role: Optional[str] = Header(None, alias="X-Admin-Role")
):
    """Promotes a candidate challenger model to active production CHAMPION status."""
    if x_admin_role != "admin":
        raise HTTPException(status_code=403, detail="Administrative permission required. Invalid role.")
        
    success, detail = promote_challenger_to_champion(req.challenger_key, req.reason)
    if not success:
        raise HTTPException(status_code=400, detail=detail)
    return PromotionResponse(success=True, detail=detail)

@router.post("/models/{corridor}/rollback", response_model=RollbackResponse, tags=["MLOps"])
def rollback_model(
    corridor: str,
    req: RollbackRequest,
    x_admin_role: Optional[str] = Header(None, alias="X-Admin-Role")
):
    """Rolls back the active model to a previous valid version."""
    if x_admin_role != "admin":
        raise HTTPException(status_code=403, detail="Administrative permission required. Invalid role.")
        
    success, detail = rollback_to_version(corridor.upper(), req.rollback_key, req.reason)
    if not success:
        raise HTTPException(status_code=400, detail=detail)
    return RollbackResponse(success=True, detail=detail)

@router.get("/models/{corridor}/model-card", tags=["MLOps"])
def get_corridor_model_card(corridor: str):
    """Returns the markdown metadata file contents (Model Card) for the corridor."""
    corridor_upper = corridor.upper()
    card_path = os.path.join(r"D:\hackathon project\energy-resilience\docs\model-cards", f"{corridor_upper}.md")
    if not os.path.exists(card_path):
        raise HTTPException(status_code=404, detail=f"Model card not found for corridor {corridor_upper}.")
    try:
        with open(card_path, "r", encoding="utf-8") as f:
            return {"corridor": corridor_upper, "markdown": f.read()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading model card: {e}")

@router.get("/models/{corridor}/monitoring", tags=["MLOps"])
def get_corridor_monitoring(corridor: str):
    """Returns predictions tracking and distribution metrics for monitoring."""
    corridor_upper = corridor.upper()
    if corridor_upper not in MODELED_CORRIDORS:
        raise HTTPException(status_code=404, detail=f"Corridor '{corridor}' is not modeled.")
    return get_production_monitoring_diagnostics(corridor_upper)
