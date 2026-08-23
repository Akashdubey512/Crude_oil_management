import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid
} from 'recharts';
import type { TrafficObservation } from '../types';

interface TrafficChartProps {
  traffic: TrafficObservation[];
}

export default function TrafficChart({ traffic }: TrafficChartProps) {
  if (!traffic || traffic.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 border border-slate-800/80 rounded-xl bg-[#0a1322] text-slate-400 text-xs font-inter">
        Traffic observation history unavailable
      </div>
    );
  }

  // Reverse traffic to present chronologically (left to right)
  const data = [...traffic].reverse();

  return (
    <div className="p-4 rounded-xl border border-slate-800/80 bg-[#0a1322] w-full h-full flex flex-col justify-between min-h-[210px] font-manrope">
      <span className="text-xs uppercase font-bold tracking-wide text-slate-400 mb-3 block font-space">Daily Tanker Traffic History</span>

      <div className="h-40 w-full text-xs font-geist">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="tankerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
            <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 9, fill: '#94a3b8' }} />
            <YAxis stroke="#475569" tick={{ fontSize: 9, fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{ background: '#0a1322', border: '1px solid #334155', borderRadius: '8px' }}
              labelStyle={{ color: '#f8fafc', fontWeight: '600' }}
            />
            <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: '9px', color: '#94a3b8' }} />
            <Area
              name="Tanker Transits"
              type="monotone"
              dataKey="tanker_count"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#tankerGrad)"
              strokeWidth={1.5}
            />
            <Area
              name="Total Vessels"
              type="monotone"
              dataKey="vessel_count"
              stroke="#64748b"
              fill="transparent"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
