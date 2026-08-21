import logging
from fastapi import APIRouter, HTTPException, Query
from src.api.schemas import BrentPriceResponse
from src.api.services.price_service import get_brent_prices

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/prices", response_model=BrentPriceResponse, tags=["Market"])
def get_crude_prices(
    limit: int = Query(90, ge=1, le=1000, description="Max historical price entries to return")
):
    """
    Returns real Brent crude oil price metrics, log returns, and rolling volatility,
    along with data source information. Zero mock values.
    """
    try:
        prices = get_brent_prices(limit)
        return prices
    except FileNotFoundError as e:
        logger.error(f"Brent price file missing: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to fetch Brent prices: {e}")
        raise HTTPException(status_code=500, detail="Internal server error fetching market prices.")
