import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine
} from 'recharts';
import type { RiskHistoryEntry } from '../../types';

interface RiskHistoryChartProps {
  data: RiskHistoryEntry[];
}

export default function RiskHistoryChart({ data }: RiskHistoryChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-slate-400 font-space uppercase tracking-wider">
        No Retrospective Observations For Sensor Scan
      </div>
    );
  }

  // Format historical entries for chart
  const formattedData = [...data]
    .reverse() // Chronological order
    .map((item) => ({
      date: item.date,
      probability: item.risk_probability,
    }));

  return (
    <div className="w-full h-full font-geist text-[9px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="prob-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" opacity={0.7} />
          <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 9, fill: '#94a3b8' }} />
          <YAxis stroke="#94a3b8" domain={[0, 1]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-lg text-[10px] text-slate-700 leading-normal font-geist">
                    <p className="font-extrabold text-slate-900 mb-0.5">{item.date}</p>
                    <p>
                      RISK PROB: <span className="font-black text-blue-700">{(item.probability * 100).toFixed(1)}%</span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          {/* Threshold references */}
          <ReferenceLine y={0.3} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'MODERATE', fill: '#b45309', position: 'insideRight', fontSize: 8 }} />
          <ReferenceLine y={0.6} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'HIGH THREAT', fill: '#dc2626', position: 'insideRight', fontSize: 8 }} />
          
          <Area
            type="monotone"
            dataKey="probability"
            stroke="#2563eb"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#prob-gradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
