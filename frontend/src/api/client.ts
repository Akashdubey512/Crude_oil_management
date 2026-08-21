import type {
  HealthResponse,
  Corridor,
  RiskSnapshot,
  GeopoliticalEvent,
  TrafficObservation,
  InfrastructureNode,
  ModelInfo
} from '../types';

const API_BASE = 'http://127.0.0.1:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP Error ${response.status}: ${errorText || response.statusText}`);
    }
    return (await response.json()) as T;
  } catch (err) {
    console.error(`API Fetch Error [${path}]:`, err);
    throw err;
  }
}

export const api = {
  getHealth: () => request<HealthResponse>('/health'),
  
  getCorridors: () => request<Corridor[]>('/api/corridors'),
  
  getAllRisks: (date?: string) => {
    const query = date ? `?date=${date}` : '';
    return request<RiskSnapshot[]>(`/api/risk${query}`);
  },
  
  getCorridorRisk: (corridorId: string, date?: string) => {
    const query = date ? `?date=${date}` : '';
    return request<RiskSnapshot>(`/api/risk/${corridorId.toUpperCase()}${query}`);
  },
  
  getEvents: (limit = 100, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request<GeopoliticalEvent[]>(`/api/events?${params.toString()}`);
  },
  
  getCorridorEvents: (corridorId: string, limit = 100, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request<GeopoliticalEvent[]>(`/api/events/${corridorId.toUpperCase()}?${params.toString()}`);
  },
  
  getCorridorTraffic: (corridorId: string, limit = 90, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request<TrafficObservation[]>(`/api/traffic/${corridorId.toUpperCase()}?${params.toString()}`);
  },
  
  getInfrastructure: () => request<InfrastructureNode[]>('/api/infrastructure'),
  
  getMetrics: () => request<any>('/api/metrics'),
  
  getModelInfo: (corridorId: string) => request<ModelInfo>(`/api/model-info?corridor_id=${corridorId.toUpperCase()}`),
  
  getBrentPrices: (limit = 90) => request<import('../types').BrentPriceResponse>(`/api/prices?limit=${limit}`),
  
  getDataStatus: () => request<import('../types').SourceStatusResponse[]>('/api/data-status'),
  
  getExplainability: (corridorId: string) => 
    request<import('../types').ExplainabilityResponse>(`/api/models/explainability?corridor_id=${corridorId.toUpperCase()}`),
};
