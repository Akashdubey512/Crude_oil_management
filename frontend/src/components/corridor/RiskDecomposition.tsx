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
    { name: 'Geopolitical (GPR)', value: decomposition.geopolitical, color: '#ef4444' },
    { name: 'Maritime (Traffic)', value: decomposition.maritime, color: '#06b6d4' },
    { name: 'Energy Market (Oil)', value: decomposition.energy_market, color: '#f59e0b' },
    { name: 'Infrastructure', value: decomposition.infrastructure, color: '#a855f7' },
    { name: 'Historical Baseline', value: decomposition.historical_pattern, color: '#10b981' }
  ];

  return (
    <div className="space-y-4">
      <h4 className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
        5-Vector Risk Decomposition
      </h4>
      <div className="h-[180px] w-full font-mono text-[9px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 10, left: -25, bottom: 5 }}
          >
            <XAxis type="number" domain={[0, 1]} stroke="#4b5563" />
            <YAxis dataKey="name" type="category" stroke="#9ca3af" width={110} />
            <ReChartsTooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="glass-panel px-2.5 py-1.5 rounded border border-gray-800 text-[10px] text-gray-300">
                      <span className="font-bold text-white uppercase">{item.name}: </span>
                      <span className="font-black">{(item.value * 100).toFixed(1)}%</span>
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
