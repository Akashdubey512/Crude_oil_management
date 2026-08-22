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
    <aside className="w-full lg:w-60 shrink-0 bg-white border-r border-slate-200/90 flex flex-col justify-between py-6 select-none font-manrope shadow-2xs">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div className="px-4">
          <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 mb-3 font-jakarta">
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
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sidebar Footer info */}
      <div className="px-6 text-[10px] text-slate-400 space-y-1 border-t border-slate-100 pt-4 mt-6 font-inter">
        <p className="font-bold text-slate-700">MARITIME THREAT MATRIX v2.0</p>
        <p>© INDIA SECURE SUPPLY TWIN</p>
      </div>
    </aside>
  );
}
