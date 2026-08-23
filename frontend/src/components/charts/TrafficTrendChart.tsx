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
          <CartesianGrid stroke="var(--border-default)" strokeDasharray="3 3" opacity={0.5} />
          <XAxis dataKey="date" stroke="var(--border-strong)" tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} />
          <YAxis stroke="var(--border-strong)" tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="px-2.5 py-1.5 rounded-lg border shadow-md text-[10px] leading-normal font-geist"
                    style={{ backgroundColor: 'var(--text-primary)', borderColor: 'var(--text-primary)', color: '#FFFFFF' }}>
                    <p className="font-semibold mb-0.5">{item.date}</p>
                    <p>TOTAL VESSEL: <span className="font-bold">{item.vesselCount}</span></p>
                    <p>TANKERS: <span className="font-bold text-sky-400">{item.tankerCount}</span></p>
                    {item.isAnomaly && (
                      <p className="text-rose-400 font-semibold mt-1">Traffic Anomaly</p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend wrapperStyle={{ fontSize: '9px', color: 'var(--text-secondary)' }} />
          <Line
            name="Vessel Flow Count"
            type="monotone"
            dataKey="vesselCount"
            stroke="#60a5fa"
            strokeWidth={1.5}
            dot={false}
          />
          <Line
            name="Tanker Flow Count"
            type="monotone"
            dataKey="tankerCount"
            stroke="#fbbf24"
            strokeWidth={1.5}
            dot={false}
          />
          <Line
            name="Flow Anomaly Alert"
            type="linear"
            dataKey="anomalyVal"
            stroke="#f87171"
            strokeWidth={0}
            dot={{ r: 3, fill: '#f87171', stroke: '#ffffff', strokeWidth: 1 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
