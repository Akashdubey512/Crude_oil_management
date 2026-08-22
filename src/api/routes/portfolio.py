"""
Portfolio Routes — Phase 14
GET /api/portfolio/risk   — India-weighted aggregate risk snapshot
GET /api/portfolio/trend  — 30-day portfolio risk trend
"""

import logging
from fastapi import APIRouter, Query, Depends
from src.api.auth import authenticate_key
from src.api.services.portfolio_service import compute_portfolio_risk, compute_portfolio_trend

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/portfolio/risk", tags=["Portfolio — Phase 14"])
def get_portfolio_risk(auth: dict = Depends(authenticate_key)):
    """Returns the India-weighted aggregate supply chain risk score across all corridors."""
    return compute_portfolio_risk()


@router.get("/portfolio/trend", tags=["Portfolio — Phase 14"])
def get_portfolio_trend(
    days: int = Query(30, ge=7, le=90, description="Number of historical days"),
    auth: dict = Depends(authenticate_key)
):
    """Returns the portfolio risk trend over the last N days."""
    trend = compute_portfolio_trend(days=days)
    return {"days": days, "trend": trend}
