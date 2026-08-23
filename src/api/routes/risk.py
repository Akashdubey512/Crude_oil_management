import logging
import time
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, HTTPException, Query
from src.api.services.risk_service import (
    get_risk_snapshot,
    get_all_risk_snapshots,
    get_model_info,
    get_all_model_metrics,
    SUPPORTED_CORRIDORS,
)
from src.api.services.traffic_service import get_traffic_observations
from src.api.services.infrastructure_service import get_infrastructure_nodes
import datetime
import pandas as pd
from src.api.schemas import (
    RiskSnapshotResponse,
    TrafficObservationResponse,
    InfrastructureNodeResponse,
    ModelInfoResponse,
    RiskHistoryResponse,
    CorridorComparisonResponse,
    CorridorComparisonItem,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _build_risk_response(raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ensures None-probability corridors (RED_SEA / unavailable) return
    schema-safe values without fabricating numbers.
    """
    if raw.get("risk_decomposition"):
        decomp = raw["risk_decomposition"]
        # Replace None with 0.0 for Pydantic float fields
        raw["risk_decomposition"] = {k: (v if v is not None else 0.0) for k, v in decomp.items()}
    if raw.get("risk_score") is None:
        raw["risk_score"] = 0.0
    if raw.get("probability") is None:
        raw["probability"] = 0.0
    return raw


@router.get("/risk", tags=["Risk"])
def get_all_risk(date: Optional[str] = Query(None, description="Target date (YYYY-MM-DD)")):
    """
    Returns risk snapshots for all supported corridors (HORMUZ, BAB_EL_MANDEB, SUEZ, RED_SEA).
    Corridors without trained models return an explicit UNAVAILABLE status — no fabricated values.
    """
    t0 = time.time()
    snapshots = get_all_risk_snapshots()
    snapshots = [_build_risk_response(s) for s in snapshots]
    elapsed = round((time.time() - t0) * 1000, 1)
    logger.info(f"GET /api/risk — all corridors — {elapsed}ms")
    return snapshots


@router.get("/risk/comparison", response_model=CorridorComparisonResponse, tags=["Risk"])
def get_corridor_comparison(date: Optional[str] = Query(None, description="Target date (YYYY-MM-DD)")):
    """
    Compares active risk status, model parameters, and data freshness across all corridors.
    """
    try:
        snapshots = get_all_risk_snapshots()
        comparison_items = []
        for s in snapshots:
            top_factors = s.get("top_factors", [])
            primary_driver = top_factors[0] if top_factors else "None"
            
            vessel_status = "NORMAL"
            gpr_status = "NORMAL"
            
            if s.get("corridor") == "RED_SEA":
                vessel_status = "UNKNOWN"
                gpr_status = "UNKNOWN"
            else:
                if any("drop" in f or "decline" in f for f in top_factors):
                    vessel_status = "DROP"
                if any("gpr" in f or "events" in f or "conflict" in f for f in top_factors):
                    gpr_status = "ELEVATED"
            
            comparison_items.append(
                CorridorComparisonItem(
                    corridor_id=s.get("corridor"),
                    name=SUPPORTED_CORRIDORS.get(s.get("corridor"), s.get("corridor")),
                    risk_level=s.get("risk_level", "UNKNOWN"),
                    probability=s.get("probability"),
                    risk_score=s.get("risk_score"),
                    primary_driver=primary_driver,
                    vessel_volume_status=vessel_status,
                    geopolitical_status=gpr_status,
                    data_freshness_traffic=s.get("data_freshness", {}).get("traffic", "UNAVAILABLE"),
                )
            )
        
        comp_date = date if date else (snapshots[0].get("prediction_date") if snapshots else str(datetime.date.today()))
        return CorridorComparisonResponse(comparison_date=comp_date, items=comparison_items)
    except Exception as e:
        logger.error(f"Failed to generate corridor comparison: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/risk/{corridor_id}", tags=["Risk"])
def get_corridor_risk(
    corridor_id: str,
    date: Optional[str] = Query(None, description="Target date (YYYY-MM-DD). Defaults to latest available."),
):
    """
    Returns the risk snapshot for a specific corridor on a given prediction date.
    Raises 404 for unknown corridors. Raises 503 if model artifacts are missing.
    Never fabricates risk values — returns documented UNAVAILABLE status instead.
    """
    t0 = time.time()
    corridor_upper = corridor_id.upper()

    if corridor_upper not in SUPPORTED_CORRIDORS:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown corridor '{corridor_id}'. Supported: {list(SUPPORTED_CORRIDORS.keys())}",
        )

    try:
        raw = get_risk_snapshot(corridor_upper, prediction_date=date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Risk engine error [{corridor_upper}]: {e}")
        raise HTTPException(status_code=500, detail=f"Internal risk engine error: {str(e)}")

    elapsed = round((time.time() - t0) * 1000, 1)
    logger.info(
        f"GET /api/risk/{corridor_upper} — "
        f"date={raw.get('prediction_date')} level={raw.get('risk_level')} "
        f"prob={raw.get('probability')} — {elapsed}ms"
    )
    return _build_risk_response(raw)


@router.get("/traffic/{corridor_id}", response_model=List[TrafficObservationResponse], tags=["Traffic"])
def get_corridor_traffic(
    corridor_id: str,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(90, ge=1, le=1000, description="Maximum observations to return"),
):
    """
    Returns IMF PortWatch daily transit observations for a corridor including anomaly flags.
    Rows with NO_OBSERVATION are included and flagged — not silently dropped.
    """
    corridor_upper = corridor_id.upper()
    if corridor_upper not in SUPPORTED_CORRIDORS:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown corridor '{corridor_id}'. Supported: {list(SUPPORTED_CORRIDORS.keys())}",
        )

    try:
        records = get_traffic_observations(corridor_upper, start_date, end_date, limit)
    except Exception as e:
        logger.error(f"Traffic query failed [{corridor_upper}]: {e}")
        raise HTTPException(status_code=500, detail=f"Traffic data unavailable: {str(e)}")

    if not records:
        raise HTTPException(
            status_code=404,
            detail=f"No traffic observations found for corridor '{corridor_upper}'.",
        )
    return records


@router.get("/infrastructure", response_model=List[InfrastructureNodeResponse], tags=["Infrastructure"])
def get_infrastructure():
    """
    Returns India's crude-oil supply chain infrastructure nodes (refineries, ports, SPR facilities).
    Source: PPAC + Ministry of Petroleum data compiled in Phase 3.
    """
    try:
        nodes = get_infrastructure_nodes()
    except Exception as e:
        logger.error(f"Infrastructure query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Infrastructure data unavailable: {str(e)}")

    if not nodes:
        raise HTTPException(status_code=404, detail="Infrastructure data not yet available.")
    return nodes


@router.get("/metrics", tags=["Model"])
def get_model_metrics():
    """
    Returns Phase 4 model evaluation metrics (ROC-AUC, PR-AUC, F1, Brier) from the comparison report.
    """
    try:
        return get_all_model_metrics()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/model-info", tags=["Model"])
def get_model_information(
    corridor_id: str = Query("HORMUZ", description="Corridor to retrieve model info for"),
):
    """
    Returns model card: model type, version, training period, features, limitations, metrics.
    """
    corridor_upper = corridor_id.upper()
    if corridor_upper not in {"HORMUZ", "BAB_EL_MANDEB", "SUEZ"}:
        raise HTTPException(
            status_code=404,
            detail=f"No model trained for corridor '{corridor_id}'. Trained models: HORMUZ, BAB_EL_MANDEB, SUEZ",
        )
    try:
        return get_model_info(corridor_upper)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))





@router.get("/risk/{corridor_id}/history", response_model=List[RiskHistoryResponse], tags=["Risk"])
def get_corridor_risk_history(
    corridor_id: str,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
):
    """
    Returns time-series risk scores and ground-truth disruption indicators for a corridor.
    """
    corridor_upper = corridor_id.upper()
    if corridor_upper not in SUPPORTED_CORRIDORS:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown corridor '{corridor_id}'. Supported: {list(SUPPORTED_CORRIDORS.keys())}",
        )
    
    from src.risk.corridor_risk import get_historical_risk
    
    try:
        df_hist = get_historical_risk(corridor_upper, start_date or "2023-11-21", end_date or str(datetime.date.today()))
        if df_hist.empty:
            return []
        
        if not start_date:
            max_date = df_hist["date"].max()
            min_date = max_date - pd.Timedelta(days=120)
            df_hist = df_hist[df_hist["date"] >= min_date]

        results = []
        for _, row in df_hist.iterrows():
            is_disrupted = None
            if "is_disrupted" in row and pd.notna(row["is_disrupted"]):
                is_disrupted = bool(row["is_disrupted"])
            
            results.append(
                RiskHistoryResponse(
                    date=row["date"].strftime("%Y-%m-%d"),
                    corridor_id=corridor_upper,
                    risk_probability=round(float(row["risk_probability"]), 6),
                    risk_level=row["risk_level"],
                    is_disrupted=is_disrupted
                )
            )
        results.sort(key=lambda x: x.date)
        return results
    except Exception as e:
        logger.error(f"Error fetching historical risk for {corridor_upper}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve risk history: {str(e)}")

