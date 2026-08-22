"""
Forecast Routes — Phase 14
GET /api/forecast             — all corridors 7-day forecast
GET /api/forecast/{corridor}  — single corridor 7-day forecast
"""

import logging
from fastapi import APIRouter, HTTPException, Depends
from src.api.auth import authenticate_key
from src.api.services.forecast_service import generate_corridor_forecast, generate_all_forecasts
from src.api.services.risk_service import SUPPORTED_CORRIDORS

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/forecast", tags=["Forecast — Phase 14"])
def get_all_forecasts(auth: dict = Depends(authenticate_key)):
    """Returns 7-day risk probability forecasts for all corridors."""
    return generate_all_forecasts()


@router.get("/forecast/{corridor_id}", tags=["Forecast — Phase 14"])
def get_corridor_forecast(corridor_id: str, auth: dict = Depends(authenticate_key)):
    """Returns a 7-day risk probability forecast for a specific corridor."""
    corridor_id = corridor_id.upper()
    if corridor_id not in SUPPORTED_CORRIDORS:
        raise HTTPException(
            status_code=404,
            detail=f"Corridor '{corridor_id}' not found. Valid: {list(SUPPORTED_CORRIDORS.keys())}"
        )
    try:
        return generate_corridor_forecast(corridor_id)
    except Exception as e:
        logger.error(f"Forecast failed for {corridor_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Forecast generation failed: {e}")
