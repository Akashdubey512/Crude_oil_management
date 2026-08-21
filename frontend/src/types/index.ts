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

export interface ScenarioSimulationRequest {
  corridor_id: string;
  baseline_date?: string;
  tanker_transit_multiplier: number;
  gpr_multiplier: number;
  brent_price_multiplier: number;
  brent_volatility_multiplier: number;
  infrastructure_disruption: boolean;
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
}


