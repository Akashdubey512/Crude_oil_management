import { Radio, Cpu, Activity, BarChart3, Compass, CheckCircle2 } from 'lucide-react';
import type { Theme } from '../../api/hooks/useTheme';

interface DecisionTimelineProps {
  theme: Theme;
}

const STEPS = [
  {
    step: 'T+00h',
    title: 'SIGNAL DETECTED',
    desc: 'GDELT news escalation & PortWatch vessel anomaly detected in chokepoint zone.',
    icon: Radio,
    color: '#EF5B5B',
  },
  {
    step: 'T+02h',
    title: 'RISK MODEL UPDATED',
    desc: 'XGBoost ensemble model recalculates daily risk probability & 5-vector breakdown.',
    icon: Cpu,
    color: '#F4B740',
  },
  {
    step: 'T+04h',
    title: 'SCENARIO SIMULATED',
    desc: 'Automated 30-day disruption stress test computes landed cost delta & supply gap.',
    icon: Activity,
    color: '#5B8DEF',
  },
  {
    step: 'T+06h',
    title: 'SUPPLY GAP FORECAST',
    desc: 'National crude import deficit projected across Jamnagar & Kochi refinery feeds.',
    icon: BarChart3,
    color: '#6EA8FF',
  },
  {
    step: 'T+08h',
    title: 'ALTERNATIVE ROUTES RANKED',
    desc: 'Sourcing optimizer evaluates West Africa & Cape route rerouting options.',
    icon: Compass,
    color: '#38D39F',
  },
  {
    step: 'T+12h',
    title: 'RECOMMENDATION READY',
    desc: 'Executable procurement & SPR drawdown strategy delivered to decision-makers.',
    icon: CheckCircle2,
    color: '#38D39F',
  },
];

export default function DecisionTimeline({ theme }: DecisionTimelineProps) {
  const isDark = theme === 'dark';

  return (
    <section className="py-20 border-b font-manrope theme-transition"
      style={{
        backgroundColor: isDark ? '#050A12' : '#F5F7FA',
        borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-14 space-y-3">
          <div className="text-[10px] font-space font-bold uppercase tracking-[0.2em]"
            style={{ color: isDark ? '#5B8DEF' : '#356AE6' }}
          >
            DECISION WORKFLOW TIMELINE
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-space tracking-tight"
            style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}
          >
            From geopolitical signal to procurement decision.
          </h2>
          <p className="text-sm font-inter leading-relaxed"
            style={{ color: isDark ? '#94A3B8' : '#536274' }}
          >
            Automated intelligence workflow accelerating critical supply-chain response times from days to hours.
          </p>
        </div>

        {/* Timeline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {STEPS.map((s) => {
            const IconComponent = s.icon;
            return (
              <div
                key={s.step}
                className="p-6 rounded-2xl border transition-all duration-300 theme-transition"
                style={{
                  backgroundColor: isDark ? '#0D1624' : '#FFFFFF',
                  borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
                }}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="font-geist font-bold text-xs px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: isDark ? '#08111C' : '#F5F7FA',
                      borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
                      color: s.color,
                    }}
                  >
                    {s.step}
                  </span>
                  <IconComponent className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <h3 className="font-space font-bold text-xs uppercase tracking-wider mb-2"
                  style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}
                >
                  {s.title}
                </h3>
                <p className="text-xs font-inter leading-relaxed"
                  style={{ color: isDark ? '#94A3B8' : '#536274' }}
                >
                  {s.desc}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
