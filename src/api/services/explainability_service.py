import os
import json
from typing import Dict, Any, List, Optional

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
REPORTS_DIR = os.path.join(PROJECT_ROOT, "reports", "model_evaluation")


def get_model_explainability(corridor_id: str) -> Dict[str, Any]:
    """
    Retrieves the global SHAP feature importance for a corridor's active XGBoost model.
    Raises FileNotFoundError if explainability data is unavailable for the corridor.
    """
    corridor_upper = corridor_id.upper()
    file_path = os.path.join(
        REPORTS_DIR, f"explanation_xgboost_{corridor_upper.lower()}.json"
    )

    if not os.path.exists(file_path):
        raise FileNotFoundError(
            f"Explainability unavailable for corridor '{corridor_id}'."
        )

    with open(file_path, "r") as f:
        data = json.load(f)

    # Validate output structure
    global_imp = data.get("global_importance", [])
    formatted_imp = []
    for entry in global_imp:
        formatted_imp.append({
            "feature": entry.get("feature", ""),
            "mean_abs_shap": float(entry.get("mean_abs_shap", 0.0))
        })

    return {
        "model_name": data.get("model_name", "XGBoost"),
        "corridor_id": corridor_upper,
        "method": data.get("method", "SHAP TreeExplainer"),
        "global_importance": formatted_imp
    }
