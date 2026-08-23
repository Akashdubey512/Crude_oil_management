import { Monitor, Play } from 'lucide-react';
import type { Theme } from '../../api/hooks/useTheme';

interface CommandCenterPreviewProps {
  theme: Theme;
  onEnterDashboard: (tab?: string) => void;
}

export default function CommandCenterPreview({ theme, onEnterDashboard }: CommandCenterPreviewProps) {
  const isDark = theme === 'dark';

  return (
    <section className="py-20 border-b font-manrope theme-transition"
      style={{
        backgroundColor: isDark ? '#050A12' : '#F5F7FA',
        borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="text-[10px] font-space font-bold uppercase tracking-[0.2em]"
            style={{ color: isDark ? '#5B8DEF' : '#356AE6' }}
          >
            COMMAND CENTER PREVIEW
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-space tracking-tight"
            style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}
          >
            The intelligence layer behind every decision.
          </h2>
          <p className="text-sm font-inter leading-relaxed"
            style={{ color: isDark ? '#94A3B8' : '#536274' }}
          >
            A unified digital twin command center designed for energy analysts, procurement teams, and government decision-makers.
          </p>
        </div>

        {/* Product Frame Container */}
        <div
          onClick={() => onEnterDashboard('MONITOR')}
          className="relative rounded-2xl overflow-hidden border shadow-2xl group cursor-pointer theme-transition"
          style={{
            backgroundColor: isDark ? '#0D1624' : '#FFFFFF',
            borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
          }}
        >
          {/* Top Browser Header Bar */}
          <div className="px-4 py-3 border-b flex items-center justify-between font-geist text-xs"
            style={{
              backgroundColor: isDark ? '#08111C' : '#F5F7FA',
              borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-[10px] text-slate-400 font-mono">energy-resilience.intel / command-center</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              <Monitor className="w-3.5 h-3.5" />
              <span>LIVE TWIN CONNECTED</span>
            </div>
          </div>

          {/* Interactive Hover Overlay Frame */}
          <div className="relative p-6 sm:p-10 space-y-6">
            
            {/* Dashboard Mock Preview Interface */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-geist text-xs">
              <div className="p-4 rounded-xl border space-y-2"
                style={{ backgroundColor: isDark ? '#08111C' : '#FFFFFF', borderColor: isDark ? '#1C2A3A' : '#D9E0E8' }}
              >
                <div className="text-[10px] uppercase font-bold text-slate-400 font-space">TACTICAL VECTOR MAP</div>
                <div className="text-sm font-bold text-blue-400 font-space">4 Active Corridors Tracked</div>
                <p className="text-[11px] text-slate-400 font-inter">Live AIS traffic streams & chokepoint risk vectors.</p>
              </div>

              <div className="p-4 rounded-xl border space-y-2"
                style={{ backgroundColor: isDark ? '#08111C' : '#FFFFFF', borderColor: isDark ? '#1C2A3A' : '#D9E0E8' }}
              >
                <div className="text-[10px] uppercase font-bold text-slate-400 font-space">XGBOOST RISK ENGINE</div>
                <div className="text-sm font-bold text-emerald-400 font-space">0.94 ROC-AUC (97.6% Acc)</div>
                <p className="text-[11px] text-slate-400 font-inter">Recall: 0.0% | Precision: 0.0% | Brier: 0.018</p>
              </div>

              <div className="p-4 rounded-xl border space-y-2"
                style={{ backgroundColor: isDark ? '#08111C' : '#FFFFFF', borderColor: isDark ? '#1C2A3A' : '#D9E0E8' }}
              >
                <div className="text-[10px] uppercase font-bold text-slate-400 font-space">SCENARIO SIMULATOR</div>
                <div className="text-sm font-bold text-amber-400 font-space">Stress-Test Multipliers</div>
                <p className="text-[11px] text-slate-400 font-inter">Simulate closure, rerouting & SPR drawdown.</p>
              </div>
            </div>

            {/* Centered Launch Badge Overlay on Hover */}
            <div className="flex justify-center pt-4">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-space font-bold text-xs uppercase tracking-wider shadow-xl group-hover:scale-105 transition-all">
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch Operational Command Center</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
