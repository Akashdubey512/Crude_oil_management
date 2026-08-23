import { ArrowRight, ChevronRight } from 'lucide-react';
import type { Theme } from '../../api/hooks/useTheme';
import GlobeMap from '../map/GlobeMap';
import type { RiskSnapshot } from '../../types';

interface LandingHeroProps {
  theme: Theme;
  health: any;
  risks: RiskSnapshot[];
  onEnterDashboard: (tab?: string) => void;
  onScrollToSection: (sectionId: string) => void;
}

export default function LandingHero({
  theme,
  health,
  risks,
  onEnterDashboard,
  onScrollToSection,
}: LandingHeroProps) {
  const isDark = theme === 'dark';
  const dataTimestamp = health?.data_timestamp || '2026-08-16';

  return (
    <section id="overview" className="relative w-full py-12 md:py-20 overflow-hidden font-manrope theme-transition">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Headline, Narrative & CTAs */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Micro Status Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-geist font-medium"
              style={{
                backgroundColor: isDark ? '#08111C' : '#FFFFFF',
                borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
                color: isDark ? '#94A3B8' : '#536274',
              }}
            >
              <span className="flex items-center gap-1.5 font-bold" style={{ color: isDark ? '#38D39F' : '#159A70' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                SYSTEM OPERATIONAL
              </span>
              <span className="opacity-40">|</span>
              <span>4 MONITORED CORRIDORS</span>
              <span className="opacity-40">|</span>
              <span>AIS FEED ACTIVE</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-space tracking-tight leading-[1.08]"
              style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}
            >
              India's Energy Supply Chain <br />
              <span style={{ color: isDark ? '#5B8DEF' : '#356AE6' }}>
                Before Disruption Happens.
              </span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-base sm:text-lg leading-relaxed font-inter max-w-xl"
              style={{ color: isDark ? '#94A3B8' : '#536274' }}
            >
              AI-driven intelligence for monitoring geopolitical threats, maritime chokepoints and crude-oil supply disruptions — with scenario simulation and executable rerouting recommendations.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => onEnterDashboard('MONITOR')}
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-space font-bold text-sm text-white transition-all shadow-lg hover:scale-[1.02] cursor-pointer"
                style={{ backgroundColor: isDark ? '#5B8DEF' : '#356AE6' }}
              >
                <span>Open Command Center</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onScrollToSection('capabilities')}
                className="flex items-center gap-2 px-5 py-3.5 rounded-xl font-space font-semibold text-sm border transition-all cursor-pointer hover:opacity-90"
                style={{
                  backgroundColor: isDark ? '#08111C' : '#FFFFFF',
                  borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
                  color: isDark ? '#F4F7FA' : '#0B1220',
                }}
              >
                <span>Explore Intelligence</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Micro Status Summary Footprint */}
            <div className="pt-4 grid grid-cols-3 gap-4 border-t text-xs font-geist"
              style={{ borderColor: isDark ? '#1C2A3A' : '#D9E0E8' }}
            >
              <div>
                <span className="text-[10px] uppercase font-medium block" style={{ color: isDark ? '#94A3B8' : '#536274' }}>
                  LAST UPDATED
                </span>
                <span className="font-bold font-mono" style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}>
                  {dataTimestamp}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-medium block" style={{ color: isDark ? '#94A3B8' : '#536274' }}>
                  CHAMPION MODEL
                </span>
                <span className="font-bold font-mono" style={{ color: isDark ? '#38D39F' : '#159A70' }}>
                  XGBoost v1.0
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-medium block" style={{ color: isDark ? '#94A3B8' : '#536274' }}>
                  CORRIDOR COVERAGE
                </span>
                <span className="font-bold font-mono" style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}>
                  88% Oil Imports
                </span>
              </div>
            </div>

          </div>

          {/* Right Column: Live Maritime Intelligence Map Panel */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl overflow-hidden border shadow-2xl h-[440px] md:h-[480px] theme-transition"
              style={{
                backgroundColor: isDark ? '#0D1624' : '#FFFFFF',
                borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
              }}
            >
              {/* Map View */}
              <GlobeMap
                risks={risks}
                onSelectCorridor={() => onEnterDashboard('MONITOR')}
                selectedCorridor="HORMUZ"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
