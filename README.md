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

**Backend:** 262 tests passing. **Frontend:** 16 tests passing.

## Phase 12 — Observability & Reliability Engineering

- **Structured JSON Logging** — Outputs logs as unified JSON lines, scrubs secrets automatically, and propagates correlation IDs.
- **Prometheus Metrics Endpoint** (`GET /metrics`) — Exposes request latencies, predictions, promotion attempts, and database queries.
- **Proactive Health Probes** (`/api/health/live` & `/api/health/ready`) — Lightweight liveness check and database/registry readiness probe.
- **Database Connection Pooling** — Automatic PostgreSQL threaded pooling in production withSQLite fallback.
- **API Rate Limiting** — Sliding-window IP rate limiter to protect resources from concurrency exhaust.
- **Serving Safety Guardrails** — Enforces model deserialization, schema matching, and prediction check validations before loading registry champion.

See full documentation in `docs/phase-12-production.md`, `docs/observability.md`, and `docs/deployment-runbook.md`.

