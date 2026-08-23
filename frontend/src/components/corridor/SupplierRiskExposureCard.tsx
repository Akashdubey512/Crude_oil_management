import { useEffect, useState } from 'react';
import { Shield, Info, Globe, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';
import type { SupplierExposureResponse, SupplierExposureItem } from '../../types';

function riskBadgeClass(level: string) {
  switch (level.toUpperCase()) {
    case 'CRITICAL': return 'bg-rose-950/60 border-rose-500/60 text-rose-300';
    case 'HIGH':     return 'bg-amber-950/60 border-amber-500/60 text-amber-300';
    case 'MODERATE': return 'bg-yellow-950/60 border-yellow-500/60 text-yellow-300';
    case 'LOW':      return 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300';
    default:         return 'bg-slate-900 border-slate-700 text-slate-400';
  }
}

export default function SupplierRiskExposureCard() {
  const [data, setData] = useState<SupplierExposureResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.getSupplierRiskExposures()
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load supplier exposures.');
          setLoading(false);
        }
      });
    return () => { isMounted = false; };
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
            <Globe className="w-4 h-4 text-blue-400" />
            Supplier-Country Disruption Exposure
          </h3>
          <p className="text-[10px] text-slate-400 font-inter mt-0.5">
            Per-supplier crude risk exposure synthesized from transit corridor vector outputs.
          </p>
        </div>
        <span className="px-2 py-0.5 rounded border text-[9px] font-mono uppercase bg-blue-950/40 border-blue-500/40 text-blue-300">
          MODELED ESTIMATE
        </span>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400 font-inter">Loading supplier exposures...</div>
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
                  <th className="py-1.5 px-2">Supplier Country</th>
                  <th className="py-1.5 px-2 text-right">Import Share</th>
                  <th className="py-1.5 px-2">Primary Corridor</th>
                  <th className="py-1.5 px-2 text-right">Exposure Score</th>
                  <th className="py-1.5 px-2 text-center">Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {data.suppliers.map((item: SupplierExposureItem) => (
                  <tr key={item.supplier_country}>
                    <td className="py-2 px-2 font-medium" style={{ color: 'var(--text-primary)' }}>
                      <span className="font-bold text-slate-300 mr-1.5">{item.country_code}</span>
                      {item.supplier_country}
                    </td>
                    <td className="py-2 px-2 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {item.import_share_pct.toFixed(1)}%
                    </td>
                    <td className="py-2 px-2 text-[10px] font-mono text-slate-400">
                      {item.primary_corridor}
                    </td>
                    <td className="py-2 px-2 text-right font-bold font-space" style={{ color: 'var(--text-primary)' }}>
                      {item.exposure_score.toFixed(1)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-bold font-space ${riskBadgeClass(item.risk_level)}`}>
                        {item.risk_level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Explicit Methodology Caveat */}
          <div className="p-2.5 rounded-lg border text-[10px] leading-relaxed flex items-start gap-2 bg-slate-900/60 border-slate-800 text-slate-400 font-inter">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
            <span>
              <strong className="text-slate-300">Methodology Note: </strong>
              {data.methodology}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
