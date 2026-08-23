import { useEffect, useState } from 'react';
import { Layers, Info, Award, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';
import type { CrudeSourceRankingResponse, CrudeSourceRankingItem } from '../../types';

function statusBadgeClass(status: string) {
  switch (status.toUpperCase()) {
    case 'PRIMARY_OPTIMAL':
      return 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300';
    case 'STABLE_ALTERNATIVE':
      return 'bg-blue-950/60 border-blue-500/60 text-blue-300';
    case 'ELEVATED_RISK_PENALTY':
      return 'bg-rose-950/60 border-rose-500/60 text-rose-300';
    default:
      return 'bg-slate-900 border-slate-700 text-slate-400';
  }
}

export default function AlternativeCrudeSourcesCard() {
  const [data, setData] = useState<CrudeSourceRankingResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.getCrudeSourceRankings()
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load crude source rankings.');
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      className="p-4 rounded-xl border space-y-3 font-geist select-none"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
    >
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <h3 className="text-xs font-bold uppercase font-space tracking-wider flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Layers className="w-4 h-4 text-emerald-400" />
            Alternative Crude Sources
          </h3>
          <p className="text-[10px] text-slate-400 font-inter mt-0.5">
            Adaptive procurement orchestrator ranking combining corridor risk & logistics penalties.
          </p>
        </div>
        <span className="px-2 py-0.5 rounded border text-[9px] font-mono uppercase bg-emerald-950/40 border-emerald-500/40 text-emerald-300 flex items-center gap-1">
          <Award className="w-3 h-3 text-emerald-400" />
          ORCHESTRATOR RANKED
        </span>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400 font-inter">Loading alternative crude source rankings...</div>
      ) : error ? (
        <div className="p-3 rounded-lg border text-xs text-rose-300 bg-rose-950/30 border-rose-500/40 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      ) : data ? (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="theme-table w-full text-left font-geist">
              <thead>
                <tr>
                  <th className="py-1.5 px-2 text-center">Rank</th>
                  <th className="py-1.5 px-2">Alternative Supplier</th>
                  <th className="py-1.5 px-2 text-right">Import Share</th>
                  <th className="py-1.5 px-2 text-right">Corridor Exposure</th>
                  <th className="py-1.5 px-2 text-right">Freight Penalty</th>
                  <th className="py-1.5 px-2 text-right">Composite Score</th>
                  <th className="py-1.5 px-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.ranked_sources.map((item: CrudeSourceRankingItem) => (
                  <tr key={item.supplier_country}>
                    <td className="py-2 px-2 text-center font-mono font-bold">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${
                        item.rank === 1 ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                      }`}>
                        #{item.rank}
                      </span>
                    </td>
                    <td className="py-2 px-2 font-medium" style={{ color: 'var(--text-primary)' }}>
                      <span className="font-bold text-slate-300 mr-1.5">{item.country_code}</span>
                      {item.supplier_country}
                    </td>
                    <td className="py-2 px-2 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {item.import_share_pct.toFixed(1)}%
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-slate-300">
                      {item.corridor_risk_exposure.toFixed(1)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-slate-400">
                      +{item.cost_logistics_penalty.toFixed(1)}
                    </td>
                    <td className="py-2 px-2 text-right font-bold font-space text-emerald-400">
                      {item.composite_rank_score.toFixed(1)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-bold font-space ${statusBadgeClass(item.recommendation_status)}`}>
                        {item.recommendation_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Explicit Methodology Note */}
          <div className="p-2.5 rounded-lg border text-[10px] leading-relaxed flex items-start gap-2 bg-slate-900/60 border-slate-800 text-slate-400 font-inter">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
            <span>
              <strong className="text-slate-300">Procurement Methodology: </strong>
              {data.methodology}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
