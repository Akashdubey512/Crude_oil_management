import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { InfrastructureNode, RiskSnapshot } from '../../types';
import LayerControls from './LayerControls';
import type { LayerState } from './LayerControls';

interface IntelMapProps {
  infrastructure: InfrastructureNode[];
  risks: RiskSnapshot[];
  onSelectCorridor: (corridorId: string) => void;
  selectedCorridor: string | null;
}

// Chokepoint centroids & names
const CHOKEPOINTS = [
  { id: 'HORMUZ', name: 'Strait of Hormuz', lat: 26.57, lng: 56.25 },
  { id: 'BAB_EL_MANDEB', name: 'Bab-el-Mandeb Strait', lat: 12.58, lng: 43.33 },
  { id: 'SUEZ', name: 'Suez Canal', lat: 29.98, lng: 32.55 },
  { id: 'RED_SEA', name: 'Red Sea', lat: 20.0, lng: 38.5 },
];

export default function IntelMap({
  infrastructure,
  risks,
  onSelectCorridor,
  selectedCorridor,
}: IntelMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Layer State management
  const [layers, setLayers] = useState<LayerState>({
    risk: true,
    traffic: true,
    infrastructure: true,
    ports: true,
    corridors: true,
    events: true,
    alerts: true,
  });

  const handleLayerToggle = (key: keyof LayerState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getRiskColor = (corridorId: string) => {
    const risk = risks.find((r) => r.corridor === corridorId);
    if (!risk) return '#9ca3af';
    switch (risk.risk_level) {
      case 'CRITICAL': return '#ef4444'; // Red
      case 'HIGH': return '#f97316';     // Orange
      case 'MODERATE': return '#f59e0b'; // Yellow
      case 'LOW': return '#10b981';      // Emerald
      default: return '#6b7280';
    }
  };

  // 1. Initialize Map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    leafletMap.current = L.map(mapRef.current, {
      center: [20.0, 58.0],
      zoom: 4,
      minZoom: 3,
      maxZoom: 9,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(leafletMap.current);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(leafletMap.current);

    layerGroupRef.current = L.layerGroup().addTo(leafletMap.current);

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // 2. Render Layers dynamically based on checkboxes and state variables
  useEffect(() => {
    const map = leafletMap.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // Layer: TRANSIT CORRIDORS (Polylines)
    if (layers.corridors) {
      // Suez -> Red Sea -> Bab el Mandeb -> West India (Port of Jamnagar / Mumbai coordinates: ~18.97, 72.82)
      const suezToIndiaRoute = [
        [29.98, 32.55], // Suez
        [20.0, 38.5],   // Red Sea
        [12.58, 43.33], // Bab el Mandeb
        [15.0, 55.0],   // Arabian Sea waypoint
        [18.97, 72.82]  // West India
      ] as L.LatLngExpression[];

      const hormuzToIndiaRoute = [
        [26.57, 56.25], // Hormuz
        [22.0, 64.0],   // Arabian Sea waypoint 2
        [18.97, 72.82]  // West India
      ] as L.LatLngExpression[];

      // Draw routes
      L.polyline(suezToIndiaRoute, {
        color: '#3b82f6',
        weight: 2,
        opacity: 0.4,
        dashArray: '5, 8'
      }).addTo(group);

      L.polyline(hormuzToIndiaRoute, {
        color: '#06b6d4',
        weight: 2,
        opacity: 0.4,
        dashArray: '5, 8'
      }).addTo(group);
    }

    // Layer: MARITIME TRAFFIC (Animated dashes simulated with brighter overlapping flow lines)
    if (layers.traffic) {
      const suezToIndiaRoute = [
        [29.98, 32.55], [20.0, 38.5], [12.58, 43.33], [15.0, 55.0], [18.97, 72.82]
      ] as L.LatLngExpression[];

      const hormuzToIndiaRoute = [
        [26.57, 56.25], [22.0, 64.0], [18.97, 72.82]
      ] as L.LatLngExpression[];

      L.polyline(suezToIndiaRoute, {
        color: '#60a5fa',
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 25'
      }).addTo(group);

      L.polyline(hormuzToIndiaRoute, {
        color: '#22d3ee',
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 25'
      }).addTo(group);
    }

    // Layer: CHOKEPOINT RISK
    if (layers.risk) {
      CHOKEPOINTS.forEach((choke) => {
        const riskColor = getRiskColor(choke.id);
        const isSelected = selectedCorridor === choke.id;

        const circle = L.circleMarker([choke.lat, choke.lng], {
          radius: isSelected ? 18 : 12,
          fillColor: riskColor,
          color: isSelected ? '#ffffff' : riskColor,
          weight: isSelected ? 3.5 : 1.5,
          opacity: 1,
          fillOpacity: 0.65,
        });

        const risk = risks.find((r) => r.corridor === choke.id);
        const level = risk ? risk.risk_level : 'UNKNOWN';
        const prob = risk && risk.probability !== null ? `${(risk.probability * 100).toFixed(1)}%` : 'N/A';

        // Red Sea Proxy Label where applicable
        const proxyLabel = choke.id === 'RED_SEA'
          ? '<p class="text-[9px] text-amber-500 font-bold border-t border-gray-800 pt-1 mt-1 font-mono">Bab el-Mandeb traffic proxy</p>'
          : '';

        circle.bindTooltip(
          `<div class="text-[10px] font-mono text-gray-300 leading-normal select-none">
            <p class="font-extrabold text-white text-xs uppercase mb-1">${choke.name}</p>
            <p>RISK LEVEL: <span class="font-black uppercase" style="color: ${riskColor}">${level}</span></p>
            <p>PROBABILITY: <span class="text-white font-bold">${prob}</span></p>
            ${proxyLabel}
           </div>`,
          { direction: 'top', className: 'glass-panel p-2.5 border-0' }
        );

        circle.on('click', () => {
          onSelectCorridor(choke.id);
        });

        circle.addTo(group);

        // Layer: SYSTEM ALERTS flashing rings on critical/high corridors
        if (layers.alerts && risk && (risk.risk_level === 'HIGH' || risk.risk_level === 'CRITICAL')) {
          L.circleMarker([choke.lat, choke.lng], {
            radius: isSelected ? 30 : 22,
            fillColor: 'transparent',
            color: '#ef4444',
            weight: 1.5,
            opacity: 0.8,
            dashArray: '3, 6'
          }).addTo(group);
        }
      });
    }

    // Layer: INFRASTRUCTURE & PORTS markers
    infrastructure.forEach((node) => {
      const isPort = node.facility_type === 'port';
      const isSPR = node.facility_type === 'spr';

      // Skip render if layer disabled
      if (isPort && !layers.ports) return;
      if (!isPort && !layers.infrastructure) return;

      let color = '#06b6d4'; // Cyan for Refinery
      if (isPort) color = '#3b82f6'; // Blue
      if (isSPR) color = '#a855f7';  // Purple

      const svgHtml = `
        <svg width="12" height="12" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
          <circle cx="5" cy="5" r="4" fill="${color}" stroke="#ffffff" stroke-width="0.8" />
        </svg>
      `;

      const customIcon = L.divIcon({
        html: svgHtml,
        className: 'custom-leaflet-marker',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker([node.latitude, node.longitude], { icon: customIcon });
      const capacityText = node.capacity ? `${node.capacity} ${node.unit}` : 'Capacity: N/A';

      marker.bindTooltip(
        `<div class="text-[10px] font-mono text-gray-300 select-none">
          <p class="font-extrabold text-white text-xs uppercase mb-0.5">${node.name}</p>
          <p class="capitalize">TYPE: ${node.facility_type} | OPERATOR: ${node.operator}</p>
          <p class="text-cyan-400 font-bold">${capacityText}</p>
         </div>`,
        { direction: 'top', className: 'glass-panel p-2 border-0' }
      );

      marker.addTo(group);
    });

    // Layer: GEOPOLITICAL EVENTS (Mark locations near active chokepoints)
    if (layers.events) {
      CHOKEPOINTS.forEach((choke) => {
        const risk = risks.find((r) => r.corridor === choke.id);
        // Highlight active event zones
        if (risk && risk.risk_level !== 'LOW') {
          const alertSvg = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          `;

          const alertIcon = L.divIcon({
            html: alertSvg,
            className: 'geopolitical-incident-marker',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          });

          // Offset slightly from centroid to avoid absolute overlap with corridor dot
          const eventMarker = L.marker([choke.lat + 0.8, choke.lng - 0.8], { icon: alertIcon });
          eventMarker.bindTooltip(
            `<div class="text-[9px] font-mono text-red-400 font-bold">GEOPOLITICAL EVENT ZONE</div>`,
            { direction: 'top', className: 'glass-panel p-1 border-0' }
          );
          eventMarker.addTo(group);
        }
      });
    }
  }, [infrastructure, risks, selectedCorridor, layers]);

  // 3. Zoom focus transition when selection changes
  useEffect(() => {
    const map = leafletMap.current;
    if (!map || !selectedCorridor) return;

    const target = CHOKEPOINTS.find((c) => c.id === selectedCorridor);
    if (target) {
      map.setView([target.lat, target.lng], 5, { animate: true });
    }
  }, [selectedCorridor]);

  return (
    <div className="relative w-full h-full min-h-[450px] bg-gray-950 rounded-xl overflow-hidden border border-gray-900/60">
      {/* Map Element */}
      <div ref={mapRef} className="w-full h-full z-10" />

      {/* Floated Layer Toggle System */}
      <div className="absolute top-4 left-4 z-[1000]">
        <LayerControls layers={layers} onLayerToggle={handleLayerToggle} />
      </div>

      {/* Minimal Legend Info Overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] glass-panel px-3 py-2 rounded-lg text-[9px] font-mono text-gray-400 flex flex-col gap-1 max-w-[200px] border border-gray-900">
        <span className="text-cyan-400 font-bold block mb-0.5">MAP LEGEND</span>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white inline-block" />
          <span>CHOKEPOINT THREAT</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded bg-cyan-500 inline-block" />
          <span>REFINERIES</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded bg-blue-500 inline-block" />
          <span>IMPORT PORTS</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded bg-purple-500 inline-block" />
          <span>STRATEGIC STORAGE (SPR)</span>
        </div>
      </div>
    </div>
  );
}
