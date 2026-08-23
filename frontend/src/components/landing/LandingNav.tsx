import { Shield, Sun, Moon, ArrowRight } from 'lucide-react';
import type { Theme } from '../../api/hooks/useTheme';

interface LandingNavProps {
  theme: Theme;
  onToggleTheme: () => void;
  onEnterDashboard: (tab?: string) => void;
  onScrollToSection: (sectionId: string) => void;
}

export default function LandingNav({
  theme,
  onToggleTheme,
  onEnterDashboard,
  onScrollToSection,
}: LandingNavProps) {
  const isDark = theme === 'dark';

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md transition-colors duration-300 border-b select-none font-manrope theme-transition"
      style={{
        backgroundColor: isDark ? 'rgba(5, 10, 18, 0.92)' : 'rgba(245, 247, 250, 0.92)',
        borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Left: Brand Identity */}
        <div
          onClick={() => onEnterDashboard('MONITOR')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="font-space font-bold text-xs uppercase tracking-wider font-space" style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}>
              ENERGY RESILIENCE
            </div>
            <div className="text-[9px] font-geist font-semibold uppercase tracking-[0.18em]" style={{ color: isDark ? '#5B8DEF' : '#356AE6' }}>
              INTELLIGENCE PLATFORM
            </div>
          </div>
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-medium font-inter">
          <button
            onClick={() => onScrollToSection('overview')}
            className="hover:opacity-100 transition-opacity cursor-pointer"
            style={{ color: isDark ? '#94A3B8' : '#536274' }}
          >
            Overview
          </button>
          <button
            onClick={() => onScrollToSection('corridors')}
            className="hover:opacity-100 transition-opacity cursor-pointer"
            style={{ color: isDark ? '#94A3B8' : '#536274' }}
          >
            Corridors
          </button>
          <button
            onClick={() => onScrollToSection('scenarios')}
            className="hover:opacity-100 transition-opacity cursor-pointer"
            style={{ color: isDark ? '#94A3B8' : '#536274' }}
          >
            Scenarios
          </button>
          <button
            onClick={() => onScrollToSection('capabilities')}
            className="hover:opacity-100 transition-opacity cursor-pointer"
            style={{ color: isDark ? '#94A3B8' : '#536274' }}
          >
            Intelligence
          </button>
          <button
            onClick={() => onScrollToSection('architecture')}
            className="hover:opacity-100 transition-opacity cursor-pointer"
            style={{ color: isDark ? '#94A3B8' : '#536274' }}
          >
            Governance
          </button>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Operational Status */}
          <div
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-geist font-medium border"
            style={{
              backgroundColor: isDark ? 'rgba(56, 211, 159, 0.08)' : 'rgba(21, 154, 112, 0.08)',
              borderColor: isDark ? 'rgba(56, 211, 159, 0.25)' : 'rgba(21, 154, 112, 0.25)',
              color: isDark ? '#38D39F' : '#159A70',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>OPERATIONAL</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-geist font-medium transition-all cursor-pointer"
            style={{
              backgroundColor: isDark ? '#08111C' : '#FFFFFF',
              borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
              color: isDark ? '#F4F7FA' : '#0B1220',
            }}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px]">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[11px]">Dark</span>
              </>
            )}
          </button>

          {/* Primary CTA Button */}
          <button
            onClick={() => onEnterDashboard('MONITOR')}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-space font-semibold text-xs text-white transition-all shadow-md cursor-pointer hover:opacity-95"
            style={{
              backgroundColor: isDark ? '#5B8DEF' : '#356AE6',
            }}
          >
            <span>Open Command Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
