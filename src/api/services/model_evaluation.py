"""
Model Performance Evaluation Service — Phase 9

Calculates out-of-sample classification and calibration metrics for trained corridor models.
Uses validation and test splits from model_features.csv.
"""

import os
import pickle
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from sklearn.metrics import (
    roc_auc_score, average_precision_score, accuracy_score,
    precision_score, recall_score, f1_score,
    brier_score_loss, confusion_matrix, log_loss, matthews_corrcoef
)

logger = logging.getLogger(__name__)

DATA_DIR = r"D:\hackathon project\energy-resilience\data"
MODELS_DIR = r"D:\hackathon project\energy-resilience\models"
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")

from src.features.feature_pipeline import FEATURE_COLS


def load_model_artifact(corridor_id: str, model_version: str = "1.0") -> Tuple[Optional[Any], Optional[pd.Series], Optional[str]]:
    """
    Loads the best available model artifact for a corridor.
    Returns (model_pipeline, feature_medians, model_name).
    """
    corridor_upper = corridor_id.upper()
    # Try XGBoost, then RandomForest, then LogisticRegression
    for prefix, mname in [("xgb", "XGBoost"), ("rf", "RandomForest"), ("lr", "LogisticRegression")]:
        mpath = os.path.join(MODELS_DIR, f"{prefix}_{corridor_upper.lower()}_v{model_version}.pkl")
        if os.path.exists(mpath):
            try:
                with open(mpath, "rb") as f:
                    artifact = pickle.load(f)
                return artifact.get("model"), artifact.get("feature_medians"), mname
            except Exception as e:
                logger.error(f"Error loading pickle {mpath}: {e}")
    return None, None, None


def calculate_ece(y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 10) -> float:
    """Calculates the Expected Calibration Error (ECE)."""
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]
        in_bin = (y_prob >= bin_lower) & (y_prob < bin_upper) if i < n_bins - 1 else (y_prob >= bin_lower) & (y_prob <= bin_upper)
        prop_in_bin = np.mean(in_bin)
        if prop_in_bin > 0:
            accuracy_in_bin = np.mean(y_true[in_bin])
            avg_confidence_in_bin = np.mean(y_prob[in_bin])
            ece += prop_in_bin * np.abs(avg_confidence_in_bin - accuracy_in_bin)
    return float(ece)


def calculate_calibration_curve(y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 10) -> List[Dict[str, float]]:
    """Calculates predictions vs observed frequency points for calibration mapping."""
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    curve = []
    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]
        in_bin = (y_prob >= bin_lower) & (y_prob < bin_upper) if i < n_bins - 1 else (y_prob >= bin_lower) & (y_prob <= bin_upper)
        if np.sum(in_bin) > 0:
            observed = float(np.mean(y_true[in_bin]))
            predicted = float(np.mean(y_prob[in_bin]))
            bin_mid = float((bin_lower + bin_upper) / 2.0)
            curve.append({
                "bin_midpoint": bin_mid,
                "predicted_prob": predicted,
                "observed_freq": observed
            })
    return curve


