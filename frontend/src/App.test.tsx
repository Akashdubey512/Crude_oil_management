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
      risk_level: 'LOW',
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
    expect(screen.getByText(/ONLINE/i)).toBeDefined();
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

    const babTab = screen.getByRole('button', { name: /BAB EL MANDEB/i });
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
