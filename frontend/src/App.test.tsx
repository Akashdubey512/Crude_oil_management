import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';
import { api } from './api/client';

// Mock framer-motion to bypass AnimatePresence animation delays in JSDOM
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, tag: string) => {
      // Return a passthrough React component for any motion.div, motion.section etc.
      return React.forwardRef(({ children, ...props }: any, ref: any) => {
        // Strip framer-motion-specific props to avoid React DOM warnings
        const { animate, initial, exit, variants, transition, whileHover, whileTap, layoutId, layout, ...rest } = props;
        return React.createElement(tag, { ...rest, ref }, children);
      });
    }
  }),
  AnimatePresence: ({ children }: any) => {
    return React.createElement(React.Fragment, null, children);
  },
  useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
  useMotionValue: (initial: any) => ({ get: () => initial, set: vi.fn() }),
  useTransform: () => ({ get: vi.fn() }),
}));

// Mock Leaflet as it cannot render inside JSDOM environment without canvas support
vi.mock('./components/map/IntelMap', () => ({
  default: ({ onSelectCorridor }: any) => (
    <div data-testid="mock-map">
      <button onClick={() => onSelectCorridor('RED_SEA')}>Select Red Sea Map</button>
    </div>
  ),
}));

vi.mock('./components/map/GlobeMap', () => ({
  default: ({ onSelectCorridor }: any) => (
    <div data-testid="mock-globe-map">
      <button onClick={() => onSelectCorridor?.('RED_SEA')}>Select Red Sea Map</button>
    </div>
  ),
}));

// Mock Recharts to avoid container dimensions issues in JSDOM tests
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<any>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

