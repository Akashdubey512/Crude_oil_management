import {
  ResponsiveContainer,
  Bar,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ComposedChart
} from 'recharts';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import type { DrawdownScheduleResponse } from '../../types';

interface ReserveDrawdownChartProps {
  drawdownSchedule: DrawdownScheduleResponse | null;
}

export default function ReserveDrawdownChart({ drawdownSchedule }: ReserveDrawdownChartProps) {
  if (!drawdownSchedule || !drawdownSchedule.schedule || drawdownSchedule.schedule.length === 0) {
    return (
      <div className="p-4 rounded-xl border flex flex-col items-center justify-center text-center font-geist"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
      >
        <Info className="w-5 h-5 mb-2 text-slate-400" />
        <p className="text-xs font-semibold uppercase font-space" style={{ color: 'var(--text-primary)' }}>
          No Strategic Reserve Drawdown Required
        </p>
        <p className="text-[11px] mt-1 text-slate-400 font-inter max-w-sm">
          Simulated risk levels and supply flow parameters are within normal baseline operating margins.
        </p>
      </div>
    );
  }

  const chartData = drawdownSchedule.schedule.map((entry) => ({
    dayLabel: `Day ${entry.day}`,
    releaseMbpd: entry.recommended_release_mbpd,
    remainingSprDays: entry.remaining_spr_buffer_days,
    cumulativeMbpd: entry.cumulative_released_mbpd,
  }));

  return (
    <div
      className="p-4 rounded-xl border space-y-3 font-geist select-none"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
    >
      {/* Header Info */}
      <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <h4 className="text-xs font-bold uppercase font-space tracking-wider flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            Strategic Reserve (SPR) Drawdown Schedule
          </h4>
          <p className="text-[11px] text-slate-400 font-inter mt-0.5">
            Strategy: <span className="font-semibold text-emerald-400 uppercase">{drawdownSchedule.strategy}</span> | Supply Gap: <span className="font-bold text-amber-400">{drawdownSchedule.predicted_supply_gap_mbpd.toFixed(2)} MBPD</span> | Total Release: <span className="font-bold text-blue-400">{drawdownSchedule.total_recommended_release_mbpd.toFixed(2)} MBPD-days</span>
          </p>
        </div>

        {drawdownSchedule.buffer_exhausted && (
          <div className="px-2.5 py-1 rounded-lg border text-[10px] font-bold font-space flex items-center gap-1.5 bg-rose-950/40 border-rose-500/50 text-rose-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>SPR BUFFER EXHAUSTION WARN</span>
          </div>
        )}
      </div>

      {/* Warning banner if buffer exhausted */}
      {drawdownSchedule.warning_message && (
        <div className="p-2.5 rounded-lg border text-[11px] flex items-start gap-2 bg-rose-950/30 border-rose-500/40 text-rose-200 font-inter">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <span>{drawdownSchedule.warning_message}</span>
        </div>
      )}

      {/* Chart */}
      <div className="w-full h-48 text-[9px] font-geist pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="var(--border-default)" strokeDasharray="3 3" opacity={0.4} />
            <XAxis dataKey="dayLabel" stroke="var(--border-strong)" tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} />
            <YAxis yAxisId="left" stroke="var(--border-strong)" tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} stroke="var(--border-strong)" tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div
                      className="px-3 py-2 rounded-lg border shadow-lg text-[10px] font-geist space-y-1"
                      style={{ backgroundColor: 'var(--text-primary)', borderColor: 'var(--text-primary)', color: '#FFFFFF' }}
                    >
                      <p className="font-bold text-slate-200 border-b border-slate-700 pb-1 font-space">{item.dayLabel}</p>
                      <p>Recommended Release: <span className="font-bold text-emerald-400">{item.releaseMbpd.toFixed(2)} MBPD</span></p>
                      <p>Cumulative Release: <span className="font-bold text-blue-400">{item.cumulativeMbpd.toFixed(2)} MBPD</span></p>
                      <p>Remaining SPR Buffer: <span className="font-bold text-amber-300">{item.remainingSprDays.toFixed(1)} days</span></p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
            <Bar yAxisId="left" dataKey="releaseMbpd" name="Daily Release (MBPD)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
            <Line yAxisId="right" type="monotone" dataKey="remainingSprDays" name="Remaining SPR Buffer (Days)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Heuristic Note */}
      <p className="text-[10px] text-slate-400 font-inter italic pt-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        ℹ️ {drawdownSchedule.heuristic_note || 'Heuristic planning tool for scenario decision support; not a globally-optimal mathematical solution.'}
      </p>
    </div>
  );
}
