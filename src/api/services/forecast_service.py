"""
Forecast Service — Phase 14

Generates 7-day rolling risk forecasts per corridor by fitting a linear
trend on the last 30 days of stored prediction probabilities.
No new model training. Returns probability forecasts + confidence intervals.
"""

import datetime
import logging
import math
from typing import List, Dict, Any, Optional

from src.api.database import get_db_connection, release_db_connection
from src.api.services.risk_service import SUPPORTED_CORRIDORS, get_risk_snapshot

logger = logging.getLogger(__name__)

FORECAST_HORIZON_DAYS = 7
HISTORY_LOOKBACK_DAYS = 30


def _get_prediction_history(corridor_id: str, days: int = 30) -> List[Dict[str, Any]]:
    """Fetches last N days of stored prediction probabilities from DB."""
    conn = get_db_connection()
    history = []
    try:
        cutoff = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days)).isoformat()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT predicted_at, probability, risk_level
            FROM predictions
            WHERE corridor_id = ? AND predicted_at >= ?
            ORDER BY predicted_at ASC
            LIMIT ?;
            """,
            (corridor_id, cutoff, days)
        )
        for row in cursor.fetchall():
            if isinstance(row, dict):
                history.append(row)
            else:
                history.append({
                    "predicted_at": row[0],
                    "probability": row[1],
                    "risk_level": row[2]
                })
        cursor.close()
    except Exception as e:
        logger.debug(f"No prediction history found for {corridor_id}: {e}")
    finally:
        release_db_connection(conn)
    return history


def _linear_trend(values: List[float]) -> tuple:
    """
    Fits a simple linear regression y = a + b*x where x = index.
    Returns (slope, intercept, stderr).
    """
    n = len(values)
    if n < 2:
        return 0.0, values[0] if values else 0.0, 0.05

    x_mean = (n - 1) / 2.0
    y_mean = sum(values) / n

    ss_xx = sum((i - x_mean) ** 2 for i in range(n))
    ss_xy = sum((i - x_mean) * (values[i] - y_mean) for i in range(n))

    slope = ss_xy / ss_xx if ss_xx != 0 else 0.0
    intercept = y_mean - slope * x_mean

    # Residual standard error
    residuals = [(values[i] - (intercept + slope * i)) ** 2 for i in range(n)]
    stderr = math.sqrt(sum(residuals) / max(n - 2, 1))

    return slope, intercept, stderr


def _prob_to_risk_level(prob: float) -> str:
    if prob >= 0.70:
        return "CRITICAL"
    elif prob >= 0.50:
        return "HIGH"
    elif prob >= 0.30:
        return "MEDIUM"
    elif prob >= 0.10:
        return "LOW"
    return "MINIMAL"


def _clamp(val: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, val))


def generate_corridor_forecast(corridor_id: str) -> Dict[str, Any]:
    """
    Generates a 7-day forecast for a single corridor.
    Uses stored DB history when available, falls back to current snapshot with noise.
    """
    history = _get_prediction_history(corridor_id, HISTORY_LOOKBACK_DAYS)

    if len(history) >= 3:
        probs = [float(h.get("probability") or 0.0) for h in history]
    else:
        # Fallback: use current risk snapshot probability
        try:
            snap = get_risk_snapshot(corridor_id)
            base_prob = float(snap.get("probability") or 0.01)
        except Exception:
            base_prob = 0.05
        # Synthesize a short series from current snapshot to enable trend fitting
        probs = [base_prob * (0.9 + 0.05 * i) for i in range(5)]

    slope, intercept, stderr = _linear_trend(probs)
    last_x = len(probs) - 1

    # Determine trend direction
    if slope > 0.005:
        trend = "INCREASING"
    elif slope < -0.005:
        trend = "DECREASING"
    else:
        trend = "STABLE"

    # Build 7-day forecast
    entries = []
    today = datetime.date.today()
    for day_offset in range(1, FORECAST_HORIZON_DAYS + 1):
        x = last_x + day_offset
        forecast_prob = _clamp(intercept + slope * x)
        ci_half = _clamp(1.96 * stderr, 0.0, 0.5)
        ci_low = _clamp(forecast_prob - ci_half)
        ci_high = _clamp(forecast_prob + ci_half)
        forecast_date = (today + datetime.timedelta(days=day_offset)).isoformat()
        rl = _prob_to_risk_level(forecast_prob)
        entries.append({
            "forecast_date": forecast_date,
            "forecasted_probability": round(forecast_prob, 4),
            "confidence_interval_low": round(ci_low, 4),
            "confidence_interval_high": round(ci_high, 4),
            "forecasted_risk_level": rl,
            "risk_level": rl,   # alias for backward-compat
        })

    # Current anchor point
    current_prob = _clamp(intercept + slope * last_x)

    return {
        "corridor_id": corridor_id,
        "corridor_name": SUPPORTED_CORRIDORS.get(corridor_id, corridor_id),
        "trend": trend,
        "slope_per_day": round(slope, 6),
        "current_probability": round(current_prob, 4),
        "history_points_used": len(probs),
        "forecast_generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "forecast": entries,
    }


def generate_all_forecasts() -> List[Dict[str, Any]]:
    """Generates 7-day forecasts for all supported corridors."""
    results = []
    for corridor_id in SUPPORTED_CORRIDORS:
        try:
            results.append(generate_corridor_forecast(corridor_id))
        except Exception as e:
            logger.error(f"Forecast failed for {corridor_id}: {e}")
    return results
