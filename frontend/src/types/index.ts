export interface HealthResponse {
  status: string;
  model_version: string;
  data_timestamp: string;
  environment: string;
}

export interface Corridor {
  corridor_id: string;
  name: string;
  description: string;
  source: string;
  source_url: string;
}

export interface DataFreshness {
  traffic: string;
  geopolitical: string;
  price: string;
}

export interface RiskDecomposition {
  geopolitical: number;
  maritime: number;
  energy_market: number;
  infrastructure: number;
  historical_pattern: number;
}

export interface RiskSnapshot {
  corridor: string;
  risk_score: number | null;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'UNKNOWN' | 'UNAVAILABLE';
  probability: number | null;
  prediction_date: string;
  model_version: string;
  data_freshness: DataFreshness;
  risk_decomposition: RiskDecomposition;
  top_factors: string[];
  limitations: string[];
}

export interface GeopoliticalEvent {
  event_id: string;
  event_date: string;
  source: string;
  event_type: string;
  corridor_id: string;
  text_reference: string;
  source_url: string;
}

export interface TrafficObservation {
  date: string;
  corridor_id: string;
  vessel_count: number;
  tanker_count: number;
  cargo_count: number;
  anomaly_flag: boolean;
  anomaly_type: 'NORMAL' | 'TRAFFIC_DROP' | 'CONGESTION';
  data_availability: 'OBSERVED' | 'NO_OBSERVATION';
}

export interface InfrastructureNode {
  facility_id: string;
  name: string;
  facility_type: 'port' | 'refinery' | 'spr';
  operator: string;
  country: string;
  state: string;
  latitude: number;
  longitude: number;
  capacity: number | null;
  unit: string;
}

export interface ModelMetrics {
  validation: Record<string, any>;
  test: Record<string, any>;
}

export interface ModelInfo {
  model_name: string;
  version: string;
  training_start: string;
  training_end: string;
  features_used: string[];
  limitations: string[];
  metrics: ModelMetrics;
}

export interface PriceHistoryEntry {
  date: string;
  price: number;
  daily_return: number | null;
}

export interface BrentPriceResponse {
  latest_price: number;
  latest_date: string;
  daily_return: number | null;
  volatility_7d: number | null;
  volatility_28d: number | null;
  data_freshness: string;
  source: string;
  historical_prices: PriceHistoryEntry[];
}

export interface SourceStatusResponse {
  source_name: string;
  latest_date: string;
  status: 'FRESH' | 'STALE' | 'UNAVAILABLE' | 'PARTIAL';
  row_count: number | null;
  retrieval_timestamp: string | null;
  source_url: string;
  limitation: string | null;
}

export interface FeatureImportanceEntry {
  feature: string;
  mean_abs_shap: number;
}

export interface ExplainabilityResponse {
  model_name: string;
  corridor_id: string;
  method: string;
  global_importance: FeatureImportanceEntry[];
}

// --- Phase 8 Types ---

export interface RiskHistoryEntry {
  date: string;
  corridor_id: string;
  risk_probability: number;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
  is_disrupted: boolean | null;
}

export interface CorridorComparisonItem {
  corridor_id: string;
  name: string;
  risk_level: string;
  probability: number | null;
  risk_score: number | null;
  primary_driver: string | null;
  vessel_volume_status: string;
  geopolitical_status: string;
  data_freshness_traffic: string;
}

export interface CorridorComparisonResponse {
  comparison_date: string;
  items: CorridorComparisonItem[];
}

export interface DailyDrawdownEntry {
  day: number;
  recommended_release_mbpd: number;
  cumulative_released_mbpd: number;
  remaining_spr_buffer_days: number;
}

export interface DrawdownScheduleResponse {
  strategy: string;
  predicted_supply_gap_mbpd: number;
  disruption_duration_days: number;
  spr_buffer_days: number;
  total_recommended_release_mbpd: number;
  buffer_exhausted: boolean;
  warning_message?: string | null;
  schedule: DailyDrawdownEntry[];
  heuristic_note: string;
}

