"""
Data Drift Detection Service — Phase 9

Computes Population Stability Index (PSI) and Kolmogorov-Smirnov (KS) test statistics
between the reference training dataset and incoming out-of-sample data.
"""

import os
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from scipy.stats import ks_2samp

logger = logging.getLogger(__name__)

DATA_DIR = r"D:\hackathon project\energy-resilience\data"
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")

from src.features.feature_pipeline import FEATURE_COLS

# Documented thresholds for PSI drift severity
PSI_THRESHOLDS = {
    "LOW": 0.10,
    "MEDIUM": 0.25,
    "HIGH": float("inf")
}


def calculate_psi(reference: np.ndarray, current: np.ndarray, n_bins: int = 10, is_categorical: bool = False) -> float:
    """
    Calculates the Population Stability Index (PSI) between reference and current samples.
    PSI = sum((Actual% - Expected%) * ln(Actual% / Expected%))
    """
    ref_clean = reference[~np.isnan(reference)]
    curr_clean = current[~np.isnan(current)]

    if len(ref_clean) == 0 or len(curr_clean) == 0:
        return 0.0

    # If the feature has very few unique values, treat as categorical
    unique_ref = np.unique(ref_clean)
    if is_categorical or len(unique_ref) <= 5:
        # Use categories as bins
        categories = np.unique(np.concatenate([ref_clean, curr_clean]))
        ref_counts = np.array([np.sum(ref_clean == cat) for cat in categories])
        curr_counts = np.array([np.sum(curr_clean == cat) for cat in categories])
    else:
        # Deciles based on reference dataset
        bin_percentiles = np.linspace(0, 100, n_bins + 1)
        bin_edges = np.percentile(ref_clean, bin_percentiles)
        # Deduplicate edges (e.g. if many values are identical)
        bin_edges = np.unique(bin_edges)
        if len(bin_edges) < 2:
            return 0.0  # Constant feature

        ref_counts, _ = np.histogram(ref_clean, bins=bin_edges)
        curr_counts, _ = np.histogram(curr_clean, bins=bin_edges)

    # Normalize to proportions
    ref_props = ref_counts / len(ref_clean)
    curr_props = curr_counts / len(curr_clean)

    # Apply Laplace smoothing to avoid division by zero or log(0)
    ref_props = np.clip(ref_props, 1e-4, None)
    curr_props = np.clip(curr_props, 1e-4, None)

    # Sum up PSI
    psi_value = np.sum((curr_props - ref_props) * np.log(curr_props / ref_props))
    return float(psi_value)


