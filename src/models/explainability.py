"""
SHAP-based Explainability — Phase 4

Generates global feature importance and local explanations for trained
tree-based models (Random Forest, XGBoost).

Only computes SHAP for tree models. For Logistic Regression, reports
standardized coefficients as a proxy for feature importance.
Never fabricates explanations.
"""

import os
import json
import pickle
import numpy as np
import pandas as pd

try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False

from src.features.feature_pipeline import FEATURE_COLS

MODELS_DIR = r"D:\hackathon project\energy-resilience\models"
REPORTS_DIR = r"D:\hackathon project\energy-resilience\reports\model_evaluation"

os.makedirs(REPORTS_DIR, exist_ok=True)


def explain_model(
    model_artifact: dict,
    X_explain: pd.DataFrame,
    model_name: str,
    corridor_id: str,
    top_n: int = 15,
) -> dict:
    """
    Computes SHAP global feature importance for tree models,
    or standardized coefficients for logistic regression.

    Returns a dict with global feature importance ranking.
    """
    model = model_artifact["model"]
    feature_medians = model_artifact["feature_medians"]

    X_imp = X_explain[FEATURE_COLS].fillna(feature_medians)

    # Unwrap Pipeline if needed
    clf = model
    if hasattr(model, "named_steps"):
        clf = model.named_steps.get("clf", model)
        if "scaler" in model.named_steps:
            X_imp_array = model.named_steps["scaler"].transform(X_imp)
        else:
            X_imp_array = X_imp.values
    else:
        X_imp_array = X_imp.values

    explanation = {
        "model_name": model_name,
        "corridor_id": corridor_id,
        "n_samples_explained": len(X_imp),
        "method": None,
        "global_importance": [],
        "shap_available": SHAP_AVAILABLE,
    }

    if SHAP_AVAILABLE and model_name in ("RandomForest", "XGBoost"):
        explanation["method"] = "SHAP TreeExplainer"
        explainer = shap.TreeExplainer(clf)
        shap_values = explainer.shap_values(X_imp_array if isinstance(X_imp_array, np.ndarray) else X_imp.values)

        # Extract positive class SHAP values depending on array dimensions
        if isinstance(shap_values, list):
            sv = shap_values[1]  # Positive class
        elif isinstance(shap_values, np.ndarray):
            if shap_values.ndim == 3:
                sv = shap_values[:, :, 1]  # Positive class for multi-class/RF format
            else:
                sv = shap_values
        else:
            sv = shap_values

        mean_abs_shap = np.abs(sv).mean(axis=0)
        importance_df = pd.DataFrame({
            "feature": FEATURE_COLS[:len(mean_abs_shap)],
            "mean_abs_shap": mean_abs_shap,
        }).sort_values("mean_abs_shap", ascending=False)

        explanation["global_importance"] = importance_df.head(top_n).to_dict(orient="records")

    elif model_name == "LogisticRegression":
        explanation["method"] = "Standardized Coefficients (proxy)"
        coef = clf.coef_[0]
        importance_df = pd.DataFrame({
            "feature": FEATURE_COLS[:len(coef)],
            "coefficient": coef,
            "abs_coefficient": np.abs(coef),
        }).sort_values("abs_coefficient", ascending=False)
        explanation["global_importance"] = importance_df.head(top_n).to_dict(orient="records")

    else:
        explanation["method"] = "SHAP unavailable — install shap package"

    # Save explanation
    out_path = os.path.join(REPORTS_DIR, f"explanation_{model_name.lower()}_{corridor_id.lower()}.json")
    with open(out_path, "w") as f:
        json.dump(explanation, f, indent=2, default=float)
    print(f"  Saved explanation to {out_path}")

    return explanation


def explain_all_models(features_path: str = None) -> None:
    """Runs SHAP explainability for all trained corridor models."""
    if features_path is None:
        features_path = r"D:\hackathon project\energy-resilience\data\processed\model_features.csv"

    df = pd.read_csv(features_path)

    for corridor_id in ["HORMUZ", "BAB_EL_MANDEB", "SUEZ"]:
        df_corr = df[df["corridor_id"] == corridor_id]
        X_explain = df_corr[df_corr["split"] == "test"][FEATURE_COLS].copy()

        if X_explain.empty:
            print(f"  No test data for {corridor_id} — skipping explanation.")
            continue

        for model_name, prefix in [("LogisticRegression", "lr"), ("RandomForest", "rf"), ("XGBoost", "xgb")]:
            model_path = os.path.join(MODELS_DIR, f"{prefix}_{corridor_id.lower()}_v1.0.pkl")
            if not os.path.exists(model_path):
                print(f"  Model artifact not found: {model_path} — skipping.")
                continue

            with open(model_path, "rb") as f:
                artifact = pickle.load(f)

            print(f"\n[{corridor_id}] Explaining {model_name}...")
            explain_model(artifact, X_explain, model_name, corridor_id)
