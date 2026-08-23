import L from 'leaflet';

// ═══════════════════════════════════════════════════════════════════
// RISK THRESHOLD SYSTEM — Single Source of Truth
// ═══════════════════════════════════════════════════════════════════
export const RISK_THRESHOLDS = {
  LOW:      { min: 0.00, max: 0.08, label: 'LOW',      color: '#38D39F', bg: 'rgba(56,211,159,0.15)',  border: 'rgba(56,211,159,0.4)'  },
  MODERATE: { min: 0.08, max: 0.25, label: 'MODERATE', color: '#F4B740', bg: 'rgba(244,183,64,0.15)',  border: 'rgba(244,183,64,0.4)'  },
  HIGH:     { min: 0.25, max: 1.01, label: 'HIGH',     color: '#EF5B5B', bg: 'rgba(239,91,91,0.15)',   border: 'rgba(239,91,91,0.4)'   },
  UNKNOWN:  { min: 0,    max: 0,    label: 'UNKNOWN',  color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  border: 'rgba(96,165,250,0.4)'  },
};

export interface RiskInfo {
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'UNKNOWN';
  label: string;
  color: string;
  bg: string;
  border: string;
  percentage: string;
}

/** Classify risk probability (0–1 or 0–100) or explicit risk_level into single source of truth RiskInfo. */
export function getRiskInfo(probability: number | null | undefined, riskLevel?: string): RiskInfo {
  if (probability == null || isNaN(probability as number)) {
    if (riskLevel && riskLevel !== 'UNKNOWN') {
      const lvl = (riskLevel === 'CRITICAL' ? 'HIGH' : riskLevel) as 'LOW' | 'MODERATE' | 'HIGH';
      const cfg = RISK_THRESHOLDS[lvl] || RISK_THRESHOLDS.LOW;
      return { level: lvl, label: lvl, color: cfg.color, bg: cfg.bg, border: cfg.border, percentage: 'N/A' };
    }
    return { level: 'UNKNOWN', label: 'UNKNOWN', color: '#60a5fa', bg: RISK_THRESHOLDS.UNKNOWN.bg, border: RISK_THRESHOLDS.UNKNOWN.border, percentage: 'N/A' };
  }

  let p = probability;
  if (p > 1.0) p = p / 100.0;

  const pctVal = p * 100;
  let pct: string;
  if (pctVal === 0) {
    pct = '0%';
  } else if (pctVal < 1.0) {
    pct = `${pctVal.toFixed(2)}%`;
  } else {
    pct = `${Math.round(pctVal)}%`;
  }

  if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
    return { level: 'HIGH', label: 'HIGH', color: RISK_THRESHOLDS.HIGH.color, bg: RISK_THRESHOLDS.HIGH.bg, border: RISK_THRESHOLDS.HIGH.border, percentage: pct };
  }
  if (riskLevel === 'MODERATE') {
    return { level: 'MODERATE', label: 'MODERATE', color: RISK_THRESHOLDS.MODERATE.color, bg: RISK_THRESHOLDS.MODERATE.bg, border: RISK_THRESHOLDS.MODERATE.border, percentage: pct };
  }

  if (p >= RISK_THRESHOLDS.HIGH.min) {
    return { level: 'HIGH', label: 'HIGH', color: RISK_THRESHOLDS.HIGH.color, bg: RISK_THRESHOLDS.HIGH.bg, border: RISK_THRESHOLDS.HIGH.border, percentage: pct };
  }
  if (p >= RISK_THRESHOLDS.MODERATE.min) {
    return { level: 'MODERATE', label: 'MODERATE', color: RISK_THRESHOLDS.MODERATE.color, bg: RISK_THRESHOLDS.MODERATE.bg, border: RISK_THRESHOLDS.MODERATE.border, percentage: pct };
  }
  return { level: 'LOW', label: 'LOW', color: RISK_THRESHOLDS.LOW.color, bg: RISK_THRESHOLDS.LOW.bg, border: RISK_THRESHOLDS.LOW.border, percentage: pct };
}

/** Format a decimal coord as: 25.36° N */
export function fmtCoord(val: number, axis: 'lat' | 'lng'): string {
  const abs = Math.abs(val).toFixed(2);
  const dir = axis === 'lat' ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W');
  return `${abs}° ${dir}`;
}

// ═══════════════════════════════════════════════════════════════════
// CHOKEPOINTS — Geographic centroids + metadata
// ═══════════════════════════════════════════════════════════════════
export const CHOKEPOINTS = [
  { id: 'HORMUZ',       name: 'Strait of Hormuz',        lat: 26.57, lng: 56.25, volume: '20.5M bpd', importance: 4, status: 'CRITICAL CHOKEPOINT'  },
  { id: 'BAB_EL_MANDEB',name: 'Bab-el-Mandeb Strait',    lat: 12.58, lng: 43.33, volume: '6.2M bpd',  importance: 3, status: 'HIGH THREAT CORRIDOR'  },
  { id: 'SUEZ',         name: 'Suez Canal',               lat: 29.98, lng: 32.55, volume: '5.5M bpd',  importance: 2, status: 'MEDITERRANEAN LINK'    },
  { id: 'RED_SEA',      name: 'Red Sea Corridor',         lat: 20.0,  lng: 38.5,  volume: '8.8M bpd',  importance: 3, status: 'MARITIME CHOKEPOINT'   },
] as const;

