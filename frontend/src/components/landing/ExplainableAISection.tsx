import { useState, useEffect } from 'react';
import { Shield, ArrowRight } from 'lucide-react';
import type { Theme } from '../../api/hooks/useTheme';
import { api } from '../../api/client';
import type { ExplainabilityResponse } from '../../types';

interface ExplainableAISectionProps {
  theme: Theme;
  onEnterDashboard: (tab?: string) => void;
}

export default function ExplainableAISection({ theme, onEnterDashboard }: ExplainableAISectionProps) {
  const isDark = theme === 'dark';
  const [explainData, setExplainData] = useState<ExplainabilityResponse | null>(null);

  useEffect(() => {
    api.getExplainability('HORMUZ')
      .then(setExplainData)
      .catch(() => setExplainData(null));
  }, []);

  const rawFactors = explainData?.global_importance?.slice(0, 5);
  const factors = rawFactors && rawFactors.length > 0
    ? rawFactors.map((f) => ({ feature: f.feature, importance: f.mean_abs_shap ?? 0.1 }))
    : [
        { feature: 'gpr_daily', importance: 0.385 },
        { feature: 'tanker_decline_ratio_28d', importance: 0.245 },
        { feature: 'corridor_events_28d', importance: 0.165 },
        { feature: 'brent_volatility_28d', importance: 0.125 },
        { feature: 'anomaly_flag', importance: 0.080 },
      ];

  return (
    <section className="py-20 border-b font-manrope theme-transition"
      style={{
        backgroundColor: isDark ? '#08111C' : '#FFFFFF',
        borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Narrative */}
          <div className="lg:col-span-5 space-y-4">
            <div className="text-[10px] font-space font-bold uppercase tracking-[0.2em]"
              style={{ color: isDark ? '#5B8DEF' : '#356AE6' }}
            >
              EXPLAINABLE AI ARCHITECTURE
            </div>
            <h2 className="text-3xl sm:text-4xl font-black font-space tracking-tight"
              style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}
            >
              Every risk score <br /> has a reason.
            </h2>
            <p className="text-sm font-inter leading-relaxed"
              style={{ color: isDark ? '#94A3B8' : '#536274' }}
            >
              Transparent risk intelligence — not a black box. Our XGBoost & Random Forest ensemble models produce exact SHAP feature attributions for every prediction.
            </p>
            <div className="pt-2">
              <button
                onClick={() => onEnterDashboard('MODELS')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-space font-semibold text-xs text-white cursor-pointer"
                style={{ backgroundColor: isDark ? '#5B8DEF' : '#356AE6' }}
              >
                <span>Inspect Full SHAP Diagnostics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Column: SHAP Feature Importance Card */}
          <div className="lg:col-span-7">
            <div className="p-6 rounded-2xl border space-y-5 theme-transition"
              style={{
                backgroundColor: isDark ? '#0D1624' : '#F5F7FA',
                borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
              }}
            >
              <div className="flex justify-between items-center border-b pb-3"
                style={{ borderColor: isDark ? '#1C2A3A' : '#D9E0E8' }}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span className="font-space font-bold text-xs uppercase" style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}>
                    STRAIT OF HORMUZ — SHAP FEATURE ATTRIBUTION
                  </span>
                </div>
                <span className="text-[10px] font-geist font-bold px-2 py-0.5 rounded uppercase bg-rose-950/60 text-rose-300 border border-rose-800">
                  HIGH THREAT (0.72)
                </span>
              </div>

              {/* Feature Bars */}
              <div className="space-y-3.5 font-geist text-xs">
                {factors.map((item, idx) => {
                  const pct = Math.min(100, Math.round(item.importance * 100 * 2.2));
                  const label = item.feature
                    .replace(/_/g, ' ')
                    .toUpperCase();
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-semibold" style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}>
                          {label}
                        </span>
                        <span style={{ color: isDark ? '#5B8DEF' : '#356AE6' }}>
                          {(item.importance * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full overflow-hidden"
                        style={{ backgroundColor: isDark ? '#08111C' : '#D9E0E8' }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: idx === 0 ? '#5B8DEF' : idx === 1 ? '#6EA8FF' : '#94A3B8',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-[10px] font-geist text-slate-400 border-t pt-3 flex justify-between"
                style={{ borderColor: isDark ? '#1C2A3A' : '#D9E0E8' }}
              >
                <span>Model Engine: XGBoost v1.0 Champion</span>
                <span>Explainability Method: SHAP TreeExplainer</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
