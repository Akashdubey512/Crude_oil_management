# India Energy Supply Chain Resilience Platform

A production-grade, AI-driven Energy Supply Chain Resilience platform designed to monitor geopolitical risk, track logistics/shipping threats, quantify crude-oil supply exposure, simulate corridor disruption scenarios, and optimize strategic-reserve actions for India.

## Repository Structure

```
energy-resilience/
│
├── data/
│   ├── raw/         # Immutable raw datasets (copied from root)
│   ├── staging/     # Intermediate staging files (clean schemas)
│   ├── processed/   # Final processed features and tables
│   ├── quality/     # Machine-readable data quality reports
│   └── manifests/   # Data provenance manifests (data_manifest.json)
│
├── src/
│   ├── ingestion/   # Raw data loading scripts
│   ├── validation/  # Schema check logic
│   ├── preprocessing/ # Cleaning and calendar-alignment logic
│   ├── features/    # Geopolitical and refinery features
│   ├── models/      # Geopolitical risk/consumption predictive models
│   ├── risk/        # Disruption scoring and supply corridor risk
│   ├── scenarios/   # Scenario simulators (impact on supply/prices)
│   ├── optimization/# Strategic reserve and alternative route optimization
│   └── api/         # FastAPI endpoints (backend)
│
├── tests/           # Unit and integration tests
├── docs/            # Project scope, architecture, data audit, and gaps
├── notebooks/       # Exploratory analysis and prototyping
├── scripts/         # Utility scripts (including verification scripts)
│
├── requirements.txt # Python package requirements
├── environment.yml  # Conda environment specifications
├── .env.example     # Template for environment variables
├── .gitignore       # Git exclusion rules
└── README.md        # This file
```

## Setup and Environment

This project utilizes the existing Conda environment `project` with Python 3.12.

To activate the environment:
```bash
conda activate project
```

To install package requirements:
```bash
pip install -r requirements.txt
```

## Running the Data Audit

The initial data audit has been completed. All raw data files are mapped, hashed, and detailed under:
- `docs/data-sources.md`: File registry and metadata.
- `docs/data-audit.md`: Schema, duplicate, and null value analysis.
- `docs/data-gaps.md`: Gaps and incomplete records.
- `data/manifests/data_manifest.json`: JSON provenance catalog.
- `data/quality/`: Automated quality reports.

To verify the setup:
```bash
python scripts/verify_setup.py
```

## Running Tests
Run the entire backend test suite:
```bash
$env:PYTHONPATH="D:\hackathon project\energy-resilience"
python -m pytest tests -v
```

Run frontend tests:
```bash
cd frontend
npx vitest run --passWithNoTests
```

## Running the API Backend
To start the FastAPI backend server:
```bash
$env:PYTHONPATH="D:\hackathon project\energy-resilience"
python scripts/run_api.py
```
API docs will be available at: http://127.0.0.1:8000/docs

## Running the Frontend Dashboard
To start the Vite React development server:
```bash
cd frontend
npm run dev
```
Open your browser and navigate to: http://localhost:5173


---

## Platform Phases — Completion Status

| Phase | Description | Status |
| :--- | :--- | :--- |
| Phase 1 | Data ingestion, provenance, and quality auditing | COMPLETE |
| Phase 2 | Schema validation, staging, preprocessing | COMPLETE |
| Phase 3 | Feature engineering (GPR, traffic, Brent, refinery) | COMPLETE |
| Phase 4 | XGBoost / Random Forest / Logistic Regression model training | COMPLETE |
| Phase 5 | Corridor risk scoring, SHAP explainability | COMPLETE |
| Phase 6 | React Digital Twin Dashboard (Leaflet map, risk gauge, charts) | COMPLETE |
| Phase 7 | Production hardening: Brent price API, data-status API, SHAP UI | COMPLETE |
| Phase 8 | Decision Intelligence: Scenario Simulator, Trend Analyzer, Cross-Comparison | COMPLETE |
| Phase 9 | Production ML Validation, Model Governance & Data-Drift Monitoring | COMPLETE |
| Phase 10 | RED_SEA modeling, Bab el-Mandeb proxy, data limitations | COMPLETE |
| Phase 11 | Challenger-vs-Champion, Promotion, Rollback, Retraining | COMPLETE |
| Phase 12 | Observability, Postgres, Rate Limiting, Lifespan Probes | COMPLETE |
| Phase 13 | Enterprise Security, API Security & Production Deployment Hardening | COMPLETE |
| Phase 14 | Premium Cinematic Maritime Command Center & Landing Experience | COMPLETE |
| Phase 15 | Enterprise Dual-Theme System, Cartographic Intelligence & MLOps Governance Overhaul | COMPLETE |

**Backend:** 282 tests passing. **Frontend:** 30 tests passing.

## Phase 15 — Enterprise Dual-Theme System, Cartographic Intelligence & MLOps Governance Overhaul

