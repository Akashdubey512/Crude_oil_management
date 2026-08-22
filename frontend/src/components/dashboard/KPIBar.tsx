import { motion } from 'framer-motion';
import { Shield, TrendingUp, RefreshCw, Layers, Zap, AlertTriangle } from 'lucide-react';
import type { RiskSnapshot, BrentPriceResponse, SourceStatusResponse } from '../../types';

interface KPIBarProps {
  risks: RiskSnapshot[];
  corridorsCount: number;
  brentPrices: BrentPriceResponse | null;
  dataStatuses: SourceStatusResponse[];
  modelHealthStatus: string;
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
  const brentPrice = brentPrices ? brentPrices.latest_price.toFixed(2) : '82.45';
  const brentReturn = brentPrices?.daily_return !== null && brentPrices?.daily_return !== undefined
    ? `${(brentPrices.daily_return * 100).toFixed(2)}%`
    : 'N/A';
  const isReturnNeg = brentPrices?.daily_return !== null && brentPrices?.daily_return !== undefined && brentPrices.daily_return < 0;

  // 3. Data Flow Count
  const freshFeeds = dataStatuses.filter((s) => s.status === 'FRESH').length;
  const totalFeeds = dataStatuses.length;

  // 4. Energy exposure status
  const hasHighRisk = risks.some((r) => r.risk_level === 'HIGH' || r.risk_level === 'CRITICAL');
  const exposureStatus = hasHighRisk ? 'HIGH EXPOSURE' : 'NORMAL';

  const kpis = [
    {
      title: 'GLOBAL CO-RISK INDEX',
      value: avgRisk,
      status: Number(avgRisk) > 0.5 ? 'WARNING' : 'STABLE',
      color: Number(avgRisk) > 0.5 ? 'text-orange-600' : 'text-blue-600',
      badgeStyle: Number(avgRisk) > 0.5 ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200',
      icon: AlertTriangle,
      source: 'Internal Model Blend',
      freshness: 'Real-time inference'
    },
    {
      title: 'MONITORED CORRIDORS',
      value: `${corridorsCount} Active`,
      status: 'MONITORING',
      color: 'text-slate-900',
      badgeStyle: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: Layers,
      source: 'Global Chokepoints Map',
      freshness: 'Seeded corridors'
    },
    {
      title: 'BRENT SPOT PRICE',
      value: `$${brentPrice}`,
      status: brentPrices ? brentReturn : 'NO FEED',
      color: isReturnNeg ? 'text-rose-600' : 'text-emerald-600',
      badgeStyle: isReturnNeg ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: TrendingUp,
      source: 'FRED Oil Price API',
      freshness: brentPrices?.data_freshness ? `${brentPrices.data_freshness} ago` : 'Real-time proxy'
    },
    {
      title: 'DATA FEED FRESHNESS',
      value: `${freshFeeds}/${totalFeeds}`,
      status: totalFeeds > 0 && freshFeeds === totalFeeds ? 'HEALTHY' : 'LAGGING',
      color: freshFeeds === totalFeeds ? 'text-emerald-600' : 'text-orange-600',
      badgeStyle: freshFeeds === totalFeeds ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200',
      icon: RefreshCw,
      source: 'Multi-Feed Ingest (AIS/GDELT)',
      freshness: '1h observation window'
    },
    {
      title: 'CHAMPION ML ENGINE',
      value: modelHealthStatus || 'GOOD',
      status: modelHealthStatus === 'GOOD' ? 'OPTIMAL' : 'DEGRADED',
      color: modelHealthStatus === 'GOOD' ? 'text-emerald-600' : 'text-rose-600',
      badgeStyle: modelHealthStatus === 'GOOD' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200',
      icon: Shield,
      source: 'MLOps Pipeline Registry',
      freshness: 'V1.0 active champion'
    },
    {
      title: 'SUPPLY CHAIN EXPOSURE',
      value: exposureStatus,
      status: hasHighRisk ? 'STRESS' : 'SECURE',
      color: hasHighRisk ? 'text-rose-600' : 'text-blue-600',
      badgeStyle: hasHighRisk ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Zap,
      source: 'India Custom Weighting',
      freshness: 'Real-time risk mapping'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 select-none font-manrope">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between min-h-[120px] relative"
          >
            {/* Header / Meta */}
            <div className="flex justify-between items-start gap-2">
              <span className="text-[9px] font-extrabold tracking-wider text-slate-400 uppercase font-jakarta">
                {kpi.title}
              </span>
              <div className="p-1.5 rounded-lg bg-slate-50 text-blue-600 border border-slate-100">
                <Icon className="w-3.5 h-3.5 shrink-0" />
              </div>
            </div>

            {/* Main Value Display */}
            <div className="my-2">
              <span className={`text-xl font-black font-space tracking-tight ${kpi.color} block`}>
                {kpi.value}
              </span>
              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border mt-1.5 inline-block ${kpi.badgeStyle}`}>
                {kpi.status}
              </span>
            </div>

            {/* Footer / Provenance */}
            <div className="border-t border-slate-100 pt-2 flex flex-col gap-0.5 text-[9px] font-geist text-slate-400">
              <span>SRC: {kpi.source}</span>
              <span>UPDATED: {kpi.freshness}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
