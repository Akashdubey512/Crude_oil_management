# What-If Scenario Simulation Engine

> **Platform**: Energy Resilience Intel  
> **Module**: Scenario Service (`src/api/services/scenario_service.py`, `src/api/routes/scenarios.py`)

---

## 1. Overview

The Scenario Simulation Engine provides decision-makers with a sandbox to test hypothetical disruption shocks—such as military escalation in Hormuz or drone attacks in the Red Sea—and evaluate predicted probability shifts before physical disruptions occur.

---

## 2. Parameter Mutations

Users can adjust four primary operational parameters:

| Input Slider | Range | Default | Feature Mutated |
|:---|:---|:---|:---|
| **Geopolitical Risk Multiplier** | $0.5\times - 3.0\times$ | $1.0\times$ | `gpr_daily_7d_ma`, `gpr_volatility_30d` |
| **Tanker Transit Drop %** | $0\% - 75\%$ | $0\%$ | `tanker_7d_ma`, `tanker_lag7d_chg` |
| **Brent Price Shock %** | $-30\% - +50\%$ | $0\%$ | `brent_spot_price`, `brent_returns_7d_std` |
| **Strategic Reserve Drawdown** | $0 - 15 \text{ Days}$ | $0 \text{ Days}$ | `reserve_buffer_days` |

---

## 3. Execution Pipeline

```
[ Baseline Feature Vector ]
           │
           ▼
 [ Parameter Mutation ]   → Applies user multipliers to vector elements
           │
           ▼
 [ Model Re-inference ]   → Re-evaluates baseline XGBoost Champion model
           │
           ▼
  [ Probability Delta ]   → ΔP = P_simulated - P_baseline
           │
           ▼
[ Recommended Actions ] → Prompts rerouting or reserve drawdown recommendations
```

> **Safety Guarantee**: Scenario simulations execute in memory and never overwrite production database records or live baseline corridor risk snapshots.
