from fastapi import APIRouter
from typing import List
from src.api.schemas import CorridorResponse

router = APIRouter()

CORRIDORS = [
    CorridorResponse(
        corridor_id="HORMUZ",
        name="Strait of Hormuz",
        description=(
            "Narrow waterway between Iran and Oman connecting the Persian Gulf to the Gulf of Oman. "
            "Approximately 30% of global seaborne crude oil and LNG passes through this chokepoint daily."
        ),
        source="IMF PortWatch (ArcGIS FeatureServer) + Caldara-Iacoviello GPR",
        source_url="https://portwatch.imf.org/",
    ),
    CorridorResponse(
        corridor_id="BAB_EL_MANDEB",
        name="Bab-el-Mandeb Strait",
        description=(
            "Strait between Yemen and Djibouti/Eritrea linking the Red Sea and Gulf of Aden. "
            "Critical chokepoint for east–west tanker routes via the Suez Canal."
        ),
        source="IMF PortWatch (ArcGIS FeatureServer)",
        source_url="https://portwatch.imf.org/",
    ),
    CorridorResponse(
        corridor_id="SUEZ",
        name="Suez Canal",
        description=(
            "Artificial waterway in Egypt linking the Mediterranean Sea to the Red Sea. "
            "Approximately 12% of global trade passes through the canal annually."
        ),
        source="IMF PortWatch (ArcGIS FeatureServer)",
        source_url="https://portwatch.imf.org/",
    ),
    CorridorResponse(
        corridor_id="RED_SEA",
        name="Red Sea",
        description=(
            "Strategic maritime corridor between Africa and the Arabian Peninsula. "
            "Geopolitical events tracked via GDELT. No independent traffic model trained."
        ),
        source="GDELT DOC API v2",
        source_url="https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/",
    ),
]


@router.get("/corridors", response_model=List[CorridorResponse], tags=["Corridors"])
def get_corridors() -> List[CorridorResponse]:
    """
    Returns all supported energy corridors with geographic descriptions and data source citations.
    """
    return CORRIDORS
