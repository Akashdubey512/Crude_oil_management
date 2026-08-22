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

**Backend:** 225 tests passing. **Frontend:** 16 tests passing.

## Phase 8 — Decision Intelligence Features

- **Scenario Simulator** (`POST /api/scenarios/simulate`) — Simulate macro shocks using real trained models. Controls: tanker traffic, GPR index, Brent price, Brent volatility, infrastructure disruption.
- **Historical Trend Analyzer** (`GET /api/risk/{corridor_id}/history`) — Out-of-time model inference time-series for each corridor.
- **Cross-Corridor Comparison** (`GET /api/risk/comparison`) — Normalized side-by-side comparison of all corridors with risk level, primary driver, vessel flow status, and data freshness.

## Phase 9 — Production ML Validation & Governance Features

- **Out-of-Sample Performance Evaluation** (`GET /api/models/evaluation`) — Validates metrics (ROC-AUC, PR-AUC, accuracy, Brier score, ECE) and computes calibration curves.
- **Feature Data Drift Detection** (`GET /api/models/drift`) — Calculates PSI and KS-test distributions.
- **Unified Model Health Index** (`GET /api/models/health`) — Rules-based health statuses and resolutions.
- **Persistent Prediction Audit Trail** (`GET /api/predictions/history/{corridor}`) — Immutable SQLite logging.
- **Model Health Center Dashboard UI** — Interactive tabbed center for feeds status, validation curves, drift tables, prediction logs, and model governance registry.

See full documentation in `docs/phase-9-ml-validation.md` and `docs/api.md`.
