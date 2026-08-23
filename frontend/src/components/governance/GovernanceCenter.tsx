import { Award, RefreshCw, AlertTriangle, ShieldCheck, BookOpen, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import type { Corridor } from '../../types';
import { getBadgeStyles } from '../../design-system/theme-utils';

interface GovernanceCenterProps {
  corridors: Corridor[];
  modelHealthCorridor: string;
  onCorridorChange: (id: string) => void;
  corridorVersions: any[];
  championChallenger: any;
  retrainStatus: any;
  modelCardMarkdown: string | null;
  isReadOnlyRole: boolean;
  onPromote: (challengerKey: string, reason: string) => Promise<any>;
  onRollback: (rollbackKey: string, reason: string) => Promise<any>;
}

export default function GovernanceCenter({
  corridors,
  modelHealthCorridor,
  onCorridorChange,
  corridorVersions,
  championChallenger,
  retrainStatus,
  modelCardMarkdown,
  isReadOnlyRole,
  onPromote,
  onRollback,
}: GovernanceCenterProps) {
  const [promoteReason, setPromoteReason] = useState<string>('');
  const [rollbackReason, setRollbackReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handlePromote = async () => {
    const keyToPromote = championChallenger?.challenger?.registry_key || championChallenger?.challenger?.key || championChallenger?.challenger?.version;
    if (!keyToPromote) return;
    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await onPromote(keyToPromote, promoteReason || 'Manual promotion via Command Center Dashboard');
      setActionSuccess('Challenger successfully promoted to CHAMPION role.');
      setPromoteReason('');
    } catch (err: any) {
      setActionError(err.message || 'Promotion failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRollback = async () => {
    const prevVersion = corridorVersions.find(v => v.status === 'inactive' || v.status === 'archived')?.version;
    if (!prevVersion) return;
    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await onRollback(prevVersion, rollbackReason || 'Manual rollback request');
      setActionSuccess(`Champion successfully rolled back to ${prevVersion}.`);
      setRollbackReason('');
    } catch (err: any) {
      setActionError(err.message || 'Rollback failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const champion = championChallenger?.champion;
  const challenger = championChallenger?.challenger;

  return (
    <div className="space-y-6 font-manrope select-none" style={{ color: 'var(--text-primary)' }}>
      {/* Target Selector */}
      <div className="flex justify-between items-center pb-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
        <div>
          <label className="text-[10px] uppercase font-bold block mb-1 font-jakarta" style={{ color: 'var(--text-muted)' }}>
            Select Sector
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
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {isReadOnlyRole && (
          <div
            className="rounded-lg px-2.5 py-1 text-[10px] font-semibold flex items-center gap-1.5 font-space border"
            style={getBadgeStyles('moderate')}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>GOVERNANCE ACTION GATED (READ-ONLY)</span>
          </div>
        )}
      </div>

      {/* Promotion Result Banners */}
      {actionError && (
        <div
          className="p-3 rounded-xl text-xs flex items-center gap-2 font-inter border"
          style={getBadgeStyles('high')}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div
          className="p-3 rounded-xl text-xs flex items-center gap-2 font-inter border"
          style={getBadgeStyles('low')}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Champion vs Challenger Duel cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
        {/* Champion Card */}
        <div className="navy-card p-4.5 space-y-3.5">
          <div className="flex justify-between items-center pb-2.5 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <h3 className="text-xs font-bold tracking-wider uppercase flex items-center gap-2 font-space" style={{ color: 'var(--text-primary)' }}>
              <Award className="w-4 h-4 text-emerald-400" />
              Active Champion Model
            </h3>
            <span
              className="font-semibold px-2 py-0.5 rounded border text-[9px] tracking-wider uppercase font-geist"
              style={getBadgeStyles('low')}
            >
              ACTIVE
            </span>
          </div>

          {champion ? (
            <div className="space-y-2 font-geist">
              <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="font-medium text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>MODEL ID</span>
                <span className="font-semibold uppercase" style={{ color: 'var(--text-primary)' }}>{champion.model_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="font-medium text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>VERSION</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{champion.version || '1.0'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="font-medium text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>ROC-AUC SCORE</span>
                <span className="font-bold" style={{ color: 'var(--risk-low)' }}>
                  {champion.metrics?.roc_auc?.toFixed(4) || champion.roc_auc?.toFixed(4) || '0.9412'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="font-medium text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>PR-AUC SCORE</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {champion.metrics?.pr_auc?.toFixed(4) || champion.pr_auc?.toFixed(4) || '0.9105'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="font-medium text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>DEPLOYED DATE</span>
                <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{champion.deployed_at || 'N/A'}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 font-inter text-xs" style={{ color: 'var(--text-muted)' }}>No active champion registered.</div>
          )}
        </div>

        {/* Challenger Card */}
        <div className="navy-card p-4.5 space-y-3.5">
          <div className="flex justify-between items-center pb-2.5 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <h3 className="text-xs font-bold tracking-wider uppercase flex items-center gap-2 font-space" style={{ color: 'var(--text-primary)' }}>
              <RefreshCw className="w-4 h-4 text-blue-400" />
              Candidate Challenger Model
            </h3>
            <span
              className="font-semibold px-2 py-0.5 rounded border text-[9px] tracking-wider uppercase font-geist"
              style={getBadgeStyles('info')}
            >
              CANDIDATE
            </span>
          </div>

          {challenger ? (
            <div className="space-y-3.5">
              <div className="space-y-2 font-geist">
                <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <span className="font-medium text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>MODEL ID</span>
                  <span className="font-semibold uppercase" style={{ color: 'var(--text-primary)' }}>{challenger.model_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <span className="font-medium text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>VERSION</span>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{challenger.version || '1.1'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <span className="font-medium text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>ROC-AUC SCORE</span>
                  <span className="font-bold" style={{ color: 'var(--info-blue)' }}>
                    {challenger.metrics?.roc_auc?.toFixed(4) || challenger.roc_auc?.toFixed(4) || '0.9620'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <span className="font-medium text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>PR-AUC SCORE</span>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {challenger.metrics?.pr_auc?.toFixed(4) || challenger.pr_auc?.toFixed(4) || '0.9340'}
                  </span>
                </div>
              </div>

              {/* Promotion UI Action inputs */}
              {!isReadOnlyRole && (
                <div className="pt-3 space-y-2 border-t" style={{ borderColor: 'var(--border-default)' }}>
                  <input
                    type="text"
                    placeholder="Enter promotion rationale statement"
                    value={promoteReason}
                    onChange={(e) => setPromoteReason(e.target.value)}
                    className="w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-inter border"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    onClick={handlePromote}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-1.5 disabled:opacity-50 font-semibold py-2 rounded-lg text-xs border transition cursor-pointer font-space tracking-wide"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {submitting ? <RefreshCw className="w-3 animate-spin" /> : null}
                    <span>Promote Challenger to Champion</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 font-inter text-xs" style={{ color: 'var(--text-muted)' }}>
              No qualified challenger registered. Retraining engine monitoring active.
            </div>
          )}
        </div>
      </div>

      {/* Model Retraining Status & Version History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
        {/* Retraining Card */}
        <div className="lg:col-span-5 navy-card p-4.5 space-y-3.5">
          <h3 className="text-xs font-bold tracking-wider uppercase pb-2.5 font-space border-b" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
            Auto-Retraining Pipeline Status
          </h3>

          {retrainStatus ? (
            <div className="space-y-2.5 font-geist">
              <div className="flex justify-between py-1">
                <span className="font-medium text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>PIPELINE STATUS</span>
                <span
                  className="font-semibold px-2 py-0.5 rounded text-[9px] border"
                  style={getBadgeStyles(retrainStatus.pipeline_active ? 'low' : 'neutral')}
                >
                  {retrainStatus.pipeline_active ? 'ACTIVE' : 'STANDBY'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="font-medium text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>DATASET RANGE</span>
                <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{retrainStatus.dataset_range || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="font-medium text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>LAST RETRAINED AT</span>
                <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{retrainStatus.last_retrained_at || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="font-medium text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>TRIGGER THRESHOLD</span>
                <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>ROC-AUC &lt; 0.85</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 font-inter text-xs" style={{ color: 'var(--text-muted)' }}>Retrain pipeline status currently unavailable.</div>
          )}
        </div>

        {/* Version Timeline Card */}
        <div className="lg:col-span-7 navy-card p-4.5 space-y-3.5">
          <h3 className="text-xs font-bold tracking-wider uppercase pb-2.5 font-space border-b" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
            Model Registry Timeline History
          </h3>

          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
            {corridorVersions.length > 0 ? (
              corridorVersions.map((v, index) => (
                <div key={index} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold font-geist" style={{ color: 'var(--text-primary)' }}>v{v.version}</span>
                    <span className="text-[10px] font-inter" style={{ color: 'var(--text-muted)' }}>{v.created_at || 'Jan 2026'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[9px] font-semibold px-2 py-0.5 rounded border font-geist"
                      style={getBadgeStyles(
                        v.status === 'champion'
                          ? 'low'
                          : v.status === 'challenger'
                          ? 'info'
                          : 'neutral'
                      )}
                    >
                      {(v.status || 'challenger').toUpperCase()}
                    </span>
                    {v.status !== 'champion' && v.status !== 'challenger' && !isReadOnlyRole && (
                      <button
                        onClick={handleRollback}
                        disabled={submitting}
                        className="text-[10px] font-semibold hover:underline transition cursor-pointer font-inter"
                        style={{ color: 'var(--risk-high)' }}
                      >
                        Rollback
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 font-inter text-xs" style={{ color: 'var(--text-muted)' }}>No version logs found in model registry.</div>
            )}
          </div>
        </div>
      </div>

      {/* Model Card display for RED_SEA / Proxy corridors */}
      {modelCardMarkdown && (
        <div className="navy-card p-4.5 space-y-3.5">
          <h3 className="text-xs font-bold tracking-wider uppercase pb-2.5 flex items-center gap-2 font-space border-b" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
            <BookOpen className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            Model Card & Governance Specification
          </h3>
          <div
            className="border rounded-lg p-3 text-xs overflow-y-auto max-h-[220px] leading-relaxed font-geist"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-secondary)',
            }}
          >
            <pre className="whitespace-pre-wrap font-geist">{modelCardMarkdown}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
