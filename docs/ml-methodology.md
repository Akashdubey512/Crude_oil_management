# Machine Learning Methodology & Algorithm Selection

> **Platform**: Energy Resilience Intel  
> **Module**: Machine Learning Pipeline (`src/models/`, `src/features/`)

---

## 1. Problem Framing

The corridor risk engine frames disruption prediction as a **calibrated binary classification problem**. For each corridor $c \in \{\text{HORMUZ}, \text{SUEZ}, \text{BAB\_EL\_MANDEB}, \text{RED\_SEA}\}$ and time $t$, the model estimates the probability:

$$P(Y_{c, t+\Delta t} = 1 \mid \mathbf{X}_{c, t})$$

Where:
* $Y_{c, t+\Delta t} = 1$ indicates a severe supply volume drop ($>20\%$ drop in 7-day moving average transit) or security incident in the subsequent 30-day window.
* $\mathbf{X}_{c, t}$ is a 24-dimensional feature vector computed up to time $t$.

---

## 2. Algorithm Selection Rationale

We selected **XGBoost 2.0 (Gradient Boosted Decision Trees)** over Deep Neural Networks (LSTM/GRU) for the following engineering reasons:

1. **Tabular Efficiency**: Time-series features extracted into rolling windows are tabular. Gradient boosting consistently outperforms neural networks on tabular datasets with non-linear interaction terms.
2. **Small Positive Sample Count**: Historical maritime disruptions are rare events (~0.5%–3.0% of historical days). Tree-based ensembles resist overfitting under extreme class imbalance when combined with recall-weighted objective functions.
3. **Exact Tree Explainer Compatibility**: Native integration with **SHAP Tree Explainer** provides exact additive feature attributions without sampling approximations.

---

## 3. Data Leakage Prevention

To maintain strict historical fidelity and prevent data leakage:

* **Expanding Window Transformations**: All rolling means (7d, 30d, 90d), standard deviations, and lag deltas are computed exclusively on observations $[0, t-1]$.
* **Pre-fit Scalers**: Standard scaling parameters and Platt calibration parameters are fitted **only on training partitions** and applied out-of-sample to validation/test splits.

---

## 4. Probability Calibration (Platt Scaling)

Raw XGBoost margin outputs are not calibrated probabilities. We apply **Platt Scaling** (fitting a logistic regression model on out-of-fold predictions):

$$\hat{P}(Y = 1 \mid S) = \frac{1}{1 + \exp(A \cdot S + B)}$$

Where $S$ is the raw XGBoost prediction score and $A, B$ are parameters fitted via cross-validation. This guarantees that calculated probabilities correspond to real empirical disruption rates.

---

## 5. Model Evaluation Metrics

| Metric | Target Threshold | Primary Focus |
|:---|:---|:---|
| **ROC-AUC** | $\ge 0.75$ | Evaluates ranking quality across probability thresholds |
| **Brier Score** | $\le 0.15$ | Measures probability calibration accuracy |
| **Recall @ Top 20%** | $\ge 0.80$ | Ensures high sensitivity to rare disruption events |
| **Brier Skill Score** | $> 0.0$ | Verifies model outperforms naive historical baseline |
