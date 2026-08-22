"""
Red Sea Feature Builder — Phase 10

Constructs a daily feature matrix for the RED_SEA corridor from real data sources.

DATA SOURCES (all real, no fabrication):
  - geopolitical_daily_signals.csv : GPR signals + per-corridor event counts (1985–2026)
  - geopolitical_risk.csv (staging)  : Monthly country GPR indices (INDIA, RUSSIA, SAUDI, CHINA)
  - crude_prices.csv (staging)       : Daily Brent crude spot price (2021–2026)
  - geopolitical_monthly_signals.csv : Monthly red_sea_event_count, bab_el_mandeb_event_count

FEATURE LINEAGE:
  feature_name              | source                      | transformation            | lag
  gpr_daily                 | geopolitical_daily_signals  | GPRD column               | 0d
  gpr_act                   | geopolitical_daily_signals  | GPRD_ACT column           | 0d
  gpr_threat                | geopolitical_daily_signals  | GPRD_THREAT column        | 0d
  gpr_daily_7d_ma           | gpr_daily                   | rolling mean 7d           | 0d
  gpr_daily_28d_ma          | gpr_daily                   | rolling mean 28d          | 0d
  gpr_daily_28d_std         | gpr_daily                   | rolling std 28d           | 0d
  gpr_india_monthly         | geopolitical_risk.csv       | GPRC INDIA, 1m lag        | 1m
  gpr_russia_monthly        | geopolitical_risk.csv       | GPRC RUSSIA, 1m lag       | 1m
  gpr_saudi_monthly         | geopolitical_risk.csv       | GPRC SAUDI_ARABIA, 1m lag | 1m
  gpr_china_monthly         | geopolitical_risk.csv       | GPRC CHINA, 1m lag        | 1m
  corridor_events_1d        | geopolitical_daily_signals  | red_sea_event_count       | 0d
  corridor_events_7d        | corridor_events_1d          | rolling sum 7d            | 0d
  corridor_events_28d       | corridor_events_1d          | rolling sum 28d           | 0d
  bab_events_7d             | bab_el_mandeb_event_count   | rolling sum 7d            | 0d
  bab_events_28d            | bab_el_mandeb_event_count   | rolling sum 28d           | 0d
  brent_price               | crude_prices.csv            | raw forward-filled        | 0d
  brent_return_1d           | brent_price                 | log return 1d             | 0d
  brent_return_7d           | brent_price                 | log return 7d             | 0d
  brent_volatility_7d       | brent_price                 | rolling std of ret 7d     | 0d
  brent_volatility_28d      | brent_price                 | rolling std of ret 28d    | 0d
  brent_28d_ma              | brent_price                 | rolling mean 28d          | 0d
  brent_zscore_28d          | brent_price                 | (p - ma28) / std28        | 0d
  month_sin                 | calendar                    | sin(2π*month/12)          | n/a
  month_cos                 | calendar                    | cos(2π*month/12)          | n/a
  day_of_week               | calendar                    | dayofweek (0=Mon)         | n/a

DISRUPTION LABEL:
  is_disrupted = 1  if  red_sea_event_count > 0  OR  bab_el_mandeb_event_count > 0
  is_disrupted = 0  otherwise
  label_method = "EVENT_PRESENCE" (positive) or "NEGATIVE" (zero events)

RATIONALE:
  - No PortWatch maritime traffic exists for RED_SEA; we cannot use criterion A
    (traffic drop) from the main target_builder.
  - The geopolitical_daily_signals event counts are the only real, corroborated
    daily signal that something notable happened in the Red Sea corridor.
  - We explicitly document this limitation and include it in model metadata.

CHRONOLOGICAL SPLITS:
  Train:      1985-01-01 → 2025-09-30
  Validation: 2025-10-01 → 2026-03-31
  Test:       2026-04-01 → max available date

Missing-value policy:
  - GPR: forward-fill up to 3 days (weekend/holiday gaps)
  - Brent: forward-fill up to 3 days; before 2021-08-18 set to NaN (no data)
  - Event counts: 0 = no events observed (not missing — absence is informative)
  - Monthly GPR: applied with 1-month lag; forward-filled from last available value
"""

import os
import json
import pandas as pd
import numpy as np
import datetime

BASE_DIR = r"D:\hackathon project\energy-resilience"
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
STAGING_DIR = os.path.join(BASE_DIR, "data", "staging")
MANIFEST_DIR = os.path.join(BASE_DIR, "data", "manifests")

TRAIN_END       = "2025-09-30"
VALIDATION_END  = "2026-03-31"
WARMUP_DAYS     = 28

