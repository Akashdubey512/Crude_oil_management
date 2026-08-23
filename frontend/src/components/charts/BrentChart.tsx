import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import type { BrentPriceResponse } from '../../types';

interface BrentChartProps {
  brentPrices: BrentPriceResponse | null;
}

export default function BrentChart({ brentPrices }: BrentChartProps) {
  if (!brentPrices || !brentPrices.historical_prices || brentPrices.historical_prices.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-slate-400 font-space uppercase tracking-wider">
        Brent Price Historical Data Stream Unavailable
      </div>
    );
  }

  const formattedData = [...brentPrices.historical_prices]
    .reverse() // Chronological
    .map((item) => ({
      date: item.date,
      price: item.price,
    }));

  return (
    <div className="w-full h-full font-geist text-[9px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="brent-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d97706" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border-default)" strokeDasharray="3 3" opacity={0.5} />
          <XAxis dataKey="date" stroke="var(--border-strong)" tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} />
          <YAxis stroke="var(--border-strong)" domain={['auto', 'auto']} tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="px-2.5 py-1.5 rounded-lg border shadow-md text-[10px] leading-normal font-geist"
                    style={{ backgroundColor: 'var(--text-primary)', borderColor: 'var(--text-primary)', color: '#FFFFFF' }}>
                    <p className="font-semibold mb-0.5">{item.date}</p>
                    <p>
                      BRENT CRUDE: <span className="font-bold text-amber-400">${item.price.toFixed(2)}</span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#d97706"
            strokeWidth={1.5}
            fillOpacity={1}
            fill="url(#brent-gradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
