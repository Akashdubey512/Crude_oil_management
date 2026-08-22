"""
Feature Pipeline Orchestrator — Phase 4

Combines geopolitical, maritime, and energy features into a single
master corridor-level training dataset. Applies chronological splitting
and data quality pre-checks before writing outputs.

Output: data/processed/model_features.csv
         data/processed/model_features_quality.json
"""

import os
import json
import hashlib
import datetime
import pandas as pd
import numpy as np

from src.features.geopolitical_features import build_geopolitical_features
from src.features.maritime_features import build_maritime_features
from src.features.energy_features import build_energy_features
from src.features.target_builder import build_disruption_target

PROCESSED_DIR = r"D:\hackathon project\energy-resilience\data\processed"
QUALITY_DIR = r"D:\hackathon project\energy-resilience\data\quality"

# Corridors for which we have real daily PortWatch traffic data
MODELED_CORRIDORS = ["HORMUZ", "BAB_EL_MANDEB", "SUEZ", "RED_SEA"]

# Chronological split boundaries (dates chosen to respect data availability)
TRAIN_END = "2025-09-30"
VALIDATION_END = "2026-03-31"
# Test: 2026-04-01 → max available date

# Minimum warm-up period for rolling features (28 days)
WARMUP_DAYS = 28

# Feature columns to include in model training (ordered)
FEATURE_COLS = [
    # Geopolitical signals
    "gpr_daily", "gpr_act", "gpr_threat",
    "gpr_daily_7d_ma", "gpr_daily_28d_ma", "gpr_daily_28d_std",
    "gpr_india_monthly", "gpr_russia_monthly", "gpr_saudi_monthly", "gpr_china_monthly",
    "corridor_events_1d", "corridor_events_7d", "corridor_events_28d",
    "corridor_disruption_28d", "corridor_sanctions_28d",
    "global_events_7d", "global_events_28d",
    # Maritime signals
    "tanker_count", "vessel_count", "cargo_count",
    "tanker_7d_ma", "tanker_14d_ma", "tanker_28d_ma", "tanker_90d_ma",
    "tanker_28d_std", "tanker_decline_ratio_28d", "tanker_zscore_28d",
    "tanker_lag1d", "tanker_lag7d", "tanker_lag1d_chg", "tanker_lag7d_chg",
    "anomaly_flag", "anomaly_type_drop", "anomaly_type_congestion",
    # Energy/market signals
    "brent_price", "brent_return_1d", "brent_return_7d",
    "brent_volatility_7d", "brent_volatility_28d",
    "brent_28d_ma", "brent_zscore_28d",
    "brent_lag7d", "brent_lag28d",
    "refinery_throughput_tmt", "refinery_mom_change",
    "consumption_total_tmt", "consumption_mom_change",
    "crude_import_tmt", "crude_import_mom_change",
    # Calendar
    "month_sin", "month_cos", "day_of_week",
]


