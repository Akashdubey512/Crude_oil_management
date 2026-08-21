"""
Geopolitical Feature Engineering — Phase 4

Extracts and transforms GPR index signals and corridor-mapped
geopolitical/sanctions event counts into daily corridor-level features.

Feature lineage:
  feature_name             | source_dataset       | source_column   | transformation          | lag  | unit
  gpr_daily                | geopolitical_risk    | value           | pivot (GPRD metric)     | 0d   | Index
  gpr_act                  | geopolitical_risk    | value           | pivot (GPRD_ACT)        | 0d   | Index
  gpr_threat               | geopolitical_risk    | value           | pivot (GPRD_THREAT)     | 0d   | Index
  gpr_india_monthly        | geopolitical_risk    | value           | pivot (GPRC, INDIA)     | 1m   | Index
  gpr_russia_monthly       | geopolitical_risk    | value           | pivot (GPRC, RUSSIA)    | 1m   | Index
  gpr_saudi_monthly        | geopolitical_risk    | value           | pivot (GPRC, SAUDI)     | 1m   | Index
  corridor_events_7d       | geopolitical_events  | corridor        | rolling count (7d)      | 0d   | Count
  corridor_events_28d      | geopolitical_events  | corridor        | rolling count (28d)     | 0d   | Count
  corridor_sanctions_28d   | geopolitical_events  | event_type      | rolling count (28d)     | 0d   | Count
  corridor_disruption_28d  | geopolitical_events  | event_type      | rolling count (28d)     | 0d   | Count
  global_events_7d         | geopolitical_events  | *               | rolling count (7d)      | 0d   | Count
  gpr_daily_7d_ma          | geopolitical_risk    | GPRD            | rolling mean (7d)       | 0d   | Index
  gpr_daily_28d_ma         | geopolitical_risk    | GPRD            | rolling mean (28d)      | 0d   | Index

Missing-value policy:
  - GPR index gaps forward-filled max 3 days (market closure pattern); longer gaps left as NaN.
  - Event count gaps treated as 0 observations (absence of event, not missing data).
  - Monthly GPR indices broadcast to daily with 1-month lag to prevent target leakage.

Leakage prevention:
  - All features computed from data available strictly BEFORE the prediction date.
  - Monthly indices applied with 1-month backward shift (e.g. Jan features use Dec data).
"""

import os
import pandas as pd
import numpy as np

STAGING_DIR = r"D:\hackathon project\energy-resilience\data\staging"
PROCESSED_DIR = r"D:\hackathon project\energy-resilience\data\processed"

DISRUPTION_EVENT_TYPES = {
    "tanker attack", "maritime security incident", "pipeline disruption",
    "refinery disruption", "infrastructure attack", "armed conflict",
    "military escalation", "export restriction", "port disruption",
    "shipping disruption", "supply disruption",
}


def load_daily_gpr(date_index: pd.DatetimeIndex) -> pd.DataFrame:
    """
    Loads daily Caldara-Iacoviello GPR index (GPRD, GPRD_ACT, GPRD_THREAT) for GLOBAL.
    Forward-fills up to 3 days for market closures/weekends.
    Reindexed to provided date_index for alignment.
    """
    gpr_path = os.path.join(STAGING_DIR, "geopolitical_risk.csv")
    df = pd.read_csv(gpr_path)
    df["date"] = pd.to_datetime(df["date"])

    # Select daily global metrics only
    daily_global = df[
        (df["geography"] == "GLOBAL") &
        (df["metric"].isin(["GPRD", "GPRD_ACT", "GPRD_THREAT"]))
    ].copy()

    pivoted = daily_global.pivot_table(
        index="date", columns="metric", values="value", aggfunc="first"
    ).reset_index()
    pivoted.columns.name = None
    pivoted = pivoted.rename(columns={
        "GPRD": "gpr_daily",
        "GPRD_ACT": "gpr_act",
        "GPRD_THREAT": "gpr_threat",
    })

    # Reindex to fill ALL dates; forward-fill up to 3 days
    pivoted = pivoted.set_index("date").reindex(date_index)
    pivoted = pivoted.ffill(limit=3)

    # Rolling statistics
    pivoted["gpr_daily_7d_ma"] = pivoted["gpr_daily"].rolling(7, min_periods=3).mean()
    pivoted["gpr_daily_28d_ma"] = pivoted["gpr_daily"].rolling(28, min_periods=14).mean()
    pivoted["gpr_daily_28d_std"] = pivoted["gpr_daily"].rolling(28, min_periods=14).std()

    pivoted = pivoted.reset_index().rename(columns={"index": "date"})
    return pivoted


