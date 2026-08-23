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

# --- Price Schemas ---
class PriceHistoryEntry(BaseModel):
    date: str = Field(..., description="Trading date (YYYY-MM-DD)")
    price: float = Field(..., description="Brent crude spot price value")
    daily_return: Optional[float] = Field(None, description="Daily log return ratio")

class BrentPriceResponse(BaseModel):
    latest_price: float = Field(..., description="Most recent Brent crude price")
    latest_date: str = Field(..., description="Date of the most recent price observation")
    daily_return: Optional[float] = Field(None, description="Most recent daily return")
    volatility_7d: Optional[float] = Field(None, description="7-day rolling return standard deviation")
    volatility_28d: Optional[float] = Field(None, description="28-day rolling return standard deviation")
    data_freshness: str = Field(..., description="Latest price timestamp/date")
    source: str = Field(..., description="Price data publisher source")
    historical_prices: List[PriceHistoryEntry] = Field(..., description="Time-series list of historical price objects")

# --- Data Status / Observability ---
class SourceStatusResponse(BaseModel):
    source_name: str = Field(..., description="Name of the external data feed or pipeline step")
    latest_date: str = Field(..., description="Latest record date (YYYY-MM-DD) or 'UNAVAILABLE'")
    status: str = Field(..., description="Observed health: FRESH, STALE, UNAVAILABLE, or PARTIAL")
    row_count: Optional[int] = Field(None, description="Total number of database or CSV file records")
    retrieval_timestamp: Optional[str] = Field(None, description="Datetime when the dataset was last ingested")
    source_url: str = Field(..., description="Authoritative reference or dataset URL")
    limitation: Optional[str] = Field(None, description="Documented data limitation or credential note")

# --- Model Explainability ---
class FeatureImportanceEntry(BaseModel):
    feature: str = Field(..., description="Model input feature name")
    mean_abs_shap: float = Field(..., description="Global mean absolute SHAP feature importance")

class ExplainabilityResponse(BaseModel):
    model_name: str = Field(..., description="Algorithm type (e.g., XGBoost)")
    corridor_id: str = Field(..., description="Monitored chokepoint corridor ID")
    method: str = Field(..., description="Explainability attribution method (e.g. SHAP)")
    global_importance: List[FeatureImportanceEntry] = Field(..., description="Sorted features list by impact weight")


# --- Phase 8 Schemas ---

class RiskHistoryResponse(BaseModel):
    date: str = Field(..., description="Prediction date (YYYY-MM-DD)")
    corridor_id: str = Field(..., description="Corridor ID")
    risk_probability: float = Field(..., description="Model risk probability [0, 1]")
    risk_level: str = Field(..., description="LOW, MODERATE, HIGH, CRITICAL, UNKNOWN")
    is_disrupted: Optional[bool] = Field(None, description="Actual disruption ground truth flag")


class CorridorComparisonItem(BaseModel):
    corridor_id: str = Field(..., description="Corridor ID")
    name: str = Field(..., description="Full descriptive name")
    risk_level: str = Field(..., description="Risk Level band")
    probability: Optional[float] = Field(None, description="Risk probability value")
    risk_score: Optional[float] = Field(None, description="Risk score (0-100)")
    primary_driver: Optional[str] = Field(None, description="Primary SHAP feature driver")
    vessel_volume_status: str = Field(..., description="Traffic volume status: NORMAL or DROP")
    geopolitical_status: str = Field(..., description="Geopolitical status: NORMAL or ELEVATED")
    data_freshness_traffic: str = Field(..., description="Freshness date of the traffic data source")


class CorridorComparisonResponse(BaseModel):
    comparison_date: str = Field(..., description="Target date of this comparison")
    items: List[CorridorComparisonItem] = Field(..., description="Comparison records for all active corridors")


class DailyDrawdownEntry(BaseModel):
    day: int = Field(..., description="Day index in drawdown schedule (1..N)")
    recommended_release_mbpd: float = Field(..., description="Recommended release volume for this day in MBPD")
    cumulative_released_mbpd: float = Field(..., description="Cumulative released volume up to this day in MBPD")
    remaining_spr_buffer_days: float = Field(..., description="Estimated remaining SPR buffer in days after this day's release")