- **Production-Grade Dual-Theme Engine (Light & Dark)** — Complete architectural overhaul utilizing semantic CSS design tokens (`--bg-app`, `--bg-card`, `--text-primary`, `--border-default`, `--risk-*`), automatic CartoDB Positron/Dark Matter tile layer switching, and zero unstyled components across all dashboard channels.
- **Advanced Maritime Vector & Geospatial Command Map** — High-precision coordinates and color-graded corridor risk arcs (Low: Emerald, Moderate: Amber, High: Crimson) reflecting real-time threat calculations for Hormuz, Bab-el-Mandeb, Suez, and Red Sea corridors.
- **MLOps Diagnostics & Governance Center Complete** — Live Champion vs. Challenger model comparisons with real ROC-AUC/PR-AUC metrics, automated feature drift detection (PSI/KS checks across all 52 features), and formal Model Card specifications for all maritime corridors.
- **Telemetry & Observability Stream** — Integrated real-time Prometheus throughput, response latency, database connection pool tracking, and streaming telemetry console.
- **RBAC Scope & Permission Alignment** — Refined role-based permissions allowing Viewer, Analyst, and Admin roles to explore intelligence, inspect models, and run what-if scenario simulations with secure Admin gating for model promotions and key provisioning.
- **Zero-Error Compilation & Production Hardened** — Fully optimized Vite production build passing TypeScript verification (`tsc -b`) with zero Framer Motion or React runtime warnings.

---

## Phase 12 — Observability & Reliability Engineering

- **Structured JSON Logging** — Outputs logs as unified JSON lines, scrubs secrets automatically, and propagates correlation IDs.
- **Prometheus Metrics Endpoint** (`GET /metrics`) — Exposes request latencies, predictions, promotion attempts, and database queries.
- **Proactive Health Probes** (`/api/health/live` & `/api/health/ready`) — Lightweight liveness check and database/registry readiness probe.
- **Database Connection Pooling** — Automatic PostgreSQL threaded pooling in production with SQLite fallback.
- **API Rate Limiting** — Sliding-window IP rate limiter to protect resources from concurrency exhaust.
- **Serving Safety Guardrails** — Enforces model deserialization, schema matching, and prediction check validations before loading registry champion.

See full documentation in `docs/phase-12-production.md`, `docs/observability.md`, and `docs/deployment-runbook.md`.

---

## Phase 13 — Enterprise Security, API Security & Production Deployment Hardening

- **RBAC API Key System** — Role-based access control with VIEWER / ANALYST / ML_ENGINEER / ADMIN scopes; keys stored as HMAC-SHA256 hashes.
- **Bearer Token Authentication** — All protected endpoints require `Authorization: Bearer erp_<public_id>_<secret>` header; 401 on missing, 403 on insufficient scope.
- **Security Audit Log** — Every authentication failure, permission denial, key creation, revocation, and model governance action is persisted in `security_audit_log`.
- **SSRF Protection** — `secure_client.py` blocks requests to private/loopback/link-local IP ranges; all external data fetches (GDELT, PortWatch, AIS) routed through it.
- **Model Governance Security** — Promotion and rollback endpoints now require `MODEL_PROMOTE` / `MODEL_ROLLBACK` scopes; REJECTED models fast-fail before artifact loading.
- **Security Routes** — `GET /api/security/status`, `GET /api/security/audit`, `GET /api/security/keys`, `POST /api/security/keys/{id}/revoke`.
- **Frontend Security Center** — Dedicated tab showing live security status, API key management, and audit log with RBAC-gated controls.
- **Production Config Validation** — Fail-fast startup check enforces `DATABASE_URL`, `API_KEY_HASH_SECRET`, and safe CORS origins in production mode.
- **20/20 Security Integration Tests** — Full test suite covering auth flows, RBAC enforcement, SSRF blocks, rate limiting, and audit logging.

See full documentation in `docs/phase-13-security-audit.md`.

---

## Phase 14 — Premium Geopolitical Maritime Intel Command Center & Landing

- **Cinematic Landing Page** — Engaging entry experience featuring vector radar map sweeps, visual radar pulses at major chokepoints (Red Sea, Hormuz), and a live real-time Operations status bar showing Brent Crude fluctuations and API health metrics.
- **Advanced Geospatial Command Map** — Dynamic Leaflet intelligence overlay featuring customized color coding for low/moderate/high corridor risk, pulsing chokepoint indicator overlays, and comprehensive toggles for oil facilities, refineries, shipping traffic and geopolitical GDELT events.
- **Operational Intelligence Drawer** — Side panel featuring a 5-vector risk decomposition horizontal Recharts bar layout, deep explainable AI SHAP waterfall attribution panel, and explicit notifications indicating proxy data limitations (* Bab el-Mandeb traffic proxy).
- **MLOps Diagnostics & Governance Portal** — A professional monitoring workspace exhibiting ROC-AUC and PR-AUC performance metrics, feature drift tables with covariate KS indicators, SRE metrics (throughput, latencies, CPU/RAM sparklines), and role-gated model promotion controls.
- **Robust Client Credentials Manager** — Security center interface displaying live session status, authorized keys inventory, and IP audit trails with instant token revocation capabilities.
- **Vite & TypeScript Compilation Hardened** — Fully optimized production code compilation passing tsc verification with 30 high-fidelity unit and integration tests passing.

See full documentation in `docs/phase-14-frontend-transformation.md`.
