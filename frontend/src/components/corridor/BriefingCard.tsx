import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client';
import type { ExecutiveBriefingResponse } from '../../types';

interface BriefingCardProps {
  corridorId: string;
}

export default function BriefingCard({ corridorId }: BriefingCardProps) {
  const [briefing, setBriefing] = useState<ExecutiveBriefingResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBriefing = (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);

    api.getExecutiveBriefing(corridorId, force)
      .then((res) => {
        setBriefing(res);
        setLoading(false);
        setRefreshing(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load executive briefing.');
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchBriefing(false);
  }, [corridorId]);

  return (
    <div
      className="p-4 rounded-xl border space-y-3 font-geist select-none"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
    >
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-bold uppercase font-space tracking-wider" style={{ color: 'var(--text-primary)' }}>
            AI Executive Briefing
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {briefing && (
            <span
              className={`px-2 py-0.5 rounded border text-[9px] font-mono uppercase font-bold ${
                briefing.llm_generated
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              }`}
            >
              {briefing.llm_generated ? 'LLM ACTIVE (CLAUDE)' : 'AUDIT-SAFE FALLBACK'}
            </span>
          )}
          <button
            onClick={() => fetchBriefing(true)}
            disabled={loading || refreshing}
            className="p-1 rounded border hover:bg-slate-800 transition-colors text-slate-300 disabled:opacity-50"
            style={{ borderColor: 'var(--border-default)' }}
            title="Regenerate Executive Briefing"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400 font-inter">Synthesizing executive briefing...</div>
      ) : error ? (
        <div className="p-3 rounded-lg border text-xs text-rose-300 bg-rose-950/30 border-rose-500/40 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      ) : briefing ? (
        <div className="space-y-3">
          <div className="text-xs leading-relaxed font-inter whitespace-pre-line p-3 rounded-lg border bg-[#060b13] border-slate-800/80 text-slate-200">
            {briefing.briefing_text}
          </div>

          {/* Visible Mandatory Disclaimer */}
          <div className="p-2.5 rounded-lg border text-[10px] leading-relaxed flex items-start gap-2 bg-slate-900/60 border-slate-800 text-slate-400 font-inter">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
            <span>
              <strong className="text-slate-300">Auditable AI Disclaimer: </strong>
              {briefing.disclaimer}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
