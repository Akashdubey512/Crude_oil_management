from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

# --- Health Schema ---
class HealthResponse(BaseModel):
    status: str = Field(..., description="Application operational status (e.g. 'healthy')")
    model_version: str = Field(..., description="Active inference model version")
    data_timestamp: str = Field(..., description="Timestamp of the latest processed updates")
    environment: str = Field(..., description="Runtime environment indicator")

# --- Corridor Schema ---
class CorridorResponse(BaseModel):
    corridor_id: str = Field(..., description="Unique corridor identifier (e.g. 'HORMUZ')")
    name: str = Field(..., description="Full descriptive name")
    description: str = Field(..., description="Geographic description of the chokepoint")
    source: str = Field(..., description="Authoritative boundary source citation")
    source_url: str = Field(..., description="URL citation for spatial geometry")

# --- Risk Components ---
class DataFreshness(BaseModel):
    traffic: str = Field(..., description="Date of the latest daily PortWatch transit record")
    geopolitical: str = Field(..., description="Date of the latest GPR index record")
    price: str = Field(..., description="Date of the latest Brent crude price record")

class RiskDecomposition(BaseModel):
    geopolitical: float = Field(..., description="Normalized geopolitical risk vector contribution")
    maritime: float = Field(..., description="Normalized maritime/logistics risk contribution")
    energy_market: float = Field(..., description="Normalized Brent crude price risk contribution")
    infrastructure: float = Field(..., description="Normalized supply/refinery risk contribution")
    historical_pattern: float = Field(..., description="Normalized historical/seasonal pattern risk contribution")

class RiskSnapshotResponse(BaseModel):
    corridor: str = Field(..., description="Corridor ID")
    risk_score: float = Field(..., description="Calculated overall risk score (scaled probability)")
    risk_level: str = Field(..., description="Classified risk band: LOW, MODERATE, HIGH, CRITICAL")
    probability: float = Field(..., description="Model-generated raw probability value [0, 1]")
    prediction_date: str = Field(..., description="Target prediction date (YYYY-MM-DD)")
    model_version: str = Field(..., description="Version of the model used for prediction")
    data_freshness: DataFreshness = Field(..., description="Raw data availability thresholds")
    risk_decomposition: RiskDecomposition = Field(..., description="Relative risk decomposition scores")
    top_factors: List[str] = Field(..., description="Top features contributing to the risk calculation")
    limitations: List[str] = Field(..., description="Documented model and feature limitations")

# --- Event Schema ---
class GeopoliticalEventResponse(BaseModel):
    event_id: str = Field(..., description="Unique event identifier (SHA-256 hash)")
    event_date: str = Field(..., description="Date of the event occurrence (YYYY-MM-DD)")
    source: str = Field(..., description="Source provider (GDELT or OFAC)")
    event_type: str = Field(..., description="Classified category (e.g. sanctions, tanker attack)")
    corridor_id: str = Field(..., description="Corridor mapping ID")
    text_reference: str = Field(..., description="Detailed text reference or summary snippet")
    source_url: str = Field(..., description="Source article or document URL link")

# --- Traffic Schema ---
class TrafficObservationResponse(BaseModel):
    date: str = Field(..., description="Observation date (YYYY-MM-DD)")
    corridor_id: str = Field(..., description="Corridor ID")
    vessel_count: int = Field(..., description="Observed total vessel count")
    tanker_count: int = Field(..., description="Observed tanker transit count")
    cargo_count: int = Field(..., description="Observed cargo transit count")
    anomaly_flag: bool = Field(..., description="Boolean flag if day falls into a statistical anomaly")
    anomaly_type: str = Field(..., description="Type of anomaly (NORMAL, TRAFFIC_DROP, CONGESTION)")
    data_availability: str = Field(..., description="Observed status (OBSERVED or NO_OBSERVATION)")

# --- Infrastructure Schema ---
class InfrastructureNodeResponse(BaseModel):
    facility_id: str = Field(..., description="Unique facility identifier hash")
    name: str = Field(..., description="Operational name of facility")
    facility_type: str = Field(..., description="Type of facility: port, refinery, or spr")
    operator: str = Field(..., description="Operating company or authority")
    country: str = Field(..., description="Facility country location")
    state: str = Field(..., description="Facility state location")
    latitude: float = Field(..., description="Facility latitude coordinate")
    longitude: float = Field(..., description="Facility longitude coordinate")
    capacity: Optional[float] = Field(None, description="Volume capacity of the facility")
    unit: str = Field(..., description="Measurement unit (e.g. MMT, MMTPA)")

# --- Model Info Schemas ---
class ModelMetrics(BaseModel):
    validation: Dict[str, Any] = Field(..., description="Metrics evaluated on the validation split")
    test: Dict[str, Any] = Field(..., description="Metrics evaluated on the out-of-time test split")

class ModelInfoResponse(BaseModel):
    model_name: str = Field(..., description="Type of model (e.g. XGBoost)")
    version: str = Field(..., description="Active version tag")
    training_start: str = Field(..., description="Start date of the training timeline")
    training_end: str = Field(..., description="End date of the training timeline")
    features_used: List[str] = Field(..., description="List of feature names")
    limitations: List[str] = Field(..., description="Model card caveats")
    metrics: ModelMetrics = Field(..., description="Out-of-time partition validation statistics")
