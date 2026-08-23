# 🚀 Energy Resilience Intel — Hackathon Presentation & Pitch Master Guide

> **Theme**: Supply Chain Intelligence, Energy Security, and Geopolitical Risk  
> **Problem Statement**: AI-Driven Energy Supply Chain Resilience for Import-Dependent Economies  
> **Repository**: `https://github.com/Akashdubey512/Crude_oil_management.git`

---

## 📸 Quick Overview Cards

> [!IMPORTANT]
> **Core Problem Solved**: India imports **88% of its crude oil**, with **>40% passing through the Strait of Hormuz**. Strategic Petroleum Reserves cover only **~9.5 days**. Fragmented news, maritime feeds, and market data make proactive crisis planning impossible without AI.

> [!TIP]
> **Technical Stack**: 
> - **Backend**: FastAPI (Python 3.12) + SQLite (WAL mode) + XGBoost Classifiers + Platt Scaling Calibration
> - **Frontend**: React 19 + TypeScript + Vite 8 + TailwindCSS + Leaflet Cartographic Digital Twin
> - **XAI & Governance**: SHAP Tree Explainer + Champion/Challenger Model Registry + PSI/KS Drift Monitoring
> - **Quality & Security**: 313 Pytest tests + 29 Vitest tests + HMAC-SHA256 4-tier RBAC + Prometheus Metrics

---

## 1. 🎤 6-Minute Master Pitch Script

*(Target speaking speed: ~130–140 words/min | Total duration: ~5 minutes 45 seconds)*

---

### ⏱️ 0:00–0:40 — Problem Statement

> *"Good morning, judges.*
>
> *India imports approximately **88% of its crude oil**, with over **40% of that volume passing through a single maritime chokepoint—the Strait of Hormuz**.*
>
> *Recent escalations—from the 2025 US-Iran standoff and renewed sanctions on Iranian exports to drone and missile attacks on Red Sea shipping lanes—demonstrate how fragile our energy lifeline is. With India's strategic petroleum reserves covering only about **9.5 days of national consumption**, energy decision-makers cannot afford to react after tankers are turned away or crude prices surge.*
>
> *The fundamental issue is that traditional logistics planning tools operate in silos. They cannot merge high-frequency geopolitical news, satellite maritime transits, and macro oil price shocks into a single, predictive risk picture.*
>
> ***So we built Energy Resilience Intel.***"*

---

### ⏱️ 0:40–1:20 — Our Solution

> *"Energy Resilience Intel is an enterprise-grade, AI-powered Maritime Geopolitical Corridor Risk Command System engineered specifically for import-dependent energy economies.*
>
> *The platform continuously ingests multi-source geopolitical and shipping data across four critical energy transit corridors: **Hormuz, Suez, Bab-el-Mandeb, and the Red Sea**.*
>
> *Using trained XGBoost predictive models, it computes calibrated disruption probabilities over a 7-to-30 day horizon, leverages SHAP explainability to disclose the exact root drivers behind every score, and provides an interactive digital twin simulator where managers can model what-if disruption scenarios and test strategic reserve drawdowns before crises impact national energy security."*

---

### ⏱️ 1:20–2:20 — How It Works (End-to-End Pipeline)

```
[ GDELT · PortWatch · FRED ]
             │
             ▼
   ( Parquet Ingestion )
             │
             ▼
( 24 Feature Transformations )
             │
             ▼
 ( XGBoost ML Classifiers )
             │
             ▼
 ( Platt Scaled Probabilities )
             │
             ▼
( 5-Vector Risk Decomposition )
             │
             ▼
 ( SHAP Tree XAI Explainer )
             │
             ▼
 ( What-If Scenario Engine )
             │
             ▼
 ( React Command Twin UI )
```

> *"Here is how data flows through our system:*
>
> 1. **Ingestion Layer**: We fetch unstructured geopolitical news from GDELT, satellite vessel transits from IMF PortWatch, and daily crude prices from FRED into standardized Parquet pipelines.
> 2. **Feature Pipeline**: We compute 24 normalized features—including 7-day, 30-day, and 90-day moving averages of tanker volumes, GPR news indices, and price volatility.
> 3. **ML Risk Inference**: Pre-trained XGBoost classifiers evaluate these feature vectors to compute raw disruption probabilities.
> 4. **Calibration & Risk Scoring**: Raw outputs pass through Platt scaling to produce calibrated probability bounds, mapped into 5 risk vectors.
> 5. **Explainability & Simulation**: A SHAP tree explainer decomposes every prediction into human-readable feature importances, feeding directly into our scenario engine and React digital command dashboard."*

---

### ⏱️ 2:20–3:15 — Data & AI/ML Architecture