def evaluate_model_performance(
    corridor_id: str,
    model_version: str = "1.0",
    split_select: str = "all_oos"  # 'validation', 'test', or 'all_oos' (both)
) -> Dict[str, Any]:
    """
    Evaluates out-of-sample performance of the corridor model.
    Returns evaluation metrics, ECE calibration curve, and data quality check.
    """
    corridor_upper = corridor_id.upper()
    
    # 1. Load model artifact
    model, feature_medians, model_name = load_model_artifact(corridor_upper, model_version)
    if model is None:
        return {
            "status": "UNAVAILABLE",
            "reason": f"No trained model artifact found for corridor '{corridor_upper}' and version '{model_version}'"
        }

    # 2. Load model features
    features_path = os.path.join(PROCESSED_DIR, "model_features.csv")
    if not os.path.exists(features_path):
        return {
            "status": "UNAVAILABLE",
            "reason": "Feature dataset (model_features.csv) is missing."
        }

    try:
        df = pd.read_csv(features_path)
    except Exception as e:
        return {
            "status": "UNAVAILABLE",
            "reason": f"Failed to load dataset: {e}"
        }

    # 3. Filter for corridor and splits
    df_corr = df[df["corridor_id"] == corridor_upper].copy()
    if split_select == "validation":
        df_eval = df_corr[df_corr["split"] == "validation"]
    elif split_select == "test":
        df_eval = df_corr[df_corr["split"] == "test"]
    else:  # all out-of-sample combined
        df_eval = df_corr[df_corr["split"].isin(["validation", "test"])]

    if df_eval.empty:
        return {
            "status": "UNAVAILABLE",
            "reason": f"No out-of-sample data records found for split '{split_select}'."
        }

    # Drop rows with missing targets
    df_eval = df_eval[df_eval["is_disrupted"].notna()].copy()
    if len(df_eval) == 0:
        return {
            "status": "UNAVAILABLE",
            "reason": "No validated historical observations with ground truth labels."
        }

    # Extract X, y
    X = df_eval[FEATURE_COLS].copy()
    y = df_eval["is_disrupted"].astype(int).values

    # Impute missing features with medians
    if feature_medians is not None:
        X = X.fillna(feature_medians)
    else:
        X = X.fillna(0.0)

    # 4. Generate predictions
    try:
        if hasattr(model, "predict_proba"):
            y_prob = model.predict_proba(X)[:, 1]
        else:
            y_prob = model.predict(X).astype(float)
        y_pred = (y_prob >= 0.5).astype(int)
    except Exception as e:
        logger.error(f"Inference error during evaluation: {e}")
        return {
            "status": "UNAVAILABLE",
            "reason": f"Error running model predictions: {e}"
        }

    sample_count = len(y)
    positive_count = int(np.sum(y))
    negative_count = int(sample_count - positive_count)

    # Calculate dates range
    df_eval["date"] = pd.to_datetime(df_eval["date"])
    start_date = str(df_eval["date"].min().date())
    end_date = str(df_eval["date"].max().date())

    # Calculate metrics (handling edge case with 0 positive/negative labels)
    roc_auc = None
    pr_auc = None
    mcc = None
    precision = None
    recall = None
    f1 = None
    specificity = None
    logloss_val = None

    if positive_count > 0 and negative_count > 0:
        roc_auc = float(roc_auc_score(y, y_prob))
        pr_auc = float(average_precision_score(y, y_prob))
        mcc = float(matthews_corrcoef(y, y_pred))

        cm = confusion_matrix(y, y_pred)
        tn, fp, fn, tp = cm.ravel()
        specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
        precision = float(precision_score(y, y_pred, zero_division=0))
        recall = float(recall_score(y, y_pred, zero_division=0))
        f1 = float(f1_score(y, y_pred, zero_division=0))
        logloss_val = float(log_loss(y, y_prob, labels=[0, 1]))
    else:
        # One-class case: classification metrics are limited or undefined
        logger.warning(f"Single-class dataset for evaluation split: {positive_count} pos, {negative_count} neg. Skipping classification metrics.")

    # Always compute accuracy, brier, and calibration metrics
    accuracy = float(accuracy_score(y, y_pred))
    brier = float(brier_score_loss(y, y_prob))
    if logloss_val is None:
        logloss_val = float(log_loss(y, y_prob, labels=[0, 1]))

    ece = calculate_ece(y, y_prob, n_bins=10)
    curve = calculate_calibration_curve(y, y_prob, n_bins=10)

    # Calibration status classification
    if ece < 0.05:
        cal_status = "GOOD"
    elif ece < 0.15:
        cal_status = "MODERATE"
    else:
        cal_status = "DEGRADED"

    # Data quality check
    total_cells = df_eval[FEATURE_COLS].size
    missing_cells = df_eval[FEATURE_COLS].isna().sum().sum()
    missing_rate = float(missing_cells / total_cells) if total_cells > 0 else 0.0

    return {
        "status": "OK",
        "model_version": model_version,
        "model_name": model_name,
        "evaluation_period": {
            "start": start_date,
            "end": end_date
        },
        "sample_count": sample_count,
        "positive_count": positive_count,
        "negative_count": negative_count,
        "metrics": {
            "roc_auc": round(roc_auc, 4) if roc_auc is not None else None,
            "pr_auc": round(pr_auc, 4) if pr_auc is not None else None,
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4) if precision is not None else None,
            "recall": round(recall, 4) if recall is not None else None,
            "f1": round(f1, 4) if f1 is not None else None,
            "specificity": round(specificity, 4) if specificity is not None else None,
            "mcc": round(mcc, 4) if mcc is not None else None,
            "brier_score": round(brier, 4),
            "log_loss": round(logloss_val, 4)
        },
        "calibration": {
            "status": cal_status,
            "ece": round(ece, 4),
            "curve": curve
        },
        "data_quality": {
            "missing_rate": round(missing_rate, 4),
            "usable": missing_rate < 0.20
        }
    }
