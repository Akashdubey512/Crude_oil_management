# Modeling Methodology (Phase 4)

This document describes the train-test split strategy, models, and hyperparameters used to fit the risk classifiers.

---

## 1. Train-Test Splitting

To prevent future data leakage, we enforce a strict **Chronological Split** of the daily observations (Nov 2023 – Aug 2026):

- **Training period**: 2023-11-21 to 2025-09-30 (680 days per corridor, 2,040 total rows)
- **Validation period**: 2025-10-01 to 2026-03-31 (182 days per corridor, 546 total rows)
- **Testing period**: 2026-04-01 to 2026-08-16 (138 days per corridor, 414 total rows)

Validation dates are used to tune hyperparameter parameters (like XGBoost early stopping). Test dates remain untouched until final evaluation. Random cross-validation is strictly forbidden to prevent temporal leakage.

---

## 2. Model Baseline Implementations

We fit three distinct machine learning classifiers:

### A. Logistic Regression (Baseline)
- Regularized L2 penalty (`C=0.1`) to prevent overfitting.
- Features standardized via `StandardScaler()`.
- Imbalance handled via `class_weight='balanced'`.

### B. Random Forest
- Forest of 200 estimators.
- `max_depth` limited to 6 and `min_samples_leaf` limited to 5 to avoid tree overfitting.
- Imbalance handled via `class_weight='balanced'`.

### C. XGBoost (Gradient Boosted Trees)
- 200 trees, `max_depth=4`, `learning_rate=0.05`.
- `scale_pos_weight` set to negative/positive ratio (~40x weight) to address class imbalance.
- Validation split used as an evaluation set during fitting.

---

## 3. Pre-training Data Check & Imputation
- Median feature statistics are computed strictly on the training partition.
- These medians are saved inside the model pickles (`models/*.pkl`) and used to impute missing values at inference time, preventing validation/test set information leakage.
- Missing values in targets (`is_disrupted` is NaN) are dropped from training.
