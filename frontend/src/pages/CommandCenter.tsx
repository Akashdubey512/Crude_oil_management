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
import SupplierRiskExposureCard from '../components/corridor/SupplierRiskExposureCard';
import AskAnalystChat from '../components/assistant/AskAnalystChat';

// Custom API imports for tab-specific fetches
import { api, setActiveKey, getActiveKey } from '../api/client';
import type { RiskHistoryEntry, CorridorComparisonResponse } from '../types';

import type { Theme } from '../api/hooks/useTheme';

interface CommandCenterProps {
  initialTab?: string;
  initialCorridor?: string | null;
  onReturnToLanding?: () => void;
  theme?: Theme;
  onToggleTheme?: () => void;
}

export default function CommandCenter({
  initialTab = 'MONITOR',
  initialCorridor = 'HORMUZ',
  onReturnToLanding,
  theme = 'dark',
  onToggleTheme,
}: CommandCenterProps = {}) {
  // 1. Navigation state
  const [dashboardMode, setDashboardMode] = useState<string>(initialTab);

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
  const [selectedCorridor, setSelectedCorridor] = useState<string | null>(initialCorridor || 'HORMUZ');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const selectedCorridorObj = corridors.find((c) => c.corridor_id === selectedCorridor);

  const handleSelectCorridor = (id: string | null) => {
    if (!id) {
      setSelectedCorridor(null);
      setIsDrawerOpen(false);
    } else {
      setSelectedCorridor(id);
      setIsDrawerOpen(true);
    }
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
  const [activeApiKey, setActiveApiKey] = useState<string>(() => getActiveKey());
  const {
    securityStatus,
    securityKeys,
    securityAudits,
    error: securityError,
    refresh: refreshSecurity,
    generateNewKey,
    revokeApiKey,
  } = useSecurity(activeApiKey);

  /** Atomically change the active API key and persist it. */
  const handleApiKeyChange = (newKey: string) => {
    setActiveKey(newKey);        // synchronous — updates module store + localStorage
    setActiveApiKey(newKey);     // triggers re-render & hook refresh
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
  const modelHealthStatus = 'GOOD';

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
    if (activeApiKey) {
      await refreshSecurity();
    }
    await refreshGovernance();
    await refreshObservability();
  };

  // Live role – resolved from /api/security/me whenever the active key changes
  const [userRole, setUserRole] = useState<string>('ADMIN');
  const isReadOnlyRole = userRole === 'VIEWER' || userRole === 'ANALYST';

  useEffect(() => {
    api.getMe()
      .then((me) => setUserRole(me.actor_role))
      .catch(() => setUserRole('VIEWER'));
  }, [activeApiKey]);

  /** Switch role: update key atomically FIRST, then resolve the new role. */
  const handleRoleChange = (newKey: string) => {
    setActiveKey(newKey);          // synchronous — store updated before getMe fires
    setActiveApiKey(newKey);
    // Pass the new key directly so getMe doesn't read stale state
    api.getMe(newKey)
      .then((me) => setUserRole(me.actor_role))
      .catch(() => setUserRole('VIEWER'));
  };

  // Skeleton screen if global state loading
  if (globalLoading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center font-geist p-6 select-none"
        style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-secondary)' }}
      >
        <RefreshCw className="w-8 h-8 animate-spin mb-4" style={{ color: 'var(--text-muted)' }} />
        <p className="text-xs font-semibold font-space tracking-wider uppercase" style={{ color: 'var(--text-primary)' }}>SYNCHRONIZING OPERATIONAL COMMAND CENTER...</p>
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>Connecting to FastAPI twin nodes</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col font-manrope"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}
    >
      {/* 1. Header TopBar */}
      <TopBar
        health={health}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        error={globalError}
        userRole={userRole}
        onRoleChange={handleRoleChange}
        onReturnToLanding={onReturnToLanding}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      {/* Global Error Banner */}
      {globalError && (
        <div
          className="border-b p-2.5 text-center text-xs font-geist flex items-center justify-center gap-2 select-none font-medium"
          style={{
            backgroundColor: 'var(--risk-high-bg)',
            borderColor: 'var(--risk-high-border)',
            color: 'var(--risk-high-text)',
          }}
        >
          <AlertOctagon className="w-4 h-4" style={{ color: 'var(--risk-high)' }} />
          <span>{globalError}</span>
        </div>
      )}

      {/* Main body: SideNav + Tab Container */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        
        {/* 2. SideNav */}
        <SideNav currentTab={dashboardMode} onTabChange={setDashboardMode} />

        {/* 3. Panel Area wrapper */}
        <main className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar">
          
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
                  className="space-y-5"
                >
                  {/* Map and details selection layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                    {/* 60FPS Tactical Map */}
                    <div className="lg:col-span-8 h-[580px]">
                      <GlobeMap
                        infrastructure={infrastructure}
                        risks={risks}
                        onSelectCorridor={handleSelectCorridor}
                        selectedCorridor={selectedCorridor}
                      />
                    </div>

                    {/* Quick selector side card */}
                    <div
                      className="lg:col-span-4 flex flex-col justify-between navy-card p-4 font-manrope"
                    >
                      <div>
                        <div
                          className="flex items-center gap-2 pb-2.5 mb-3 border-b"
                          style={{ borderColor: 'var(--border-default)' }}
                        >
                          <Compass className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                          <h3
                            className="text-xs font-bold tracking-wider uppercase font-space"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            Sector Inventory
                          </h3>
                        </div>

                        <div className="space-y-1.5">
                          {corridors.map((c) => {
                            const cr = risks.find(r => r.corridor === c.corridor_id);
                            const isSelected = selectedCorridor === c.corridor_id;
                            const riskLevel = cr?.risk_level || 'UNKNOWN';
                            return (
                              <button
                                key={c.corridor_id}
                                onClick={() => handleSelectCorridor(c.corridor_id)}
                                className="w-full text-left p-3 rounded-lg border transition-all duration-150 cursor-pointer"
                                style={{
                                  backgroundColor: isSelected ? 'var(--active-overlay)' : 'transparent',
                                  borderColor: isSelected ? 'var(--accent-muted)' : 'var(--border-subtle)',
                                }}
                              >
                                <div className="flex justify-between items-center font-medium text-xs">
                                  <span
                                    className="font-space font-semibold"
                                    style={{ color: 'var(--text-primary)' }}
                                  >
                                    {c.name}
                                  </span>
                                  <span
                                    className={`risk-badge ${
                                      riskLevel === 'LOW' ? 'low'
                                      : riskLevel === 'MODERATE' ? 'moderate'
                                      : riskLevel === 'HIGH' ? 'high'
                                      : 'critical'
                                    }`}
                                  >
                                    {riskLevel}
                                  </span>
                                </div>
                                <p
                                  className="text-[10px] mt-1.5 leading-relaxed font-inter"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  {c.description}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div
                        className="border-t pt-3 mt-3 text-[10px] font-inter"
                        style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}
                      >
                        <span>Click a sector above or select nodes on the map layer to inspect SHAP diagnostics.</span>
                      </div>
                    </div>

                    {/* Supplier-Country Exposure Risk Card Overlay & Ask Analyst GenAI Chat */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                      <SupplierRiskExposureCard />
                      <AskAnalystChat />
                    </div>
                  </div>

                  {/* Below-map charts shelf */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {[
                      { title: 'Risk History Index', label: '30d inference', content: <RiskHistoryChart data={monitorHistory} /> },
                      { title: 'Traffic Flow Sensor', label: 'Observed Vessels', content: <TrafficTrendChart data={activeTraffic} /> },
                      { title: 'Brent Crude Spot', label: 'FRED Stream', content: <BrentChart brentPrices={brentPrices} /> },
                    ].map(({ title, label, content }) => (
                      <div key={title} className="navy-card p-4 space-y-2">
                        <div
                          className="flex justify-between items-center pb-2 border-b"
                          style={{ borderColor: 'var(--border-default)' }}
                        >
                          <span
                            className="text-xs font-semibold uppercase tracking-wide font-space"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {title}
                          </span>
                          <span
                            className="text-[9px] font-geist uppercase font-medium"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {label}
                          </span>
                        </div>
                        <div className="h-[180px] w-full">{content}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Tab: COMPARISON */}
              {dashboardMode === 'COMPARISON' && (
                <motion.div
                  key="comparison"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="navy-card p-5 space-y-4 font-manrope text-xs"
                >
                  <h3
                    className="text-xs font-semibold tracking-wider uppercase pb-3 flex items-center gap-2 font-space border-b"
                    style={{ color: 'var(--text-primary)', borderColor: 'var(--border-default)' }}
                  >
                    <Layers className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    Cross-Corridor Comparison
                  </h3>

                  {comparisonLoading ? (
                    <div className="text-center py-12 font-inter" style={{ color: 'var(--text-muted)' }}>Retrieving comparatives...</div>
                  ) : comparison?.items ? (
                    <div className="overflow-x-auto font-geist">
                      <table className="theme-table">
                        <thead>
                          <tr>
                            <th>Sector Name</th>
                            <th className="text-right">Risk Score</th>
                            <th className="text-right">Probability</th>
                            <th className="text-right">Geopolitical</th>
                            <th className="text-right">Traffic Status</th>
                            <th className="text-right">Data Freshness</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparison.items.map((item) => (
                            <tr key={item.corridor_id}>
                              <td className="font-semibold uppercase font-space" style={{ color: 'var(--text-primary)' }}>{item.name}</td>
                              <td className="text-right font-bold" style={{ color: 'var(--text-primary)' }}>{item.risk_score?.toFixed(2) || '0.00'}</td>
                              <td className="text-right font-semibold" style={{ color: 'var(--info-blue)' }}>
                                {item.probability !== null ? `${(item.probability * 100).toFixed(1)}%` : 'N/A'}
                              </td>
                              <td className="text-right uppercase">{item.geopolitical_status}</td>
                              <td className="text-right uppercase">{item.vessel_volume_status}</td>
                              <td className="text-right uppercase" style={{ color: 'var(--text-muted)' }}>{item.data_freshness_traffic}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 font-inter" style={{ color: 'var(--text-muted)' }}>Comparison indices unavailable.</div>
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
                  className="navy-card p-5 space-y-4 font-manrope text-xs"
                >
                  <div
                    className="flex justify-between items-center pb-3 border-b"
                    style={{ borderColor: 'var(--border-default)' }}
                  >
                    <h3
                      className="text-xs font-semibold tracking-wider uppercase flex items-center gap-2 font-space"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <TrendingUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      Retrospective Trend Analysis
                    </h3>
                    <select
                      value={trendCorridor}
                      onChange={(e) => setTrendCorridor(e.target.value)}
                      className="theme-select"
                    >
                      {corridors.map((c) => (
                        <option key={c.corridor_id} value={c.corridor_id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="h-[320px] w-full">
                    {trendLoading ? (
                      <div className="h-full flex items-center justify-center font-inter" style={{ color: 'var(--text-muted)' }}>Querying historical trend matrices...</div>
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
                  className="grid grid-cols-1 lg:grid-cols-2 gap-5 font-manrope text-xs"
                >
                  {/* Geopolitical logs */}
                  <div className="navy-card p-4 space-y-3">
                    <span
                      className="text-xs font-semibold uppercase pb-2.5 border-b block font-space"
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border-default)' }}
                    >
                      Geopolitical Threat Incident Feed
                    </span>
                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar">
                      {activeEvents.map((evt, idx) => (
                        <div
                          key={idx}
                          className="border-b pb-2.5 mb-2.5 last:border-0 last:pb-0 last:mb-0"
                          style={{ borderColor: 'var(--border-subtle)' }}
                        >
                          <div
                            className="flex justify-between text-[10px] font-geist"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>SOURCE: {evt.source.toUpperCase()}</span>
                            <span>{evt.event_date}</span>
                          </div>
                          <p
                            className="text-xs mt-1.5 leading-relaxed font-inter"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {evt.text_reference}
                          </p>
                        </div>
                      ))}
                      {activeEvents.length === 0 && (
                        <div className="text-center py-8 font-inter" style={{ color: 'var(--text-muted)' }}>No events logged.</div>
                      )}
                    </div>
                  </div>

                  {/* Traffic sensor logs */}
                  <div className="navy-card p-4 space-y-3">
                    <span
                      className="text-xs font-semibold uppercase pb-2.5 border-b block font-space"
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border-default)' }}
                    >
                      Vessel Flow Stream Ingests
                    </span>
                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar">
                      {activeTraffic.map((t, idx) => (
                        <div
                          key={idx}
                          className="border-b pb-2.5 mb-2.5 last:border-0 last:pb-0 last:mb-0"
                          style={{ borderColor: 'var(--border-subtle)' }}
                        >
                          <div
                            className="flex justify-between text-[10px] font-geist"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <span>DATE: {t.date}</span>
                            <span
                              className="font-semibold"
                              style={{ color: t.anomaly_flag ? 'var(--risk-high)' : 'var(--risk-low)' }}
                            >
                              {t.anomaly_type}
                            </span>
                          </div>
                          <p
                            className="text-xs mt-1.5 font-geist"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            Vessels: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t.vessel_count}</span>{' '}
                            | Tankers: <span className="font-semibold" style={{ color: 'var(--info-blue)' }}>{t.tanker_count}</span>
                          </p>
                        </div>
                      ))}
                      {activeTraffic.length === 0 && (
                        <div className="text-center py-8 font-inter" style={{ color: 'var(--text-muted)' }}>No traffic logs found.</div>
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
                    userRole={userRole}
                    onApiKeyChange={handleApiKeyChange}
                    securityError={securityError}
                    onGenerateKey={generateNewKey}
                    onRevokeKey={revokeApiKey}
                    onRefresh={refreshSecurity}
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