export interface EconomicImpactResponse {
  daily_import_cost_delta_usd_m: number;
  annualized_import_bill_delta_usd_b: number;
  estimated_gdp_growth_impact_pct: number;
  refining_throughput_drop_pct: number;
  elasticity_formula: string;
  methodology_note: string;
}

export interface SupplierExposureItem {
  supplier_country: string;
  country_code: string;
  import_share_pct: number;
  primary_corridor: string;
  exposure_score: number;
  risk_level: string;
  corridor_weights: Record<string, number>;
}

export interface SupplierExposureResponse {
  computed_at: string;
  suppliers: SupplierExposureItem[];
  methodology: string;
}

export interface ExecutiveBriefingResponse {
  corridor_id: string;
  corridor_name: string;
  briefing_text: string;
  llm_generated: boolean;
  llm_status: string;
  disclaimer: string;
  context: Record<string, any>;
  generated_at: string;
}

export interface AnalystQueryRequest {
  query: string;
}

export interface AnalystQueryResponse {
  query: string;
  intent: string;
  target_corridor: string;
  answer: string;
  llm_generated: boolean;
  source_data: Record<string, any>;
  generated_at: string;
}

export interface ScenarioSimulationRequest {
  corridor_id: string;
  baseline_date?: string;
  tanker_transit_multiplier: number;
  gpr_multiplier: number;
  brent_price_multiplier: number;
  brent_volatility_multiplier: number;
  infrastructure_disruption: boolean;
  spr_buffer_days?: number;
  drawdown_strategy?: string;
}

export interface ScenarioSimulationResponse {
  corridor_id: string;
  baseline_date: string;
  baseline_probability: number;
  baseline_risk_level: string;
  simulated_probability: number;
  simulated_risk_level: string;
  probability_delta: number;
  feature_mutations: Record<string, { baseline: number; simulated: number }>;
  explanation: string;
  recommendation: string;
  drawdown_schedule?: DrawdownScheduleResponse | null;
  economic_impact?: EconomicImpactResponse | null;
}

// --- Phase 9 Types ---

export interface ModelEvaluationMetrics {
  roc_auc: number | null;
  pr_auc: number | null;
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  specificity: number | null;
  mcc: number | null;
  brier_score: number | null;
  log_loss: number | null;
}

export interface CalibrationBinEntry {
  bin_midpoint: number;
  predicted_prob: number;
  observed_freq: number;
}

export interface CalibrationInfo {
  status: 'GOOD' | 'MODERATE' | 'DEGRADED' | 'UNAVAILABLE';
  ece: number | null;
  curve: CalibrationBinEntry[];
}

export interface ModelEvaluationResponse {
  status?: string;
  reason?: string;
  model_version: string;
  evaluation_period: { start: string; end: string };
  sample_count: number;
  positive_count: number;
  negative_count: number;
  metrics: ModelEvaluationMetrics;
  calibration: CalibrationInfo;
  data_quality: { missing_rate: number; usable: boolean };
}

export interface DriftFeatureItem {
  feature: string;
  drift_method: string;
  drift_score: number;
  threshold: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: string | null;
  reference_distribution?: { proportions: number[]; labels: string[] };
  current_distribution?: { proportions: number[]; labels: string[] };
}

export interface DriftResponseSummary {
  low: number;
  medium: number;
  high: number;
}

export interface DriftResponse {
  status: string;
  overall_drift: 'LOW' | 'MEDIUM' | 'HIGH';
  features: DriftFeatureItem[];
  summary: DriftResponseSummary;
}

export interface ModelHealthResponse {
  status: 'GOOD' | 'DEGRADED' | 'CRITICAL';
  performance_status: string;
  calibration_status: string;
  drift_status: string;
  data_quality_status: string;
  freshness_status: string;
  recommendations: string[];
}

export interface PredictionRecord {
  id: number;
  corridor: string;
  timestamp: string;
  model_version: string;
  predicted_probability: number;
  predicted_class: 0 | 1;
  confidence: number | null;
  actual_outcome: 0 | 1 | null;
  outcome_available: boolean;
  created_at: string;
}
