# Model Card: RED_SEA Risk Anomaly & Disruption Predictor

This model card documents the training specifications, features, and operational limitations for the Red Sea corridor risk prediction model.

---

## 1. Model Details

- **Model Purpose**: Predicts the daily probability of shipping traffic disruptions and security incidents in the Red Sea corridor.
- **Corridor**: RED_SEA
- **Algorithm Type**: XGBoost Classifier (supervised machine learning pipeline)
- **Model Version**: 2.0 (Governed MLOps Candidate)
- **Intended Use**: Real-time maritime corridor risk profiling, supply chain impact modeling, and proactive redirection planning.
- **Non-intended Use**: Intraday high-frequency tactical shipping guidance.

---

## 2. Ingestion & Feature Engineering

### Geopolitical Features
- Global Daily/Monthly Geopolitical Risk Indexes (Daily GPR, Russia/Saudi/China/India Monthly GPR).
- Rolling window count of local geopolitical events in the corridor (7d and 28d aggregates).
- Local maritime incidents (Houthi attacks, piracy events).

### Maritime Features
- PortWatch daily vessel transit counts (tanker count, vessel count, cargo count).
- Rolling averages, standard deviations, and lag change statistics (7d, 14d, 28d, 90d rolling window offsets).
- Anomaly flags signaling traffic drops or congestion.

### Energy Features
- Brent crude oil daily spot prices, log returns, and rolling volatility indicators.
- India refinery throughput (mom changes) and aggregate crude imports.

---

## 3. Training & Validation Context

- **Training Split Period**: 2019-01-01 to 2025-09-30
- **Validation Split Period**: 2025-10-01 to 2026-03-31
- **Test Split Period**: 2026-04-01 to 2026-08-16
- **Class Imbalance**: Highly imbalanced dataset (~14 positive disruption events in training split vs ~2,771 negative days).
- **Target Labeling**: Disruption is defined as a significant drop in traffic (>30% below 28d historical moving average) aligned with a verified local geopolitical attack or Houthi shipping incident.

---

## 4. Key Limitations & Proxy Disclosures

> [!IMPORTANT]
> **Proxy Data Disclosure**:
> PortWatch (the platform's AIS source) does not publish daily vessel transit counts directly for the Red Sea corridor. **Bab el-Mandeb traffic (chokepoint4) is used as a proxy for Red Sea corridor traffic.** All predictions, metrics, and rolling averages are calculated based on this proxy relationship.

- **GDELT Event Density**: GDELT event coverage is sparse before July 2026 — event-confirmation criterion not met for most historical drops.
- **GFW AIS Observations**: GFW AIS vessel observations are excluded due to API credential limitations; PortWatch transit counts are used as the primary traffic proxy.
- **Overfitting Warning**: Perfect test-set ROC-AUC (1.000) reflects limited positive cases in the validation/test chronological out-of-time windows, not guaranteed production accuracy.

---

## 5. Model Performance Metrics

The governed XGBoost candidate achieved the following validation split performance:
- **ROC-AUC**: 0.875
- **PR-AUC**: 0.097
- **Brier Score**: 0.0084 (low score indicates good probability calibration)
- **Expected Calibration Error (ECE)**: 0.0061
