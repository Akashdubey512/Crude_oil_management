import { motion } from 'framer-motion';
import { Shield, TrendingUp, RefreshCw, Layers, Zap, AlertTriangle } from 'lucide-react';
import type { RiskSnapshot, BrentPriceResponse, SourceStatusResponse } from '../../types';

interface KPIBarProps {
  risks: RiskSnapshot[];
  corridorsCount: number;
  brentPrices: BrentPriceResponse | null;
  dataStatuses: SourceStatusResponse[];
  modelHealthStatus: string; // GOOD / DEGRADED / CRITICAL
}

export default function KPIBar({
  risks,
  corridorsCount,
  brentPrices,
  dataStatuses,
  modelHealthStatus
}: KPIBarProps) {
  // 1. Calculate Average Global Risk Score
  const validRisks = risks.filter((r) => r.risk_score !== null);
  const avgRisk = validRisks.length > 0
    ? (validRisks.reduce((sum, r) => sum + (r.risk_score || 0), 0) / validRisks.length).toFixed(2)
    : '0.00';

  // 2. Brent Price & Volatility
  const brentPrice = brentPrices ? brentPrices.latest_price.toFixed(2) : '---';
  const brentReturn = brentPrices?.daily_return !== null && brentPrices?.daily_return !== undefined
    ? `${(brentPrices.daily_return * 100).toFixed(2)}%`
    : 'N/A';
  const isReturnNeg = brentPrices?.daily_return !== null && brentPrices?.daily_return !== undefined && brentPrices.daily_return < 0;

  // 3. Data Flow Count
  const freshFeeds = dataStatuses.filter((s) => s.status === 'FRESH').length;
  const totalFeeds = dataStatuses.length;

  // 4. Energy exposure calculated as max risk or warning state
  const hasHighRisk = risks.some((r) => r.risk_level === 'HIGH' || r.risk_level === 'CRITICAL');
  const exposureStatus = hasHighRisk ? 'HIGH' : 'NORMAL';

  const kpis = [
    {
      title: 'GLOBAL CO-RISK INDEX',
      value: avgRisk,
      status: Number(avgRisk) > 0.5 ? 'WARNING' : 'STABLE',
      color: Number(avgRisk) > 0.5 ? 'text-amber-500' : 'text-cyan-400',
      icon: AlertTriangle,
      source: 'Internal Model Blend',
      freshness: 'Real-time inference'
    },
    {
      title: 'MONITORED CORRIDORS',
      value: `${corridorsCount} Active`,
      status: 'MONITORING',
      color: 'text-white',
      icon: Layers,
      source: 'Global Chokepoints Map',
      freshness: 'Seeded corridors'
    },
    {
      title: 'BRENT SPOT PRICE',
      value: `$${brentPrice}`,
      status: brentPrices ? brentReturn : 'NO FEED',
      color: isReturnNeg ? 'text-rose-500' : 'text-emerald-400',
      icon: TrendingUp,
      source: 'FRED Oil Price API',
      freshness: brentPrices?.data_freshness ? `${brentPrices.data_freshness} ago` : 'Real-time proxy'
    },
    {
      title: 'DATA FEED FRESHNESS',
      value: `${freshFeeds}/${totalFeeds}`,
      status: totalFeeds > 0 && freshFeeds === totalFeeds ? 'HEALTHY' : 'LAGGING',
      color: freshFeeds === totalFeeds ? 'text-emerald-400' : 'text-amber-400',
      icon: RefreshCw,
      source: 'Multi-Feed Ingest (AIS/GDELT)',
      freshness: '1h observation window'
    },
    {
      title: 'CHAMPION ML ENGINE',
      value: modelHealthStatus || 'GOOD',
      status: modelHealthStatus === 'GOOD' ? 'OPTIMAL' : 'DEGRADED',
      color: modelHealthStatus === 'GOOD' ? 'text-emerald-400' : 'text-rose-400',
      icon: Shield,
      source: 'MLOps Pipeline Registry',
      freshness: 'V1.0 active champion'
    },
    {
      title: 'SUPPLY CHAIN EXPOSURE',
      value: exposureStatus,
      status: hasHighRisk ? 'STRESS' : 'SECURE',
      color: hasHighRisk ? 'text-rose-500' : 'text-cyan-400',
      icon: Zap,
      source: 'India Custom Weighting',
      freshness: 'Real-time risk mapping'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 select-none">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className="glass-panel kpi-card p-4 rounded-xl border border-gray-900/60 flex flex-col justify-between min-h-[110px] relative"
          >
            {/* Header / Meta */}
            <div className="flex justify-between items-start gap-2">
              <span className="text-[8px] font-mono font-bold tracking-widest text-gray-500 uppercase">
                {kpi.title}
              </span>
              <Icon className="w-3.5 h-3.5 text-gray-600 shrink-0" />
            </div>

            {/* Main Value Display */}
            <div className="my-2.5">
              <span className={`text-xl font-black tracking-tight ${kpi.color} block`}>
                {kpi.value}
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-900 border border-gray-800 text-gray-400 mt-1 inline-block">
                {kpi.status}
              </span>
            </div>

            {/* Footer / Provenance */}
            <div className="border-t border-gray-900/40 pt-2 flex flex-col gap-0.5 text-[8px] font-mono text-gray-600">
              <span>SRC: {kpi.source}</span>
              <span>UPDATED: {kpi.freshness}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
