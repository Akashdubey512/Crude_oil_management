# Model Comparison Report

_Generated: 2026-08-21T17:05:15.127787+00:00_

## Best Models per Corridor

| Corridor | Best Model | Test ROC-AUC |
| :--- | :--- | :--- |
| HORMUZ | None | -1.0000 |
| BAB_EL_MANDEB | LogisticRegression | 1.0000 |
| SUEZ | LogisticRegression | 1.0000 |

## Full Results


### HORMUZ

| Model | Split | ROC-AUC | PR-AUC | F1 | Brier |
| :--- | :--- | :--- | :--- | :--- | :--- |
| LogisticRegression | validation | 1.0 | 1.0 | 1.0 | 0.0013 |
| RandomForest | validation | 1.0 | 1.0 | 1.0 | 0.0074 |
| XGBoost | validation | 1.0 | 1.0 | 1.0 | 0.0 |

### BAB_EL_MANDEB

| Model | Split | ROC-AUC | PR-AUC | F1 | Brier |
| :--- | :--- | :--- | :--- | :--- | :--- |
| LogisticRegression | validation | 1.0 | 1.0 | 1.0 | 0.0 |
| LogisticRegression | test | 1.0 | 1.0 | 1.0 | 0.0 |
| RandomForest | validation | 1.0 | 1.0 | 1.0 | 0.0013 |
| RandomForest | test | 1.0 | 1.0 | 1.0 | 0.0024 |
| XGBoost | validation | 1.0 | 1.0 | 1.0 | 0.0 |
| XGBoost | test | 1.0 | 1.0 | 1.0 | 0.0 |

### SUEZ

| Model | Split | ROC-AUC | PR-AUC | F1 | Brier |
| :--- | :--- | :--- | :--- | :--- | :--- |
| LogisticRegression | validation | 1.0 | 1.0 | 1.0 | 0.0 |
| LogisticRegression | test | 1.0 | 1.0 | 1.0 | 0.0 |
| RandomForest | validation | 1.0 | 1.0 | 1.0 | 0.0029 |
| RandomForest | test | 1.0 | 1.0 | 1.0 | 0.003 |
| XGBoost | validation | 1.0 | 1.0 | 1.0 | 0.0 |
| XGBoost | test | 1.0 | 1.0 | 1.0 | 0.0 |