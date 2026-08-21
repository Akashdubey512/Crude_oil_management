# Corridor Risk Engine Reference (Phase 4)

This document describes the operational risk engine configuration, risk classifications, and integration service API.

---

## 1. Risk Level Classifications

The corridor risk engine classifies daily prediction probabilities into four risk bands:

| Risk Level | Probability Band | Description | Operational Action |
| :--- | :--- | :--- | :--- |
| **LOW** | $p < 10\%$ | Traffic and geopolitical indices remain within standard bounds. | Baseline monitoring. |
| **MODERATE** | $10\% \le p < 25\%$ | Traffic drops or geopolitical index spikes indicate emerging anomalies. | Log warnings; review GDELT news events. |
| **HIGH** | $25\% \le p < 50\%$ | Significant statistical traffic deviations combined with high GPR scores. | Advisory alerts; assess rerouting options. |
| **CRITICAL** | $p \ge 50\%$ | Model predicts corridor disruption as more likely than not. | Actionable alerts; initiate supply contingency plans. |

---

## 2. Risk Decomposition

The probability score is decomposed into five distinct risk vectors (interpretable sub-components):

1. **Geopolitical Risk**: Driven by `gpr_daily`, `gpr_threat`, and GDELT event volume.
2. **Sanctions Risk**: Driven by OFAC list additions and corridor-linked sanctions event counts.
3. **Maritime Risk**: Driven by PortWatch daily tanker volumes and statistical deviations.
4. **Market Risk**: Driven by Brent crude price volatility and daily returns.
5. **Supply Risk**: Driven by PPAC refinery throughput, consumption, and imports.

> [!WARNING]
> Risk vectors are computed via normalized weighted feature activations. They are **not** statistically independent and must not be combined multiplicatively.

---

## 3. Integration Service API (`src/risk/service.py`)

The service provides clean, FastAPI-ready endpoints:
- `get_corridor_risk_with_explanation(corridor_id, date)`: Returns risk probability, classified risk band, leading indicators, top risk factors, and the full 5-part risk decomposition.
- `get_all_corridor_risks(date)`: Evaluates risk for all three modeled corridors.
- `get_historical_risk(corridor_id, start_date, end_date)`: Returns time-series vectors of risk probabilities.