class DrawdownScheduleResponse(BaseModel):
    strategy: str = Field(..., description="Drawdown strategy: 'front_loaded' or 'smoothed'")
    predicted_supply_gap_mbpd: float = Field(..., description="Estimated daily supply gap volume in MBPD")
    disruption_duration_days: int = Field(..., description="Expected disruption duration in days")
    spr_buffer_days: float = Field(..., description="Configured initial SPR buffer in days")
    total_recommended_release_mbpd: float = Field(..., description="Total volume recommended for release across schedule")
    buffer_exhausted: bool = Field(..., description="Flag indicating if the required drawdown exceeds available SPR buffer")
    warning_message: Optional[str] = Field(None, description="Warning if SPR buffer is insufficient or exhausted")
    schedule: List[DailyDrawdownEntry] = Field(..., description="Day-by-day drawdown schedule entries")
    heuristic_note: str = Field(
        "Heuristic planning tool for scenario decision support; not a globally-optimal mathematical solution.",
        description="Explanatory note on optimization heuristic"
    )


class ScenarioSimulationRequest(BaseModel):
    corridor_id: str = Field(..., description="Corridor ID to simulate (HORMUZ, BAB_EL_MANDEB, SUEZ)")
    baseline_date: Optional[str] = Field(None, description="Baseline date to simulate on. Defaults to latest available.")
    tanker_transit_multiplier: float = Field(1.0, description="Multiplier for tanker/vessel traffic (e.g. 0.8 for a 20% drop)")
    gpr_multiplier: float = Field(1.0, description="Multiplier for Geopolitical Risk index (e.g. 1.5 for 50% increase)")
    brent_price_multiplier: float = Field(1.0, description="Multiplier for Brent crude price (e.g. 1.2 for 20% increase)")
    brent_volatility_multiplier: float = Field(1.0, description="Multiplier for Brent volatility (e.g. 1.5 for 50% increase)")
    infrastructure_disruption: bool = Field(False, description="Whether to simulate an active refinery/infrastructure supply drop flag")
    spr_buffer_days: float = Field(9.5, description="Initial Strategic Petroleum Reserve buffer in days (default 9.5)")
    drawdown_strategy: str = Field("front_loaded", description="Drawdown allocation strategy: 'front_loaded' or 'smoothed'")


class EconomicImpactResponse(BaseModel):
    daily_import_cost_delta_usd_m: float = Field(..., description="Estimated daily crude import cost change in $ Million USD")
    annualized_import_bill_delta_usd_b: float = Field(..., description="Annualized crude import bill impact in $ Billion USD")
    estimated_gdp_growth_impact_pct: float = Field(..., description="Illustrative annualized GDP growth impact (percentage points)")
    refining_throughput_drop_pct: float = Field(..., description="Estimated refining throughput reduction (%)")
    elasticity_formula: str = Field(..., description="Formula used for illustrative economic impact estimation")
    methodology_note: str = Field(..., description="Mandatory caveat stating this is an illustrative estimate based on RBI/IMF elasticity")


class SupplierExposureItem(BaseModel):
    supplier_country: str = Field(..., description="Crude supplier country name (e.g. Iraq, Saudi Arabia, Russia)")
    country_code: str = Field(..., description="ISO-2 country code (e.g. IQ, SA, RU, AE, KW, NG)")
    import_share_pct: float = Field(..., description="Share of India's total crude oil imports (%)")
    primary_corridor: str = Field(..., description="Primary transit corridor for crude shipments")
    exposure_score: float = Field(..., description="Computed disruption exposure score [0-100]")
    risk_level: str = Field(..., description="Calculated risk band: MINIMAL, LOW, MODERATE, HIGH, CRITICAL")
    corridor_weights: Dict[str, float] = Field(..., description="Corridor exposure weight mapping")


class SupplierExposureResponse(BaseModel):
    computed_at: str = Field(..., description="ISO-8601 computation timestamp")
    suppliers: List[SupplierExposureItem] = Field(..., description="List of supplier country risk exposure items")
    methodology: str = Field(..., description="Explicit declaration of modeling methodology and data proxy limitation")


class ExecutiveBriefingResponse(BaseModel):
    corridor_id: str = Field(..., description="Corridor ID (e.g. HORMUZ, SUEZ, BAB_EL_MANDEB)")
    corridor_name: str = Field(..., description="Full corridor name")
    briefing_text: str = Field(..., description="Constrained 4-6 line executive briefing phrased by LLM or audit-safe template")
    llm_generated: bool = Field(..., description="Flag indicating if text was generated via active Anthropic API call")
    llm_status: str = Field(..., description="LLM status: 'active_claude' or 'disabled_fallback'")
    disclaimer: str = Field(..., description="Auditable disclaimer text")
    context: Dict[str, Any] = Field(..., description="Underlying verified numeric context object")
    generated_at: str = Field(..., description="ISO-8601 generation timestamp")


