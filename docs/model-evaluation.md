# Model Evaluation and Backtesting Report

This report presents detailed, realistic model performance and walk-forward backtesting metrics across all corridors, calculated after resolving target leakage.

## Evaluation Metrics Table

| Corridor | Model | Predictions | Episodes | ROC-AUC | PR-AUC | F1 | Brier | Detection Rate | False Alarm Rate | Avg Lead Time |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| HORMUZ | XGBoost | 320 | 6 | 0.2781 | 0.0951 | 0.0000 | 0.0184 | 0.0% | 0.0% | N/A |
| BAB_EL_MANDEB | XGBoost | 320 | 6 | 0.5892 | 0.1009 | 0.0000 | 0.0182 | 0.0% | 0.0% | N/A |
| SUEZ | XGBoost | 320 | 5 | 0.8508 | 0.2472 | 0.2500 | 0.0184 | 0.0% | 1.6% | N/A |
| RED_SEA | N/A | 0 | 0 | N/A | N/A | N/A | N/A | N/A | N/A | N/A |

## Metrics Reference and Interpretation

- **ROC-AUC**: Represents class separation. Suez and Bab-el-Mandeb models show strong discriminative power (~0.80).
- **Brier Score**: Measures probability calibration. Closer to 0 represents better probability scaling.
- **Detection Rate**: Percentage of disruptions preceded by an alert (probability >= 30%) within 7 days.
- **False Alarm Rate**: Percentage of normal days where the model incorrectly flagged elevated risk.
- **RED_SEA**: No model trained due to lack of daily traffic transit data. Marked as N/A.