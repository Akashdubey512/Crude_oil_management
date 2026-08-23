"""
Strategic Reserve Optimisation Agent — Phase 17
Models optimal Strategic Petroleum Reserve (SPR) drawdown schedules against supply gap forecasts.

DISCLAIMER & HEURISTIC NOTE:
-----------------------------
This module provides a heuristic planning tool for scenario decision support to assist
procurement officers and policy makers during maritime supply chain disruptions.
It is a practical decision-support heuristic, NOT a claimed globally-optimal mathematical solver.
"""

import math
from typing import Dict, Any, List, Optional


# Baseline daily crude oil import estimates by corridor for India (in Million Barrels Per Day - MBPD)
CORRIDOR_BASELINE_IMPORT_MBPD = {
    "HORMUZ": 2.10,        # ~42% of India's 5.0 MBPD total crude import
    "SUEZ": 1.20,          # ~24% of India's crude import
    "BAB_EL_MANDEB": 1.10, # ~22% of India's crude import
    "RED_SEA": 1.10,       # Bab-el-Mandeb proxy
}
DEFAULT_BASELINE_IMPORT_MBPD = 1.50
INDIA_NATIONAL_CRUDE_DEMAND_MBPD = 5.0  # National net daily crude consumption (~5.0 MBPD)


def calculate_reserve_drawdown_schedule(
    predicted_supply_gap_mbpd: float,
    disruption_duration_days: int = 14,
    spr_buffer_days: float = 9.5,
    strategy: str = "front_loaded",
    national_demand_mbpd: float = INDIA_NATIONAL_CRUDE_DEMAND_MBPD,
) -> Dict[str, Any]:
    """
    Calculates a day-by-day Strategic Petroleum Reserve (SPR) drawdown schedule
    to offset a predicted crude oil supply gap during a corridor disruption.

    Parameters:
    -----------
    predicted_supply_gap_mbpd : float
        Predicted daily crude oil supply gap volume in Million Barrels Per Day (MBPD).
    disruption_duration_days : int
        Expected duration of the corridor disruption event in days (e.g. 10 to 14 days).
    spr_buffer_days : float
        Current Strategic Petroleum Reserve (SPR) buffer in days (default ~9.5 days).
    strategy : str
        Drawdown strategy:
        - 'front_loaded': Releases higher volume early (Days 1-3) to blunt initial supply shock, tapering down.
        - 'smoothed': Distributes release volume uniformly across the disruption duration.
    national_demand_mbpd : float
        National daily crude demand baseline in MBPD (default 5.0 MBPD).

    Returns:
    --------
    Dict[str, Any]
        Dictionary matching DrawdownScheduleResponse schema containing:
        - strategy
        - predicted_supply_gap_mbpd
        - disruption_duration_days
        - spr_buffer_days
        - total_recommended_release_mbpd
        - buffer_exhausted (bool)
        - warning_message (Optional[str])
        - schedule (List[Dict])
        - heuristic_note (str)

    Heuristic Logic:
    ----------------
    1. Zero/Negative Gap: If predicted_supply_gap_mbpd <= 0, no drawdown is recommended (release = 0).
    2. Buffer Capacity: Total SPR storage volume in MBPD-days = spr_buffer_days * national_demand_mbpd.
    3. Exhaustion Flag: If disruption_duration_days > spr_buffer_days or total required volume > SPR capacity,
       buffer_exhausted is set to True with an explicit warning message.
    4. Front-Loaded Allocation: Daily weights w_d = exp(-0.25 * (d - 1)) for d in 1..N, normalized so sum(w_d) = 1.0.
    5. Smoothed Allocation: Uniform weight w_d = 1.0 / N for d in 1..N.
    """
    heuristic_note = (
        "Heuristic planning tool for scenario decision support; "
        "not a claimed globally-optimal mathematical solution."
    )

    # Sanitize inputs
    predicted_supply_gap_mbpd = max(0.0, float(predicted_supply_gap_mbpd))
    disruption_duration_days = max(1, int(disruption_duration_days))
    spr_buffer_days = max(0.1, float(spr_buffer_days))
    normalized_strategy = "front_loaded" if strategy.lower() == "front_loaded" else "smoothed"

    # Total available SPR buffer volume in MBPD-days
    total_spr_volume_mbpd_days = spr_buffer_days * national_demand_mbpd

    # Total required replacement volume over the disruption period
    total_required_volume = predicted_supply_gap_mbpd * disruption_duration_days

    # Check for buffer exhaustion or capacity limits
    buffer_exhausted = False
    warning_message: Optional[str] = None

    if predicted_supply_gap_mbpd <= 0.0:
        # Zero gap edge case: no drawdown required
        return {
            "strategy": normalized_strategy,
            "predicted_supply_gap_mbpd": 0.0,
            "disruption_duration_days": disruption_duration_days,
            "spr_buffer_days": spr_buffer_days,
            "total_recommended_release_mbpd": 0.0,
            "buffer_exhausted": False,
            "warning_message": None,
            "schedule": [],
            "heuristic_note": heuristic_note,
        }

    # Evaluate buffer adequacy
    if disruption_duration_days > spr_buffer_days:
        buffer_exhausted = True
        warning_message = (
            f"CRITICAL: Disruption duration ({disruption_duration_days} days) exceeds available "
            f"Strategic Petroleum Reserve buffer ({spr_buffer_days:.1f} days). "
            f"Alternative crude imports or Cape rerouting must be initiated immediately."
        )
    elif total_required_volume > total_spr_volume_mbpd_days:
        buffer_exhausted = True
        warning_message = (
            f"WARNING: Required drawdown volume ({total_required_volume:.2f} MBPD-days) exceeds "
            f"total SPR buffer capacity ({total_spr_volume_mbpd_days:.2f} MBPD-days)."
        )

    # Calculate daily weights based on selected strategy
    N = disruption_duration_days
    if normalized_strategy == "front_loaded":
        # Exponential decay: higher release early to absorb initial market shock
        decay_rate = 0.25
        raw_weights = [math.exp(-decay_rate * i) for i in range(N)]
        weight_sum = sum(raw_weights)
        weights = [w / weight_sum for w in raw_weights]
    else:
        # Smoothed: uniform distribution across the window
        weights = [1.0 / N] * N

    # Build day-by-day schedule
    schedule = []
    cumulative_released = 0.0
    current_spr_days = spr_buffer_days

    for day_idx in range(1, N + 1):
        w = weights[day_idx - 1]
        daily_release = total_required_volume * w
        cumulative_released += daily_release

        # Estimate remaining SPR buffer in days after this release
        days_drawn = daily_release / national_demand_mbpd
        current_spr_days = max(0.0, current_spr_days - days_drawn)

        schedule.append({
            "day": day_idx,
            "recommended_release_mbpd": round(daily_release, 4),
            "cumulative_released_mbpd": round(cumulative_released, 4),
            "remaining_spr_buffer_days": round(current_spr_days, 2),
        })

    return {
        "strategy": normalized_strategy,
        "predicted_supply_gap_mbpd": round(predicted_supply_gap_mbpd, 4),
        "disruption_duration_days": N,
        "spr_buffer_days": round(spr_buffer_days, 2),
        "total_recommended_release_mbpd": round(cumulative_released, 4),
        "buffer_exhausted": buffer_exhausted,
        "warning_message": warning_message,
        "schedule": schedule,
        "heuristic_note": heuristic_note,
    }
