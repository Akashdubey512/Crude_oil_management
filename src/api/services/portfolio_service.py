"""
Portfolio Risk Service — Phase 14

Computes India-weighted aggregate supply chain risk across all maritime corridors.
Weights are based on India's crude import dependency per corridor.
"""

import datetime
import logging
from typing import Dict, Any, List

from src.api.services.risk_service import get_all_risk_snapshots, SUPPORTED_CORRIDORS

logger = logging.getLogger(__name__)

# India crude import dependency weights (approximate, based on PPAC 2024 data)
# Hormuz: ~65% (GCC countries), Bab el-Mandeb/Red Sea: ~20% (West Africa/Europe),
# Suez: ~15% (Russia/North Africa re-routing)
CORRIDOR_WEIGHTS: Dict[str, float] = {
    "HORMUZ":        0.45,
    "RED_SEA":       0.20,
    "BAB_EL_MANDEB": 0.20,
    "SUEZ":          0.15,
}

# Risk score → numeric value mapping
RISK_LEVEL_SCORES: Dict[str, float] = {
    "MINIMAL":  5.0,
    "LOW":      25.0,
    "MEDIUM":   50.0,
    "HIGH":     75.0,
    "CRITICAL": 95.0,
    "UNAVAILABLE": 0.0,
}


def _get_risk_score(snap: Dict[str, Any]) -> float:
    """Extracts numeric risk_score from a snapshot; falls back to risk_level mapping."""
    score = snap.get("risk_score")
    if score is not None and score > 0:
        return float(score)
    level = snap.get("risk_level", "MINIMAL")
    return RISK_LEVEL_SCORES.get(str(level).upper(), 25.0)


def compute_portfolio_risk() -> Dict[str, Any]:
    """
    Computes the weighted portfolio risk score across all corridors.
    Returns: portfolio_risk_score, portfolio_risk_level, weighted_breakdown, dominant_driver.
    """
    snapshots = get_all_risk_snapshots()
    snap_map: Dict[str, Dict] = {}
    for snap in snapshots:
        cid = snap.get("corridor") or snap.get("corridor_id", "")
        snap_map[cid] = snap

    weighted_sum = 0.0
    total_weight = 0.0
    breakdown = []

    for corridor_id, weight in CORRIDOR_WEIGHTS.items():
        snap = snap_map.get(corridor_id, {})
        score = _get_risk_score(snap)
        risk_level = snap.get("risk_level", "MINIMAL")
        contribution = score * weight
        weighted_sum += contribution
        total_weight += weight
        breakdown.append({
            "corridor_id": corridor_id,
            "corridor_name": SUPPORTED_CORRIDORS.get(corridor_id, corridor_id),
            "weight": weight,
            "risk_score": round(score, 2),
            "risk_level": risk_level,
            "weighted_contribution": round(contribution, 2),
        })

    portfolio_score = weighted_sum / total_weight if total_weight > 0 else 0.0

    # Map portfolio score to risk level
    if portfolio_score >= 75:
        portfolio_level = "CRITICAL"
    elif portfolio_score >= 55:
        portfolio_level = "HIGH"
    elif portfolio_score >= 35:
        portfolio_level = "MEDIUM"
    elif portfolio_score >= 15:
        portfolio_level = "LOW"
    else:
        portfolio_level = "MINIMAL"

    # Dominant driver — highest weighted contribution
    dominant = max(breakdown, key=lambda x: x["weighted_contribution"])

    return {
        "portfolio_risk_score": round(portfolio_score, 2),
        "portfolio_risk_level": portfolio_level,
        "dominant_driver": dominant["corridor_id"],
        "dominant_driver_contribution": dominant["weighted_contribution"],
        "weighted_breakdown": breakdown,
        "total_corridors": len(breakdown),
        "computed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "methodology": "India crude import dependency weighted average (PPAC 2024 basis)",
    }


def compute_portfolio_trend(days: int = 30) -> List[Dict[str, Any]]:
    """
    Returns a synthetic 30-day portfolio risk trend based on the weighted
    breakdown of current corridor snapshots (simplified — production systems
    would query stored daily portfolio scores).
    """
    current = compute_portfolio_risk()
    today = datetime.date.today()

    # Build a simple trend by interpolating between a past anchor and current
    # We use the current score as the anchor and apply a ±5% daily variation
    import math
    base = current["portfolio_risk_score"]
    trend = []
    for i in range(days, 0, -1):
        date = (today - datetime.timedelta(days=i)).isoformat()
        # Smooth sine wave variation to represent realistic fluctuation
        variation = 3.0 * math.sin(i * 0.4)
        score = max(0.0, min(100.0, base + variation))
        if score >= 75:
            level = "CRITICAL"
        elif score >= 55:
            level = "HIGH"
        elif score >= 35:
            level = "MEDIUM"
        elif score >= 15:
            level = "LOW"
        else:
            level = "MINIMAL"
        trend.append({
            "date": date,
            "portfolio_risk_score": round(score, 2),
            "portfolio_risk_level": level,
        })

    trend.append({
        "date": today.isoformat(),
        "portfolio_risk_score": base,
        "portfolio_risk_level": current["portfolio_risk_level"],
    })

    return trend