def calculate_drift_for_feature(
    ref_data: np.ndarray,
    curr_data: np.ndarray,
    feature_name: str
) -> Dict[str, Any]:
    """
    Computes statistical tests and classifies drift severity for a single feature.
    """
    # Identify feature domain to decide categorization
    is_categorical = feature_name in ["anomaly_flag", "anomaly_type_drop", "anomaly_type_congestion", "day_of_week"]

    # Calculate PSI
    psi_val = calculate_psi(ref_data, curr_data, n_bins=10, is_categorical=is_categorical)

    # Calculate KS-Test (for numerical only)
    ks_stat = 0.0
    ks_pvalue = 1.0
    drift_method = "PSI"

    if not is_categorical:
        ref_clean = ref_data[~np.isnan(ref_data)]
        curr_clean = curr_data[~np.isnan(curr_data)]
        if len(ref_clean) > 0 and len(curr_clean) > 0:
            ks_res = ks_2samp(ref_clean, curr_clean)
            ks_stat = float(ks_res.statistic)
            ks_pvalue = float(ks_res.pvalue)
            drift_method = "PSI + KS-Test"

    # Severity classification
    if psi_val < PSI_THRESHOLDS["LOW"]:
        severity = "LOW"
        recommendation = "Distribution is stable. No action required."
    elif psi_val < PSI_THRESHOLDS["MEDIUM"]:
        severity = "MEDIUM"
        recommendation = "Moderate shift detected. Monitor feature inputs for trend validation."
    else:
        severity = "HIGH"
        recommendation = "Significant distribution drift. Retrain model after validating feature schemas."

    # Sample distributions (10 bins for plotting)
    ref_clean = ref_data[~np.isnan(ref_data)]
    curr_clean = curr_data[~np.isnan(curr_data)]
    
    ref_hist_props = []
    curr_hist_props = []
    bin_labels = []

    if len(ref_clean) > 0 and len(curr_clean) > 0:
        hist_bins = 8
        combined = np.concatenate([ref_clean, curr_clean])
        min_v, max_v = float(np.min(combined)), float(np.max(combined))
        if max_v > min_v:
            edges = np.linspace(min_v, max_v, hist_bins + 1)
            ref_h, _ = np.histogram(ref_clean, bins=edges)
            curr_h, _ = np.histogram(curr_clean, bins=edges)
            
            ref_hist_props = (ref_h / len(ref_clean)).tolist()
            curr_hist_props = (curr_h / len(curr_clean)).tolist()
            for k in range(hist_bins):
                bin_labels.append(f"{edges[k]:.2f} to {edges[k+1]:.2f}")
        else:
            ref_hist_props = [1.0]
            curr_hist_props = [1.0]
            bin_labels = [f"{min_v:.2f}"]

    return {
        "feature": feature_name,
        "drift_method": drift_method,
        "drift_score": round(psi_val, 4),
        "threshold": PSI_THRESHOLDS["LOW"],
        "severity": severity,
        "recommendation": recommendation,
        "ks_stat": round(ks_stat, 4),
        "ks_pvalue": ks_pvalue,
        "reference_distribution": {
            "proportions": ref_hist_props,
            "labels": bin_labels
        },
        "current_distribution": {
            "proportions": curr_hist_props,
            "labels": bin_labels
        }
    }


def detect_data_drift(
    corridor_id: str,
    reference_split: str = "train",
    current_split: str = "all_oos"  # 'validation', 'test', or 'all_oos' (both)
) -> Dict[str, Any]:
    """
    Compares feature distributions between reference and current splits to identify drift.
    """
    corridor_upper = corridor_id.upper()
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

    # Filter for corridor
    df_corr = df[df["corridor_id"] == corridor_upper].copy()
    if df_corr.empty:
        return {
            "status": "UNAVAILABLE",
            "reason": f"No data records found for corridor '{corridor_upper}'."
        }

    # Reference split
    df_ref = df_corr[df_corr["split"] == reference_split]
    
    # Current split
    if current_split == "validation":
        df_curr = df_corr[df_corr["split"] == "validation"]
    elif current_split == "test":
        df_curr = df_corr[df_corr["split"] == "test"]
    else:  # all out-of-sample combined
        df_curr = df_corr[df_corr["split"].isin(["validation", "test"])]

    if df_ref.empty or df_curr.empty:
        return {
            "status": "UNAVAILABLE",
            "reason": f"Insufficient observations in splits. Ref count: {len(df_ref)}, Current count: {len(df_curr)}"
        }

    # Run drift check on all features in FEATURE_COLS
    features_drift = []
    summary = {"low": 0, "medium": 0, "high": 0}

    for col in FEATURE_COLS:
        if col not in df_ref.columns or col not in df_curr.columns:
            continue
        
        ref_arr = df_ref[col].values
        curr_arr = df_curr[col].values

        res = calculate_drift_for_feature(ref_arr, curr_arr, col)
        features_drift.append(res)

        sev = res["severity"].lower()
        summary[sev] += 1

    # Overall drift classification based on ratio of drifted features
    total_features = len(features_drift)
    if total_features == 0:
        return {
            "status": "UNAVAILABLE",
            "reason": "No valid model features found in dataset columns."
        }

    high_ratio = summary["high"] / total_features
    med_ratio = summary["medium"] / total_features

    if high_ratio >= 0.10:
        overall_drift = "HIGH"
    elif med_ratio >= 0.25 or high_ratio > 0.0:
        overall_drift = "MEDIUM"
    else:
        overall_drift = "LOW"

    return {
        "status": "OK",
        "overall_drift": overall_drift,
        "features": sorted(features_drift, key=lambda x: x["drift_score"], reverse=True),
        "summary": summary
    }
