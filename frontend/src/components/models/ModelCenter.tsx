import { Activity, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { Corridor } from '../../types';
import { getBadgeStyles } from '../../design-system/theme-utils';

interface ModelCenterProps {
  corridors: Corridor[];
  modelHealthCorridor: string;
  onCorridorChange: (id: string) => void;
  modelHealth: any;
  modelEval: any;
  modelDrift: any;
}

export default function ModelCenter({
  corridors,
  modelHealthCorridor,
  onCorridorChange,
  modelHealth,
  modelEval,
  modelDrift
}: ModelCenterProps) {
  const isRedSea = modelHealthCorridor === 'RED_SEA';

  return (
    <div className="space-y-6 font-manrope select-none" style={{ color: 'var(--text-primary)' }}>
      {/* Target Corridor Selector */}
      <div className="flex justify-between items-center pb-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
        <div>
          <label className="text-[10px] uppercase font-bold block mb-1 font-jakarta" style={{ color: 'var(--text-muted)' }}>
            Target Sector
          </label>
          <select
            value={modelHealthCorridor}
            onChange={(e) => onCorridorChange(e.target.value)}
            className="rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none cursor-pointer font-geist border"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)',
            }}
          >
            {corridors.map((c) => (
              <option key={c.corridor_id} value={c.corridor_id}>
                {c.name} {c.corridor_id === 'RED_SEA' ? '(PROXY)' : ''}
              </option>
            ))}
          </select>
        </div>

        {modelHealth?.status && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-default)',
            }}
          >
            <span className="text-[10px] font-bold uppercase font-jakarta" style={{ color: 'var(--text-muted)' }}>
              MODEL HEALTH:
            </span>
            <span
              className="text-xs font-semibold uppercase font-geist px-1.5 py-0.5 rounded border"
              style={getBadgeStyles(modelHealth.status === 'GOOD' ? 'low' : 'high')}
            >
              {modelHealth.status}
            </span>
          </div>
        )}
      </div>

      {isRedSea && (
        <div
          className="rounded-xl p-3.5 text-xs flex items-start gap-2.5 font-inter border"
          style={getBadgeStyles('moderate')}
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold uppercase block mb-0.5 font-space">Bab el-Mandeb Proxy Sensor Active</span>
            Red Sea threat scores are currently proxied via Bab-el-Mandeb AIS observations due to GDELT regional tracking boundaries.
          </div>
        </div>
      )}

      {/* Main Grid: Evaluation vs Drift */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
        
        {/* Out-of-Sample Performance Evaluation Card */}
        <div className="navy-card p-4.5 space-y-3.5">
          <div className="flex justify-between items-center pb-2.5 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <h3 className="text-xs font-bold tracking-wider uppercase flex items-center gap-2 font-space" style={{ color: 'var(--text-primary)' }}>
              <ShieldCheck className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              Out-of-Sample Model Metrics
            </h3>
            <span className="text-[9px] font-geist uppercase font-medium" style={{ color: 'var(--text-muted)' }}>
              OOS VALIDATED
            </span>
          </div>

          {modelEval?.metrics ? (
            <div className="grid grid-cols-2 gap-3 font-geist">
              <div
                className="p-3 rounded-lg border"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <span className="block text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>ROC-AUC SCORE</span>
                <span className="text-xl font-bold mt-1 block font-space" style={{ color: 'var(--risk-low)' }}>
                  {modelEval.metrics.roc_auc !== null ? modelEval.metrics.roc_auc.toFixed(4) : 'N/A'}
                </span>
              </div>
              <div
                className="p-3 rounded-lg border"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <span className="block text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>PR-AUC SCORE</span>
                <span className="text-xl font-bold mt-1 block font-space" style={{ color: 'var(--text-primary)' }}>
                  {modelEval.metrics.pr_auc !== null ? modelEval.metrics.pr_auc.toFixed(4) : 'N/A'}
                </span>
              </div>
              <div
                className="p-3 rounded-lg border"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <span className="block text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>F1 SCORE</span>
                <span className="text-base font-bold mt-1 block font-space" style={{ color: 'var(--text-primary)' }}>
                  {modelEval.metrics.f1 !== null ? modelEval.metrics.f1.toFixed(4) : 'N/A'}
                </span>
              </div>
              <div
                className="p-3 rounded-lg border"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <span className="block text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>BRIER SCORE</span>
                <span className="text-base font-bold mt-1 block font-space" style={{ color: 'var(--info-blue)' }}>
                  {modelEval.metrics.brier_score !== null ? modelEval.metrics.brier_score.toFixed(4) : 'N/A'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 font-inter" style={{ color: 'var(--text-muted)' }}>Loading model evaluation metrics...</div>
          )}
        </div>

        {/* Feature Drift Analysis Card */}
        <div className="navy-card p-4.5 space-y-3.5">
          <div className="flex justify-between items-center pb-2.5 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <h3 className="text-xs font-bold tracking-wider uppercase flex items-center gap-2 font-space" style={{ color: 'var(--text-primary)' }}>
              <Activity className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              Feature Population Drift (PSI)
            </h3>
            <span className="text-[9px] font-geist uppercase font-medium" style={{ color: 'var(--text-muted)' }}>
              KS &amp; PSI SCANS
            </span>
          </div>

          {modelDrift?.features ? (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 font-geist">
              {modelDrift.features.slice(0, 5).map((f: any, idx: number) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border flex justify-between items-center"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div>
                    <span className="font-semibold uppercase text-xs block" style={{ color: 'var(--text-primary)' }}>{f.feature}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Method: {f.drift_method}</span>
                  </div>
                  <div className="text-right">
                    <span
                      className="text-[9px] font-semibold px-2 py-0.5 rounded border uppercase"
                      style={getBadgeStyles(f.severity === 'LOW' ? 'low' : 'moderate')}
                    >
                      {f.severity} ({f.drift_score.toFixed(3)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 font-inter" style={{ color: 'var(--text-muted)' }}>Loading feature drift metrics...</div>
          )}
        </div>

      </div>
    </div>
  );
}