> *"Let’s look at the machine learning under the hood.*
>
> *We trained separate XGBoost binary classification models for our primary corridors. Our prediction target detects whether a corridor will experience a major supply throughput drop or security disruption within the next 30-day window.*
>
> *To prevent **data leakage**, all temporal feature transformations—such as moving averages and scaling—are fitted strictly on historical training splits before being applied to evaluation data.*
>
> *Because historical corridor closures are rare events (~0.5% to 3% positive rates), we calibrated our XGBoost models using **Platt Scaling** and tuned them specifically for high recall, ensuring early warning signals are never missed.*
>
> ***Now, an important engineering disclosure regarding the Red Sea***: IMF PortWatch does not maintain a standalone 'Red Sea' chokepoint sensor. As responsible ML engineers, rather than fabricating data, we modeled the Red Sea corridor using **Bab-el-Mandeb traffic data as an explicit proxy**, combined with GDELT armed conflict event logs from the region. This proxy limitation is disclosed transparently in both our API schemas and dashboard drawers."*

---

### ⏱️ 3:15–4:15 — Live Demo Flow (Screen Narrative)

> [!NOTE]
> **Demo Sequence Guide**:
>
> | Time | Action | Screen to Open | Spoken Script / Highlight |
> |---|---|---|---|
> | `0:00` | Open Landing Page | Executive Portal | *"We land on the executive portal showing global corridor status."* |
> | `0:05` | Click **Enter Dashboard** | Command Center | *"We enter the command center powered by an interactive Leaflet digital twin."* |
> | `0:20` | Click **Hormuz** | Diagnostic Drawer | *"Selecting Hormuz shows a 0.25% probability and LOW risk rating."* |
> | `0:30` | View **SHAP Diagnostics** | SHAP Drawer | *"SHAP reveals 90-day moving average tanker volume is stabilizing risk."* |
> | `0:40` | Click **Scenarios** | Simulator View | *"Let's model a crisis: set GPR Shock to 2.5x and Transit Drop to -45%."* |
> | `0:50` | Click **Run Simulation** | Scenario Results | *"The risk jumps from 0.25% to 48.2% (HIGH), triggering recommended drawdown interventions."* |
> | `1:00` | Click **Comparison** | Cross-Corridor Table | *"Finally, cross-corridor comparison gives a side-by-side view across all 4 corridors."* |

---

### ⏱️ 4:15–5:10 — Technical Differentiators

> *"What elevates this beyond a standard hackathon interface? Five production-grade architectural implementations:*
>
> 1. **Explainable AI (XAI)**: We don't output black-box scores. SHAP values explain exact numerical feature contributions for every corridor prediction.
> 2. **Model Lifecycle Governance**: We built a complete Champion/Challenger model registry with automated Population Stability Index (PSI) drift monitoring and retraining triggers.
> 3. **Enterprise Security & RBAC**: The FastAPI backend enforces 4-tier Role-Based Access Control (ADMIN, ML_ENGINEER, ANALYST, VIEWER) using HMAC-SHA256 token verification.
> 4. **Full Test & Resilience Coverage**: The system is backed by **313 backend pytest tests** and **29 frontend Vitest tests**, with full 413 payload rejection and 422 schema validation handling.
> 5. **Calibrated Load Performance**: Tested under concurrent load, our API achieves **85 requests per second with 0% error rates and p99 latency under 360ms**."*

---

### ⏱️ 5:10–5:40 — Business Impact & Value

> *"For import-dependent economies like India, this system transforms reactive crisis management into proactive energy resilience:
>
> - **Procurement Officers** can identify corridor vulnerabilities weeks before spot prices react.
> - **Refinery Managers** can optimize crude blending schedules based on predicted transit delays.
> - **Strategic Reserve Authorities** can simulate optimal drawdown schedules to cover supply gaps without depleting national reserves prematurely."*

---

### ⏱️ 5:40–6:00 — Strong Closing Statement

> *"To conclude: We didn't just build a visual dashboard. **We built an end-to-end, explainable decision intelligence platform that turns fragmented geopolitical, maritime, and economic signals into actionable supply chain resilience.**
>
> Thank you. We welcome your questions."*

---

## 2. 🏛️ Architecture Breakdown (20-Second Verbal Summary)

```
[ External Data Feeds ]    → GDELT Conflict News · IMF PortWatch Transits · FRED Brent Spot Prices
         │
[ Ingestion & Quality ]    → Async FastAPI Fetchers · Data Quality Validators · Parquet Storage
         │
[ Feature Engineering ]    → 24 Rolling Lag Moving Averages (7d/30d/90d) · GPR Volatility
         │
[ ML Model Inference ]     → Pre-trained XGBoost Classifiers · Platt Scaled Probabilities
         │
[ Explainability (XAI) ]   → SHAP Tree Explainer (Global & Local Feature Impact Values)
         │
[ Scenario Engine ]        → Mathematical What-If Simulator (GPR Shock, Transit Drops)
         │
[ Command Twin UI ]        → React 19 + TypeScript + TailwindCSS + Leaflet Cartographic Twin
```

