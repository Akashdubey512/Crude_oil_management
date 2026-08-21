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
