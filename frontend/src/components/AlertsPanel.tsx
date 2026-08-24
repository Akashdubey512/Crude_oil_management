import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingDown, RefreshCw, Radio, BellRing, Sparkles } from 'lucide-react';
import type { RiskSnapshot } from '../types';

interface AlertsPanelProps {
  risks: RiskSnapshot[];
}

export interface LivePushAlert {
  id: string;
  corridor: string;
  type: string;
  message: string;
  level: 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
  timestamp: string;
  isLivePush?: boolean;
}

export default function AlertsPanel({ risks }: AlertsPanelProps) {
  const [liveAlerts, setLiveAlerts] = useState<LivePushAlert[]>([]);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [toastAlert, setToastAlert] = useState<LivePushAlert | null>(null);

  // WebSocket Live Push connection hook
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const configuredApiBase = import.meta.env.VITE_API_BASE_URL;
        const host = configuredApiBase
          ? configuredApiBase.replace(/\/+$/, '').replace(/^http/, 'ws')
          : `${protocol}//${window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? '127.0.0.1:8000' : window.location.host}`;
        const wsUrl = `${host}/ws/alerts`;

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'ALERT_TRIGGERED' && data.alert) {
              const raw = data.alert;
              const newAlert: LivePushAlert = {
                id: `live-${raw.id || Date.now()}`,
                corridor: raw.corridor_id || raw.corridor || 'UNKNOWN',
                type: raw.metric ? `${raw.metric.toUpperCase()}_THRESHOLD` : 'RISK_THRESHOLD',
                message: raw.message || `Risk threshold breached for ${raw.corridor_id}`,
                level: raw.severity === 'CRITICAL' ? 'CRITICAL' : raw.severity === 'HIGH' ? 'HIGH' : 'WARNING',
                timestamp: raw.triggered_at ? new Date(raw.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isLivePush: true,
              };

              setLiveAlerts((prev) => [newAlert, ...prev]);
              setToastAlert(newAlert);
              setTimeout(() => setToastAlert(null), 5000);
            }
          } catch (e) {
            // Ignore non-JSON or ping/pong messages
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimer = setTimeout(connectWebSocket, 5000);
        };

        ws.onerror = () => {
          setWsConnected(false);
          ws?.close();
        };
      } catch (err) {
        setWsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  // Build baseline active alerts strictly based on API risk outputs
  const computedAlerts: LivePushAlert[] = [];

  risks.forEach((snap) => {
    // 1. High risk alerts
    if (snap.risk_level === 'CRITICAL' || snap.risk_level === 'HIGH') {
      computedAlerts.push({
        id: `risk-${snap.corridor}`,
        corridor: snap.corridor,
        type: 'HIGH_RISK',
        message: `Corridor ${snap.corridor} has elevated disruption risk (${(snap.probability ? snap.probability * 100 : 0).toFixed(1)}%).`,
        level: snap.risk_level === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        timestamp: 'Live Model',
      });
    }

    // 2. Traffic anomalies
    if (snap.top_factors?.includes('anomaly_type_drop')) {
      computedAlerts.push({
        id: `traffic-${snap.corridor}`,
        corridor: snap.corridor,
        type: 'TRAFFIC_DROP',
        message: `Statistical traffic drop detected at ${snap.corridor} chokepoint.`,
        level: 'WARNING',
        timestamp: 'Sensor Stream',
      });
    }
  });

  const allAlerts = [...liveAlerts, ...computedAlerts];

  return (
    <div className="p-4 rounded-xl border border-slate-800/80 bg-[#0a1322] flex flex-col gap-3 min-h-[160px] font-geist select-none">
      {/* Header with WS Connection Indicator */}
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-300 font-space">
            Platform Alerts Center
          </span>
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
              wsConnected
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            <Radio className={`w-3 h-3 ${wsConnected ? 'animate-pulse text-emerald-400' : 'text-slate-500'}`} />
            <span>{wsConnected ? 'LIVE PUSH WS' : 'CONNECTING WS'}</span>
          </div>
        </div>

        <span className="bg-slate-800/60 border border-slate-700/60 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-300 font-mono">
          {allAlerts.length} Active
        </span>
      </div>

      {/* Live Push Toast Popup Banner */}
      {toastAlert && (
        <div className="p-2.5 rounded-lg border border-amber-500/60 bg-amber-950/40 text-amber-200 text-xs flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-[10px] uppercase font-space text-amber-300">
                REAL-TIME WEBSOCKET PUSH ALERT
              </p>
              <p className="text-[11px] font-inter text-slate-200">{toastAlert.message}</p>
            </div>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-900/60 border border-amber-600/40 text-amber-300">
            NEW
          </span>
        </div>
      )}

      {/* Alerts Scroll List */}
      <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 scrollbar">
        {allAlerts.length === 0 ? (
          <div className="text-slate-500 text-center py-6 text-xs flex flex-col items-center gap-1.5 font-inter">
            <RefreshCw className="w-4 h-4 opacity-40 animate-spin" />
            <span>All monitored chokepoints operating within normal bounds.</span>
          </div>
        ) : (
          allAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-2.5 rounded-lg border text-xs flex justify-between items-start font-inter ${
                alert.level === 'CRITICAL'
                  ? 'border-rose-800/40 bg-rose-950/20 text-rose-300'
                  : alert.level === 'HIGH'
                  ? 'border-amber-800/40 bg-amber-950/20 text-amber-300'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {alert.type === 'TRAFFIC_DROP' ? (
                  <TrendingDown className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                )}

                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold uppercase tracking-wide text-[10px] font-space">
                      {alert.level} — {alert.type}
                    </p>
                    {alert.isLivePush && (
                      <span className="px-1 py-0.2 rounded text-[8px] font-mono bg-blue-950 border border-blue-500/40 text-blue-300 flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5 text-blue-400" /> LIVE PUSH
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px] mt-0.5">{alert.message}</p>
                </div>
              </div>

              <span className="text-[9px] font-mono text-slate-500 shrink-0 ml-2">{alert.timestamp}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
