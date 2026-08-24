"""
Maritime Feature Engineering — Phase 4

Extracts corridor-level maritime traffic signals from IMF PortWatch daily
transit counts. Computes rolling statistics, relative deviations, and
explicit traffic-signal indicators.

Feature lineage:
  feature_name               | source_dataset           | source_column   | transformation              | lag  | unit
  tanker_count               | corridor_traffic_daily   | tanker_count    | raw observed                | 0d   | Vessel count/day
  vessel_count               | corridor_traffic_daily   | vessel_count    | raw observed                | 0d   | Vessel count/day
  cargo_count                | corridor_traffic_daily   | cargo_count     | raw observed                | 0d   | Vessel count/day
  capacity_tanker            | corridor_traffic_daily   | capacity_tanker | raw observed                | 0d   | DWT
  tanker_7d_ma               | corridor_traffic_daily   | tanker_count    | rolling mean (7d)           | 0d   | Vessel count/day
  tanker_14d_ma              | corridor_traffic_daily   | tanker_count    | rolling mean (14d)          | 0d   | Vessel count/day
  tanker_28d_ma              | corridor_traffic_daily   | tanker_count    | rolling mean (28d)          | 0d   | Vessel count/day
  tanker_90d_ma              | corridor_traffic_daily   | tanker_count    | rolling mean (90d)          | 0d   | Vessel count/day
  tanker_28d_std             | corridor_traffic_daily   | tanker_count    | rolling std (28d)           | 0d   | Vessel count/day
  tanker_decline_ratio_28d   | corridor_traffic_daily   | tanker_count    | (obs - median28) / median28 | 0d   | Ratio
  tanker_zscore_28d          | corridor_traffic_daily   | tanker_count    | (obs - mean28) / std28      | 0d   | Z-score
  anomaly_flag               | corridor_anomalies       | anomaly_flag    | boolean from baseline       | 0d   | bool
  anomaly_type_drop          | corridor_anomalies       | anomaly_type    | indicator (TRAFFIC_DROP)    | 0d   | 0/1
  anomaly_type_congestion    | corridor_anomalies       | anomaly_type    | indicator (CONGESTION)      | 0d   | 0/1
  tanker_lag1d               | corridor_traffic_daily   | tanker_count    | lag 1 day                   | 1d   | Vessel count/day
  tanker_lag7d               | corridor_traffic_daily   | tanker_count    | lag 7 days                  | 7d   | Vessel count/day
  traffic_data_available     | corridor_anomalies       | data_availability| binary flag                | 0d   | 0/1

Missing-value policy:
  - NO_OBSERVATION gaps are NOT forward-filled. They remain NaN in all traffic features.
  - Rows with NO_OBSERVATION are excluded from model training (not imputed).
  - Rolling stats computed with min_periods to reflect data availability honestly.

Leakage prevention:
  - All rolling windows use only historical data (no look-ahead bias).
  - Lag features shift values backward by the specified number of days.
"""

import os
import pandas as pd
import numpy as np

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROCESSED_DIR = os.path.join(os.getenv("DATA_DIR", os.path.join(PROJECT_ROOT, "data")), "processed")


def build_maritime_features(
    date_index: pd.DatetimeIndex,
    corridor_id: str,
) -> pd.DataFrame:
    """
    Builds the full maritime traffic feature set for a given corridor.
    Returns a DataFrame indexed by date.

    Rows where data_availability == 'NO_OBSERVATION' are flagged via
    traffic_data_available=0 so the caller can exclude them from training.
    """
    traffic_path = os.path.join(PROCESSED_DIR, "corridor_traffic_daily.csv")
    anomaly_path = os.path.join(PROCESSED_DIR, "corridor_anomalies.csv")

    df_traffic = pd.read_csv(traffic_path)
    df_anomaly = pd.read_csv(anomaly_path)

    df_traffic["date"] = pd.to_datetime(df_traffic["date"])
    df_anomaly["date"] = pd.to_datetime(df_anomaly["date"])

    # Filter to target corridor
    traf = df_traffic[df_traffic["corridor_id"] == corridor_id].copy()
    anom = df_anomaly[df_anomaly["corridor_id"] == corridor_id].copy()

    # Reindex to full date range — gaps are NaN (NO_OBSERVATION)
    traf = traf.set_index("date").reindex(date_index)
    anom = anom.set_index("date").reindex(date_index)

    # Data availability flag: 1 = OBSERVED, 0 = NO_OBSERVATION
    traffic_data_available = (~traf["tanker_count"].isna()).astype(int)

    # Core raw features
    tanker = traf["tanker_count"]
    vessel = traf["vessel_count"]
    cargo = traf["cargo_count"]
    capacity_tanker = traf["capacity_tanker"]

    # Rolling statistics (no forward-fill: NaN gaps remain NaN in rolling)
    tanker_7d_ma = tanker.rolling(7, min_periods=3).mean()
    tanker_14d_ma = tanker.rolling(14, min_periods=5).mean()
    tanker_28d_ma = tanker.rolling(28, min_periods=14).mean()
    tanker_90d_ma = tanker.rolling(90, min_periods=30).mean()
    tanker_28d_median = tanker.rolling(28, min_periods=14).median()
    tanker_28d_std = tanker.rolling(28, min_periods=14).std()

    # Relative deviation from 28-day baseline (defined as percentage change from median)
    tanker_decline_ratio_28d = (tanker - tanker_28d_median) / tanker_28d_median.replace(0, np.nan)

    # Z-score from rolling mean/std
    tanker_zscore_28d = (tanker - tanker_28d_ma) / tanker_28d_std.replace(0, np.nan)

    # Lagged raw counts
    tanker_lag1d = tanker.shift(1)
    tanker_lag7d = tanker.shift(7)
    tanker_lag1d_chg = (tanker - tanker_lag1d) / tanker_lag1d.replace(0, np.nan)  # 1-day % change
    tanker_lag7d_chg = (tanker - tanker_lag7d) / tanker_lag7d.replace(0, np.nan)  # 7-day % change

    # Anomaly indicators from pre-computed baseline
    anomaly_flag = anom["anomaly_flag"].fillna(False).astype(int)
    anomaly_type_drop = (anom["anomaly_type"] == "TRAFFIC_DROP").astype(int)
    anomaly_type_congestion = (anom["anomaly_type"] == "CONGESTION").astype(int)

    result = pd.DataFrame({
        "date": date_index,
        "tanker_count": tanker.values,
        "vessel_count": vessel.values,
        "cargo_count": cargo.values,
        "capacity_tanker": capacity_tanker.values,
        "tanker_7d_ma": tanker_7d_ma.values,
        "tanker_14d_ma": tanker_14d_ma.values,
        "tanker_28d_ma": tanker_28d_ma.values,
        "tanker_90d_ma": tanker_90d_ma.values,
        "tanker_28d_std": tanker_28d_std.values,
        "tanker_decline_ratio_28d": tanker_decline_ratio_28d.values,
        "tanker_zscore_28d": tanker_zscore_28d.values,
        "tanker_lag1d": tanker_lag1d.values,
        "tanker_lag7d": tanker_lag7d.values,
        "tanker_lag1d_chg": tanker_lag1d_chg.values,
        "tanker_lag7d_chg": tanker_lag7d_chg.values,
        "anomaly_flag": anomaly_flag.values,
        "anomaly_type_drop": anomaly_type_drop.values,
        "anomaly_type_congestion": anomaly_type_congestion.values,
        "traffic_data_available": traffic_data_available.values,
    })

    return result
