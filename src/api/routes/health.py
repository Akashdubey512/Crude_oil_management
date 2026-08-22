import datetime
import os
import logging
from fastapi import APIRouter, HTTPException, Response
from src.api.schemas import HealthResponse

logger = logging.getLogger(__name__)
router = APIRouter()

MODEL_VERSION = "1.0"

@router.get("/health", response_model=HealthResponse, tags=["System"])
def health_check() -> HealthResponse:
    """
    Returns service health status, active model version, data timestamp, and environment.
    (Preserved for backward compatibility with Phase 1-11 checks).
    """
    from src.api.config import settings
    traffic_path = os.path.join(settings.data_dir, "processed", "corridor_traffic_daily.csv")

    data_timestamp = "UNAVAILABLE"
    if os.path.exists(traffic_path):
        try:
            import pandas as pd
            df = pd.read_csv(traffic_path)
            data_timestamp = str(df["date"].max())
        except Exception:
            pass

    return HealthResponse(
        status="healthy",
        model_version=MODEL_VERSION,
        data_timestamp=data_timestamp,
        environment=settings.environment,
    )

@router.get("/health/live", tags=["System"])
def liveness_check() -> dict:
    """
    Liveness probe. Returns 200 immediately to signify the process is running.
    Should remain extremely lightweight (no external database or disk calls).
    """
    return {"status": "ok", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()}

@router.get("/health/ready", tags=["System"])
def readiness_check(response: Response) -> dict:
    """
    Readiness probe. Checks database connectivity, model registry manifest integrity,
    and presence of champion models before accepting external traffic.
    """
    from src.api.database import get_db_connection, release_db_connection
    from src.models.model_registry import _load_registry
    from src.api.config import settings

    status = "READY"
    details = {}
    is_ready = True

    # 1. Check database connectivity
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1;")
        cursor.fetchone()
        cursor.close()
        release_db_connection(conn)
        details["database"] = "CONNECTED"
    except Exception as e:
        logger.error(f"Readiness check failed: Database connection error: {e}")
        status = "NOT_READY"
        details["database"] = f"ERROR: {e}"
        is_ready = False

    # 2. Check model registry manifest
    try:
        registry = _load_registry()
        details["model_registry"] = f"LOADED ({len(registry)} models)"
    except Exception as e:
        logger.error(f"Readiness check failed: Registry manifest error: {e}")
        status = "NOT_READY"
        details["model_registry"] = f"ERROR: {e}"
        is_ready = False

    # 3. Check champion models availability
    try:
        from src.models.model_registry import get_champion_model
        # HORMUZ should always have a champion
        champs = [get_champion_model("HORMUZ"), get_champion_model("BAB_EL_MANDEB"), get_champion_model("SUEZ")]
        champs_found = [c for c in champs if c]
        details["champion_models"] = f"{len(champs_found)} / 3 found"
    except Exception as e:
        logger.error(f"Readiness check failed: Model champion check error: {e}")
        status = "NOT_READY"
        details["champion_models"] = f"ERROR: {e}"
        is_ready = False

    # 4. Check critical settings directories
    if not os.path.exists(settings.model_dir):
        logger.warning(f"Readiness check warning: model_dir '{settings.model_dir}' does not exist")
        details["model_dir"] = "MISSING"
    else:
        details["model_dir"] = "OK"

    if not is_ready:
        response.status_code = 503
        return {"status": "NOT_READY", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(), "details": details}

    return {"status": "READY", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(), "details": details}
