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
      <div className="h-full flex items-center justify-center text-xs text-gray-500 font-mono">
        NO RETROSPECTIVE OBSERVATIONS FOR SENSOR SCAN
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
    <div className="w-full h-full font-mono text-[9px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="prob-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" opacity={0.4} />
          <XAxis dataKey="date" stroke="#4b5563" />
          <YAxis stroke="#4b5563" domain={[0, 1]} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="glass-panel px-3 py-2 rounded-lg border border-gray-800 text-[10px] text-gray-300 leading-normal">
                    <p className="font-bold text-white mb-0.5">{item.date}</p>
                    <p>
                      RISK PROB: <span className="font-black text-cyan-400">{(item.probability * 100).toFixed(1)}%</span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          {/* Threshold references */}
          <ReferenceLine y={0.3} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'MODERATE', fill: '#f59e0b', position: 'insideRight', fontSize: 8 }} />
          <ReferenceLine y={0.6} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'HIGH THREAT', fill: '#ef4444', position: 'insideRight', fontSize: 8 }} />
          
          <Area
            type="monotone"
            dataKey="probability"
            stroke="#06b6d4"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#prob-gradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
