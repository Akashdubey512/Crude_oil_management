"""
GenAI Executive Briefing & Natural-Language Assistant Routes — Phase 19
Exposes POST /api/corridors/{corridor}/briefing and POST /api/assistant/query endpoints.
READ scope RBAC.
"""

import logging
from fastapi import APIRouter, HTTPException, Query
from src.api.schemas import ExecutiveBriefingResponse, AnalystQueryRequest, AnalystQueryResponse
from src.api.services.briefing_service import generate_executive_briefing, answer_analyst_query

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/corridors/{corridor}/briefing", response_model=ExecutiveBriefingResponse, tags=["GenAI Intelligence"])
def get_corridor_executive_briefing(corridor: str, force_refresh: bool = Query(False, description="Force fresh briefing generation")):
    """
    Generates a constrained, auditable 4-6 line executive brief for a maritime corridor.
    Uses Claude LLM when ANTHROPIC_API_KEY is configured, or falls back to a deterministic audit-safe template.
    Responses are cached for 15 minutes.
    """
    try:
        return generate_executive_briefing(corridor, force_refresh=force_refresh)
    except Exception as e:
        logger.error(f"Error generating executive briefing for {corridor}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate briefing: {str(e)}")


@router.post("/assistant/query", response_model=AnalystQueryResponse, tags=["GenAI Intelligence"])
def post_analyst_query(req: AnalystQueryRequest):
    """
    Natural language analyst query bar endpoint.
    Classifies question intent, executes authoritative backend service retrieval, and returns an answer
    alongside underlying source data.
    """
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty.")
    try:
        return answer_analyst_query(req.query)
    except Exception as e:
        logger.error(f"Error processing analyst query '{req.query}': {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process analyst query: {str(e)}")
