import {
  Monitor,
  Layers,
  Sliders,
  TrendingUp,
  Compass,
  Activity,
  Award,
  HeartPulse,
  Lock,
} from 'lucide-react';

interface SideNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export default function SideNav({ currentTab, onTabChange }: SideNavProps) {
  const menuItems = [
    { id: 'MONITOR',       label: 'Monitor',       icon: Monitor },
    { id: 'COMPARISON',    label: 'Corridors',      icon: Layers },
    { id: 'SCENARIO',      label: 'Scenarios',      icon: Sliders },
    { id: 'TRENDS',        label: 'Trends',         icon: TrendingUp },
    { id: 'INTELLIGENCE',  label: 'Intelligence',   icon: Compass },
    { id: 'MODELS',        label: 'Models',         icon: Activity },
    { id: 'GOVERNANCE',    label: 'Governance',     icon: Award },
    { id: 'OBSERVABILITY', label: 'Observability',  icon: HeartPulse },
    { id: 'SECURITY',      label: 'Security',       icon: Lock },
  ];

  return (
    <aside
      className="w-full lg:w-56 shrink-0 flex flex-col justify-between py-4 select-none font-manrope border-r"
      style={{
        backgroundColor: 'var(--sidebar-bg)',
        borderColor: 'var(--border-default)',
      }}
    >
      <div>
        <div className="px-3 mb-1">
          <p
            className="text-[9px] font-bold tracking-widest uppercase px-2 mb-3 font-jakarta"
            style={{ color: 'var(--text-muted)' }}
          >
            Command Channels
          </p>
          <nav className="space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all duration-150 cursor-pointer"
                  style={
                    isActive
                      ? {
                          backgroundColor: 'var(--active-overlay)',
                          color: 'var(--accent)',
                          fontWeight: 700,
                          border: '1px solid var(--accent-muted)',
                        }
                      : {
                          backgroundColor: 'transparent',
                          color: 'var(--text-secondary)',
                          border: '1px solid transparent',
                        }
                  }
                  title={item.label}
                >
                  <Icon
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
                  />
                  <span className="font-manrope tracking-tight">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div
        className="mx-3 px-3 text-[9px] space-y-0.5 border-t pt-3.5 mt-4 font-geist"
        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
      >
        <p className="font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Maritime Threat Matrix v2.0
        </p>
        <p>© India Secure Supply Twin</p>
      </div>
    </aside>
  );
}
