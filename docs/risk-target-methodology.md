# Risk Target Labeling Methodology (Phase 4)

This document describes the labeling methodology used to define historical corridor disruption events.

---

## 1. Disruption Target Definition

To train the predictive classifiers, we define a binary target variable `is_disrupted` for each `(date, corridor_id)` record. Rather than modeling an arbitrary, uncalibrated risk score, we define disruption based on observable, physical, and causal evidence in the dataset.

A day is labeled **Disrupted** (`is_disrupted = 1`) if:
1. **Physical Traffic Decline (Criterion A)**: The corridor is in a statistical **TRAFFIC_DROP** state (daily tanker transits fall below `Rolling Median - 2 * Rolling Std` over a 28-day window).
2. **Geopolitical Causation (Criterion B)**: At least one geopolitical or shipping disruption event (e.g. tanker attack, naval tension) is mapped to this corridor within a **±3-day window** around the date.

If Criterion A is met but Criterion B is not, the day is labeled **Negative** (`is_disrupted = 0`) to prevent seasonal fluctuations from being flagged as disruptions. If the daily traffic observations are missing (`NO_OBSERVATION` in the anomaly log), the row is marked `NaN` and **excluded** from training.

---

## 2. Threshold Justification

- **2 Standard Deviations**: A standard statistical boundary for identifying outliers in normal distributions, capturing true volume drops rather than everyday traffic variations.
- **28-Day Median Baseline**: A rolling 28-day window is long enough to establish a stable local baseline but short enough to adapt to seasonal shipping pattern shifts.
- **±3-Day Event Window**: Sourced events may suffer from reporting lags (news databases registering events 1-2 days late) or transmission lags (vessel route changes taking a few days to show up in transit counts).

---

## 3. Class Imbalance and Data Gaps

Across our 3,000 daily corridor records (Nov 2023 – Aug 2026):
- **Hormuz**: 24 positive instances (2.40% positive rate)
- **Bab-el-Mandeb**: 14 positive instances (1.40% positive rate)
- **Suez Canal**: 20 positive instances (2.00% positive rate)

### Degraded Labeling Mode
Due to GDELT coverage gaps (sparse event collection prior to July 2026), the event window (Criterion B) matches only in the active months. In earlier periods, the labeler automatically degrades to **Criterion A only** (`DISRUPTED_TRAFFIC_ONLY` mode) rather than fabricating events, ensuring all historical drops are captured. This limitation is noted and accepted.
