import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { api } from './api/client';

// Mock Leaflet as it cannot render inside JSDOM environment without canvas support
vi.mock('./components/Map', () => ({
  default: () => <div data-testid="mock-map">Map Monitored</div>,
}));

// Mock Recharts to avoid container dimensions issues in JSDOM tests
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<any>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

describe('India Energy Supply Chain Resilience Dashboard Tests', () => {
  const mockHealth = {
    status: 'healthy',
    model_version: '1.0',
    data_timestamp: '2026-08-16',
    environment: 'development',
  };

  const mockCorridors = [
    {
      corridor_id: 'HORMUZ',
      name: 'Strait of Hormuz',
      description: 'Test Strait...',
      source: 'Source',
      source_url: 'http://...',
    },
  ];

  const mockRisks = [
    {
      corridor: 'HORMUZ',
      risk_score: 0.17,
      risk_level: 'LOW' as const,
      probability: 0.0017,
      prediction_date: '2026-08-16',
      model_version: '1.0',
      data_freshness: { traffic: '2026-08-16', geopolitical: '2026-08-17', price: '2026-08-18' },
      risk_decomposition: { geopolitical: 0.0, maritime: 0.0, energy_market: 0.0, infrastructure: 1.0, historical_pattern: 0.0 },
      top_factors: ['anomaly_type_drop'],
      limitations: ['Mock limitation'],
    },
  ];

  const mockInfrastructure = [
    {
      facility_id: '123',
      name: 'Visakhapatnam SPR',
      facility_type: 'spr' as const,
      operator: 'ISPRL',
      country: 'India',
      state: 'Andhra Pradesh',
      latitude: 17.7,
      longitude: 83.3,
      capacity: 1.33,
      unit: 'MMT',
    },
  ];

  const mockMetrics = { results: {} };

  beforeEach(() => {
    vi.resetAllMocks();
    
    // Set up default successful API mocks
    vi.spyOn(api, 'getHealth').mockResolvedValue(mockHealth);
    vi.spyOn(api, 'getCorridors').mockResolvedValue(mockCorridors);
    vi.spyOn(api, 'getAllRisks').mockResolvedValue(mockRisks);
    vi.spyOn(api, 'getInfrastructure').mockResolvedValue(mockInfrastructure);
    vi.spyOn(api, 'getMetrics').mockResolvedValue(mockMetrics);
    
    vi.spyOn(api, 'getCorridorRisk').mockResolvedValue(mockRisks[0]);
    vi.spyOn(api, 'getEvents').mockResolvedValue([]);
    vi.spyOn(api, 'getCorridorEvents').mockResolvedValue([]);
    vi.spyOn(api, 'getCorridorTraffic').mockResolvedValue([]);
    // Phase 7 mocks
    vi.spyOn(api, 'getBrentPrices').mockResolvedValue({
      latest_price: 82.5, latest_date: '2026-08-16', daily_return: -0.002,
      volatility_7d: 0.01, volatility_28d: 0.015, data_freshness: '2026-08-16',
      source: 'FRED', historical_prices: []
    });
    vi.spyOn(api, 'getDataStatus').mockResolvedValue([]);
    vi.spyOn(api, 'getExplainability').mockResolvedValue({
      model_name: 'XGBoost', corridor_id: 'HORMUZ',
      method: 'SHAP TreeExplainer', global_importance: []
    });
    vi.spyOn(api, 'getModelInfo').mockResolvedValue({
      model_name: 'XGBoost',
      version: '1.0',
      training_start: '2023-11-21',
      training_end: '2025-09-30',
      features_used: ['anomaly_type_drop'],
      limitations: ['Mock limitation'],
      metrics: { validation: {}, test: {} },
    });
  });

  it('renders loading states initially', async () => {
    // Deliberately delay health resolution to capture loading indicator
    vi.spyOn(api, 'getHealth').mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockHealth), 100))
    );
    render(<App />);
    expect(screen.getByText(/Initializing Command Center Panel.../i)).toBeDefined();
  });

  it('renders overall dashboard metrics on successful API call', async () => {
    render(<App />);
    
    // Wait for loader to disappear
    await waitFor(() => {
      expect(screen.queryByText(/Initializing Command Center/i)).toBeNull();
    });

    // Check title and connection indicators
    expect(screen.getByText(/India Energy Supply Chain Resilience/i)).toBeDefined();
    expect(screen.getAllByText(/ONLINE/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Visakhapatnam SPR/i)).toBeDefined();
  });

  it('displays API error banners correctly on network connection failure', async () => {
    vi.spyOn(api, 'getHealth').mockRejectedValue(new Error('Network Refused'));
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText(/API connection error/i)).toBeDefined();
    });
  });

  it('filters data and updates detail panel when tabs are clicked', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.queryByText(/Initializing/i)).toBeNull();
    });

    const babTab = screen.getAllByRole('button', { name: /BAB EL MANDEB/i })[0];
    fireEvent.click(babTab);

    // Verify detail call is triggered with new parameter
    expect(api.getCorridorRisk).toHaveBeenCalledWith('BAB_EL_MANDEB');
  });

  it('renders risk gauge and vector decompositions dynamically', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.queryByText(/Initializing/i)).toBeNull();
    });

    expect(screen.getByText(/Risk Threat Level/i)).toBeDefined();
    expect(screen.getAllByText(/LOW/i)[0]).toBeDefined();
    expect(screen.getByText(/Risk Vectors Decomposition/i)).toBeDefined();
  });
});