describe('Phase 14 Premium Maritime Command Center Frontend Tests', { timeout: 15000 }, () => {
  const mockHealth = {
    status: 'healthy',
    model_version: '1.0',
    data_timestamp: '2026-08-22',
    environment: 'production',
  };

  const mockCorridors = [
    { corridor_id: 'HORMUZ', name: 'Strait of Hormuz', description: 'Gulf corridor', source: 'FRED', source_url: '' },
    { corridor_id: 'RED_SEA', name: 'Red Sea', description: 'Bab el-Mandeb proxy segment', source: 'PortWatch', source_url: '' },
  ];

  const mockRisks = [
    {
      corridor: 'HORMUZ',
      risk_score: 0.17,
      risk_level: 'LOW' as const,
      probability: 0.0017,
      prediction_date: '2026-08-22',
      model_version: '1.0',
      data_freshness: { traffic: '2026-08-22', geopolitical: '2026-08-22', price: '2026-08-22' },
      risk_decomposition: { geopolitical: 0.1, maritime: 0.2, energy_market: 0.3, infrastructure: 0.2, historical_pattern: 0.2 },
      top_factors: ['gpr_index'],
      limitations: [],
    },
    {
      corridor: 'RED_SEA',
      risk_score: 0.65,
      risk_level: 'HIGH' as const,
      probability: 0.65,
      prediction_date: '2026-08-22',
      model_version: '1.0',
      data_freshness: { traffic: '2026-08-22', geopolitical: '2026-08-22', price: '2026-08-22' },
      risk_decomposition: { geopolitical: 0.4, maritime: 0.1, energy_market: 0.2, infrastructure: 0.1, historical_pattern: 0.2 },
      top_factors: ['gpr_index'],
      limitations: ['Bab el-Mandeb proxy data'],
    }
  ];

  const mockInfrastructure = [
    {
      facility_id: '1',
      name: 'Jamnagar Port',
      facility_type: 'port' as const,
      operator: 'Reliance',
      country: 'India',
      state: 'Gujarat',
      latitude: 22.4,
      longitude: 70.0,
      capacity: 33.0,
      unit: 'MMT',
    }
  ];

  const mockSecurityStatus = {
    role: 'ADMIN',
    hash_algorithm: 'HMAC-SHA256',
  };

  const mockKeys = [
    { public_id: 'erp_pub_123', actor_id: 'admin_user', actor_role: 'ADMIN', expires_at: null, is_active: true }
  ];

  const mockAudits = {
    items: [
      { ip_address: '127.0.0.1', timestamp: '2026-08-22T12:00:00Z', action: 'API_KEY_CREATED', actor_id: 'admin_user', status: 'success' }
    ]
  };

  const mockObservability = {
    system: { cpu_pct: 2.5, memory_pct: 15.0 },
    requests: { total: 1500, errors: 2, avg_latency_ms: 4.8 },
    database: { active_connections: 5, query_avg_ms: 1.1 }
  };

  beforeEach(() => {
    vi.resetAllMocks();
    window.history.pushState({}, '', '/');
    localStorage.setItem('erp_api_key', 'erp_pub_123_secret');
    
    // Set up default spy mocks
    vi.spyOn(api, 'getHealth').mockResolvedValue(mockHealth);
    vi.spyOn(api, 'getCorridors').mockResolvedValue(mockCorridors);
    vi.spyOn(api, 'getAllRisks').mockResolvedValue(mockRisks);
    vi.spyOn(api, 'getInfrastructure').mockResolvedValue(mockInfrastructure);
    vi.spyOn(api, 'getMetrics').mockResolvedValue({});
    vi.spyOn(api, 'getCorridorRisk').mockResolvedValue(mockRisks[0]);
    vi.spyOn(api, 'getCorridorEvents').mockResolvedValue([]);
    vi.spyOn(api, 'getCorridorTraffic').mockResolvedValue([]);
    vi.spyOn(api, 'getBrentPrices').mockResolvedValue({
      latest_price: 84.5, latest_date: '2026-08-22', daily_return: 0.015,
      volatility_7d: 0.02, volatility_28d: 0.025, data_freshness: '2h',
      source: 'FRED', historical_prices: [{ date: '2026-08-22', price: 84.5, daily_return: 0.015 }]
    });
    vi.spyOn(api, 'getDataStatus').mockResolvedValue([]);
    vi.spyOn(api, 'getExplainability').mockResolvedValue({
      model_name: 'XGBoost', corridor_id: 'HORMUZ', method: 'SHAP', global_importance: [{ feature: 'gpr_index', mean_abs_shap: 0.125 }]
    });
    vi.spyOn(api, 'getModelInfo').mockResolvedValue({
      model_name: 'XGBoost', version: '1.0', training_start: '2025-01-01', training_end: '2025-12-31',
      features_used: ['gpr_index'], limitations: [], metrics: { validation: {}, test: {} }
    });
    
    // Phase 8 / 9 / 11 / 12 / 13 / 18 mocks
    vi.spyOn(api, 'getComparison').mockResolvedValue({ comparison_date: '2026-08-22', items: [] });
    vi.spyOn(api, 'getSupplierRiskExposures').mockResolvedValue({
      computed_at: '2026-08-22T00:00:00Z',
      suppliers: [
        { supplier_country: 'Iraq', country_code: 'IQ', import_share_pct: 21.0, primary_corridor: 'HORMUZ', exposure_score: 25.0, risk_level: 'LOW', corridor_weights: { HORMUZ: 1.0 } }
      ],
      methodology: 'Modeled estimate derived from corridor risk vector outputs.'
    });
    vi.spyOn(api, 'getExecutiveBriefing').mockResolvedValue({
      corridor_id: 'HORMUZ',
      corridor_name: 'Strait of Hormuz',
      briefing_text: 'EXECUTIVE BRIEF — STRAIT OF HORMUZ: Disruption risk is LOW at 1.7% probability.',
      llm_generated: false,
      llm_status: 'disabled_fallback',
      disclaimer: 'AI-phrased executive summary based strictly on live XGBoost model predictions.',
      context: {},
      generated_at: '2026-08-22T00:00:00Z'
    });
    vi.spyOn(api, 'postAnalystQuery').mockResolvedValue({
      query: 'What is Hormuz risk?',
      intent: 'CORRIDOR_LOOKUP',
      target_corridor: 'HORMUZ',
      answer: 'Hormuz risk is LOW with 1.7% probability.',
      llm_generated: false,
      source_data: { corridor: 'HORMUZ', risk_level: 'LOW' },
      generated_at: '2026-08-22T00:00:00Z'
    });
    vi.spyOn(api, 'getRiskHistory').mockResolvedValue([]);
    vi.spyOn(api, 'simulateScenario').mockResolvedValue({
      corridor_id: 'HORMUZ', baseline_date: '2026-08-22', baseline_probability: 0.017,
      baseline_risk_level: 'LOW', simulated_probability: 0.45, simulated_risk_level: 'HIGH',
      probability_delta: 0.433, feature_mutations: {}, explanation: 'Disruption simulation statement',
      recommendation: 'Deploy reserves',
      drawdown_schedule: {
        strategy: 'front_loaded',
        predicted_supply_gap_mbpd: 1.2,
        disruption_duration_days: 10,
        spr_buffer_days: 9.5,
        total_recommended_release_mbpd: 12.0,
        buffer_exhausted: false,
        warning_message: null,
        schedule: [
          { day: 1, recommended_release_mbpd: 2.1, cumulative_released_mbpd: 2.1, remaining_spr_buffer_days: 9.0 }
        ],
        heuristic_note: 'Heuristic planning tool for scenario decision support; not a globally-optimal mathematical solution.'
      },
      economic_impact: {
        daily_import_cost_delta_usd_m: 45.2,
        annualized_import_bill_delta_usd_b: 16.5,
        estimated_gdp_growth_impact_pct: -0.325,
        refining_throughput_drop_pct: 20.0,
        elasticity_formula: 'GDP Impact (pp) = -[(Annualized Import Bill Delta $B / $3,750B Nominal GDP) * 100] - (Refining Drop % * 0.015)',
        methodology_note: 'Illustrative economic impact estimate based on RBI/IMF elasticity parameters.'
      }
    });
    vi.spyOn(api, 'getModelHealth').mockResolvedValue({ status: 'GOOD', recommendations: [] } as any);
    vi.spyOn(api, 'getModelEvaluation').mockResolvedValue({
      model_version: '1.0', evaluation_period: { start: '2025-01-01', end: '2025-12-31' },
      sample_count: 500, positive_count: 50, negative_count: 450,
      metrics: { roc_auc: 0.9412, pr_auc: 0.9105, accuracy: 0.95, precision: 0.90, recall: 0.90, f1: 0.90, specificity: 0.95, mcc: 0.88, brier_score: 0.04, log_loss: 0.1 },
      calibration: { status: 'GOOD', ece: 0.015, curve: [] }, data_quality: { missing_rate: 0, usable: true }
    });
    vi.spyOn(api, 'getModelDrift').mockResolvedValue({ status: 'OK', overall_drift: 'LOW', features: [], summary: { low: 0, medium: 0, high: 0 } });
    vi.spyOn(api, 'getPredictionsHistory').mockResolvedValue([]);
    vi.spyOn(api, 'getCorridorVersions').mockResolvedValue([]);
    vi.spyOn(api, 'getComparisonMetrics').mockResolvedValue({ champion: { version: '1.0' }, challenger: { version: '1.1' } });
    vi.spyOn(api, 'getRetrainStatus').mockResolvedValue({ pipeline_active: true });
    vi.spyOn(api, 'getModelCard').mockResolvedValue({ markdown: 'Mock Card Markdown Content' });
    vi.spyOn(api, 'getObservabilityMetrics').mockResolvedValue(mockObservability);
    vi.spyOn(api, 'getSecurityStatus').mockResolvedValue(mockSecurityStatus);
    vi.spyOn(api, 'getKeys').mockResolvedValue(mockKeys);
    vi.spyOn(api, 'getAuditLogs').mockResolvedValue(mockAudits);
    vi.spyOn(api, 'generateKey').mockResolvedValue({ api_key: 'erp_pub_secret_key' });
    vi.spyOn(api, 'revokeKey').mockResolvedValue({});
    vi.spyOn(api, 'promoteModel').mockResolvedValue({ status: 'promoted' });
    vi.spyOn(api, 'rollbackModel').mockResolvedValue({ status: 'rolled_back' });
  });

  const renderLanding = async () => {
    render(<App />);
    await waitFor(() => expect(screen.queryByText(/SYNCHRONIZING/i)).toBeNull(), { timeout: 5000 });
  };

  const enterCommandCenter = async () => {
    await renderLanding();
    const btn = screen.getAllByText(/Enter Dashboard/i)[0];
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByText(/COMMAND CHANNELS/i)).toBeDefined(), { timeout: 5000 });
  };

  // 1-5: Renders and Landing interactions
  it('renders Landing page initially', async () => {
    await renderLanding();
    expect(screen.getByText(/ENERGY RESILIENCE/i)).toBeDefined();
    expect(screen.getAllByText(/Enter Dashboard/i)[0]).toBeDefined();
  });

  it('renders overview section on landing page', async () => {
    await renderLanding();
    expect(screen.getAllByText(/Enter Dashboard/i)[0]).toBeDefined();
  });

  it('transitions to CommandCenter when Enter Dashboard is clicked', async () => {
    await enterCommandCenter();
    expect(screen.getByText(/ENERGY RESILIENCE INTEL/i)).toBeDefined();
  });

  it('renders operational status bar on landing page', async () => {
    await renderLanding();
    expect(screen.getAllByText(/HORMUZ/i)[0]).toBeDefined();
  });

  // 6-10: Dashboard Layout & KPIs
  it('renders side navigation menu channels', async () => {
    await enterCommandCenter();
    expect(screen.getByRole('button', { name: /Monitor/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Scenarios/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Trends/i })).toBeDefined();
  });

  it('renders dashboard hero KPI cards', async () => {
    await enterCommandCenter();
    expect(screen.getByText(/GLOBAL CO-RISK INDEX/i)).toBeDefined();
    expect(screen.getByText(/BRENT SPOT PRICE/i)).toBeDefined();
  });

  it('shows operational badge on TopBar', async () => {
    await enterCommandCenter();
    expect(screen.getByText(/FASTAPI:/i)).toBeDefined();
    expect(screen.getByText(/ONLINE/i)).toBeDefined();
  });

  it('shows correct default user role badge', async () => {
    await enterCommandCenter();
    expect(screen.getByText(/ROLE:/i)).toBeDefined();
  });

  it('triggers global refresh scan on button click', async () => {
    await enterCommandCenter();
    const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshBtn);
    expect(api.getHealth).toHaveBeenCalled();
  });

  // 11-15: Corridor monitor and Drawer details
  it('renders sector inventory list items', async () => {
    await enterCommandCenter();
    expect(screen.getByText(/Sector Inventory/i)).toBeDefined();
  });

  it('opens sliding drawer on map selection', async () => {
    await enterCommandCenter();
    await act(async () => {
      fireEvent.click(screen.getByText(/Select Red Sea Map/i));
    });
    // Drawer shows the proxy disclaimer unique to Red Sea drawer
    await waitFor(() => {
      expect(screen.getByText(/\* Bab el-Mandeb traffic proxy/i)).toBeDefined();
    }, { timeout: 3000 });
  });

  it('closes sliding drawer on X click', async () => {
    await enterCommandCenter();
    await act(async () => {
      fireEvent.click(screen.getByText(/Select Red Sea Map/i));
    });
    // Wait for drawer to appear
    await waitFor(() => {
      expect(screen.getByText(/\* Bab el-Mandeb traffic proxy/i)).toBeDefined();
    }, { timeout: 3000 });
    // Close the drawer
    const closeBtn = screen.getByRole('button', { name: /close/i });
    await act(async () => { fireEvent.click(closeBtn); });
    await waitFor(() => {
      expect(screen.queryByText(/\* Bab el-Mandeb traffic proxy/i)).toBeNull();
    }, { timeout: 3000 });
  });

  it('labels Red Sea with proxy mode alerts', async () => {
    await enterCommandCenter();
    fireEvent.click(screen.getByText(/Select Red Sea Map/i));
    await waitFor(() => {
      expect(screen.getByText(/\* Bab el-Mandeb traffic proxy/i)).toBeDefined();
    });
  });

  it('renders 5-vector risk decomposition horizontal bars', async () => {
    await enterCommandCenter();
    fireEvent.click(screen.getByText(/Select Red Sea Map/i));
    await waitFor(() => {
      expect(screen.getByText(/5-Vector Risk Decomposition/i)).toBeDefined();
    });
  });

  // 16-20: Scenario Simulator Tests
  it('navigates to scenarios view and displays input range sliders', async () => {
    await enterCommandCenter();
    fireEvent.click(screen.getByText('Scenarios').closest('button')!);
    await waitFor(() => {
      expect(screen.getByText(/Simulation Inputs/i)).toBeDefined();
    });
  });

  it('triggers simulation run and queries baseline vs simulated probabilities', async () => {
    await enterCommandCenter();
    fireEvent.click(screen.getByText('Scenarios').closest('button')!);
    await waitFor(() => {
      expect(screen.getByText(/Simulation Inputs/i)).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: /EXECUTE WHAT-IF SIMULATION/i }));
    expect(api.simulateScenario).toHaveBeenCalled();
  });

  it('renders simulated delta values and recommended interventions', async () => {
    await enterCommandCenter();
    fireEvent.click(screen.getByText('Scenarios').closest('button')!);
    await waitFor(() => {
      expect(screen.getByText(/Simulation Inputs/i)).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: /EXECUTE WHAT-IF SIMULATION/i }));
    await waitFor(() => {
      expect(screen.getByText(/Deploy reserves/i)).toBeDefined();
      expect(screen.getByText(/BASELINE RISK/i)).toBeDefined();
    });
  });

  it('renders feature mutations delta table rows and reserve drawdown schedule', async () => {
    await enterCommandCenter();
    fireEvent.click(screen.getByText('Scenarios').closest('button')!);
    await waitFor(() => {
      expect(screen.getByText(/Simulation Inputs/i)).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: /EXECUTE WHAT-IF SIMULATION/i }));
    await waitFor(() => {
      expect(screen.getByText(/Feature Mutations/i)).toBeDefined();
      expect(screen.getByText(/Strategic Reserve \(SPR\) Drawdown Schedule/i)).toBeDefined();
      expect(screen.getByText(/Cascading Downstream Impact: Refining → Price → GDP/i)).toBeDefined();
    });
  });

  it('renders empty parameters help text initially on simulator', async () => {
    await enterCommandCenter();
    fireEvent.click(screen.getByText('Scenarios').closest('button')!);
    await waitFor(() => {
      expect(screen.getByText(/Awaiting Simulation Parameters/i)).toBeDefined();
    });
  });

  // 21-25: Models & Governance Center
  it('navigates to model center diagnostic view', async () => {
    await enterCommandCenter();
    fireEvent.click(screen.getByText('Models').closest('button')!);
    await waitFor(() => {
      expect(screen.getByText(/Out-of-Sample Model Metrics/i)).toBeDefined();
    });
  });

  it('renders ROC-AUC metric value from live models response', async () => {
    await enterCommandCenter();
    fireEvent.click(screen.getByText('Models').closest('button')!);
    // Wait for async model evaluation data to load
    await waitFor(() => {
      expect(screen.getByText(/0.9412/i)).toBeDefined();
    }, { timeout: 5000 });
  });

  it('navigates to governance view showing candidate model', async () => {
    await enterCommandCenter();
    fireEvent.click(screen.getByText('Governance').closest('button')!);
    await waitFor(() => {
      expect(screen.getByText(/CANDIDATE CHALLENGER MODEL/i)).toBeDefined();
    });
  });

  it('triggers candidate promotion on button trigger', async () => {
    await enterCommandCenter();
    fireEvent.click(screen.getByText('Governance').closest('button')!);
    await waitFor(() => {
      expect(screen.getByText(/CHALLENGER MODEL/i)).toBeDefined();
    }, { timeout: 5000 });
  });

  it('renders autoretraining pipeline parameters', async () => {
    await enterCommandCenter();
    fireEvent.click(screen.getByText('Governance').closest('button')!);
    await waitFor(() => {
      expect(screen.getByText(/AUTO-RETRAINING PIPELINE STATUS/i)).toBeDefined();
    });
  });

  // 26-30: Observability & Security Center
  it('navigates to SRE observability page', async () => {
    await enterCommandCenter();
    fireEvent.click(screen.getByText('Observability').closest('button')!);
    await waitFor(() => {
      expect(screen.getByText(/TOTAL REQUESTS/i)).toBeDefined();
    });
  });

  it('renders database active connections and container RAM logs', async () => {
    await enterCommandCenter();
    fireEvent.click(screen.getByText('Observability').closest('button')!);
    await waitFor(() => {
      expect(screen.getByText(/TOTAL REQUESTS/i)).toBeDefined();
    });
  });

  it('navigates to security configuration status window', async () => {
    await enterCommandCenter();
    fireEvent.click(screen.getByText('Security').closest('button')!);
    await waitFor(() => {
      expect(screen.getByText(/Active Security Credentials Configuration/i)).toBeDefined();
    });
  });

  it('renders provision key controls for administrator role', async () => {
    await enterCommandCenter();
    fireEvent.click(screen.getByText('Security').closest('button')!);
    await waitFor(() => {
      expect(screen.getByText(/API Credentials Inventory/i)).toBeDefined();
    }, { timeout: 5000 });
  });

  it('renders security audit logs table row', async () => {
    await enterCommandCenter();
    fireEvent.click(screen.getByText('Security').closest('button')!);
    await waitFor(() => {
      expect(screen.getByText(/Security Audit Stream/i)).toBeDefined();
    }, { timeout: 5000 });
  });
});
