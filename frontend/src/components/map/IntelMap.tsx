import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { InfrastructureNode, RiskSnapshot } from '../../types';
import LayerControls from './LayerControls';
import type { LayerState } from './LayerControls';
import { getRiskInfo } from './maritimeData';

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
    return getRiskInfo(risk?.probability, risk?.risk_level).color;
  };

  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const updateMapTiles = () => {
    const map = leafletMap.current;
    if (!map) return;
    const isLight = document.documentElement.classList.contains('theme-light');
    const tileUrl = isLight
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap &copy; CartoDB',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
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

    updateMapTiles();

    layerGroupRef.current = L.layerGroup().addTo(leafletMap.current);

    const observer = new MutationObserver(() => updateMapTiles());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
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

    // ── Route definitions with distinct unique colors ──
    const ROUTES = [
      {
        id: 'suez-bab-india',
        label: 'Suez / Red Sea → Bab-el-Mandeb → India',
        color: '#fb923c',       // Orange
        glowColor: 'rgba(251, 146, 60, 0.55)',
        path: [
          [29.98, 32.55], // Suez Canal
          [20.0,  38.5],  // Red Sea
          [12.58, 43.33], // Bab-el-Mandeb
          [11.8,  51.0],  // Gulf of Aden
          [14.0,  62.0],  // Arabian Sea
          [18.97, 72.82]  // West India
        ] as L.LatLngExpression[]
      },
      {
        id: 'hormuz-jamnagar',
        label: 'Hormuz → Jamnagar',
        color: '#38bdf8',       // Sky Blue
        glowColor: 'rgba(56, 189, 248, 0.55)',
        path: [
          [26.64, 50.16], // Ras Tanura Export Hub
          [26.57, 56.25], // Strait of Hormuz
          [24.5,  59.2],  // Gulf of Oman
          [20.5,  65.5],  // Arabian Sea
          [22.30, 69.80]  // Jamnagar / West India
        ] as L.LatLngExpression[]
      },
      {
        id: 'hormuz-kochi',
        label: 'Hormuz → Kochi / Mangalore',
        color: '#34d399',       // Emerald Green
        glowColor: 'rgba(52, 211, 153, 0.55)',
        path: [
          [26.57, 56.25], // Strait of Hormuz
          [25.12, 56.36], // Fujairah Hub
          [18.0,  64.0],  // Arabian Sea Central
          [12.91, 74.85], // Mangalore SPR
          [9.96,  76.26]  // Kochi Terminal
        ] as L.LatLngExpression[]
      },
      {
        id: 'hormuz-visakhapatnam',
        label: 'Hormuz → Visakhapatnam',
        color: '#c084fc',       // Purple
        glowColor: 'rgba(192, 132, 252, 0.55)',
        path: [
          [26.57, 56.25], // Strait of Hormuz
          [18.0,  64.0],  // Arabian Sea
          [9.96,  76.26], // Kochi Terminal
          [5.9,   80.5],  // South Sri Lanka Transit
          [12.0,  84.0],  // Bay of Bengal South
          [17.68, 83.21]  // Visakhapatnam SPR
        ] as L.LatLngExpression[]
      },
    ];

    // Layer: TRANSIT CORRIDORS (Polylines)
    if (layers.corridors) {
      ROUTES.forEach((route) => {
        // Glow backdrop
        L.polyline(route.path, {
          color: route.glowColor,
          weight: 5,
          opacity: 1,
          lineCap: 'round'
        }).addTo(group);

        // Main animated line
        L.polyline(route.path, {
          color: route.color,
          weight: 2,
          opacity: 0.85,
          className: 'animate-maritime-route',
          lineCap: 'round'
        }).addTo(group);
      });
    }

    // Layer: MARITIME TRAFFIC (Fast flow animation)
    if (layers.traffic) {
      ROUTES.forEach((route) => {
        L.polyline(route.path, {
          color: route.color,
          weight: 2.5,
          opacity: 0.9,
          className: 'animate-maritime-route-fast',
          lineCap: 'round'
        }).addTo(group);
      });
    }


    // Layer: CHOKEPOINT RISK
    if (layers.risk) {
      CHOKEPOINTS.forEach((choke) => {
        const riskColor = getRiskColor(choke.id);
        const isSelected = selectedCorridor === choke.id;

        // Outer glowing halo
        L.circleMarker([choke.lat, choke.lng], {
          radius: isSelected ? 22 : 14,
          fillColor: riskColor,
          color: riskColor,
          weight: 1,
          opacity: 0.4,
          fillOpacity: 0.2,
        }).addTo(group);

        const circle = L.circleMarker([choke.lat, choke.lng], {
          radius: isSelected ? 14 : 9,
          fillColor: riskColor,
          color: isSelected ? '#ffffff' : riskColor,
          weight: isSelected ? 2.5 : 1.5,
          opacity: 1,
          fillOpacity: 0.8,
        });

        const risk = risks.find((r) => r.corridor === choke.id);
        const level = risk ? risk.risk_level : 'UNKNOWN';
        const prob = risk && risk.probability !== null ? `${(risk.probability * 100).toFixed(1)}%` : 'N/A';

        const proxyLabel = choke.id === 'RED_SEA'
          ? '<p class="text-[9px] text-amber-400 font-medium border-t border-slate-800 pt-1 mt-1 font-mono">Bab el-Mandeb proxy</p>'
          : '';

        circle.bindTooltip(
          `<div class="text-[10px] font-geist text-slate-300 leading-normal select-none">
            <p class="font-bold text-white text-xs uppercase mb-1">${choke.name}</p>
            <p>RISK LEVEL: <span class="font-semibold uppercase" style="color: ${riskColor}">${level}</span></p>
            <p>PROBABILITY: <span class="text-white font-medium">${prob}</span></p>
            ${proxyLabel}
           </div>`,
          { direction: 'top', className: 'glass-panel p-2 border-0' }
        );

        circle.on('click', () => {
          onSelectCorridor(choke.id);
        });

        circle.addTo(group);

        // Layer: SYSTEM ALERTS
        if (layers.alerts && risk && (risk.risk_level === 'HIGH' || risk.risk_level === 'CRITICAL')) {
          L.circleMarker([choke.lat, choke.lng], {
            radius: isSelected ? 26 : 20,
            fillColor: 'transparent',
            color: '#f87171',
            weight: 1.5,
            opacity: 0.8,
            dashArray: '4, 6'
          }).addTo(group);
        }
      });
    }

    // Layer: INFRASTRUCTURE & PORTS markers
    infrastructure.forEach((node) => {
      const isPort = node.facility_type === 'port';
      const isSPR = node.facility_type === 'spr';

      if (isPort && !layers.ports) return;
      if (!isPort && !layers.infrastructure) return;

      let color = '#38bdf8'; // Refineries
      if (isPort) color = '#60a5fa'; // Ports
      if (isSPR) color = '#c084fc';  // SPR

      const svgHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 14px; height: 14px; border-radius: 50%; background: ${color}; opacity: 0.3; filter: blur(2px);"></div>
          <svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
            <circle cx="5" cy="5" r="4" fill="${color}" stroke="#ffffff" stroke-width="0.8" />
          </svg>
        </div>
      `;

      const customIcon = L.divIcon({
        html: svgHtml,
        className: 'custom-leaflet-marker',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([node.latitude, node.longitude], { icon: customIcon });
      const capacityText = node.capacity ? `${node.capacity} ${node.unit}` : 'Capacity: N/A';

      marker.bindTooltip(
        `<div class="text-[10px] font-geist text-slate-300 select-none">
          <p class="font-bold text-white text-xs uppercase mb-0.5">${node.name}</p>
          <p class="capitalize">TYPE: ${node.facility_type} | OPERATOR: ${node.operator}</p>
          <p class="text-blue-300 font-medium">${capacityText}</p>
         </div>`,
        { direction: 'top', className: 'glass-panel p-2 border-0' }
      );

      marker.addTo(group);
    });

    // Layer: GEOPOLITICAL EVENTS
    if (layers.events) {
      CHOKEPOINTS.forEach((choke) => {
        const risk = risks.find((r) => r.corridor === choke.id);
        if (risk && risk.risk_level !== 'LOW') {
          const alertSvg = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          `;

          const alertIcon = L.divIcon({
            html: alertSvg,
            className: 'geopolitical-incident-marker',
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          });

          const eventMarker = L.marker([choke.lat + 0.6, choke.lng - 0.6], { icon: alertIcon });
          eventMarker.bindTooltip(
            `<div class="text-[9px] font-geist text-rose-300 font-semibold">GEOPOLITICAL EVENT ZONE</div>`,
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
    <div className="relative w-full h-full min-h-[450px] bg-[#060b13] rounded-xl overflow-hidden border border-slate-800/80">
      {/* Map Element */}
      <div ref={mapRef} className="w-full h-full z-10" />

      {/* Floated Layer Toggle System */}
      <div className="absolute top-3.5 left-3.5 z-[1000]">
        <LayerControls layers={layers} onLayerToggle={handleLayerToggle} />
      </div>

      {/* Minimal Legend Info Overlay */}
      <div className="absolute bottom-3.5 left-3.5 z-[1000] bg-[#0a1322]/90 backdrop-blur-md px-3 py-2 rounded-lg text-[9px] font-geist text-slate-400 flex flex-col gap-1 max-w-[200px] border border-slate-800 shadow-xl">
        <span className="text-slate-300 font-semibold block mb-0.5 uppercase tracking-wide font-space">MAP LEGEND</span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-400 inline-block shadow-[0_0_6px_#f87171]" />
          <span>CHOKEPOINT THREAT</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded bg-sky-400 inline-block shadow-[0_0_6px_#38bdf8]" />
          <span>REFINERIES</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded bg-blue-400 inline-block shadow-[0_0_6px_#60a5fa]" />
          <span>IMPORT PORTS</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded bg-purple-400 inline-block shadow-[0_0_6px_#c084fc]" />
          <span>STRATEGIC STORAGE (SPR)</span>
        </div>
      </div>
    </div>
  );
}
