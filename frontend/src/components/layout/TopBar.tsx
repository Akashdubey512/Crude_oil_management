import { useState, useEffect, useRef } from 'react';
import { Shield, RefreshCw, Calendar, Clock, ChevronDown, Check, Sun, Moon } from 'lucide-react';
import type { HealthResponse } from '../../types';
import type { Theme } from '../../api/hooks/useTheme';

// ── Preset API keys for the demo role switcher ──────────────────────────────
export const PRESET_ROLES: { role: string; label: string; key: string; color: string; dot: string }[] = [
  {
    role: 'ADMIN',
    label: 'Admin',
    key: 'erp_pubadmin_defaultadminsecretkey987654321',
    color: 'text-violet-300',
    dot: 'bg-violet-400',
  },
  {
    role: 'ANALYST',
    label: 'Analyst',
    key: 'erp_pubanalyst_defaultanalystsecretkey987654',
    color: 'text-blue-300',
    dot: 'bg-blue-400',
  },
  {
    role: 'VIEWER',
    label: 'Viewer',
    key: 'erp_pubviewer_defaultviewersecretkey1234567',
    color: 'text-slate-300',
    dot: 'bg-slate-400',
  },
];

interface TopBarProps {
  health: HealthResponse | null;
  refreshing: boolean;
  onRefresh: () => void;
  error: string | null;
  userRole: string;
  onRoleChange: (key: string) => void;
  onReturnToLanding?: () => void;
  theme?: Theme;
  onToggleTheme?: () => void;
}