export type ChokepointId = typeof CHOKEPOINTS[number]['id'];

// ═══════════════════════════════════════════════════════════════════
// INDIA IMPORT DESTINATIONS
// ═══════════════════════════════════════════════════════════════════
export const INDIA_NODES = [
  { id: 'jamnagar',       name: 'Jamnagar Refinery',       shortName: 'Jamnagar',       lat: 22.30, lng: 69.80, type: 'REFINERY', cap: '1.24M bpd' },
  { id: 'kochi',          name: 'Kochi Terminal',           shortName: 'Kochi',          lat: 9.96,  lng: 76.26, type: 'PORT',     cap: '310K bpd'  },
  { id: 'mangalore',      name: 'Mangalore SPR',            shortName: 'Mangalore',      lat: 12.91, lng: 74.85, type: 'SPR',      cap: '1.5Mt'     },
  { id: 'visakhapatnam',  name: 'Visakhapatnam SPR',        shortName: 'Vizag',          lat: 17.68, lng: 83.21, type: 'SPR',      cap: '1.33Mt'    },
];

// ═══════════════════════════════════════════════════════════════════
// EXPORT HUBS (Persian Gulf Origins)
// ═══════════════════════════════════════════════════════════════════
export const EXPORT_HUBS = [
  { id: 'ras-tanura', name: 'Ras Tanura Terminal', lat: 26.64, lng: 50.16 },
  { id: 'fujairah',   name: 'Fujairah Crude Hub',  lat: 25.12, lng: 56.36 },
];

// ═══════════════════════════════════════════════════════════════════
// TRADE ROUTES — Route identity colors are FIXED, never change with risk
// ═══════════════════════════════════════════════════════════════════
export interface TradeRoute {
  id: string;
  label: string;
  corridorIds: string[];          // which chokepoints this route passes through
  destinationId: string;          // which India node this terminates at
  color: string;                  // route IDENTITY color — never changes
  path: L.LatLngExpression[];
}

export const TRADE_ROUTES: TradeRoute[] = [
  {
    id: 'hormuz-jamnagar',
    label: 'Hormuz → Jamnagar',
    corridorIds: ['HORMUZ'],
    destinationId: 'jamnagar',
    color: '#55B7FF',             // Route 01 — Sky blue
    path: [
      [26.64, 50.16], // Ras Tanura
      [26.57, 56.25], // Strait of Hormuz
      [24.5,  59.2],  // Gulf of Oman
      [20.5,  65.5],  // Arabian Sea North
      [22.30, 69.80]  // Jamnagar
    ] as L.LatLngExpression[],
  },
  {
    id: 'hormuz-kochi',
    label: 'Hormuz → Kochi',
    corridorIds: ['HORMUZ'],
    destinationId: 'kochi',
    color: '#43D6A5',             // Route 02 — Emerald
    path: [
      [26.57, 56.25], // Strait of Hormuz
      [25.12, 56.36], // Fujairah
      [18.0,  64.0],  // Arabian Sea Central
      [12.91, 74.85], // Mangalore SPR
      [9.96,  76.26]  // Kochi Terminal
    ] as L.LatLngExpression[],
  },
  {
    id: 'hormuz-visakhapatnam',
    label: 'Hormuz → Vizag',
    corridorIds: ['HORMUZ'],
    destinationId: 'visakhapatnam',
    color: '#A78BFA',             // Route 03 — Violet
    path: [
      [26.57, 56.25], // Strait of Hormuz
      [18.0,  64.0],  // Arabian Sea
      [9.96,  76.26], // Kochi
      [5.9,   80.5],  // South Sri Lanka
      [12.0,  84.0],  // Bay of Bengal South
      [17.68, 83.21]  // Visakhapatnam
    ] as L.LatLngExpression[],
  },
  {
    id: 'suez-bab-india',
    label: 'Suez → Red Sea → India',
    corridorIds: ['SUEZ', 'RED_SEA', 'BAB_EL_MANDEB'],
    destinationId: 'kochi',
    color: '#F2B84B',             // Route 04 — Amber
    path: [
      [29.98, 32.55], // Suez Canal
      [20.0,  38.5],  // Red Sea Corridor
      [12.58, 43.33], // Bab-el-Mandeb
      [11.8,  51.0],  // Gulf of Aden
      [14.0,  62.0],  // Arabian Sea South
      [12.91, 74.85]  // Kochi / Mangalore
    ] as L.LatLngExpression[],
  },
];
