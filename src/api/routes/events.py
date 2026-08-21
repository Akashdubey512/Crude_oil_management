import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from src.api.schemas import GeopoliticalEventResponse
from src.api.services.event_service import get_geopolitical_events

logger = logging.getLogger(__name__)
router = APIRouter()

SUPPORTED_CORRIDORS = {"HORMUZ", "BAB_EL_MANDEB", "SUEZ", "RED_SEA", "UNMAPPED"}


@router.get("/events", response_model=List[GeopoliticalEventResponse], tags=["Events"])
def get_all_events(
    start_date: Optional[str] = Query(None, description="Filter start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter end date (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of events to return"),
):
    """
    Returns all normalized geopolitical events across all corridors, optionally filtered by date.
    Sources: GDELT DOC API v2 and OFAC SDN list.
    """
    try:
        events = get_geopolitical_events(
            corridor_id=None, start_date=start_date, end_date=end_date
        )
        return events[:limit]
    except Exception as e:
        logger.error(f"Event query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Event data unavailable: {str(e)}")


@router.get("/events/{corridor_id}", response_model=List[GeopoliticalEventResponse], tags=["Events"])
def get_corridor_events(
    corridor_id: str,
    start_date: Optional[str] = Query(None, description="Filter start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter end date (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of events to return"),
):
    """
    Returns geopolitical events mapped to a specific corridor.
    Sources: GDELT DOC API v2 and OFAC SDN list.
    """
    corridor_upper = corridor_id.upper()
    if corridor_upper not in SUPPORTED_CORRIDORS:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown corridor '{corridor_id}'. Supported: HORMUZ, BAB_EL_MANDEB, SUEZ, RED_SEA",
        )
    try:
        events = get_geopolitical_events(
            corridor_id=corridor_upper, start_date=start_date, end_date=end_date
        )
        return events[:limit]
    except Exception as e:
        logger.error(f"Corridor event query failed [{corridor_upper}]: {e}")
        raise HTTPException(status_code=500, detail=f"Event data unavailable: {str(e)}")
