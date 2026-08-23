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
import { getBadgeStyles } from '../../design-system/theme-utils';

interface SHAPPanelProps {
  explainability: ExplainabilityResponse | null;
  corridorId: string;
}

export default function SHAPPanel({ explainability, corridorId }: SHAPPanelProps) {
  const isRedSea = corridorId === 'RED_SEA';

  if (!explainability || !explainability.global_importance || explainability.global_importance.length === 0) {
    return (
      <div className="text-center py-6 select-none font-manrope">
        <p className="text-xs font-extrabold uppercase tracking-widest font-space" style={{ color: 'var(--text-muted)' }}>
          No Verified Observations
        </p>
        <p className="text-[10px] mt-1 font-inter" style={{ color: 'var(--text-muted)' }}>
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
    <div className="space-y-3 font-manrope" style={{ color: 'var(--text-primary)' }}>
      <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor: 'var(--border-default)' }}>
        <h4 className="text-[10px] font-bold tracking-wider uppercase font-space" style={{ color: 'var(--text-muted)' }}>
          ML Feature Importance (SHAP)
        </h4>
        <span className="text-[9px] font-geist uppercase font-medium" style={{ color: 'var(--text-muted)' }}>
          METHOD: {explainability.method}
        </span>
      </div>

      <div className="h-[230px] w-full font-geist text-[9px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 15, left: -25, bottom: 5 }}
          >
            <XAxis type="number" stroke="var(--border-default)" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
            <YAxis dataKey="feature" type="category" stroke="var(--border-default)" width={110} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
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
                      <span className="font-semibold block mb-0.5" style={{ color: 'var(--text-primary)' }}>{item.feature}</span>
                      <span style={{ color: 'var(--text-muted)' }}>Mean |SHAP|: </span>
                      <span className="font-bold" style={{ color: 'var(--info-blue)' }}>{item.importance.toFixed(4)}</span>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="importance" radius={[0, 3, 3, 0]} barSize={9}>
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index % 2 === 0 ? 'var(--info-blue)' : 'var(--text-muted)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {isRedSea && (
        <div
          className="rounded-lg p-2.5 text-[10px] leading-relaxed font-inter border"
          style={getBadgeStyles('moderate')}
        >
          <span className="font-semibold uppercase block mb-0.5 font-space">Bab el-Mandeb Proxy Mode</span>
          SHAP attributions for the Red Sea are calculated using the Bab el-Mandeb proxy traffic sensor due to current GDELT observations.
        </div>
      )}
    </div>
  );
}
