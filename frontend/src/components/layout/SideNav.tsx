import {
  Monitor,
  Layers,
  Sliders,
  TrendingUp,
  Activity,
  Award,
  HeartPulse,
  Lock,
  Compass
} from 'lucide-react';

interface SideNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export default function SideNav({ currentTab, onTabChange }: SideNavProps) {
  const menuItems = [
    { id: 'MONITOR', label: 'Monitor', icon: Monitor },
    { id: 'COMPARISON', label: 'Corridors', icon: Layers },
    { id: 'SCENARIO', label: 'Scenarios', icon: Sliders },
    { id: 'TRENDS', label: 'Trends', icon: TrendingUp },
    { id: 'INTELLIGENCE', label: 'Intelligence', icon: Compass },
    { id: 'MODELS', label: 'Models', icon: Activity },
    { id: 'GOVERNANCE', label: 'Governance', icon: Award },
    { id: 'OBSERVABILITY', label: 'Observability', icon: HeartPulse },
    { id: 'SECURITY', label: 'Security', icon: Lock },
  ];

  return (
    <aside className="w-full lg:w-64 shrink-0 bg-gray-950 border-r border-gray-900 flex flex-col justify-between py-6">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div className="px-4">
          <p className="text-[9px] font-mono font-bold tracking-widest text-gray-500 uppercase px-3 mb-3">
            COMMAND CHANNELS
          </p>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all duration-150 hover:cursor-pointer ${
                    isActive
                      ? 'bg-cyan-950/40 border border-cyan-800/30 text-cyan-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-900/40 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-gray-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sidebar Footer info */}
      <div className="px-6 text-[9px] font-mono text-gray-600 space-y-1 leading-normal border-t border-gray-900/60 pt-4 mt-6">
        <p>MARITIME THREAT MATRIX v2</p>
        <p>© INDIA SECURE SUPPLY Twin</p>
      </div>
    </aside>
  );
}
