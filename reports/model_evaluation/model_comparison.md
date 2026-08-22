# Model Comparison Report

_Generated: 2026-08-22T07:43:50.653775+00:00_

## Best Models per Corridor

| Corridor | Best Model | Test ROC-AUC |
| :--- | :--- | :--- |
| HORMUZ | None | -1.0000 |
| BAB_EL_MANDEB | XGBoost | 0.8642 |
| SUEZ | XGBoost | 0.7753 |
| RED_SEA | RandomForest | 0.9118 |

## Full Results


### HORMUZ

| Model | Split | ROC-AUC | PR-AUC | F1 | Brier |
| :--- | :--- | :--- | :--- | :--- | :--- |
| LogisticRegression | validation | 0.3845 | 0.0435 | 0.1333 | 0.0635 |
| RandomForest | validation | 0.2945 | 0.0768 | 0.0 | 0.046 |
| XGBoost | validation | 0.3608 | 0.0798 | 0.0 | 0.0325 |

### BAB_EL_MANDEB

| Model | Split | ROC-AUC | PR-AUC | F1 | Brier |
| :--- | :--- | :--- | :--- | :--- | :--- |
| LogisticRegression | validation | 0.2942 | 0.0171 | 0.0 | 0.0946 |
| LogisticRegression | test | 0.5802 | 0.04 | 0.0 | 0.0893 |
| RandomForest | validation | 0.3762 | 0.093 | 0.0 | 0.0232 |
| RandomForest | test | 0.7654 | 0.101 | 0.0 | 0.0278 |
| XGBoost | validation | 0.3687 | 0.0515 | 0.0 | 0.0165 |
| XGBoost | test | 0.8642 | 0.1016 | 0.0 | 0.0213 |

### SUEZ

| Model | Split | ROC-AUC | PR-AUC | F1 | Brier |
| :--- | :--- | :--- | :--- | :--- | :--- |
| LogisticRegression | validation | 0.9389 | 0.1213 | 0.0455 | 0.3165 |
| LogisticRegression | test | 0.6444 | 0.0657 | 0.0 | 0.0615 |
| RandomForest | validation | 0.8667 | 0.0794 | 0.0 | 0.0719 |
| RandomForest | test | 0.6519 | 0.0412 | 0.0 | 0.0525 |
| XGBoost | validation | 0.9778 | 0.6 | 0.0 | 0.0092 |
| XGBoost | test | 0.7753 | 0.0654 | 0.0 | 0.0252 |

### RED_SEA

| Model | Split | ROC-AUC | PR-AUC | F1 | Brier |
| :--- | :--- | :--- | :--- | :--- | :--- |
| LogisticRegression | validation | 0.4898 | 0.0787 | 0.0541 | 0.1331 |
| LogisticRegression | test | 0.7831 | 0.0475 | 0.0 | 0.0326 |
| RandomForest | validation | 0.3892 | 0.0933 | 0.0 | 0.0289 |
| RandomForest | test | 0.9118 | 0.1083 | 0.0 | 0.0257 |
| XGBoost | validation | 0.3743 | 0.1764 | 0.0 | 0.0161 |
| XGBoost | test | 0.875 | 0.097 | 0.0 | 0.0144 |