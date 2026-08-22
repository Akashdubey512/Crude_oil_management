"""
Alert Routes — Phase 14
GET  /api/alerts              — list active alerts
GET  /api/alerts/rules        — list alert rules
POST /api/alerts/rules        — create alert rule (ADMIN)
GET  /api/alerts/history      — paginated alert history
POST /api/alerts/{id}/acknowledge — acknowledge alert (ANALYST+)
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from src.api.auth import authenticate_key
from src.api.services.alert_service import (
    get_active_alerts, get_active_rules, create_rule,
    get_alert_history, acknowledge_alert
)

logger = logging.getLogger(__name__)
router = APIRouter()


class AlertRuleRequest(BaseModel):
    corridor_id: str = Field(..., description="HORMUZ | BAB_EL_MANDEB | SUEZ | RED_SEA")
    metric: str = Field("risk_score", description="risk_score | probability")
    operator: str = Field(">=", description=">= or >")
    threshold: float = Field(..., description="Numeric threshold value")
    severity: str = Field("WARNING", description="WARNING | CRITICAL")


class AcknowledgeRequest(BaseModel):
    acknowledged_by: str = Field(..., description="Actor ID or name acknowledging the alert")


@router.get("/alerts", tags=["Alerts — Phase 14"])
def list_active_alerts(
    corridor_id: Optional[str] = Query(None, description="Filter by corridor"),
    auth: dict = Depends(authenticate_key)
):
    """Returns all currently ACTIVE alerts, optionally filtered by corridor."""
    alerts = get_active_alerts(corridor_id=corridor_id)
    return {"active_alerts": alerts, "count": len(alerts)}


@router.get("/alerts/rules", tags=["Alerts — Phase 14"])
def list_alert_rules(auth: dict = Depends(authenticate_key)):
    """Returns all enabled alert threshold rules."""
    rules = get_active_rules()
    return {"rules": rules, "count": len(rules)}


@router.post("/alerts/rules", tags=["Alerts — Phase 14"], status_code=201)
def create_alert_rule(req: AlertRuleRequest, auth: dict = Depends(authenticate_key)):
    """Creates a new alert threshold rule. Requires ADMIN scope."""
    if "ADMIN" not in auth.get("scopes", []):
        raise HTTPException(status_code=403, detail="Admin scope required to create alert rules.")

    valid_corridors = ["HORMUZ", "BAB_EL_MANDEB", "SUEZ", "RED_SEA"]
    if req.corridor_id not in valid_corridors:
        raise HTTPException(status_code=400, detail=f"corridor_id must be one of {valid_corridors}")
    if req.metric not in ("risk_score", "probability"):
        raise HTTPException(status_code=400, detail="metric must be risk_score or probability")
    if req.operator not in (">", ">="):
        raise HTTPException(status_code=400, detail="operator must be > or >=")
    if req.severity not in ("WARNING", "CRITICAL"):
        raise HTTPException(status_code=400, detail="severity must be WARNING or CRITICAL")

    try:
        rule = create_rule(
            corridor_id=req.corridor_id,
            metric=req.metric,
            operator=req.operator,
            threshold=req.threshold,
            severity=req.severity,
            created_by=auth.get("actor_id", "unknown")
        )
        return {"message": "Alert rule created.", "rule": rule}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create rule: {e}")


@router.get("/alerts/history", tags=["Alerts — Phase 14"])
def alert_history(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    auth: dict = Depends(authenticate_key)
):
    """Returns paginated alert event history (all statuses)."""
    alerts, total = get_alert_history(page=page, limit=limit)
    return {
        "alerts": alerts,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, (total + limit - 1) // limit)
    }


@router.post("/alerts/{alert_id}/acknowledge", tags=["Alerts — Phase 14"])
def acknowledge(alert_id: int, req: AcknowledgeRequest, auth: dict = Depends(authenticate_key)):
    """Acknowledges an ACTIVE alert. Requires ANALYST or higher scope."""
    allowed_scopes = {"ANALYST", "ML_ENGINEER", "ADMIN", "WRITE"}
    if not (allowed_scopes & set(auth.get("scopes", []))):
        raise HTTPException(status_code=403, detail="ANALYST or higher scope required.")

    updated = acknowledge_alert(alert_id, req.acknowledged_by)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found or not ACTIVE.")
    return {"message": f"Alert {alert_id} acknowledged by {req.acknowledged_by}."}
