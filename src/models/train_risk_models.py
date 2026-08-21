"""
Model Training — Phase 4

Trains Logistic Regression, Random Forest, and XGBoost on the
corridor-level disruption dataset using chronological splitting.

Key design decisions:
  - Time-based train/validation/test split (NO random splitting).
  - Class imbalance handled via class_weight='balanced' / scale_pos_weight.
  - Reproducible via fixed random_state=42.
  - Models saved as .pkl files under models/.
  - Training metrics recorded via model_registry.
"""

import os
import pickle
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.calibration import CalibratedClassifierCV
from xgboost import XGBClassifier

from src.models.model_registry import register_model, hash_file
from src.models.evaluate_models import evaluate_classifier
from src.features.feature_pipeline import FEATURE_COLS, MODELED_CORRIDORS

PROCESSED_DIR = r"D:\hackathon project\energy-resilience\data\processed"
MODELS_DIR = r"D:\hackathon project\energy-resilience\models"

os.makedirs(MODELS_DIR, exist_ok=True)

FEATURE_VERSION = "1.0"
MODEL_VERSION = "1.0"
RANDOM_STATE = 42


def _get_xy(df_split: pd.DataFrame):
    """Returns (X, y) arrays from a feature dataframe split, dropping rows with NaN target."""
    df = df_split[df_split["is_disrupted"].notna()].copy()
    X = df[FEATURE_COLS].copy()
    y = df["is_disrupted"].astype(int)
    return X, y


def train_all_models(features_path: str = None) -> dict:
    """
    Trains all three model types for each corridor.
    Returns a dict of results keyed by (corridor_id, model_name).
    """
    if features_path is None:
        features_path = os.path.join(PROCESSED_DIR, "model_features.csv")

    df = pd.read_csv(features_path)
    df["date"] = pd.to_datetime(df["date"])

    all_results = {}

    for corridor_id in MODELED_CORRIDORS:
        print(f"\n{'='*60}")
        print(f"Training models for corridor: {corridor_id}")
        print(f"{'='*60}")

        df_corr = df[df["corridor_id"] == corridor_id].copy()

        train = df_corr[df_corr["split"] == "train"]
        val = df_corr[df_corr["split"] == "validation"]
        test = df_corr[df_corr["split"] == "test"]

        X_train, y_train = _get_xy(train)
        X_val, y_val = _get_xy(val)
        X_test, y_test = _get_xy(test)

        print(f"  Train: {len(X_train)} rows, {int(y_train.sum())} positive")
        print(f"  Val:   {len(X_val)} rows, {int(y_val.sum())} positive")
        print(f"  Test:  {len(X_test)} rows, {int(y_test.sum())} positive")

        # Impute NaN with median (computed on train only to prevent leakage)
        feature_medians = X_train.median()
        X_train_imp = X_train.fillna(feature_medians)
        X_val_imp = X_val.fillna(feature_medians)
        X_test_imp = X_test.fillna(feature_medians)

        # Stop model if insufficient training data
        if len(X_train) < 50 or y_train.sum() < 3:
            print(f"  [SKIP] Insufficient training data for {corridor_id}. Stopping model.")
            continue

        pos_weight = float((y_train == 0).sum() / max(y_train.sum(), 1))

        # Dataset hashes for lineage
        features_hash = hash_file(features_path)
        dataset_hashes = {"model_features.csv": features_hash}

        # Training date ranges
        train_dates = train["date"]
        training_start = str(train_dates.min().date())
        training_end = str(train_dates.max().date())

        # --- 1. Logistic Regression ---
        print("\n  [1/3] Logistic Regression...")
        lr_pipe = Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(
                class_weight="balanced",
                max_iter=1000,
                random_state=RANDOM_STATE,
                C=0.1,
            ))
        ])
        lr_pipe.fit(X_train_imp, y_train)
        lr_metrics = evaluate_classifier(
            lr_pipe, X_val_imp, y_val, X_test_imp, y_test, label="LogisticRegression"
        )

        # Save artifact
        lr_path = os.path.join(MODELS_DIR, f"lr_{corridor_id.lower()}_v{MODEL_VERSION}.pkl")
        with open(lr_path, "wb") as f:
            pickle.dump({"model": lr_pipe, "feature_medians": feature_medians}, f)

        register_model(
            model_name="LogisticRegression",
            corridor_id=corridor_id,
            version=MODEL_VERSION,
            training_start=training_start,
            training_end=training_end,
            feature_version=FEATURE_VERSION,
            feature_count=len(FEATURE_COLS),
            dataset_hashes=dataset_hashes,
            parameters={"C": 0.1, "class_weight": "balanced", "max_iter": 1000},
            metrics=lr_metrics,
            artifact_path=lr_path,
        )
        all_results[(corridor_id, "LogisticRegression")] = lr_metrics

        # --- 2. Random Forest ---
        print("  [2/3] Random Forest...")
        rf_model = RandomForestClassifier(
            n_estimators=200,
            max_depth=6,
            min_samples_leaf=5,
            class_weight="balanced",
            random_state=RANDOM_STATE,
            n_jobs=-1,
        )
        rf_model.fit(X_train_imp, y_train)
        rf_metrics = evaluate_classifier(
            rf_model, X_val_imp, y_val, X_test_imp, y_test, label="RandomForest"
        )

        rf_path = os.path.join(MODELS_DIR, f"rf_{corridor_id.lower()}_v{MODEL_VERSION}.pkl")
        with open(rf_path, "wb") as f:
            pickle.dump({"model": rf_model, "feature_medians": feature_medians}, f)

        register_model(
            model_name="RandomForest",
            corridor_id=corridor_id,
            version=MODEL_VERSION,
            training_start=training_start,
            training_end=training_end,
            feature_version=FEATURE_VERSION,
            feature_count=len(FEATURE_COLS),
            dataset_hashes=dataset_hashes,
            parameters={"n_estimators": 200, "max_depth": 6, "class_weight": "balanced"},
            metrics=rf_metrics,
            artifact_path=rf_path,
        )
        all_results[(corridor_id, "RandomForest")] = rf_metrics

        # --- 3. XGBoost ---
        print("  [3/3] XGBoost...")
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
        xgb_model.fit(
            X_train_imp, y_train,
            eval_set=[(X_val_imp, y_val)],
            verbose=False,
        )
        xgb_metrics = evaluate_classifier(
            xgb_model, X_val_imp, y_val, X_test_imp, y_test, label="XGBoost"
        )

        xgb_path = os.path.join(MODELS_DIR, f"xgb_{corridor_id.lower()}_v{MODEL_VERSION}.pkl")
        with open(xgb_path, "wb") as f:
            pickle.dump({"model": xgb_model, "feature_medians": feature_medians}, f)

        register_model(
            model_name="XGBoost",
            corridor_id=corridor_id,
            version=MODEL_VERSION,
            training_start=training_start,
            training_end=training_end,
            feature_version=FEATURE_VERSION,
            feature_count=len(FEATURE_COLS),
            dataset_hashes=dataset_hashes,
            parameters={"n_estimators": 200, "max_depth": 4, "scale_pos_weight": pos_weight},
            metrics=xgb_metrics,
            artifact_path=xgb_path,
        )
        all_results[(corridor_id, "XGBoost")] = xgb_metrics

    return all_results
