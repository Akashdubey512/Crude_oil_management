import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Compass, Layers, RefreshCw, TrendingUp, AlertOctagon } from 'lucide-react';

// Layout & Custom hooks imports
import TopBar from '../components/layout/TopBar';
import SideNav from '../components/layout/SideNav';
import KPIBar from '../components/dashboard/KPIBar';
import { useGlobalData } from '../api/hooks/useGlobalData';
import { useCorridorRisk } from '../api/hooks/useCorridorRisk';
import { useSecurity } from '../api/hooks/useSecurity';
import { useGovernance } from '../api/hooks/useGovernance';
import { useObservability } from '../api/hooks/useObservability';

// Components imports
import GlobeMap from '../components/map/GlobeMap';
import CorridorDrawer from '../components/corridor/CorridorDrawer';
import RiskHistoryChart from '../components/charts/RiskHistoryChart';
import TrafficTrendChart from '../components/charts/TrafficTrendChart';
import BrentChart from '../components/charts/BrentChart';
import ScenarioSimulator from '../components/scenario/ScenarioSimulator';
import ModelCenter from '../components/models/ModelCenter';
import GovernanceCenter from '../components/governance/GovernanceCenter';
import ObservabilityCenter from '../components/observability/ObservabilityCenter';
import SecurityCenter from '../components/security/SecurityCenter';

// Custom API imports for tab-specific fetches
import { api } from '../api/client';
import type { RiskHistoryEntry, CorridorComparisonResponse } from '../types';

