# Phase 5 Walkthrough — Production API + Risk Service + Dashboard Backend

---

## What Was Implemented

Phase 5 delivers a production-ready FastAPI backend that exposes the Phase 4 risk prediction engine, geopolitical event intelligence, maritime traffic data, and infrastructure registry through a validated, documented JSON REST API.

**Zero fabricated values.** Every endpoint returns real pipeline outputs or an explicit `UNAVAILABLE` status with documented limitations.

---

## Architecture

```
HTTP Client (future React Dashboard)
        |
        v
FastAPI Application  (src/api/main.py)
        |
        |--- CORS Middleware
        |--- Request Logging Middleware
        |--- Global Exception Handler
        |
        +--- GET /health          (src/api/routes/health.py)
        +--- GET /api/corridors   (src/api/routes/corridors.py)
        +--- GET /api/risk[/{id}] (src/api/routes/risk.py)
        +--- GET /api/traffic/{id}
        +--- GET /api/infrastructure
        +--- GET /api/metrics
        +--- GET /api/model-info
        +--- GET /api/events[/{id}](src/api/routes/events.py)
                |
                v
        Service Layer (src/api/services/)
                |--- risk_service.py  --> src/risk/corridor_risk.py (Phase 4)
                |--- event_service.py --> data/processed/geopolitical_events.csv
                |--- traffic_service.py --> data/processed/corridor_traffic_daily.csv
                |--- infrastructure_service.py --> data/processed/energy_infrastructure.csv
```

---

## Files Created / Modified

| File | Description |
| :--- | :--- |
| [`src/api/__init__.py`](file:///D:/hackathon%20project/energy-resilience/src/api/__init__.py) | Package init |
| [`src/api/main.py`](file:///D:/hackathon%20project/energy-resilience/src/api/main.py) | FastAPI app with CORS, logging middleware, error handler |
| [`src/api/schemas.py`](file:///D:/hackathon%20project/energy-resilience/src/api/schemas.py) | Pydantic v2 response schemas |
| [`src/api/routes/health.py`](file:///D:/hackathon%20project/energy-resilience/src/api/routes/health.py) | `/health` endpoint |
| [`src/api/routes/corridors.py`](file:///D:/hackathon%20project/energy-resilience/src/api/routes/corridors.py) | `/api/corridors` endpoint |
| [`src/api/routes/risk.py`](file:///D:/hackathon%20project/energy-resilience/src/api/routes/risk.py) | `/api/risk`, `/api/traffic`, `/api/infrastructure`, `/api/metrics`, `/api/model-info` |
| [`src/api/routes/events.py`](file:///D:/hackathon%20project/energy-resilience/src/api/routes/events.py) | `/api/events` and `/api/events/{corridor}` |
| [`src/api/services/risk_service.py`](file:///D:/hackathon%20project/energy-resilience/src/api/services/risk_service.py) | Risk inference + decomposition + data freshness |
| [`src/api/services/event_service.py`](file:///D:/hackathon%20project/energy-resilience/src/api/services/event_service.py) | Geopolitical event queries |
| [`src/api/services/traffic_service.py`](file:///D:/hackathon%20project/energy-resilience/src/api/services/traffic_service.py) | PortWatch traffic + anomaly queries |
| [`src/api/services/infrastructure_service.py`](file:///D:/hackathon%20project/energy-resilience/src/api/services/infrastructure_service.py) | Infrastructure node queries |
| [`scripts/run_api.py`](file:///D:/hackathon%20project/energy-resilience/scripts/run_api.py) | Uvicorn server launcher |
| [`tests/test_phase5.py`](file:///D:/hackathon%20project/energy-resilience/tests/test_phase5.py) | 62-test Phase 5 validation suite |
| [`docs/api.md`](file:///D:/hackathon%20project/energy-resilience/docs/api.md) | Full API reference documentation |
| [`.env.example`](file:///D:/hackathon%20project/energy-resilience/.env.example) | Environment variable template |

---

## Complete Test Result

```
175 passed, 15 warnings in 26.53s

  Phase 1:  70 tests  PASS
  Phase 2:  20 tests  PASS
  Phase 3:  13 tests  PASS
  Phase 4:  10 tests  PASS
  Phase 5:  62 tests  PASS
```

---

## API Smoke Test Results

All 14 smoke tests passed against the running server:

```
[PASS] GET /health (200)
[PASS] GET /api/corridors (200)  — 4 items
[PASS] GET /api/risk/HORMUZ (200)
[PASS] GET /api/risk/BAB_EL_MANDEB (200)
[PASS] GET /api/risk/SUEZ (200)
[PASS] GET /api/risk (all corridors) (200)  — 4 items
[PASS] GET /api/events (200)  — 5 items
[PASS] GET /api/events/HORMUZ (200)  — 5 items
[PASS] GET /api/traffic/HORMUZ (200)  — 5 items
[PASS] GET /api/infrastructure (200)  — 32 items
[PASS] GET /api/metrics (200)
[PASS] GET /api/model-info?corridor_id=HORMUZ (200)
[PASS] /api/risk/MALACCA -> 404 (expected)
[PASS] /api/risk/HORMUZ?date=bad-date -> 400 (expected)
```

---

## Example Risk Response (`/api/risk/HORMUZ`)

```json
{
  "corridor": "HORMUZ",
  "risk_score": 0.17,
  "risk_level": "LOW",
  "probability": 0.0017,
  "prediction_date": "2026-08-16",
  "model_version": "1.0",
  "data_freshness": {
    "traffic": "2026-08-16",
    "geopolitical": "2026-08-17",
    "price": "2026-08-18"
  },
  "risk_decomposition": {
    "geopolitical": 0.0,
    "maritime": 0.0,
    "energy_market": 0.0,
    "infrastructure": 1.0,
    "historical_pattern": 0.0
  },
  "top_factors": ["anomaly_type_drop", "tanker_zscore_28d", "anomaly_flag",
                  "tanker_decline_ratio_28d", "vessel_count"],
  "limitations": ["GDELT event coverage is sparse before July 2026..."]
}
```

---

## Known Limitations

1. **RED_SEA** has no trained model — returns `UNKNOWN` risk level with explicit `limitations` note.
2. CORS is open (`*`) — restrict to dashboard origin in production.
3. API is read-only (GET only) — write endpoints are out of scope.
4. The risk engine re-computes a 120-day rolling window at request time (~500ms). Cache layer would improve production latency.

---

## Command to Start the Backend

```powershell
# From the project root:
$env:PYTHONPATH="D:\hackathon project\energy-resilience"
& "C:\Users\ss146\miniconda3\envs\project\python.exe" "D:\hackathon project\energy-resilience\scripts\run_api.py"

# API available at:
#   http://127.0.0.1:8000/docs  (Swagger UI)
#   http://127.0.0.1:8000/redoc (ReDoc)
```

---

## Ready for Phase 6

The backend is ready for Phase 6 (React digital twin dashboard). All endpoints serve real model outputs as structured JSON. No mock data, no hardcoded values.
