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

type BadgeType = 'neutral' | 'positive' | 'warning' | 'danger' | 'info';

function getBadgeStyle(type: BadgeType): React.CSSProperties {
  switch (type) {
    case 'positive':
      return {
        color: 'var(--risk-low-text)',
        backgroundColor: 'var(--risk-low-bg)',
        borderColor: 'var(--risk-low-border)',
      };
    case 'warning':
      return {
        color: 'var(--risk-moderate-text)',
        backgroundColor: 'var(--risk-moderate-bg)',
        borderColor: 'var(--risk-moderate-border)',
      };
    case 'danger':
      return {
        color: 'var(--risk-high-text)',
        backgroundColor: 'var(--risk-high-bg)',
        borderColor: 'var(--risk-high-border)',
      };
    case 'info':
      return {
        color: 'var(--info-blue-text)',
        backgroundColor: 'var(--info-blue-subtle)',
        borderColor: 'var(--info-blue)',
      };
    default: // neutral
      return {
        color: 'var(--text-secondary)',
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-default)',
      };
  }
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
  const isHighRiskIndex = Number(avgRisk) > 0.5;

  // 2. Brent Price & Volatility
  const brentPrice = brentPrices ? brentPrices.latest_price.toFixed(2) : '82.45';
  const brentReturn = brentPrices?.daily_return !== null && brentPrices?.daily_return !== undefined
    ? `${(brentPrices.daily_return * 100).toFixed(2)}%`
    : 'N/A';
  const isReturnNeg = brentPrices?.daily_return !== null && brentPrices?.daily_return !== undefined && brentPrices.daily_return < 0;

  // 3. Data Flow Count
  const freshFeeds = dataStatuses.filter((s) => s.status === 'FRESH').length;
  const totalFeeds = dataStatuses.length;
  const isDataHealthy = totalFeeds > 0 && freshFeeds === totalFeeds;

  // 4. Energy exposure status
  const hasHighRisk = risks.some((r) => r.risk_level === 'HIGH' || r.risk_level === 'CRITICAL');
  const exposureStatus = hasHighRisk ? 'HIGH EXPOSURE' : 'NORMAL';

  const kpis = [
    {
      title: 'GLOBAL CO-RISK INDEX',
      value: avgRisk,
      status: isHighRiskIndex ? 'WARNING' : 'STABLE',
      badgeType: (isHighRiskIndex ? 'warning' : 'positive') as BadgeType,
      valueColor: isHighRiskIndex ? 'var(--risk-moderate)' : 'var(--text-primary)',
      icon: AlertTriangle,
      source: 'Model Blend',
      freshness: 'Real-time',
    },
    {
      title: 'MONITORED CORRIDORS',
      value: `${corridorsCount} Active`,
      status: 'MONITORING',
      badgeType: 'info' as BadgeType,
      valueColor: 'var(--text-primary)',
      icon: Layers,
      source: 'Global Chokepoints',
      freshness: 'Live nodes',
    },
    {
      title: 'BRENT SPOT PRICE',
      value: `$${brentPrice}`,
      status: brentPrices ? brentReturn : 'NO FEED',
      badgeType: (brentPrices ? (isReturnNeg ? 'danger' : 'positive') : 'neutral') as BadgeType,
      valueColor: isReturnNeg ? 'var(--risk-high)' : 'var(--risk-low)',
      icon: TrendingUp,
      source: 'FRED Oil Price API',
      freshness: brentPrices?.data_freshness ? `${brentPrices.data_freshness} ago` : 'Real-time',
    },
    {
      title: 'DATA FEED FRESHNESS',
      value: `${freshFeeds}/${totalFeeds}`,
      status: isDataHealthy ? 'HEALTHY' : 'LAGGING',
      badgeType: (isDataHealthy ? 'positive' : 'warning') as BadgeType,
      valueColor: isDataHealthy ? 'var(--risk-low)' : 'var(--risk-moderate)',
      icon: RefreshCw,
      source: 'Multi-Feed Ingest',
      freshness: '1h observation',
    },
    {
      title: 'CHAMPION ML ENGINE',
      value: modelHealthStatus || 'GOOD',
      status: modelHealthStatus === 'GOOD' ? 'OPTIMAL' : 'DEGRADED',
      badgeType: (modelHealthStatus === 'GOOD' ? 'positive' : 'danger') as BadgeType,
      valueColor: modelHealthStatus === 'GOOD' ? 'var(--risk-low)' : 'var(--risk-high)',
      icon: Shield,
      source: 'Model Registry',
      freshness: 'V1.0 champion',
    },
    {
      title: 'SUPPLY CHAIN EXPOSURE',
      value: exposureStatus,
      status: hasHighRisk ? 'STRESS' : 'SECURE',
      badgeType: (hasHighRisk ? 'danger' : 'neutral') as BadgeType,
      valueColor: hasHighRisk ? 'var(--risk-high)' : 'var(--text-primary)',
      icon: Zap,
      source: 'India Exposure Blend',
      freshness: 'Real-time',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3.5 select-none font-manrope">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        const badgeStyle = getBadgeStyle(kpi.badgeType);
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.03 }}
            className="navy-card p-3.5 flex flex-col justify-between min-h-[110px] transition-all duration-150"
          >
            {/* Header */}
            <div className="flex justify-between items-start gap-2">
              <span
                className="text-[9px] font-bold tracking-wider uppercase font-jakarta"
                style={{ color: 'var(--text-muted)' }}
              >
                {kpi.title}
              </span>
              <div
                className="p-1 rounded border shrink-0"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-muted)',
                }}
              >
                <Icon className="w-3 h-3" />
              </div>
            </div>

            {/* Main Value */}
            <div className="my-1.5">
              <span
                className="text-lg font-bold font-space tracking-tight block"
                style={{ color: kpi.valueColor }}
              >
                {kpi.value}
              </span>
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded border mt-1 inline-block font-geist uppercase"
                style={badgeStyle}
              >
                {kpi.status}
              </span>
            </div>

            {/* Footer */}
            <div
              className="border-t pt-1.5 flex flex-col gap-0.5 text-[9px] font-geist"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              <span>SRC: {kpi.source}</span>
              <span>UPDATED: {kpi.freshness}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
