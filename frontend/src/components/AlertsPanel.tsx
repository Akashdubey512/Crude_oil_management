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
    <div className="p-4 rounded-xl border border-gray-800 bg-gray-950/50 flex flex-col gap-3 min-h-[160px]">
      <div className="flex justify-between items-center border-b border-gray-800 pb-2">
        <span className="text-xs uppercase font-extrabold tracking-widest text-gray-400">
          Platform Alerts Center
        </span>
        <span className="bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold text-gray-300">
          {activeAlerts.length} Active
        </span>
      </div>

      <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
        {activeAlerts.length === 0 ? (
          <div className="text-gray-500 text-center py-6 text-xs flex flex-col items-center gap-1.5">
            <RefreshCw className="w-5 h-5 opacity-40 animate-spin" />
            <span>All monitored chokepoints operating within normal bounds.</span>
          </div>
        ) : (
          activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border text-xs flex gap-3 items-start ${
                alert.level === 'CRITICAL'
                  ? 'border-red-500/20 bg-red-950/15 text-red-400'
                  : 'border-orange-500/20 bg-orange-950/15 text-orange-400'
              }`}
            >
              {alert.type === 'TRAFFIC_DROP' ? (
                <TrendingDown className="w-5 h-5 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0" />
              )}
              
              <div>
                <p className="font-bold uppercase tracking-wider text-[10px] mb-0.5">
                  {alert.level} — {alert.type}
                </p>
                <p className="text-gray-200 leading-relaxed">{alert.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
