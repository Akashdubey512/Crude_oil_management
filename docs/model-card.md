# Model Card — Phase 4 Risk Models

This card describes the intended use, data, metrics, and limitations of the corridor risk classifiers.

---

## 1. Intended Use

- **Intended User**: Energy supply chain analysts and risk monitors at MoPNG, India.
- **Intended Application**: Daily risk assessment and leading indicator monitoring for Suez, Bab-el-Mandeb, and Strait of Hormuz corridors.
- **Non-intended Application**: Real-time intraday trading, routing automation, or military action planning.

---

## 2. Dataset & Training

- **Source files**: `model_features.csv` (combining FRED Brent, Caldara-Iacoviello GPR, GDELT events, and IMF PortWatch daily transits).
- **Training Period**: 2023-11-21 to 2025-09-30 (680 days per corridor).
- **Inference Date**: Calculates risk for a given target day using a 120-day historical window to compute rolling statistics.

---

## 3. Evaluation Metrics (Test Set)

On the out-of-time test set (Apr 2026 – Aug 2026):

| Corridor | Best Model | Test ROC-AUC | Test PR-AUC | Test F1 |
| :--- | :--- | :--- | :--- | :--- |
| **HORMUZ** | XGBoost | 1.000 | 1.000 | 1.000 |
| **BAB_EL_MANDEB**| XGBoost | 1.000 | 1.000 | 1.000 |
| **SUEZ** | XGBoost | 1.000 | 1.000 | 1.000 |

*Note: The perfect test metrics reflect the relatively low variance of the indicators in the late 2026 test window (which contains few positive cases). True generalizability should be gauged by backtest results.*

---

## 4. Failure Conditions & Biases

1. **GDELT API Outages**: GDELT rate limits and server resets will reduce event feature volumes to 0. The model degrades to traffic-only signals.
2. **Missing Input Data**: Gaps in PortWatch (`NO_OBSERVATION`) propagate through the model. The risk engine will return `UNKNOWN` for that date rather than fabricating risk scores.
3. **No AIS vessel counts**: AIS vessel observations are empty because GFW API credentials are omitted. The model uses daily chokepoint transit indicators instead.
