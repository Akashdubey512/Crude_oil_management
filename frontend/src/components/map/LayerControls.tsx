import { Layers, Eye, EyeOff } from 'lucide-react';

export interface LayerState {
  risk: boolean;
  traffic: boolean;
  infrastructure: boolean;
  events: boolean;
  corridors: boolean;
  ports: boolean;
  alerts: boolean;
}

interface LayerControlsProps {
  layers: LayerState;
  onLayerToggle: (key: keyof LayerState) => void;
}

export default function LayerControls({ layers, onLayerToggle }: LayerControlsProps) {
  const layerList: { key: keyof LayerState; label: string; dotColor: string }[] = [
    { key: 'risk', label: 'Risk Indices', dotColor: 'var(--risk-high)' },
    { key: 'traffic', label: 'Maritime Traffic', dotColor: 'var(--info-blue)' },
    { key: 'infrastructure', label: 'Energy Infrastructure', dotColor: '#a855f7' },
    { key: 'ports', label: 'Import Ports', dotColor: '#38bdf8' },
    { key: 'corridors', label: 'Transit Corridors', dotColor: 'var(--risk-moderate)' },
    { key: 'events', label: 'Geopolitical Incidents', dotColor: 'var(--risk-high)' },
    { key: 'alerts', label: 'System Alerts', dotColor: '#ef4444' },
  ];

  return (
    <div
      className="p-3 rounded-lg border max-w-[210px] select-none text-[10px] font-geist backdrop-blur-md shadow-xl"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-default)',
        color: 'var(--text-primary)',
      }}
    >
      <div
        className="flex items-center gap-1.5 mb-2.5 font-semibold pb-1.5 font-space border-b"
        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
      >
        <Layers className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        <span>MAP LAYERS</span>
      </div>

      <div className="space-y-1.5">
        {layerList.map((layer) => {
          const isEnabled = layers[layer.key];
          return (
            <button
              key={layer.key}
              onClick={() => onLayerToggle(layer.key)}
              className="w-full flex items-center justify-between text-left p-1.5 rounded transition cursor-pointer hover:opacity-80"
              style={{
                backgroundColor: isEnabled ? 'var(--bg-secondary)' : 'transparent',
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: layer.dotColor }}
                />
                <span style={{ color: isEnabled ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: isEnabled ? 600 : 400 }}>
                  {layer.label}
                </span>
              </div>
              {isEnabled ? (
                <Eye className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-primary)' }} />
              ) : (
                <EyeOff className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
