import os
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional

DATA_DIR = os.getenv("DATA_DIR", r"D:\hackathon project\energy-resilience\data")
STAGING_DIR = os.path.join(DATA_DIR, "staging")


def get_brent_prices(limit: int = 90) -> Dict[str, Any]:
    """
    Loads crude_prices.csv from staging, computes daily returns and volatility,
    and returns a BrentPriceResponse dictionary structure.
    """
    prices_path = os.path.join(STAGING_DIR, "crude_prices.csv")
    if not os.path.exists(prices_path):
        raise FileNotFoundError(f"Staged Brent crude prices file not found at: {prices_path}")

    df = pd.read_csv(prices_path)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    # Clean NaNs by forward filling up to 3 days (matching energy_features.py)
    df["clean_value"] = df["value"].ffill(limit=3)

    # Compute daily return (log return 1d)
    df["log_price"] = np.log(df["clean_value"])
    df["daily_return"] = df["log_price"].diff(1)

    # Compute Volatility (rolling std of returns)
    df["volatility_7d"] = df["daily_return"].rolling(7, min_periods=3).std()
    df["volatility_28d"] = df["daily_return"].rolling(28, min_periods=14).std()

    if df.empty:
        raise ValueError("The Brent crude prices dataset is empty.")

    # Get latest row
    latest_row = df.iloc[-1]
    latest_price = float(latest_row["clean_value"])
    latest_date = latest_row["date"].strftime("%Y-%m-%d")
    daily_return = latest_row["daily_return"]
    if pd.isna(daily_return):
        daily_return = None
    else:
        daily_return = float(daily_return)

    vol_7d = latest_row["volatility_7d"]
    vol_28d = latest_row["volatility_28d"]
    vol_7d = float(vol_7d) if not pd.isna(vol_7d) else None
    vol_28d = float(vol_28d) if not pd.isna(vol_28d) else None

    # Retrieve source metadata (use first row or metadata if source is constant)
    source = str(latest_row.get("source", "Federal Reserve Bank of St. Louis (FRED)"))
    data_freshness = latest_date

    # Build history list, returning up to `limit` rows (most recent first)
    history_df = df.tail(limit).sort_values("date", ascending=False)
    historical_prices = []
    for _, r in history_df.iterrows():
        ret = r["daily_return"]
        historical_prices.append({
            "date": r["date"].strftime("%Y-%m-%d"),
            "price": float(r["clean_value"]),
            "daily_return": float(ret) if not pd.isna(ret) else None
        })

    return {
        "latest_price": latest_price,
        "latest_date": latest_date,
        "daily_return": daily_return,
        "volatility_7d": vol_7d,
        "volatility_28d": vol_28d,
        "data_freshness": data_freshness,
        "source": source,
        "historical_prices": historical_prices
    }
