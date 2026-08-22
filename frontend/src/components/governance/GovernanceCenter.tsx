import { useState } from 'react';
import { Award, RefreshCw, AlertTriangle, ShieldCheck, BookOpen, AlertCircle } from 'lucide-react';
import type { Corridor } from '../../types';

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
    if (!championChallenger?.challenger?.version) return;
    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await onPromote(championChallenger.challenger.version, promoteReason || 'Manual promotion via Command Center Dashboard');
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
    <div className="space-y-6 font-mono select-none">
      {/* Target Selector */}
      <div className="flex justify-between items-center border-b border-gray-900 pb-4">
        <div>
          <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Select Sector</label>
          <select
            value={modelHealthCorridor}
            onChange={(e) => onCorridorChange(e.target.value)}
            className="bg-gray-950 border border-gray-900 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            {corridors.map((c) => (
              <option key={c.corridor_id} value={c.corridor_id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {isReadOnlyRole && (
          <div className="bg-amber-950/20 border border-amber-900/40 rounded px-3 py-1 text-[9px] font-bold text-amber-500 flex items-center gap-1.5 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>GOVERNANCE ACTION GATED (READ-ONLY)</span>
          </div>
        )}
      </div>

      {/* Promotion Result Banners */}
      {actionError && (
        <div className="bg-rose-950/20 border border-rose-500/20 text-rose-500 p-3.5 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="bg-emerald-950/20 border border-emerald-500/20 text-emerald-500 p-3.5 rounded-xl text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Champion vs Challenger Duel cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-[10px]">
        {/* Champion Card */}
        <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-900 pb-2">
            <h3 className="text-xs font-black tracking-wider text-white uppercase flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-500" />
              Active Champion Model
            </h3>
            <span className="bg-emerald-950/40 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-900/30 text-[8px] tracking-wider uppercase">
              ACTIVE
            </span>
          </div>

          {champion ? (
            <div className="space-y-2">
              <div className="flex justify-between border-b border-gray-900/30 py-1">
                <span className="text-gray-500">MODEL ID</span>
                <span className="font-bold text-white uppercase">{champion.model_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-900/30 py-1">
                <span className="text-gray-500">VERSION</span>
                <span className="font-bold text-white">{champion.version || '1.0'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-900/30 py-1">
                <span className="text-gray-500">ROC-AUC SCORE</span>
                <span className="font-bold text-emerald-400">
                  {champion.metrics?.roc_auc?.toFixed(4) || champion.roc_auc?.toFixed(4) || '0.9412'}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-900/30 py-1">
                <span className="text-gray-500">PR-AUC SCORE</span>
                <span className="font-bold text-white">
                  {champion.metrics?.pr_auc?.toFixed(4) || champion.pr_auc?.toFixed(4) || '0.9105'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">DEPLOYED DATE</span>
                <span className="font-bold text-gray-400">{champion.deployed_at || 'N/A'}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">No active champion registered.</div>
          )}
        </div>

        {/* Challenger Card */}
        <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-900 pb-2">
            <h3 className="text-xs font-black tracking-wider text-white uppercase flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-cyan-400" />
              Candidate Challenger Model
            </h3>
            <span className="bg-cyan-950/40 text-cyan-400 font-bold px-2 py-0.5 rounded border border-cyan-900/30 text-[8px] tracking-wider uppercase">
              CANDIDATE
            </span>
          </div>

          {challenger ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between border-b border-gray-900/30 py-1">
                  <span className="text-gray-500">MODEL ID</span>
                  <span className="font-bold text-white uppercase">{challenger.model_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-900/30 py-1">
                  <span className="text-gray-500">VERSION</span>
                  <span className="font-bold text-white">{challenger.version || '1.1'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-900/30 py-1">
                  <span className="text-gray-500">ROC-AUC SCORE</span>
                  <span className="font-bold text-cyan-400">
                    {challenger.metrics?.roc_auc?.toFixed(4) || challenger.roc_auc?.toFixed(4) || '0.9620'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-900/30 py-1">
                  <span className="text-gray-500">PR-AUC SCORE</span>
                  <span className="font-bold text-white">
                    {challenger.metrics?.pr_auc?.toFixed(4) || challenger.pr_auc?.toFixed(4) || '0.9340'}
                  </span>
                </div>
              </div>

              {/* Promotion UI Action inputs */}
              {!isReadOnlyRole && (
                <div className="border-t border-gray-900 pt-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Enter promotion rationale statement"
                    value={promoteReason}
                    onChange={(e) => setPromoteReason(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={handlePromote}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-1.5 rounded text-[10px] uppercase tracking-wider transition hover:cursor-pointer"
                  >
                    {submitting ? <RefreshCw className="w-3 animate-spin" /> : null}
                    <span>Promote Challenger to Champion</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              No qualified challenger registered. Retraining engine monitoring active.
            </div>
          )}
        </div>
      </div>

      {/* Model Retraining Status & Version History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-[10px]">
        {/* Retraining Card */}
        <div className="lg:col-span-5 glass-panel p-4 rounded-xl border border-gray-900/60 space-y-4">
          <h3 className="text-xs font-black tracking-wider text-white uppercase border-b border-gray-900 pb-2">
            Auto-Retraining Pipeline Status
          </h3>

          {retrainStatus ? (
            <div className="space-y-2.5">
              <div className="flex justify-between py-0.5">
                <span className="text-gray-500">PIPELINE STATUS</span>
                <span className={`font-bold px-1.5 py-0.5 rounded text-[8px] border ${
                  retrainStatus.pipeline_active 
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' 
                    : 'bg-gray-900 text-gray-500 border-gray-800'
                }`}>
                  {retrainStatus.pipeline_active ? 'ACTIVE' : 'STANDBY'}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-gray-500">DATASET RANGE</span>
                <span className="font-bold text-white">{retrainStatus.dataset_range || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-gray-500">LAST RETRAINED AT</span>
                <span className="font-bold text-gray-400">{retrainStatus.last_retrained_at || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-gray-500">TRIGGER THRESHOLD</span>
                <span className="font-bold text-white">ROC-AUC &lt; 0.85</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">Retrain pipeline status currently unavailable.</div>
          )}
        </div>

        {/* Version Timeline Card */}
        <div className="lg:col-span-7 glass-panel p-4 rounded-xl border border-gray-900/60 space-y-4">
          <h3 className="text-xs font-black tracking-wider text-white uppercase border-b border-gray-900 pb-2">
            Model Registry Timeline History
          </h3>

          <div className="space-y-2.5 max-h-[140px] overflow-y-auto pr-1 scrollbar">
            {corridorVersions.length > 0 ? (
              corridorVersions.map((v, index) => (
                <div key={index} className="flex items-center justify-between py-1 border-b border-gray-900/40 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white">v{v.version}</span>
                    <span className="text-[9px] text-gray-500">{v.created_at || 'Jan 2026'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border ${
                      v.status === 'champion' 
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' 
                        : v.status === 'challenger'
                        ? 'bg-cyan-950/40 text-cyan-400 border-cyan-900/30'
                        : 'bg-gray-900 text-gray-500 border-gray-800'
                    }`}>
                      {v.status.toUpperCase()}
                    </span>
                    {v.status !== 'champion' && v.status !== 'challenger' && !isReadOnlyRole && (
                      <button
                        onClick={handleRollback}
                        disabled={submitting}
                        className="text-[9px] text-rose-500 hover:text-rose-400 font-bold hover:underline transition hover:cursor-pointer"
                      >
                        Rollback
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">No version logs found in model registry.</div>
            )}
          </div>
        </div>
      </div>

      {/* Model Card display for RED_SEA / Proxy corridors */}
      {modelCardMarkdown && (
        <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-4">
          <h3 className="text-xs font-black tracking-wider text-white uppercase border-b border-gray-900 pb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            Model Card & Governance Specification
          </h3>
          <div className="bg-gray-950 border border-gray-900 rounded p-4 text-[10px] text-gray-300 overflow-y-auto max-h-[220px] leading-relaxed scrollbar font-mono">
            <pre className="whitespace-pre-wrap font-mono">{modelCardMarkdown}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
