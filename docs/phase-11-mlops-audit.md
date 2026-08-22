# MLOps Architecture Audit Report — Phase 11

This document provides a comprehensive audit of the training, registry, inference, evaluation, and monitoring architecture for the Crude Oil Management and Maritime Corridor Risk Intelligence Platform.

---

## 1. Audit Findings

### Where Models are Trained
Models are trained inside `src/models/train_risk_models.py` (which is invoked via `scripts/train_risk_models.py`). This training script iterates over the corridors in `MODELED_CORRIDORS` and trains three algorithms: Logistic Regression, Random Forest, and XGBoost. There is also a standalone script `scripts/train_redsea_model.py` which trains an Isolation Forest model for the Red Sea corridor.

### Where Models are Saved
Model artifacts are serialized using `pickle` and saved under the `models/` directory with filenames following the template:
`[algorithm_prefix]_[corridor_id]_v[model_version].pkl` (e.g., `models/xgb_red_sea_v1.0.pkl`).

### Where Model Versions are Recorded
Model versions, parameters, and evaluation metrics are recorded in `data/manifests/model_registry.json`.

### Training Dataset / Version Used
The training dataset is `data/processed/model_features.csv`. The feature version is statically defined as `"1.0"`.

### Expected Feature Columns
The feature columns are defined in `src/features/feature_pipeline.py` under the list `FEATURE_COLS`. It contains 60+ feature columns spanning:
- Geopolitical daily/monthly index signals (GDELT)
- Maritime daily vessel/cargo transit signals (PortWatch)
- Energy/market signals (Brent oil prices, domestic refinery stats)

### How Inference Loads Models
Inference loads models inside `src/risk/corridor_risk.py` using `_load_best_model(corridor_id)`. It searches for files matching:
1. `xgb_[corridor_id]_v1.0.pkl`
2. `rf_[corridor_id]_v1.0.pkl`
3. `lr_[corridor_id]_v1.0.pkl`
It loads the first match it finds. There is no concept of a "CHAMPION" flag in the registry or database that dynamically controls promotion/routing.

### How Evaluation Works
Out-of-sample performance evaluation is implemented in `src/api/services/model_evaluation.py`. It uses the `validation` and `test` splits defined in `model_features.csv` to calculate metrics (ROC-AUC, PR-AUC, MCC, Brier Score, log loss) and ECE calibration curves.

### How Drift is Calculated
Drift is computed in `src/api/services/drift_detection.py` using:
- **PSI (Population Stability Index)**: Decile-based binning comparison between the reference split (`train`) and the current split (`validation`/`test`).
- **KS-Test (Kolmogorov-Smirnov)**: Dual-sample non-parametric test comparing cumulative distributions of numerical features.

### Whether Model Artifacts Contain Metadata
Model artifacts currently only contain a dictionary with the keys:
- `"model"`: The serialized sklearn/xgboost object
- `"feature_medians"`: Pandas Series of median values for imputation
They do **not** contain metadata such as dataset hashes, split dates, training parameters, or performance metrics.

---

## 2. Identified Reproducibility Gaps & Weaknesses

1. **No Data Validation Gate**: Training scripts load `model_features.csv` directly without checking for schema changes, missing-value rates, infinite values, target leaks, or chronological order violations.
2. **Post-Hoc / Mutable Registry**: The `model_registry.json` file is updated after the training script finishes, but there is no validation coupling to prevent overwriting or deleting historical runs.
3. **Artifact-Metadata Disconnect**: Model metadata and performance metrics are kept only in the json registry. If a pickle file is moved or copied, its lineage is lost.
4. **Implicit Promotion**: The system assumes the "best model" is the first one found on disk matching a predefined suffix list. There is no safe champion/challenger comparison or manual validation gate before a model goes live.
5. **No Rollback Capability**: If a trained model is corrupted or has poor out-of-sample performance, rolling back to an older version requires manual file renaming.
6. **No Retraining Recommendation Logic**: Stale data feeds or high feature drift require manual inspection rather than exposing a deterministic trigger/alert status.
