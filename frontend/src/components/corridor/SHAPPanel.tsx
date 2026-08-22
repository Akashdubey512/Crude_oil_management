import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip as ReChartsTooltip
} from 'recharts';
import type { ExplainabilityResponse } from '../../types';

interface SHAPPanelProps {
  explainability: ExplainabilityResponse | null;
  corridorId: string;
}

export default function SHAPPanel({ explainability, corridorId }: SHAPPanelProps) {
  const isRedSea = corridorId === 'RED_SEA';

  if (!explainability || !explainability.global_importance || explainability.global_importance.length === 0) {
    return (
      <div className="glass-panel p-4 rounded-xl border border-gray-900/60 text-center select-none py-6">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          No Verified Observations
        </p>
        <p className="text-[10px] text-gray-600 mt-1">
          SHAP explainability vector is not indexed for this corridor.
        </p>
      </div>
    );
  }

  // Format features for display
  const chartData = explainability.global_importance
    .slice(0, 8) // Limit to top 8 features for clean density
    .map((item) => ({
      feature: item.feature
        .replace('_rolling_7d', ' (7d Avg)')
        .replace('_rolling_28d', ' (28d Avg)')
        .replace('gpr_', 'Geopolitical ')
        .replace('brent_price', 'Brent Oil Price')
        .replace('vessel_count', 'AIS Vessel Count')
        .replace('_delta', ' Delta')
        .toUpperCase(),
      importance: item.mean_abs_shap,
    }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-gray-900 pb-2">
        <h4 className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
          ML Feature Importance (SHAP)
        </h4>
        <span className="text-[9px] font-mono text-gray-500 uppercase">
          METHOD: {explainability.method}
        </span>
      </div>

      <div className="h-[240px] w-full font-mono text-[9px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 15, left: -25, bottom: 5 }}
          >
            <XAxis type="number" stroke="#4b5563" />
            <YAxis dataKey="feature" type="category" stroke="#9ca3af" width={110} />
            <ReChartsTooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="glass-panel px-2.5 py-1.5 rounded border border-gray-800 text-[10px] text-gray-300">
                      <span className="font-bold text-white block mb-0.5">{item.feature}</span>
                      <span>Mean |SHAP|: </span>
                      <span className="font-black text-cyan-400">{item.importance.toFixed(4)}</span>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="importance" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={10}>
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index % 2 === 0 ? 'var(--accent-cyan)' : 'var(--accent-blue)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {isRedSea && (
        <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-2.5 text-[9px] leading-relaxed text-amber-500 font-mono">
          <span className="font-extrabold uppercase block mb-0.5">⚠️ Bab el-Mandeb Proxy Mode</span>
          SHAP attributions for the Red Sea are calculated using the Bab el-Mandeb proxy traffic sensor due to current GDELT observations and PortWatch restrictions.
        </div>
      )}
    </div>
  );
}
