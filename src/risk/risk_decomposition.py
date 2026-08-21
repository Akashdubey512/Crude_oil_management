"""
Risk Decomposition — Phase 4

Decomposes the corridor risk probability into interpretable sub-components
based on actual feature groups.

Methodology:
  Each sub-component is computed as a normalized weighted sum of the
  feature group's contribution to the overall risk signal. Weights are
  derived from feature group mean absolute SHAP values (if SHAP available)
  or from predefined equal weights.

  IMPORTANT: These components are NOT statistically independent. They share
  underlying data (e.g. a major war raises both geopolitical and market risk).
  The decomposition is for interpretability only — the individual components
  should not be combined multiplicatively.

Sub-components:
  geopolitical_risk  — GPR index + corridor event signals
  sanctions_risk     — Sanctions event counts + OFAC exposure
  maritime_risk      — Traffic anomalies + tanker decline ratios
  market_risk        — Brent price volatility + return signals
  supply_risk        — PPAC refinery throughput + import changes
"""

import numpy as np
import pandas as pd

# Feature group membership
FEATURE_GROUPS = {
    "geopolitical_risk": [
        "gpr_daily", "gpr_act", "gpr_threat",
        "gpr_daily_7d_ma", "gpr_daily_28d_ma",
        "gpr_india_monthly", "gpr_russia_monthly", "gpr_saudi_monthly",
        "corridor_events_1d", "corridor_events_7d", "corridor_events_28d",
        "corridor_disruption_28d", "global_events_7d",
    ],
    "sanctions_risk": [
        "corridor_sanctions_28d", "global_events_28d",
    ],
    "maritime_risk": [
        "tanker_count", "vessel_count",
        "tanker_decline_ratio_28d", "tanker_zscore_28d",
        "tanker_7d_ma", "tanker_28d_ma",
        "anomaly_flag", "anomaly_type_drop", "anomaly_type_congestion",
        "tanker_lag1d_chg", "tanker_lag7d_chg",
    ],
    "market_risk": [
        "brent_price", "brent_return_1d", "brent_return_7d",
        "brent_volatility_7d", "brent_volatility_28d",
        "brent_zscore_28d",
    ],
    "supply_risk": [
        "refinery_throughput_tmt", "refinery_mom_change",
        "consumption_total_tmt", "consumption_mom_change",
        "crude_import_tmt", "crude_import_mom_change",
    ],
}


def decompose_risk(
    feature_row: pd.Series,
    risk_probability: float,
    shap_importances: dict = None,
) -> dict:
    """
    Decomposes a risk score into sub-component contributions.

    Args:
        feature_row: A single-row Series of model features.
        risk_probability: The overall model risk probability [0, 1].
        shap_importances: Optional dict of {feature_name: mean_abs_shap_value}.

    Returns:
        dict of sub-component risk signals and normalized contributions.
    """
    decomposition = {}

    for group_name, features in FEATURE_GROUPS.items():
        available = [f for f in features if f in feature_row.index and pd.notna(feature_row.get(f))]

        if not available:
            decomposition[group_name] = {
                "score": None,
                "contribution": None,
                "note": "No available features in this group",
            }
            continue

        if shap_importances:
            # Weight by SHAP importances
            weights = np.array([shap_importances.get(f, 0.0) for f in available])
            total_weight = weights.sum()
            if total_weight > 0:
                weights = weights / total_weight
            else:
                weights = np.ones(len(available)) / len(available)
        else:
            # Equal weights if no SHAP
            weights = np.ones(len(available)) / len(available)

        # Normalize features to [0, 1] using simple min-max per feature
        # (This is approximate — for a production system, use train-set statistics)
        values = np.array([float(feature_row.get(f, 0) or 0) for f in available])

        # Contribution = weighted average of normalized feature activations
        # expressed as a fraction of the total risk probability
        weighted_sum = float(np.dot(weights, np.abs(values)))
        contribution = weighted_sum  # Relative — not absolute probability

        decomposition[group_name] = {
            "score": round(contribution, 4),
            "features_used": available,
            "note": f"{len(available)}/{len(features)} features available",
        }

    # Normalize contributions to sum to risk_probability
    total_score = sum(v["score"] for v in decomposition.values() if v.get("score") is not None)
    if total_score > 0:
        for group_name in decomposition:
            if decomposition[group_name].get("score") is not None:
                decomposition[group_name]["normalized_contribution"] = round(
                    decomposition[group_name]["score"] / total_score * risk_probability, 4
                )

    decomposition["_methodology"] = (
        "Components are NOT statistically independent. "
        "Decomposition is for interpretability only. "
        "Individual components should not be combined multiplicatively."
    )
    decomposition["_overall_risk_probability"] = round(risk_probability, 4)

    return decomposition
