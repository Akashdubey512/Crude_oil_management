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
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border-default)" strokeDasharray="3 3" opacity={0.5} />
          <XAxis dataKey="date" stroke="var(--border-strong)" tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} />
          <YAxis stroke="var(--border-strong)" domain={[0, 1]} tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="px-2.5 py-1.5 rounded-lg border shadow-md text-[10px] leading-normal font-geist"
                    style={{ backgroundColor: 'var(--text-primary)', borderColor: 'var(--text-primary)', color: '#FFFFFF' }}>
                    <p className="font-semibold mb-0.5">{item.date}</p>
                    <p>
                      RISK PROB: <span className="font-bold text-sky-400">{(item.probability * 100).toFixed(1)}%</span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          {/* Threshold references */}
          <ReferenceLine y={0.3} stroke="#d97706" strokeDasharray="3 3" opacity={0.6} label={{ value: 'MODERATE', fill: '#fcd34d', position: 'insideRight', fontSize: 8 }} />
          <ReferenceLine y={0.6} stroke="#ef4444" strokeDasharray="3 3" opacity={0.6} label={{ value: 'HIGH THREAT', fill: '#fca5a5', position: 'insideRight', fontSize: 8 }} />
          
          <Area
            type="monotone"
            dataKey="probability"
            stroke="#3b82f6"
            strokeWidth={1.5}
            fillOpacity={1}
            fill="url(#prob-gradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
