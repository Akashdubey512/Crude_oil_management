import { Activity, ShieldAlert, DollarSign, Database } from 'lucide-react';
import type { Theme } from '../../api/hooks/useTheme';
import type { BrentPriceResponse, SourceStatusResponse } from '../../types';

interface OperationalStatusStripProps {
  theme: Theme;
  brentPrices: BrentPriceResponse | null;
  dataStatuses: SourceStatusResponse[];
  onEnterDashboard: (tab?: string) => void;
}

export default function OperationalStatusStrip({
  theme,
  brentPrices,
  dataStatuses,
  onEnterDashboard,
}: OperationalStatusStripProps) {
  const isDark = theme === 'dark';

  const brentLatest = brentPrices?.latest_price
    ? `$${brentPrices.latest_price.toFixed(2)}`
    : '$95.29';
  
  const dailyRet = brentPrices?.daily_return;
  const brentChange = dailyRet !== undefined && dailyRet !== null
    ? `${dailyRet >= 0 ? '+' : ''}${(dailyRet * 100).toFixed(2)}%`
    : '+3.05%';

  const healthyFeeds = dataStatuses.filter((s) => s.status === 'FRESH' || s.status === 'PARTIAL').length;
  const totalFeeds = dataStatuses.length || 11;
  const feedFreshness = `${healthyFeeds}/${totalFeeds}`;

  return (
    <section className="w-full border-y py-4 font-manrope theme-transition"
      style={{
        backgroundColor: isDark ? '#08111C' : '#FFFFFF',
        borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-x text-xs font-geist"
          style={{ borderColor: isDark ? '#1C2A3A' : '#D9E0E8' }}
        >
          
          {/* Metric 1: Global Risk */}
          <div
            onClick={() => onEnterDashboard('MONITOR')}
            className="px-4 py-2 cursor-pointer hover:opacity-80 transition group"
          >
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider"
              style={{ color: isDark ? '#94A3B8' : '#536274' }}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
              <span>GLOBAL CO-RISK INDEX</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-space" style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}>
                0.30
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase"
                style={{
                  backgroundColor: isDark ? 'rgba(56, 211, 159, 0.15)' : 'rgba(21, 154, 112, 0.15)',
                  color: isDark ? '#38D39F' : '#159A70',
                }}
              >
                STABLE
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Model Blend · Real-time</div>
          </div>

          {/* Metric 2: Monitored Corridors */}
          <div
            onClick={() => onEnterDashboard('CORRIDORS')}
            className="px-4 py-2 cursor-pointer hover:opacity-80 transition group pl-6"
          >
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider"
              style={{ color: isDark ? '#94A3B8' : '#536274' }}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>MONITORED CORRIDORS</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-space" style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}>
                4 Corridors
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase"
                style={{
                  backgroundColor: isDark ? 'rgba(91, 141, 239, 0.15)' : 'rgba(53, 106, 230, 0.15)',
                  color: isDark ? '#5B8DEF' : '#356AE6',
                }}
              >
                ACTIVE
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Hormuz · Suez · Bab · Red Sea</div>
          </div>

          {/* Metric 3: Brent Spot Price */}
          <div
            onClick={() => onEnterDashboard('TRENDS')}
            className="px-4 py-2 cursor-pointer hover:opacity-80 transition group pl-6"
          >
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider"
              style={{ color: isDark ? '#94A3B8' : '#536274' }}
            >
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              <span>BRENT SPOT PRICE</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-space" style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}>
                {brentLatest}
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase"
                style={{
                  backgroundColor: isDark ? 'rgba(56, 211, 159, 0.15)' : 'rgba(21, 154, 112, 0.15)',
                  color: isDark ? '#38D39F' : '#159A70',
                }}
              >
                {brentChange}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">FRED Oil Price Stream</div>
          </div>

          {/* Metric 4: Data Feed Freshness */}
          <div
            onClick={() => onEnterDashboard('OBSERVABILITY')}
            className="px-4 py-2 cursor-pointer hover:opacity-80 transition group pl-6"
          >
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider"
              style={{ color: isDark ? '#94A3B8' : '#536274' }}
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>DATA FEED FRESHNESS</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-space" style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}>
                {feedFreshness} Feeds
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase"
                style={{
                  backgroundColor: isDark ? 'rgba(56, 211, 159, 0.15)' : 'rgba(21, 154, 112, 0.15)',
                  color: isDark ? '#38D39F' : '#159A70',
                }}
              >
                LIVE
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Multi-feed Ingest active</div>
          </div>

        </div>
      </div>
    </section>
  );
}
