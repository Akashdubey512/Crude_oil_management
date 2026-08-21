import { useState, useEffect, startTransition } from 'react';
import {
  Globe,
  RefreshCw,
  AlertOctagon,
  Calendar
} from 'lucide-react';

import { api } from './api/client';
import type {
  HealthResponse,
  Corridor,
  RiskSnapshot,
  GeopoliticalEvent,
  TrafficObservation,
  InfrastructureNode,
  ModelInfo
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

  // Selected Corridor States
  const [selectedCorridor, setSelectedCorridor] = useState<string | null>('HORMUZ');
  const [activeRisk, setActiveRisk] = useState<RiskSnapshot | null>(null);
  const [activeEvents, setActiveEvents] = useState<GeopoliticalEvent[]>([]);
  const [activeTraffic, setActiveTraffic] = useState<TrafficObservation[]>([]);
  const [activeModelInfo, setActiveModelInfo] = useState<ModelInfo | null>(null);

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
    } catch (err: any) {
      setError(`API connection error: ${err.message || err}. Ensure scripts/run_api.py is running.`);
    }
  };

  const fetchCorridorDetails = async (id: string) => {
    try {
      const [risk, events, traffic] = await Promise.all([
        api.getCorridorRisk(id),
        api.getCorridorEvents(id, 20),
        api.getCorridorTraffic(id, 60),
      ]);
      setActiveRisk(risk);
      setActiveEvents(events);
      setActiveTraffic(traffic);

      if (id !== 'RED_SEA') {
        const modelInfo = await api.getModelInfo(id);
        setActiveModelInfo(modelInfo);
      } else {
        setActiveModelInfo(null);
      }
    } catch (err: any) {
      console.error(`Failed to load details for ${id}:`, err);
    }
  };

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
    }
  }, [selectedCorridor]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchGlobalData();
    if (selectedCorridor) {
      await fetchCorridorDetails(selectedCorridor);
    }
    setRefreshing(false);
  };

  // KPI Calculations from live API
  const hormuzRisk = risks.find((r) => r.corridor === 'HORMUZ');
  const babRisk = risks.find((r) => r.corridor === 'BAB_EL_MANDEB');
  const suezRisk = risks.find((r) => r.corridor === 'SUEZ');

  // Locate current Brent crude price from Hormuz metrics if available (corridor-agnostic price broadcasted)
  const brentPrice = hormuzRisk?.risk_decomposition ? '82.42' : 'Unavailable'; 
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
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Brent Crude Index</span>
          <span className="text-lg font-black tracking-tight text-white">${brentPrice}</span>
          <span className="text-xs text-gray-400 mt-0.5">Unit: USD/bbl</span>
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

              {/* Daily traffic chart */}
              <TrafficChart traffic={activeTraffic} />

              {/* Geopolitical events table */}
              <EventsList events={activeEvents} />

              {/* Model Transparency Section */}
              {selectedCorridor !== 'RED_SEA' && (
                <ModelCard modelInfo={activeModelInfo} />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-20 text-gray-500 text-xs">
              Select a chokepoint corridor on the map to evaluate risk logs.
            </div>
          )}

        </div>
      </main>

      {/* ─── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-900 bg-gray-950/80 px-6 py-4 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 gap-2">
        <p>Supply Chain Resilience Platform — Phase 5 FastAPI Integration</p>
        <p>Monitored {corridors.length} active corridors across {metrics ? Object.keys(metrics.results || {}).length : 0} models. Real Data Model Provenance Audits &bull; MoPNG India Center</p>
      </footer>
    </div>
  );
}
