import type {
  HealthResponse,
  Corridor,
  RiskSnapshot,
  GeopoliticalEvent,
  TrafficObservation,
  InfrastructureNode,
  ModelInfo,
  RiskHistoryEntry,
  CorridorComparisonResponse,
  ScenarioSimulationRequest,
  ScenarioSimulationResponse,
  ModelEvaluationResponse,
  DriftResponse,
  ModelHealthResponse,
  PredictionRecord,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// ── Active key store — single source of truth ────────────────────────────────
// localStorage is the persistence layer; this module-level variable gives us
// a synchronous, race-free read so API calls never use a stale value.
let _activeKey: string =
  localStorage.getItem('erp_api_key') || 'erp_pubadmin_defaultadminsecretkey987654321';

/** Atomically update the active bearer key both in memory and localStorage. */
export function setActiveKey(key: string): void {
  _activeKey = key;
  localStorage.setItem('erp_api_key', key);
}

/** Read the currently active bearer key. */
export function getActiveKey(): string {
  return _activeKey;
}

// ── Core request helper ──────────────────────────────────────────────────────
async function request<T>(path: string, options?: RequestInit, overrideKey?: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  try {
    const headers = new Headers(options?.headers || {});
    const key = overrideKey ?? _activeKey;
    headers.set('Authorization', `Bearer ${key}`);

    const response = await fetch(url, { ...options, headers });
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
  getHealth: () => request<HealthResponse>('/api/health'),

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

  getRiskHistory: (corridorId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request<RiskHistoryEntry[]>(`/api/risk/${corridorId.toUpperCase()}/history?${params.toString()}`);
  },

  getComparison: () => request<CorridorComparisonResponse>('/api/risk/comparison'),

  getSupplierRiskExposures: () => request<import('../types').SupplierExposureResponse>('/api/risk/suppliers'),

  getExecutiveBriefing: (corridorId: string, forceRefresh = false) =>
    request<import('../types').ExecutiveBriefingResponse>(
      `/api/corridors/${corridorId.toUpperCase()}/briefing${forceRefresh ? '?force_refresh=true' : ''}`,
      { method: 'POST' }
    ),

  postAnalystQuery: (query: string) =>
    request<import('../types').AnalystQueryResponse>('/api/assistant/query', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),

  simulateScenario: (req: ScenarioSimulationRequest) =>
    request<ScenarioSimulationResponse>('/api/scenarios/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }),

  // --- Phase 9: Model Monitoring ---
  getModelEvaluation: (corridor: string, split = 'all_oos', modelVersion = '1.0') =>
    request<ModelEvaluationResponse>(
      `/api/models/evaluation?corridor=${corridor.toUpperCase()}&split=${split}&model_version=${modelVersion}`
    ),

  getModelDrift: (corridor: string, currentPeriod = 'all_oos') =>
    request<DriftResponse>(
      `/api/models/drift?corridor=${corridor.toUpperCase()}&current_period=${currentPeriod}`
    ),

  getModelHealth: (corridor: string, modelVersion = '1.0') =>
    request<ModelHealthResponse>(
      `/api/models/health?corridor=${corridor.toUpperCase()}&model_version=${modelVersion}`
    ),

  getPredictionsHistory: (corridor: string, limit = 50, startDate?: string, endDate?: string, modelVersion?: string) => {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (modelVersion) params.append('model_version', modelVersion);
    return request<PredictionRecord[]>(`/api/predictions/history/${corridor.toUpperCase()}?${params.toString()}`);
  },

  // --- Phase 11: MLOps & Governance ---
  getCorridorVersions: (corridor: string) =>
    request<any[]>(`/api/models/${corridor.toUpperCase()}/versions`),

  getComparisonMetrics: (corridor: string) =>
    request<any>(`/api/models/${corridor.toUpperCase()}/comparison`),

  getRetrainStatus: (corridor: string) =>
    request<any>(`/api/models/${corridor.toUpperCase()}/retrain-status`),

  promoteModel: (corridor: string, req: { challenger_key: string; reason: string }) =>
    request<any>(`/api/models/${corridor.toUpperCase()}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Role': 'admin' },
      body: JSON.stringify(req),
    }),

  rollbackModel: (corridor: string, req: { rollback_key: string; reason: string }) =>
    request<any>(`/api/models/${corridor.toUpperCase()}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Role': 'admin' },
      body: JSON.stringify(req),
    }),

  getModelCard: (corridor: string) =>
    request<any>(`/api/models/${corridor.toUpperCase()}/model-card`),

  getObservabilityMetrics: () =>
    request<any>('/api/observability/metrics'),

  // --- Phase 13: Enterprise Security ---
  /** Resolve identity using a specific key (used during role switch — avoids race condition). */
  getMe: (overrideKey?: string) =>
    request<{ actor_id: string; actor_role: string; scopes: string[] }>('/api/security/me', undefined, overrideKey),

  getSecurityStatus: () =>
    request<any>('/api/security/status'),

  getAuditLogs: (page: number = 1, limit: number = 20) =>
    request<any>(`/api/security/audit?page=${page}&limit=${limit}`),

  getKeys: () =>
    request<any[]>('/api/security/keys'),

  generateKey: (req: { actor_id: string; actor_role: string; expires_in_days: number }) =>
    request<any>('/api/security/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }),

  revokeKey: (publicId: string) =>
    request<any>(`/api/security/keys/${publicId}/revoke`, { method: 'POST' }),

  // --- Phase 21: Backtest Replay & Board Pack PDF Export ---
  getBacktestReplay: (corridor: string = 'RED_SEA', startDate: string = '2023-11-01', endDate: string = '2024-02-28') =>
    request<any>(`/api/monitoring/backtest/replay?corridor=${corridor}&start_date=${startDate}&end_date=${endDate}`),

  downloadBoardPackPdf: async (): Promise<void> => {
    const url = `${API_BASE}/api/reports/board-pack/pdf`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${_activeKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to generate Board Pack PDF: ${response.statusText}`);
    }
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `India_Energy_Resilience_Board_Pack_${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  },
};