# Definitive ordered feature column list for RED_SEA model
REDSEA_FEATURE_COLS = [
    # GPR global signals
    "gpr_daily", "gpr_act", "gpr_threat",
    "gpr_daily_7d_ma", "gpr_daily_28d_ma", "gpr_daily_28d_std",
    # Monthly country GPR (1-month lag)
    "gpr_india_monthly", "gpr_russia_monthly", "gpr_saudi_monthly", "gpr_china_monthly",
    # Red Sea event counts (rolling)
    "corridor_events_1d", "corridor_events_7d", "corridor_events_28d",
    "bab_events_7d", "bab_events_28d",
    # Brent crude signals
    "brent_price", "brent_return_1d", "brent_return_7d",
    "brent_volatility_7d", "brent_volatility_28d",
    "brent_28d_ma", "brent_zscore_28d",
    # Calendar
    "month_sin", "month_cos", "day_of_week",
]


def _assign_split(date: pd.Timestamp) -> str:
    if date <= pd.Timestamp(TRAIN_END):
        return "train"
    elif date <= pd.Timestamp(VALIDATION_END):
        return "validation"
    else:
        return "test"


def _load_gpr_daily(date_index: pd.DatetimeIndex) -> pd.DataFrame:
    """
    Loads GPR signals from geopolitical_daily_signals.csv.
    This file has GPRD, GPRD_ACT, GPRD_THREAT as direct columns (already pivoted).
    Spans 1985–2026 so it fully covers the Red Sea model date range.
    """
    path = os.path.join(PROCESSED_DIR, "geopolitical_daily_signals.csv")
    df = pd.read_csv(path, parse_dates=["date"])
    df = df.set_index("date")

    # GPR signals
    gpr_daily  = df["GPRD"].reindex(date_index).ffill(limit=3)
    gpr_act    = df["GPRD_ACT"].reindex(date_index).ffill(limit=3)
    gpr_threat = df["GPRD_THREAT"].reindex(date_index).ffill(limit=3)

    # Rolling aggregates (on the forward-filled series)
    gpr_7d_ma   = gpr_daily.rolling(7, min_periods=3).mean()
    gpr_28d_ma  = gpr_daily.rolling(28, min_periods=14).mean()
    gpr_28d_std = gpr_daily.rolling(28, min_periods=14).std()

    return pd.DataFrame({
        "date": date_index,
        "gpr_daily":       gpr_daily.values,
        "gpr_act":         gpr_act.values,
        "gpr_threat":      gpr_threat.values,
        "gpr_daily_7d_ma": gpr_7d_ma.values,
        "gpr_daily_28d_ma":gpr_28d_ma.values,
        "gpr_daily_28d_std":gpr_28d_std.values,
    })


def _load_redsea_event_counts(date_index: pd.DatetimeIndex) -> pd.DataFrame:
    """
    Loads daily Red Sea and Bab-el-Mandeb event counts from geopolitical_daily_signals.csv.
    These pre-computed counts are the ground truth for Red Sea geopolitical activity.
    """
    path = os.path.join(PROCESSED_DIR, "geopolitical_daily_signals.csv")
    df = pd.read_csv(path, parse_dates=["date"])
    df = df.set_index("date")

    rs_daily  = df["red_sea_event_count"].reindex(date_index, fill_value=0)
    bab_daily = df["bab_el_mandeb_event_count"].reindex(date_index, fill_value=0)

    # Rolling sums — missing days = 0 (no events, not missing data)
    rs_7d  = rs_daily.rolling(7, min_periods=1).sum()
    rs_28d = rs_daily.rolling(28, min_periods=1).sum()
    bab_7d = bab_daily.rolling(7, min_periods=1).sum()
    bab_28d = bab_daily.rolling(28, min_periods=1).sum()

    return pd.DataFrame({
        "date":               date_index,
        "corridor_events_1d": rs_daily.values.astype(float),
        "corridor_events_7d": rs_7d.values,
        "corridor_events_28d":rs_28d.values,
        "bab_events_7d":      bab_7d.values,
        "bab_events_28d":     bab_28d.values,
    })


