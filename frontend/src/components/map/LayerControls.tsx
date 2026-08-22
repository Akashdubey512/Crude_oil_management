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
  const layerList: { key: keyof LayerState; label: string; color: string }[] = [
    { key: 'risk', label: 'Risk Indices', color: 'bg-red-500' },
    { key: 'traffic', label: 'Maritime Traffic', color: 'bg-cyan-500' },
    { key: 'infrastructure', label: 'Energy Infrastructure', color: 'bg-purple-500' },
    { key: 'ports', label: 'Import Ports', color: 'bg-blue-500' },
    { key: 'corridors', label: 'Transit Corridors', color: 'bg-amber-500' },
    { key: 'events', label: 'Geopolitical Incidents', color: 'bg-rose-500' },
    { key: 'alerts', label: 'System Alerts', color: 'bg-red-600 animate-pulse' },
  ];

  return (
    <div className="glass-panel p-3.5 rounded-xl border border-gray-900/60 max-w-[220px] select-none text-[10px] font-mono">
      <div className="flex items-center gap-2 mb-3 text-cyan-400 font-bold border-b border-gray-900 pb-2">
        <Layers className="w-3.5 h-3.5" />
        <span>MAP LAYERS</span>
      </div>

      <div className="space-y-2">
        {layerList.map((layer) => {
          const isEnabled = layers[layer.key];
          return (
            <button
              key={layer.key}
              onClick={() => onLayerToggle(layer.key)}
              className="w-full flex items-center justify-between text-left hover:bg-gray-900/50 p-1.5 rounded transition hover:cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${layer.color} shrink-0`} />
                <span className={isEnabled ? 'text-gray-200 font-bold' : 'text-gray-500'}>
                  {layer.label}
                </span>
              </div>
              {isEnabled ? (
                <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-gray-600 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
