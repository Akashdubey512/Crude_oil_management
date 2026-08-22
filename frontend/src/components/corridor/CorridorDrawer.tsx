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

  let riskColorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  let badgeIcon = CheckCircle2;
  if (riskLevel === 'MODERATE') {
    riskColorClass = 'text-amber-700 bg-amber-50 border-amber-200';
    badgeIcon = AlertTriangle;
  } else if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
    riskColorClass = 'text-rose-700 bg-rose-50 border-rose-200';
    badgeIcon = AlertCircle;
  }

  const BadgeIcon = badgeIcon;
  const latestTraffic = activeTraffic.length > 0 ? activeTraffic[0] : null;

  return (
    <motion.div
      variants={slideInRight}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed right-0 top-[60px] bottom-0 w-full md:w-[480px] bg-white border-l border-slate-200/90 shadow-2xl z-[1500] flex flex-col justify-between select-none font-manrope"
    >
      {/* Header Area */}
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white/95 backdrop-blur">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-black text-slate-900 uppercase font-space tracking-tight">
              {corridorName}
            </h3>
          </div>
          {isRedSea && (
            <span className="text-[10px] font-bold text-orange-600 block mt-0.5 uppercase tracking-wide font-inter">
              * Bab el-Mandeb traffic proxy
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="close"
          className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar">
        {/* Risk Badge and Probability Bar */}
        <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-jakarta">
              Operational Risk Level
            </span>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-extrabold uppercase ${riskColorClass}`}>
              <BadgeIcon className="w-3.5 h-3.5" />
              <span>{riskLevel}</span>
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <span className="text-slate-500 text-xs font-inter font-medium">Risk Index:</span>
              <span className="text-3xl font-black font-space text-slate-900 block leading-none mt-1">
                {score.toFixed(2)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 text-xs font-inter font-medium">Probability:</span>
              <span className="text-2xl font-bold font-geist text-blue-600 block leading-none mt-1">{probPercent}</span>
            </div>
          </div>

          {/* Simple horizontal progress indicator */}
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
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
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
            <RiskDecomposition decomposition={activeRisk.risk_decomposition} />
          </div>
        )}

        {/* Traffic Intelligence Card */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Ship className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-black tracking-wider text-slate-900 uppercase font-space">
                AIS TRAFFIC INTEL
              </h4>
            </div>
            <span className="text-[9px] font-geist text-slate-400 uppercase font-bold">PORTWATCH FEED</span>
          </div>

          {latestTraffic ? (
            <div className="grid grid-cols-2 gap-4 text-xs font-geist">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">TOTAL VESSELS</span>
                <span className="text-base font-extrabold text-slate-900">{latestTraffic.vessel_count} / day</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">TANKERS (OIL/LNG)</span>
                <span className="text-base font-extrabold text-blue-600">{latestTraffic.tanker_count} / day</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">ANOMALY STATUS</span>
                <span className={`font-extrabold text-xs ${latestTraffic.anomaly_flag ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {latestTraffic.anomaly_type}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">LAST RECORDED</span>
                <span className="text-slate-700 font-bold">{latestTraffic.date}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-2 text-xs text-slate-400 font-inter">
              AIS traffic data unavailable from PortWatch API for this region.
            </div>
          )}
        </div>

        {/* SHAP explanation */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
          <SHAPPanel explainability={activeExplainability} corridorId={corridorId} />
        </div>

        {/* Geopolitical Events List */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-orange-600" />
              <h4 className="text-xs font-black tracking-wider text-slate-900 uppercase font-space">
                GEOPOLITICAL INCIDENTS
              </h4>
            </div>
            <span className="text-[9px] font-geist text-slate-400 uppercase font-bold">GDELT REPOSITORY</span>
          </div>

          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 scrollbar">
            {activeEvents.length > 0 ? (
              activeEvents.map((evt, idx) => (
                <div key={idx} className="border-b border-slate-100 last:border-0 pb-2.5 mb-2.5 last:pb-0 last:mb-0">
                  <div className="flex justify-between items-center text-[10px] font-geist text-slate-400">
                    <span className="font-bold text-blue-600">SRC: {evt.source.toUpperCase()}</span>
                    <span>{evt.event_date}</span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed font-inter">
                    {evt.text_reference}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-xs text-slate-400 font-inter">
                No recent geopolitical alerts recorded for this sector.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Provenance Info */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 text-[10px] font-geist text-slate-500 flex justify-between items-center select-none font-bold">
        <span>MODEL INFERENCE TARGET: V1.0</span>
        <span className="text-emerald-700">SECURITY PROMPT ACCESS: ACTIVE</span>
      </div>
    </motion.div>
  );
}
