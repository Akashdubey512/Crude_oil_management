"""
Report Routes — Phase 14
GET /api/reports/daily              — full daily JSON risk report
GET /api/reports/export/csv         — CSV export (risk history or alerts)
GET /api/reports/export/pdf         — PDF executive summary download
"""

import logging
from typing import Optional
from fastapi import APIRouter, Query, HTTPException, Depends
from fastapi.responses import Response, StreamingResponse
import io

from src.api.auth import authenticate_key
from src.api.services.report_service import (
    generate_daily_report,
    export_risk_history_csv,
    export_alerts_csv,
    generate_pdf_report,
    export_board_pack_pdf,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/reports/board-pack/pdf", tags=["Reports — Phase 21 Board Pack"])
def download_board_pack_pdf(auth: dict = Depends(authenticate_key)):
    """
    Generates and downloads the executive Board Pack PDF summarizing current corridor risk state,
    SHAP attributions, Strategic Petroleum Reserve drawdown schedule, supplier exposures, and GDP impact.
    Targeted for energy desk executives and board members.
    """
    try:
        pdf_bytes = export_board_pack_pdf()
        import datetime
        date_str = datetime.date.today().isoformat()
        filename = f"India_Energy_Resilience_Board_Pack_{date_str}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"Board Pack PDF generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Board Pack PDF generation failed: {e}")


@router.get("/reports/daily", tags=["Reports — Phase 14"])
def daily_risk_report(auth: dict = Depends(authenticate_key)):
    """
    Returns the full daily risk intelligence report as JSON.
    Includes corridor snapshots, portfolio risk, active alerts, and 7-day forecasts.
    """
    try:
        return generate_daily_report()
    except Exception as e:
        logger.error(f"Failed to generate daily report: {e}")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {e}")


@router.get("/reports/export/csv", tags=["Reports — Phase 14"])
def export_csv(
    type: str = Query("risk_history", description="risk_history | alerts"),
    corridor_id: Optional[str] = Query(None, description="Filter by corridor (risk_history only)"),
    days: int = Query(30, ge=1, le=365, description="Lookback days (risk_history only)"),
    auth: dict = Depends(authenticate_key)
):
    """
    Exports data as a downloadable CSV file.
    - type=risk_history: prediction probability history
    - type=alerts: alert event log
    """
    try:
        if type == "risk_history":
            cid = corridor_id.upper() if corridor_id else None
            csv_bytes = export_risk_history_csv(corridor_id=cid, days=days)
            filename = f"risk_history_{cid or 'all'}_{days}d.csv"
        elif type == "alerts":
            csv_bytes = export_alerts_csv()
            filename = "alert_history.csv"
        else:
            raise HTTPException(status_code=400, detail="type must be risk_history or alerts")

        return Response(
            content=csv_bytes,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CSV export failed: {e}")
        raise HTTPException(status_code=500, detail=f"CSV export failed: {e}")


@router.get("/reports/export/pdf", tags=["Reports — Phase 14"])
def export_pdf(auth: dict = Depends(authenticate_key)):
    """
    Downloads a PDF executive summary of the current risk intelligence snapshot.
    Requires READ scope.
    """
    try:
        pdf_bytes = generate_pdf_report()
        import datetime
        date_str = datetime.date.today().isoformat()
        filename = f"india_energy_risk_report_{date_str}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")
