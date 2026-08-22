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
      <div className="h-full flex items-center justify-center text-xs text-gray-500 font-mono">
        BRENT PRICE HISTORICAL DATA STREAM UNAVAILABLE
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
    <div className="w-full h-full font-mono text-[9px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="brent-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" opacity={0.4} />
          <XAxis dataKey="date" stroke="#4b5563" />
          <YAxis stroke="#4b5563" domain={['auto', 'auto']} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="glass-panel px-3 py-2 rounded-lg border border-gray-800 text-[10px] text-gray-300 leading-normal">
                    <p className="font-bold text-white mb-0.5">{item.date}</p>
                    <p>
                      BRENT CRUDE: <span className="font-black text-amber-500">${item.price.toFixed(2)}</span>
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
            stroke="#f59e0b"
            strokeWidth={1.8}
            fillOpacity={1}
            fill="url(#brent-gradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
