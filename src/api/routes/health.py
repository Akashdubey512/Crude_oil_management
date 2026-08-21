import datetime
import os
from fastapi import APIRouter
from src.api.schemas import HealthResponse

router = APIRouter()

MODEL_VERSION = "1.0"


@router.get("/health", response_model=HealthResponse, tags=["System"])
def health_check() -> HealthResponse:
    """
    Returns service health status, active model version, data timestamp, and environment.
    """
    data_dir = os.getenv("DATA_DIR", r"D:\hackathon project\energy-resilience\data")
    traffic_path = os.path.join(data_dir, "processed", "corridor_traffic_daily.csv")

    data_timestamp = "UNAVAILABLE"
    if os.path.exists(traffic_path):
        import pandas as pd
        df = pd.read_csv(traffic_path)
        data_timestamp = str(df["date"].max())

    return HealthResponse(
        status="healthy",
        model_version=MODEL_VERSION,
        data_timestamp=data_timestamp,
        environment=os.getenv("ENVIRONMENT", "development"),
    )
