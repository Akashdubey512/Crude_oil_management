"""
Model Evaluation — Phase 4

Computes comprehensive classification metrics for each trained model.
Metrics: ROC-AUC, PR-AUC, Precision, Recall, F1, Brier Score, Confusion Matrix.
Also computes precision@k and event detection lead-time where applicable.
"""

import os
import json
import datetime
import numpy as np
import pandas as pd
from sklearn.metrics import (
    roc_auc_score, average_precision_score,
    precision_score, recall_score, f1_score,
    brier_score_loss, confusion_matrix,
)

REPORTS_DIR = r"D:\hackathon project\energy-resilience\reports\model_evaluation"
os.makedirs(REPORTS_DIR, exist_ok=True)


def evaluate_classifier(
    model,
    X_val: pd.DataFrame,
    y_val: pd.Series,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    label: str = "Model",
) -> dict:
    """
    Evaluates a trained classifier on validation and test sets.
    Returns a dict of all metrics.
    """
    results = {}

    for split_name, X, y in [("validation", X_val, y_val), ("test", X_test, y_test)]:
        if len(y) == 0 or y.sum() == 0:
            results[split_name] = {"note": "No positive labels in split — metrics skipped"}
            continue

        # Get probabilities
        if hasattr(model, "predict_proba"):
            y_prob = model.predict_proba(X)[:, 1]
        else:
            y_prob = model.decision_function(X)
            y_prob = (y_prob - y_prob.min()) / (y_prob.max() - y_prob.min() + 1e-8)

        y_pred = (y_prob >= 0.5).astype(int)

        # Classification threshold-based metrics
        cm = confusion_matrix(y, y_pred).tolist()
        tn, fp, fn, tp = confusion_matrix(y, y_pred).ravel() if cm else (0, 0, 0, 0)

        # Precision@k (k = 2× expected positives)
        k = max(int(y.sum() * 2), 1)
        sorted_probs = np.sort(y_prob)[::-1]
        threshold_k = sorted_probs[min(k - 1, len(sorted_probs) - 1)]
        y_pred_k = (y_prob >= threshold_k).astype(int)
        prec_k = precision_score(y, y_pred_k, zero_division=0)
        rec_k = recall_score(y, y_pred_k, zero_division=0)

        split_metrics = {
            "roc_auc": round(float(roc_auc_score(y, y_prob)), 4),
            "pr_auc": round(float(average_precision_score(y, y_prob)), 4),
            "precision": round(float(precision_score(y, y_pred, zero_division=0)), 4),
            "recall": round(float(recall_score(y, y_pred, zero_division=0)), 4),
            "f1": round(float(f1_score(y, y_pred, zero_division=0)), 4),
            "brier_score": round(float(brier_score_loss(y, y_prob)), 4),
            "confusion_matrix": cm,
            "tp": int(tp), "fp": int(fp), "fn": int(fn), "tn": int(tn),
            "precision_at_k": round(float(prec_k), 4),
            "recall_at_k": round(float(rec_k), 4),
            "k": k,
            "n_positive": int(y.sum()),
            "n_total": int(len(y)),
        }

        results[split_name] = split_metrics
        print(f"    [{label}] {split_name}: ROC-AUC={split_metrics['roc_auc']:.3f}  "
              f"PR-AUC={split_metrics['pr_auc']:.3f}  "
              f"F1={split_metrics['f1']:.3f}  "
              f"Precision={split_metrics['precision']:.3f}  "
              f"Recall={split_metrics['recall']:.3f}  "
              f"Brier={split_metrics['brier_score']:.4f}")

    return results


def write_comparison_report(all_results: dict) -> None:
    """
    Writes model_comparison.json and model_comparison.md summarising all corridors/models.
    Identifies best model per corridor by test ROC-AUC.
    """
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    report = {
        "timestamp": timestamp,
        "results": {},
        "best_per_corridor": {},
    }

    for (corridor_id, model_name), metrics in all_results.items():
        if corridor_id not in report["results"]:
            report["results"][corridor_id] = {}
        report["results"][corridor_id][model_name] = metrics

    # Identify best model per corridor (test ROC-AUC)
    for corridor_id, models in report["results"].items():
        best_name = None
        best_roc = -1.0
        for model_name, metrics in models.items():
            test_roc = metrics.get("test", {}).get("roc_auc", -1.0)
            if isinstance(test_roc, float) and test_roc > best_roc:
                best_roc = test_roc
                best_name = model_name
        report["best_per_corridor"][corridor_id] = {
            "model": best_name,
            "test_roc_auc": best_roc,
        }

    # JSON
    json_path = os.path.join(REPORTS_DIR, "model_comparison.json")
    with open(json_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nSaved model comparison report: {json_path}")

    # Markdown
    md_path = os.path.join(REPORTS_DIR, "model_comparison.md")
    lines = [
        "# Model Comparison Report",
        f"\n_Generated: {timestamp}_\n",
        "## Best Models per Corridor\n",
        "| Corridor | Best Model | Test ROC-AUC |",
        "| :--- | :--- | :--- |",
    ]
    for corridor_id, best in report["best_per_corridor"].items():
        lines.append(f"| {corridor_id} | {best['model']} | {best['test_roc_auc']:.4f} |")

    lines.append("\n## Full Results\n")
    for corridor_id, models in report["results"].items():
        lines.append(f"\n### {corridor_id}\n")
        lines.append("| Model | Split | ROC-AUC | PR-AUC | F1 | Brier |")
        lines.append("| :--- | :--- | :--- | :--- | :--- | :--- |")
        for model_name, metrics in models.items():
            for split in ["validation", "test"]:
                m = metrics.get(split, {})
                if "roc_auc" in m:
                    lines.append(
                        f"| {model_name} | {split} | {m['roc_auc']} | {m['pr_auc']} | {m['f1']} | {m['brier_score']} |"
                    )

    with open(md_path, "w") as f:
        f.write("\n".join(lines))
    print(f"Saved markdown report: {md_path}")
