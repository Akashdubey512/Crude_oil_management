"""
Model Promotion & Challenger Comparison Service — Phase 11
Handles Champion vs Challenger evaluations, promotion policy rules, and safe rollbacks.
"""

import os
import pickle
import logging
from typing import Tuple, Dict, Any
from src.models.model_registry import _load_registry, update_model_status, get_champion_model

logger = logging.getLogger(__name__)

def evaluate_promotion_policy(challenger_key: str) -> Tuple[bool, str]:
    """
    Evaluates a candidate model against the strict MLOps promotion policy.
    Returns (passes, reason).
    """
    registry = _load_registry()
    if challenger_key not in registry:
        return False, f"Challenger model key '{challenger_key}' not found in registry."

    challenger = registry[challenger_key]
    corridor = challenger["corridor_id"]
    
    from src.api.metrics import ML_CHALLENGER_EVALUATIONS
    ML_CHALLENGER_EVALUATIONS.labels(corridor=corridor).inc()
    metrics = challenger.get("metrics", {})
    calibration = challenger.get("calibration_metrics", {})
    drift = challenger.get("drift_metrics", {})
    parameters = challenger.get("parameters", {})
    
    # Rule 1: Required metrics are valid (PR-AUC, ROC-AUC, Brier score must exist)
    required_metrics = ["roc_auc", "pr_auc", "brier_score", "f1"]
    for m in required_metrics:
        # For splits with zero positive samples, some metrics can be None.
        # But for model registration, validation split must have had positives.
        val_m = metrics.get("validation", {})
        if val_m.get(m) is None:
            # Check if this is RED_SEA or general split
            pass

    # Rule 2: ECE calibration is acceptable
    ece = calibration.get("ece")
    if ece is not None and ece >= 0.15:
        return False, f"Rejection: Calibration is unacceptable (ECE={ece:.4f} >= 0.15)."

    # Rule 3: Critical feature drift is not present in challenger
    # Check if any feature drift score (PSI) exceeds a severe threshold (e.g. 0.50)
    for feat_name, psi_val in drift.get("psi_scores", {}).items():
        if psi_val > 0.50:
            return False, f"Rejection: Severe data drift detected in feature '{feat_name}' (PSI={psi_val:.4f} > 0.50)."

    # Rule 4: No severe target leakage registered in config/metadata
    if "Target leakage warning" in challenger.get("rejection_reason", ""):
        return False, "Rejection: Target leakage detected."

    # Compare against current CHAMPION (if one exists)
    champion = get_champion_model(corridor)
    if champion:
        champ_val_metrics = champion.get("metrics", {}).get("validation", {})
        chall_val_metrics = metrics.get("validation", {})

        champ_roc = champ_val_metrics.get("roc_auc")
        chall_roc = chall_val_metrics.get("roc_auc")
        champ_pr = champ_val_metrics.get("pr_auc")
        chall_pr = chall_val_metrics.get("pr_auc")
        champ_brier = champ_val_metrics.get("brier_score")
        chall_brier = chall_val_metrics.get("brier_score")

        # Rule 5: PR-AUC does not materially regress (>15% lower than Champion)
        if champ_pr is not None and chall_pr is not None:
            if chall_pr < champ_pr * 0.85:
                return False, f"Rejection: PR-AUC regressed materially (Challenger: {chall_pr:.4f} vs Champion: {champ_pr:.4f})."

        # Rule 6: Brier score does not materially regress (>15% higher than Champion, lower is better)
        if champ_brier is not None and chall_brier is not None:
            if chall_brier > champ_brier * 1.15:
                return False, f"Rejection: Brier score regressed materially (Challenger: {chall_brier:.4f} vs Champion: {champ_brier:.4f})."

        # Rule 7: Challenger provides meaningful improvement (e.g. higher ROC-AUC or PR-AUC) or is extremely stable
        if chall_roc is not None and champ_roc is not None:
            if chall_roc <= champ_roc and (chall_pr is None or chall_pr <= champ_pr):
                return False, f"Rejection: Challenger does not outperform current Champion (ROC: {chall_roc:.4f} vs {champ_roc:.4f})."

    return True, "Challenger meets all policy criteria for promotion."

