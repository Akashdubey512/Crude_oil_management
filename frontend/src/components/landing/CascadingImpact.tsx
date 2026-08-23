import { ArrowRight, AlertTriangle, Ship, Fuel, Factory, TrendingUp, ShieldCheck } from 'lucide-react';
import type { Theme } from '../../api/hooks/useTheme';

interface CascadingImpactProps {
  theme: Theme;
}

const STAGES = [
  {
    step: '01',
    title: 'GEOPOLITICAL EVENT',
    desc: 'Regional conflict escalation, naval blockades, or targeted sanctions triggered in maritime choke zones.',
    icon: AlertTriangle,
    color: '#EF5B5B',
  },
  {
    step: '02',
    title: 'MARITIME DISRUPTION',
    desc: 'Tanker rerouting around Cape of Good Hope, vessel delays (+14-21 days), and AIS anomaly spikes.',
    icon: Ship,
    color: '#F4B740',
  },
  {
    step: '03',
    title: 'CRUDE SUPPLY GAP',
    desc: 'Immediate seaborne crude import volume shortfall across major Indian port hubs (Jamnagar, Kochi).',
    icon: Fuel,
    color: '#5B8DEF',
  },
  {
    step: '04',
    title: 'REFINERY CONSTRAINT',
    desc: 'Crude blend throughput reduction, inventory drawdown at coastal refining clusters.',
    icon: Factory,
    color: '#6EA8FF',
  },
  {
    step: '05',
    title: 'PRICE PRESSURE',
    desc: 'Brent spot crude spike, freight rate surcharges, and spot market premium escalations.',
    icon: TrendingUp,
    color: '#F4B740',
  },
  {
    step: '06',
    title: 'STRATEGIC RESERVE IMPACT',
    desc: 'Mandatory activation of Strategic Petroleum Reserves (ISPRL Mangalore/Visakhapatnam) to preserve supply continuity.',
    icon: ShieldCheck,
    color: '#38D39F',
  },
];

export default function CascadingImpact({ theme }: CascadingImpactProps) {
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
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <div className="text-[10px] font-space font-bold uppercase tracking-[0.2em]"
            style={{ color: isDark ? '#5B8DEF' : '#356AE6' }}
          >
            CASCADING RISK DYNAMICS
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-space tracking-tight"
            style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}
          >
            One disruption. <br /> Multiple consequences.
          </h2>
          <p className="text-sm font-inter leading-relaxed"
            style={{ color: isDark ? '#94A3B8' : '#536274' }}
          >
            How a single geopolitical signal propagates through maritime trade lanes, crude supply chains, and domestic refining infrastructure.
          </p>
        </div>

        {/* Sequential Cascade Flow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {STAGES.map((st, idx) => {
            const IconComponent = st.icon;
            return (
              <div
                key={st.step}
                className="p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 shadow-sm font-manrope relative group"
                style={{
                  backgroundColor: isDark ? '#0D1624' : '#FFFFFF',
                  borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
                }}
              >
                {/* Step Index & Icon */}
                <div className="flex justify-between items-center mb-4">
                  <span className="font-geist font-bold text-xs px-2.5 py-1 rounded border"
                    style={{
                      backgroundColor: isDark ? '#08111C' : '#F5F7FA',
                      borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
                      color: st.color,
                    }}
                  >
                    STEP {st.step}
                  </span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: st.color + '15', color: st.color }}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>
                </div>

                {/* Title & Desc */}
                <h3 className="font-space font-bold text-sm tracking-wide mb-2 uppercase"
                  style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}
                >
                  {st.title}
                </h3>
                <p className="text-xs leading-relaxed font-inter"
                  style={{ color: isDark ? '#94A3B8' : '#536274' }}
                >
                  {st.desc}
                </p>

                {/* Flow indicator arrow for larger screens */}
                {idx < STAGES.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 opacity-30 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-blue-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
