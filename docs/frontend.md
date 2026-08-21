# React Frontend Documentation — Phase 6 Dashboard

This document details the React, TypeScript, and Vite-based frontend developed to serve as the Executive Command Center for the India Energy Supply Chain Resilience Platform.

---

## 1. Directory Structure

The frontend code is structured as follows:

```
frontend/
├── src/
│   ├── api/
│   │   └── client.ts            # Typed HTTP requests to FastAPI endpoints
│   ├── components/
│   │   ├── Map.tsx              # Leaflet digital twin geographic visualization
│   │   ├── RiskGauge.tsx        # Framer Motion circular threat score meter
│   │   ├── RiskDecompositionChart.tsx # Recharts horizontal risk bar vectors
│   │   ├── TrafficChart.tsx     # Recharts PortWatch transit timelines
│   │   ├── EventsList.tsx       # Mapped GDELT and OFAC security logs
│   │   ├── ModelCard.tsx        # Transparency card displaying limits and AUCs
│   │   └── AlertsPanel.tsx      # Anomaly alert logger
│   ├── types/
│   │   └── index.ts             # Strict TypeScript data models for API payloads
│   ├── App.tsx                  # Main dashboard orchestrator component
│   ├── index.css                # Tailwind CSS v4, dark scrollbars, map filters
│   └── main.tsx                 # React DOM mount wrapper
├── package.json                 # Project dependencies
├── vite.config.ts               # Vite bundler options with Tailwind plugin
└── vitest.config.ts             # Vitest test configurations
```

---

## 2. API Integration Layer

The frontend client in [`src/api/client.ts`](file:///D:/hackathon%20project/energy-resilience/frontend/src/api/client.ts) handles all API calls strictly against the running FastAPI backend endpoints (`http://127.0.0.1:8000`). It maps data models defined in [`src/types/index.ts`](file:///D:/hackathon%20project/energy-resilience/frontend/src/types/index.ts), which correspond 1-to-1 with Pydantic backend models:

- `api.getHealth()` -> `/health`
- `api.getCorridors()` -> `/api/corridors`
- `api.getAllRisks()` -> `/api/risk`
- `api.getCorridorRisk(id)` -> `/api/risk/{id}`
- `api.getCorridorEvents(id)` -> `/api/events/{id}`
- `api.getCorridorTraffic(id)` -> `/api/traffic/{id}`
- `api.getInfrastructure()` -> `/api/infrastructure`
- `api.getMetrics()` -> `/api/metrics`
- `api.getModelInfo(id)` -> `/api/model-info?corridor_id={id}`

---

## 3. Map Component (`Map.tsx`)

The map component wraps raw **Leaflet** to render the spatial digital twin.
- **Dark Mode Map Tiles**: OpenStreetMap raster tiles are filtered on client side to match our dark premium command center aesthetic without external Mapbox API keys.
  ```css
  .leaflet-tile { filter: invert(100%) hue-rotate(180deg) brightness(90%) contrast(95%); }
  ```
- **Chokepoint Layers**: Renders Strait of Hormuz, Bab-el-Mandeb, Suez Canal, and Red Sea as interactive circles color-coded by active risk score (LOW = Emerald, MODERATE = Yellow, HIGH = Orange, CRITICAL = Red).
- **Facility Layers**: Refineries, Port Nodes, and Strategic Petroleum Reserves (SPR) are mapped via custom SVG divIcons directly using WGS-84 coordinates returned from the backend.

---

## 4. Analytical Components

- **`RiskGauge.tsx`**: Uses a SVG arc and Framer Motion transitions to animate the risk score (from 0 to 100).
- **`RiskDecompositionChart.tsx`**: Renders horizontal Recharts bars representing the relative contributions of the five risk vectors.
- **`TrafficChart.tsx`**: Uses AreaChart to overlay PortWatch daily tanker volumes with total vessel transits.
- **`ModelCard.tsx`**: Displays model parameters, out-of-time partition AUC metrics, and trained features.
- **`AlertsPanel.tsx`**: Checks risks and factors dynamically to raise warning logs (e.g. traffic drop anomalies or high threat alerts).
