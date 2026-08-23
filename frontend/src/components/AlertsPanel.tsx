import { AlertTriangle, TrendingDown, RefreshCw } from 'lucide-react';
import type { RiskSnapshot } from '../types';

interface AlertsPanelProps {
  risks: RiskSnapshot[];
}

export default function AlertsPanel({ risks }: AlertsPanelProps) {
  // Build active alerts strictly based on real API risk outputs
  const activeAlerts: Array<{
    id: string;
    corridor: string;
    type: 'HIGH_RISK' | 'TRAFFIC_DROP' | 'VOLATILITY';
    message: string;
    level: 'CRITICAL' | 'WARNING' | 'INFO';
  }> = [];

  risks.forEach((snap) => {
    // 1. High risk alerts
    if (snap.risk_level === 'CRITICAL' || snap.risk_level === 'HIGH') {
      activeAlerts.push({
        id: `risk-${snap.corridor}`,
        corridor: snap.corridor,
        type: 'HIGH_RISK',
        message: `Corridor ${snap.corridor} has elevated disruption risk (${(snap.probability ? snap.probability * 100 : 0).toFixed(1)}%).`,
        level: snap.risk_level === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
      });
    }

    // 2. Traffic anomalies
    if (snap.top_factors?.includes('anomaly_type_drop')) {
      activeAlerts.push({
        id: `traffic-${snap.corridor}`,
        corridor: snap.corridor,
        type: 'TRAFFIC_DROP',
        message: `Statistical traffic drop detected at ${snap.corridor} chokepoint.`,
        level: 'WARNING',
      });
    }
  });

  return (
    <div className="p-4 rounded-xl border border-slate-800/80 bg-[#0a1322] flex flex-col gap-3 min-h-[160px]">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
        <span className="text-xs uppercase font-bold tracking-wider text-slate-400 font-space">
          Platform Alerts Center
        </span>
        <span className="bg-slate-800/60 border border-slate-700/60 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-300">
          {activeAlerts.length} Active
        </span>
      </div>

      <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
        {activeAlerts.length === 0 ? (
          <div className="text-slate-500 text-center py-6 text-xs flex flex-col items-center gap-1.5 font-inter">
            <RefreshCw className="w-4 h-4 opacity-40 animate-spin" />
            <span>All monitored chokepoints operating within normal bounds.</span>
          </div>
        ) : (
          activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-2.5 rounded-lg border text-xs flex gap-2.5 items-start font-inter ${
                alert.level === 'CRITICAL'
                  ? 'border-rose-800/40 bg-rose-950/20 text-rose-300'
                  : 'border-amber-800/40 bg-amber-950/20 text-amber-300'
              }`}
            >
              {alert.type === 'TRAFFIC_DROP' ? (
                <TrendingDown className="w-4 h-4 shrink-0 text-slate-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              )}
              
              <div>
                <p className="font-semibold uppercase tracking-wide text-[10px] mb-0.5 font-space">
                  {alert.level} — {alert.type}
                </p>
                <p className="text-slate-300 leading-relaxed text-[11px]">{alert.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
