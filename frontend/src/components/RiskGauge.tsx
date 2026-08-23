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
        return 'text-rose-300 border-rose-800/40 bg-rose-950/20';
      case 'HIGH':
        return 'text-amber-300 border-amber-800/40 bg-amber-950/20';
      case 'MODERATE':
        return 'text-amber-300 border-amber-800/40 bg-amber-950/20';
      case 'LOW':
        return 'text-emerald-300 border-emerald-800/40 bg-emerald-950/20';
      default:
        return 'text-slate-400 border-slate-700/40 bg-slate-800/20';
    }
  };

  const getStrokeColor = () => {
    switch (level) {
      case 'CRITICAL':
        return '#f87171';
      case 'HIGH':
        return '#fb923c';
      case 'MODERATE':
        return '#fbbf24';
      case 'LOW':
        return '#34d399';
      default:
        return '#64748b';
    }
  };

  // SVG parameters
  const radius = 56;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  // Arc calculation for gauge (0 to 100)
  const strokeDashoffset = circumference - (Math.min(displayScore, 100) / 100) * circumference;

  return (
    <div className={`flex flex-col items-center justify-center p-5 rounded-xl border ${getColor()}`}>
      <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 mb-3">Risk Threat Level</span>

      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* SVG Circular Gauge */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <motion.circle
            cx="64"
            cy="64"
            r={radius}
            stroke={getStrokeColor()}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </svg>

        {/* Gauge center stats */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold tracking-tight text-white font-space">
            {score !== null ? `${displayScore.toFixed(0)}` : 'N/A'}
          </span>
          <span className="text-[9px] uppercase font-medium tracking-wider opacity-60">Score</span>
        </div>
      </div>

      <div className="mt-3 text-center">
        <p className="text-sm font-bold tracking-wide uppercase text-slate-200 font-space">{level}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Disruption Probability: <span className="font-semibold text-slate-200">{displayProb}%</span></p>
      </div>
    </div>
  );
}
