import { Activity, Shield, TrendingUp, RefreshCw, Layers } from 'lucide-react';
import type { HealthResponse, SourceStatusResponse, BrentPriceResponse } from '../../types';

interface LiveIntelStripProps {
  health: HealthResponse | null;
  dataStatuses: SourceStatusResponse[];
  brentPrices: BrentPriceResponse | null;
  corridorsCount: number;
}

export default function LiveIntelStrip({ health, dataStatuses, brentPrices, corridorsCount }: LiveIntelStripProps) {
  const brentPrice = brentPrices ? brentPrices.latest_price.toFixed(2) : '---';
  const brentReturn = brentPrices?.daily_return !== null && brentPrices?.daily_return !== undefined
    ? `${(brentPrices.daily_return * 100).toFixed(2)}%`
    : 'N/A';
  const isReturnNeg = brentPrices?.daily_return !== null && brentPrices?.daily_return !== undefined && brentPrices.daily_return < 0;

  const activeFeeds = dataStatuses.filter(s => s.status === 'FRESH').length;
  const totalFeeds = dataStatuses.length;

  return (
    <div className="w-full border-t border-gray-900 bg-gray-950/80 backdrop-blur py-4 px-6 select-none">
      <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-6 text-xs font-mono">
        {/* System Health */}
        <div className="flex items-center gap-3">
          <Activity className="w-4 h-4 text-cyan-400" />
          <div>
            <span className="text-gray-500 block text-[9px] uppercase tracking-wider">SYSTEM STATUS</span>
            <span className="flex items-center gap-1.5 font-bold text-white">
              <span className={`w-2 h-2 rounded-full ${health ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'} inline-block`} />
              {health ? 'OPERATIONAL' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Corridor count */}
        <div className="flex items-center gap-3">
          <Layers className="w-4 h-4 text-cyan-400" />
          <div>
            <span className="text-gray-500 block text-[9px] uppercase tracking-wider">ACTIVE CORRIDORS</span>
            <span className="font-bold text-white">{corridorsCount || '---'} REGIONS</span>
          </div>
        </div>

        {/* Data feeds */}
        <div className="flex items-center gap-3">
          <RefreshCw className="w-4 h-4 text-cyan-400" />
          <div>
            <span className="text-gray-500 block text-[9px] uppercase tracking-wider">DATA FLOWS</span>
            <span className="font-bold text-white">
              {dataStatuses.length > 0 ? `${activeFeeds}/${totalFeeds} VERIFIED` : 'CONNECTION ERROR'}
            </span>
          </div>
        </div>

        {/* Brent Price */}
        <div className="flex items-center gap-3">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <div>
            <span className="text-gray-500 block text-[9px] uppercase tracking-wider">BRENT CRUDE</span>
            <span className="font-bold text-white flex items-center gap-2">
              ${brentPrice}
              {brentPrices && (
                <span className={`text-[10px] ${isReturnNeg ? 'text-rose-500' : 'text-emerald-500'}`}>
                  ({isReturnNeg ? '' : '+'}{brentReturn})
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Model info */}
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-cyan-400" />
          <div>
            <span className="text-gray-500 block text-[9px] uppercase tracking-wider">ENGINE MODEL</span>
            <span className="font-bold text-white">{health?.model_version || 'NOT DEPLOYED'}</span>
          </div>
        </div>

        {/* Last updated */}
        <div>
          <span className="text-gray-500 block text-[9px] uppercase tracking-wider">LAST REFRESHED</span>
          <span className="font-bold text-gray-300">{health?.data_timestamp || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
}
