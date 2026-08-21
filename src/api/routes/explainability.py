import logging
from fastapi import APIRouter, HTTPException, Query
from src.api.schemas import ExplainabilityResponse
from src.api.services.explainability_service import get_model_explainability

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/models/explainability", response_model=ExplainabilityResponse, tags=["Model"])
def get_explainability(
    corridor_id: str = Query(..., description="Corridor ID to retrieve explainability features for (e.g. HORMUZ)")
):
    """
    Returns global SHAP tree-explainability importances for the trained XGBoost model of a corridor.
    Raises 404 if explainability data is unavailable (e.g. for RED_SEA).
    """
    try:
        explanation = get_model_explainability(corridor_id)
        return explanation
    except FileNotFoundError as e:
        logger.warning(f"Explainability not found for {corridor_id}: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to fetch explainability: {e}")
        raise HTTPException(status_code=500, detail="Internal server error fetching model explainability.")
