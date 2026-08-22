import { motion } from 'framer-motion';
import { X, Ship, Compass, ShieldAlert, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import RiskDecomposition from './RiskDecomposition';
import SHAPPanel from './SHAPPanel';
import type { RiskSnapshot, GeopoliticalEvent, TrafficObservation, ExplainabilityResponse } from '../../types';
import { slideInRight } from '../../design-system/animations';

interface CorridorDrawerProps {
  corridorId: string;
  corridorName: string;
  activeRisk: RiskSnapshot | null;
  activeEvents: GeopoliticalEvent[];
  activeTraffic: TrafficObservation[];
  activeExplainability: ExplainabilityResponse | null;
  onClose: () => void;
}

export default function CorridorDrawer({
  corridorId,
  corridorName,
  activeRisk,
  activeEvents,
  activeTraffic,
  activeExplainability,
  onClose
}: CorridorDrawerProps) {
  const isRedSea = corridorId === 'RED_SEA';

  // Risk Score Styling
  const score = activeRisk && activeRisk.risk_score !== null ? activeRisk.risk_score : 0;
  const probPercent = activeRisk && activeRisk.probability !== null ? `${(activeRisk.probability * 100).toFixed(0)}%` : '---';
  const riskLevel = activeRisk ? activeRisk.risk_level : 'UNKNOWN';

  let riskColorClass = 'text-emerald-400 bg-emerald-950/40 border-emerald-800/30';
  let badgeIcon = CheckCircle2;
  if (riskLevel === 'MODERATE') {
    riskColorClass = 'text-amber-400 bg-amber-950/40 border-amber-800/30';
    badgeIcon = AlertTriangle;
  } else if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
    riskColorClass = 'text-rose-400 bg-rose-950/40 border-rose-800/30';
    badgeIcon = AlertCircle;
  }

  const BadgeIcon = badgeIcon;

  // Find latest observed traffic
  const latestTraffic = activeTraffic.length > 0 ? activeTraffic[0] : null;

  return (
    <motion.div
      variants={slideInRight}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed right-0 top-[60px] bottom-0 w-full md:w-[460px] bg-gray-950 border-l border-gray-900 shadow-2xl z-[1500] flex flex-col justify-between select-none"
    >
      {/* Header Area */}
      <div className="p-5 border-b border-gray-900 flex justify-between items-center bg-gray-950/90 backdrop-blur">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-black tracking-wider text-white uppercase">
              {corridorName}
            </h3>
          </div>
          {isRedSea && (
            <span className="text-[9px] font-mono text-amber-500 font-bold block mt-0.5 uppercase tracking-wide">
              * Bab el-Mandeb traffic proxy
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="close"
          className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition hover:cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar">
        {/* Risk Badge and Probability Bar */}
        <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-mono font-bold text-gray-500 uppercase">
              Operational Risk Level
            </span>
            <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded border text-[10px] font-mono font-extrabold uppercase ${riskColorClass}`}>
              <BadgeIcon className="w-3.5 h-3.5" />
              <span>{riskLevel}</span>
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <span className="text-gray-400 text-xs">Risk Index:</span>
              <span className="text-3xl font-black tracking-tight text-white block">
                {score.toFixed(2)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-gray-400 text-xs">Probability:</span>
              <span className="text-xl font-bold text-cyan-400 block">{probPercent}</span>
            </div>
          </div>

          {/* Simple horizontal progress indicator */}
          <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden border border-gray-800">
            <div
              className={`h-full rounded-full ${
                riskLevel === 'LOW'
                  ? 'bg-emerald-500'
                  : riskLevel === 'MODERATE'
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${score * 100}%` }}
            />
          </div>
        </div>

        {/* 5-Vector Decomposition */}
        {activeRisk?.risk_decomposition && (
          <div className="glass-panel p-4 rounded-xl border border-gray-900/60">
            <RiskDecomposition decomposition={activeRisk.risk_decomposition} />
          </div>
        )}

        {/* Traffic Intelligence Card */}
        <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-3">
          <div className="flex justify-between items-center border-b border-gray-900 pb-2">
            <div className="flex items-center gap-2">
              <Ship className="w-3.5 h-3.5 text-cyan-400" />
              <h4 className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
                AIS TRAFFIC INTEL
              </h4>
            </div>
            <span className="text-[8px] font-mono text-gray-500 uppercase">PORTWATCH FEED</span>
          </div>

          {latestTraffic ? (
            <div className="grid grid-cols-2 gap-4 text-[10px] font-mono">
              <div>
                <span className="text-gray-500 block">TOTAL VESSELS</span>
                <span className="text-sm font-bold text-white">{latestTraffic.vessel_count} / day</span>
              </div>
              <div>
                <span className="text-gray-500 block">TANKERS (OIL/LNG)</span>
                <span className="text-sm font-bold text-cyan-400">{latestTraffic.tanker_count} / day</span>
              </div>
              <div>
                <span className="text-gray-500 block">ANOMALY STATUS</span>
                <span className={`font-bold ${latestTraffic.anomaly_flag ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {latestTraffic.anomaly_type}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">LAST RECORDED</span>
                <span className="text-gray-400">{latestTraffic.date}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-2 text-[10px] text-gray-500 font-mono">
              AIS traffic data unavailable from PortWatch API for this region.
            </div>
          )}
        </div>

        {/* SHAP explanation */}
        <div className="glass-panel p-4 rounded-xl border border-gray-900/60">
          <SHAPPanel explainability={activeExplainability} corridorId={corridorId} />
        </div>

        {/* Geopolitical Events List */}
        <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-3">
          <div className="flex justify-between items-center border-b border-gray-900 pb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
              <h4 className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
                GEOPOLITICAL INCIDENTS
              </h4>
            </div>
            <span className="text-[8px] font-mono text-gray-500 uppercase">GDELT REPOSITORY</span>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar">
            {activeEvents.length > 0 ? (
              activeEvents.map((evt, idx) => (
                <div key={idx} className="border-b border-gray-900/60 last:border-0 pb-2 mb-2 last:pb-0 last:mb-0">
                  <div className="flex justify-between items-center text-[9px] font-mono text-gray-500">
                    <span>SRC: {evt.source.toUpperCase()}</span>
                    <span>{evt.event_date}</span>
                  </div>
                  <p className="text-[10px] text-gray-300 mt-1 leading-normal">
                    {evt.text_reference}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-[10px] text-gray-500 font-mono">
                No recent geopolitical alerts recorded for this sector.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Provenance Info */}
      <div className="p-4 border-t border-gray-900 bg-gray-950 text-[8px] font-mono text-gray-600 flex justify-between items-center select-none">
        <span>MODEL INFERENCE TARGET: V1.0</span>
        <span>SECURITY PROMPT ACCESS: ACTIVE</span>
      </div>
    </motion.div>
  );
}