def _load_monthly_gpr_lagged(date_index: pd.DatetimeIndex) -> pd.DataFrame:
    """
    Loads monthly country-specific GPR (GPRC) from geopolitical_risk.csv (staging).
    Applies a 1-month lag to prevent target leakage. If staging file not accessible,
    gracefully returns NaN columns (documented limitation).
    """
    path = os.path.join(STAGING_DIR, "geopolitical_risk.csv")
    cols = ["gpr_india_monthly", "gpr_russia_monthly", "gpr_saudi_monthly", "gpr_china_monthly"]

    if not os.path.exists(path):
        df_out = pd.DataFrame({"date": date_index})
        for c in cols:
            df_out[c] = np.nan
        return df_out

    df = pd.read_csv(path, parse_dates=["date"])
    country_monthly = df[
        (df["metric"] == "GPRC") &
        (df["geography"].isin(["INDIA", "RUSSIA", "SAUDI_ARABIA", "CHINA"]))
    ].copy()

    country_monthly["month_start"] = country_monthly["date"].dt.to_period("M").dt.to_timestamp()

    pivoted = country_monthly.pivot_table(
        index="month_start", columns="geography", values="value", aggfunc="first"
    )
    pivoted.columns.name = None
    pivoted = pivoted.rename(columns={
        "INDIA":         "gpr_india_monthly",
        "RUSSIA":        "gpr_russia_monthly",
        "SAUDI_ARABIA":  "gpr_saudi_monthly",
        "CHINA":         "gpr_china_monthly",
    })

    # Apply 1-month lag: month M data available from month M+1 onwards
    pivoted.index = pivoted.index + pd.DateOffset(months=1)

    df_out = pd.DataFrame({"date": date_index})
    for col in cols:
        if col in pivoted.columns:
            # Broadcast: for each daily date, find the latest available monthly index
            s = pivoted[col].sort_index()
            df_out[col] = df_out["date"].apply(
                lambda d: s[s.index <= d].iloc[-1] if (s.index <= d).any() else np.nan
            )
        else:
            df_out[col] = np.nan

    return df_out


def _load_brent_features(date_index: pd.DatetimeIndex) -> pd.DataFrame:
    """
    Loads Brent crude daily price from staging/crude_prices.csv.
    Dates before data availability (pre-2021) will have NaN — documented limitation.
    """
    path = os.path.join(STAGING_DIR, "crude_prices.csv")
    if not os.path.exists(path):
        df_out = pd.DataFrame({"date": date_index})
        for col in ["brent_price","brent_return_1d","brent_return_7d",
                    "brent_volatility_7d","brent_volatility_28d",
                    "brent_28d_ma","brent_zscore_28d"]:
            df_out[col] = np.nan
        return df_out

    df = pd.read_csv(path, parse_dates=["date"])
    price = df.set_index("date")["value"].reindex(date_index)
    price_ff = price.ffill(limit=3)

    log_p    = np.log(price_ff.replace(0, np.nan))
    ret_1d   = log_p.diff(1)
    ret_7d   = log_p.diff(7)
    vol_7d   = ret_1d.rolling(7, min_periods=3).std()
    vol_28d  = ret_1d.rolling(28, min_periods=14).std()
    ma_28d   = price_ff.rolling(28, min_periods=14).mean()
    std_28d  = price_ff.rolling(28, min_periods=14).std()
    zscore   = (price_ff - ma_28d) / std_28d.replace(0, np.nan)

    return pd.DataFrame({
        "date":               date_index,
        "brent_price":        price_ff.values,
        "brent_return_1d":    ret_1d.values,
        "brent_return_7d":    ret_7d.values,
        "brent_volatility_7d":vol_7d.values,
        "brent_volatility_28d":vol_28d.values,
        "brent_28d_ma":       ma_28d.values,
        "brent_zscore_28d":   zscore.values,
    })


def _build_calendar(date_index: pd.DatetimeIndex) -> pd.DataFrame:
    months = pd.Series(date_index).dt.month
    return pd.DataFrame({
        "date":        date_index,
        "month_sin":   np.sin(2 * np.pi * months / 12).values,
        "month_cos":   np.cos(2 * np.pi * months / 12).values,
        "day_of_week": pd.Series(date_index).dt.dayofweek.values,
    })


def _build_disruption_label(df: pd.DataFrame) -> pd.DataFrame:
    """
    Constructs is_disrupted using real event count signals only.
    Positive = any Red Sea or Bab-el-Mandeb event recorded on that day.
    No fabrication, no random assignment, no future leakage.
    """
    positive_mask = (df["corridor_events_1d"] > 0) | (df.get("bab_events_7d", pd.Series(0, index=df.index)) > 0)
    # Use 1d raw counts for the label (not rolling — rolling is only for features)
    event_1d = df["corridor_events_1d"].fillna(0)
    bab_1d_path = os.path.join(PROCESSED_DIR, "geopolitical_daily_signals.csv")
    try:
        bab_raw = pd.read_csv(bab_1d_path, parse_dates=["date"])
        bab_raw = bab_raw.set_index("date")["bab_el_mandeb_event_count"].reindex(
            pd.to_datetime(df["date"]), fill_value=0
        ).values
    except Exception:
        bab_raw = np.zeros(len(df))

    is_disrupted = ((event_1d.values > 0) | (bab_raw > 0)).astype(float)
    label_method = np.where(is_disrupted == 1, "EVENT_PRESENCE", "NEGATIVE")

    df = df.copy()
    df["is_disrupted"] = is_disrupted
    df["label_method"] = label_method
    return df


