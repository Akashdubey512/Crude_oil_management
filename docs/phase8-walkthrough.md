# Phase 8 — Decision Intelligence & Demo Readiness

## Overview

Phase 8 upgrades the Energy Supply Chain Resilience Platform from a monitoring dashboard to a full **Decision Intelligence** tool. It adds historical risk trend visualization, cross-corridor comparison, and scenario simulation — all backed exclusively by real trained models and historical data.

---

## New Features

### 1. Dashboard Mode Navigation

The right-hand analytical panel now has four modes, switchable via a top tab bar:

| Mode | Description |
|---|---|
| **Corridor Monitor** | Original per-corridor risk view (Phase 6/7 functionality) |
| **Scenario Simulator** | What-if analysis using real trained models |
| **Trend Analyzer** | Historical risk probability time-series |
| **Cross-Comparison** | Side-by-side view of all corridors |

---

### 2. Scenario Simulator

**Endpoint:** `POST /api/scenarios/simulate`

Controls: Tanker Traffic (0.5x-1.5x), GPR (0.5x-3.0x), Brent Price (0.5x-1.5x), Brent Volatility (0.5x-3.0x), Infrastructure Disruption Toggle.

Output: Baseline vs Simulated Probability KPIs, SHAP-driven Explanation, Model-derived Recommendation, Feature Mutations Table.

Implementation: src/api/services/scenario_service.py, src/api/routes/scenarios.py. Uses real rows from model_features.csv. RED_SEA returns HTTP 400.

---

### 3. Historical Risk Trend Analyzer

**Endpoint:** `GET /api/risk/{corridor_id}/history`

Displays an AreaChart time-series of out-of-time model inference for HORMUZ, BAB_EL_MANDEB, SUEZ. Y-axis = disruption probability (0-100%). Interpretation note always shown.

---

### 4. Cross-Corridor Comparison

**Endpoint:** `GET /api/risk/comparison`

Each corridor card shows: Risk Level, Probability, Primary SHAP Driver, Vessel Flow Status, Geopolitical Status, Traffic Data Freshness.

**Route ordering note:** /api/risk/comparison must be declared before /api/risk/{corridor_id} in FastAPI to avoid path matching conflicts.

---

## API Endpoints Added

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/scenarios/simulate | What-if scenario simulation |
| GET | /api/risk/{corridor_id}/history | Historical risk probability |
| GET | /api/risk/comparison | Cross-corridor comparison |

---

## Data Integrity Constraints Preserved

1. RED_SEA remains UNKNOWN — no simulation, no history, no comparison risk score.
2. No mock/fabricated business data — simulation inputs from real model_features.csv rows.
3. Model uncertainty always surfaced — uncertainty_note and data_limitation always returned.
4. Recommendations are model-driven via top SHAP feature.
5. Explanations are SHAP-derived, not hardcoded strings.

---

## Verification Results

- TypeScript strict compile:  PASS
- Vite production build:      PASS  (dist/assets/index.js ~908 kB / gzipped 266 kB)
- Vitest frontend tests:      11/11 PASS (6 new Phase 8 tests)
- pytest backend tests:       199/199 PASS (13 Phase 8 tests)
