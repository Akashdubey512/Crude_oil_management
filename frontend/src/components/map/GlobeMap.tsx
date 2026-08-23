import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, X } from 'lucide-react';
import type { InfrastructureNode, RiskSnapshot } from '../../types';
import {
  CHOKEPOINTS, INDIA_NODES, EXPORT_HUBS, TRADE_ROUTES,
  getRiskInfo, fmtCoord,
} from './maritimeData';

interface GlobeMapProps {
  infrastructure?: InfrastructureNode[];
  risks: RiskSnapshot[];
  onSelectCorridor: (corridorId: string) => void;
  selectedCorridor: string | null;
}

// ─── Opacity hierarchy ───────────────────────────────────────────
const OPACITY = { selected: 1.0, related: 0.82, dimmed: 0.18, glow: 0.55 };

export default function GlobeMap({ risks, onSelectCorridor, selectedCorridor }: GlobeMapProps) {
  const mapRef          = useRef<HTMLDivElement>(null);
  const leafletMap      = useRef<L.Map | null>(null);
  const routeLayerRef   = useRef<L.LayerGroup | null>(null);
  const markerLayerRef  = useRef<L.LayerGroup | null>(null);

  const [coords,        setCoords]        = useState<{ lat: number; lng: number }>({ lat: 20.0, lng: 55.0 });
  const [zoomLevel,     setZoomLevel]     = useState<number>(4);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  const [simulatedRisk, setSimulatedRisk] = useState<Record<string, { probability: number; risk_level: string }> | null>(null);

  // ── Risk helpers (use centralized getRiskInfo) ─────────────────
  const getRiskForCorridor = useCallback((id: string) => {
    if (simulatedRisk && simulatedRisk[id]) {
      const sim = simulatedRisk[id];
      return getRiskInfo(sim.probability, sim.risk_level);
    }
    const snap = risks.find((r) => r.corridor === id);
    return getRiskInfo(snap?.probability, snap?.risk_level);
  }, [risks, simulatedRisk]);

  // ── Determine what is selected/related for route dimming ───────
  const getRouteVisibility = useCallback((routeId: string) => {
    if (!selectedCorridor && !selectedRoute) return 'normal';
    if (selectedRoute) {
      return routeId === selectedRoute ? 'selected' : 'dimmed';
    }
    // corridor selected → all routes through that corridor are "related"
    const route = TRADE_ROUTES.find((r) => r.id === routeId);
    if (!route) return 'dimmed';
    return route.corridorIds.includes(selectedCorridor!) ? 'related' : 'dimmed';
  }, [selectedCorridor, selectedRoute]);

  const tileLayerRef    = useRef<L.TileLayer | null>(null);

  // Dynamic Tile Layer Updater based on active HTML theme class
  const updateMapTiles = useCallback(() => {
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
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
  }, []);

  // ── Init map once ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center: [20.0, 55.0],
      zoom: 4,
      minZoom: 3,
      maxZoom: 9,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
    });
    leafletMap.current = map;

    updateMapTiles();

    map.on('mousemove', (e: L.LeafletMouseEvent) => setCoords({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.on('zoomend', () => setZoomLevel(map.getZoom()));

    // Click empty map → deselect
    map.on('click', () => {
      setSelectedRoute(null);
    });

    routeLayerRef.current  = L.layerGroup().addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);

    // Watch for theme class changes on <html>
    const observer = new MutationObserver(() => updateMapTiles());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      try {
        leafletMap.current?.remove();
      } catch {
        // Safe cleanup for headless/testing environments
      }
      leafletMap.current = null;
    };
  }, [updateMapTiles]);

  // ── Redraw routes whenever selection or risk changes ───────────
  useEffect(() => {
    const group = routeLayerRef.current;
    if (!group) return;
    group.clearLayers();

    TRADE_ROUTES.forEach((route) => {
      const vis = getRouteVisibility(route.id);
      const isSelected = vis === 'selected';
      const isDimmed   = vis === 'dimmed';

      const lineOpacity = isSelected ? OPACITY.selected : isDimmed ? OPACITY.dimmed : OPACITY.related;
      const weight      = isSelected ? 3.5 : isDimmed ? 1.2 : 2.2;

      // Glow halo (only for selected / related)
      if (!isDimmed) {
        L.polyline(route.path, {
          color: route.color,
          weight: isSelected ? 10 : 5,
          opacity: isSelected ? OPACITY.glow : 0.18,
          lineCap: 'round',
        }).addTo(group);
      }

      // Main route line
      const polyline = L.polyline(route.path, {
        color: route.color,
        weight,
        opacity: lineOpacity,
        className: isSelected ? 'animate-maritime-route-fast' : 'animate-maritime-route',
        lineCap: 'round',
        lineJoin: 'round',
      });

      polyline.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        setSelectedRoute((prev) => prev === route.id ? null : route.id);
        // Also select the corridor
        if (route.corridorIds[0]) onSelectCorridor(route.corridorIds[0]);
      });
      polyline.on('mouseover', () => polyline.setStyle({ weight: weight + 1.5 }));
      polyline.on('mouseout',  () => polyline.setStyle({ weight }));
      polyline.addTo(group);
    });
  }, [selectedCorridor, selectedRoute, getRouteVisibility, onSelectCorridor]);

  // ── Redraw markers whenever risk or selection changes ──────────
  useEffect(() => {
    const group = markerLayerRef.current;
    if (!group) return;
    group.clearLayers();

    // ── Export Hubs ───────────────────────────────────────────
    EXPORT_HUBS.forEach((hub) => {
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:10px;height:10px;display:flex;align-items:center;justify-content:center;">
            <div style="width:10px;height:10px;border-radius:50%;background:#55B7FF;border:1.5px solid #fff;
              box-shadow:0 0 8px rgba(85,183,255,0.6);"></div>
          </div>`,
        iconSize: [10, 10], iconAnchor: [5, 5],
      });
      const m = L.marker([hub.lat, hub.lng], { icon }).addTo(group);
      m.bindTooltip(`<div style="font-size:11px;font-weight:600;color:#55B7FF">${hub.name}</div>
        <div style="font-size:9px;color:#94a3b8">CRUDE EXPORT TERMINAL</div>`, { className: 'map-tooltip' });
    });

    // ── India Import Destinations — diamond markers ───────────
    INDIA_NODES.forEach((node) => {
      const isDestSelected = selectedRoute
        ? TRADE_ROUTES.find((r) => r.id === selectedRoute)?.destinationId === node.id
        : false;

      const glow = isDestSelected ? '0 0 14px rgba(52,211,153,0.9)' : '0 0 6px rgba(52,211,153,0.4)';
      const size = isDestSelected ? 12 : 9;

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;
            transform:rotate(45deg);background:#34d399;border:1.5px solid #fff;border-radius:2px;
            box-shadow:${glow};transition:all 0.2s;"></div>`,
        iconSize: [size, size], iconAnchor: [size / 2, size / 2],
      });
      const m = L.marker([node.lat, node.lng], { icon }).addTo(group);
      m.bindTooltip(`
        <div style="font-size:11px;font-weight:700;color:#34d399">${node.name}</div>
        <div style="font-size:9px;color:#94a3b8">${node.type} · ${node.cap}</div>
        <div style="font-size:9px;color:#64748b;margin-top:2px">${fmtCoord(node.lat,'lat')}  ${fmtCoord(node.lng,'lng')}</div>
      `, { className: 'map-tooltip' });
    });

    // ── Chokepoint Markers ────────────────────────────────────
    CHOKEPOINTS.forEach((cp) => {
      const risk = getRiskForCorridor(cp.id);
      const isSelected = selectedCorridor === cp.id;

      // Importance → node radius
      const baseR    = cp.importance * 4;
      const haloR    = isSelected ? baseR + 10 : baseR + 5;
      const midR     = isSelected ? baseR + 5  : baseR + 2;

      // Outer ambient halo
      L.circleMarker([cp.lat, cp.lng], {
        radius: haloR, fillColor: risk.color, color: risk.color,
        weight: 0, fillOpacity: 0.10,
      }).addTo(group);

      // Mid ring
      L.circleMarker([cp.lat, cp.lng], {
        radius: midR, fillColor: 'transparent', color: risk.color,
        weight: isSelected ? 1.5 : 0.8, opacity: 0.4, fillOpacity: 0,
      }).addTo(group);

      // Build marker HTML
      const probPct = risk.percentage;

      const markerHtml = `
        <div id="cp-${cp.id}" style="
          position:relative;width:${baseR * 2}px;height:${baseR * 2}px;
          display:flex;align-items:center;justify-content:center;cursor:pointer;">
          <!-- Core Node -->
          <div style="
            width:${baseR * 2}px;height:${baseR * 2}px;border-radius:50%;
            background:${risk.color}28;border:2px solid ${risk.color};
            box-shadow:0 0 ${isSelected ? 20 : 8}px ${risk.color}${isSelected ? 'cc' : '66'};
            display:flex;align-items:center;justify-content:center;
            transition:all 0.2s;transform:${isSelected ? 'scale(1.2)' : 'scale(1)'};
          ">
            <div style="width:${baseR * 0.7}px;height:${baseR * 0.7}px;border-radius:50%;background:${risk.color};"></div>
          </div>

          <!-- Label Badge -->
          <div style="
            position:absolute;left:calc(100% + 8px);top:50%;transform:translateY(-50%);
            background:rgba(6,11,19,0.96);border:1px solid ${risk.color}50;
            padding:3px 7px;border-radius:6px;white-space:nowrap;z-index:40;
            backdrop-filter:blur(6px);min-width:120px;
          ">
            <div style="font-size:11px;font-weight:700;color:#f1f5f9;font-family:'Space Grotesk',sans-serif;
              display:flex;align-items:center;gap:5px;">
              ${cp.name}
              ${isSelected ? `<span style="width:6px;height:6px;border-radius:50%;background:${risk.color};
                animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;display:inline-block;"></span>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:5px;margin-top:2px;">
              <span style="
                font-size:9px;font-weight:800;padding:1px 6px;border-radius:99px;
                background:${risk.bg};color:${risk.color};border:1px solid ${risk.border};
                font-family:'Geist',monospace;">
                ${risk.label}
              </span>
              <span style="font-size:10px;font-weight:700;color:${risk.color};font-family:'Geist',monospace;">
                ${probPct}
              </span>
              <span style="font-size:9px;color:#64748b;font-family:'Geist',monospace;">
                ${cp.volume}
              </span>
            </div>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: '',
        html: markerHtml,
        iconSize:   [baseR * 2, baseR * 2],
        iconAnchor: [baseR, baseR],
      });

      const marker = L.marker([cp.lat, cp.lng], { icon }).addTo(group);

      // Click → select corridor AND clear route selection
      marker.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        setSelectedRoute(null);
        onSelectCorridor(cp.id);
      });

      // Rich tooltip on hover
      const routeLabels = TRADE_ROUTES
        .filter((r) => r.corridorIds.includes(cp.id))
        .map((r) => `<div style="display:flex;align-items:center;gap:5px;margin-top:3px;">
            <div style="width:8px;height:2px;background:${r.color};border-radius:1px;flex-shrink:0;"></div>
            <span style="font-size:10px;color:#e2e8f0;">${r.label}</span>
          </div>`)
        .join('');

      marker.bindTooltip(`
        <div style="font-size:11px;font-weight:700;color:#f8fafc;margin-bottom:6px;font-family:'Space Grotesk',sans-serif;">${cp.name}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <span style="font-size:9px;font-weight:800;padding:1px 5px;border-radius:99px;background:${risk.bg};color:${risk.color};border:1px solid ${risk.border};">${risk.label}</span>
          <span style="font-size:11px;font-weight:700;color:${risk.color};">${probPct}</span>
        </div>
        <div style="font-size:9px;color:#64748b;margin-bottom:4px;font-family:'Geist',monospace;">
          ${fmtCoord(cp.lat, 'lat')}  ${fmtCoord(cp.lng, 'lng')}
        </div>
        <div style="font-size:9px;color:#94a3b8;">Flow: <strong style="color:#e2e8f0">${cp.volume}</strong></div>
        ${routeLabels ? `<div style="margin-top:5px;padding-top:5px;border-top:1px solid rgba(255,255,255,0.08);">${routeLabels}</div>` : ''}
      `, { className: 'map-tooltip', sticky: false, offset: [8, 0] });
    });

  }, [risks, selectedCorridor, selectedRoute, getRiskForCorridor, onSelectCorridor]);

  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(false);

  // ── Derived display values ─────────────────────────────────────
  const selectedCPInfo = selectedCorridor ? CHOKEPOINTS.find((c) => c.id === selectedCorridor) : null;
  const selectedCPRisk = selectedCorridor ? getRiskForCorridor(selectedCorridor) : null;

  const activeRoutesForCP = selectedCorridor
    ? TRADE_ROUTES.filter((r) => r.corridorIds.includes(selectedCorridor))
    : [];

  const selectedRouteInfo = selectedRoute ? TRADE_ROUTES.find((r) => r.id === selectedRoute) : null;

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-[#060b13] select-none font-manrope border border-slate-800/60">
      {/* Leaflet canvas */}
      <div ref={mapRef} className="w-full h-full z-0" />

      {/* ── TOP-LEFT: HUD Header & Threat Simulator Controls ── */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-[#060b13]/90 border border-slate-700/60 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-xl flex-wrap">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <div>
          <div className="text-[10px] font-black tracking-[0.14em] text-slate-200 uppercase font-space">TACTICAL MARITIME VECTOR MAP</div>
          <div className="text-[9px] text-slate-500 font-geist">
            Flow Analytics · <span className="text-emerald-400">{simulatedRisk ? 'Threat Scenario Active' : 'India Energy Routes Active'}</span>
          </div>
        </div>

        {/* Quick Threat Scenario Test Controls */}
        <div className="flex items-center gap-1 ml-3 border-l border-slate-800 pl-2 text-[9px] font-geist font-bold">
          <button
            onClick={() => setSimulatedRisk({ HORMUZ: { probability: 0.74, risk_level: 'HIGH' } })}
            className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/60 hover:bg-rose-900 transition cursor-pointer"
            title="Simulate HIGH risk (74%) on Strait of Hormuz"
          >
            ⚡ Test HIGH Risk
          </button>
          <button
            onClick={() => setSimulatedRisk({ RED_SEA: { probability: 0.48, risk_level: 'MODERATE' }, BAB_EL_MANDEB: { probability: 0.42, risk_level: 'MODERATE' } })}
            className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60 hover:bg-amber-900 transition cursor-pointer"
            title="Simulate MODERATE risk (48%) on Red Sea / Bab-el-Mandeb"
          >
            ⚡ Test MODERATE Risk
          </button>
          {simulatedRisk && (
            <button
              onClick={() => setSimulatedRisk(null)}
              className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── LEFT PANEL: Route Legend (collapsible, compact) ────── */}
      <div className="absolute top-16 left-3 z-10 bg-[#060b13]/92 border border-slate-700/60 backdrop-blur-md px-3 py-2 rounded-lg shadow-xl max-w-[180px] transition-all">
        <div className="flex items-center justify-between gap-3 mb-1 cursor-pointer" onClick={() => setIsLegendOpen(!isLegendOpen)}>
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 font-space">LEGEND</p>
          <span className="text-[9px] text-blue-400 font-geist font-bold">{isLegendOpen ? '▲ hide' : '▼ show'}</span>
        </div>

        {isLegendOpen && (
          <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-2">
            <p className="text-[8.5px] font-bold uppercase tracking-wider text-slate-500 font-space">ROUTES</p>
            {TRADE_ROUTES.map((route) => {
              const vis = getRouteVisibility(route.id);
              const isActive = vis === 'selected';
              return (
                <button
                  key={route.id}
                  onClick={() => {
                    setSelectedRoute((prev) => prev === route.id ? null : route.id);
                    if (route.corridorIds[0]) onSelectCorridor(route.corridorIds[0]);
                  }}
                  className="w-full flex items-center gap-2 py-1 px-1 rounded cursor-pointer transition-all text-left hover:bg-white/5"
                  style={{ opacity: vis === 'dimmed' ? 0.45 : 1 }}
                >
                  <div className="flex items-center gap-0.5 shrink-0">
                    <div className="h-[2px] w-3 rounded-full" style={{ backgroundColor: route.color }} />
                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: route.color }} />
                  </div>
                  <span className="text-[9px] font-medium leading-tight font-geist" style={{ color: isActive ? '#f8fafc' : '#94a3b8' }}>
                    {route.label}
                  </span>
                </button>
              );
            })}

            {/* Node type legend */}
            <div className="pt-1.5 border-t border-slate-800/80 space-y-1">
              <p className="text-[8.5px] font-bold uppercase tracking-wider text-slate-500 font-space">MARKERS</p>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0" style={{ background: 'rgba(239,91,91,0.3)', borderColor: '#EF5B5B' }} />
                <span className="text-[8.5px] text-slate-400 font-geist">Chokepoint (risk)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rotate-45 rounded-sm shrink-0" style={{ background: '#34d399' }} />
                <span className="text-[8.5px] text-slate-400 font-geist">India Import Node</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#55B7FF' }} />
                <span className="text-[8.5px] text-slate-400 font-geist">Export Hub (Gulf)</span>
              </div>
            </div>

            {/* Risk legend */}
            <div className="pt-1.5 border-t border-slate-800/80 space-y-1">
              <p className="text-[8.5px] font-bold uppercase tracking-wider text-slate-500 font-space">RISK BANDS</p>
              {[
                { label: 'LOW',      color: '#38D39F', range: '0–8%' },
                { label: 'MODERATE', color: '#F4B740', range: '8–25%' },
                { label: 'HIGH',     color: '#EF5B5B', range: '25–100%' },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: r.color }} />
                  <span className="text-[8.5px] font-semibold font-geist" style={{ color: r.color }}>{r.label}</span>
                  <span className="text-[8.5px] text-slate-500 font-geist ml-auto">{r.range}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: Selected Checkpoint Info ──────────────── */}
      {selectedCPInfo && selectedCPRisk && (
        <div className="absolute top-3 right-3 z-10 w-[220px] bg-[#060b13]/95 border backdrop-blur-md rounded-xl shadow-2xl overflow-hidden"
          style={{ borderColor: selectedCPRisk.color + '40' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b" style={{ borderColor: selectedCPRisk.color + '25', backgroundColor: selectedCPRisk.bg }}>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space">SELECTED CHECKPOINT</div>
              <div className="text-[13px] font-black text-white font-space leading-tight mt-0.5">{selectedCPInfo.name}</div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectCorridor('');
                setSelectedRoute(null);
              }}
              className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/20 transition"
              style={{ color: selectedCPRisk.color }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="px-3.5 py-3 space-y-3">
            {/* Risk probability bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 font-space">OPERATIONAL RISK</span>
                <span className="text-[11px] font-black font-geist" style={{ color: selectedCPRisk.color }}>{selectedCPRisk.percentage}</span>
              </div>
              <div className="text-[13px] font-black mb-1.5" style={{ color: selectedCPRisk.color }}>{selectedCPRisk.label}</div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: selectedCPRisk.percentage === 'N/A' ? '0%' : selectedCPRisk.percentage,
                    backgroundColor: selectedCPRisk.color,
                    boxShadow: `0 0 6px ${selectedCPRisk.color}88`,
                  }}
                />
              </div>
            </div>

            {/* Coordinates */}
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 font-space mb-1">COORDINATES</div>
              <div className="text-[11px] font-semibold font-geist text-slate-300">
                {fmtCoord(selectedCPInfo.lat, 'lat')} · {fmtCoord(selectedCPInfo.lng, 'lng')}
              </div>
            </div>

            {/* Flow */}
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 font-space mb-1">FLOW</div>
              <div className="text-[11px] font-semibold font-geist text-slate-200">{selectedCPInfo.volume}</div>
            </div>

            {/* Active routes */}
            {activeRoutesForCP.length > 0 && (
              <div>
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 font-space mb-1.5">
                  ACTIVE ROUTES ({activeRoutesForCP.length})
                </div>
                <div className="space-y-1.5">
                  {activeRoutesForCP.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRoute((prev) => prev === r.id ? null : r.id)}
                      className="w-full flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer transition-all text-left hover:bg-white/5"
                      style={{
                        backgroundColor: selectedRoute === r.id ? r.color + '18' : 'transparent',
                        borderLeft: `3px solid ${r.color}`,
                      }}
                    >
                      <span className="text-[10px] font-semibold font-geist text-slate-300 leading-tight">{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Status */}
            <div className="pt-1 border-t border-slate-800/80">
              <div className="text-[9px] text-slate-500 font-geist uppercase">Status · {selectedCPInfo.status}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP-RIGHT (when route selected): Route info ────────── */}
      {selectedRouteInfo && !selectedCPInfo && (
        <div className="absolute top-3 right-3 z-10 bg-[#060b13]/95 border border-slate-700/60 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-xl max-w-[200px]">
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 font-space mb-1">SELECTED ROUTE</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-[2px] rounded-full" style={{ backgroundColor: selectedRouteInfo.color, boxShadow: `0 0 6px ${selectedRouteInfo.color}` }} />
            <div className="text-[12px] font-bold text-white font-geist">{selectedRouteInfo.label}</div>
          </div>
          <div className="text-[9px] text-slate-500 font-geist mt-1">Click map to deselect</div>
        </div>
      )}

      {/* ── BOTTOM HUD BAR ─────────────────────────────────────── */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between bg-[#060b13]/90 border border-slate-700/60 backdrop-blur-md px-3.5 py-2 rounded-lg shadow-xl font-geist text-xs">
        <div className="flex items-center gap-4">
          {/* Cursor coords */}
          <div className="flex items-center gap-1.5">
            <Navigation className="w-3 h-3 text-slate-500" />
            <span className="text-slate-500 text-[10px] uppercase font-medium">CURSOR</span>
            <span className="font-semibold text-slate-200 text-[11px] tracking-wider">
              {fmtCoord(coords.lat, 'lat')} · {fmtCoord(coords.lng, 'lng')}
            </span>
          </div>
          {/* Zoom */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-slate-500 text-[10px] uppercase font-medium">ZOOM</span>
            <span className="font-semibold text-slate-300 text-[11px]">{zoomLevel}x</span>
          </div>
        </div>

        {/* Selection state or network info */}
        <div className="flex items-center gap-2">
          {selectedCPInfo ? (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[10px] uppercase font-medium">SELECTED</span>
              <span className="font-bold text-slate-100 text-[11px]">{selectedCPInfo.name.toUpperCase()}</span>
              {selectedCPRisk && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full font-geist"
                  style={{ background: selectedCPRisk.bg, color: selectedCPRisk.color, border: `1px solid ${selectedCPRisk.border}` }}>
                  {selectedCPRisk.label} {selectedCPRisk.percentage}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[10px] uppercase font-medium">NETWORK</span>
              <span className="font-semibold text-emerald-400 text-[11px]">{CHOKEPOINTS.length} CORRIDORS ACTIVE</span>
            </div>
          )}

          {/* Quick selector pills */}
          <div className="flex items-center gap-1.5 ml-2">
            {CHOKEPOINTS.map((cp) => {
              const risk = getRiskForCorridor(cp.id);
              const isSel = selectedCorridor === cp.id;
              const label = cp.id === 'HORMUZ' ? 'Hormuz'
                : cp.id === 'BAB_EL_MANDEB' ? 'Bab-el-Mandeb'
                : cp.id === 'SUEZ' ? 'Suez'
                : 'Red Sea';
              return (
                <button
                  key={cp.id}
                  onClick={() => { setSelectedRoute(null); onSelectCorridor(cp.id); }}
                  title={cp.name || label}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide transition-all duration-150 cursor-pointer border font-space whitespace-nowrap"
                  style={{
                    backgroundColor: isSel ? risk.bg : 'rgba(15,28,48,0.85)',
                    borderColor: isSel ? risk.color : 'rgba(71,85,105,0.6)',
                    color: isSel ? risk.color : '#94a3b8',
                    boxShadow: isSel ? `0 0 8px ${risk.color}40` : 'none',
                  }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: risk.color }} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
