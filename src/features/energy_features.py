"""
Energy & Market Feature Engineering — Phase 4

Extracts Brent crude price signals and lagged PPAC monthly supply-chain
indicators (refinery throughput, petroleum consumption, crude imports).

Feature lineage:
  feature_name              | source_dataset           | source_column    | transformation               | lag     | unit
  brent_price               | crude_prices             | value            | raw forward-filled            | 0d      | USD/bbl
  brent_return_1d           | crude_prices             | value            | log return (1d)               | 0d      | Ratio
  brent_return_7d           | crude_prices             | value            | log return (7d)               | 0d      | Ratio
  brent_volatility_7d       | crude_prices             | value            | rolling std of returns (7d)   | 0d      | Ratio
  brent_volatility_28d      | crude_prices             | value            | rolling std of returns (28d)  | 0d      | Ratio
  brent_28d_ma              | crude_prices             | value            | rolling mean (28d)            | 0d      | USD/bbl
  brent_zscore_28d          | crude_prices             | value            | (price - mean28) / std28      | 0d      | Z-score
  brent_lag7d               | crude_prices             | value            | lag 7 days                    | 7d      | USD/bbl
  brent_lag28d              | crude_prices             | value            | lag 28 days                   | 28d     | USD/bbl
  refinery_throughput_tmt   | refinery_throughput      | quantity_tmt     | monthly grand total, 1m lag   | 1m+1d   | TMT
  refinery_mom_change       | refinery_throughput      | quantity_tmt     | month-on-month % change       | 1m+1d   | Ratio
  consumption_total_tmt     | petroleum_consumption    | quantity_tmt     | monthly sum all products, 1m lag | 1m+1d | TMT
  consumption_mom_change    | petroleum_consumption    | quantity_tmt     | month-on-month % change       | 1m+1d   | Ratio
  crude_import_tmt          | crude_imports            | quantity_tmt     | monthly CRUDE OIL IMPORT, 1m lag | 1m+1d | TMT
  crude_import_mom_change   | crude_imports            | quantity_tmt     | month-on-month % change       | 1m+1d   | Ratio
  month_sin                 | calendar                 | month            | sin(2π * month / 12)          | n/a     | Cyclical
  month_cos                 | calendar                 | month            | cos(2π * month / 12)          | n/a     | Cyclical
  day_of_week               | calendar                 | date             | day of week (0=Mon)           | n/a     | Ordinal

Missing-value policy:
  - Brent price NaN (market closures): forward-filled up to 3 days, then left as NaN.
  - Monthly PPAC features: if the lagged month has no data, left as NaN (not imputed).
  - NaN features propagated transparently; model training excludes rows with NaN targets.

Leakage prevention:
  - Monthly PPAC data applied with a minimum 1-month lag.
  - Grand-total refinery rows (record_type == 'grand_total') used to avoid double-counting.
  - Brent returns computed only using past data (no centering on future values).
"""

import os
import pandas as pd
import numpy as np

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STAGING_DIR = os.path.join(os.getenv("DATA_DIR", os.path.join(PROJECT_ROOT, "data")), "staging")


def build_energy_features(date_index: pd.DatetimeIndex) -> pd.DataFrame:
    """
    Builds the full energy and market feature set for all corridor dates.
    Returns a single DataFrame indexed by date (corridor-agnostic: same
    Brent/PPAC signals broadcast to each corridor row in the feature pipeline).
    """
    df_brent = _build_brent_features(date_index)
    df_ppac = _build_ppac_features(date_index)
    df_calendar = _build_calendar_features(date_index)

    df = df_brent.merge(df_ppac, on="date", how="left")
    df = df.merge(df_calendar, on="date", how="left")
    return df


