"""
Cascading Economic & GDP Impact Engine — Phase 18
Models cascading downstream economic impacts (refining throughput drop, crude import bill surge,
and macro GDP growth delta) resulting from maritime corridor disruptions and oil price shocks.

FORMULA & ELASTICITY RATIONALE (RBI & IMF EMPIRES BASIS):
--------------------------------------------------------
- Base India Crude Import Volume: ~5.0 Million Barrels Per Day (MBPD).
- Base India Nominal GDP: ~$3,750 Billion USD ($3.75 Trillion).
- Price Shock Impact: Every $10/bbl sustained increase in Brent crude spot price adds ~$14-16 Billion
  to India's annual import bill, reducing real GDP growth by ~0.30 percentage points (RBI Macroeconomic Report).
- Refining Disruption Impact: A 10% drop in crude tanker flow / refinery throughput reduces industrial GDP growth
  by ~0.15 percentage points due to downstream fuel rationing and transportation input cost spikes.

DISCLAIMER & METHODOLOGY CAVEAT:
--------------------------------
This is an illustrative decision-support estimation based on RBI/IMF macroeconomic elasticity parameters.
It is NOT a formal econometric forecast or global equilibrium solve.
"""

from typing import Dict, Any

INDIA_NOMINAL_GDP_USD_B = 3750.0  # $3.75 Trillion USD
INDIA_DAILY_IMPORT_MBPD = 5.0    # 5.0 Million Barrels Per Day

METHODOLOGY_TEXT = (
    "Illustrative economic impact estimate based on RBI/IMF crude price and supply disruption elasticity parameters; "
    "not a formal econometric forecast."
)

ELASTICITY_FORMULA_TEXT = (
    "GDP Impact (pp) = -[(Annualized Import Bill Delta $B / $3,750B Nominal GDP) * 100] - (Refining Drop % * 0.015)"
)


def calculate_cascading_economic_impact(
    brent_baseline_usd: float = 78.50,
    brent_simulated_usd: float = 78.50,
    tanker_transit_multiplier: float = 1.0,
    infrastructure_disruption: bool = False,
    india_daily_import_mbpd: float = INDIA_DAILY_IMPORT_MBPD,
    india_gdp_usd_b: float = INDIA_NOMINAL_GDP_USD_B,
) -> Dict[str, Any]:
    """
    Computes cascading economic impact stats: daily import cost delta, annualized import bill impact,
    refinery throughput drop %, and estimated GDP growth impact in percentage points.

    Parameters:
    -----------
    brent_baseline_usd : float
        Baseline Brent crude price in USD per barrel (default $78.50).
    brent_simulated_usd : float
        Simulated Brent crude price in USD per barrel.
    tanker_transit_multiplier : float
        Multiplier for tanker transits (e.g. 0.8 = 20% transit drop).
    infrastructure_disruption : bool
        Flag if active refinery/pipeline infrastructure disruption is simulated.
    india_daily_import_mbpd : float
        Baseline daily import volume in MBPD (default 5.0 MBPD).
    india_gdp_usd_b : float
        India nominal GDP baseline in $ Billion USD (default $3,750B).

    Returns:
    --------
    Dict[str, Any]
        Dictionary matching EconomicImpactResponse schema.
    """
    brent_baseline_usd = max(10.0, float(brent_baseline_usd))
    brent_simulated_usd = max(10.0, float(brent_simulated_usd))
    price_delta = brent_simulated_usd - brent_baseline_usd

    # 1. Calculate refining throughput drop %
    transit_drop_pct = max(0.0, (1.0 - float(tanker_transit_multiplier)) * 100.0)
    infra_drop_pct = 15.0 if infrastructure_disruption else 0.0
    refining_throughput_drop_pct = round(transit_drop_pct + infra_drop_pct, 2)

    # 2. Calculate daily import cost delta ($ Millions USD)
    # Delivered cost increase on baseline imports + replacement cost premium on disrupted volume
    import_mbpd = float(india_daily_import_mbpd)
    disrupted_mbpd = import_mbpd * (transit_drop_pct / 100.0) + (0.75 if infrastructure_disruption else 0.0)
    normal_mbpd = max(0.0, import_mbpd - disrupted_mbpd)

    daily_cost_delta_m = (normal_mbpd * price_delta) + (disrupted_mbpd * (brent_simulated_usd * 1.20 - brent_baseline_usd))
    daily_cost_delta_m = max(0.0, float(daily_cost_delta_m))

    # 3. Annualized import bill impact ($ Billions USD)
    annualized_import_bill_delta_b = round((daily_cost_delta_m * 365.0) / 1000.0, 3)

    # 4. GDP Growth Impact (percentage points)
    # Direct import bill drain + industrial output loss from refining throughput reduction
    import_bill_gdp_effect = (annualized_import_bill_delta_b / india_gdp_usd_b) * 100.0
    refining_gdp_effect = refining_throughput_drop_pct * 0.015

    estimated_gdp_impact_pp = -1.0 * (import_bill_gdp_effect + refining_gdp_effect)
    estimated_gdp_impact_pp = round(estimated_gdp_impact_pp, 3)

    return {
        "daily_import_cost_delta_usd_m": round(daily_cost_delta_m, 2),
        "annualized_import_bill_delta_usd_b": annualized_import_bill_delta_b,
        "estimated_gdp_growth_impact_pct": estimated_gdp_impact_pp,
        "refining_throughput_drop_pct": refining_throughput_drop_pct,
        "elasticity_formula": ELASTICITY_FORMULA_TEXT,
        "methodology_note": METHODOLOGY_TEXT,
    }
