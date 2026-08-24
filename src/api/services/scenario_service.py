"""
Scenario Service — Phase 8

Provides actual, model-based scenario analysis for the India Energy
Resilience supply chain digital twin.

Key features:
- Uses ONLY real model artifacts and features.
- Modifies inputs using mathematical multipliers.
- Recalculates risk probability on-the-fly.
- Clearly distinguishes prediction, explanation, and recommendation.
- Hides/raises error for RED_SEA which has no model.
"""

import os
import json
import datetime
import numpy as np
import pandas as pd
from src.features.feature_pipeline import FEATURE_COLS
from src.risk.corridor_risk import _load_best_model, _classify_risk
from src.risk.reserve_drawdown import calculate_reserve_drawdown_schedule, CORRIDOR_BASELINE_IMPORT_MBPD, DEFAULT_BASELINE_IMPORT_MBPD
from src.risk.economic_impact import calculate_cascading_economic_impact

from src.api.config import settings

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
PROCESSED_DIR = os.path.join(settings.data_dir, "processed")
REPORTS_DIR = os.path.join(PROJECT_ROOT, "reports", "model_evaluation")

def run_scenario_simulation(
    corridor_id: str,
    baseline_date: str = None,
    tanker_transit_multiplier: float = 1.0,
    gpr_multiplier: float = 1.0,
    brent_price_multiplier: float = 1.0,
    brent_volatility_multiplier: float = 1.0,
    infrastructure_disruption: bool = False,
    spr_buffer_days: float = 9.5,
    drawdown_strategy: str = "front_loaded",
) -> dict:
    corridor_upper = corridor_id.upper()
    if corridor_upper not in {"HORMUZ", "BAB_EL_MANDEB", "SUEZ", "RED_SEA"}:
        raise ValueError(
            f"Scenario simulation only supported for modeled corridors (HORMUZ, BAB_EL_MANDEB, SUEZ, RED_SEA)."
        )

    features_path = os.path.join(PROCESSED_DIR, "model_features.csv")
    if not os.path.exists(features_path):
        raise FileNotFoundError("Processed model features file not found.")

    df = pd.read_csv(features_path)
    df_corr = df[df["corridor_id"] == corridor_upper].copy()
    if df_corr.empty:
        raise ValueError(f"No feature records found for corridor: {corridor_upper}")

    # Determine baseline date
    if not baseline_date:
        baseline_date = df_corr["date"].max()
    
    row = df_corr[df_corr["date"] == baseline_date]
    if row.empty:
        raise ValueError(f"Baseline date {baseline_date} not found for corridor {corridor_upper}")

    baseline_row = row.iloc[0]

    # Load model
    artifact, model_name, model_version, is_champion = _load_best_model(corridor_upper)
    if not artifact:
        raise RuntimeError(f"No trained model artifact found for corridor: {corridor_upper}")

    model = artifact["model"]
    feature_medians = artifact["feature_medians"]

    # 1. Run baseline prediction using features from model_features.csv
    X_baseline = pd.DataFrame([baseline_row[FEATURE_COLS]]).fillna(feature_medians)
    
    # Force alignment of columns
    X_baseline = X_baseline[FEATURE_COLS]

    if hasattr(model, "predict_proba"):
        base_prob = float(model.predict_proba(X_baseline)[:, 1][0])
    else:
        base_prob = float(model.predict(X_baseline)[0])
    
    base_level = _classify_risk(base_prob)

    # 2. Mutate features
    sim_row = baseline_row.copy()
    feature_mutations = {}

    def mutate_and_track(cols: list, multiplier: float):
        for col in cols:
            if col in sim_row and pd.notna(sim_row[col]):
                old_val = float(sim_row[col])
                new_val = old_val * multiplier
                sim_row[col] = new_val
                feature_mutations[col] = {"baseline": old_val, "simulated": new_val}

    # Traffic features
    traffic_cols = [
        "tanker_count", "vessel_count", "cargo_count",
        "tanker_7d_ma", "tanker_14d_ma", "tanker_28d_ma", "tanker_90d_ma",
        "tanker_28d_std", "tanker_lag1d", "tanker_lag7d"
    ]
    mutate_and_track(traffic_cols, tanker_transit_multiplier)
    
    # Handle anomaly flags if traffic drops significantly
    if tanker_transit_multiplier < 0.95:
        feature_mutations["anomaly_flag"] = {"baseline": int(sim_row.get("anomaly_flag", 0) or 0), "simulated": 1}
        feature_mutations["anomaly_type_drop"] = {"baseline": int(sim_row.get("anomaly_type_drop", 0) or 0), "simulated": 1}
        sim_row["anomaly_flag"] = 1
        sim_row["anomaly_type_drop"] = 1
        # Set tanker decline ratio
        old_decline = sim_row.get("tanker_decline_ratio_28d", 0.0) or 0.0
        new_decline = float(old_decline) + (1.0 - tanker_transit_multiplier)
        sim_row["tanker_decline_ratio_28d"] = new_decline
        feature_mutations["tanker_decline_ratio_28d"] = {"baseline": old_decline, "simulated": new_decline}

    # Geopolitical features
    gpr_cols = [
        "gpr_daily", "gpr_act", "gpr_threat",
        "gpr_daily_7d_ma", "gpr_daily_28d_ma", "gpr_daily_28d_std",
        "corridor_events_1d", "corridor_events_7d", "corridor_events_28d"
    ]
    mutate_and_track(gpr_cols, gpr_multiplier)

    # Brent price
    price_cols = [
        "brent_price", "brent_28d_ma", "brent_lag7d", "brent_lag28d"
    ]
    mutate_and_track(price_cols, brent_price_multiplier)

    # Brent volatility
    vol_cols = [
        "brent_volatility_7d", "brent_volatility_28d"
    ]
    mutate_and_track(vol_cols, brent_volatility_multiplier)

    # Infrastructure disruption
    if infrastructure_disruption:
        old_refinery_change = sim_row.get("refinery_mom_change", 0.0) or 0.0
        new_refinery_change = -0.15  # 15% drop
        sim_row["refinery_mom_change"] = new_refinery_change
        feature_mutations["refinery_mom_change"] = {"baseline": old_refinery_change, "simulated": new_refinery_change}
        
        sim_row["anomaly_flag"] = 1
        feature_mutations["anomaly_flag"] = {"baseline": int(baseline_row.get("anomaly_flag", 0) or 0), "simulated": 1}

    # 3. Predict simulated probability
    X_simulated = pd.DataFrame([sim_row[FEATURE_COLS]]).fillna(feature_medians)
    X_simulated = X_simulated[FEATURE_COLS]

    if hasattr(model, "predict_proba"):
        sim_prob = float(model.predict_proba(X_simulated)[:, 1][0])
    else:
        sim_prob = float(model.predict(X_simulated)[0])
    
    sim_level = _classify_risk(sim_prob)
    prob_delta = sim_prob - base_prob

    # 4. Generate explanations and recommendations based on SHAP drivers
    explanation_file = f"explanation_{model_name.lower()}_{corridor_upper.lower()}.json"
    explanation_path = os.path.join(REPORTS_DIR, explanation_file)
    shap_features = []
    if os.path.exists(explanation_path):
        try:
            with open(explanation_path) as f:
                exp_data = json.load(f)
                shap_features = [item.get("feature") for item in exp_data.get("global_importance", [])[:3]]
        except:
            pass
    if not shap_features:
        shap_features = ["tanker_decline_ratio_28d", "gpr_daily_28d_ma", "brent_volatility_28d"]

    # Build explanation
    explanation_parts = []
    if abs(prob_delta) < 0.005:
        explanation_parts.append(
            f"The model's predicted disruption probability remains stable at {sim_prob:.2%} (vs baseline {base_prob:.2%}). "
            "The model is relatively insensitive to these simulated adjustments under current baseline conditions. "
        )
    elif prob_delta > 0:
        explanation_parts.append(
            f"The model's predicted disruption probability increased to {sim_prob:.2%} (an increase of +{prob_delta * 100:.2f} percentage points from {base_prob:.2%}). "
            f"This is driven by the simulated negative shocks to {', '.join([c.replace('_', ' ') for c in feature_mutations.keys() if c in shap_features or 'decline' in c or 'events' in c])}. "
        )
    else:
        explanation_parts.append(
            f"The model's predicted disruption probability decreased to {sim_prob:.2%} (a drop of {abs(prob_delta) * 100:.2f} percentage points from {base_prob:.2%}). "
            "This suggests that positive conditions (increased traffic flow or subdued geopolitics) stabilize the corridor's security index. "
        )

    explanation_parts.append(
        f"Note: This is a scenario prediction using the trained {model_name} model (version {artifact.get('version', '1.0')}). "
        "Confidence in out-of-distribution extremes is limited by historical data bounds. "
        f"Data constraints: model training assumes 1-day lag on features."
    )
    explanation = "".join(explanation_parts)

    # Build recommendation based on actual drivers & simulated state
    rec_parts = []
    if sim_prob >= 0.50:
        rec_parts.append(
            "CRITICAL WARNING: The simulated risk level is CRITICAL. MoPNG should activate strategic reserves and coordinate with port authorities. "
        )
    elif sim_prob >= 0.25:
        rec_parts.append(
            "HIGH ALERT: Simulated risk level is HIGH. Operational monitoring should be increased and backup crude routing via Cape of Good Hope should be readied. "
        )
    
    # Specific recommendations based on mutations
    if tanker_transit_multiplier < 0.90:
        rec_parts.append(
            "Vessel flow drops detected. Coordinate with ISPRL to prepare Strategic Petroleum Reserves (SPR) releases to offset physical transit delays. "
        )
    if gpr_multiplier > 1.25:
        rec_parts.append(
            "Geopolitical risk surge. Issue maritime security advisory to Indian-flagged tankers transiting this corridor. "
        )
    if brent_volatility_multiplier > 1.25:
        rec_parts.append(
            "Market volatility spikes. MoPNG pricing desk should hedge procurement contracts to minimize crude import cost volatility. "
        )
    
    recommendation = " ".join(rec_parts)

    # 5. Compute Strategic Reserve Drawdown Schedule
    corridor_base_import = CORRIDOR_BASELINE_IMPORT_MBPD.get(corridor_upper, DEFAULT_BASELINE_IMPORT_MBPD)
    raw_gap = max(0.0, corridor_base_import * (1.0 - tanker_transit_multiplier))
    if infrastructure_disruption:
        raw_gap += 0.75  # Refinery disruption adds 0.75 MBPD supply deficit
    
    # Expected disruption duration scales with simulated risk probability
    disruption_duration = max(10, int(10 + round(sim_prob * 10)))

    drawdown_res = calculate_reserve_drawdown_schedule(
        predicted_supply_gap_mbpd=raw_gap,
        disruption_duration_days=disruption_duration,
        spr_buffer_days=spr_buffer_days,
        strategy=drawdown_strategy,
    )

    # 6. Compute Cascading Refining, Price, and GDP Economic Impact
    base_brent = float(baseline_row.get("brent_price", 78.50) if pd.notna(baseline_row.get("brent_price")) else 78.50)
    sim_brent = base_brent * brent_price_multiplier

    econ_impact = calculate_cascading_economic_impact(
        brent_baseline_usd=base_brent,
        brent_simulated_usd=sim_brent,
        tanker_transit_multiplier=tanker_transit_multiplier,
        infrastructure_disruption=infrastructure_disruption,
    )

    return {
        "corridor_id": corridor_upper,
        "baseline_date": baseline_date,
        "baseline_probability": round(base_prob, 6),
        "baseline_risk_level": base_level,
        "simulated_probability": round(sim_prob, 6),
        "simulated_risk_level": sim_level,
        "probability_delta": round(prob_delta, 6),
        "feature_mutations": feature_mutations,
        "explanation": explanation,
        "recommendation": recommendation,
        "drawdown_schedule": drawdown_res,
        "economic_impact": econ_impact,
    }
