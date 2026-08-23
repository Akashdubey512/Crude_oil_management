# Model Card: BAB_EL_MANDEB Risk Anomaly & Disruption Predictor

This model card documents the training specifications, features, and operational limits for the Bab-el-Mandeb Strait corridor risk prediction model.

---

## 1. Model Details

- **Model Purpose**: Predicts the daily probability of shipping traffic disruptions and missile/drone security incidents in the Bab-el-Mandeb Strait.
- **Corridor**: BAB_EL_MANDEB
- **Algorithm Type**: XGBoost Classifier (Champion Model v1.0)
- **Model Version**: 1.0 (Production Champion)
- **Intended Use**: Red Sea bypass risk evaluation, Cape of Good Hope rerouting cost calculations, and LNG carrier security assessments.
- **Non-intended Use**: Intraday high-frequency tactical navigation.

---

## 2. Ingestion & Feature Engineering

### Geopolitical Features
- GDELT event stream monitoring Yemen, Red Sea, Gulf of Aden kinetic operations.
- Daily GPR threat index and Regional Middle East Conflict sub-indices.
- 7d, 14d, and 28d rolling incident event frequencies.

### Maritime Features
- PortWatch direct chokepoint sensor observations (tanker count, dry bulk, container vessel volume).
- 28-day rolling volume moving averages and z-score anomaly deviations.
- Cape of Good Hope diversion percentage tracking.

### Energy Market Features
- Brent crude oil spot returns and log volatility.
- Shipping freight cost indices (Baltic Clean Tanker Index).

---

## 3. Training & Validation Context

- **Training Period**: 2019-01-01 to 2025-09-30
- **Validation Period**: 2025-10-01 to 2026-03-31
- **Out-of-Sample Test Period**: 2026-04-01 to 2026-08-16
- **Champion ROC-AUC**: 0.9520 | **PR-AUC**: 0.9240 | **Brier Score**: 0.038