export default function TopBar({
  health,
  refreshing,
  onRefresh,
  error,
  userRole,
  onRoleChange,
  onReturnToLanding,
  theme = 'dark',
  onToggleTheme,
}: TopBarProps) {
  const [utcTime, setUtcTime] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const dataTimestamp = health?.data_timestamp || 'Unavailable';

  const activePreset =
    PRESET_ROLES.find((p) => p.role === userRole) ?? PRESET_ROLES[2]; // default VIEWER

  return (
    <header
      className="border-b px-6 py-3 flex flex-col lg:flex-row justify-between items-center gap-4 sticky top-0 z-[1000] select-none font-manrope theme-transition"
      style={{
        backgroundColor: isDark ? 'rgba(6, 11, 19, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: isDark ? 'rgba(30, 41, 59, 0.8)' : '#D9E0E8',
      }}
    >
      {/* Brand Logo */}
      <div
        onClick={onReturnToLanding}
        className={`flex items-center gap-3 ${onReturnToLanding ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
        title={onReturnToLanding ? 'Click to return to Landing Page' : undefined}
      >
        <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-blue-950/60 border border-blue-800/60 text-blue-300">
          <Shield className="w-4 h-4 stroke-[2]" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-2 border-[#060b13]" />
        </div>
        <div>
          <h1
            className="text-xs font-bold tracking-tight uppercase flex items-center gap-2 font-space"
            style={{ color: isDark ? '#ffffff' : '#0b1220' }}
          >
            ENERGY RESILIENCE INTEL{' '}
            <span
              className="text-[9px] border px-1.5 py-0.5 rounded font-geist font-medium tracking-normal uppercase"
              style={{
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : '#F1F5F9',
                borderColor: isDark ? '#334155' : '#CBD5E1',
                color: isDark ? '#cbd5e1' : '#475569',
              }}
            >
              Twin v2.0
            </span>
          </h1>
          <p className="text-[10px] font-medium tracking-normal font-inter" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
            Maritime Geopolitical Corridor Risk Digital Command
          </p>
        </div>
      </div>

      {/* Stats & Actions Area */}
      <div className="flex items-center gap-2.5 flex-wrap text-xs font-geist">
        {/* Light / Dark Mode Toggle Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            aria-label="Toggle light or dark theme"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold font-geist transition-all cursor-pointer hover:opacity-90"
            style={{
              backgroundColor: isDark ? '#0a1322' : '#F8FAFC',
              borderColor: isDark ? '#334155' : '#CBD5E1',
              color: isDark ? '#f8fafc' : '#0f172a',
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
        )}

        {/* UTC Time */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border"
          style={{
            backgroundColor: isDark ? '#0a1322' : '#F8FAFC',
            borderColor: isDark ? '#1e293b' : '#E2E8F0',
            color: isDark ? '#cbd5e1' : '#334155',
          }}
        >
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500 font-medium uppercase text-[10px]">TIME:</span>
          <span className="font-semibold text-[11px]">{utcTime}</span>
        </div>

        {/* Data Update Freshness */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border"
          style={{
            backgroundColor: isDark ? '#0a1322' : '#F8FAFC',
            borderColor: isDark ? '#1e293b' : '#E2E8F0',
            color: isDark ? '#cbd5e1' : '#334155',
          }}
        >
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500 font-medium uppercase text-[10px]">RETRIEVED:</span>
          <span className="font-semibold text-[11px]">{dataTimestamp}</span>
        </div>

        {/* Role Switcher Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="role-switcher-btn"
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors cursor-pointer"
            style={{
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#F1F5F9',
              borderColor: isDark ? 'rgba(51, 65, 85, 0.7)' : '#CBD5E1',
              color: isDark ? '#cbd5e1' : '#334155',
            }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${activePreset.dot} inline-block`} />
            <span className="text-slate-400 font-medium uppercase text-[10px]">ROLE:</span>
            <span className={`font-bold uppercase tracking-wide text-[11px] ${activePreset.color}`}>
              {activePreset.role}
            </span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown panel */}
          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-52 border rounded-xl shadow-xl overflow-hidden z-50"
              style={{
                backgroundColor: isDark ? '#0a1322' : '#FFFFFF',
                borderColor: isDark ? 'rgba(51, 65, 85, 0.8)' : '#CBD5E1',
              }}
            >
              <div className="px-3 py-2 border-b border-slate-800">
                <p className="text-[10px] font-space uppercase tracking-widest text-slate-500">
                  Switch Role
                </p>
              </div>
              {PRESET_ROLES.map((preset) => (
                <button
                  key={preset.role}
                  id={`role-option-${preset.role.toLowerCase()}`}
                  onClick={() => {
                    onRoleChange(preset.key);
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-800/60 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${preset.dot}`} />
                    <div>
                      <p className={`text-[12px] font-semibold font-space ${preset.color}`}>
                        {preset.label}
                      </p>
                      <p className="text-[10px] text-slate-500 font-inter mt-0.5">
                        {preset.role === 'ADMIN'
                          ? 'Full access · All scopes'
                          : preset.role === 'ANALYST'
                          ? 'Read · Write · Model read'
                          : 'Read only · Model read'}
                      </p>
                    </div>
                  </div>
                  {activePreset.role === preset.role && (
                    <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Connection Status */}
        <div
          className="flex items-center gap-2 px-2.5 py-1 rounded-lg border"
          style={{
            backgroundColor: isDark ? '#0a1322' : '#F8FAFC',
            borderColor: isDark ? '#1e293b' : '#E2E8F0',
          }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${error ? 'bg-rose-400' : 'bg-emerald-400'} inline-block`} />
          <span className="text-slate-500 font-medium uppercase text-[10px]">FASTAPI:</span>
          <span className={`font-semibold text-[11px] ${error ? 'text-rose-400' : 'text-emerald-400/90'}`}>
            {error ? 'DISCONNECTED' : 'ONLINE (200)'}
          </span>
        </div>

        {/* Manual Refresh Trigger */}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 font-semibold px-3 py-1 rounded-lg border transition disabled:opacity-50 cursor-pointer text-[11px] font-space tracking-wide"
          style={{
            backgroundColor: isDark ? '#1e293b' : '#E2E8F0',
            borderColor: isDark ? '#334155' : '#CBD5E1',
            color: isDark ? '#f8fafc' : '#0f172a',
          }}
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          <span>REFRESH</span>
        </button>
      </div>
    </header>
  );
}