def build_redsea_features() -> pd.DataFrame:
    """
    Builds the full daily feature matrix for RED_SEA and writes:
      data/processed/redsea_features.csv

    Returns the full DataFrame.
    """
    print("=" * 72)
    print("Phase 10 — Red Sea Feature Builder")
    print("=" * 72)

    # Date range: earliest GPR data (1985) to most recent processed date
    gpr_path = os.path.join(PROCESSED_DIR, "geopolitical_daily_signals.csv")
    df_gpr_check = pd.read_csv(gpr_path, parse_dates=["date"])
    start_date = df_gpr_check["date"].min()
    end_date   = df_gpr_check["date"].max()

    print(f"  Date range: {start_date.date()} → {end_date.date()}")

    date_index = pd.date_range(start=start_date, end=end_date, freq="D")
    print(f"  Total days in index: {len(date_index):,}")

    # Build each feature block
    print("  Loading GPR daily signals...")
    df_gpr = _load_gpr_daily(date_index)

    print("  Loading Red Sea event counts...")
    df_events = _load_redsea_event_counts(date_index)

    print("  Loading monthly country GPR (with 1-month lag)...")
    df_monthly_gpr = _load_monthly_gpr_lagged(date_index)

    print("  Loading Brent price features...")
    df_brent = _load_brent_features(date_index)

    print("  Building calendar features...")
    df_cal = _build_calendar(date_index)

    # Merge all blocks on date
    df = df_gpr.merge(df_events, on="date", how="left")
    df = df.merge(df_monthly_gpr, on="date", how="left")
    df = df.merge(df_brent, on="date", how="left")
    df = df.merge(df_cal, on="date", how="left")

    # Disruption label
    df = _build_disruption_label(df)

    # Assign corridor and split
    df["corridor_id"] = "RED_SEA"
    df["split"] = df["date"].apply(_assign_split)

    # Remove warmup period (first 28 days)
    df = df[df["date"] >= (start_date + pd.Timedelta(days=WARMUP_DAYS))].copy()
    df = df.reset_index(drop=True)

    # Summary
    for split_name in ["train", "validation", "test"]:
        s = df[df["split"] == split_name]
        pos = int((s["is_disrupted"] == 1).sum())
        neg = int((s["is_disrupted"] == 0).sum())
        print(f"  [{split_name:>10}] {len(s):5,} rows | {pos} positive ({pos/(pos+neg)*100:.2f}%)")

    # Output
    out_path = os.path.join(PROCESSED_DIR, "redsea_features.csv")
    df.to_csv(out_path, index=False)
    print(f"\n  ✓ Written: {out_path} ({len(df):,} rows)")

    # Write quality manifest
    quality = {
        "corridor_id": "RED_SEA",
        "feature_version": "1.0",
        "total_rows": len(df),
        "date_range": [str(df["date"].min().date()), str(df["date"].max().date())],
        "feature_cols": REDSEA_FEATURE_COLS,
        "feature_count": len(REDSEA_FEATURE_COLS),
        "label_method": "EVENT_PRESENCE_OR_NEGATIVE",
        "disruption_label_source": "geopolitical_daily_signals.red_sea_event_count + bab_el_mandeb_event_count",
        "maritime_features": "EXCLUDED — PortWatch has no RED_SEA observations",
        "brent_availability": "2021-08-18 onwards (NaN for earlier dates — NOT imputed with fabricated values)",
        "split_counts": {
            split: {
                "rows": int((df["split"] == split).sum()),
                "positive": int(((df["split"] == split) & (df["is_disrupted"] == 1)).sum()),
            }
            for split in ["train", "validation", "test"]
        },
        "missing_pct": {
            col: round(float(df[col].isna().mean() * 100), 2)
            for col in REDSEA_FEATURE_COLS
        },
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    os.makedirs(os.path.join(BASE_DIR, "data", "quality"), exist_ok=True)
    quality_path = os.path.join(BASE_DIR, "data", "quality", "redsea_features_quality.json")
    with open(quality_path, "w") as f:
        json.dump(quality, f, indent=2)
    print(f"  ✓ Quality manifest: {quality_path}")

    return df


if __name__ == "__main__":
    build_redsea_features()
