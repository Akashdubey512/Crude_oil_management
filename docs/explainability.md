# Explainable AI (SHAP XAI Methodology)

> **Platform**: Energy Resilience Intel  
> **Module**: Explainability Service (`src/api/services/explainability_service.py`)

---

## 1. Executive Summary

In enterprise energy risk intelligence, black-box predictions are unusable for executive decision-makers. Energy Resilience Intel uses **SHAP (SHapley Additive exPlanations)** based on cooperative game theory to decompose every disruption probability prediction into exact, additive feature impact contributions.

---

## 2. Mathematical Foundation

For a given corridor feature vector $x = (x_1, x_2, \dots, x_M)$, the prediction $f(x)$ is represented as:

$$f(x) = \phi_0 + \sum_{i=1}^{M} \phi_i(x)$$

Where:
- $\phi_0$ is the base expected model prediction across the dataset.
- $\phi_i(x)$ is the SHAP value assigned to feature $i$, quantifying its directional impact on probability.

---

## 3. Directional Interpretation in Dashboard

| SHAP Value ($\phi_i$) | Visual Bar | Risk Impact | Example Scenario |
|:---|:---|:---|:---|
| **$\phi_i > 0$** | Crimson Bar | **Increases Risk** | Regional GPR news surge (+0.18) |
| **$\phi_i < 0$** | Emerald Bar | **Decreases Risk** | Stable 90-day tanker transit volume (-0.14) |
| **$\phi_i \approx 0$** | Neutral | **No Impact** | Static macroeconomic indicators (0.00) |

---

## 4. API & Drawer Integration

The FastAPI endpoint `GET /api/models/explainability?corridor_id={corridor}` outputs global and local SHAP feature rankings:

```json
{
  "corridor_id": "HORMUZ",
  "base_value": 0.05,
  "global_importance": [
    { "feature": "tanker_90d_ma", "importance": 0.24 },
    { "feature": "gpr_volatility_30d", "importance": 0.19 },
    { "feature": "brent_returns_7d_std", "importance": 0.12 }
  ],
  "local_explanation": {
    "prediction_probability": 0.0025,
    "top_factors": [
      { "factor": "tanker_90d_ma", "contribution": -0.14, "description": "High 90d transit volume buffers supply" },
      { "factor": "gpr_volatility_30d", "contribution": +0.03, "description": "Minor geopolitical news activity" }
    ]
  }
}
```

This output powers the SHAP Factor Contribution Drawer in the React frontend.
