import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import type { CalibrationInfo } from '../../types';

interface CalibrationChartProps {
  calibration: CalibrationInfo | null;
}

export default function CalibrationChart({ calibration }: CalibrationChartProps) {
  if (!calibration || !calibration.curve || calibration.curve.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-gray-500 font-mono">
        NO MODEL CALIBRATION STATISTICS LOADED
      </div>
    );
  }

  // Map data and create perfect diagonal line data points
  // Midpoints: 0.1, 0.3, 0.5, 0.7, 0.9
  const chartData = calibration.curve.map((bin) => ({
    midpoint: bin.bin_midpoint,
    predicted: bin.predicted_prob,
    observed: bin.observed_freq,
    perfect: bin.bin_midpoint, // Ideal calibration line (y = x)
  }));

  return (
    <div className="w-full h-full font-mono text-[9px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 15, left: -25, bottom: 5 }}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" opacity={0.4} />
          <XAxis
            dataKey="midpoint"
            type="number"
            domain={[0, 1]}
            stroke="#4b5563"
            tickFormatter={(tick) => tick.toFixed(1)}
          />
          <YAxis
            type="number"
            domain={[0, 1]}
            stroke="#4b5563"
            tickFormatter={(tick) => tick.toFixed(1)}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="glass-panel px-3 py-2 rounded-lg border border-gray-800 text-[10px] text-gray-300 leading-normal">
                    <p className="font-bold text-white mb-1">Bin Midpoint: {item.midpoint.toFixed(2)}</p>
                    <p>PREDICTED: <span className="font-bold text-cyan-400">{(item.predicted * 100).toFixed(1)}%</span></p>
                    <p>OBSERVED: <span className="font-bold text-emerald-400">{(item.observed * 100).toFixed(1)}%</span></p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend wrapperStyle={{ fontSize: '8px' }} />
          <Line
            name="Perfect Calibration"
            type="monotone"
            dataKey="perfect"
            stroke="#4b5563"
            strokeWidth={1.2}
            strokeDasharray="4 4"
            dot={false}
          />
          <Line
            name="Observed Frequency"
            type="monotone"
            dataKey="observed"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4, fill: '#10b981', stroke: '#ffffff', strokeWidth: 1 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
