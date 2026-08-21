import logging
from fastapi import APIRouter, HTTPException
from src.api.schemas import ScenarioSimulationRequest, ScenarioSimulationResponse
from src.api.services.scenario_service import run_scenario_simulation

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/scenarios/simulate", response_model=ScenarioSimulationResponse, tags=["Scenarios"])
def simulate_scenario(request: ScenarioSimulationRequest):
    """
    Runs a what-if scenario simulation by loading the trained model for the corridor,
    modifying baseline features according to the multipliers, and recalculating risk.
    """
    try:
        res = run_scenario_simulation(
            corridor_id=request.corridor_id,
            baseline_date=request.baseline_date,
            tanker_transit_multiplier=request.tanker_transit_multiplier,
            gpr_multiplier=request.gpr_multiplier,
            brent_price_multiplier=request.brent_price_multiplier,
            brent_volatility_multiplier=request.brent_volatility_multiplier,
            infrastructure_disruption=request.infrastructure_disruption,
        )
        return res
    except ValueError as e:
        logger.warning(f"Validation failure in scenario simulation: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"Execution error in scenario simulation: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Unhandled error in scenario simulation: {e}")
        raise HTTPException(status_code=500, detail=f"Internal scenario simulation error: {str(e)}")
