# Risk Scoring & Decomposition Methodology

This document outlines the mathematical framework and feature mapping used by the Risk Engine to compute corridor-level disruption probabilities, overall risk threat levels, and the 5-vector risk decomposition.

---

## 1. Risk Inputs & Feature Vectors

The risk engine ingests daily raw signals from three main sectors:
1. **Geopolitical**: Caldara-Iacoviello Daily Global GPR Index, Country-level Monthly Indices, and GDELT Daily security counts.
2. **Maritime Traffic**: IMF PortWatch daily tanker and total vessel transits, standard deviations, and statistical anomaly flags.
3. **Market Price & Supply**: FRED Brent crude spot prices, daily log returns, rolling volatility, refinery throughput, consumption metrics, and imports.

All 52 input features are lagged by **1 day** to prevent look-ahead bias and target leakage, ensuring that the risk predicted for day $t$ depends only on information from day $t-1$ and earlier.

---

## 2. Probability and Scoring Framework

Disruption probability is calculated directly by the best-performing model (XGBoost) for the given corridor.
The raw probability output $p_t \in [0, 1]$ represents the statistical likelihood that a physical cargo transit drop (TRAFFIC_DROP anomaly) will occur on day $t$ accompanied by a documented geopolitical event.

### Score Transformation
The overall risk score $S_t \in [0, 100]$ is a direct linear scaling of the model probability:
$$S_t = p_t \times 100$$

### Risk Band Classification
The overall risk score is categorized into four operational risk bands based on empirical chokepoint baseline thresholds:
- **LOW**: $S_t < 10.0$ (disruption probability $< 10\%$)
- **MODERATE**: $10.0 \le S_t < 25.0$ (disruption probability $10\% - 25\%$)
- **HIGH**: $25.0 \le S_t < 50.0$ (disruption probability $25\% - 50\%$)
- **CRITICAL**: $S_t \ge 50.0$ (disruption probability $\ge 50\%$)

---

## 3. Risk Vector Decomposition

The overall risk score is decomposed into five distinct risk vector contributions. This decomposition is computed using normalized SHAP (SHapley Additive exPlanations) values from the local model explanations.

Each of the 52 features is mapped to one of five risk categories:
1. **Geopolitical**: Includes global and corridor GPR indices, and local event counts.
2. **Maritime**: Includes tanker count, rolling averages, std, lag changes, and PortWatch anomaly flags.
3. **Energy Market**: Includes Brent crude price, daily return, volatility, and lags.
4. **Infrastructure**: Includes monthly refinery throughput, consumption, and imports.
5. **Historical Pattern**: Represents the sanctions designations and seasonal month sin/cos calendar features.

### Mathematical Normalization
For any given prediction, the raw feature contributions $C_f$ (coefficient weight or SHAP value) are aggregated into the five group sums:
$$G_g = \sum_{f \in \text{Group } g} |C_f|$$

The relative contribution weight $W_g$ for each risk vector is calculated as:
$$W_g = \frac{G_g}{\sum_{j=1}^5 G_j}$$

This ensures that the five risk vectors are fully normalized and sum to `1.0` (or `100%`) in the API response, providing a clean relative attribution of the active risk drivers.