def run_feature_pipeline() -> pd.DataFrame:
    """
    Builds the full model_features dataset for all corridors and writes
    model_features.csv and model_features_quality.json.
    """
    print("=" * 72)
    print("Phase 4 Feature Pipeline")
    print("=" * 72)

    all_corridor_frames = []

    for corridor_id in MODELED_CORRIDORS:
        print(f"\n[{corridor_id}] Building features...")

        # Date index: PortWatch data range + warmup buffer
        traffic_path = os.path.join(PROCESSED_DIR, "corridor_traffic_daily.csv")
        df_traffic = pd.read_csv(traffic_path)
        df_traffic["date"] = pd.to_datetime(df_traffic["date"])
        corridor_dates = df_traffic[df_traffic["corridor_id"] == corridor_id]["date"]
        date_min = corridor_dates.min() - pd.Timedelta(days=WARMUP_DAYS)
        date_max = corridor_dates.max()

        date_index = pd.date_range(start=date_min, end=date_max, freq="D")

        # Build feature components
        df_geo = build_geopolitical_features(date_index, corridor_id)
        df_mar = build_maritime_features(date_index, corridor_id)
        df_ene = build_energy_features(date_index)
        df_tgt = build_disruption_target(corridor_id, date_index)

        # Merge on date
        df = df_geo.merge(df_mar, on="date", how="left", suffixes=("", "_mar"))
        df = df.merge(df_ene, on="date", how="left", suffixes=("", "_ene"))
        df = df.merge(df_tgt[["date", "is_disrupted", "label_method"]], on="date", how="left")

        # Lag all feature columns by 1 day to prevent target leakage and look-ahead bias
        df = df.sort_values("date").reset_index(drop=True)
        for col in FEATURE_COLS:
            if col in df.columns:
                df[col] = df[col].shift(1)

        # Drop warmup period (first WARMUP_DAYS rows lack sufficient rolling history)
        warmup_cutoff = corridor_dates.min()
        df = df[df["date"] >= warmup_cutoff].copy()

        # Assign split label
        df["date"] = pd.to_datetime(df["date"])
        df["split"] = "test"
        df.loc[df["date"] <= TRAIN_END, "split"] = "train"
        df.loc[(df["date"] > TRAIN_END) & (df["date"] <= VALIDATION_END), "split"] = "validation"

        print(f"  Split counts: {df['split'].value_counts().to_dict()}")
        all_corridor_frames.append(df)

    # Combine all corridors
    df_all = pd.concat(all_corridor_frames, ignore_index=True)
    df_all["date"] = df_all["date"].dt.strftime("%Y-%m-%d")

    # Ensure feature columns exist (fill missing with NaN)
    for col in FEATURE_COLS:
        if col not in df_all.columns:
            df_all[col] = np.nan

    # Select and order output columns
    output_cols = ["date", "corridor_id", "split", "is_disrupted", "label_method"] + FEATURE_COLS
    output_cols = [c for c in output_cols if c in df_all.columns]
    df_out = df_all[output_cols].copy()

    # Pre-training data quality checks
    quality_report = _quality_checks(df_out)

    # Write outputs
    features_path = os.path.join(PROCESSED_DIR, "model_features.csv")
    df_out.to_csv(features_path, index=False)
    print(f"\nSaved model_features.csv: {df_out.shape[0]} rows × {df_out.shape[1]} cols")

    quality_path = os.path.join(QUALITY_DIR, "model_features_quality.json")
    with open(quality_path, "w") as f:
        json.dump(quality_report, f, indent=2)
    print(f"Saved model_features_quality.json: status={quality_report['status']}")

    return df_out


def _quality_checks(df: pd.DataFrame) -> dict:
    """
    Runs pre-training data quality audits. Returns a JSON-serializable report.
    """
    report = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "status": "PASS",
        "total_rows": int(len(df)),
        "corridors": MODELED_CORRIDORS,
        "split_counts": df["split"].value_counts().to_dict(),
        "target_class_balance": {},
        "null_rates": {},
        "warnings": [],
        "failures": [],
    }

    # Target class balance per split
    for split in ["train", "validation", "test"]:
        sub = df[(df["split"] == split) & (df["is_disrupted"].notna())]
        pos = int((sub["is_disrupted"] == 1).sum())
        neg = int((sub["is_disrupted"] == 0).sum())
        total = pos + neg
        report["target_class_balance"][split] = {
            "positive": pos,
            "negative": neg,
            "positive_rate": round(pos / total, 4) if total > 0 else 0.0,
        }

    # Feature null rates (train set only — test-set nulls acceptable)
    train = df[df["split"] == "train"]
    for col in FEATURE_COLS:
        if col in df.columns:
            null_rate = float(train[col].isna().mean())
            report["null_rates"][col] = round(null_rate, 4)
            if null_rate > 0.5:
                report["warnings"].append(f"High null rate in train: {col}={null_rate:.1%}")
            if null_rate == 1.0:
                report["failures"].append(f"Column entirely null in train: {col}")
                report["status"] = "FAIL"

    # Duplicate check
    dup_count = int(df.duplicated(subset=["date", "corridor_id"]).sum())
    if dup_count > 0:
        report["failures"].append(f"Duplicate (date, corridor_id) rows: {dup_count}")
        report["status"] = "FAIL"

    # Feature count
    report["feature_count"] = len(FEATURE_COLS)
    report["source_datasets"] = [
        "geopolitical_risk.csv (staging)",
        "geopolitical_events.csv (processed)",
        "corridor_traffic_daily.csv (processed)",
        "corridor_anomalies.csv (processed)",
        "event_corridor_links.csv (processed)",
        "crude_prices.csv (staging)",
        "refinery_throughput.csv (staging)",
        "petroleum_consumption.csv (staging)",
        "crude_imports.csv (staging)",
    ]

    if report["warnings"]:
        report["status"] = "WARN" if report["status"] == "PASS" else report["status"]

    return report
