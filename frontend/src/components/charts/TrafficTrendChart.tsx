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
      <div className="h-full flex items-center justify-center text-xs text-slate-400 font-space uppercase tracking-wider">
        No Route Observations Recorded For Sensor Segment
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
    <div className="w-full h-full font-geist text-[9px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" opacity={0.7} />
          <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 9, fill: '#94a3b8' }} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 9, fill: '#94a3b8' }} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-lg text-[10px] text-slate-700 leading-normal font-geist">
                    <p className="font-extrabold text-slate-900 mb-0.5">{item.date}</p>
                    <p>TOTAL VESSEL: <span className="font-bold text-slate-900">{item.vesselCount}</span></p>
                    <p>TANKERS: <span className="font-bold text-blue-700">{item.tankerCount}</span></p>
                    {item.isAnomaly && (
                      <p className="text-rose-600 font-bold mt-1">⚠️ TRAFFIC ANOMALY DETECTED</p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend wrapperStyle={{ fontSize: '9px', color: '#64748b' }} />
          <Line
            name="Vessel Flow Count"
            type="monotone"
            dataKey="vesselCount"
            stroke="#1d4ed8"
            strokeWidth={2}
            dot={false}
          />
          <Line
            name="Tanker Flow Count"
            type="monotone"
            dataKey="tankerCount"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
          />
          <Line
            name="Flow Anomaly Alert"
            type="linear"
            dataKey="anomalyVal"
            stroke="#ef4444"
            strokeWidth={0}
            dot={{ r: 4, fill: '#ef4444', stroke: '#ffffff', strokeWidth: 1.5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
