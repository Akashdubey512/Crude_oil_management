# Phase 4 Walkthrough — Risk & Disruption Prediction Engine

This document provides a summary of the files created, models trained, and execution commands for Phase 4.

---

## 1. Execution Commands

To reproduce the Phase 4 pipeline, execute the following scripts in order:

```powershell
# 1. Run the feature engineering pipeline (generates model_features.csv & quality JSON)
$env:PYTHONPATH="D:\hackathon project\energy-resilience"; & "C:\Users\ss146\miniconda3\envs\project\python.exe" "D:\hackathon project\energy-resilience\scripts\run_feature_pipeline.py"

# 2. Train and evaluate all models (Logistic Regression, RF, XGBoost)
$env:PYTHONPATH="D:\hackathon project\energy-resilience"; & "C:\Users\ss146\miniconda3\envs\project\python.exe" "D:\hackathon project\energy-resilience\scripts\train_risk_models.py"

# 3. Execute historical backtesting walk-forward simulation
$env:PYTHONPATH="D:\hackathon project\energy-resilience"; & "C:\Users\ss146\miniconda3\envs\project\python.exe" "D:\hackathon project\energy-resilience\scripts\run_backtest.py"

# 4. Compute active risk snapshot for the latest available date
$env:PYTHONPATH="D:\hackathon project\energy-resilience"; & "C:\Users\ss146\miniconda3\envs\project\python.exe" "D:\hackathon project\energy-resilience\scripts\run_risk_engine.py"
```

---

## 2. Key Artifacts Created

### Feature Engineering
- [`src/features/geopolitical_features.py`](file:///D:/hackathon%20project/energy-resilience/src/features/geopolitical_features.py): GPR indices and event count rolling features.
- [`src/features/maritime_features.py`](file:///D:/hackathon%20project/energy-resilience/src/features/maritime_features.py): PortWatch daily transit rolling averages, z-scores, and decline rates.
- [`src/features/energy_features.py`](file:///D:/hackathon%20project/energy-resilience/src/features/energy_features.py): Brent crude log returns and volatility, and lagged monthly PPAC indicators.
- [`src/features/target_builder.py`](file:///D:/hackathon%20project/energy-resilience/src/features/target_builder.py): Disruption target builder combining traffic drops and event windows.
- [`src/features/feature_pipeline.py`](file:///D:/hackathon%20project/energy-resilience/src/features/feature_pipeline.py): Pipeline orchestrator and pre-training QC checks.

### Modeling & Explainability
- [`src/models/model_registry.py`](file:///D:/hackathon%20project/energy-resilience/src/models/model_registry.py): Versioning and training runs log.
- [`src/models/train_risk_models.py`](file:///D:/hackathon%20project/energy-resilience/src/models/train_risk_models.py): Trains LR, RF, and XGBoost models.
- [`src/models/evaluate_models.py`](file:///D:/hackathon%20project/energy-resilience/src/models/evaluate_models.py): Computes precision, recall, AUC, Brier scores.
- [`src/models/explainability.py`](file:///D:/hackathon%20project/energy-resilience/src/models/explainability.py): SHAP tree explainers.
- [`src/models/backtest.py`](file:///D:/hackathon%20project/energy-resilience/src/models/backtest.py): Simulates chronological historical warnings.

### Risk Engine & API Services
- [`src/risk/corridor_risk.py`](file:///D:/hackathon%20project/energy-resilience/src/risk/corridor_risk.py): Risk probability and threshold band classification.
- [`src/risk/risk_decomposition.py`](file:///D:/hackathon%20project/energy-resilience/src/risk/risk_decomposition.py): Geopolitical, sanctions, maritime, market, and supply vectors.
- [`src/risk/service.py`](file:///D:/hackathon%20project/energy-resilience/src/risk/service.py): FastAPI query services.

### Test Suite
- [`tests/test_phase4.py`](file:///D:/hackathon%20project/energy-resilience/tests/test_phase4.py): Chronological split, target builder, explainers, registry, and service tests.
