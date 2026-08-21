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
      <div className="flex items-center justify-center h-48 border border-gray-800 rounded-xl bg-gray-950 text-gray-500 text-xs">
        Traffic observation history unavailable
      </div>
    );
  }

  // Reverse traffic to present chronologically (left to right)
  const data = [...traffic].reverse();

  return (
    <div className="p-4 rounded-xl border border-gray-800 bg-gray-950/50 w-full h-full flex flex-col justify-between min-h-[220px]">
      <span className="text-xs uppercase font-extrabold tracking-widest text-gray-400 mb-4 block">Daily Tanker Traffic History</span>

      <div className="h-44 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="tankerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="date" stroke="#4b5563" />
            <YAxis stroke="#4b5563" />
            <Tooltip
              contentStyle={{ background: '#0b0f19', border: '1px solid #1f2937', borderRadius: '6px' }}
              labelStyle={{ color: '#fff', fontWeight: 'bold' }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            <Area
              name="Tanker Transits"
              type="monotone"
              dataKey="tanker_count"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#tankerGrad)"
              strokeWidth={2}
            />
            <Area
              name="Total Vessels"
              type="monotone"
              dataKey="vessel_count"
              stroke="#6b7280"
              fill="transparent"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