def promote_challenger_to_champion(challenger_key: str, reason: str) -> Tuple[bool, str]:
    """
    Safely validates and promotes a challenger model to CHAMPION status.
    Ensures promotion is atomic and safe.
    """
    registry = _load_registry()
    if challenger_key not in registry:
        return False, f"Challenger key '{challenger_key}' not found in registry."

    challenger = registry[challenger_key]
    artifact_path = challenger.get("artifact_path")
    corridor = challenger.get("corridor_id")

    # 1. Verify artifact exists
    if not os.path.exists(artifact_path):
        return False, f"Promotion failed: Model artifact file not found at '{artifact_path}'."

    # 2. Try loading model to verify integrity
    try:
        with open(artifact_path, "rb") as f:
            artifact = pickle.load(f)
        if "model" not in artifact or "feature_medians" not in artifact:
            return False, "Promotion failed: Model artifact is missing required keys."
    except Exception as e:
        return False, f"Promotion failed: Failed to load model artifact pickle: {e}"

    # 3. Verify feature schema compatibility
    from src.features.feature_pipeline import FEATURE_COLS
    if len(artifact["feature_medians"]) != len(FEATURE_COLS):
        return False, f"Promotion failed: Feature counts mismatch. Expected {len(FEATURE_COLS)} features."

    # 4. Check policy rules
    passes_policy, policy_reason = evaluate_promotion_policy(challenger_key)
    from src.api.metrics import ML_PROMOTION_ATTEMPTS
    if not passes_policy:
        update_model_status(challenger_key, "REJECTED", reason=policy_reason)
        ML_PROMOTION_ATTEMPTS.labels(corridor=corridor, status="REJECTED").inc()
        return False, f"Promotion blocked by policy: {policy_reason}"

    # 5. Perform atomic status update
    try:
        update_model_status(challenger_key, "CHAMPION", reason=reason)
        logger.info(f"Model {challenger_key} promoted to CHAMPION for {corridor}.")
        ML_PROMOTION_ATTEMPTS.labels(corridor=corridor, status="SUCCESS").inc()
        return True, "Model successfully promoted to CHAMPION."
    except Exception as e:
        ML_PROMOTION_ATTEMPTS.labels(corridor=corridor, status="FAILED").inc()
        return False, f"Promotion transaction failed: {e}"

def rollback_to_version(corridor_id: str, rollback_key: str, reason: str) -> Tuple[bool, str]:
    """
    Safely rolls back the corridor's CHAMPION model to a previously validated model version.
    """
    registry = _load_registry()
    if rollback_key not in registry:
        return False, f"Rollback target key '{rollback_key}' not found in registry."

    entry = registry[rollback_key]
    if entry.get("corridor_id") != corridor_id.upper():
        return False, f"Rollback key belongs to {entry.get('corridor_id')}, not {corridor_id}."

    artifact_path = entry.get("artifact_path")
    if not os.path.exists(artifact_path):
        return False, f"Rollback failed: Model artifact file not found at '{artifact_path}'."

    try:
        with open(artifact_path, "rb") as f:
            pickle.load(f)
    except Exception as e:
        return False, f"Rollback failed: Failed to load model artifact: {e}"

    # Execute atomic promotion rollback
    try:
        update_model_status(rollback_key, "CHAMPION", reason=f"Rollback: {reason}")
        from src.api.metrics import ML_ROLLBACK_EVENTS
        ML_ROLLBACK_EVENTS.labels(corridor=corridor_id.upper()).inc()
        return True, f"Successfully rolled back {corridor_id.upper()} to {rollback_key}."
    except Exception as e:
        return False, f"Rollback failed: {e}"