def _build_brent_features(date_index: pd.DatetimeIndex) -> pd.DataFrame:
    prices_path = os.path.join(STAGING_DIR, "crude_prices.csv")
    df = pd.read_csv(prices_path)
    df["date"] = pd.to_datetime(df["date"])
    price = df.set_index("date")["value"].reindex(date_index)

    # Forward-fill up to 3 days (weekend/holiday closure)
    price_ffill = price.ffill(limit=3)

    # Log returns
    log_price = np.log(price_ffill)
    ret_1d = log_price.diff(1)
    ret_7d = log_price.diff(7)

    # Volatility (rolling std of daily returns)
    vol_7d = ret_1d.rolling(7, min_periods=3).std()
    vol_28d = ret_1d.rolling(28, min_periods=14).std()

    # Rolling mean/z-score
    ma_28d = price_ffill.rolling(28, min_periods=14).mean()
    std_28d = price_ffill.rolling(28, min_periods=14).std()
    zscore_28d = (price_ffill - ma_28d) / std_28d.replace(0, np.nan)

    # Lagged price levels
    lag_7d = price_ffill.shift(7)
    lag_28d = price_ffill.shift(28)

    return pd.DataFrame({
        "date": date_index,
        "brent_price": price_ffill.values,
        "brent_return_1d": ret_1d.values,
        "brent_return_7d": ret_7d.values,
        "brent_volatility_7d": vol_7d.values,
        "brent_volatility_28d": vol_28d.values,
        "brent_28d_ma": ma_28d.values,
        "brent_zscore_28d": zscore_28d.values,
        "brent_lag7d": lag_7d.values,
        "brent_lag28d": lag_28d.values,
    })


def _build_ppac_features(date_index: pd.DatetimeIndex) -> pd.DataFrame:
    """
    Builds lagged monthly PPAC supply-chain features, applying a 1-month lag.
    Uses grand_total rows for refinery throughput to prevent double-counting.
    """
    # — Refinery throughput: grand_total only —
    ref_path = os.path.join(STAGING_DIR, "refinery_throughput.csv")
    df_ref = pd.read_csv(ref_path)
    df_ref["date"] = pd.to_datetime(df_ref["date"])
    ref_monthly = (
        df_ref[df_ref["record_type"] == "grand_total"]
        .groupby("date")["quantity_tmt"].sum()
        .sort_index()
    )
    ref_mom_chg = ref_monthly.pct_change()

    # — Petroleum consumption: all products total —
    con_path = os.path.join(STAGING_DIR, "petroleum_consumption.csv")
    df_con = pd.read_csv(con_path)
    df_con["date"] = pd.to_datetime(df_con["date"])
    con_monthly = (
        df_con.groupby("date")["quantity_tmt"].sum().sort_index()
    )
    con_mom_chg = con_monthly.pct_change()

    # — Crude imports: CRUDE OIL IMPORT only —
    imp_path = os.path.join(STAGING_DIR, "crude_imports.csv")
    df_imp = pd.read_csv(imp_path)
    df_imp["date"] = pd.to_datetime(df_imp["date"])
    crude_imp_monthly = (
        df_imp[
            (df_imp["product"].str.upper().str.startswith("CRUDE OIL")) &
            (df_imp["flow_type"] == "IMPORT")
        ]
        .groupby("date")["quantity_tmt"].sum()
        .sort_index()
    )
    crude_imp_mom_chg = crude_imp_monthly.pct_change()

    # Broadcast to daily with 1-month lag
    df_daily = pd.DataFrame({"date": date_index})
    df_daily["date"] = pd.to_datetime(df_daily["date"])
    df_daily["_month_start"] = df_daily["date"].dt.to_period("M").dt.to_timestamp()

    def lag_monthly(series: pd.Series, months: int = 1) -> pd.Series:
        """Shift a monthly series by `months` so it's available 1 month later."""
        shifted = series.copy()
        shifted.index = shifted.index + pd.DateOffset(months=months)
        # Align to month-start in the daily frame
        return df_daily["_month_start"].map(
            shifted.to_dict()
        )

    df_daily["refinery_throughput_tmt"] = lag_monthly(ref_monthly)
    df_daily["refinery_mom_change"] = lag_monthly(ref_mom_chg)
    df_daily["consumption_total_tmt"] = lag_monthly(con_monthly)
    df_daily["consumption_mom_change"] = lag_monthly(con_mom_chg)
    df_daily["crude_import_tmt"] = lag_monthly(crude_imp_monthly)
    df_daily["crude_import_mom_change"] = lag_monthly(crude_imp_mom_chg)

    df_daily = df_daily.drop(columns=["_month_start"])
    return df_daily


def _build_calendar_features(date_index: pd.DatetimeIndex) -> pd.DataFrame:
    months = pd.Series(date_index).dt.month
    return pd.DataFrame({
        "date": date_index,
        "month_sin": np.sin(2 * np.pi * months / 12).values,
        "month_cos": np.cos(2 * np.pi * months / 12).values,
        "day_of_week": pd.Series(date_index).dt.dayofweek.values,
    })