---

## 3. 📊 Data Sources Reference Matrix

| Source Name | Category | What We Ingest | Primary Feature Usage | Status |
|:---|:---|:---|:---|:---|
| **GDELT Project** | External API Feed | Daily geopolitical conflict news events & GPR indices | `gpr_daily_7d_ma`, `gpr_volatility_30d` | Active Pipeline |
| **IMF PortWatch** | External API Feed | Daily tanker transit counts across major chokepoints | `tanker_7d_ma`, `tanker_lag7d_chg`, `tanker_90d_ma` | Active Pipeline |
| **FRED (St. Louis Fed)** | External API Feed | Daily Brent Crude spot prices ($/bbl) | `brent_spot_price`, `brent_returns_7d_std` | Active Pipeline |
| **Bab-el-Mandeb Traffic** | Proxy Feed | Chokepoint 4 maritime transit counts | Proxy feature feed for **Red Sea** corridor model | Documented Proxy |
| **XGBoost Pipeline** | Model Derived | Calibrated disruption probabilities & SHAP matrix | 5-vector risk decomposition & alerts | In-Memory / API |

---

## 4. 🧠 AI/ML Quick Technical Reference

> [!NOTE]
> **Q1. What exactly does the model predict?**  
> *The model predicts the calibrated probability (0.0 to 1.0) of a major maritime crude supply disruption or severe throughput drop occurring in a specific corridor over the next 30-day window.*

> [!NOTE]
> **Q2. Why choose XGBoost over Deep Learning or LSTM?**  
> *XGBoost excels on tabular time-series data with non-linear interaction effects, resists overfitting on small positive event counts, and natively integrates with SHAP Tree Explainer for exact feature attributions required in enterprise decision systems.*

> [!NOTE]
> **Q3. What are the primary features?**  
> *The key features are 7-day, 30-day, and 90-day moving averages of tanker transits, 7-day GPR news volatility, 30-day Brent price return standard deviations, and cross-vector interaction terms.*

> [!NOTE]
> **Q4. How do you prevent data leakage?**  
> *All temporal feature transformations—such as rolling means, standard deviations, and lag calculations—are computed strictly using past historical windows, with zero forward-looking data points in feature calculation or model fitting.*

> [!NOTE]
> **Q5. How do you know the model is reliable?**  
> *Models are evaluated out-of-sample using ROC-AUC and Brier Score, calibrated via Platt Scaling, and continuously monitored in production using Population Stability Index (PSI) and Kolmogorov-Smirnov (KS) drift tests.*

> [!NOTE]
> **Q6. How do you explain a prediction to a user?**  
> *We run a SHAP Tree Explainer on the trained XGBoost model to output exact marginal contributions (positive or negative impact values) for every feature, revealing the top drivers behind each score.*

> [!NOTE]
> **Q7. What happens when external data feeds fail?**  
> *The system falls back gracefully to locally cached Parquet historical snapshots, flags data freshness as DEGRADED, and returns explicit UNAVAILABLE limitation disclosures rather than outputting uncalibrated estimates.*

> [!NOTE]
> **Q8. How is the Red Sea model structured differently from other corridors?**  
> *Because direct Red Sea chokepoint transit feeds are not exposed by PortWatch, we model the Red Sea using Bab-el-Mandeb transit data as a documented proxy, combined with regional GDELT armed conflict logs.*

---

## 5. 🎯 Top 15 Judge Questions & Technical Answers

1. **What is the core innovation of your project?**  
   *Our core innovation is combining multi-source data fusion—geopolitical news, maritime satellite transits, and crude spot prices—with explainable XGBoost ML risk scoring and an interactive what-if scenario engine tailored for energy security.*

2. **How fresh is the data used in your platform?**  
   *The data is updated on a periodic daily batch pipeline from GDELT, IMF PortWatch, and FRED feeds, cached locally in Parquet format, and served via FastAPI endpoints with explicit freshness timestamps.*

3. **How do you handle severe class imbalance in disruption events?**  
   *Historical corridor disruptions represent under 3% of observations. We address this using recall-prioritized objective functions in XGBoost, threshold tuning, and Platt Scaling calibration.*

4. **How did you validate that your ML model doesn't overfit?**  
   *We evaluated performance using time-based rolling window cross-validation (Out-of-Sample split), validating ROC-AUC stability and monitoring Population Stability Index (PSI) to catch dataset shift.*

5. **Can a user run custom what-if scenario simulations?**  
   *Yes. Users can adjust sliders for Geopolitical Risk, Tanker Transit Drop %, Brent Price Shock %, and Reserve Drawdown Days. The backend recalculates adjusted feature vectors and returns updated disruption probabilities instantly.*

