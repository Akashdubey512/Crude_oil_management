# Phase 9 Pre-Implementation Audit

This document summarizes the current architecture, data, and model lineage of the Crude Oil Management and Maritime Corridor Risk Intelligence Platform before implementing the Phase 9 ML Validation, Governance, and Data-Drift Monitoring features.

---

## 1. Current Model Types
The platform supports three distinct model classes for predicting corridor disruption probability:
- **XGBoost Classifier** (Primary model chosen for production risk inference)
- **Random Forest Classifier**
- **Logistic Regression Classifier**

Models are trained independently for each of the three modeled corridors:
- `HORMUZ` (Strait of Hormuz)
- `BAB_EL_MANDEB` (Bab-el-Mandeb Strait)
- `SUEZ` (Suez Canal)

*Note: `RED_SEA` has no independent model trained because AIS traffic logs from PortWatch do not cover daily transit counts for the Red Sea corridor. It is marked as `UNKNOWN` for risk score and probability.*

---

## 2. Current Target Variable
- **Target Column:** `is_disrupted` (binary indicator: `1.0` for a disruption episode, `0.0` for normal operations).
- **Target Construction:** Built in Phase 4 based on actual disruption episodes, such as combined vessel transit anomalies and geopolitical conflict events.
- **Class Imbalance:**
  - `HORMUZ`: 18 positive samples in train, 6 in validation, 0 in test.
  - `BAB_EL_MANDEB`: 8 positive samples in train, 3 in validation, 3 in test.
  - `SUEZ`: 15 positive samples in train, 2 in validation, 3 in test.
  - Overall class ratio is approximately 1.4% to 2.4% positive across all observations.

---

## 3. Current Feature Set
There are 52 features defined under `FEATURE_COLS` in `src/features/feature_pipeline.py`. These features span four main domains:
1. **Geopolitical Risk (GPR):** `gpr_daily`, `gpr_threat`, `gpr_daily_7d_ma`, `gpr_daily_28d_ma`, `gpr_daily_28d_std`, `gpr_india_monthly`, etc.
2. **Maritime Traffic/Shipping Flows:** `tanker_count`, `vessel_count`, `cargo_count`, `tanker_7d_ma`, `tanker_28d_ma`, `tanker_decline_ratio_28d`, `tanker_zscore_28d`, `anomaly_flag`, `anomaly_type_drop`, etc.
3. **Crude Oil Prices & Market Volatility:** `brent_price`, `brent_return_1d`, `brent_return_7d`, `brent_volatility_7d`, `brent_volatility_28d`, etc.
4. **Supply Chain Infrastructure & Demand:** `refinery_throughput_tmt`, `refinery_mom_change`, `consumption_total_tmt`, `crude_import_tmt`, `crude_import_mom_change`, etc.
5. **Temporal & Seasonal Encodings:** `month_sin`, `month_cos`, `day_of_week`.

---

## 4. Training Dataset
- **File Name:** `data/processed/model_features.csv`
- **Rows per Corridor:**
  - `train`: 680 rows
  - `validation`: 182 rows
  - `test`: 138 rows
  - **Total:** 1,000 rows per corridor.

---

## 5. Validation/Test Strategy
The dataset uses strict **chronological splitting** to evaluate time-dependent maritime risk prediction without temporal shuffling:
- **Training Period:** `2023-11-21` to `2025-09-30`
- **Validation Period:** `2025-10-01` to `2026-03-31` (Out-of-sample)
- **Test Period:** `2026-04-01` to `2026-08-16` (Out-of-sample, latest unseen period)

---

## 6. Existing Model Artifacts
Trained model pickles are saved under `models/` directory:
- `lr_hormuz_v1.0.pkl`, `rf_hormuz_v1.0.pkl`, `xgb_hormuz_v1.0.pkl`
- `lr_bab_el_mandeb_v1.0.pkl`, `rf_bab_el_mandeb_v1.0.pkl`, `xgb_bab_el_mandeb_v1.0.pkl`
- `lr_suez_v1.0.pkl`, `rf_suez_v1.0.pkl`, `xgb_suez_v1.0.pkl`

Each pickle contains:
- `model`: The trained scikit-learn pipeline or XGBoost Classifier object.
- `feature_medians`: The median values of training features used to impute missing inputs.

---

## 7. Existing Prediction Pipeline
- Predictions are generated dynamically in `src/risk/corridor_risk.py` using `get_corridor_risk`.
- The pipeline builds a 120-day temporal window around the target date to calculate rolling features (GPR, PortWatch transits, Brent returns).
- **Target Leakage Prevention:** Enforced via `.shift(1)` applied to all feature columns in `src/risk/corridor_risk.py` before model inference. This lag ensures that only historical info available prior to the prediction date is utilized.

---

## 8. Existing Database Tables
- **None.** The project currently operates entirely on flat files (CSV/JSON) stored under `data/staging`, `data/processed`, and `data/manifests`.
- There is no SQL database engine (SQLite, PostgreSQL, etc.) initialized or tracked in the existing codebase.

---

## 9. Existing Model Version Information
- **Model Registry:** Managed in `data/manifests/model_registry.json`.
- Registry entries specify `model_name`, `corridor_id`, `version` (default: `"1.0"`), `training_start`, `training_end`, `feature_version`, `dataset_hashes`, parameters, training/validation metrics, and `artifact_path`.
- **Primary Model Selection:** The API loads the first matching model from `["XGBoost", "RandomForest", "LogisticRegression"]` whose pickle exists in `models/`.

---

## 10. Existing Data Freshness Logic
- Located in `_get_data_freshness()` in `src/api/services/risk_service.py`.
- Computes maximum dates for:
  - **Traffic:** Based on `data/processed/corridor_traffic_daily.csv`
  - **Geopolitical Risk:** Based on `data/staging/geopolitical_risk.csv`
  - **Prices:** Based on `data/staging/crude_prices.csv`
