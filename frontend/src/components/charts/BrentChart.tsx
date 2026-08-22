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
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" opacity={0.7} />
          <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 9, fill: '#94a3b8' }} />
          <YAxis stroke="#94a3b8" domain={['auto', 'auto']} tick={{ fontSize: 9, fill: '#94a3b8' }} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-lg text-[10px] text-slate-700 leading-normal font-geist">
                    <p className="font-extrabold text-slate-900 mb-0.5">{item.date}</p>
                    <p>
                      BRENT CRUDE: <span className="font-black text-orange-600">${item.price.toFixed(2)}</span>
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
            stroke="#f97316"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#brent-gradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
