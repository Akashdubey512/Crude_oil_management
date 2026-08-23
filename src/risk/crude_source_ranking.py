"""
Crude Source Ranking Engine — Adaptive Procurement Orchestrator
Ranks alternative crude oil supplier sources for India based on a composite score of
corridor risk exposure and relative shipping/logistics freight cost penalties.

METHODOLOGY & DATA LIMITATIONS DECLARATION:
------------------------------------------
1. Reuses the supplier-to-corridor risk exposure mapping from `src/risk/supplier_risk.py`
   (Russia, Iraq, Saudi Arabia, UAE, Kuwait, Nigeria).
2. Adds relative shipping/logistics cost penalties representing illustrative sea-transit voyage duration
   and freight distance index scores relative to India's primary west-coast refiners (PPAC baseline):
     - UAE / Persian Gulf: Low logistics penalty (~3-4 days voyage) -> Penalty Index: 8.0 - 10.0
     - Saudi Arabia / Iraq / Kuwait: Low-medium logistics penalty (~4-6 days voyage) -> Penalty Index: 10.0
     - West Africa (Nigeria): Medium-high logistics penalty (~20-25 days voyage) -> Penalty Index: 25.0
     - Russia (Baltic/Black Sea): High logistics penalty (~25-35 days voyage) -> Penalty Index: 30.0
3. Composite Rank Score = Corridor Risk Exposure Score (0-100) + Logistics Penalty Index (0-50).
   Lower composite score indicates a more resilient and cost-effective alternative source.
4. Deterministic tie-breaking is enforced by secondary sort on import share (%) descending,
   and tertiary sort on supplier country name alphabetically.
"""

import datetime
import logging
from typing import Dict, Any, List, Optional
from src.risk.supplier_risk import compute_supplier_risk_exposures, SUPPLIER_PROFILES

logger = logging.getLogger(__name__)

# Relative Logistics & Freight Penalty Index (0-50 scale)
# Based on relative shipping distance to India's west coast refineries (PPAC proxy)
LOGISTICS_COST_PENALTIES: Dict[str, float] = {
    "United Arab Emirates": 8.0,
    "Saudi Arabia": 10.0,
    "Iraq": 10.0,
    "Kuwait": 10.0,
    "Nigeria / West Africa": 25.0,
    "Russia": 30.0,
}

RANKING_METHODOLOGY_TEXT: str = (
    "Alternative crude source ranking combines corridor disruption risk exposure scores with relative "
    "voyage distance/logistics penalties relative to India's west-coast refineries (PPAC baseline proxy). "
    "Composite Score = Corridor Risk Exposure (0-100) + Freight Penalty (0-50). Lower score indicates higher procurement priority."
)


def rank_alternative_crude_sources(corridor_scores: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
    """
    Ranks alternative crude oil sources combining corridor risk exposure and relative logistics penalty.
    
    Parameters:
    -----------
    corridor_scores : Dict[str, float], optional
        Corridor risk scores or probabilities (e.g. {"HORMUZ": 85.0, "SUEZ": 15.0}).

    Returns:
    --------
    Dict[str, Any]
        Structured dictionary containing ranked supplier items, methodology metadata, and timestamp.
    """
    # 1. Compute per-supplier corridor risk exposures (reusing supplier_risk.py)
    supplier_exposure_data = compute_supplier_risk_exposures(corridor_scores)
    suppliers = supplier_exposure_data.get("suppliers", [])

    items = []
    for s in suppliers:
        country_name = s["supplier_country"]
        exposure_score = float(s["exposure_score"])
        cost_penalty = LOGISTICS_COST_PENALTIES.get(country_name, 15.0)

        # Composite Score = Corridor Exposure + Freight Logistics Penalty
        composite_score = round(exposure_score + cost_penalty, 2)

        items.append({
            "supplier_country": country_name,
            "country_code": s["country_code"],
            "import_share_pct": float(s["import_share_pct"]),
            "primary_corridor": s["primary_corridor"],
            "corridor_risk_exposure": exposure_score,
            "cost_logistics_penalty": cost_penalty,
            "composite_rank_score": composite_score,
            "risk_level": s["risk_level"],
        })

    # 2. Sort suppliers: lowest composite score first.
    # Deterministic tie-breaking:
    #   Primary: composite_rank_score ascending
    #   Secondary: import_share_pct descending (-import_share_pct)
    #   Tertiary: supplier_country alphabetically
    items.sort(key=lambda x: (x["composite_rank_score"], -x["import_share_pct"], x["supplier_country"]))

    # 3. Assign 1-based ranks and operational recommendation tags
    for index, item in enumerate(items, start=1):
        item["rank"] = index
        if index == 1:
            item["recommendation_status"] = "PRIMARY_OPTIMAL"
        elif index in (2, 3):
            item["recommendation_status"] = "STABLE_ALTERNATIVE"
        elif item["composite_rank_score"] >= 65.0:
            item["recommendation_status"] = "ELEVATED_RISK_PENALTY"
        else:
            item["recommendation_status"] = "SECONDARY_OPTION"

    return {
        "ranked_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "ranked_sources": items,
        "methodology": RANKING_METHODOLOGY_TEXT,
        "top_recommended_supplier": items[0]["supplier_country"] if items else None,
    }
