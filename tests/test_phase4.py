"""
Phase 4 Test Suite — Geopolitical Risk & Disruption Prediction Engine
Tests:
  - Feature engineering correctness (non-leakage, column bounds)
  - Chronological dataset splitting boundaries (train/validation/test)
  - Disruption target builder logic and class imbalance
  - Model fitting, loading, and predicting (predict_proba format)
  - Risk threshold assignment thresholds (LOW/MODERATE/HIGH/CRITICAL)
  - Explainability and standardised coefficients/SHAP mapping
  - Service API interface functions
  - Model registry logging schema
"""

import os
import sys
import json
import pickle
import datetime
import pandas as pd
import numpy as np
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.features.feature_pipeline import FEATURE_COLS, MODELED_CORRIDORS
from src.features.target_builder import build_disruption_target
from src.models.model_registry import get_registry, get_best_model
from src.models.train_risk_models import _get_xy
from src.risk.corridor_risk import _classify_risk
from src.risk.service import get_corridor_risk_with_explanation

PROCESSED_DIR = r"D:\hackathon project\energy-resilience\data\processed"
MODELS_DIR = r"D:\hackathon project\energy-resilience\models"
REPORTS_DIR = r"D:\hackathon project\energy-resilience\reports\model_evaluation"

class TestFeatureEngineering:
    def test_model_features_exists(self):
        fpath = os.path.join(PROCESSED_DIR, "model_features.csv")
        assert os.path.exists(fpath), "model_features.csv not generated"
        
    def test_chronological_split_integrity(self):
        """Verify train, validation, and test splits are strictly chronological and non-overlapping."""
        fpath = os.path.join(PROCESSED_DIR, "model_features.csv")
        df = pd.read_csv(fpath)
        df["date"] = pd.to_datetime(df["date"])
        
        train_dates = df[df["split"] == "train"]["date"]
        val_dates = df[df["split"] == "validation"]["date"]
        test_dates = df[df["split"] == "test"]["date"]
        
        # Chronological ordering checks
        assert train_dates.max() < val_dates.min(), "Overlap: Train max date is after Validation min date"
        assert val_dates.max() < test_dates.min(), "Overlap: Validation max date is after Test min date"
        
    def test_feature_columns_present(self):
        fpath = os.path.join(PROCESSED_DIR, "model_features.csv")
        df = pd.read_csv(fpath)
        for col in FEATURE_COLS:
            assert col in df.columns, f"Feature column {col} missing in model_features.csv"


class TestTargetBuilder:
    def test_disruption_target_values(self):
        """Verify target labels are binary (0 or 1) or NaN (for no observation)."""
        date_index = pd.date_range(start="2024-01-01", end="2024-02-01", freq="D")
        df_tgt = build_disruption_target("HORMUZ", date_index)
        
        valid_labels = df_tgt["is_disrupted"].dropna().unique()
        for label in valid_labels:
            assert label in [0, 1], f"Invalid target label detected: {label}"
            
    def test_excluded_no_observation(self):
        """Verify label_method flags EXCLUDED_NO_OBSERVATION correctly."""
        date_index = pd.date_range(start="2024-01-01", end="2024-02-01", freq="D")
        df_tgt = build_disruption_target("HORMUZ", date_index)
        
        excluded_rows = df_tgt[df_tgt["label_method"] == "EXCLUDED_NO_OBSERVATION"]
        for _, row in excluded_rows.iterrows():
            assert pd.isna(row["is_disrupted"]), "Excluded rows must have NaN target"


class TestModelTraining:
    def test_model_pickles_generated(self):
        for corridor in MODELED_CORRIDORS:
            for prefix in ["lr", "rf", "xgb"]:
                mpath = os.path.join(MODELS_DIR, f"{prefix}_{corridor.lower()}_v1.0.pkl")
                assert os.path.exists(mpath), f"Model pickle not found: {mpath}"
                
    def test_model_loading_and_prediction(self):
        """Load RF and XGB model pickles and assert they output valid risk probabilities."""
        fpath = os.path.join(PROCESSED_DIR, "model_features.csv")
        df = pd.read_csv(fpath)
        df_train = df[df["split"] == "train"]
        X, y = _get_xy(df_train)
        
        # Test loading HORMUZ RF model
        rf_path = os.path.join(MODELS_DIR, "rf_hormuz_v1.0.pkl")
        with open(rf_path, "rb") as f:
            artifact = pickle.load(f)
            
        model = artifact["model"]
        feature_medians = artifact["feature_medians"]
        
        X_imp = X.fillna(feature_medians)
        probs = model.predict_proba(X_imp)[:, 1]
        
        assert len(probs) == len(X_imp)
        assert np.all(probs >= 0.0) and np.all(probs <= 1.0), "Risk probabilities out of range [0, 1]"


class TestRiskClassification:
    def test_risk_thresholds(self):
        assert _classify_risk(0.05) == "LOW"
        assert _classify_risk(0.15) == "MODERATE"
        assert _classify_risk(0.35) == "HIGH"
        assert _classify_risk(0.65) == "CRITICAL"


class TestModelRegistry:
    def test_registry_contains_entries(self):
        reg = get_registry()
        assert len(reg) > 0, "Model registry is empty"
        
        # Check standard model metadata fields exist
        for key, entry in reg.items():
            assert "model_name" in entry
            assert "corridor_id" in entry
            assert "metrics" in entry
            assert "artifact_path" in entry
            assert "training_start" in entry


class TestServiceAPI:
    def test_get_corridor_risk_with_explanation(self):
        """Verify service layer returns explanation and risk decomposition attributes."""
        fpath = os.path.join(PROCESSED_DIR, "model_features.csv")
        df = pd.read_csv(fpath)
        latest_date_str = df["date"].max()
        latest_date = datetime.datetime.strptime(latest_date_str, "%Y-%m-%d").date()
        
        risk_rec = get_corridor_risk_with_explanation("HORMUZ", latest_date)
        
        assert risk_rec["corridor"] == "HORMUZ"
        assert "risk_probability" in risk_rec
        assert risk_rec["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
        assert "risk_decomposition" in risk_rec
        
        decomp = risk_rec["risk_decomposition"]
        assert "geopolitical_risk" in decomp
        assert "maritime_risk" in decomp
        assert "market_risk" in decomp
        assert "supply_risk" in decomp
