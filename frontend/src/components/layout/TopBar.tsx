import { useState, useEffect } from 'react';
import { Shield, RefreshCw, User, Calendar, Clock } from 'lucide-react';
import type { HealthResponse } from '../../types';

interface TopBarProps {
  health: HealthResponse | null;
  refreshing: boolean;
  onRefresh: () => void;
  error: string | null;
  userRole: string;
  onReturnToLanding?: () => void;
}

export default function TopBar({ health, refreshing, onRefresh, error, userRole, onReturnToLanding }: TopBarProps) {
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const dataTimestamp = health?.data_timestamp || 'Unavailable';

  return (
    <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur-md px-6 py-3 flex flex-col lg:flex-row justify-between items-center gap-4 sticky top-0 z-[1000] select-none font-manrope shadow-xs">
      {/* Brand Logo */}
      <div
        onClick={onReturnToLanding}
        className={`flex items-center gap-3 ${onReturnToLanding ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
        title={onReturnToLanding ? 'Click to return to Landing Page' : undefined}
      >
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 shadow-md shadow-blue-500/20 text-white">
          <Shield className="w-5 h-5 stroke-[2.5]" />
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
        </div>
        <div>
          <h1 className="text-sm font-black tracking-tight uppercase text-slate-900 flex items-center gap-2 font-space">
            ENERGY RESILIENCE INTEL <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-md font-mono font-bold tracking-normal uppercase">Twin v2.0</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-inter">
            Maritime Geopolitical Corridor Risk Digital Command
          </p>
        </div>
      </div>

      {/* Stats & Actions Area */}
      <div className="flex items-center gap-3 flex-wrap text-xs font-geist">
        {/* UTC Time */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-slate-400 font-bold uppercase text-[10px]">TIME:</span>
          <span className="font-bold text-slate-800 text-[11px]">{utcTime}</span>
        </div>

        {/* Data Update Freshness */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-slate-400 font-bold uppercase text-[10px]">RETRIEVED:</span>
          <span className="font-bold text-slate-900 text-[11px]">{dataTimestamp}</span>
        </div>

        {/* Role Badge */}
        <div className="flex items-center gap-2 bg-blue-50/80 px-3 py-1.5 rounded-lg border border-blue-200/80 text-blue-800">
          <User className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-blue-500 font-bold uppercase text-[10px]">ROLE:</span>
          <span className="font-extrabold text-blue-700 uppercase tracking-widest text-[11px]">{userRole}</span>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600">
          <span className={`w-2 h-2 rounded-full ${error ? 'bg-rose-500' : 'bg-emerald-500'} inline-block animate-pulse`} />
          <span className="text-slate-400 font-bold uppercase text-[10px]">FASTAPI:</span>
          <span className={`font-bold text-[11px] ${error ? 'text-rose-600' : 'text-emerald-700'}`}>
            {error ? 'DISCONNECTED' : 'ONLINE (200)'}
          </span>
        </div>

        {/* Manual Refresh Trigger */}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 bg-orange-50 hover:bg-orange-100 border border-orange-200/90 text-orange-700 font-bold px-3.5 py-1.5 rounded-lg transition disabled:opacity-50 hover:cursor-pointer shadow-2xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-[11px] font-extrabold">REFRESH SCAN</span>
        </button>
      </div>
    </header>
  );
}
