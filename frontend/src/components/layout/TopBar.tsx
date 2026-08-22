import { useState, useEffect } from 'react';
import { Globe, RefreshCw, User, Calendar } from 'lucide-react';
import type { HealthResponse } from '../../types';

interface TopBarProps {
  health: HealthResponse | null;
  refreshing: boolean;
  onRefresh: () => void;
  error: string | null;
  userRole: string;
}

export default function TopBar({ health, refreshing, onRefresh, error, userRole }: TopBarProps) {
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
    <header className="border-b border-gray-900 bg-gray-950/80 backdrop-blur-md px-6 py-3.5 flex flex-col lg:flex-row justify-between items-center gap-4 sticky top-0 z-[1000] select-none">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-800/50">
          <Globe className="w-5 h-5 text-cyan-400" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-gray-950 animate-pulse" />
        </div>
        <div>
          <h1 className="text-sm font-black tracking-wider uppercase text-white flex items-center gap-2">
            ENERGY RESILIENCE INTEL <span className="text-[10px] bg-cyan-950 border border-cyan-800 text-cyan-400 px-1.5 py-0.5 rounded font-mono font-bold tracking-normal uppercase">Twin v2.0</span>
          </h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            Maritime Geopolitical Corridor Risk Digital Command
          </p>
        </div>
      </div>

      {/* Stats & Actions Area */}
      <div className="flex items-center gap-4 flex-wrap text-[10px] font-mono">
        {/* UTC Time */}
        <div className="flex items-center gap-2 bg-gray-900/40 px-3 py-1.5 rounded border border-gray-900 text-gray-400">
          <span className="text-gray-600 font-bold uppercase">SYSTEM TIME:</span>
          <span className="font-bold text-gray-300">{utcTime}</span>
        </div>

        {/* Data Update Freshness */}
        <div className="flex items-center gap-2 bg-gray-900/40 px-3 py-1.5 rounded border border-gray-900 text-gray-400">
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-gray-600 font-bold uppercase">DATA RETRIEVED:</span>
          <span className="font-bold text-white">{dataTimestamp}</span>
        </div>

        {/* Role Badge */}
        <div className="flex items-center gap-2 bg-gray-900/40 px-3 py-1.5 rounded border border-gray-900 text-gray-400">
          <User className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-gray-600 font-bold uppercase">ROLE:</span>
          <span className="font-bold text-cyan-400 uppercase tracking-widest">{userRole}</span>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2 bg-gray-900/40 px-3 py-1.5 rounded border border-gray-900 text-gray-400">
          <span className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-emerald-500'} inline-block animate-pulse`} />
          <span className="text-gray-600 font-bold uppercase">FASTAPI:</span>
          <span className="font-bold text-white uppercase">{error ? 'DISCONNECTED' : 'ONLINE'}</span>
        </div>

        {/* Manual Refresh Trigger */}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800/40 hover:border-cyan-700/60 text-cyan-400 font-bold px-3 py-1.5 rounded transition disabled:opacity-50 hover:cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>REFRESH SCAN</span>
        </button>
      </div>
    </header>
  );
}
