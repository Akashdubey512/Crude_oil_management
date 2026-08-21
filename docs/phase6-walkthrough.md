# Phase 6 Walkthrough — React Digital Twin Dashboard

---

## 1. Accomplishments Overview

Phase 6 successfully constructed the **React-based Digital Twin Dashboard** for the India Energy Supply Chain Resilience Command Center.

- **Zero Mock / Dummy Data**: Hardcoded stats, coordinates, and mock arrays are completely eliminated. Every chart, gauge, tooltip, map marker, and alert card uses real, verified data fetched from the local FastAPI backend.
- **Dark Premium Aesthetic**: Modeled as an executive defense/intelligence command center with deep-space dark background, custom scrollbars, glassmorphism card details, and Leaflet dark map tiles.
- **Production Build Success**: Compiles successfully using Vite and strict TypeScript checks (`tsc -b && vite build`).
- **100% Test Green**: All **5 Vitest frontend tests** and **175 pytest backend tests** pass successfully.

---

## 2. API Endpoints Consumed

The React application queries the following endpoints on startup and interaction:
1. `GET /health` — Verifies connection status and retrieves latest data timestamp.
2. `GET /api/corridors` — Populates details and citations of the chokepoints.
3. `GET /api/risk` — Calculates KPI metrics for the global summary strip.
4. `GET /api/risk/{corridor}` — Fetches details for selected chokepoint (gauge + vectors).
5. `GET /api/events/{corridor}` — Resolves GDELT and OFAC security logs.
6. `GET /api/traffic/{corridor}` — Feeds Recharts daily tanker transits and anomaly alerts.
7. `GET /api/infrastructure` — Generates WGS-84 coordinates for refineries, ports, and SPR markers.
8. `GET /api/metrics` — Pulls model AUC comparison metrics.
9. `GET /api/model-info?corridor_id={corridor}` — populates the transparency model cards.

---

## 3. Walkthrough of Main Features

### A. Executive KPI strip
Pulls current risk levels, probabilities, and infrastructure counts across all monitored corridors dynamically.

### B. Geographic Digital Twin Map
Wraps raw Leaflet to present interactive chokepoint centers (colored by risk) and India's spatial infrastructure nodes. Tooltips display capacity, operators, state, and coordinates.

### C. Risk Analytics (Gauge & Decompositions)
Animates calculated risk scores and displays a Recharts breakdown of the 5 vectors (Geopolitical, Maritime, Market, Infrastructure, and Sanctions/Hist).

### D. Traffic Timeline & Events Log
Plots rolling daily PortWatch tanker transits and lists security snippets from news logs.

### E. Model Card Transparency
Exposes model details, limitations, and out-of-time test metrics directly from the backend model registry to avoid hiding limitations.

---

## 4. Complete Test Results

### Backend pytest
```
====================== 175 passed, 15 warnings in 24.00s ======================
```

### Frontend Vitest
```
 ✓ src/App.test.tsx (5 tests) 193ms
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

---

## 5. Execution Commands

### Step 1: Start the FastAPI Backend
```powershell
# From the project root:
$env:PYTHONPATH="D:\hackathon project\energy-resilience"
& "C:\Users\ss146\miniconda3\envs\project\python.exe" "D:\hackathon project\energy-resilience\scripts\run_api.py"
```

### Step 2: Start the React Frontend
```powershell
# In a new terminal window:
cd "D:\hackathon project\energy-resilience\frontend"
npm run dev
# Dashboard available at: http://localhost:5173
```
---

## 6. Real-Data Limitations

- **GFW AIS**: Observations are empty (no token available). Daily PortWatch counts are used instead.
- **GDELT Events**: Sparse prior to July 2026. Models backtested rely on traffic-only drop triggers in early periods.
- **Red Sea**: No independent traffic model trained. Accessible via `/api/events/RED_SEA`.
- **PPAC monthly data**: Lagged by 1 month to reflect publication latency.
