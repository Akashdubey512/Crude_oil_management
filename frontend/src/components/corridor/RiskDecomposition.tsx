import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip as ReChartsTooltip
} from 'recharts';
import type { RiskDecomposition as RiskDecompType } from '../../types';

interface RiskDecompositionProps {
  decomposition: RiskDecompType;
}

export default function RiskDecomposition({ decomposition }: RiskDecompositionProps) {
  const data = [
    { name: 'Geopolitical (GPR)', value: decomposition.geopolitical, color: '#dc2626' },
    { name: 'Maritime (Traffic)', value: decomposition.maritime, color: '#2563eb' },
    { name: 'Energy Market (Oil)', value: decomposition.energy_market, color: '#f97316' },
    { name: 'Infrastructure', value: decomposition.infrastructure, color: '#7c3aed' },
    { name: 'Historical Baseline', value: decomposition.historical_pattern, color: '#059669' }
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-extrabold tracking-widest text-blue-700 uppercase font-space">
        5-Vector Risk Decomposition
      </h4>
      <div className="h-[180px] w-full font-geist text-[9px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 10, left: -25, bottom: 5 }}
          >
            <XAxis type="number" domain={[0, 1]} stroke="#cbd5e1" tick={{ fontSize: 9, fill: '#94a3b8' }} />
            <YAxis dataKey="name" type="category" stroke="#cbd5e1" width={110} tick={{ fontSize: 9, fill: '#64748b' }} />
            <ReChartsTooltip
              cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-lg text-[10px] text-slate-700 font-geist">
                      <span className="font-extrabold text-slate-900 uppercase block mb-0.5">{item.name}: </span>
                      <span className="font-black text-blue-700">{(item.value * 100).toFixed(1)}%</span>
                    </div>
                  );
                }
                return null;
              }}
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
