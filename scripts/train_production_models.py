"""
Deterministic and Governed Production Model Training Pipeline — Phase 11
Usage:
  python scripts/train_production_models.py --corridor RED_SEA
  python scripts/train_production_models.py --all
"""

import os
import sys
import argparse
import pickle
import time
import datetime
import subprocess
import numpy as np
import pandas as pd

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier
from sklearn.metrics import (
    roc_auc_score, average_precision_score, f1_score,
    precision_score, recall_score, brier_score_loss, log_loss,
    matthews_corrcoef, confusion_matrix
)

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from src.api.services.data_validation import validate_dataset
from src.models.model_registry import register_model, hash_file
from src.features.feature_pipeline import FEATURE_COLS, MODELED_CORRIDORS

PROCESSED_DIR = r"D:\hackathon project\energy-resilience\data\processed"
MODELS_DIR = r"D:\hackathon project\energy-resilience\models"
os.makedirs(MODELS_DIR, exist_ok=True)

MODEL_VERSION = "2.0"  # Incrementing version to indicate Phase 11 governed runs
FEATURE_VERSION = "1.0"
RANDOM_STATE = 42

def get_git_commit() -> str:
    """Gets the current git commit hash."""
    try:
        res = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        return res.stdout.strip()
    except Exception:
        return "UNKNOWN"

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

def calculate_split_metrics(y_true: np.ndarray, y_prob: np.ndarray) -> dict:
    """Computes all required performance metrics for a split."""
    if len(y_true) == 0 or y_true.sum() == 0:
        return {
            "roc_auc": None, "pr_auc": None, "f1": None,
            "precision": None, "recall": None, "specificity": None,
            "mcc": None, "brier_score": None, "log_loss": None, "ece": None
        }

    y_pred = (y_prob >= 0.5).astype(int)
    
    # Calculate confusion matrix for specificity
    cm = confusion_matrix(y_true, y_pred)
    if cm.shape == (2, 2):
        tn, fp, fn, tp = cm.ravel()
        specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
    else:
        specificity = 0.0

    # Handle single-class edge cases in metric score calculations
    try:
        roc_auc = float(roc_auc_score(y_true, y_prob))
    except Exception:
        roc_auc = None

    pr_auc = float(average_precision_score(y_true, y_prob))
    f1 = float(f1_score(y_true, y_pred))
    precision = float(precision_score(y_true, y_pred, zero_division=0))
    recall = float(recall_score(y_true, y_pred, zero_division=0))
    mcc = float(matthews_corrcoef(y_true, y_pred))
    brier = float(brier_score_loss(y_true, y_prob))
    ll = float(log_loss(y_true, y_prob, labels=[0, 1]))
    ece = calculate_ece(y_true, y_prob)

    return {
        "roc_auc": roc_auc,
        "pr_auc": pr_auc,
        "f1": f1,
        "precision": precision,
        "recall": recall,
        "specificity": specificity,
        "mcc": mcc,
        "brier_score": brier,
        "log_loss": ll,
        "ece": ece
    }

