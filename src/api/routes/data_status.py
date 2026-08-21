import logging
from typing import List
from fastapi import APIRouter, HTTPException
from src.api.schemas import SourceStatusResponse
from src.api.services.data_status_service import get_data_freshness_status

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/data-status", response_model=List[SourceStatusResponse], tags=["Observability"])
def get_data_status():
    """
    Returns real data freshness, statuses, row counts, and limitations for all 11 external data feeds.
    """
    try:
        status_records = get_data_freshness_status()
        return status_records
    except Exception as e:
        logger.error(f"Failed to fetch data status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error fetching data freshness status.")