class AnalystQueryRequest(BaseModel):
    query: str = Field(..., description="Natural language analyst query text")


class AnalystQueryResponse(BaseModel):
    query: str = Field(..., description="Original user query")
    intent: str = Field(..., description="Classified intent (e.g. CORRIDOR_LOOKUP, EXPLAINABILITY, CROSS_CORRIDOR_COMPARISON)")
    target_corridor: str = Field(..., description="Identified corridor target")
    answer: str = Field(..., description="Natural language answer text")
    llm_generated: bool = Field(..., description="Flag indicating if answer was phrased via active Anthropic API call")
    source_data: Dict[str, Any] = Field(..., description="Authoritative underlying source data object used for response")
    generated_at: str = Field(..., description="ISO-8601 generation timestamp")


class ScenarioSimulationResponse(BaseModel):
    corridor_id: str = Field(..., description="Corridor ID")
    baseline_date: str = Field(..., description="Baseline date used")
    baseline_probability: float = Field(..., description="Model risk probability before adjustments")
    baseline_risk_level: str = Field(..., description="Model risk level before adjustments")
    simulated_probability: float = Field(..., description="Simulated risk probability after adjustments")
    simulated_risk_level: str = Field(..., description="Simulated risk level after adjustments")
    probability_delta: float = Field(..., description="Difference in risk probability (simulated - baseline)")
    feature_mutations: Dict[str, Any] = Field(..., description="Summary of modified features and their baseline vs simulated values")
    explanation: str = Field(..., description="Decision-oriented explanation of why the risk changed or didn't")
    recommendation: str = Field(..., description="Recommended action based on the model's actual risk drivers and active features")
    drawdown_schedule: Optional[DrawdownScheduleResponse] = Field(None, description="Strategic Petroleum Reserve drawdown schedule forecast")
    economic_impact: Optional[EconomicImpactResponse] = Field(None, description="Cascading refining throughput, price shock, and GDP growth impact estimate")


# --- Phase 9 Schemas ---

class ModelEvaluationMetrics(BaseModel):
    roc_auc: Optional[float] = None
    pr_auc: Optional[float] = None
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1: Optional[float] = None
    specificity: Optional[float] = None
    mcc: Optional[float] = None
    brier_score: Optional[float] = None
    log_loss: Optional[float] = None


class CalibrationBinEntry(BaseModel):
    bin_midpoint: float
    predicted_prob: float
    observed_freq: float


class CalibrationInfo(BaseModel):
    status: str
    ece: Optional[float] = None
    curve: List[CalibrationBinEntry] = []


class ModelEvaluationResponse(BaseModel):
    model_version: str
    evaluation_period: Dict[str, str]
    sample_count: int
    positive_count: int
    negative_count: int
    metrics: ModelEvaluationMetrics
    calibration: CalibrationInfo
    data_quality: Dict[str, Any]


class DriftFeatureItem(BaseModel):
    feature: str
    drift_method: str
    drift_score: float
    threshold: float
    severity: str
    recommendation: Optional[str] = None


class DriftResponseSummary(BaseModel):
    low: int
    medium: int
    high: int


class DriftResponse(BaseModel):
    status: str
    overall_drift: str
    features: List[DriftFeatureItem]
    summary: DriftResponseSummary


class ModelHealthResponse(BaseModel):
    status: str
    performance_status: str
    calibration_status: str
    drift_status: str
    data_quality_status: str
    freshness_status: str
    recommendations: List[str]


class PredictionRecordResponse(BaseModel):
    id: int
    corridor: str
    timestamp: str
    model_version: str
    predicted_probability: float
    predicted_class: int
    confidence: Optional[float] = None
    actual_outcome: Optional[int] = None
    outcome_available: bool
    created_at: str


# --- Phase 11 MLOps Schemas ---
class PromotionRequest(BaseModel):
    challenger_key: str = Field(..., description="Unique registry key of the challenger model to promote")
    reason: str = Field(..., description="Audit rationale for model promotion")

class RollbackRequest(BaseModel):
    rollback_key: str = Field(..., description="Registry key of the historic model version to rollback to")
    reason: str = Field(..., description="Audit rationale for model rollback")

class RetrainStatusResponse(BaseModel):
    corridor: str
    retrain_recommended: bool
    reasons: List[str]
    severity: str
    pipeline_active: Optional[bool] = True
    dataset_range: Optional[str] = "Nov 2023 - Aug 2026"
    last_retrained_at: Optional[str] = "2026-08-22"

class PromotionResponse(BaseModel):
    success: bool
    detail: str

class RollbackResponse(BaseModel):
    success: bool
    detail: str



