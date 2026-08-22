"""
Unit tests for data validation gate
"""

import pytest
import pandas as pd
import numpy as np
from src.api.services.data_validation import validate_dataset
from src.features.feature_pipeline import FEATURE_COLS

@pytest.fixture
def base_valid_df():
    # Construct a valid dummy dataframe covering FEATURE_COLS
    dates = pd.date_range(start="2024-01-01", periods=150, freq="D")
    # Interleave some 1s to ensure positive samples exist in all splits
    is_disrupted = [0] * 150
    for idx in range(5, 150, 10):
        is_disrupted[idx] = 1
        
    data = {
        "date": dates,
        "corridor_id": ["RED_SEA"] * 150,
        "split": ["train"] * 110 + ["validation"] * 20 + ["test"] * 20,
        "is_disrupted": is_disrupted,
    }
    
    # Fill in all feature columns with dummy float values
    for col in FEATURE_COLS:
        if col in ["tanker_count", "vessel_count", "cargo_count"]:
            data[col] = np.random.randint(10, 50, size=150).astype(float)
        elif col in ["anomaly_flag", "anomaly_type_drop", "anomaly_type_congestion"]:
            data[col] = [0.0] * 150
        elif col == "brent_price":
            data[col] = [80.0] * 150
        else:
            data[col] = np.random.randn(150)
            
    return pd.DataFrame(data)

def test_valid_dataset_passes(base_valid_df):
    is_valid, errors = validate_dataset(base_valid_df, "RED_SEA")
    assert is_valid, f"Expected valid dataset to pass, got errors: {errors}"

def test_missing_column_fails(base_valid_df):
    df_invalid = base_valid_df.drop(columns=["brent_price"])
    is_valid, errors = validate_dataset(df_invalid, "RED_SEA")
    assert not is_valid
    assert any("Missing required columns" in e or "brent_price" in e for e in errors)

def test_high_missing_rate_fails(base_valid_df):
    df_invalid = base_valid_df.copy()
    # Introduce NaN to more than 50% of the values of a column
    df_invalid.loc[0:100, "gpr_daily"] = np.nan
    is_valid, errors = validate_dataset(df_invalid, "RED_SEA")
    assert not is_valid
    assert any("exceeding threshold" in e for e in errors)

def test_infinite_values_fail(base_valid_df):
    df_invalid = base_valid_df.copy()
    df_invalid.loc[5, "gpr_daily"] = np.inf
    is_valid, errors = validate_dataset(df_invalid, "RED_SEA")
    assert not is_valid
    assert any("infinite values" in e for e in errors)

def test_insufficient_rows_fails(base_valid_df):
    df_invalid = base_valid_df.iloc[:50].copy() # 50 rows is less than MIN_TRAIN_ROWS (100)
    is_valid, errors = validate_dataset(df_invalid, "RED_SEA")
    assert not is_valid
    assert any("Training split has only" in e for e in errors)

def test_insufficient_positives_fails(base_valid_df):
    df_invalid = base_valid_df.copy()
    # Replace all positives with 0 in training
    df_invalid.loc[df_invalid["split"] == "train", "is_disrupted"] = 0
    is_valid, errors = validate_dataset(df_invalid, "RED_SEA")
    assert not is_valid
    assert any("positive samples" in e for e in errors)

def test_target_leakage_warning(base_valid_df):
    df_invalid = base_valid_df.copy()
    # Copy is_disrupted directly to one of the features
    df_invalid["gpr_daily"] = df_invalid["is_disrupted"]
    is_valid, errors = validate_dataset(df_invalid, "RED_SEA")
    assert not is_valid
    assert any("Target leakage warning" in e for e in errors)

def test_impossible_values_fail(base_valid_df):
    df_invalid = base_valid_df.copy()
    df_invalid.loc[5, "tanker_count"] = -10.0
    is_valid, errors = validate_dataset(df_invalid, "RED_SEA")
    assert not is_valid
    assert any("negative values" in e for e in errors)
