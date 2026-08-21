import os
import pandas as pd
from typing import List, Dict, Any, Optional

DATA_DIR = os.getenv("DATA_DIR", r"D:\hackathon project\energy-resilience\data")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")


def get_traffic_observations(
    corridor_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 90,
) -> List[Dict[str, Any]]:
    """
    Retrieves PortWatch daily transit observations merged with anomaly flags for a corridor.
    Returns at most `limit` rows, sorted descending by date.
    Rows with NO_OBSERVATION are included but flagged explicitly.
    """
    traffic_path = os.path.join(PROCESSED_DIR, "corridor_traffic_daily.csv")
    anomaly_path = os.path.join(PROCESSED_DIR, "corridor_anomalies.csv")

    if not os.path.exists(traffic_path) or not os.path.exists(anomaly_path):
        return []

    df_t = pd.read_csv(traffic_path)
    df_a = pd.read_csv(anomaly_path)

    df_t["date"] = pd.to_datetime(df_t["date"])
    df_a["date"] = pd.to_datetime(df_a["date"])

    corridor_upper = corridor_id.upper()
    df_t = df_t[df_t["corridor_id"] == corridor_upper]
    df_a = df_a[df_a["corridor_id"] == corridor_upper]

    # Merge traffic + anomaly on date
    df = df_t.merge(
        df_a[["date", "anomaly_flag", "anomaly_type", "data_availability"]],
        on="date",
        how="left",
    )

    if start_date:
        df = df[df["date"] >= pd.Timestamp(start_date)]
    if end_date:
        df = df[df["date"] <= pd.Timestamp(end_date)]

    df = df.sort_values("date", ascending=False).head(limit)

    # Fill NaN for integer columns so Pydantic doesn't error
    for col in ["vessel_count", "tanker_count", "cargo_count"]:
        df[col] = df[col].fillna(0).astype(int)

    df["anomaly_flag"] = df["anomaly_flag"].fillna(False).astype(bool)
    df["anomaly_type"] = df["anomaly_type"].fillna("NORMAL")
    df["data_availability"] = df["data_availability"].fillna("NO_OBSERVATION")
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")

    records = df[
        ["date", "corridor_id", "vessel_count", "tanker_count",
         "cargo_count", "anomaly_flag", "anomaly_type", "data_availability"]
    ].to_dict(orient="records")

    return records


def get_latest_traffic_date(corridor_id: str) -> Optional[str]:
    """Returns the most recent OBSERVED date for a corridor, or None."""
    traffic_path = os.path.join(PROCESSED_DIR, "corridor_traffic_daily.csv")
    if not os.path.exists(traffic_path):
        return None
    df = pd.read_csv(traffic_path)
    df = df[df["corridor_id"] == corridor_id.upper()]
    if df.empty:
        return None
    return str(df["date"].max())
