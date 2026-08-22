"""
Data Validation Gate — Phase 11
Provides strict pre-training and pre-inference schema/data checks.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple
from src.features.feature_pipeline import FEATURE_COLS

CRITICAL_MISSING_THRESHOLD = 0.50  # Max missing rate allowed for any column
MIN_TRAIN_ROWS = 100
MIN_POSITIVE_SAMPLES = 3

def validate_dataset(df: pd.DataFrame, corridor_id: str) -> Tuple[bool, List[str]]:
    """
    Performs comprehensive data quality and schema validation.
    Returns (is_valid, list_of_errors).
    """
    errors = []
    
    # 1. Required columns exist
    required_cols = ["date", "corridor_id", "split", "is_disrupted"] + FEATURE_COLS
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        errors.append(f"Missing required columns: {missing_cols}")
        return False, errors  # Critical error, stop here
        
    # Filter for the target corridor
    df_corr = df[df["corridor_id"] == corridor_id].copy()
    if df_corr.empty:
        errors.append(f"No records found for corridor: {corridor_id}")
        return False, errors

    # 2. Datetime column validity
    try:
        dates = pd.to_datetime(df_corr["date"])
        if dates.isna().any():
            errors.append("Datetime column contains null/invalid dates.")
    except Exception as e:
        errors.append(f"Datetime conversion failed: {e}")

    # 3. Duplicate rows check
    dup_count = df_corr.duplicated(subset=["date"]).sum()
    if dup_count > 0:
        errors.append(f"Found {dup_count} duplicate rows for date.")

    # 4. Check missing-value rates
    for col in FEATURE_COLS:
        missing_rate = df_corr[col].isna().mean()
        if missing_rate > CRITICAL_MISSING_THRESHOLD:
            errors.append(f"Column '{col}' has missing rate of {missing_rate:.2%}, exceeding threshold.")

    # 5. Infinite values check
    for col in FEATURE_COLS:
        inf_count = np.isinf(df_corr[col]).sum()
        if inf_count > 0:
            errors.append(f"Column '{col}' contains {inf_count} infinite values.")

    # 6. Numeric types check
    for col in FEATURE_COLS:
        if not pd.api.types.is_numeric_dtype(df_corr[col]):
            errors.append(f"Column '{col}' is not numeric (type: {df_corr[col].dtype}).")

    # 7. Label validity (must be 0, 1, or NaN/Null for future dates)
    labels = df_corr["is_disrupted"].dropna().unique()
    invalid_labels = [l for l in labels if l not in [0, 1, 0.0, 1.0]]
    if invalid_labels:
        errors.append(f"Invalid disruption labels found: {invalid_labels}")

    # 8. Minimum dataset size & positive samples in training split
    df_train = df_corr[df_corr["split"] == "train"]
    if len(df_train) < MIN_TRAIN_ROWS:
        errors.append(f"Training split has only {len(df_train)} rows (minimum required: {MIN_TRAIN_ROWS}).")
    
    y_train = df_train["is_disrupted"].dropna()
    pos_samples = (y_train == 1).sum()
    if pos_samples < MIN_POSITIVE_SAMPLES:
        errors.append(f"Training split has only {pos_samples} positive samples (minimum required: {MIN_POSITIVE_SAMPLES}).")

    # 9. Chronological ordering
    df_corr_sorted = df_corr.sort_values("date")
    if not df_corr["date"].equals(df_corr_sorted["date"]):
        errors.append("Dataset is not chronologically ordered.")

    # 10. Leakage-sensitive columns check
    # Check if target label is perfectly correlated with any feature column (target leakage check)
    for col in FEATURE_COLS:
        if col == "is_disrupted":
            continue
        # Compute correlation on training split
        if len(df_train) > 10:
            corr_val = df_train[col].corr(df_train["is_disrupted"])
            if pd.notna(corr_val) and abs(corr_val) > 0.99:
                errors.append(f"Target leakage warning: Feature '{col}' has correlation {corr_val:.4f} with target.")

    # 11. Impossible/unreasonable values (e.g. negative vessel counts or negative prices)
    if (df_corr["tanker_count"] < 0).any():
        errors.append("Found negative values in 'tanker_count'.")
    if (df_corr["brent_price"] < 0).any():
        errors.append("Found negative values in 'brent_price'.")

    return len(errors) == 0, errors