// ─── Phase 8 — Decision Intelligence UI Tests ──────────────────────────────
describe('Phase 8 — Decision Intelligence & Demo Readiness', () => {
  const mockHealth = { status: 'healthy', model_version: '1.0', data_timestamp: '2026-08-16', environment: 'development' };
  const mockCorridors = [{ corridor_id: 'HORMUZ', name: 'Strait of Hormuz', description: '', source: '', source_url: '' }];
  const mockRisks = [{
    corridor: 'HORMUZ', risk_score: 0.17, risk_level: 'LOW' as const,
    probability: 0.0017, prediction_date: '2026-08-16', model_version: '1.0',
    data_freshness: { traffic: '2026-08-16', geopolitical: '2026-08-17', price: '2026-08-18' },
    risk_decomposition: { geopolitical: 0.0, maritime: 0.0, energy_market: 0.0, infrastructure: 1.0, historical_pattern: 0.0 },
    top_factors: ['anomaly_type_drop'], limitations: ['Mock limitation'],
  }];
  const mockInfrastructure = [{
    facility_id: '1', name: 'Visakhapatnam SPR', facility_type: 'spr' as const,
    operator: 'ISPRL', country: 'India', state: 'Andhra Pradesh',
    latitude: 17.7, longitude: 83.3, capacity: 1.33, unit: 'MMT',
  }];

  const mockComparisonResponse = {
    comparison_date: '2026-08-16T12:00:00',
    items: [
      {
        corridor_id: 'HORMUZ', name: 'Strait of Hormuz',
        risk_level: 'LOW', probability: 0.0017, risk_score: 0.17,
        primary_driver: 'anomaly_type_drop', vessel_volume_status: 'NORMAL',
        geopolitical_status: 'NORMAL', data_freshness_traffic: '2026-08-16',
      },
      {
        corridor_id: 'SUEZ', name: 'Suez Canal',
        risk_level: 'MODERATE', probability: 0.12, risk_score: 0.45,
        primary_driver: 'gpr_index', vessel_volume_status: 'DROP',
        geopolitical_status: 'ELEVATED', data_freshness_traffic: '2026-08-15',
      },
    ],
  };

  const mockHistoryData = [
    { date: '2024-01-01', corridor_id: 'HORMUZ', risk_probability: 0.05, risk_level: 'LOW' as const, is_disrupted: false },
    { date: '2024-02-01', corridor_id: 'HORMUZ', risk_probability: 0.12, risk_level: 'MODERATE' as const, is_disrupted: false },
    { date: '2024-03-01', corridor_id: 'HORMUZ', risk_probability: 0.31, risk_level: 'HIGH' as const, is_disrupted: true },
  ];

  const mockSimulationResult = {
    corridor_id: 'HORMUZ',
    baseline_date: '2026-08-16',
    baseline_probability: 0.0017,
    baseline_risk_level: 'LOW',
    simulated_probability: 0.72,
    simulated_risk_level: 'CRITICAL',
    probability_delta: 0.7183,
    explanation: 'Tanker transit drop triggered anomaly flag and elevated XGBoost risk estimate.',
    recommendation: 'Activate SPR reserves and reroute tankers via Cape of Good Hope.',
    feature_mutations: {
      tanker_count_7d_ma: { baseline: 42.0, simulated: 21.0 },
      gpr_index: { baseline: 120.0, simulated: 360.0 },
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(api, 'getHealth').mockResolvedValue(mockHealth);
    vi.spyOn(api, 'getCorridors').mockResolvedValue(mockCorridors);
    vi.spyOn(api, 'getAllRisks').mockResolvedValue(mockRisks);
    vi.spyOn(api, 'getInfrastructure').mockResolvedValue(mockInfrastructure);
    vi.spyOn(api, 'getMetrics').mockResolvedValue({ results: {} });
    vi.spyOn(api, 'getCorridorRisk').mockResolvedValue(mockRisks[0]);
    vi.spyOn(api, 'getCorridorEvents').mockResolvedValue([]);
    vi.spyOn(api, 'getCorridorTraffic').mockResolvedValue([]);
    vi.spyOn(api, 'getEvents').mockResolvedValue([]);
    vi.spyOn(api, 'getBrentPrices').mockResolvedValue({
      latest_price: 82.5, latest_date: '2026-08-16', daily_return: -0.002,
      volatility_7d: 0.01, volatility_28d: 0.015, data_freshness: '2026-08-16',
      source: 'FRED', historical_prices: [],
    });
    vi.spyOn(api, 'getDataStatus').mockResolvedValue([]);
    vi.spyOn(api, 'getExplainability').mockResolvedValue({ model_name: 'XGBoost', corridor_id: 'HORMUZ', method: 'SHAP TreeExplainer', global_importance: [] });
    vi.spyOn(api, 'getModelInfo').mockResolvedValue({ model_name: 'XGBoost', version: '1.0', training_start: '2023-11-21', training_end: '2025-09-30', features_used: [], limitations: [], metrics: { validation: {}, test: {} } });

    // Phase 8 API mocks
    vi.spyOn(api, 'getComparison').mockResolvedValue(mockComparisonResponse);
    vi.spyOn(api, 'getRiskHistory').mockResolvedValue(mockHistoryData);
    vi.spyOn(api, 'simulateScenario').mockResolvedValue(mockSimulationResult);

    // Phase 9 API mocks
    vi.spyOn(api, 'getModelHealth').mockResolvedValue({
      status: 'GOOD', performance_status: 'GOOD', calibration_status: 'GOOD',
      drift_status: 'LOW', data_quality_status: 'GOOD', freshness_status: 'FRESH',
      recommendations: ['Model health is optimal. Continue normal monitoring.']
    });
    vi.spyOn(api, 'getModelEvaluation').mockResolvedValue({
      model_version: '1.0', evaluation_period: { start: '2025-10-01', end: '2026-08-16' },
      sample_count: 320, positive_count: 6, negative_count: 314,
      metrics: {
        roc_auc: 0.85, pr_auc: 0.25, accuracy: 0.98, precision: 0.33,
        recall: 0.20, f1: 0.25, specificity: 0.98, mcc: 0.25, brier_score: 0.018, log_loss: 0.047
      },
      calibration: { status: 'GOOD', ece: 0.024, curve: [{ bin_midpoint: 0.05, predicted_prob: 0.04, observed_freq: 0.02 }] },
      data_quality: { missing_rate: 0.01, usable: true }
    });
    vi.spyOn(api, 'getModelDrift').mockResolvedValue({
      status: 'OK', overall_drift: 'LOW',
      features: [
        { feature: 'gpr_daily', drift_method: 'PSI + KS-Test', drift_score: 0.045, threshold: 0.1, severity: 'LOW', recommendation: 'Stable.' }
      ],
      summary: { low: 1, medium: 0, high: 0 }
    });
    vi.spyOn(api, 'getPredictionsHistory').mockResolvedValue([
      { id: 1, corridor: 'HORMUZ', timestamp: '2026-08-22', model_version: '1.0', predicted_probability: 0.15, predicted_class: 0, confidence: null, actual_outcome: null, outcome_available: false, created_at: '2026-08-22T06:00:00.000Z' }
    ]);

    // Phase 11 MLOps API mocks
    vi.spyOn(api, 'getCorridorVersions').mockResolvedValue([
      { model_name: 'XGBoost', version: '1.0', corridor_id: 'HORMUZ', status: 'CHAMPION', training_end: '2025-09-30', metrics: { validation: { roc_auc: 0.85, pr_auc: 0.25 } } }
    ]);
    vi.spyOn(api, 'getComparisonMetrics').mockResolvedValue({
      champion: { model_name: 'XGBoost', version: '1.0', corridor_id: 'HORMUZ', status: 'CHAMPION', training_end: '2025-09-30', metrics: { validation: { roc_auc: 0.85, pr_auc: 0.25 } } },
      challenger: null
    });
    vi.spyOn(api, 'getRetrainStatus').mockResolvedValue({
      retrain_recommended: false, severity: 'LOW', reasons: ['Stable']
    });
    vi.spyOn(api, 'getModelCard').mockResolvedValue({
      markdown: 'RED_SEA Model Card Content'
    });
  });

  it('renders dashboard mode tab navigation', async () => {
    render(<App />);
    await waitFor(() => expect(screen.queryByText(/Initializing/i)).toBeNull());

    expect(screen.getByRole('button', { name: /Corridor Monitor/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Scenario Simulator/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Trend Analyzer/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Cross-Comparison/i })).toBeDefined();
  });

  it('switches to Scenario Simulator and renders controls', async () => {
    render(<App />);
    await waitFor(() => expect(screen.queryByText(/Initializing/i)).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /Scenario Simulator/i }));

    expect(screen.getByText(/Resilience Scenario Simulator/i)).toBeDefined();
    expect(screen.getByText(/Execute What-If Simulation/i)).toBeDefined();
    expect(screen.getByLabelText(/Simulate Active Indian Refinery/i)).toBeDefined();
  });

  it('triggers simulateScenario API call when simulation button is clicked', async () => {
    render(<App />);
    await waitFor(() => expect(screen.queryByText(/Initializing/i)).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /Scenario Simulator/i }));
    fireEvent.click(screen.getByRole('button', { name: /Execute What-If Simulation/i }));

    await waitFor(() => {
      expect(api.simulateScenario).toHaveBeenCalledOnce();
    });
  });

  it('displays simulation results after execution', async () => {
    render(<App />);
    await waitFor(() => expect(screen.queryByText(/Initializing/i)).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /Scenario Simulator/i }));
    fireEvent.click(screen.getByRole('button', { name: /Execute What-If Simulation/i }));

    await waitFor(() => {
      expect(screen.getByText(/Simulation Output Details/i)).toBeDefined();
      expect(screen.getByText(/Recommended Action/i)).toBeDefined();
      expect(screen.getByText(/Key Feature Mutations/i)).toBeDefined();
    });
  });

  it('switches to Trend Analyzer and triggers getRiskHistory API call', async () => {
    render(<App />);
    await waitFor(() => expect(screen.queryByText(/Initializing/i)).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /Trend Analyzer/i }));

    await waitFor(() => {
      expect(api.getRiskHistory).toHaveBeenCalledWith('HORMUZ');
    });

    expect(screen.getByText(/Historical Risk Trend Line/i)).toBeDefined();
    expect(screen.getByText(/Resilience Interpretation Note/i)).toBeDefined();
  });

  it('switches to Cross-Comparison and renders corridor cards', async () => {
    render(<App />);
    await waitFor(() => expect(screen.queryByText(/Initializing/i)).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /Cross-Comparison/i }));

    await waitFor(() => {
      expect(api.getComparison).toHaveBeenCalledOnce();
    });

    expect(screen.getByText(/Cross-Corridor Comparison/i)).toBeDefined();
    expect(screen.getAllByText(/Strait of Hormuz/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Suez Canal/i).length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Phase 9 — Production ML Validation & Data Drift UI Tests ───────────────
describe('Phase 9 — Production ML Validation & Data Drift UI Tests', () => {
  beforeEach(() => {
    // Re-use global mock setup
  });

  it('renders Model Health Center diagnostics header and navigation', async () => {
    render(<App />);
    await waitFor(() => expect(screen.queryByText(/Initializing/i)).toBeNull());

    expect(screen.getByText(/Model Health & Validation Center/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Data Feeds Status/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Out-of-Sample Performance/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Feature Drift Analysis/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Prediction Audit Trails/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Version Governance/i })).toBeDefined();
  });

  it('switches to Out-of-Sample Performance tab and renders metric values', async () => {
    render(<App />);
    await waitFor(() => expect(screen.queryByText(/Initializing/i)).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /Out-of-Sample Performance/i }));

    await waitFor(() => {
      expect(api.getModelEvaluation).toHaveBeenCalled();
    });

    expect(screen.getByText(/Out-of-Sample Metric Cards/i)).toBeDefined();
    expect(screen.getByText(/0.8500/i)).toBeDefined(); // ROC-AUC
    expect(screen.getByText(/0.0180/i)).toBeDefined(); // Brier Score
    expect(screen.getByText(/ECE Calibration Curve/i)).toBeDefined();
    expect(screen.getByText(/OOS Confusion Matrix/i)).toBeDefined();
  });

  it('switches to Feature Drift Analysis tab and renders features table', async () => {
    render(<App />);
    await waitFor(() => expect(screen.queryByText(/Initializing/i)).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /Feature Drift Analysis/i }));

    await waitFor(() => {
      expect(api.getModelDrift).toHaveBeenCalled();
    });

    expect(await screen.findByText(/Drift Score Metric Table/i)).toBeDefined();
    expect(await screen.findByText(/gpr_daily/i)).toBeDefined();
    expect(await screen.findByText(/0.0450/i)).toBeDefined(); // PSI score
  });

  it('switches to Prediction Audit Trails tab and lists prediction history', async () => {
    render(<App />);
    await waitFor(() => expect(screen.queryByText(/Initializing/i)).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /Prediction Audit Trails/i }));

    await waitFor(() => {
      expect(api.getPredictionsHistory).toHaveBeenCalled();
    });

    expect(await screen.findByText(/Immutable Prediction History Log/i)).toBeDefined();
    expect(await screen.findByText(/15.00%/i)).toBeDefined(); // Prob
  });

  it('switches to Version Governance tab and renders training logs', async () => {
    render(<App />);
    await waitFor(() => expect(screen.queryByText(/Initializing/i)).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /Version Governance/i }));

    expect(await screen.findByText(/Version History/i)).toBeDefined();
    expect((await screen.findAllByText(/XGBoost/i)).length).toBeGreaterThanOrEqual(1);
  });
});
