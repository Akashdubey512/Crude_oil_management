import { CheckCircle2, Clock } from 'lucide-react';
import type { Theme } from '../../api/hooks/useTheme';

interface DataProvenanceProps {
  theme: Theme;
  health: any;
}

const SOURCES = [
  { name: 'IMF PORTWATCH AIS', type: 'Vessel Traffic Counts & Transit Observations', status: 'ACTIVE INGEST' },
  { name: 'FRED ST. LOUIS FED', type: 'Brent Crude Oil Spot & Futures Prices', status: 'ACTIVE INGEST' },
  { name: 'GDELT PROJECT v2', type: 'Geopolitical Conflict & News Event Stream', status: 'ACTIVE INGEST' },
  { name: 'GLOBAL SANCTIONS REGISTRY', type: 'Maritime Sanctions & Fleet Flags', status: 'ACTIVE INGEST' },
  { name: 'PPAC INDIA ENERGY DATA', type: 'Refinery Throughput & National SPR Inventory', status: 'ACTIVE INGEST' },
];

export default function DataProvenance({ theme, health }: DataProvenanceProps) {
  const isDark = theme === 'dark';
  const dataTimestamp = health?.data_timestamp || '2026-08-16';

  return (
    <section className="py-16 border-b font-manrope theme-transition"
      style={{
        backgroundColor: isDark ? '#08111C' : '#FFFFFF',
        borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div className="space-y-2">
            <div className="text-[10px] font-space font-bold uppercase tracking-[0.2em]"
              style={{ color: isDark ? '#5B8DEF' : '#356AE6' }}
            >
              DATA PROVENANCE & INTEGRITY
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-space tracking-tight"
              style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}
            >
              Institutional Data Feeds.
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-geist text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>LAST SYNCHRONIZED: <strong className="text-emerald-400">{dataTimestamp}</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {SOURCES.map((s, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border space-y-2 theme-transition"
              style={{
                backgroundColor: isDark ? '#0D1624' : '#F5F7FA',
                borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
              }}
            >
              <div className="flex justify-between items-center text-[9px] font-geist">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {s.status}
                </span>
              </div>
              <div className="font-space font-bold text-xs uppercase" style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}>
                {s.name}
              </div>
              <div className="text-[10px] font-inter text-slate-400">
                {s.type}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
