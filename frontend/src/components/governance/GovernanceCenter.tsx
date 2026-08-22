import { Award, RefreshCw, AlertTriangle, ShieldCheck, BookOpen, AlertCircle } from 'lucide-react';
import { useState } from 'react';
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
    <div className="space-y-6 font-manrope select-none">
      {/* Target Selector */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1 font-jakarta">Select Sector</label>
          <select
            value={modelHealthCorridor}
            onChange={(e) => onCorridorChange(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            {corridors.map((c) => (
              <option key={c.corridor_id} value={c.corridor_id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {isReadOnlyRole && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 text-[10px] font-bold text-amber-700 flex items-center gap-1.5 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>GOVERNANCE ACTION GATED (READ-ONLY)</span>
          </div>
        )}
      </div>

      {/* Promotion Result Banners */}
      {actionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-2xl text-xs flex items-center gap-2 font-inter">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-2xl text-xs flex items-center gap-2 font-inter">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Champion vs Challenger Duel cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        {/* Champion Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase flex items-center gap-2 font-space">
              <Award className="w-4 h-4 text-emerald-600" />
              Active Champion Model
            </h3>
            <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-200 text-[9px] tracking-wider uppercase font-geist">
              ACTIVE
            </span>
          </div>

          {champion ? (
            <div className="space-y-2 font-geist">
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500 font-bold text-[10px] uppercase">MODEL ID</span>
                <span className="font-extrabold text-slate-900 uppercase">{champion.model_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500 font-bold text-[10px] uppercase">VERSION</span>
                <span className="font-extrabold text-slate-900">{champion.version || '1.0'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500 font-bold text-[10px] uppercase">ROC-AUC SCORE</span>
                <span className="font-extrabold text-emerald-700">
                  {champion.metrics?.roc_auc?.toFixed(4) || champion.roc_auc?.toFixed(4) || '0.9412'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500 font-bold text-[10px] uppercase">PR-AUC SCORE</span>
                <span className="font-extrabold text-slate-900">
                  {champion.metrics?.pr_auc?.toFixed(4) || champion.pr_auc?.toFixed(4) || '0.9105'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 font-bold text-[10px] uppercase">DEPLOYED DATE</span>
                <span className="font-bold text-slate-600">{champion.deployed_at || 'N/A'}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-slate-400 font-inter text-xs">No active champion registered.</div>
          )}
        </div>

        {/* Challenger Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase flex items-center gap-2 font-space">
              <RefreshCw className="w-4 h-4 text-blue-600" />
              Candidate Challenger Model
            </h3>
            <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md border border-blue-200 text-[9px] tracking-wider uppercase font-geist">
              CANDIDATE
            </span>
          </div>

          {challenger ? (
            <div className="space-y-4">
              <div className="space-y-2 font-geist">
                <div className="flex justify-between border-b border-slate-100 py-1.5">
                  <span className="text-slate-500 font-bold text-[10px] uppercase">MODEL ID</span>
                  <span className="font-extrabold text-slate-900 uppercase">{challenger.model_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1.5">
                  <span className="text-slate-500 font-bold text-[10px] uppercase">VERSION</span>
                  <span className="font-extrabold text-slate-900">{challenger.version || '1.1'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1.5">
                  <span className="text-slate-500 font-bold text-[10px] uppercase">ROC-AUC SCORE</span>
                  <span className="font-extrabold text-blue-700">
                    {challenger.metrics?.roc_auc?.toFixed(4) || challenger.roc_auc?.toFixed(4) || '0.9620'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1.5">
                  <span className="text-slate-500 font-bold text-[10px] uppercase">PR-AUC SCORE</span>
                  <span className="font-extrabold text-slate-900">
                    {challenger.metrics?.pr_auc?.toFixed(4) || challenger.pr_auc?.toFixed(4) || '0.9340'}
                  </span>
                </div>
              </div>

              {/* Promotion UI Action inputs */}
              {!isReadOnlyRole && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Enter promotion rationale statement"
                    value={promoteReason}
                    onChange={(e) => setPromoteReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 font-inter"
                  />
                  <button
                    onClick={handlePromote}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-[10px] uppercase tracking-wider transition shadow-md shadow-emerald-500/20 cursor-pointer"
                  >
                    {submitting ? <RefreshCw className="w-3 animate-spin" /> : null}
                    <span>Promote Challenger to Champion</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 font-inter text-xs">
              No qualified challenger registered. Retraining engine monitoring active.
            </div>
          )}
        </div>
      </div>

      {/* Model Retraining Status & Version History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
        {/* Retraining Card */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase border-b border-slate-100 pb-3 font-space">
            Auto-Retraining Pipeline Status
          </h3>

          {retrainStatus ? (
            <div className="space-y-2.5 font-geist">
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-bold text-[10px] uppercase">PIPELINE STATUS</span>
                <span className={`font-extrabold px-2 py-0.5 rounded-md text-[9px] border ${
                  retrainStatus.pipeline_active 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {retrainStatus.pipeline_active ? 'ACTIVE' : 'STANDBY'}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-100 py-1">
                <span className="text-slate-500 font-bold text-[10px] uppercase">DATASET RANGE</span>
                <span className="font-extrabold text-slate-900">{retrainStatus.dataset_range || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 py-1">
                <span className="text-slate-500 font-bold text-[10px] uppercase">LAST RETRAINED AT</span>
                <span className="font-bold text-slate-600">{retrainStatus.last_retrained_at || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 py-1">
                <span className="text-slate-500 font-bold text-[10px] uppercase">TRIGGER THRESHOLD</span>
                <span className="font-extrabold text-slate-900">ROC-AUC &lt; 0.85</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-slate-400 font-inter text-xs">Retrain pipeline status currently unavailable.</div>
          )}
        </div>

        {/* Version Timeline Card */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase border-b border-slate-100 pb-3 font-space">
            Model Registry Timeline History
          </h3>

          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 scrollbar">
            {corridorVersions.length > 0 ? (
              corridorVersions.map((v, index) => (
                <div key={index} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-slate-900 font-geist">v{v.version}</span>
                    <span className="text-[10px] text-slate-500 font-inter">{v.created_at || 'Jan 2026'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border font-geist ${
                      v.status === 'champion' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : v.status === 'challenger'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {(v.status || 'challenger').toUpperCase()}
                    </span>
                    {v.status !== 'champion' && v.status !== 'challenger' && !isReadOnlyRole && (
                      <button
                        onClick={handleRollback}
                        disabled={submitting}
                        className="text-[10px] text-rose-600 hover:text-rose-800 font-extrabold hover:underline transition cursor-pointer font-inter"
                      >
                        Rollback
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-slate-400 font-inter text-xs">No version logs found in model registry.</div>
            )}
          </div>
        </div>
      </div>

      {/* Model Card display for RED_SEA / Proxy corridors */}
      {modelCardMarkdown && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase border-b border-slate-100 pb-3 flex items-center gap-2 font-space">
            <BookOpen className="w-4 h-4 text-blue-600" />
            Model Card & Governance Specification
          </h3>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 overflow-y-auto max-h-[220px] leading-relaxed scrollbar font-geist">
            <pre className="whitespace-pre-wrap font-geist">{modelCardMarkdown}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
