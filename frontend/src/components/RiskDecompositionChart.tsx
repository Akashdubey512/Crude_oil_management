import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import type { RiskDecomposition } from '../types';

interface RiskDecompositionChartProps {
  decomposition: RiskDecomposition | null;
}

export default function RiskDecompositionChart({ decomposition }: RiskDecompositionChartProps) {
  if (!decomposition) {
    return (
      <div className="flex items-center justify-center h-48 border border-gray-800 rounded-xl bg-gray-950 text-gray-500 text-xs">
        Decomposition data unavailable
      </div>
    );
  }

  // Convert object to Recharts array
  const data = [
    { name: 'Geopolitical', value: decomposition.geopolitical * 100, color: '#ef4444' }, // red
    { name: 'Maritime Traffic', value: decomposition.maritime * 100, color: '#3b82f6' }, // blue
    { name: 'Energy Market', value: decomposition.energy_market * 100, color: '#f59e0b' }, // amber
    { name: 'Infrastructure', value: decomposition.infrastructure * 100, color: '#06b6d4' }, // cyan
    { name: 'Sanctions & Hist', value: decomposition.historical_pattern * 100, color: '#a855f7' }, // purple
  ];

  return (
    <div className="p-4 rounded-xl border border-gray-800 bg-gray-950/50 w-full h-full flex flex-col justify-between min-h-[220px]">
      <span className="text-xs uppercase font-extrabold tracking-widest text-gray-400 mb-4 block">Risk Vectors Decomposition (%)</span>
      
      <div className="h-44 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <XAxis type="number" domain={[0, 100]} stroke="#4b5563" />
            <YAxis dataKey="name" type="category" stroke="#4b5563" width={95} />
            <Tooltip
              contentStyle={{ background: '#0b0f19', border: '1px solid #1f2937', borderRadius: '6px' }}
              labelStyle={{ color: '#fff', fontWeight: 'bold' }}
              formatter={(val: any) => [`${parseFloat(val).toFixed(1)}%`, 'Contribution']}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
