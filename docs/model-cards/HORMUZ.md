# Model Card: HORMUZ Risk Anomaly & Disruption Predictor

This model card documents the training specifications, features, and operational limits for the Strait of Hormuz energy transit corridor risk prediction model.

---

## 1. Model Details

- **Model Purpose**: Predicts the daily probability of tanker transit disruptions, security threats, and naval incidents in the Strait of Hormuz.
- **Corridor**: HORMUZ (Strait of Hormuz)
- **Algorithm Type**: XGBoost Classifier (Champion Model v1.0)
- **Model Version**: 1.0 (Production Champion)
- **Intended Use**: Strategic oil supply risk modeling, India crude import buffer management, and emergency reserves dispatch planning.
- **Non-intended Use**: Tactical intraday vessel navigation.

---

## 2. Ingestion & Feature Engineering

### Geopolitical Features
- Caldara & Iacoviello Daily Geopolitical Risk Index (GPR), Middle East threat sub-indices.
- GDELT regional incident density (anti-shipping actions, naval seizures, IRGC alerts).
- 7-day, 14-day, and 28-day exponential moving average threat momentum.

### Maritime Features
- PortWatch daily tanker and LNG carrier transit volume.
- Historical traffic baseline comparison (deviation from 90-day moving average).
- Speed anomalies and anchorage congestion indices near Bandar Abbas and Fujairah.

### Energy Market Features
- Brent crude oil spot pricing, 7-day realized volatility, and term structure spreads.
- India refinery intake dependencies and strategic petroleum reserves (SPR) exposure.

---

## 3. Training & Validation Context

- **Training Period**: 2019-01-01 to 2025-09-30
- **Validation Period**: 2025-10-01 to 2026-03-31
- **Out-of-Sample Test Period**: 2026-04-01 to 2026-08-16
- **Target Labeling**: Disruption event defined as tanker transit decline >25% concurrent with GPR geopolitical threat spikes.
- **Champion ROC-AUC**: 0.9412 | **PR-AUC**: 0.9105 | **Brier Score**: 0.046
