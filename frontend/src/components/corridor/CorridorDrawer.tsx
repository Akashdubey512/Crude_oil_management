import { motion } from 'framer-motion';
import { X, Ship, Compass, ShieldAlert, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import RiskDecomposition from './RiskDecomposition';
import SHAPPanel from './SHAPPanel';
import type { RiskSnapshot, GeopoliticalEvent, TrafficObservation, ExplainabilityResponse } from '../../types';
import { slideInRight } from '../../design-system/animations';

import { getRiskInfo } from '../map/maritimeData';

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

  // Unified Risk Info using single source of truth getRiskInfo()
  const riskInfo = getRiskInfo(activeRisk?.probability, activeRisk?.risk_level);
  const score = activeRisk && activeRisk.risk_score !== null ? activeRisk.risk_score : 0;
  const probPercent = riskInfo.percentage;

  let badgeIcon = CheckCircle2;
  if (riskInfo.level === 'MODERATE') badgeIcon = AlertTriangle;
  if (riskInfo.level === 'HIGH') badgeIcon = AlertCircle;

  const BadgeIcon = badgeIcon;
  const latestTraffic = activeTraffic.length > 0 ? activeTraffic[0] : null;

  return (
    <motion.div
      variants={slideInRight}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed right-0 top-[57px] bottom-0 w-full md:w-[460px] border-l z-[1500] flex flex-col justify-between select-none font-manrope shadow-2xl"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-default)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Header Area */}
      <div
        className="p-4 border-b flex justify-between items-center backdrop-blur"
        style={{
          backgroundColor: 'var(--bg-surface-subtle)',
          borderColor: 'var(--border-default)',
        }}
      >
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-sm font-bold uppercase font-space tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {corridorName}
            </h3>
          </div>
          {isRedSea && (
            <span className="text-[10px] font-medium text-amber-500 block mt-0.5 uppercase tracking-wide font-inter">
              * Bab el-Mandeb traffic proxy
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="close"
          className="p-1.5 rounded-lg border transition cursor-pointer hover:opacity-80"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-default)',
            color: 'var(--text-secondary)',
          }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar">
        {/* Risk Badge and Probability Bar */}
        <div className="navy-card p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span
              className="text-[10px] font-bold uppercase font-jakarta"
              style={{ color: 'var(--text-muted)' }}
            >
              Operational Risk Level
            </span>
            <div
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-xs font-semibold uppercase font-geist"
              style={{
                color: riskInfo.color,
                backgroundColor: riskInfo.bg,
                borderColor: riskInfo.border,
              }}
            >
              <BadgeIcon className="w-3.5 h-3.5" />
              <span>{riskInfo.label}</span>
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs font-inter font-medium" style={{ color: 'var(--text-muted)' }}>Risk Index:</span>
              <span className="text-2xl font-bold font-space block leading-none mt-1" style={{ color: 'var(--text-primary)' }}>
                {score.toFixed(2)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-inter font-medium" style={{ color: 'var(--text-muted)' }}>Probability:</span>
              <span className="text-xl font-bold font-geist block leading-none mt-1" style={{ color: riskInfo.color }}>
                {probPercent}
              </span>
            </div>
          </div>

          {/* Horizontal progress indicator */}
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-default)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: probPercent === 'N/A' ? '0%' : probPercent,
                backgroundColor: riskInfo.color,
              }}
            />
          </div>
        </div>

        {/* 5-Vector Decomposition */}
        {activeRisk?.risk_decomposition && (
          <div className="navy-card p-4">
            <RiskDecomposition decomposition={activeRisk.risk_decomposition} />
          </div>
        )}

        {/* Traffic Intelligence Card */}
        <div className="navy-card p-4 space-y-3">
          <div
            className="flex justify-between items-center pb-2 border-b"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <div className="flex items-center gap-2">
              <Ship className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <h4
                className="text-xs font-semibold tracking-wide uppercase font-space"
                style={{ color: 'var(--text-primary)' }}
              >
                AIS Traffic Intel
              </h4>
            </div>
            <span
              className="text-[9px] font-geist uppercase font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              PORTWATCH FEED
            </span>
          </div>

          {latestTraffic ? (
            <div className="grid grid-cols-2 gap-3 text-xs font-geist">
              <div>
                <span className="block text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>TOTAL VESSELS</span>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{latestTraffic.vessel_count} / day</span>
              </div>
              <div>
                <span className="block text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>TANKERS (OIL/LNG)</span>
                <span className="text-sm font-bold" style={{ color: 'var(--info-blue)' }}>{latestTraffic.tanker_count} / day</span>
              </div>
              <div>
                <span className="block text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>ANOMALY STATUS</span>
                <span
                  className="font-semibold text-xs"
                  style={{ color: latestTraffic.anomaly_flag ? 'var(--risk-high)' : 'var(--risk-low)' }}
                >
                  {latestTraffic.anomaly_type}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>LAST RECORDED</span>
                <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{latestTraffic.date}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-2 text-xs font-inter" style={{ color: 'var(--text-muted)' }}>
              AIS traffic data unavailable from PortWatch API for this region.
            </div>
          )}
        </div>

        {/* SHAP explanation */}
        <div className="navy-card p-4">
          <SHAPPanel explainability={activeExplainability} corridorId={corridorId} />
        </div>

        {/* Geopolitical Events List */}
        <div className="navy-card p-4 space-y-3">
          <div
            className="flex justify-between items-center pb-2 border-b"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <h4
                className="text-xs font-semibold tracking-wide uppercase font-space"
                style={{ color: 'var(--text-primary)' }}
              >
                Geopolitical Incidents
              </h4>
            </div>
            <span
              className="text-[9px] font-geist uppercase font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              GDELT REPOSITORY
            </span>
          </div>

          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 scrollbar">
            {activeEvents.length > 0 ? (
              activeEvents.map((evt, idx) => (
                <div
                  key={idx}
                  className="border-b last:border-0 pb-2 mb-2 last:pb-0 last:mb-0"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div
                    className="flex justify-between items-center text-[10px] font-geist"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>SRC: {evt.source.toUpperCase()}</span>
                    <span>{evt.event_date}</span>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed font-inter" style={{ color: 'var(--text-secondary)' }}>
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
      <div className="p-3.5 border-t border-slate-800/80 bg-[#060b13] text-[10px] font-geist text-slate-400 flex justify-between items-center select-none font-medium">
        <span>MODEL INFERENCE: V1.0</span>
        <span className="text-slate-300">SECURITY SESSION: ACTIVE</span>
      </div>
    </motion.div>
  );
}
