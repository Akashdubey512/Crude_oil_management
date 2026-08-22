# Model Performance Validation, Governance & Drift Monitoring Methodology

This document outlines the methodology, statistical tests, and engineering design implemented in Phase 9 to validate the models out-of-sample, govern version registries, monitor feature drift, and audit predictions.

---

## 1. Out-of-Sample Performance Engine

To gauge model reliability in a production setting, we perform daily evaluations strictly on the out-of-sample (OOS) splits:
- **Validation Partition**: 2025-10-01 to 2026-03-31
- **Test Partition**: 2026-04-01 to 2026-08-16

### Classification Metrics
For splits containing both positive (disruption) and negative (normal) days, the evaluation engine calculates:
- **ROC-AUC**: Receiver Operating Characteristic Area Under the Curve (discrimination capacity).
- **PR-AUC**: Precision-Recall Area Under the Curve (more robust for imbalanced classes).
- **Accuracy**: Fraction of correct classifications under a 0.50 risk probability threshold.
- **Precision / Recall / F1 Score**: Measures class-level predictions vs actual occurrences.
- **Specificity**: Ability of the model to correctly identify normal days.
- **Matthews Correlation Coefficient (MCC)**: High-quality metric for binary classifications on imbalanced datasets.

### Probability Calibration & ECE
Model probabilities must correspond to actual frequencies of events to prevent alert fatigue.
- **Expected Calibration Error (ECE)**: Measures the average difference between the model's confidence and its accuracy. We divide the $[0, 1]$ probability range into 10 equally spaced bins:
  $$ECE = \sum_{m=1}^{10} \frac{|B_m|}{N} \left| acc(B_m) - conf(B_m) \right|$$
  where $|B_m|$ is the sample count in bin $m$, $N$ is the total count, $acc(B_m)$ is the observed disruption rate, and $conf(B_m)$ is the average predicted probability.
- **Calibration Status**:
  - `GOOD`: $ECE < 0.05$
  - `MODERATE`: $0.05 \le ECE < 0.15$
  - `DEGRADED`: $ECE \ge 0.15$

---

## 2. Feature Data Drift Detection

Feature distributions change over time due to seasonal fluctuations, conflict developments, or changes in shipping patterns. We evaluate drift daily by comparing the distribution of incoming features (current validation/test splits) against the training baseline (reference).

### Population Stability Index (PSI)
PSI measures the extent of distribution shift between two datasets. Features are binned into deciles based on the reference distribution:
$$PSI = \sum_{i=1}^{10} \left( P_i - Q_i \right) \times \ln\left( \frac{P_i}{Q_i} \right)$$
where $P_i$ is the actual proportion of samples in bin $i$ (current), and $Q_i$ is the expected proportion (reference training).
- **Severity Boundaries**:
  - **LOW Drift** ($PSI < 0.10$): Stable distribution; no action needed.
  - **MEDIUM Drift** ($0.10 \le PSI < 0.25$): Moderate shift; monitor features.
  - **HIGH Drift** ($PSI \ge 0.25$): Significant drift; retraining recommended.

### Kolmogorov-Smirnov (KS) Test
For numerical features, we conduct a two-sample Kolmogorov-Smirnov test (`ks_2samp`) to determine if the reference and current features are drawn from the same underlying distribution. It evaluates the maximum vertical distance between the two cumulative distribution functions:
$$D = \sup_x \left| F_{1,n}(x) - F_{2,m}(x) \right|$$
The test yields a $D$-statistic and a $p$-value. A small $p$-value (e.g. $p < 0.05$) indicates that the distributions are statistically different.

---

## 3. Persistent Prediction History & Governance

To maintain traceability and audit capability for all operational decisions, the system logs predictions to an SQLite database:
- **File Location**: `data/predictions.db`
- **Audit Trails**: Every risk query logs an immutable record with:
  - `timestamp`: The date of prediction.
  - `corridor`: Monitored chokepoint.
  - `predicted_probability` and `predicted_class`.
  - `feature_snapshot`: JSON dump of features active during inference.
  - `model_version`: Active model card identifier (e.g., `1.0`).
- **Pre-Population**: The `model_versions` table is populated at startup from `model_registry.json` for governance.
