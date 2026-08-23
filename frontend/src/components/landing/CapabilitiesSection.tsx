import { Shield, Cpu, Compass, Database, BarChart3, ArrowUpRight } from 'lucide-react';
import type { Theme } from '../../api/hooks/useTheme';

interface CapabilitiesSectionProps {
  theme: Theme;
  onEnterDashboard: (tab?: string) => void;
}

const CAPABILITIES = [
  {
    index: '01',
    title: 'GEOPOLITICAL RISK INTELLIGENCE',
    monitoring: ['GDELT News Feed', 'Sanctions Database', 'Maritime AIS Anomaly Signals', 'Chokepoint Risk Index'],
    outputLabel: 'Supply-Disruption Probability',
    outputValue: '88% Precision Risk Matrix',
    icon: Shield,
    tab: 'MONITOR',
    accent: '#5B8DEF',
  },
  {
    index: '02',
    title: 'DISRUPTION SCENARIO MODELER',
    monitoring: ['Strait of Hormuz Closure', 'Red Sea Conflict Escalation', 'Sanctions & Rerouting Delays', 'Brent Price Shock Multipliers'],
    outputLabel: 'Economic + Operational Impact',
    outputValue: '+$4.2M/day Landed Cost Delta',
    icon: Cpu,
    tab: 'SCENARIO',
    accent: '#F4B740',
  },
  {
    index: '03',
    title: 'ADAPTIVE PROCUREMENT ORCHESTRATOR',
    monitoring: ['Alternative Crude Suppliers', 'Cape Route Logistics', 'Tanker Freight Rate Index', 'Refinery Feedstock Specs'],
    outputLabel: 'Ranked Procurement Routes',
    outputValue: 'Optimized Alternate Sourcing Plan',
    icon: Compass,
    tab: 'COMPARISON',
    accent: '#38D39F',
  },
  {
    index: '04',
    title: 'STRATEGIC RESERVE OPTIMIZER',
    monitoring: ['ISPRL Reserve Storage Levels', 'National Crude Consumption Rate', 'Disruption Duration Threshold', 'Drawdown Strategy'],
    outputLabel: 'Optimal Reserve Drawdown',
    outputValue: '18-Day Buffer Protocol',
    icon: BarChart3,
    tab: 'TRENDS',
    accent: '#6EA8FF',
  },
  {
    index: '05',
    title: 'SUPPLY CHAIN DIGITAL TWIN',
    monitoring: ['Middle East Crude Export Hubs', '4 Maritime Chokepoints', '5 Indian Coastal Refineries', '4 Strategic Storage Sites'],
    outputLabel: 'Continuous What-If Analysis',
    outputValue: 'Real-time Digital Twin State',
    icon: Database,
    tab: 'MODELS',
    accent: '#EF5B5B',
  },
];

export default function CapabilitiesSection({ theme, onEnterDashboard }: CapabilitiesSectionProps) {
  const isDark = theme === 'dark';

  return (
    <section id="capabilities" className="py-20 border-b font-manrope theme-transition"
      style={{
        backgroundColor: isDark ? '#08111C' : '#FFFFFF',
        borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-14 space-y-3">
          <div className="text-[10px] font-space font-bold uppercase tracking-[0.2em]"
            style={{ color: isDark ? '#5B8DEF' : '#356AE6' }}
          >
            INTELLIGENCE ARCHITECTURE
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-space tracking-tight"
            style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}
          >
            From Signal to Decision.
          </h2>
          <p className="text-sm font-inter leading-relaxed"
            style={{ color: isDark ? '#94A3B8' : '#536274' }}
          >
            Five intelligence layers transform geopolitical uncertainty into executable supply-chain decisions.
          </p>
        </div>

        {/* 5 Editorial Feature Panels */}
        <div className="space-y-6">
          {CAPABILITIES.map((cap) => {
            const IconComponent = cap.icon;
            return (
              <div
                key={cap.index}
                onClick={() => onEnterDashboard(cap.tab)}
                className="p-6 sm:p-8 rounded-2xl border transition-all duration-300 hover:border-blue-500/40 cursor-pointer group theme-transition"
                style={{
                  backgroundColor: isDark ? '#0D1624' : '#F5F7FA',
                  borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
                }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  
                  {/* Index + Title */}
                  <div className="lg:col-span-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-geist font-black text-xl" style={{ color: cap.accent }}>
                        {cap.index}
                      </span>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: cap.accent + '15', color: cap.accent }}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="font-space font-bold text-base tracking-tight uppercase"
                      style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}
                    >
                      {cap.title}
                    </h3>
                  </div>

                  {/* Monitored Parameters */}
                  <div className="lg:col-span-5">
                    <div className="text-[10px] font-space font-bold uppercase tracking-wider mb-2"
                      style={{ color: isDark ? '#94A3B8' : '#536274' }}
                    >
                      MONITORED SIGNALS & INPUTS
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cap.monitoring.map((m, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-md text-[11px] font-geist border"
                          style={{
                            backgroundColor: isDark ? '#08111C' : '#FFFFFF',
                            borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
                            color: isDark ? '#94A3B8' : '#536274',
                          }}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Output Result Badge */}
                  <div className="lg:col-span-3 flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6"
                    style={{ borderColor: isDark ? '#1C2A3A' : '#D9E0E8' }}
                  >
                    <div className="text-left lg:text-right">
                      <div className="text-[10px] font-space font-bold uppercase tracking-wider"
                        style={{ color: isDark ? '#94A3B8' : '#536274' }}
                      >
                        OUTPUT: {cap.outputLabel}
                      </div>
                      <div className="font-geist font-bold text-xs mt-1" style={{ color: cap.accent }}>
                        {cap.outputValue}
                      </div>
                    </div>
                    <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" style={{ color: cap.accent }} />
                  </div>

                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
