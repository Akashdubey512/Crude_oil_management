# Production Readiness Audit Report — Phase 12

This audit report reviews the current codebase of the Crude Oil Management & Maritime Corridor Risk Intelligence Platform to identify gaps between development status and a production-grade, observable, reliable, and fault-tolerant system.

---

## 1. Production Gaps Identified

### 1.1 Centralized & Development-Only Configuration
- **Hardcoded Path Defaults**: Multiple files (`src/api/database.py`, `src/risk/corridor_risk.py`, `tests/test_phase4.py`) contain absolute path defaults like `D:\hackathon project\energy-resilience\data` and `models`. These will fail when deployed inside a standard Linux-based Docker container.
- **Hardcoded Secrets & API Keys**: FRED API endpoints and keys are configured without startup verification or secure environment overrides.
- **No Fast-Fail Validation**: The API starts up even if crucial directories (`data/`, `models/`) or external endpoints are missing or invalid, leading to runtime failures later.

### 1.2 Structured Logging & Request Tracing
- **Development-Only Format**: The system uses `logging.basicConfig` with a flat string layout (`%(asctime)s  %(levelname)-8s...`). This format is hard to parse in centralized log aggregators (e.g. Datadog, ELK).
- **Missing Correlation IDs**: There is no tracing of individual API requests. If a request fails, tracing the exact sequence of queries, database operations, and external API requests is impossible.
- **Prediction Metadata Logging**: When a model prediction is run, the inputs, probabilities, and model version details are not outputted to the standard logging stream as structured payload items.

### 1.3 Application Metrics & Observability
- **No Metrics Exporter**: The application lacks a `/metrics` or `/api/metrics` endpoint, meaning we cannot monitor CPU, memory, request counts, latencies, database execution times, or model drift.

### 1.4 API Health & Lifecycle
- **Basic Health Check**: Only a single `/health` endpoint is available, which performs a heavy parse of `corridor_traffic_daily.csv` on every query, making it susceptible to Denial of Service and slow response times.
- **No Graceful Lifecycle Management**: The database connections and background workers are not cleanly closed/disposed of when receiving SIGTERM or shutdown hooks.

### 1.5 External API Resilience
- **No HTTP Timeouts or Retries**: Calls to GDELT, FRED, and PortWatch are executed using standard HTTP requests without connection or read timeouts. A slow external server will lock the API thread indefinitely.
- **No Degraded Mode Fallback**: If an external API is down, the dashboard page or risk calculator fails outright instead of serving degraded stale-data banners.

### 1.6 Database Production Hardening
- **No PostgreSQL Support**: Predictions and model metadata are logged strictly in an SQLite database file (`predictions.db`).
- **No Database Pooling**: Every transaction opens and closes a new SQLite file descriptor, creating write lock contentions and latency overheads.
- **No Indexes**: Columns frequently filtered (`corridor`, `timestamp`, `model_version`) lack query indexes.

### 1.7 API Security Baseline & Rate Limiting
- **Wildcard CORS Origins**: `allow_origins=["*"]` is enabled globally, opening the API to cross-origin scripting vulnerabilities.
- **No Rate Limiting**: The platform is vulnerable to request flooding and brute force on sensitive scenario simulation and ML governance endpoints.
- **Missing Security Headers**: Modern secure browser headers (`X-Frame-Options`, `Content-Security-Policy`, `X-Content-Type-Options`) are absent.

### 1.8 Model Serving Safety
- **Unvalidated Pickle Deserialization**: Model files are loaded and deserialized using `pickle.load` without schema validation, verifying matching feature keys, or running sanity checks, introducing runtime vulnerability.

### 1.9 Containerization & Deployment
- **No Docker Support**: No `Dockerfile` or `docker-compose.yml` configs exist to ensure reproducible, isolated multi-stage deployments running under secure non-root users.

---

## 2. Action Items & Remediation Map

| Action Item | Scope | Implementation File |
|---|---|---|
| Centralize configuration, validate on startup | central config | `src/api/config.py`, `.env.example` |
| JSON structured logging & Correlation ID | logging | `src/api/logging_config.py`, middleware |
| Track requests/min, latencies, drift metrics | metrics | `src/api/metrics.py`, `/api/metrics` |
| Lightweight /live, status-based /ready | health checks | `src/api/routes/health.py` |
| Request timeouts, retries, fallbacks | API resilience | `src/api/services/data_validation.py` |
| PostgreSQL pool support & query rewriting | database | `src/api/database.py` |
| IP-based sliding window rate limiter | security | `src/api/rate_limiter.py` |
| CSP, frame options, CORS whitelist | security | `src/api/main.py` middleware |
| Multi-stage non-root containerization | Docker | `Dockerfile`, `docker-compose.yml` |
| System status monitoring & chart visualization | frontend UI | `frontend/src/App.tsx` |
