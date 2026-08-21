# Feature Lineage Registry (Phase 4)

This document tracks the exact mapping, transformation, and lineage of all 52 model features back to their raw staging sources.

---

## 1. Lineage Registry

| Feature Name | Source Dataset | Source Column | Transformation | Lag | Unit |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `gpr_daily` | `geopolitical_risk.csv` | `value` | Pivot where geography='GLOBAL' & metric='GPRD' | 0d | Index |
| `gpr_act` | `geopolitical_risk.csv` | `value` | Pivot where geography='GLOBAL' & metric='GPRD_ACT' | 0d | Index |
| `gpr_threat` | `geopolitical_risk.csv` | `value` | Pivot where geography='GLOBAL' & metric='GPRD_THREAT' | 0d | Index |
| `gpr_daily_7d_ma` | `geopolitical_risk.csv` | `value` | Rolling mean of GPRD over 7 days | 0d | Index |
| `gpr_daily_28d_ma` | `geopolitical_risk.csv` | `value` | Rolling mean of GPRD over 28 days | 0d | Index |
| `gpr_india_monthly` | `geopolitical_risk.csv` | `value` | Shifted country monthly pivot (INDIA) | 1m | Index |
| `gpr_china_monthly` | `geopolitical_risk.csv` | `value` | Shifted country monthly pivot (CHINA) | 1m | Index |
| `gpr_russia_monthly` | `geopolitical_risk.csv` | `value` | Shifted country monthly pivot (RUSSIA) | 1m | Index |
| `gpr_saudi_monthly` | `geopolitical_risk.csv` | `value` | Shifted country monthly pivot (SAUDI_ARABIA) | 1m | Index |
| `corridor_events_1d` | `geopolitical_events.csv` | `corridor` | Count of events mapped to this corridor | 0d | Count |
| `corridor_events_7d` | `geopolitical_events.csv` | `corridor` | Rolling sum of events over 7 days | 0d | Count |
| `corridor_events_28d` | `geopolitical_events.csv` | `corridor` | Rolling sum of events over 28 days | 0d | Count |
| `corridor_disruption_28d` | `geopolitical_events.csv` | `event_type` | Rolling sum of energy taxonomy events | 0d | Count |
| `corridor_sanctions_28d` | `geopolitical_events.csv` | `event_type` | Rolling sum of sanctions events | 0d | Count |
| `global_events_7d` | `geopolitical_events.csv` | — | Rolling sum of all events in dataset | 0d | Count |
| `tanker_count` | `corridor_traffic_daily.csv` | `tanker_count` | Raw daily count for corridor | 0d | Vessels |
| `vessel_count` | `corridor_traffic_daily.csv` | `vessel_count` | Raw daily total vessels | 0d | Vessels |
| `tanker_7d_ma` | `corridor_traffic_daily.csv` | `tanker_count` | Rolling mean over 7 days | 0d | Vessels |
| `tanker_28d_ma` | `corridor_traffic_daily.csv` | `tanker_count` | Rolling mean over 28 days | 0d | Vessels |
| `tanker_decline_ratio_28d` | `corridor_traffic_daily.csv` | `tanker_count` | (obs - median28) / median28 | 0d | Ratio |
| `tanker_zscore_28d` | `corridor_traffic_daily.csv` | `tanker_count` | (obs - mean28) / std28 | 0d | Z-score |
| `tanker_lag1d` | `corridor_traffic_daily.csv` | `tanker_count` | Shifted 1 day backward | 1d | Vessels |
| `tanker_lag7d` | `corridor_traffic_daily.csv` | `tanker_count` | Shifted 7 days backward | 7d | Vessels |
| `brent_price` | `crude_prices.csv` | `value` | Raw daily price, forward-filled max 3d | 0d | USD/bbl |
| `brent_return_1d` | `crude_prices.csv` | `value` | Log return: diff(1) of log price | 0d | Ratio |
| `brent_volatility_28d` | `crude_prices.csv` | `value` | Rolling standard dev of return_1d over 28d | 0d | Ratio |
| `refinery_throughput_tmt` | `refinery_throughput.csv` | `quantity_tmt` | Lagged monthly sum where type='grand_total' | 1m | TMT |
| `consumption_total_tmt` | `petroleum_consumption.csv`| `quantity_tmt` | Lagged monthly sum of all products | 1m | TMT |
| `crude_import_tmt` | `crude_imports.csv` | `quantity_tmt` | Lagged monthly sum CRUDE IMPORT | 1m | TMT |

---

## 2. Target Leakage Verification
- **Brent prices**: Price returned only on active date.
- **PPAC monthly data**: Kept strictly lagged by 1 month. No forward-filling is allowed from month $M$ onto days of month $M$.
- **SHAP and rolling windows**: All rolling boundaries strictly left-aligned. For index $t$, window spans $t - \text{window\_size}$ to $t-1$.
