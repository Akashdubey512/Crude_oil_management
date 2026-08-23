import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { InfrastructureNode, RiskSnapshot } from '../types';

interface MapProps {
  infrastructure: InfrastructureNode[];
  risks: RiskSnapshot[];
  onSelectCorridor: (corridorId: string) => void;
  selectedCorridor: string | null;
}

// Chokepoint centroids
const CHOKEPOINTS = [
  { id: 'HORMUZ', name: 'Strait of Hormuz', lat: 26.57, lng: 56.25, color: '#f43f5e' },
  { id: 'BAB_EL_MANDEB', name: 'Bab-el-Mandeb Strait', lat: 12.58, lng: 43.33, color: '#ef4444' },
  { id: 'SUEZ', name: 'Suez Canal', lat: 29.98, lng: 32.55, color: '#f97316' },
  { id: 'RED_SEA', name: 'Red Sea', lat: 20.0, lng: 38.5, color: '#eab308' },
];

export default function Map({
  infrastructure,
  risks,
  onSelectCorridor,
  selectedCorridor,
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);

  // Helper to resolve risk color
  const getRiskColor = (corridorId: string) => {
    const risk = risks.find((r) => r.corridor === corridorId);
    if (!risk) return '#94a3b8';
    switch (risk.risk_level) {
      case 'CRITICAL':
        return '#f87171'; // red
      case 'HIGH':
        return '#fb923c'; // orange
      case 'MODERATE':
        return '#fbbf24'; // yellow
      case 'LOW':
        return '#34d399'; // emerald
      default:
        return '#64748b';
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    // Centered between Middle East and India
    leafletMap.current = L.map(mapRef.current, {
      center: [20.0, 58.0],
      zoom: 4,
      minZoom: 3,
      maxZoom: 10,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(leafletMap.current);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CartoDB',
    }).addTo(leafletMap.current);

    markersLayer.current = L.layerGroup().addTo(leafletMap.current);

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Render corridors and infrastructure markers dynamically
  useEffect(() => {
    const map = leafletMap.current;
    const layer = markersLayer.current;
    if (!map || !layer) return;

    layer.clearLayers();

    // 1. Draw corridors (interactive circles)
    CHOKEPOINTS.forEach((choke) => {
      const activeColor = getRiskColor(choke.id);
      const isSelected = selectedCorridor === choke.id;

      const circle = L.circleMarker([choke.lat, choke.lng], {
        radius: isSelected ? 16 : 10,
        fillColor: activeColor,
        color: isSelected ? '#ffffff' : activeColor,
        weight: isSelected ? 2.5 : 1,
        opacity: 1,
        fillOpacity: 0.6,
      });

      const risk = risks.find((r) => r.corridor === choke.id);
      const level = risk ? risk.risk_level : 'UNKNOWN';
      const prob = risk && risk.probability !== null ? `${(risk.probability * 100).toFixed(1)}%` : 'N/A';

      circle.bindTooltip(
        `<div class="text-xs font-medium text-slate-200 font-geist">
          <p class="font-bold text-white text-xs mb-0.5">${choke.name}</p>
          <p>Risk Level: <span class="uppercase font-semibold" style="color: ${activeColor}">${level}</span></p>
          <p>Disruption Prob: ${prob}</p>
         </div>`,
        { direction: 'top', className: 'glass-panel p-2 border-0' }
      );

      circle.on('click', () => {
        onSelectCorridor(choke.id);
      });

      circle.addTo(layer);
    });

    // 2. Draw India infrastructure markers
    infrastructure.forEach((node) => {
      let iconColor = '#38bdf8'; // Refinery
      if (node.facility_type === 'port') iconColor = '#60a5fa'; // Port
      if (node.facility_type === 'spr') iconColor = '#c084fc'; // SPR

      const svgHtml = `
        <svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
          <circle cx="5" cy="5" r="4" fill="${iconColor}" stroke="#ffffff" stroke-width="0.8" />
        </svg>
      `;

      const customIcon = L.divIcon({
        html: svgHtml,
        className: 'custom-leaflet-marker',
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });

      const marker = L.marker([node.latitude, node.longitude], { icon: customIcon });

      const capacityText = node.capacity ? `${node.capacity} ${node.unit}` : 'Capacity Unavailable';

      marker.bindTooltip(
        `<div class="text-xs text-slate-300 font-geist">
          <p class="font-bold text-white text-xs mb-0.5">${node.name}</p>
          <p class="capitalize">Type: ${node.facility_type} | Owner: ${node.operator}</p>
          <p class="text-blue-300 font-medium">${capacityText}</p>
         </div>`,
        { direction: 'top', className: 'glass-panel p-2 border-0' }
      );

      marker.addTo(layer);
    });
  }, [infrastructure, risks, selectedCorridor]);

  // Center on corridor if selection changes
  useEffect(() => {
    const map = leafletMap.current;
    if (!map || !selectedCorridor) return;

    const target = CHOKEPOINTS.find((c) => c.id === selectedCorridor);
    if (target) {
      map.setView([target.lat, target.lng], 5, { animate: true });
    }
  }, [selectedCorridor]);

  return (
    <div className="relative w-full h-full min-h-[400px] bg-[#060b13] rounded-xl overflow-hidden border border-slate-800/80">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Map Legend overlay */}
      <div className="absolute bottom-3.5 left-3.5 z-[1000] bg-[#0a1322]/90 backdrop-blur-md p-3 rounded-lg text-xs flex flex-col gap-1.5 max-w-[200px] border border-slate-800 font-geist">
        <p className="font-semibold text-slate-300 text-[10px] uppercase tracking-wide">Resilience Twin Legend</p>
        
        <div className="flex flex-col gap-1 text-slate-400 text-[10px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>LOW Corridor Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span>MODERATE Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
            <span>HIGH Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
            <span>CRITICAL Risk</span>
          </div>
        </div>

        <hr className="border-slate-800 my-1" />

        <div className="flex flex-col gap-1 text-slate-400 text-[10px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 border border-white inline-block" />
            <span>Indian Refineries</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 border border-white inline-block" />
            <span>Import Ports</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400 border border-white inline-block" />
            <span>Strategic Reserves (SPR)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
