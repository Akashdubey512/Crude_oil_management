# Model Comparison Report

_Generated: 2026-08-21T18:12:25.086130+00:00_

## Best Models per Corridor

| Corridor | Best Model | Test ROC-AUC |
| :--- | :--- | :--- |
| HORMUZ | None | -1.0000 |
| BAB_EL_MANDEB | XGBoost | 0.7951 |
| SUEZ | XGBoost | 0.8000 |

## Full Results


### HORMUZ

| Model | Split | ROC-AUC | PR-AUC | F1 | Brier |
| :--- | :--- | :--- | :--- | :--- | :--- |
| LogisticRegression | validation | 0.3958 | 0.0449 | 0.1333 | 0.0688 |
| RandomForest | validation | 0.3873 | 0.1078 | 0.0 | 0.0436 |
| XGBoost | validation | 0.3248 | 0.1055 | 0.0 | 0.0323 |

### BAB_EL_MANDEB

| Model | Split | ROC-AUC | PR-AUC | F1 | Brier |
| :--- | :--- | :--- | :--- | :--- | :--- |
| LogisticRegression | validation | 0.3017 | 0.0171 | 0.0 | 0.0842 |
| LogisticRegression | test | 0.5728 | 0.0389 | 0.0 | 0.0801 |
| RandomForest | validation | 0.3547 | 0.1205 | 0.0 | 0.0227 |
| RandomForest | test | 0.7778 | 0.0883 | 0.0 | 0.0275 |
| XGBoost | validation | 0.3687 | 0.1208 | 0.0 | 0.0158 |
| XGBoost | test | 0.7951 | 0.1256 | 0.0 | 0.0213 |

### SUEZ

| Model | Split | ROC-AUC | PR-AUC | F1 | Brier |
| :--- | :--- | :--- | :--- | :--- | :--- |
| LogisticRegression | validation | 0.9389 | 0.127 | 0.046 | 0.3137 |
| LogisticRegression | test | 0.6519 | 0.0661 | 0.1818 | 0.0676 |
| RandomForest | validation | 0.8694 | 0.1061 | 0.0 | 0.0678 |
| RandomForest | test | 0.5333 | 0.0296 | 0.0 | 0.048 |
| XGBoost | validation | 0.95 | 0.55 | 0.5 | 0.0116 |
| XGBoost | test | 0.8 | 0.0681 | 0.0 | 0.0273 |