def load_monthly_gpr_lagged(date_index: pd.DatetimeIndex) -> pd.DataFrame:
    """
    Loads monthly country-specific GPR (GPRC metric) for INDIA, RUSSIA, SAUDI_ARABIA.
    Applies a 1-MONTH lag to prevent future leakage: the monthly value for month M
    is only visible on dates >= first day of month M+1.
    """
    gpr_path = os.path.join(STAGING_DIR, "geopolitical_risk.csv")
    df = pd.read_csv(gpr_path)
    df["date"] = pd.to_datetime(df["date"])

    country_monthly = df[
        (df["metric"] == "GPRC") &
        (df["geography"].isin(["INDIA", "RUSSIA", "SAUDI_ARABIA", "CHINA"]))
    ].copy()

    # Normalize to month start
    country_monthly["month_start"] = country_monthly["date"].dt.to_period("M").dt.to_timestamp()

    pivoted = country_monthly.pivot_table(
        index="month_start", columns="geography", values="value", aggfunc="first"
    ).reset_index()
    pivoted.columns.name = None
    pivoted = pivoted.rename(columns={
        "INDIA": "gpr_india_monthly",
        "RUSSIA": "gpr_russia_monthly",
        "SAUDI_ARABIA": "gpr_saudi_monthly",
        "CHINA": "gpr_china_monthly",
    })

    # Shift 1 month forward (lag): month M data available from month M+1 onwards
    pivoted["month_start"] = pivoted["month_start"] + pd.DateOffset(months=1)
    pivoted = pivoted.set_index("month_start")

    # Broadcast monthly values to daily dates
    df_daily = pd.DataFrame(index=date_index)
    for col in ["gpr_india_monthly", "gpr_russia_monthly", "gpr_saudi_monthly", "gpr_china_monthly"]:
        if col in pivoted.columns:
            df_daily[col] = df_daily.index.to_series().apply(
                lambda d: pivoted[col].get(
                    pivoted.index[pivoted.index <= d].max() if (pivoted.index <= d).any() else pd.NaT
                ) if not pd.isna(
                    pivoted.index[pivoted.index <= d].max() if (pivoted.index <= d).any() else pd.NaT
                ) else np.nan
            )

    df_daily = df_daily.reset_index().rename(columns={"index": "date"})
    return df_daily


def load_corridor_event_features(
    date_index: pd.DatetimeIndex,
    corridor_id: str,
) -> pd.DataFrame:
    """
    Loads geopolitical event counts for a specific corridor over rolling windows.
    Events are filtered by the corridor column. Disruption event types are counted separately.
    Missing event counts are treated as 0 (no events observed), NOT as missing data.
    """
    events_path = os.path.join(PROCESSED_DIR, "geopolitical_events.csv")
    df = pd.read_csv(events_path)
    df["event_date"] = pd.to_datetime(df["event_date"])

    # All corridor-linked events (corridor column must match)
    corridor_events = df[df["corridor"] == corridor_id].copy()
    disruption_events = corridor_events[
        corridor_events["event_type"].isin(DISRUPTION_EVENT_TYPES)
    ].copy()
    sanctions_events = corridor_events[
        corridor_events["event_type"] == "sanctions"
    ].copy()

    # Build daily event series over full date range
    full_date_df = pd.DataFrame({"date": date_index})

    def daily_counts(subset_df, date_col="event_date"):
        if subset_df.empty:
            return pd.Series(0, index=date_index, dtype=int)
        counts = subset_df.groupby(date_col).size()
        counts.index = pd.to_datetime(counts.index)
        return counts.reindex(date_index, fill_value=0)

    corridor_daily = daily_counts(corridor_events)
    disruption_daily = daily_counts(disruption_events)
    sanctions_daily = daily_counts(sanctions_events)

    # Global event counts (all corridors)
    global_daily = daily_counts(df)

    result = pd.DataFrame({
        "date": date_index,
        "corridor_events_1d": corridor_daily.values,
        "corridor_events_7d": corridor_daily.rolling(7, min_periods=1).sum().values,
        "corridor_events_28d": corridor_daily.rolling(28, min_periods=1).sum().values,
        "corridor_disruption_28d": disruption_daily.rolling(28, min_periods=1).sum().values,
        "corridor_sanctions_28d": sanctions_daily.rolling(28, min_periods=1).sum().values,
        "global_events_7d": global_daily.rolling(7, min_periods=1).sum().values,
        "global_events_28d": global_daily.rolling(28, min_periods=1).sum().values,
    })

    return result


def build_geopolitical_features(
    date_index: pd.DatetimeIndex,
    corridor_id: str,
) -> pd.DataFrame:
    """
    Builds the full geopolitical feature set for a given corridor over the date_index.
    Returns a DataFrame indexed by date with all geopolitical signal columns.
    """
    df_gpr_daily = load_daily_gpr(date_index)
    df_gpr_monthly = load_monthly_gpr_lagged(date_index)
    df_events = load_corridor_event_features(date_index, corridor_id)

    # Merge all on date
    df = df_gpr_daily.merge(df_gpr_monthly, on="date", how="left")
    df = df.merge(df_events, on="date", how="left")
    df["corridor_id"] = corridor_id

    return df
