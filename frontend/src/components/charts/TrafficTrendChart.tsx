import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import type { TrafficObservation } from '../../types';

interface TrafficTrendChartProps {
  data: TrafficObservation[];
}

export default function TrafficTrendChart({ data }: TrafficTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-gray-500 font-mono">
        NO ROUTE OBSERVATIONS RECORDED FOR SENSOR SEGMENT
      </div>
    );
  }

  // Format observations
  const formattedData = [...data]
    .reverse() // Chronological
    .map((item) => ({
      date: item.date,
      vesselCount: item.vessel_count,
      tankerCount: item.tanker_count,
      isAnomaly: item.anomaly_flag,
      anomalyVal: item.anomaly_flag ? item.vessel_count : null,
    }));

  return (
    <div className="w-full h-full font-mono text-[9px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" opacity={0.4} />
          <XAxis dataKey="date" stroke="#4b5563" />
          <YAxis stroke="#4b5563" />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="glass-panel px-3 py-2 rounded-lg border border-gray-800 text-[10px] text-gray-300 leading-normal">
                    <p className="font-bold text-white mb-0.5">{item.date}</p>
                    <p>TOTAL VESSEL: <span className="font-bold text-white">{item.vesselCount}</span></p>
                    <p>TANKERS: <span className="font-bold text-cyan-400">{item.tankerCount}</span></p>
                    {item.isAnomaly && (
                      <p className="text-rose-500 font-bold mt-1">⚠️ TRAFFIC ANOMALY DETECTED</p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend wrapperStyle={{ fontSize: '8px', color: '#9ca3af' }} />
          <Line
            name="Vessel Flow Count"
            type="monotone"
            dataKey="vesselCount"
            stroke="#3b82f6"
            strokeWidth={1.8}
            dot={false}
          />
          <Line
            name="Tanker Flow Count"
            type="monotone"
            dataKey="tankerCount"
            stroke="#06b6d4"
            strokeWidth={1.8}
            dot={false}
          />
          <Line
            name="Flow Anomaly Alert"
            type="linear"
            dataKey="anomalyVal"
            stroke="#ef4444"
            strokeWidth={0}
            dot={{ r: 4, fill: '#ef4444', stroke: '#ffffff', strokeWidth: 1 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
