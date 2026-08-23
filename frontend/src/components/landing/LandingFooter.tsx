import { Shield, ArrowRight } from 'lucide-react';
import type { Theme } from '../../api/hooks/useTheme';

interface LandingFooterProps {
  theme: Theme;
  onEnterDashboard: (tab?: string) => void;
  onScrollToSection: (sectionId: string) => void;
}

export default function LandingFooter({ theme, onEnterDashboard, onScrollToSection }: LandingFooterProps) {
  const isDark = theme === 'dark';

  return (
    <footer className="w-full font-manrope theme-transition"
      style={{
        backgroundColor: isDark ? '#050A12' : '#F5F7FA',
        borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
      }}
    >
      {/* Final CTA Banner */}
      <div className="py-20 border-b theme-transition"
        style={{ borderColor: isDark ? '#1C2A3A' : '#D9E0E8' }}
      >
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black font-space tracking-tight"
            style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}
          >
            Make the next disruption a scenario — <br />
            <span style={{ color: isDark ? '#5B8DEF' : '#356AE6' }}>
              not a surprise.
            </span>
          </h2>
          
          <p className="text-base font-inter max-w-xl mx-auto"
            style={{ color: isDark ? '#94A3B8' : '#536274' }}
          >
            Monitor the corridor. Model the disruption. Protect the supply chain.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={() => onEnterDashboard('MONITOR')}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-space font-bold text-sm text-white transition-all shadow-xl hover:scale-[1.02] cursor-pointer"
              style={{ backgroundColor: isDark ? '#5B8DEF' : '#356AE6' }}
            >
              <span>Open Command Center</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onScrollToSection('overview')}
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl font-space font-semibold text-sm border transition-all cursor-pointer hover:opacity-90"
              style={{
                backgroundColor: isDark ? '#08111C' : '#FFFFFF',
                borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
                color: isDark ? '#F4F7FA' : '#0B1220',
              }}
            >
              <span>Explore the Platform</span>
            </button>
          </div>
        </div>
      </div>

      {/* Enterprise Copyright Footer */}
      <div className="py-8 font-geist text-xs" style={{ color: isDark ? '#94A3B8' : '#536274' }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <span className="font-space font-bold uppercase tracking-wider text-[11px]" style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}>
              ENERGY RESILIENCE INTELLIGENCE
            </span>
          </div>

          <div className="text-[10px] text-center md:text-right">
            <span>Maritime Geopolitical Corridor Risk Digital Command Twin v2.0</span>
            <span className="mx-2">·</span>
            <span>© 2026 Energy Resilience Platform. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
