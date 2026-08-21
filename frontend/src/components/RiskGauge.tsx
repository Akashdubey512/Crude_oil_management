import { motion } from 'framer-motion';

interface RiskGaugeProps {
  score: number | null;
  level: string;
  probability: number | null;
}

export default function RiskGauge({ score, level, probability }: RiskGaugeProps) {
  const displayScore = score !== null ? score : 0;
  const displayProb = probability !== null ? (probability * 100).toFixed(2) : 'N/A';

  // Determine active gauge/text color
  const getColor = () => {
    switch (level) {
      case 'CRITICAL':
        return 'text-red-500 border-red-500/20 bg-red-950/10';
      case 'HIGH':
        return 'text-orange-500 border-orange-500/20 bg-orange-950/10';
      case 'MODERATE':
        return 'text-yellow-500 border-yellow-500/20 bg-yellow-950/10';
      case 'LOW':
        return 'text-emerald-500 border-emerald-500/20 bg-emerald-950/10';
      default:
        return 'text-gray-500 border-gray-500/20 bg-gray-950/10';
    }
  };

  const getStrokeColor = () => {
    switch (level) {
      case 'CRITICAL':
        return '#ef4444';
      case 'HIGH':
        return '#f97316';
      case 'MODERATE':
        return '#eab308';
      case 'LOW':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  // SVG parameters
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  // Arc calculation for gauge (0 to 100)
  const strokeDashoffset = circumference - (Math.min(displayScore, 100) / 100) * circumference;

  return (
    <div className={`flex flex-col items-center justify-center p-6 rounded-xl border ${getColor()}`}>
      <span className="text-xs uppercase font-extrabold tracking-widest opacity-80 mb-4">Risk Threat Level</span>

      <div className="relative w-36 h-36 flex items-center justify-center">
        {/* SVG Circular Gauge */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="72"
            cy="72"
            r={radius}
            stroke="#1f2937"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <motion.circle
            cx="72"
            cy="72"
            r={radius}
            stroke={getStrokeColor()}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>

        {/* Gauge center stats */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold tracking-tight text-white">
            {score !== null ? `${displayScore.toFixed(0)}` : 'N/A'}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Score</span>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-lg font-black tracking-wide uppercase text-white">{level}</p>
        <p className="text-xs text-gray-400 mt-1">Disruption Probability: <span className="font-semibold text-white">{displayProb}%</span></p>
      </div>
    </div>
  );
}