export default function CommandCenter() {
  // 1. Navigation state
  const [dashboardMode, setDashboardMode] = useState<string>('MONITOR');

  // 2. Global state hook
  const {
    health,
    corridors,
    risks,
    infrastructure,
    brentPrices,
    dataStatuses,
    loading: globalLoading,
    refreshing,
    error: globalError,
    refresh: refreshGlobal,
  } = useGlobalData();

  // 3. Selected corridor states
  const [selectedCorridor, setSelectedCorridor] = useState<string | null>('HORMUZ');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const selectedCorridorObj = corridors.find((c) => c.corridor_id === selectedCorridor);

  const handleSelectCorridor = (id: string) => {
    setSelectedCorridor(id);
    setIsDrawerOpen(true);
  };

  // 4. Corridor details hook
  const {
    activeRisk,
    activeEvents,
    activeTraffic,
    activeExplainability,
  } = useCorridorRisk(selectedCorridor);

  const [monitorHistory, setMonitorHistory] = useState<RiskHistoryEntry[]>([]);

  useEffect(() => {
    if (selectedCorridor) {
      api.getRiskHistory(selectedCorridor)
        .then(setMonitorHistory)
        .catch(() => setMonitorHistory([]));
    }
  }, [selectedCorridor]);

  // 5. Security state hook
  const [activeApiKey, setActiveApiKey] = useState<string>(localStorage.getItem('erp_api_key') || '');
  const {
    securityStatus,
    securityKeys,
    securityAudits,
    error: securityError,
    refresh: refreshSecurity,
    generateNewKey,
    revokeApiKey,
  } = useSecurity(activeApiKey);

  const handleApiKeyChange = (newKey: string) => {
    setActiveApiKey(newKey);
    localStorage.setItem('erp_api_key', newKey);
  };

  // 6. Model Monitoring, MLOps, Governance hook
  const [modelHealthCorridor, setModelHealthCorridor] = useState<string>('HORMUZ');
  const {
    corridorVersions,
    championChallenger,
    retrainStatus,
    modelCardMarkdown,
    promoteModel,
    rollbackModel,
    refresh: refreshGovernance,
  } = useGovernance(modelHealthCorridor);

  // Fallback health status for KPI
  const modelHealthStatus = 'GOOD'; // Default optimal status

  // 7. Observability hook
  const { observabilityMetrics, refresh: refreshObservability } = useObservability();

  // Models Loader
  const [modelHealthData, setModelHealthData] = useState<any>(null);
  const [modelEvalData, setModelEvalData] = useState<any>(null);
  const [modelDriftData, setModelDriftData] = useState<any>(null);

  useEffect(() => {
    if (dashboardMode === 'MODELS' && modelHealthCorridor) {
      Promise.all([
        api.getModelHealth(modelHealthCorridor).catch(() => null),
        api.getModelEvaluation(modelHealthCorridor).catch(() => null),
        api.getModelDrift(modelHealthCorridor).catch(() => null),
      ]).then(([healthData, evalData, driftData]) => {
        setModelHealthData(healthData);
        setModelEvalData(evalData);
        setModelDriftData(driftData);
      });
    }
  }, [dashboardMode, modelHealthCorridor]);

  // 8. Tab specific loaders
  // Trends Loader
  const [trendCorridor, setTrendCorridor] = useState<string>('HORMUZ');
  const [trendData, setTrendData] = useState<RiskHistoryEntry[]>([]);
  const [trendLoading, setTrendLoading] = useState<boolean>(false);

  useEffect(() => {
    if (dashboardMode === 'TRENDS' && trendCorridor) {
      setTrendLoading(true);
      api.getRiskHistory(trendCorridor)
        .then(setTrendData)
        .catch(() => setTrendData([]))
        .finally(() => setTrendLoading(false));
    }
  }, [dashboardMode, trendCorridor]);

  // Comparison Loader
  const [comparison, setComparison] = useState<CorridorComparisonResponse | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState<boolean>(false);

  useEffect(() => {
    if (dashboardMode === 'COMPARISON') {
      setComparisonLoading(true);
      api.getComparison()
        .then(setComparison)
        .catch(() => setComparison(null))
        .finally(() => setComparisonLoading(false));
    }
  }, [dashboardMode]);

  // Master manual refresh controller
  const handleRefresh = async () => {
    await refreshGlobal();
    if (selectedCorridor) {
      // Re-trigger details fetch automatically by updating dependency trigger if needed
    }
    if (activeApiKey) {
      await refreshSecurity();
    }
    await refreshGovernance();
    await refreshObservability();
  };

  const userRole = securityStatus?.role || 'VIEWER';
  const isReadOnlyRole = userRole === 'VIEWER' || userRole === 'ANALYST';

  // Skeleton screen if global state loading
  if (globalLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-gray-400 font-mono p-6 select-none">
        <RefreshCw className="w-10 h-10 animate-spin text-cyan-500 mb-4" />
        <p className="text-xs font-extrabold tracking-widest uppercase">SYNCHRONIZING OPERATIONAL COMMAND CENTER...</p>
        <p className="text-[10px] opacity-40 mt-1">Connecting to FastAPI twin nodes</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* 1. Header TopBar */}
      <TopBar
        health={health}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        error={globalError}
        userRole={userRole}
      />

      {/* Global Error Banner */}
      {globalError && (
        <div className="bg-rose-950/20 border-b border-rose-900/40 p-3 text-center text-[10px] font-mono text-rose-400 flex items-center justify-center gap-2 select-none">
          <AlertOctagon className="w-4 h-4" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Main body: SideNav + Tab Container */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        
        {/* 2. SideNav */}
        <SideNav currentTab={dashboardMode} onTabChange={setDashboardMode} />

        {/* 3. Panel Area wrapper */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar">
          
          {/* Dashboard KPIs shown on ALL tabs except landing */}
          <KPIBar
            risks={risks}
            corridorsCount={corridors.length}
            brentPrices={brentPrices}
            dataStatuses={dataStatuses}
            modelHealthStatus={modelHealthStatus}
          />

          {/* Dynamic Tab Switcher */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {dashboardMode === 'MONITOR' && (
                <motion.div
                  key="monitor"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Map and details selection layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    {/* 3D Globe Map */}
                    <div className="lg:col-span-8 h-[580px]">
                      <GlobeMap
                        infrastructure={infrastructure}
                        risks={risks}
                        onSelectCorridor={handleSelectCorridor}
                        selectedCorridor={selectedCorridor}
                      />
                    </div>

                    {/* Quick selector side card */}
                    <div className="lg:col-span-4 flex flex-col justify-between glass-panel p-4 rounded-xl border border-gray-900/60 font-mono text-[10px]">
                      <div>
                        <div className="flex items-center gap-2 border-b border-gray-900 pb-2 mb-3">
                          <Compass className="w-4 h-4 text-cyan-400" />
                          <h3 className="text-xs font-black tracking-wider text-white uppercase">Sector Inventory</h3>
                        </div>

                        <div className="space-y-2.5">
                          {corridors.map((c) => {
                            const cr = risks.find(r => r.corridor === c.corridor_id);
                            return (
                              <button
                                key={c.corridor_id}
                                onClick={() => handleSelectCorridor(c.corridor_id)}
                                className={`w-full text-left p-2.5 rounded-lg border transition hover:cursor-pointer ${
                                  selectedCorridor === c.corridor_id
                                    ? 'bg-cyan-950/20 border-cyan-800/40 text-cyan-400'
                                    : 'bg-gray-900/40 border-gray-900/45 text-gray-300 hover:bg-gray-900/80'
                                }`}
                              >
                                <div className="flex justify-between items-center font-bold">
                                  <span>{c.name}</span>
                                  <span className={`text-[8px] px-1 rounded border uppercase ${
                                    cr?.risk_level === 'LOW' 
                                      ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30' 
                                      : cr?.risk_level === 'MODERATE' 
                                      ? 'text-amber-400 bg-amber-950/20 border-amber-800/30' 
                                      : 'text-rose-400 bg-rose-950/20 border-rose-900/30'
                                  }`}>
                                    {cr?.risk_level || 'UNKNOWN'}
                                  </span>
                                </div>
                                <p className="text-[8px] text-gray-500 mt-1 leading-normal">
                                  {c.description}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="border-t border-gray-900 pt-3 mt-4 text-[8px] text-gray-500 leading-normal">
                        <span>Click a sector above or select nodes on the map layer to expand deep SHAP explanation diagnostics.</span>
                      </div>
                    </div>
                  </div>

                  {/* Below-map charts shelf */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Risk History */}
                    <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-3">
                      <div className="flex justify-between items-center border-b border-gray-900 pb-2">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Risk History Index</span>
                        <span className="text-[8px] text-gray-500 uppercase">30d inference</span>
                      </div>
                      <div className="h-[180px] w-full">
                        <RiskHistoryChart data={monitorHistory} />
                      </div>
                    </div>

                    {/* Traffic Flow */}
                    <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-3">
                      <div className="flex justify-between items-center border-b border-gray-900 pb-2">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Traffic Flow Sensor</span>
                        <span className="text-[8px] text-gray-500 uppercase">observed vessels</span>
                      </div>
                      <div className="h-[180px] w-full">
                        <TrafficTrendChart data={activeTraffic} />
                      </div>
                    </div>

                    {/* Brent Prices */}
                    <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-3">
                      <div className="flex justify-between items-center border-b border-gray-900 pb-2">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Brent Crude Spot</span>
                        <span className="text-[8px] text-gray-500 uppercase">Fred Data Stream</span>
                      </div>
                      <div className="h-[180px] w-full">
                        <BrentChart brentPrices={brentPrices} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tab: COMPARISON */}
              {dashboardMode === 'COMPARISON' && (
                <motion.div
                  key="comparison"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-4 font-mono text-[10px]"
                >
                  <h3 className="text-xs font-black tracking-wider text-white uppercase border-b border-gray-900 pb-2 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Cross-Corridor Comparison
                  </h3>

                  {comparisonLoading ? (
                    <div className="text-center py-12 text-gray-500">Retrieving comparatives...</div>
                  ) : comparison?.items ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-900 text-gray-500 uppercase text-[9px]">
                            <th className="pb-2">Sector Name</th>
                            <th className="pb-2 text-right">Risk Score</th>
                            <th className="pb-2 text-right">Probability</th>
                            <th className="pb-2 text-right">Geopolitical</th>
                            <th className="pb-2 text-right">Traffic Status</th>
                            <th className="pb-2 text-right">Data freshness</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-900/40 text-gray-300">
                          {comparison.items.map((item) => (
                            <tr key={item.corridor_id} className="hover:bg-gray-900/20">
                              <td className="py-3 font-bold uppercase">{item.name}</td>
                              <td className="py-3 text-right font-black text-white">{item.risk_score?.toFixed(2) || '0.00'}</td>
                              <td className="py-3 text-right text-cyan-400">
                                {item.probability !== null ? `${(item.probability * 100).toFixed(1)}%` : 'N/A'}
                              </td>
                              <td className="py-3 text-right uppercase">{item.geopolitical_status}</td>
                              <td className="py-3 text-right uppercase">{item.vessel_volume_status}</td>
                              <td className="py-3 text-right text-gray-500 uppercase">{item.data_freshness_traffic}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">Comparison indices unavailable.</div>
                  )}
                </motion.div>
              )}

              {/* Tab: SCENARIO */}
              {dashboardMode === 'SCENARIO' && (
                <motion.div
                  key="scenario"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <ScenarioSimulator corridors={corridors} />
                </motion.div>
              )}

              {/* Tab: TRENDS */}
              {dashboardMode === 'TRENDS' && (
                <motion.div
                  key="trends"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-4 font-mono text-[10px]"
                >
                  <div className="flex justify-between items-center border-b border-gray-900 pb-2">
                    <h3 className="text-xs font-black tracking-wider text-white uppercase flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-cyan-400" />
                      Retrospective Trend Analysis
                    </h3>
                    <select
                      value={trendCorridor}
                      onChange={(e) => setTrendCorridor(e.target.value)}
                      className="bg-gray-950 border border-gray-900 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                    >
                      {corridors.map((c) => (
                        <option key={c.corridor_id} value={c.corridor_id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="h-[300px] w-full">
                    {trendLoading ? (
                      <div className="h-full flex items-center justify-center text-gray-500">Querying historical trend matrices...</div>
                    ) : (
                      <RiskHistoryChart data={trendData} />
                    )}
                  </div>
                </motion.div>
              )}

              {/* Tab: INTELLIGENCE */}
              {dashboardMode === 'INTELLIGENCE' && (
                <motion.div
                  key="intelligence"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-[10px]"
                >
                  {/* Geopolitical logs */}
                  <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-3">
                    <span className="text-xs font-black text-white uppercase border-b border-gray-900 pb-2 block">
                      Geopolitical Threat Incident Feed
                    </span>
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 scrollbar">
                      {activeEvents.map((evt, idx) => (
                        <div key={idx} className="border-b border-gray-900/40 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                          <div className="flex justify-between text-[8px] text-gray-500">
                            <span>SOURCE: {evt.source.toUpperCase()}</span>
                            <span>{evt.event_date}</span>
                          </div>
                          <p className="text-[10px] text-gray-300 mt-1 leading-normal">{evt.text_reference}</p>
                        </div>
                      ))}
                      {activeEvents.length === 0 && (
                        <div className="text-center py-8 text-gray-500">No events logged.</div>
                      )}
                    </div>
                  </div>

                  {/* Traffic sensor logs */}
                  <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-3">
                    <span className="text-xs font-black text-white uppercase border-b border-gray-900 pb-2 block">
                      Vessel Flow Stream Ingests
                    </span>
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 scrollbar">
                      {activeTraffic.map((t, idx) => (
                        <div key={idx} className="border-b border-gray-900/40 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                          <div className="flex justify-between text-[8px] text-gray-500">
                            <span>DATE: {t.date}</span>
                            <span className={t.anomaly_flag ? 'text-rose-500 font-bold' : 'text-emerald-400 font-bold'}>
                              {t.anomaly_type}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-300 mt-1">
                            Vessels: <span className="font-bold">{t.vessel_count}</span> | Tankers: <span className="font-bold text-cyan-400">{t.tanker_count}</span>
                          </p>
                        </div>
                      ))}
                      {activeTraffic.length === 0 && (
                        <div className="text-center py-8 text-gray-500">No traffic logs found.</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tab: MODELS */}
              {dashboardMode === 'MODELS' && (
                <motion.div
                  key="models"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <ModelCenter
                    corridors={corridors}
                    modelHealthCorridor={modelHealthCorridor}
                    onCorridorChange={setModelHealthCorridor}
                    modelHealth={modelHealthData}
                    modelEval={modelEvalData}
                    modelDrift={modelDriftData}
                  />
                </motion.div>
              )}

              {/* Tab: GOVERNANCE */}
              {dashboardMode === 'GOVERNANCE' && (
                <motion.div
                  key="governance"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <GovernanceCenter
                    corridors={corridors}
                    modelHealthCorridor={modelHealthCorridor}
                    onCorridorChange={setModelHealthCorridor}
                    corridorVersions={corridorVersions}
                    championChallenger={championChallenger}
                    retrainStatus={retrainStatus}
                    modelCardMarkdown={modelCardMarkdown}
                    isReadOnlyRole={isReadOnlyRole}
                    onPromote={promoteModel}
                    onRollback={rollbackModel}
                  />
                </motion.div>
              )}

              {/* Tab: OBSERVABILITY */}
              {dashboardMode === 'OBSERVABILITY' && (
                <motion.div
                  key="observability"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <ObservabilityCenter observabilityMetrics={observabilityMetrics} />
                </motion.div>
              )}

              {/* Tab: SECURITY */}
              {dashboardMode === 'SECURITY' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <SecurityCenter
                    securityStatus={securityStatus}
                    securityKeys={securityKeys}
                    securityAudits={securityAudits}
                    activeApiKey={activeApiKey}
                    onApiKeyChange={handleApiKeyChange}
                    securityError={securityError}
                    onGenerateKey={generateNewKey}
                    onRevokeKey={revokeApiKey}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Slide-out Intelligence Drawer */}
      <AnimatePresence>
        {isDrawerOpen && selectedCorridorObj && (
          <CorridorDrawer
            corridorId={selectedCorridor || 'HORMUZ'}
            corridorName={selectedCorridorObj.name}
            activeRisk={activeRisk}
            activeEvents={activeEvents}
            activeTraffic={activeTraffic}
            activeExplainability={activeExplainability}
            onClose={() => setIsDrawerOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
