# Feature Engineering Methodology (Phase 4)

This document describes the design, construction, and mathematical transformations applied to features used in the Geopolitical Risk and Disruption Prediction Engine.

---

## 1. Feature Ingestion Categories

Features are divided into four main domains:

### A. Geopolitical signals
- **GPR Index values**: Daily `gpr_daily` (GPRD), `gpr_act` (GPRD_ACT), and `gpr_threat` (GPRD_THREAT) indices capturing global political spikes.
- **Rolling GPR**: 7-day and 28-day moving averages (`gpr_daily_7d_ma`, `gpr_daily_28d_ma`, `gpr_daily_28d_std`) to track persistent tension shifts.
- **Country Monthly GPR**: India (`gpr_india_monthly`), China (`gpr_china_monthly`), Russia (`gpr_russia_monthly`), and Saudi Arabia (`gpr_saudi_monthly`) indices broadcasted daily with a **1-month lag** to prevent target leakage.
- **Event counts**: Mapped GDELT and OFAC daily event counts for specific corridors (`corridor_events_1d`, `corridor_events_7d`, `corridor_events_28d`), and separate metrics tracking `sanctions` and `disruption` category counts.
- **Global Event spillover**: Rolling counts of all global energy events to model background tension levels (`global_events_7d`, `global_events_28d`).

### B. Maritime Signals (IMF PortWatch)
- **Vessel Traffic counts**: Raw `tanker_count`, `vessel_count`, and `cargo_count`.
- **Rolling Traffic baselines**: 7-day, 14-day, 28-day, and 90-day moving averages of daily tanker transits.
- **Relative decline**: `tanker_decline_ratio_28d` measures current tanker traffic relative to the rolling 28-day median:
  $$\text{Decline Ratio} = \frac{\text{Tankers} - \text{Median}_{28}}{\text{Median}_{28}}$$
- **Z-score**: `tanker_zscore_28d` measures standard deviations of deviation from the mean:
  $$\text{Z-score} = \frac{\text{Tankers} - \text{Mean}_{28}}{\text{Std}_{28}}$$
- **Temporal lags**: `tanker_lag1d` and `tanker_lag7d` along with daily and weekly percentage changes.

### C. Energy and Market Signals (FRED Brent)
- **Brent Price**: Daily Brent crude price `brent_price` (forward-filled up to 3 days for weekends).
- **Brent returns**: Daily returns (`brent_return_1d`) and weekly returns (`brent_return_7d`) computed via log returns.
- **Brent volatility**: Rolling 7-day and 28-day standard deviations of daily returns.
- **Z-score & Lags**: `brent_zscore_28d` and price values lagged by 7 and 28 days.

### D. Supply and Demand Indicators (PPAC Staged)
To map monthly supply data onto a daily prediction model without future leakage, features are shifted by **1 month + 1 day** (e.g. daily rows in February only see December PPAC totals, matching actual release delays):
- **Refinery throughput**: Lagged national refinery grand total (`refinery_throughput_tmt`) and MoM percentage change (`refinery_mom_change`).
- **Petroleum consumption**: Lagged national product consumption (`consumption_total_tmt`) and MoM change.
- **Crude imports**: Lagged national crude imports (`crude_import_tmt`) and MoM change.

### E. Seasonality & Calendar
- **Month Sine/Cosine**: Cyclical mapping of month to capture seasonal demand fluctuations.
- **Day of week**: Ordinal mapping.

---

## 2. Missing-Value Policy

- **Brent/GPR Daily prices**: Market closure gaps are forward-filled up to 3 days, then left as NaN.
- **Traffic observations**: NO_OBSERVATION gaps in PortWatch data are **never** forward-filled or interpolated. They remain NaN.
- **PPAC monthly data**: Kept as NaN if the lagged month is missing.
- **Pre-training Imputation**: Feature medians are calculated from the **train split only** and used to impute remaining NaNs. Test/validation splits are imputed using train medians to prevent leakage.