6. **Why did you use Bab-el-Mandeb as a proxy for the Red Sea?**  
   *IMF PortWatch tracks chokepoints like Bab-el-Mandeb and Suez, but lacks a discrete 'Red Sea' sensor. Using Bab-el-Mandeb transit data alongside Red Sea conflict logs provides the most accurate physical proxy.*

7. **How is security handled in your system?**  
   *We implemented HMAC-SHA256 API key authentication with a 4-tier Role-Based Access Control system (ADMIN, ML_ENGINEER, ANALYST, VIEWER), full key revocation, and audited access logs.*

8. **What happens if an API payload is maliciously oversized?**  
   *Our FastAPI gateway includes explicit request middleware that rejects payloads over 5MB with HTTP 413 (Payload Too Large) and malformed JSON with HTTP 422 before processing.*

9. **How do you monitor model drift in production?**  
   *Our Governance module calculates Population Stability Index (PSI) and Kolmogorov-Smirnov (KS) test statistics across inference batches, triggering automated retraining alerts when feature distributions shift.*

10. **How does the system assist procurement decisions?**  
    *When a corridor's disruption probability exceeds warning thresholds, the system ranks alternative corridors, quantifies risk deltas, and suggests reserve drawdown schedules.*

11. **Is the frontend responsive and accessible?**  
    *Yes. The UI is built with React 19 and TailwindCSS, supports dark and light themes, adheres to WCAG color contrast standards, and supports prefers-reduced-motion media queries.*

12. **How fast is your backend under concurrent user load?**  
    *In load testing with 10 concurrent virtual users generating 100 requests, our FastAPI backend sustained 85 requests/sec with a 0% error rate and p99 latency under 360ms.*

13. **How many automated tests back your codebase?**  
    *The repository is validated by 313 backend pytest unit/integration tests and 29 frontend Vitest component tests, achieving 100% pass rates across all test suites.*

14. **What are the main limitations of your current system?**  
    *Currently, maritime transit data relies on daily batch updates rather than raw AIS satellite feeds, and the Red Sea corridor operates on a Bab-el-Mandeb proxy. Direct AIS streaming is a planned extension.*

15. **How does this scale to other commodities like LNG or LPG?**  
    *The underlying 5-vector risk framework, feature engineering pipeline, and XGBoost architecture are commodity-agnostic; scaling to LNG requires only mapping new chokepoints and vessel transit feeds.*

---

## 6. ⚡ 30-Second Elevator Pitch

> *"India imports 88% of its crude oil, leaving our economy exposed to maritime chokepoint disruptions in corridors like Hormuz and Suez.*
>
> *We built **Energy Resilience Intel**—an AI-powered risk platform that fuses geopolitical news from GDELT, vessel transit data from IMF PortWatch, and oil market indicators from FRED.*
>
> *Using trained XGBoost models with SHAP explainability and interactive what-if scenario simulation, we enable energy decision-makers to predict supply disruptions weeks in advance, understand root drivers, and optimize rerouting and reserve drawdowns before crises impact national energy security."*

---

## 7. 🏷️ 10-Second Project Description

> **"An AI-powered maritime energy intelligence platform that fuses geopolitical, shipping, and market signals into explainable disruption predictions and what-if scenario simulations for import-dependent economies."**

---

## 8. ✅ Final Pre-Presentation Verification Checklist

- [x] **Backend API Server**: Running on `http://127.0.0.1:8000` (`python scripts/run_api.py`)
- [x] **Frontend Command Center**: Running on `http://localhost:5173` (`npm run dev`)
- [x] **API Health Endpoint**: `/api/health` returns `{"status": "healthy"}`
- [x] **Risk Snapshot Endpoint**: `/api/risk` returns valid data for all 4 corridors
- [x] **Corridor Selection**: Clicking **Hormuz**, **Suez**, **Bab-el-Mandeb**, and **Red Sea** updates map & drawer
- [x] **SHAP Diagnostics**: Drawer displays top factor contribution bars without errors
- [x] **Scenario Simulator**: Modifying sliders and clicking **Run Simulation** updates probability and delta
- [x] **Historical Trends**: 30-day inference history charts render smoothly
- [x] **Cross-Corridor Comparison**: Comparison table displays all 4 corridors side by side
- [x] **Red Sea Limitation**: Red Sea proxy limitation disclosure notice is visible in drawer
- [x] **Theme Switcher**: Light and Dark mode toggle operates smoothly without text contrast issues
- [x] **Role Switcher**: TopBar role dropdown switches between ADMIN, ANALYST, and VIEWER
- [x] **Browser Console**: Zero uncaught JavaScript or network errors in developer tools
- [x] **Production Build Verification**: `npm run build` succeeds cleanly with 0 TypeScript/Vite errors
