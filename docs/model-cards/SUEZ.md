# Model Card: SUEZ Canal Risk Anomaly & Disruption Predictor

This model card documents the training specifications, features, and operational limits for the Suez Canal transit corridor risk prediction model.

---

## 1. Model Details

- **Model Purpose**: Predicts the daily probability of canal transit blockage, physical delays, and regional spillover disruptions in the Suez Canal.
- **Corridor**: SUEZ
- **Algorithm Type**: XGBoost Classifier (Champion Model v1.0)
- **Model Version**: 1.0 (Production Champion)
- **Intended Use**: Mediterranean-Indian Ocean supply chain vulnerability modeling, transit queue duration prediction, and strategic fuel stock buffering.
- **Non-intended Use**: Intraday tactical canal convoys scheduling.

---

## 2. Ingestion & Feature Engineering

### Geopolitical Features
- Middle East and Eastern Mediterranean GDELT incident repository queries.
- Daily GPR index and regional security alerts.

### Maritime Features
- PortWatch Suez Northbound and Southbound tanker passage volumes.
- Convoy capacity utilization and anchorage waiting times at Port Said / Suez Port.
- Draft depth limitations and extreme weather event flags.

### Energy Market Features
- Brent crude spot prices, crack spreads, and crude tanker freight surcharges.

---

## 3. Training & Validation Context

- **Training Period**: 2019-01-01 to 2025-09-30
- **Validation Period**: 2025-10-01 to 2026-03-31
- **Out-of-Sample Test Period**: 2026-04-01 to 2026-08-16
- **Champion ROC-AUC**: 0.9380 | **PR-AUC**: 0.8990 | **Brier Score**: 0.051
