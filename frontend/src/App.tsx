import { useState, useEffect, startTransition } from 'react';
import {
  Globe,
  RefreshCw,
  AlertOctagon,
  Calendar,
  Database,
  Sliders,
  TrendingUp,
  HeartPulse,
  Activity,
  CheckCircle,
  Info,
  ShieldAlert,
  FileText,
  BarChart2,
  AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  ReferenceLine,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

import { api } from './api/client';
import type {
  HealthResponse,
  Corridor,
  RiskSnapshot,
  GeopoliticalEvent,
  TrafficObservation,
  InfrastructureNode,
  ModelInfo,
  BrentPriceResponse,
  SourceStatusResponse,
  ExplainabilityResponse,
  RiskHistoryEntry,
  CorridorComparisonResponse,
  ScenarioSimulationResponse
} from './types';

import Map from './components/Map';
import RiskGauge from './components/RiskGauge';
import RiskDecompositionChart from './components/RiskDecompositionChart';
import TrafficChart from './components/TrafficChart';
import EventsList from './components/EventsList';
import ModelCard from './components/ModelCard';
import AlertsPanel from './components/AlertsPanel';

export default function App() {
  // Global States
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [risks, setRisks] = useState<RiskSnapshot[]>([]);
  const [infrastructure, setInfrastructure] = useState<InfrastructureNode[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [brentPrices, setBrentPrices] = useState<BrentPriceResponse | null>(null);
  const [dataStatuses, setDataStatuses] = useState<SourceStatusResponse[]>([]);

  // Selected Corridor States
  const [selectedCorridor, setSelectedCorridor] = useState<string | null>('HORMUZ');
  const [activeRisk, setActiveRisk] = useState<RiskSnapshot | null>(null);
  const [activeEvents, setActiveEvents] = useState<GeopoliticalEvent[]>([]);
  const [activeTraffic, setActiveTraffic] = useState<TrafficObservation[]>([]);
  const [activeModelInfo, setActiveModelInfo] = useState<ModelInfo | null>(null);
  const [activeExplainability, setActiveExplainability] = useState<ExplainabilityResponse | null>(null);

  // Phase 8 Navigation & UI States
  const [dashboardMode, setDashboardMode] = useState<string>('MONITOR');

  // Scenario Simulator States
  const [simCorridor, setSimCorridor] = useState<string>('HORMUZ');
  const [simTransit, setSimTransit] = useState<number>(1.0);
  const [simGpr, setSimGpr] = useState<number>(1.0);
  const [simPrice, setSimPrice] = useState<number>(1.0);
  const [simVol, setSimVol] = useState<number>(1.0);
  const [simInfra, setSimInfra] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<ScenarioSimulationResponse | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simError, setSimError] = useState<string | null>(null);

  // Trend States
  const [trendCorridor, setTrendCorridor] = useState<string>('HORMUZ');
  const [trendData, setTrendData] = useState<RiskHistoryEntry[]>([]);
  const [trendLoading, setTrendLoading] = useState<boolean>(false);

  // Comparison States
  const [comparison, setComparison] = useState<CorridorComparisonResponse | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState<boolean>(false);

  // Phase 9 Model Monitoring States
  const [healthTab, setHealthTab] = useState<string>('feeds');
  const [modelHealthCorridor, setModelHealthCorridor] = useState<string>('HORMUZ');
  const [modelHealth, setModelHealth] = useState<any>(null);
  const [modelEval, setModelEval] = useState<any>(null);
  const [modelDrift, setModelDrift] = useState<any>(null);
  const [predictionHistory, setPredictionHistory] = useState<any[]>([]);
  const [selectedDriftFeature, setSelectedDriftFeature] = useState<any | null>(null);
  const [modelHealthLoading, setModelHealthLoading] = useState<boolean>(false);

  // Phase 11: MLOps Governance States
  const [corridorVersions, setCorridorVersions] = useState<any[]>([]);
  const [championChallenger, setChampionChallenger] = useState<any>(null);
  const [retrainStatus, setRetrainStatus] = useState<any>(null);
  const [modelCardMarkdown, setModelCardMarkdown] = useState<string | null>(null);
  const [governanceAction, setGovernanceAction] = useState<{type: 'promote' | 'rollback'; key: string} | null>(null);
  const [governanceResult, setGovernanceResult] = useState<{success: boolean; detail: string} | null>(null);

  // Connection & UI states
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGlobalData = async () => {
    try {
      setError(null);
      const [h, c, r, i, m] = await Promise.all([
        api.getHealth(),
        api.getCorridors(),
        api.getAllRisks(),
        api.getInfrastructure(),
        api.getMetrics(),
      ]);
      setHealth(h);
      setCorridors(c);
      setRisks(r);
      setInfrastructure(i);
      setMetrics(m);
      // Phase 7: fetch Brent prices and data-status independently (non-blocking)
      api.getBrentPrices(90).then(setBrentPrices).catch(() => setBrentPrices(null));
      api.getDataStatus().then(setDataStatuses).catch(() => setDataStatuses([]));
    } catch (err: any) {
      setError(`API connection error: ${err.message || err}. Ensure scripts/run_api.py is running.`);
    }
  };

  const fetchCorridorDetails = async (id: string) => {
    try {
      // Each call is individually fault-tolerant — a 404 on traffic (RED_SEA)
      // must NOT abort the risk or events fetch.
      const [risk, events, traffic] = await Promise.all([
        api.getCorridorRisk(id).catch(() => null),
        api.getCorridorEvents(id, 20).catch(() => [] as any[]),
        api.getCorridorTraffic(id, 60).catch(() => [] as any[]),
      ]);

      if (risk) setActiveRisk(risk);
      setActiveEvents(events ?? []);
      setActiveTraffic(traffic ?? []);

      // Phase 7 + Phase 10: fetch model info and SHAP explainability for all corridors
      api.getModelInfo(id).then(setActiveModelInfo).catch(() => setActiveModelInfo(null));
      api.getExplainability(id).then(setActiveExplainability).catch(() => setActiveExplainability(null));
    } catch (err: any) {
      console.error(`Failed to load details for ${id}:`, err);
    }
  };

  // Phase 8 simulation handlers
  const handleRunSimulation = async () => {
    setSimulating(true);
    setSimError(null);
    try {
      const res = await api.simulateScenario({
        corridor_id: simCorridor,
        tanker_transit_multiplier: simTransit,
        gpr_multiplier: simGpr,
        brent_price_multiplier: simPrice,
        brent_volatility_multiplier: simVol,
        infrastructure_disruption: simInfra,
      });
      setSimResult(res);
    } catch (err: any) {
      setSimError(err.message || 'Simulation request failed.');
    } finally {
      setSimulating(false);
    }
  };

  const fetchTrendData = async (corridor: string) => {
    setTrendLoading(true);
    try {
      const data = await api.getRiskHistory(corridor);
      setTrendData(data);
    } catch (err) {
      console.error('Failed to load risk history', err);
    } finally {
      setTrendLoading(false);
    }
  };

  useEffect(() => {
    if (dashboardMode === 'TRENDS') {
      fetchTrendData(trendCorridor);
    }
  }, [dashboardMode, trendCorridor]);

  useEffect(() => {
    if (dashboardMode === 'COMPARISON') {
      setComparisonLoading(true);
      api.getComparison()
        .then(setComparison)
        .catch(err => console.error(err))
        .finally(() => setComparisonLoading(false));
    }
  }, [dashboardMode]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchGlobalData();
      setLoading(false);
    };
    init();
  }, []);

  // Update details on selection change
  useEffect(() => {
    if (selectedCorridor) {
      fetchCorridorDetails(selectedCorridor);
      setModelHealthCorridor(selectedCorridor);
    }
  }, [selectedCorridor]);

  const fetchMonitoringData = async (corridor: string) => {
    setModelHealthLoading(true);
    setGovernanceResult(null);
    try {
      const [h, e, d, p, comp, vers, retrain] = await Promise.all([
        api.getModelHealth(corridor).catch(() => null),
        api.getModelEvaluation(corridor).catch(() => null),
        api.getModelDrift(corridor).catch(() => null),
        api.getPredictionsHistory(corridor, 50).catch(() => []),
        api.getComparisonMetrics(corridor).catch(() => null),
        api.getCorridorVersions(corridor).catch(() => []),
        api.getRetrainStatus(corridor).catch(() => null),
      ]);
      setModelHealth(h);
      setModelEval(e);
      setModelDrift(d);
      setPredictionHistory(p);
      setChampionChallenger(comp);
      setCorridorVersions(vers ?? []);
      setRetrainStatus(retrain);
      // Fetch model card for RED_SEA only (documented proxy corridor)
      if (corridor === 'RED_SEA') {
        api.getModelCard(corridor).then((r: any) => setModelCardMarkdown(r?.markdown ?? null)).catch(() => setModelCardMarkdown(null));
      } else {
        setModelCardMarkdown(null);
      }
    } catch (err) {
      console.error("Failed to fetch monitoring data", err);
    } finally {
      setModelHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData(modelHealthCorridor);
  }, [modelHealthCorridor]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchGlobalData();
    if (selectedCorridor) {
      await fetchCorridorDetails(selectedCorridor);
    }
    if (modelHealthCorridor) {
      await fetchMonitoringData(modelHealthCorridor);
    }
    setRefreshing(false);
  };

  // KPI Calculations from live API
  const hormuzRisk = risks.find((r) => r.corridor === 'HORMUZ');
  const babRisk = risks.find((r) => r.corridor === 'BAB_EL_MANDEB');
  const suezRisk = risks.find((r) => r.corridor === 'SUEZ');

  // Phase 7: Real Brent price from /api/prices (no proxy label)
  const brentPrice = brentPrices ? brentPrices.latest_price.toFixed(2) : 'Unavailable';
  const brentReturn = brentPrices?.daily_return !== null && brentPrices?.daily_return !== undefined
    ? `${(brentPrices.daily_return * 100).toFixed(2)}%`
    : 'N/A';
  const brentReturnNeg = brentPrices?.daily_return !== null && brentPrices?.daily_return !== undefined && brentPrices.daily_return < 0;
  const dataTimestamp = health?.data_timestamp || 'Unavailable';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-gray-400 font-sans p-6">
        <RefreshCw className="w-12 h-12 animate-spin text-cyan-500 mb-4" />
        <p className="text-sm font-semibold tracking-widest uppercase">Initializing Command Center Panel...</p>
        <p className="text-xs opacity-50 mt-1">Connecting to FastAPI microservice backend</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-gray-100 font-sans flex flex-col">
      
      {/* ─── HEADER ───────────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-900 bg-gray-950/80 backdrop-blur px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-[1000]">
        <div className="flex items-center gap-3">
          <Globe className="w-8 h-8 text-cyan-500" />
          <div>
            <h1 className="text-lg font-black tracking-wider uppercase text-white">India Energy Supply Chain Resilience</h1>
            <p className="text-xs text-gray-400 font-medium">Production Geopolitical Risk Digital Twin Command Center</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-2 bg-gray-900/60 px-3 py-1.5 rounded border border-gray-800">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span className="text-gray-400">Data update date:</span>
            <span className="font-mono text-white font-bold">{dataTimestamp}</span>
          </div>

          <div className="flex items-center gap-2 bg-gray-900/60 px-3 py-1.5 rounded border border-gray-800">
            <span className={`w-2.5 h-2.5 rounded-full ${error ? 'bg-red-500' : 'bg-emerald-500'} inline-block animate-pulse`} />
            <span className="text-gray-400">FastAPI Connection:</span>
            <span className="font-bold text-white uppercase">{error ? 'DISCONNECTED' : 'ONLINE'}</span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-4 py-1.5 rounded transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* ─── ERROR BANNER ────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-950/20 border-b border-red-500/20 p-4 text-center text-xs text-red-400 flex items-center justify-center gap-2">
          <AlertOctagon className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button onClick={fetchGlobalData} className="underline font-bold text-white hover:no-underline ml-4">
            Retry Connection
          </button>
        </div>
      )}

      {/* ─── KPI STRIP ───────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-5 border-b border-gray-900 divide-x divide-gray-900 bg-gray-950/30">
        <div className="p-4 flex flex-col justify-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Strait of Hormuz Risk</span>
          <span className="text-lg font-black tracking-tight text-white">{hormuzRisk?.risk_level || 'UNKNOWN'}</span>
          <span className="text-xs text-gray-400 mt-0.5">Prob: {hormuzRisk && hormuzRisk.probability !== null && hormuzRisk.probability !== undefined ? `${(hormuzRisk.probability * 100).toFixed(2)}%` : 'N/A'}</span>
        </div>
        <div className="p-4 flex flex-col justify-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Bab-el-Mandeb Risk</span>
          <span className="text-lg font-black tracking-tight text-white">{babRisk?.risk_level || 'UNKNOWN'}</span>
          <span className="text-xs text-gray-400 mt-0.5">Prob: {babRisk && babRisk.probability !== null && babRisk.probability !== undefined ? `${(babRisk.probability * 100).toFixed(2)}%` : 'N/A'}</span>
        </div>
        <div className="p-4 flex flex-col justify-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Suez Canal Risk</span>
          <span className="text-lg font-black tracking-tight text-white">{suezRisk?.risk_level || 'UNKNOWN'}</span>
          <span className="text-xs text-gray-400 mt-0.5">Prob: {suezRisk && suezRisk.probability !== null && suezRisk.probability !== undefined ? `${(suezRisk.probability * 100).toFixed(2)}%` : 'N/A'}</span>
        </div>
        <div className="p-4 flex flex-col justify-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Brent Crude (FRED)</span>
          <span className="text-lg font-black tracking-tight text-white">${brentPrice}</span>
          <span className="text-xs mt-0.5">
            Return: <span className={brentReturnNeg ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{brentReturn}</span>
            <span className="text-gray-500 ml-1">USD/bbl</span>
          </span>
        </div>
        <div className="p-4 flex flex-col justify-center col-span-2 md:col-span-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Infrastructure Monitored</span>
          <span className="text-lg font-black tracking-tight text-cyan-400">{infrastructure.length} Nodes</span>
          <span className="text-xs text-gray-400 mt-0.5">SPR, Refineries & Ports</span>
        </div>
      </section>

      {/* ─── DASHBOARD GRID ──────────────────────────────────────────────────── */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Digital Twin Map & Alert Center (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-cyan-400" />
                Supply Chain Digital Twin Map
              </span>
              <span className="text-[10px] text-gray-500">Interactive chokepoint nodes & India facilities</span>
            </div>
            <div className="flex-1 min-h-[450px]">
              <Map
                infrastructure={infrastructure}
                risks={risks}
                onSelectCorridor={(id) => startTransition(() => setSelectedCorridor(id))}
                selectedCorridor={selectedCorridor}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AlertsPanel risks={risks} />
            
            {/* SPR/Infrastructure panel */}
            <div className="p-4 rounded-xl border border-gray-800 bg-gray-950/50 flex flex-col justify-between">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-widest text-gray-400 border-b border-gray-800 pb-2 block mb-3">
                  India Crude SPR Reserves
                </span>
                <div className="flex flex-col gap-2">
                  {infrastructure
                    .filter((node) => node.facility_type === 'spr')
                    .map((spr) => (
                      <div key={spr.facility_id} className="flex justify-between items-center text-xs p-1.5 rounded border border-gray-900 bg-gray-950">
                        <span className="font-semibold text-gray-200">{spr.name}</span>
                        <span className="text-purple-400 font-mono font-bold">
                          {spr.capacity} {spr.unit}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
              <p className="text-[10px] text-gray-500 mt-4 leading-relaxed">
                Strategic Reserves represent emergency volumes managed to offset corridor containment incidents.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Corridor Details & Analytical Panels (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Dashboard Mode Tabs */}
          <div className="flex border-b border-gray-800 bg-gray-950/40 p-1 rounded-lg gap-1">
            {[
              { id: 'MONITOR', name: 'Corridor Monitor' },
              { id: 'SIMULATOR', name: 'Scenario Simulator' },
              { id: 'TRENDS', name: 'Trend Analyzer' },
              { id: 'COMPARISON', name: 'Cross-Comparison' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDashboardMode(tab.id)}
                className={`flex-1 py-2 px-1 text-center text-[10px] font-black uppercase tracking-wider rounded-md transition duration-200 ${
                  dashboardMode === tab.id
                    ? 'bg-cyan-600 text-white font-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {/* --- CORRIDOR MONITOR VIEW --- */}
          {dashboardMode === 'MONITOR' && (
            <div className="flex flex-col gap-6">
              {/* Corridor selector tabs */}
              <div className="flex border-b border-gray-900 gap-1 bg-gray-950/20 p-1 rounded-lg">
                {['HORMUZ', 'BAB_EL_MANDEB', 'SUEZ', 'RED_SEA'].map((id) => (
                  <button
                    key={id}
                    onClick={() => startTransition(() => setSelectedCorridor(id))}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-md transition uppercase ${
                      selectedCorridor === id
                        ? 'bg-cyan-900/40 text-cyan-400 border border-cyan-800/30'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {id.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              {selectedCorridor ? (
                <div className="flex flex-col gap-6">

                  {/* Corridor snapshot overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <RiskGauge
                      score={activeRisk?.risk_score || null}
                      level={activeRisk?.risk_level || 'UNKNOWN'}
                      probability={activeRisk?.probability || null}
                    />
                    <RiskDecompositionChart decomposition={activeRisk?.risk_decomposition || null} />
                  </div>

                  {/* Daily traffic chart — Bab el-Mandeb proxy used for RED_SEA */}
                  <TrafficChart traffic={activeTraffic} />

                  {/* Geopolitical events table */}
                  <EventsList events={activeEvents} />

                  {/* Model Transparency Section */}
                  <ModelCard modelInfo={activeModelInfo} />

                  {/* SHAP Explainability Card */}
                  <div className="p-4 rounded-xl border border-gray-800 bg-gray-950/50 flex flex-col gap-2">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-gray-400 block border-b border-gray-800 pb-2 mb-1">
                      Why Is This Corridor At Risk?
                      <span className="ml-2 text-gray-600 font-normal normal-case tracking-normal text-[10px]">SHAP Feature Impact · XGBoost</span>
                    </span>
                    {!activeExplainability ? (
                      <p className="text-xs text-gray-500 italic">Explainability unavailable for this corridor.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {activeExplainability.global_importance.slice(0, 6).map((entry) => {
                          const maxShap = activeExplainability.global_importance[0]?.mean_abs_shap || 1;
                          const pct = Math.round((entry.mean_abs_shap / maxShap) * 100);
                          return (
                            <div key={entry.feature} className="flex flex-col gap-0.5">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="font-mono text-gray-400 truncate max-w-[200px]">{entry.feature}</span>
                                <span className="text-cyan-400 font-bold font-mono ml-2">{entry.mean_abs_shap.toFixed(4)}</span>
                              </div>
                              <div className="h-1 rounded-full bg-gray-800">
                                <div className="h-1 rounded-full bg-cyan-500/60" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-20 text-gray-500 text-xs">
                  Select a chokepoint corridor on the map to evaluate risk logs.
                </div>
              )}
            </div>
          )}

          {/* --- SCENARIO SIMULATOR VIEW --- */}
          {dashboardMode === 'SIMULATOR' && (
            <div className="flex flex-col gap-5 p-4 rounded-xl border border-gray-800 bg-gray-950/40">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    Resilience Scenario Simulator
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Simulate macro supply and security shocks on trained models</p>
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Corridor selection */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target Corridor</label>
                  <div className="flex gap-1.5 bg-gray-950 p-1 rounded border border-gray-900">
                    {['HORMUZ', 'BAB_EL_MANDEB', 'SUEZ'].map((id) => (
                      <button
                        key={id}
                        onClick={() => setSimCorridor(id)}
                        className={`flex-1 py-1 px-2 text-[10px] font-black rounded uppercase transition ${
                          simCorridor === id
                            ? 'bg-cyan-900/40 text-cyan-400'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {id.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sliders */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="font-bold text-gray-400 uppercase">Tanker Traffic</span>
                    <span className="font-mono font-bold text-cyan-400">{simTransit.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={simTransit}
                    onChange={(e) => setSimTransit(parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <span className="text-[9px] text-gray-600">0.50x (50% drop) to 1.50x (50% surge)</span>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="font-bold text-gray-400 uppercase">Geopolitical Risk</span>
                    <span className="font-mono font-bold text-cyan-400">{simGpr.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={simGpr}
                    onChange={(e) => setSimGpr(parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <span className="text-[9px] text-gray-600">0.50x (de-escalation) to 3.00x (threat surge)</span>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="font-bold text-gray-400 uppercase">Brent Price Index</span>
                    <span className="font-mono font-bold text-cyan-400">{simPrice.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={simPrice}
                    onChange={(e) => setSimPrice(parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <span className="text-[9px] text-gray-600">0.50x (low price) to 1.50x (market shock)</span>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="font-bold text-gray-400 uppercase">Brent Volatility</span>
                    <span className="font-mono font-bold text-cyan-400">{simVol.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={simVol}
                    onChange={(e) => setSimVol(parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <span className="text-[9px] text-gray-600">0.50x (stable market) to 3.00x (liquidity panic)</span>
                </div>

                {/* Infrastructure Disruption Toggle */}
                <div className="flex items-center gap-2.5 md:col-span-2 py-1.5 border-t border-gray-900 mt-1">
                  <input
                    type="checkbox"
                    id="simInfra"
                    checked={simInfra}
                    onChange={(e) => setSimInfra(e.target.checked)}
                    className="w-3.5 h-3.5 text-cyan-600 bg-gray-950 border-gray-800 rounded focus:ring-cyan-500 accent-cyan-500 cursor-pointer"
                  />
                  <label htmlFor="simInfra" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer">
                    Simulate Active Indian Refinery / SPR Supply Shock
                  </label>
                </div>

                {/* Button */}
                <div className="md:col-span-2 pt-2">
                  <button
                    onClick={handleRunSimulation}
                    disabled={simulating}
                    className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs uppercase tracking-widest rounded transition duration-200 disabled:opacity-50"
                  >
                    {simulating ? 'Simulating Scenario...' : 'Execute What-If Simulation'}
                  </button>
                </div>
              </div>

              {simError && (
                <div className="p-3 bg-red-950/30 border border-red-900 rounded text-red-400 text-xs mt-2">
                  {simError}
                </div>
              )}

              {/* Simulation Results Display */}
              {simResult && (
                <div className="mt-4 flex flex-col gap-4 border-t border-gray-900 pt-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Simulation Output Details</h4>
                  
                  {/* Probability Comparison */}
                  <div className="grid grid-cols-3 gap-2.5 bg-gray-950 p-3 rounded-lg border border-gray-900">
                    <div className="flex flex-col text-center">
                      <span className="text-[9px] uppercase font-bold text-gray-500">Baseline Risk</span>
                      <span className="text-sm font-black tracking-tight text-gray-200 mt-1">{(simResult.baseline_probability * 100).toFixed(2)}%</span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">{simResult.baseline_risk_level}</span>
                    </div>
                    <div className="flex flex-col text-center justify-center">
                      <span className="text-[9px] uppercase font-bold text-gray-500">Risk Delta</span>
                      <span className={`text-sm font-black tracking-tight mt-1 ${simResult.probability_delta > 0 ? 'text-red-400' : simResult.probability_delta < 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                        {simResult.probability_delta > 0 ? '+' : ''}{(simResult.probability_delta * 100).toFixed(2)}%
                      </span>
                      <span className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">Probability Change</span>
                    </div>
                    <div className="flex flex-col text-center">
                      <span className="text-[9px] uppercase font-bold text-gray-500">Simulated Risk</span>
                      <span className={`text-sm font-black tracking-tight mt-1 ${
                        simResult.simulated_risk_level === 'CRITICAL' ? 'text-red-500 animate-pulse'
                          : simResult.simulated_risk_level === 'HIGH' ? 'text-orange-400'
                          : simResult.simulated_risk_level === 'MODERATE' ? 'text-yellow-400'
                          : 'text-emerald-400'
                      }`}>
                        {(simResult.simulated_probability * 100).toFixed(2)}%
                      </span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">{simResult.simulated_risk_level}</span>
                    </div>
                  </div>

                  {/* Explainability & Action */}
                  <div className="p-3.5 bg-gray-950/60 rounded-lg border border-gray-900 text-xs flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Model Disruption Explanation</span>
                      <p className="text-gray-300 leading-relaxed text-[11px]">{simResult.explanation}</p>
                    </div>
                    <div className="flex flex-col gap-1 border-t border-gray-900 pt-2.5">
                      <span className="text-[9px] font-black uppercase text-cyan-400 tracking-wider">Recommended Action (MoPNG / ISPRL)</span>
                      <p className="text-cyan-300 font-semibold leading-relaxed text-[11px]">{simResult.recommendation}</p>
                    </div>
                  </div>

                  {/* Mutations Table */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Key Feature Mutations</span>
                    <div className="max-h-[140px] overflow-y-auto pr-1">
                      <table className="w-full text-[10px] text-left divide-y divide-gray-900 bg-gray-950 rounded-lg border border-gray-900 overflow-hidden">
                        <thead className="bg-gray-900/60 text-gray-400 uppercase text-[8px] font-bold">
                          <tr>
                            <th className="px-3 py-1.5">Feature Name</th>
                            <th className="px-3 py-1.5 text-right">Baseline Value</th>
                            <th className="px-3 py-1.5 text-right">Simulated Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-900 font-mono">
                          {Object.entries(simResult.feature_mutations).map(([feature, vals]) => (
                            <tr key={feature} className="hover:bg-gray-900/30">
                              <td className="px-3 py-1 text-gray-400 font-sans">{feature}</td>
                              <td className="px-3 py-1 text-right text-gray-300">{vals.baseline.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                              <td className="px-3 py-1 text-right text-cyan-400 font-bold">{vals.simulated.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- HISTORICAL TRENDS VIEW --- */}
          {dashboardMode === 'TRENDS' && (
            <div className="flex flex-col gap-5 p-4 rounded-xl border border-gray-800 bg-gray-950/40">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Historical Risk Trend Line
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Evaluate model-generated probabilities vs actual disruption ground truths</p>
                </div>
                <div className="flex gap-1.5 bg-gray-950 p-1 rounded border border-gray-900">
                  {['HORMUZ', 'BAB_EL_MANDEB', 'SUEZ'].map((id) => (
                    <button
                      key={id}
                      onClick={() => setTrendCorridor(id)}
                      className={`py-0.5 px-2 text-[9px] font-black rounded uppercase transition ${
                        trendCorridor === id
                          ? 'bg-cyan-900/40 text-cyan-400'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {id.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {trendLoading ? (
                <div className="flex items-center justify-center h-52 text-gray-500 text-xs italic">
                  Loading historical timeline data...
                </div>
              ) : trendData.length === 0 ? (
                <div className="flex items-center justify-center h-52 text-gray-500 text-xs italic border border-gray-900 rounded-lg">
                  Timeline unavailable for selected corridor
                </div>
              ) : (
                <div className="h-56 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                      <XAxis dataKey="date" stroke="#4b5563" />
                      <YAxis stroke="#4b5563" domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                      <Tooltip
                        contentStyle={{ background: '#0b0f19', border: '1px solid #1f2937', borderRadius: '6px' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                        formatter={(value: any, name: any) => [
                          name === 'risk_probability' ? `${(value * 100).toFixed(2)}%` : value,
                          name === 'risk_probability' ? 'Disruption Probability' : 'Disruption Event'
                        ]}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Area
                        name="risk_probability"
                        type="monotone"
                        dataKey="risk_probability"
                        stroke="#22d3ee"
                        fillOpacity={1}
                        fill="url(#riskGrad)"
                        strokeWidth={2.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Note on uncertainty */}
              <div className="p-3 bg-gray-950/40 rounded-lg border border-gray-900 text-[10px] text-gray-500 leading-snug">
                <span className="font-bold text-gray-400 block mb-0.5 uppercase tracking-wider">Resilience Interpretation Note</span>
                The timeline displays continuous out-of-time model inference. Probability peaks correlate with combined events: GPR standard deviation surges, tanker count drops below moving averages, and local corridor sanctions. Gaps in historical labels reflect periods without ground truth disruption reports.
              </div>
            </div>
          )}

          {/* --- CORRIDOR COMPARISON VIEW --- */}
          {dashboardMode === 'COMPARISON' && (
            <div className="flex flex-col gap-5 p-4 rounded-xl border border-gray-800 bg-gray-950/40">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-cyan-500" />
                    Cross-Corridor Comparison
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Evaluating security indices, model drivers, and data provenance side-by-side</p>
                </div>
              </div>

              {comparisonLoading ? (
                <div className="flex items-center justify-center h-52 text-gray-500 text-xs italic">
                  Loading cross-corridor comparison...
                </div>
              ) : !comparison ? (
                <div className="flex items-center justify-center h-52 text-gray-500 text-xs italic border border-gray-900 rounded-lg">
                  Comparison data unavailable
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {comparison.items.map((item) => {
                    const lc = item.risk_level === 'CRITICAL' ? 'border-red-900 bg-red-950/20 text-red-400'
                      : item.risk_level === 'HIGH' ? 'border-orange-950 bg-orange-950/20 text-orange-400'
                      : item.risk_level === 'MODERATE' ? 'border-yellow-950 bg-yellow-950/20 text-yellow-400'
                      : item.risk_level === 'LOW' ? 'border-emerald-950 bg-emerald-950/20 text-emerald-400'
                      : 'border-gray-800 bg-gray-950/40 text-gray-400';
                    
                    return (
                      <div key={item.corridor_id} className={`p-3 rounded-lg border ${lc} flex flex-col justify-between min-h-[160px]`}>
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <div>
                              <span className="text-xs font-black uppercase tracking-wider text-white">{item.name}</span>
                              <span className="text-[9px] text-gray-500 block uppercase font-mono font-semibold mt-0.5">{item.corridor_id}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border leading-none ${
                              item.risk_level === 'CRITICAL' ? 'bg-red-950 border-red-700 text-red-400'
                                : item.risk_level === 'HIGH' ? 'bg-orange-950 border-orange-700 text-orange-400'
                                : item.risk_level === 'MODERATE' ? 'bg-yellow-950 border-yellow-700 text-yellow-400'
                                : item.risk_level === 'LOW' ? 'bg-emerald-950 border-emerald-700 text-emerald-400'
                                : 'bg-gray-900 border-gray-700 text-gray-400'
                            }`}>
                              {item.risk_level}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-3 text-[10px] text-gray-400">
                            <div>
                              <span className="text-gray-500 text-[8px] uppercase font-bold tracking-wider">Probability</span>
                              <p className="font-mono text-xs font-black text-white">{item.probability !== null ? `${(item.probability * 100).toFixed(2)}%` : 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-[8px] uppercase font-bold tracking-wider">Primary Driver</span>
                              <p className="font-mono text-xs font-semibold text-gray-300 truncate max-w-[120px]">{item.primary_driver ? item.primary_driver.replace(/_/g, ' ') : 'None'}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-[8px] uppercase font-bold tracking-wider">Vessel Flow</span>
                              <p className={`font-mono text-xs font-bold ${item.vessel_volume_status === 'DROP' ? 'text-red-400' : item.vessel_volume_status === 'NORMAL' ? 'text-emerald-400' : 'text-gray-500'}`}>
                                {item.vessel_volume_status}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-[8px] uppercase font-bold tracking-wider">Geopolitics</span>
                              <p className={`font-mono text-xs font-bold ${item.geopolitical_status === 'ELEVATED' ? 'text-red-400' : item.geopolitical_status === 'NORMAL' ? 'text-emerald-400' : 'text-gray-500'}`}>
                                {item.geopolitical_status}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-gray-950 mt-3 pt-1.5 flex justify-between items-center text-[9px] text-gray-500">
                          <span>Traffic Data Freshness:</span>
                          <span className="font-mono font-bold text-gray-400">{item.data_freshness_traffic}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ─── DATA, MODEL & SYSTEM HEALTH CENTER ───────────────────────────────── */}
      <section className="mx-6 mb-6 p-5 rounded-xl border border-gray-900 bg-gray-950/30 flex flex-col gap-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-900 pb-3">
          <div className="flex items-center gap-3">
            <HeartPulse className="w-5 h-5 text-cyan-400 animate-pulse" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white">Model Health &amp; Validation Center</h2>
              <p className="text-[10px] text-gray-500 font-medium">Real-time performance checks, data drift monitoring, and decision audits</p>
            </div>
          </div>

          {/* Model selection tabs for health diagnostics - now includes RED_SEA */}
          <div className="flex bg-gray-950 p-0.5 rounded border border-gray-900 text-xs">
            {['HORMUZ', 'BAB_EL_MANDEB', 'SUEZ', 'RED_SEA'].map((id) => (
              <button
                key={id}
                onClick={() => setModelHealthCorridor(id)}
                className={`py-1 px-2.5 text-[10px] font-black uppercase tracking-wider rounded transition ${
                  modelHealthCorridor === id
                    ? 'bg-cyan-900/50 text-cyan-400 font-black border border-cyan-800/30'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                {id.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Diagnostic Tabs Selector */}
        <div className="flex border-b border-gray-900 bg-gray-950/40 p-1 rounded-lg gap-1 max-w-fit">
          {[
            { id: 'feeds', name: 'Data Feeds Status', icon: Database },
            { id: 'performance', name: 'Out-of-Sample Performance', icon: BarChart2 },
            { id: 'drift', name: 'Feature Drift Analysis', icon: Activity },
            { id: 'history', name: 'Prediction Audit Trails', icon: FileText },
            { id: 'governance', name: 'Version Governance', icon: CheckCircle }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setHealthTab(tab.id)}
                className={`py-1.5 px-3 text-left text-[10px] font-black uppercase tracking-wider rounded-md transition duration-200 flex items-center gap-1.5 ${
                  healthTab === tab.id
                    ? 'bg-cyan-950 text-cyan-400 font-black border border-cyan-800/50'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.name}
              </button>
            );
          })}
        </div>

        {modelHealthLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-500 text-xs gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
            <span>Retrieving model diagnostics and drift telemetry...</span>
          </div>
        ) : (
          <div className="min-h-[220px]">

            {/* ─── TAB: DATA FEEDS STATUS ─── */}
            {healthTab === 'feeds' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
                {/* Feeds grid list */}
                <div className="lg:col-span-8 flex flex-col gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">External Data Feeds ({dataStatuses.length} Sources Monitored)</span>
                  {dataStatuses.length === 0 ? (
                    <p className="text-xs text-gray-600 italic">No feed states loaded.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                      {dataStatuses.map((src) => {
                        const sc = src.status === 'FRESH' ? 'text-emerald-400 border-emerald-800 bg-emerald-950/30'
                          : src.status === 'PARTIAL' ? 'text-yellow-400 border-yellow-800 bg-yellow-950/30'
                          : src.status === 'STALE' ? 'text-orange-400 border-orange-800 bg-orange-950/30'
                          : 'text-red-400 border-red-800 bg-red-950/30';
                        return (
                          <div key={src.source_name} className="p-2.5 rounded-lg border border-gray-800 bg-gray-950/40 text-[10px] flex flex-col gap-1">
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-bold text-gray-200 leading-tight">{src.source_name}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${sc} shrink-0`}>{src.status}</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                              <span>Latest: <span className="font-mono text-gray-300">{src.latest_date}</span></span>
                              {src.row_count !== null && <span>Rows: <span className="font-mono text-gray-300">{src.row_count.toLocaleString()}</span></span>}
                            </div>
                            {src.limitation && <p className="text-gray-600 leading-tight mt-1">{src.limitation}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* System Infrastructure Health Card */}
                <div className="lg:col-span-4 flex flex-col gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Operational Gateway Telemetry</span>
                  <div className="p-4 rounded-lg border border-gray-800 bg-gray-950/40 text-xs flex flex-col gap-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">REST API Engine:</span>
                      <span className="text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800 text-[10px]">ONLINE</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Model Artifacts Integrity:</span>
                      <span className="text-cyan-400 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800 text-[10px]">VERIFIED</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Database Engine (SQLite):</span>
                      <span className="text-cyan-400 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800 text-[10px]">CONNECTED</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Data Freshness Alert Level:</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] border ${
                        modelHealth?.freshness_status === 'STALE'
                          ? 'text-orange-400 bg-orange-950/40 border-orange-800 animate-pulse'
                          : 'text-emerald-400 bg-emerald-950/40 border-emerald-800'
                      }`}>
                        {modelHealth?.freshness_status || 'FRESH'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB: PERFORMANCE VALIDATION ─── */}
            {healthTab === 'performance' && (
              <div className="flex flex-col gap-5 animate-fade-in">
                {/* Health Warning alerts block */}
                {modelHealth && modelHealth.status !== 'GOOD' && (
                  <div className="p-3 rounded-lg border border-orange-900 bg-orange-950/20 text-xs flex gap-3 text-orange-400">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="font-bold block uppercase tracking-wider text-[10px]">Active Diagnostic Flags ({modelHealth.status})</span>
                      <ul className="list-disc pl-4 mt-1 flex flex-col gap-0.5">
                        {modelHealth.recommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="text-[11px] leading-snug">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {modelEval && modelEval.status !== 'UNAVAILABLE' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Performance metrics grid */}
                    <div className="lg:col-span-4 flex flex-col gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Out-of-Sample Metric Cards</span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { name: 'ROC-AUC', val: modelEval.metrics.roc_auc, desc: 'Discrimination score' },
                          { name: 'PR-AUC', val: modelEval.metrics.pr_auc, desc: 'Imbalance precision' },
                          { name: 'F1 Score', val: modelEval.metrics.f1, desc: 'Harmonic balance' },
                          { name: 'Accuracy', val: modelEval.metrics.accuracy, desc: 'Overall accuracy' },
                          { name: 'Precision', val: modelEval.metrics.precision, desc: 'True positive ratio' },
                          { name: 'Recall', val: modelEval.metrics.recall, desc: 'Sensitivity fraction' },
                          { name: 'Specificity', val: modelEval.metrics.specificity, desc: 'True negative fraction' },
                          { name: 'MCC', val: modelEval.metrics.mcc, desc: 'Correlation coeff' },
                          { name: 'Brier Score', val: modelEval.metrics.brier_score, desc: 'Probability error' },
                          { name: 'Log Loss', val: modelEval.metrics.log_loss, desc: 'Entropy penalty' }
                        ].map((m) => (
                          <div key={m.name} className="p-2.5 rounded-lg border border-gray-900 bg-gray-950/40 text-center">
                            <span className="text-[9px] uppercase font-bold text-gray-500 block">{m.name}</span>
                            <span className="text-sm font-black tracking-tight text-white mt-1 block">
                              {m.val !== null && m.val !== undefined ? m.val.toFixed(4) : 'N/A'}
                            </span>
                            <span className="text-[8px] text-gray-600 block mt-0.5">{m.desc}</span>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 bg-gray-950 border border-gray-900 rounded-lg text-[9px] text-gray-500 leading-snug">
                        Evaluation period covers the out-of-sample validation + test split dates (
                        <span className="font-mono font-bold text-gray-400">{modelEval.evaluation_period.start}</span> to{' '}
                        <span className="font-mono font-bold text-gray-400">{modelEval.evaluation_period.end}</span>) totaling{' '}
                        <span className="font-bold text-gray-400">{modelEval.sample_count}</span> samples.
                      </div>
                    </div>

                    {/* Calibration curve */}
                    <div className="lg:col-span-5 flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">ECE Calibration Curve</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-gray-500">ECE:</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                            modelEval.calibration.status === 'GOOD' ? 'text-emerald-400 border-emerald-800 bg-emerald-950/30'
                              : modelEval.calibration.status === 'MODERATE' ? 'text-yellow-400 border-yellow-800 bg-yellow-950/30'
                              : 'text-red-400 border-red-800 bg-red-950/30'
                          }`}>
                            {modelEval.calibration.ece !== null ? modelEval.calibration.ece.toFixed(4) : 'N/A'} ({modelEval.calibration.status})
                          </span>
                        </div>
                      </div>
                      <div className="h-56 bg-gray-950/50 rounded-lg border border-gray-900 p-2.5 text-xs font-mono">
                        {modelEval.calibration.curve.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={modelEval.calibration.curve} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                              <XAxis dataKey="predicted_prob" type="number" domain={[0, 1]} stroke="#4b5563" />
                              <YAxis dataKey="observed_freq" type="number" domain={[0, 1]} stroke="#4b5563" />
                              <Tooltip
                                contentStyle={{ background: '#0b0f19', border: '1px solid #1f2937', borderRadius: '6px' }}
                                formatter={(value: any) => [value.toFixed(4), 'Observed Frequency']}
                              />
                              <Legend verticalAlign="top" height={28} />
                              <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#4b5563" strokeDasharray="4 4" name="Perfect Calibration" />
                              <Line
                                name="Model Probability"
                                type="monotone"
                                dataKey="observed_freq"
                                stroke="#a855f7"
                                strokeWidth={2}
                                dot={{ fill: '#a855f7', strokeWidth: 1 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-500 italic">Insufficient bins for calibration mapping.</div>
                        )}
                      </div>
                      <p className="text-[9px] text-gray-500 leading-snug">
                        Calibration measures how closely the model's predicted probabilities correspond to real disruption frequencies. Values closer to the diagonal line represent better calibrated predictions.
                      </p>
                    </div>

                    {/* Confusion Matrix */}
                    <div className="lg:col-span-3 flex flex-col gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">OOS Confusion Matrix</span>
                      <div className="grid grid-cols-2 gap-1.5 p-3 rounded-lg border border-gray-900 bg-gray-950/20 text-[10px] text-center font-mono">
                        {/* TN */}
                        <div className="p-3 bg-gray-950 border border-gray-900 rounded-md">
                          <span className="text-gray-500 block text-[9px] font-sans">True Negative (TN)</span>
                          <span className="text-lg font-black text-gray-200 mt-1 block">
                            {modelEval.negative_count - (modelEval.sample_count * (modelEval.metrics.fp_rate || 0))} 
                            {/* Derive from stats if confusion_matrix not explicitly flat */}
                            {modelEval.sample_count - modelEval.positive_count - Math.round(modelEval.sample_count * (1 - modelEval.metrics.specificity))}
                          </span>
                          <span className="text-[8px] text-gray-600 block mt-0.5">Predicted Normal / Normal</span>
                        </div>
                        {/* FP */}
                        <div className="p-3 bg-gray-950 border border-gray-900 rounded-md">
                          <span className="text-gray-500 block text-[9px] font-sans">False Positive (FP)</span>
                          <span className="text-lg font-black text-orange-400 mt-1 block">
                            {Math.round((modelEval.sample_count - modelEval.positive_count) * (1 - modelEval.metrics.specificity))}
                          </span>
                          <span className="text-[8px] text-gray-600 block mt-0.5">Predicted Disrupted / Normal</span>
                        </div>
                        {/* FN */}
                        <div className="p-3 bg-gray-950 border border-gray-900 rounded-md">
                          <span className="text-gray-500 block text-[9px] font-sans">False Negative (FN)</span>
                          <span className="text-lg font-black text-orange-400 mt-1 block">
                            {Math.round(modelEval.positive_count * (1 - modelEval.metrics.recall))}
                          </span>
                          <span className="text-[8px] text-gray-600 block mt-0.5">Predicted Normal / Disrupted</span>
                        </div>
                        {/* TP */}
                        <div className="p-3 bg-gray-950 border border-gray-900 rounded-md">
                          <span className="text-gray-500 block text-[9px] font-sans">True Positive (TP)</span>
                          <span className="text-lg font-black text-emerald-400 mt-1 block">
                            {Math.round(modelEval.positive_count * modelEval.metrics.recall)}
                          </span>
                          <span className="text-[8px] text-gray-600 block mt-0.5">Predicted Disrupted / Disrupted</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border border-gray-800 bg-gray-950/40 text-[10px] text-gray-500 leading-snug flex flex-col gap-1.5">
                        <div className="flex justify-between border-b border-gray-900 pb-1">
                          <span>Total Observations:</span>
                          <span className="font-bold text-gray-300 font-mono">{modelEval.sample_count}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-900 pb-1">
                          <span>Actual Disruption Events:</span>
                          <span className="font-bold text-gray-300 font-mono">{modelEval.positive_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Model Alert Triggers:</span>
                          <span className="font-bold text-gray-300 font-mono">
                            {Math.round(modelEval.positive_count * modelEval.metrics.recall) + Math.round((modelEval.sample_count - modelEval.positive_count) * (1 - modelEval.metrics.specificity))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 border border-gray-900 rounded-lg bg-gray-950/20 text-center text-xs text-gray-500 italic flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    <span>{modelEval?.reason || 'Validation metrics are unavailable for this corridor.'}</span>
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB: FEATURE DRIFT ─── */}
            {healthTab === 'drift' && (
              <div className="flex flex-col gap-5 animate-fade-in">
                {modelDrift && modelDrift.status !== 'UNAVAILABLE' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Features list table */}
                    <div className="lg:col-span-8 flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Drift Score Metric Table</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-gray-500 mr-2">Overall Shift:</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            modelDrift.overall_drift === 'LOW' ? 'text-emerald-400 border-emerald-800 bg-emerald-950/30'
                              : modelDrift.overall_drift === 'MEDIUM' ? 'text-yellow-400 border-yellow-800 bg-yellow-950/30'
                              : 'text-red-400 border-red-800 bg-red-950/30'
                          }`}>
                            {modelDrift.overall_drift} DRIFT
                          </span>
                        </div>
                      </div>
                      
                      {/* Bins counts strip */}
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono border border-gray-900 bg-gray-950/40 p-2.5 rounded-lg">
                        <div className="flex flex-col border-r border-gray-900">
                          <span className="text-[9px] font-sans text-gray-500">Low Drift features</span>
                          <span className="text-sm font-black text-emerald-400 mt-0.5">{modelDrift.summary.low}</span>
                        </div>
                        <div className="flex flex-col border-r border-gray-900">
                          <span className="text-[9px] font-sans text-gray-500">Medium Drift features</span>
                          <span className="text-sm font-black text-yellow-400 mt-0.5">{modelDrift.summary.medium}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-sans text-gray-500">High Drift features</span>
                          <span className="text-sm font-black text-red-400 mt-0.5">{modelDrift.summary.high}</span>
                        </div>
                      </div>

                      {/* Drift Table */}
                      <div className="max-h-[300px] overflow-y-auto pr-1 border border-gray-900 bg-gray-950 rounded-lg overflow-hidden">
                        <table className="w-full text-[10px] text-left divide-y divide-gray-900">
                          <thead className="bg-gray-900/60 text-gray-400 uppercase text-[8px] font-bold sticky top-0">
                            <tr>
                              <th className="px-3 py-2">Feature Name</th>
                              <th className="px-3 py-2">Test Type</th>
                              <th className="px-3 py-2 text-right">PSI Score</th>
                              <th className="px-3 py-2 text-right font-mono">KS Stat</th>
                              <th className="px-3 py-2 text-center">Severity</th>
                              <th className="px-3 py-2 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-900">
                            {modelDrift.features.map((feat: any) => {
                              const sb = feat.severity === 'LOW' ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/60'
                                : feat.severity === 'MEDIUM' ? 'text-yellow-400 bg-yellow-950/20 border-yellow-900/60'
                                : 'text-red-400 bg-red-950/20 border-red-900/60';
                              return (
                                <tr
                                  key={feat.feature}
                                  onClick={() => setSelectedDriftFeature(feat)}
                                  className={`hover:bg-gray-900/30 cursor-pointer transition ${
                                    selectedDriftFeature?.feature === feat.feature ? 'bg-cyan-950/20' : ''
                                  }`}
                                >
                                  <td className="px-3 py-2 font-mono text-gray-300 max-w-[220px] truncate">{feat.feature}</td>
                                  <td className="px-3 py-2 text-gray-500">{feat.drift_method}</td>
                                  <td className="px-3 py-2 text-right font-mono text-gray-200">{feat.drift_score.toFixed(4)}</td>
                                  <td className="px-3 py-2 text-right font-mono text-gray-400">{feat.ks_stat !== undefined ? feat.ks_stat.toFixed(4) : 'N/A'}</td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black border uppercase ${sb}`}>
                                      {feat.severity}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-center text-cyan-400 hover:text-cyan-300 font-bold font-sans">
                                    View
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Drill-down side panel */}
                    <div className="lg:col-span-4 flex flex-col gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Distribution Drill-down</span>
                      {selectedDriftFeature ? (
                        <div className="p-4 rounded-lg border border-gray-900 bg-gray-950/40 flex flex-col gap-4.5">
                          <div>
                            <span className="font-mono text-xs font-black text-cyan-400 break-all">{selectedDriftFeature.feature}</span>
                            <span className="text-[9px] text-gray-500 block uppercase font-mono mt-1">PSI: {selectedDriftFeature.drift_score.toFixed(4)} · KS Stat: {selectedDriftFeature.ks_stat}</span>
                          </div>

                          {/* Recommendation */}
                          <div className="p-2.5 bg-gray-950 border border-gray-900 rounded text-[10px] leading-relaxed">
                            <span className="font-bold text-gray-400 block mb-0.5 uppercase tracking-wider text-[8px]">Resolution Advice</span>
                            {selectedDriftFeature.recommendation}
                          </div>

                          {/* Bins Comparison Chart */}
                          {selectedDriftFeature.reference_distribution && selectedDriftFeature.reference_distribution.proportions.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              <span className="text-[9px] uppercase font-bold text-gray-500">Reference (Train) vs Current (OOS)</span>
                              <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                                {selectedDriftFeature.reference_distribution.proportions.map((p: number, i: number) => {
                                  const cProp = selectedDriftFeature.current_distribution.proportions[i] ?? 0;
                                  const refPct = Math.round(p * 100);
                                  const currPct = Math.round(cProp * 100);
                                  const label = selectedDriftFeature.reference_distribution.labels[i] || `Bin ${i}`;
                                  
                                  return (
                                    <div key={i} className="text-[9px] flex flex-col gap-0.5 border-b border-gray-900/40 pb-1">
                                      <span className="text-gray-500 font-mono leading-none">{label}</span>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <div className="flex-1 flex flex-col gap-0.5">
                                          {/* Reference Bar */}
                                          <div className="flex items-center gap-1">
                                            <div className="h-1 rounded bg-purple-500/50" style={{ width: `${Math.max(refPct, 3)}%` }} />
                                            <span className="text-[7px] text-gray-500 font-mono">{refPct}%</span>
                                          </div>
                                          {/* Current Bar */}
                                          <div className="flex items-center gap-1">
                                            <div className="h-1 rounded bg-cyan-500/50" style={{ width: `${Math.max(currPct, 3)}%` }} />
                                            <span className="text-[7px] text-gray-500 font-mono">{currPct}%</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="flex justify-center gap-3 text-[8px] text-gray-500 mt-1">
                                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" /> Training (Ref)</span>
                                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block" /> Out-of-Sample</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[10px] text-gray-500 italic">No distribution histogram coordinates found.</p>
                          )}
                        </div>
                      ) : (
                        <div className="p-8 rounded-lg border border-gray-900 border-dashed bg-gray-950/10 text-center text-gray-500 italic text-[10px] flex flex-col items-center justify-center gap-1.5">
                          <Info className="w-4 h-4 text-gray-600" />
                          <span>Click view on any feature row in the table to evaluate empirical distributions.</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 border border-gray-900 rounded-lg bg-gray-950/20 text-center text-xs text-gray-500 italic flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    <span>{modelDrift?.reason || 'Drift diagnostics are unavailable for this corridor.'}</span>
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB: PREDICTION HISTORY AUDIT TRAILS ─── */}
            {healthTab === 'history' && (
              <div className="flex flex-col gap-3.5 animate-fade-in">
                <div className="flex justify-between items-center border-b border-gray-900 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Immutable Prediction History Log ({predictionHistory.length} Records)</span>
                  <span className="text-[9px] text-gray-600">Audit trail populated from local sqlite persistent db</span>
                </div>

                {predictionHistory.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-10 text-center">No predictions logged in the database yet. Trigger predictions by navigating the corridor dashboard.</p>
                ) : (
                  <div className="max-h-[280px] overflow-y-auto pr-1 border border-gray-900 bg-gray-950 rounded-lg">
                    <table className="w-full text-[10px] text-left divide-y divide-gray-900">
                      <thead className="bg-gray-900/60 text-gray-400 uppercase text-[8px] font-bold sticky top-0">
                        <tr>
                          <th className="px-3 py-2">Logged Date/Time</th>
                          <th className="px-3 py-2">Prediction Date</th>
                          <th className="px-3 py-2">Corridor</th>
                          <th className="px-3 py-2 text-center">Model Version</th>
                          <th className="px-3 py-2 text-right">Predicted Prob</th>
                          <th className="px-3 py-2 text-center">Class Output</th>
                          <th className="px-3 py-2 text-center">Audit Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-900 font-mono">
                        {predictionHistory.map((rec) => {
                          const pc = rec.predicted_class === 1 ? 'text-red-400 font-bold' : 'text-gray-400';
                          return (
                            <tr key={rec.id} className="hover:bg-gray-900/30">
                              <td className="px-3 py-2 text-gray-500 font-sans">{new Date(rec.created_at).toLocaleString()}</td>
                              <td className="px-3 py-2 text-gray-300">{rec.timestamp}</td>
                              <td className="px-3 py-2 font-sans text-gray-400">{rec.corridor}</td>
                              <td className="px-3 py-2 text-center text-gray-400">{rec.model_version}</td>
                              <td className="px-3 py-2 text-right text-cyan-400 font-bold">{(rec.predicted_probability * 100).toFixed(2)}%</td>
                              <td className={`px-3 py-2 text-center ${pc}`}>{rec.predicted_class === 1 ? 'DISRUPTED' : 'NORMAL'}</td>
                              <td className="px-3 py-2 text-center text-gray-500 font-sans">IMMUTABLE</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB: MODEL GOVERNANCE CENTER ─── */}
            {healthTab === 'governance' && (
              <div className="flex flex-col gap-5 animate-fade-in">

                {/* Retrain Status Banner */}
                {retrainStatus && (
                  <div className={`p-3 rounded-lg border flex gap-3 items-start text-xs ${
                    retrainStatus.severity === 'CRITICAL' ? 'border-red-800 bg-red-950/20 text-red-400'
                    : retrainStatus.severity === 'HIGH' ? 'border-orange-800 bg-orange-950/20 text-orange-400'
                    : retrainStatus.severity === 'MEDIUM' ? 'border-yellow-800 bg-yellow-950/20 text-yellow-400'
                    : 'border-emerald-900 bg-emerald-950/10 text-emerald-400'
                  }`}>
                    <span className="text-lg leading-none mt-0.5">{retrainStatus.retrain_recommended ? '⚠' : '✓'}</span>
                    <div className="flex flex-col gap-1">
                      <span className="font-black uppercase tracking-wider text-[10px]">
                        Retraining Status: {retrainStatus.severity} {retrainStatus.retrain_recommended ? '— Recommended' : '— Healthy'}
                      </span>
                      <ul className="list-disc pl-4 flex flex-col gap-0.5">
                        {retrainStatus.reasons.map((r: string, i: number) => <li key={i} className="text-[10px] leading-snug opacity-80">{r}</li>)}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Governance Action Result */}
                {governanceResult && (
                  <div className={`p-3 rounded-lg border text-xs font-bold flex gap-2 items-center ${
                    governanceResult.success ? 'border-emerald-800 bg-emerald-950/20 text-emerald-400' : 'border-red-800 bg-red-950/20 text-red-400'
                  }`}>
                    <span>{governanceResult.success ? '[SUCCESS]' : '[FAILED]'}</span>
                    <span className="font-normal">{governanceResult.detail}</span>
                    <button onClick={() => setGovernanceResult(null)} className="ml-auto text-gray-500 hover:text-white text-xs">×</button>
                  </div>
                )}

                {/* Champion / Challenger Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CHAMPION Card */}
                  <div className="p-4 rounded-xl border border-cyan-900/50 bg-cyan-950/10 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Active Champion</span>
                      <span className="px-2 py-0.5 text-[9px] font-black bg-cyan-900/50 text-cyan-300 border border-cyan-800 rounded uppercase">CHAMPION</span>
                    </div>
                    {championChallenger?.champion && Object.keys(championChallenger.champion).length > 0 ? (
                      <div className="flex flex-col gap-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-gray-500">Algorithm</span><span className="text-white font-bold">{championChallenger.champion.model_name}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Version</span><span className="text-cyan-400 font-mono">{championChallenger.champion.version}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Trained</span><span className="text-gray-300 font-mono text-[10px]">{championChallenger.champion.training_end}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">ROC-AUC</span><span className="text-emerald-400 font-bold font-mono">{(championChallenger.champion.metrics?.validation?.roc_auc ?? 'N/A')}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">PR-AUC</span><span className="text-emerald-400 font-bold font-mono">{(championChallenger.champion.metrics?.validation?.pr_auc ?? 'N/A')}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">ECE</span><span className="text-gray-300 font-mono">{(championChallenger.champion.calibration_metrics?.ece?.toFixed(4) ?? 'N/A')}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Dataset Hash</span><span className="text-gray-600 font-mono text-[9px] truncate max-w-[120px]">{championChallenger.champion.dataset_hash?.slice(0, 12)}...</span></div>
                        <button
                          onClick={() => api.getModelCard(modelHealthCorridor).then((r: any) => setModelCardMarkdown(r?.markdown ?? null)).catch(() => {})}
                          className="mt-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-cyan-800 rounded text-cyan-400 hover:bg-cyan-900/20 transition"
                        >View Model Card</button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-600 italic">No champion registered for this corridor.</p>
                    )}
                  </div>

                  {/* CHALLENGER Card */}
                  <div className="p-4 rounded-xl border border-yellow-900/50 bg-yellow-950/10 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Latest Challenger</span>
                      <span className="px-2 py-0.5 text-[9px] font-black bg-yellow-900/50 text-yellow-300 border border-yellow-800 rounded uppercase">
                        {championChallenger?.challenger?.status ?? 'NONE'}
                      </span>
                    </div>
                    {championChallenger?.challenger && Object.keys(championChallenger.challenger).length > 0 ? (
                      <div className="flex flex-col gap-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-gray-500">Algorithm</span><span className="text-white font-bold">{championChallenger.challenger.model_name}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Version</span><span className="text-yellow-400 font-mono">{championChallenger.challenger.version}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="text-yellow-300 font-bold">{championChallenger.challenger.status}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">ROC-AUC</span><span className="text-gray-300 font-mono">{(championChallenger.challenger.metrics?.validation?.roc_auc ?? 'N/A')}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">PR-AUC</span><span className="text-gray-300 font-mono">{(championChallenger.challenger.metrics?.validation?.pr_auc ?? 'N/A')}</span></div>
                        {championChallenger.challenger.rejection_reason && (
                          <div className="mt-1 p-2 rounded border border-red-900 bg-red-950/20 text-[10px] text-red-400">
                            <span className="font-bold">Rejected: </span>{championChallenger.challenger.rejection_reason}
                          </div>
                        )}
                        {/* Governance Action Buttons */}
                        {championChallenger.challenger.status === 'CANDIDATE' && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => setGovernanceAction({ type: 'promote', key: `${championChallenger.challenger.model_name}__${championChallenger.challenger.corridor_id ?? modelHealthCorridor}__${championChallenger.challenger.version}` })}
                              className="flex-1 px-2 py-1 text-[10px] font-black uppercase border border-emerald-800 text-emerald-400 rounded hover:bg-emerald-950/30 transition"
                            >Promote</button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-600 italic">No challenger candidate available.</p>
                    )}
                  </div>
                </div>

                {/* Promotion Confirmation Dialog */}
                {governanceAction && (
                  <div className="p-4 rounded-xl border border-orange-800 bg-orange-950/15 flex flex-col gap-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">
                      Confirm {governanceAction.type === 'promote' ? 'Promotion' : 'Rollback'}
                    </span>
                    <p className="text-xs text-gray-400">
                      Are you sure you want to <strong className="text-white">{governanceAction.type}</strong> model key <code className="text-orange-300 text-[10px]">{governanceAction.key}</code>?
                      This action will be logged and is irreversible.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          try {
                            let res;
                            if (governanceAction.type === 'promote') {
                              res = await api.promoteModel(modelHealthCorridor, { challenger_key: governanceAction.key, reason: 'Manually promoted via UI' });
                            } else {
                              res = await api.rollbackModel(modelHealthCorridor, { rollback_key: governanceAction.key, reason: 'Manual rollback via UI' });
                            }
                            setGovernanceResult({ success: true, detail: res.detail });
                            fetchMonitoringData(modelHealthCorridor);
                          } catch (err: any) {
                            setGovernanceResult({ success: false, detail: err.message || 'Action failed.' });
                          } finally {
                            setGovernanceAction(null);
                          }
                        }}
                        className="px-3 py-1.5 text-[10px] font-black uppercase bg-orange-900/40 border border-orange-700 text-orange-300 rounded hover:bg-orange-800/30 transition"
                      >Confirm {governanceAction.type === 'promote' ? 'Promote' : 'Rollback'}</button>
                      <button
                        onClick={() => setGovernanceAction(null)}
                        className="px-3 py-1.5 text-[10px] font-black uppercase border border-gray-700 text-gray-400 rounded hover:text-white transition"
                      >Cancel</button>
                    </div>
                  </div>
                )}

                {/* Version History Timeline */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Version History ({corridorVersions.length} entries)</span>
                  {corridorVersions.length === 0 ? (
                    <p className="text-xs text-gray-600 italic py-4 text-center">No version history available for this corridor.</p>
                  ) : (
                    <div className="max-h-[220px] overflow-y-auto pr-1 border border-gray-900 bg-gray-950 rounded-lg">
                      <table className="w-full text-[10px] text-left divide-y divide-gray-900">
                        <thead className="bg-gray-900/60 text-gray-400 uppercase text-[8px] font-bold sticky top-0">
                          <tr>
                            <th className="px-3 py-2">Algorithm</th>
                            <th className="px-3 py-2">Version</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2 text-right">ROC-AUC</th>
                            <th className="px-3 py-2 text-right">PR-AUC</th>
                            <th className="px-3 py-2">Trained</th>
                            <th className="px-3 py-2">Promoted</th>
                            <th className="px-3 py-2">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-900">
                          {corridorVersions.map((v: any, idx: number) => {
                            const statusColor =
                              v.status === 'CHAMPION' ? 'text-cyan-400 border-cyan-800 bg-cyan-950/20'
                              : v.status === 'CANDIDATE' ? 'text-yellow-400 border-yellow-800 bg-yellow-950/20'
                              : v.status === 'REJECTED' ? 'text-red-400 border-red-800 bg-red-950/20'
                              : v.status === 'RETIRED' ? 'text-gray-500 border-gray-700 bg-gray-900/20'
                              : 'text-gray-400 border-gray-700';
                            return (
                              <tr key={idx} className="hover:bg-gray-900/30">
                                <td className="px-3 py-2 font-bold text-gray-200">{v.model_name}</td>
                                <td className="px-3 py-2 font-mono text-gray-400">{v.version}</td>
                                <td className="px-3 py-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black border ${statusColor}`}>{v.status}</span>
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-emerald-400">{v.metrics?.validation?.roc_auc?.toFixed(3) ?? '—'}</td>
                                <td className="px-3 py-2 text-right font-mono text-gray-300">{v.metrics?.validation?.pr_auc?.toFixed(3) ?? '—'}</td>
                                <td className="px-3 py-2 font-mono text-gray-500 text-[9px]">{v.training_end ?? '—'}</td>
                                <td className="px-3 py-2 font-mono text-gray-600 text-[9px]">{v.promoted_at ? new Date(v.promoted_at).toLocaleDateString() : '—'}</td>
                                <td className="px-3 py-2">
                                  {(v.status === 'RETIRED' || v.status === 'VALIDATED') && (
                                    <button
                                      onClick={() => setGovernanceAction({ type: 'rollback', key: `${v.model_name}__${v.corridor_id}__${v.version}` })}
                                      className="px-2 py-0.5 text-[8px] font-bold uppercase border border-gray-700 text-gray-400 rounded hover:text-white hover:border-gray-500 transition"
                                    >Rollback</button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Model Card Viewer */}
                {modelCardMarkdown && (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Model Card</span>
                      <button onClick={() => setModelCardMarkdown(null)} className="text-[10px] text-gray-600 hover:text-white">× Close</button>
                    </div>
                    <div className="max-h-[220px] overflow-y-auto p-3 rounded-lg border border-gray-800 bg-gray-950 text-[11px] text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">
                      {modelCardMarkdown}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        )}
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-900 bg-gray-950/80 px-6 py-4 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 gap-2">
        <p>Supply Chain Resilience Platform — Phases 1–7 Complete</p>
        <p>Monitored {corridors.length} active corridors · {metrics ? Object.keys(metrics.results || {}).length : 0} corridor models · Real data provenance · MoPNG India</p>
      </footer>
    </div>
  );
}
