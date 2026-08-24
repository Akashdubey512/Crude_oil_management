"""
Service Interface — Phase 4

Exposes clean service functions for FastAPI or other consumption layers.
Encapsulates corridor risk calculation, risk decomposition, and explainability lookup.
"""

import datetime
import os
import json
import pandas as pd

from src.risk.corridor_risk import get_corridor_risk, get_all_corridor_risks, get_historical_risk
from src.risk.risk_decomposition import decompose_risk

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REPORTS_DIR = os.path.join(PROJECT_ROOT, "reports", "model_evaluation")

def get_corridor_risk_with_explanation(corridor_id: str, date_val: datetime.date) -> dict:
    """
    Computes active risk for a corridor and supplements it with top risk factors
    extracted from the model's feature importance/coefficients and active features.
    """
    record = get_corridor_risk(corridor_id, date_val)
    if record.get("status") == "NO_MODEL" or record.get("risk_probability") is None:
        return record

    # Load feature explanation data
    model_name = "XGBoost" # Preferred
    explanation_file = f"explanation_{model_name.lower()}_{corridor_id.lower()}.json"
    explanation_path = os.path.join(REPORTS_DIR, explanation_file)
    
    # Fallback to Random Forest or Logistic Regression
    if not os.path.exists(explanation_path):
        model_name = "RandomForest"
        explanation_file = f"explanation_{model_name.lower()}_{corridor_id.lower()}.json"
        explanation_path = os.path.join(REPORTS_DIR, explanation_file)
        
    if not os.path.exists(explanation_path):
        model_name = "LogisticRegression"
        explanation_file = f"explanation_{model_name.lower()}_{corridor_id.lower()}.json"
        explanation_path = os.path.join(REPORTS_DIR, explanation_file)

    shap_importances = {}
    top_factors = []

    if os.path.exists(explanation_path):
        try:
            with open(explanation_path, "r") as f:
                exp_data = json.load(f)
            
            # Extract top contributing features (global importance)
            for item in exp_data.get("global_importance", []):
                feature = item.get("feature")
                val = item.get("mean_abs_shap") or item.get("abs_coefficient") or 0.0
                shap_importances[feature] = val
                
            top_factors = [item.get("feature") for item in exp_data.get("global_importance", [])[:5]]
        except Exception:
            pass

    record["top_risk_factors"] = top_factors

    # Build risk decomposition using active feature weights
    features_path = os.path.join(PROJECT_ROOT, "data", "processed", "model_features.csv")
    if os.path.exists(features_path):
        try:
            df = pd.read_csv(features_path)
            df["date"] = pd.to_datetime(df["date"])
            target_date = pd.Timestamp(date_val)
            row = df[(df["corridor_id"] == corridor_id) & (df["date"] == target_date)]
            if not row.empty:
                feature_row = row.iloc[0]
                record["risk_decomposition"] = decompose_risk(
                    feature_row, 
                    record["risk_probability"], 
                    shap_importances if shap_importances else None
                )
        except Exception as e:
            record["risk_decomposition_error"] = str(e)

    return record
