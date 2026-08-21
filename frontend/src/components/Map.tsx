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
    if (!risk) return '#9ca3af'; // gray-400
    switch (risk.risk_level) {
      case 'CRITICAL':
        return '#ef4444'; // red-500
      case 'HIGH':
        return '#f97316'; // orange-500
      case 'MODERATE':
        return '#eab308'; // yellow-500
      case 'LOW':
        return '#10b981'; // emerald-500
      default:
        return '#6b7280'; // gray-500
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

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
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
        radius: isSelected ? 18 : 12,
        fillColor: activeColor,
        color: isSelected ? '#ffffff' : activeColor,
        weight: isSelected ? 3 : 1,
        opacity: 1,
        fillOpacity: 0.6,
      });

      const risk = risks.find((r) => r.corridor === choke.id);
      const level = risk ? risk.risk_level : 'UNKNOWN';
      const prob = risk && risk.probability !== null ? `${(risk.probability * 100).toFixed(1)}%` : 'N/A';

      circle.bindTooltip(
        `<div class="text-xs font-semibold text-gray-200">
          <p class="font-bold text-white text-sm">${choke.name}</p>
          <p class="mt-1">Risk Level: <span class="uppercase font-extrabold" style="color: ${activeColor}">${level}</span></p>
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
      let iconColor = '#06b6d4'; // cyan-500 (Refinery)
      if (node.facility_type === 'port') iconColor = '#3b82f6'; // blue-500
      if (node.facility_type === 'spr') iconColor = '#a855f7'; // purple-500

      // Custom SVG dot icon
      const svgHtml = `
        <svg width="12" height="12" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
          <circle cx="5" cy="5" r="4" fill="${iconColor}" stroke="#ffffff" stroke-width="1" />
        </svg>
      `;

      const customIcon = L.divIcon({
        html: svgHtml,
        className: 'custom-leaflet-marker',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker([node.latitude, node.longitude], { icon: customIcon });

      const capacityText = node.capacity ? `${node.capacity} ${node.unit}` : 'Capacity Unavailable';

      marker.bindTooltip(
        `<div class="text-xs text-gray-300">
          <p class="font-bold text-white">${node.name}</p>
          <p class="capitalize">Type: ${node.facility_type} | Owner: ${node.operator}</p>
          <p>${capacityText}</p>
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
    <div className="relative w-full h-full min-h-[400px] bg-gray-950 rounded-lg overflow-hidden border border-gray-800">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Map Legend overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] glass-panel p-3 rounded-lg text-xs flex flex-col gap-2 max-w-[200px]">
        <p className="font-bold text-gray-300">Resilience Twin Legend</p>
        
        <div className="flex flex-col gap-1 text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span>LOW Corridor Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
            <span>MODERATE Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
            <span>HIGH Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
            <span>CRITICAL Risk</span>
          </div>
        </div>

        <hr className="border-gray-800 my-1" />

        <div className="flex flex-col gap-1 text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 border border-white inline-block" />
            <span>Indian Refineries</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white inline-block" />
            <span>Import Ports</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 border border-white inline-block" />
            <span>Strategic Reserves (SPR)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
