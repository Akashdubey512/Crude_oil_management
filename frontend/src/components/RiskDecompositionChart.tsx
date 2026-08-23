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
      <div className="flex items-center justify-center h-48 border border-slate-800/80 rounded-xl bg-[#0a1322] text-slate-400 text-xs font-inter">
        Decomposition data unavailable
      </div>
    );
  }

  // Convert object to Recharts array
  const data = [
    { name: 'Geopolitical', value: decomposition.geopolitical * 100, color: '#f87171' },
    { name: 'Maritime Traffic', value: decomposition.maritime * 100, color: '#60a5fa' },
    { name: 'Energy Market', value: decomposition.energy_market * 100, color: '#fbbf24' },
    { name: 'Infrastructure', value: decomposition.infrastructure * 100, color: '#38bdf8' },
    { name: 'Sanctions & Hist', value: decomposition.historical_pattern * 100, color: '#c084fc' },
  ];

  return (
    <div className="p-4 rounded-xl border border-slate-800/80 bg-[#0a1322] w-full h-full flex flex-col justify-between min-h-[210px] font-manrope">
      <span className="text-xs uppercase font-bold tracking-wide text-slate-400 mb-3 block font-space">Risk Vectors Decomposition (%)</span>
      
      <div className="h-40 w-full text-xs font-geist">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <XAxis type="number" domain={[0, 100]} stroke="#475569" tick={{ fontSize: 9, fill: '#94a3b8' }} />
            <YAxis dataKey="name" type="category" stroke="#475569" width={95} tick={{ fontSize: 9, fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{ background: '#0a1322', border: '1px solid #334155', borderRadius: '8px' }}
              labelStyle={{ color: '#f8fafc', fontWeight: '600' }}
              formatter={(val: any) => [`${parseFloat(val).toFixed(1)}%`, 'Contribution']}
            />
            <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={10}>
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
