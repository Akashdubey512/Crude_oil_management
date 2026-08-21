# Historical Backtesting & Validation (Phase 4)

This document describes the historical backtest simulation and its performance on real-world shipping crises.

---

## 1. Backtest Design

We walk the trained risk engine chronologically over the validation and test periods (Oct 2025 – Aug 2026).
For each disruption episode (where `is_disrupted = 1`), we verify:
- Did the model raise an elevated risk probability ($p \ge 30\%$) within the **7 days prior**?
- **Lead time**: The number of days between the first elevated risk probability and the physical traffic drop.
- **False Alarm Rate**: The percentage of normal days where the model raised a false warning ($p \ge 30\%$).

---

## 2. Key Backtest Results

The best models (XGBoost/Random Forest) were backtested with the following results:

### A. Strait of Hormuz (`HORMUZ`)
- **Total Disruption Episodes**: 6 days of traffic drops.
- **Detected**: 3 episodes (50% Detection Rate).
- **Average Lead Time**: 2.0 days.
- **False Alarm Rate**: 0.0% (0 false alarm days).

### B. Bab-el-Mandeb (`BAB_EL_MANDEB`)
- **Total Disruption Episodes**: 6 days of traffic drops.
- **Detected**: 1 episode (17% Detection Rate).
- **Average Lead Time**: 1.0 day.
- **False Alarm Rate**: 0.0% (0 false alarm days).

### C. Suez Canal (`SUEZ`)
- **Total Disruption Episodes**: 0 days of traffic drops in the validation/test period.
- **Detection Rate**: N/A (no events occurred).

---

## 3. Honest Limitations & Observations

1. **Very Low False Alarm Rate**: All three models achieved a **0.0% false alarm rate**, indicating the classifiers are highly conservative. They only trigger when signals align strongly, preventing alarm fatigue.
2. **Low Detection Rate on Bab-el-Mandeb**: The model only caught 17% (1 of 6) of drops. This is due to the lack of live, high-volume GDELT event counts in the early part of the validation set (late 2025), which degraded the B-criterion overlap.
3. **No positive cases for Suez Canal**: In the test/validation period, Suez Canal traffic remained stable or experienced no qualifying drop anomalies, meaning no instances could be evaluated.
