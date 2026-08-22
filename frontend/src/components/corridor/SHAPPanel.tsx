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
      <div className="text-center py-6 select-none">
        <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest font-space">
          No Verified Observations
        </p>
        <p className="text-[10px] text-slate-400 mt-1 font-inter">
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
      <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
        <h4 className="text-[10px] font-extrabold tracking-widest text-blue-700 uppercase font-space">
          ML Feature Importance (SHAP)
        </h4>
        <span className="text-[9px] font-geist text-slate-400 uppercase font-bold">
          METHOD: {explainability.method}
        </span>
      </div>

      <div className="h-[240px] w-full font-geist text-[9px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 15, left: -25, bottom: 5 }}
          >
            <XAxis type="number" stroke="#cbd5e1" tick={{ fontSize: 9, fill: '#94a3b8' }} />
            <YAxis dataKey="feature" type="category" stroke="#cbd5e1" width={110} tick={{ fontSize: 9, fill: '#64748b' }} />
            <ReChartsTooltip
              cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-lg text-[10px] text-slate-700 font-geist">
                      <span className="font-extrabold text-slate-900 block mb-0.5">{item.feature}</span>
                      <span>Mean |SHAP|: </span>
                      <span className="font-black text-blue-700">{item.importance.toFixed(4)}</span>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="importance" radius={[0, 4, 4, 0]} barSize={10}>
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index % 2 === 0 ? '#2563eb' : '#f97316'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {isRedSea && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[10px] leading-relaxed text-amber-700 font-inter">
          <span className="font-extrabold uppercase block mb-0.5 font-space">⚠️ Bab el-Mandeb Proxy Mode</span>
          SHAP attributions for the Red Sea are calculated using the Bab el-Mandeb proxy traffic sensor due to current GDELT observations and PortWatch restrictions.
        </div>
      )}
    </div>
  );
}
