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
    { name: 'Geopolitical (GPR)', value: decomposition.geopolitical, color: '#f87171' },
    { name: 'Maritime (Traffic)', value: decomposition.maritime, color: '#60a5fa' },
    { name: 'Energy Market (Oil)', value: decomposition.energy_market, color: '#fbbf24' },
    { name: 'Infrastructure', value: decomposition.infrastructure, color: '#c084fc' },
    { name: 'Historical Baseline', value: decomposition.historical_pattern, color: '#34d399' }
  ];

  return (
    <div className="space-y-2.5 font-manrope" style={{ color: 'var(--text-primary)' }}>
      <h4 className="text-[10px] font-bold tracking-wider uppercase font-space" style={{ color: 'var(--text-muted)' }}>
        5-Vector Risk Decomposition
      </h4>
      <div className="h-[170px] w-full font-geist text-[9px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 10, left: -25, bottom: 5 }}
          >
            <XAxis type="number" domain={[0, 1]} stroke="var(--border-default)" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
            <YAxis dataKey="name" type="category" stroke="var(--border-default)" width={110} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
            <ReChartsTooltip
              cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div
                      className="px-2.5 py-1.5 rounded-lg border shadow-md text-[10px] font-geist"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-default)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <span className="font-semibold uppercase block mb-0.5" style={{ color: 'var(--text-primary)' }}>{item.name}: </span>
                      <span className="font-bold" style={{ color: 'var(--info-blue)' }}>{(item.value * 100).toFixed(1)}%</span>
                    </div>
                  );
                }
                return null;
              }}
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
