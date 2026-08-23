import { useState } from 'react';
import { ArrowRight, Activity } from 'lucide-react';
import type { Theme } from '../../api/hooks/useTheme';

interface DigitalTwinNetworkProps {
  theme: Theme;
  onEnterDashboard: (tab?: string) => void;
}

const NODES = [
  { id: 'supplier', label: 'MIDDLE EAST EXPORTERS', sub: 'Saudi Arabia, UAE, Iraq, Kuwait', status: 'HEALTHY', color: '#38D39F' },
  { id: 'corridor', label: 'MARITIME SHIPPING LANES', sub: 'Persian Gulf & Red Sea Routes', status: 'HEALTHY', color: '#38D39F' },
  { id: 'chokepoint', label: 'STRATEGIC CHOKEPOINTS', sub: 'Hormuz, Bab-el-Mandeb, Suez', status: 'MONITORING', color: '#F4B740' },
  { id: 'refinery', label: 'INDIAN REFINERY CLUSTERS', sub: 'Jamnagar, Kochi, Visakhapatnam', status: 'HEALTHY', color: '#38D39F' },
  { id: 'demand', label: 'NATIONAL FUEL DEMAND', sub: 'Domestic Energy Supply Lines', status: 'SECURE', color: '#5B8DEF' },
];

export default function DigitalTwinNetwork({ theme, onEnterDashboard }: DigitalTwinNetworkProps) {
  const isDark = theme === 'dark';
  const [activeNode, setActiveNode] = useState<string>('chokepoint');

  return (
    <section className="py-20 border-b font-manrope theme-transition"
      style={{
        backgroundColor: isDark ? '#050A12' : '#F5F7FA',
        borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-14 gap-4">
          <div className="max-w-2xl space-y-3">
            <div className="text-[10px] font-space font-bold uppercase tracking-[0.2em]"
              style={{ color: isDark ? '#5B8DEF' : '#356AE6' }}
            >
              SUPPLY CHAIN DIGITAL TWIN
            </div>
            <h2 className="text-3xl sm:text-4xl font-black font-space tracking-tight"
              style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}
            >
              Model the network. <br /> Before the network breaks.
            </h2>
          </div>
          <button
            onClick={() => onEnterDashboard('MONITOR')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-space font-semibold text-xs text-white cursor-pointer"
            style={{ backgroundColor: isDark ? '#5B8DEF' : '#356AE6' }}
          >
            <span>Launch Interactive Twin</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Network Flow Diagram */}
        <div className="p-8 rounded-2xl border theme-transition"
          style={{
            backgroundColor: isDark ? '#0D1624' : '#FFFFFF',
            borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            {NODES.map((node, idx) => (
              <div key={node.id} className="relative">
                <div
                  onClick={() => setActiveNode(node.id)}
                  className={`p-5 rounded-xl border transition-all cursor-pointer ${
                    activeNode === node.id ? 'ring-2 ring-blue-500 scale-[1.03]' : 'hover:border-slate-500/40'
                  }`}
                  style={{
                    backgroundColor: isDark ? '#08111C' : '#F5F7FA',
                    borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
                  }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-geist font-bold px-1.5 py-0.5 rounded uppercase"
                      style={{ backgroundColor: node.color + '15', color: node.color }}
                    >
                      {node.status}
                    </span>
                    <Activity className="w-3.5 h-3.5" style={{ color: node.color }} />
                  </div>
                  <div className="font-space font-bold text-xs uppercase tracking-tight"
                    style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}
                  >
                    {node.label}
                  </div>
                  <div className="text-[10px] font-inter mt-1 leading-tight"
                    style={{ color: isDark ? '#94A3B8' : '#536274' }}
                  >
                    {node.sub}
                  </div>
                </div>

                {/* Arrow Connector */}
                {idx < NODES.length - 1 && (
                  <div className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 opacity-40">
                    <ArrowRight className="w-4 h-4" style={{ color: isDark ? '#94A3B8' : '#536274' }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Node Detail Bar */}
          <div className="mt-8 pt-6 border-t flex flex-col md:flex-row justify-between items-center text-xs font-geist gap-4"
            style={{ borderColor: isDark ? '#1C2A3A' : '#D9E0E8' }}
          >
            <div className="flex items-center gap-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">NETWORK LEGEND:</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Healthy
              </span>
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Elevated Risk
              </span>
              <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> Critical Disruption
              </span>
            </div>

            <div className="text-slate-400 font-inter text-[11px]">
              Click any node to inspect real-time digital twin parameters in Command Center.
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
