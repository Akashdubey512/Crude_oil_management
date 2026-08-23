"""
Supplier Risk Service — Phase 18
Computes per-supplier crude disruption exposure scores for India's major crude oil suppliers.

METHODOLOGY & DATA LIMITATIONS DECLARATION:
------------------------------------------
PortWatch and GDELT do not expose raw per-supplier sensor telemetry. Per-supplier disruption
exposure is a modeled estimate derived from weighted corridor risk outputs, mapping each supplier
country's crude shipping routes through monitored maritime corridors (HORMUZ, SUEZ, BAB_EL_MANDEB, RED_SEA).
This is an explicit modeled estimate and must be presented with this caveat in APIs and UIs.
"""

import datetime
from typing import Dict, Any, List

# Supplier Country -> Transit Corridor Exposure Weights & Import Share
# Import shares reflect India's crude import composition (PPAC / Ministry of Petroleum data)
SUPPLIER_PROFILES = [
    {
        "supplier_country": "Russia",
        "country_code": "RU",
        "import_share_pct": 35.0,
        "primary_corridor": "SUEZ",
        "corridor_weights": {"SUEZ": 0.60, "RED_SEA": 0.40},
    },
    {
        "supplier_country": "Iraq",
        "country_code": "IQ",
        "import_share_pct": 21.0,
        "primary_corridor": "HORMUZ",
        "corridor_weights": {"HORMUZ": 1.00},
    },
    {
        "supplier_country": "Saudi Arabia",
        "country_code": "SA",
        "import_share_pct": 17.0,
        "primary_corridor": "HORMUZ",
        "corridor_weights": {"HORMUZ": 0.85, "RED_SEA": 0.15},
    },
    {
        "supplier_country": "United Arab Emirates",
        "country_code": "AE",
        "import_share_pct": 9.0,
        "primary_corridor": "HORMUZ",
        "corridor_weights": {"HORMUZ": 1.00},
    },
    {
        "supplier_country": "Kuwait",
        "country_code": "KW",
        "import_share_pct": 6.0,
        "primary_corridor": "HORMUZ",
        "corridor_weights": {"HORMUZ": 1.00},
    },
    {
        "supplier_country": "Nigeria / West Africa",
        "country_code": "NG",
        "import_share_pct": 5.0,
        "primary_corridor": "BAB_EL_MANDEB",
        "corridor_weights": {"BAB_EL_MANDEB": 0.40, "SUEZ": 0.10},
    },
]

METHODOLOGY_TEXT = (
    "Per-supplier disruption exposure is a modeled estimate derived from weighted corridor risk outputs, "
    "as supplier-of-origin sensor streams are not directly available in PortWatch/GDELT."
)


def _classify_exposure_level(score: float) -> str:
    if score >= 75.0:
        return "CRITICAL"
    elif score >= 50.0:
        return "HIGH"
    elif score >= 25.0:
        return "MODERATE"
    elif score >= 10.0:
        return "LOW"
    else:
        return "MINIMAL"


def compute_supplier_risk_exposures(corridor_scores: Dict[str, float] = None) -> Dict[str, Any]:
    """
    Computes per-supplier disruption exposure scores as a weighted composition
    of corridor risk outputs.

    Parameters:
    -----------
    corridor_scores : Dict[str, float], optional
        Dictionary mapping corridor ID (HORMUZ, SUEZ, BAB_EL_MANDEB, RED_SEA)
        to numeric risk scores (0-100 or probability 0-1). If probabilities [0,1]
        are supplied, they will be scaled to [0,100].

    Returns:
    --------
    Dict[str, Any]
        Structured payload with per-supplier risk items, computation timestamp, and methodology caveat.
    """
    if corridor_scores is None:
        from src.api.services.risk_service import get_all_risk_snapshots
        snapshots = get_all_risk_snapshots()
        corridor_scores = {}
        for snap in snapshots:
            cid = snap.get("corridor") or snap.get("corridor_id", "")
            raw = snap.get("risk_score")
            if raw is None:
                prob = snap.get("probability", 0.0)
                raw = prob * 100.0 if prob <= 1.0 else prob
            corridor_scores[cid] = float(raw)

    # Normalize corridor scores to 0-100 scale
    normalized_corridor_scores = {}
    for cid, val in corridor_scores.items():
        score = float(val)
        if score <= 1.0:
            score = score * 100.0
        normalized_corridor_scores[cid.upper()] = max(0.0, min(100.0, score))

    items = []
    for profile in SUPPLIER_PROFILES:
        weights = profile["corridor_weights"]
        exposure_score = 0.0
        for corridor_id, w in weights.items():
            c_score = normalized_corridor_scores.get(corridor_id, 10.0)
            exposure_score += w * c_score

        exposure_score = round(exposure_score, 2)
        risk_level = _classify_exposure_level(exposure_score)

        items.append({
            "supplier_country": profile["supplier_country"],
            "country_code": profile["country_code"],
            "import_share_pct": profile["import_share_pct"],
            "primary_corridor": profile["primary_corridor"],
            "exposure_score": exposure_score,
            "risk_level": risk_level,
            "corridor_weights": profile["corridor_weights"],
        })

    return {
        "computed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "suppliers": items,
        "methodology": METHODOLOGY_TEXT,
    }