def train_production_corridor_model(corridor_id: str, df: pd.DataFrame) -> dict:
    """Trains, evaluates and registers governed models for a single corridor."""
    corridor_id = corridor_id.upper()
    print(f"\n==================================================")
    print(f"TRAINING GOVERNED MODELS FOR CORRIDOR: {corridor_id}")
    print(f"==================================================")

    # 1. Run Data Validation Gate
    is_valid, errors = validate_dataset(df, corridor_id)
    if not is_valid:
        print(f"[FAIL] [CRITICAL] Data validation failed for corridor '{corridor_id}':")
        for err in errors:
            print(f"   - {err}")
        raise ValueError(f"Data validation failed for corridor: {corridor_id}")
    print("[SUCCESS] Data validation gate passed.")

    df_corr = df[df["corridor_id"] == corridor_id].copy()
    df_corr["date"] = pd.to_datetime(df_corr["date"])
    train = df_corr[df_corr["split"] == "train"]
    val = df_corr[df_corr["split"] == "validation"]
    test = df_corr[df_corr["split"] == "test"]

    X_train = train[FEATURE_COLS].copy()
    y_train = train["is_disrupted"].astype(int)
    X_val = val[FEATURE_COLS].copy()
    y_val = val["is_disrupted"].astype(int)
    X_test = test[FEATURE_COLS].copy()
    y_test = test["is_disrupted"].astype(int)

    # Median imputation
    feature_medians = X_train.median()
    X_train_imp = X_train.fillna(feature_medians)
    X_val_imp = X_val.fillna(feature_medians)
    X_test_imp = X_test.fillna(feature_medians)

    pos_weight = float((y_train == 0).sum() / max(y_train.sum(), 1))
    dataset_hash = hash_file(os.path.join(PROCESSED_DIR, "model_features.csv"))
    git_commit = get_git_commit()

    # Train XGBoost as the Champion Candidate
    print("Training XGBoost candidate...")
    xgb_model = XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        scale_pos_weight=pos_weight,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=RANDOM_STATE,
        verbosity=0,
    )
    xgb_model.fit(X_train_imp, y_train, eval_set=[(X_val_imp, y_val)], verbose=False)

    # Evaluate split probabilities
    val_probs = xgb_model.predict_proba(X_val_imp)[:, 1]
    test_probs = xgb_model.predict_proba(X_test_imp)[:, 1]

    val_metrics = calculate_split_metrics(y_val.values, val_probs)
    test_metrics = calculate_split_metrics(y_test.values, test_probs)

    metrics_combined = {
        "validation": val_metrics,
        "test": test_metrics
    }

    # Model packaging with metadata
    metadata = {
        "corridor": corridor_id,
        "model_type": "XGBoost",
        "model_version": MODEL_VERSION,
        "training_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "dataset_hash": dataset_hash,
        "feature_names": FEATURE_COLS,
        "num_train_rows": len(X_train),
        "num_val_rows": len(X_val),
        "num_test_rows": len(X_test),
        "positive_counts": {
            "train": int(y_train.sum()),
            "val": int(y_val.sum()),
            "test": int(y_test.sum())
        },
        "negative_counts": {
            "train": int((y_train == 0).sum()),
            "val": int((y_val == 0).sum()),
            "test": int((y_test == 0).sum())
        },
        "class_ratio": float(y_train.sum() / len(y_train)),
        "random_seed": RANDOM_STATE,
        "hyperparameters": {"n_estimators": 200, "max_depth": 4, "learning_rate": 0.05},
        "training_period": f"{train['date'].min().date()} to {train['date'].max().date()}",
        "validation_period": f"{val['date'].min().date()} to {val['date'].max().date()}",
        "test_period": f"{test['date'].min().date()} to {test['date'].max().date()}",
        "git_commit": git_commit,
    }

    xgb_path = os.path.join(MODELS_DIR, f"xgb_{corridor_id.lower()}_v{MODEL_VERSION}.pkl")
    artifact = {
        "model": xgb_model,
        "feature_medians": feature_medians,
        "metadata": metadata
    }

    with open(xgb_path, "wb") as f:
        pickle.dump(artifact, f)
    print(f"[SUCCESS] Saved candidate artifact to: {xgb_path}")

    # Register as CANDIDATE in model registry
    register_model(
        model_name="XGBoost",
        corridor_id=corridor_id,
        version=MODEL_VERSION,
        training_start=str(train["date"].min().date()),
        training_end=str(train["date"].max().date()),
        feature_version=FEATURE_VERSION,
        feature_count=len(FEATURE_COLS),
        dataset_hashes={"model_features.csv": dataset_hash},
        parameters=metadata["hyperparameters"],
        metrics=metrics_combined,
        artifact_path=xgb_path,
        status="CANDIDATE",
        calibration_metrics={"ece": val_metrics.get("ece")},
        drift_metrics={"psi_scores": {}}  # Populated during promotion drift checks
    )
    print(f"[SUCCESS] Registered model '{xgb_path}' with status CANDIDATE.")
    return metrics_combined

def main():
    parser = argparse.ArgumentParser(description="Deterministic and Governed Training Pipeline")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--corridor", type=str, help="Corridor ID to train")
    group.add_argument("--all", action="store_true", help="Train all corridors")

    args = parser.parse_args()

    features_path = os.path.join(PROCESSED_DIR, "model_features.csv")
    if not os.path.exists(features_path):
        print(f"[FAIL] Master feature dataset '{features_path}' is missing.")
        sys.exit(1)

    df = pd.read_csv(features_path)

    corridors_to_train = []
    if args.all:
        corridors_to_train = MODELED_CORRIDORS
    else:
        corridors_to_train = [args.corridor.upper()]

    for corridor in corridors_to_train:
        try:
            train_production_corridor_model(corridor, df)
        except Exception as e:
            print(f"[FAIL] Failed training for {corridor}: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()
