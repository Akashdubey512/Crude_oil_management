"""
Report Service — Phase 14

Generates structured risk intelligence reports:
- Daily JSON risk report (all corridors + portfolio summary)
- CSV exports: risk history, alert log
- PDF executive summary (reportlab, no browser dependency)
"""

import csv
import datetime
import io
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


def generate_daily_report() -> Dict[str, Any]:
    """
    Builds a complete daily risk intelligence report combining corridor snapshots,
    portfolio risk, active alerts, and 7-day forecasts.
    """
    from src.api.services.risk_service import get_all_risk_snapshots
    from src.api.services.portfolio_service import compute_portfolio_risk
    from src.api.services.alert_service import get_active_alerts
    from src.api.services.forecast_service import generate_all_forecasts

    now = datetime.datetime.now(datetime.timezone.utc)

    snapshots = get_all_risk_snapshots()
    portfolio = compute_portfolio_risk()
    alerts = get_active_alerts()
    forecasts = generate_all_forecasts()

    # Summary stats
    risk_levels = [s.get("risk_level", "MINIMAL") for s in snapshots]
    level_counts = {}
    for lvl in risk_levels:
        level_counts[str(lvl)] = level_counts.get(str(lvl), 0) + 1

    critical_corridors = [
        s.get("corridor") or s.get("corridor_id") for s in snapshots
        if s.get("risk_level") in ("CRITICAL", "HIGH")
    ]

    report = {
        "report_type": "DAILY_RISK_INTELLIGENCE",
        "report_date": now.date().isoformat(),
        "generated_at": now.isoformat(),
        "version": "14.0",
        "executive_summary": {
            "portfolio_risk_score": portfolio["portfolio_risk_score"],
            "portfolio_risk_level": portfolio["portfolio_risk_level"],
            "dominant_driver": portfolio["dominant_driver"],
            "active_alerts_count": len(alerts),
            "critical_corridors": critical_corridors,
            "corridor_risk_distribution": level_counts,
        },
        "corridor_snapshots": snapshots,
        "portfolio_risk": portfolio,
        "active_alerts": alerts,
        "seven_day_forecasts": forecasts,
        "data_disclaimer": (
            "Risk assessments are based on real external data integrations "
            "(PortWatch, GDELT, FRED/Brent). Probabilities reflect trained ML model outputs "
            "and should not be used as sole basis for operational decisions."
        ),
    }
    return report


def export_risk_history_csv(corridor_id: str = None, days: int = 30) -> bytes:
    """
    Exports prediction history as CSV bytes.
    Queries the predictions table from the DB.
    """
    from src.api.database import get_db_connection, release_db_connection

    conn = get_db_connection()
    rows = []
    try:
        cursor = conn.cursor()
        cutoff = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days)).isoformat()
        if corridor_id:
            cursor.execute(
                "SELECT predicted_at, corridor_id, risk_level, probability, risk_score "
                "FROM predictions WHERE corridor_id = ? AND predicted_at >= ? ORDER BY predicted_at DESC LIMIT 500;",
                (corridor_id, cutoff)
            )
        else:
            cursor.execute(
                "SELECT predicted_at, corridor_id, risk_level, probability, risk_score "
                "FROM predictions WHERE predicted_at >= ? ORDER BY predicted_at DESC LIMIT 2000;",
                (cutoff,)
            )
        rows = cursor.fetchall()
        cursor.close()
    except Exception as e:
        logger.warning(f"Could not fetch prediction history: {e}")
    finally:
        release_db_connection(conn)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["predicted_at", "corridor_id", "risk_level", "probability", "risk_score"])
    for row in rows:
        if isinstance(row, dict):
            writer.writerow([
                row.get("predicted_at"), row.get("corridor_id"),
                row.get("risk_level"), row.get("probability"), row.get("risk_score")
            ])
        else:
            writer.writerow(list(row))

    # If no history in DB, write the current snapshot
    if not rows:
        from src.api.services.risk_service import get_all_risk_snapshots
        snapshots = get_all_risk_snapshots()
        for snap in snapshots:
            if corridor_id and (snap.get("corridor") or snap.get("corridor_id")) != corridor_id:
                continue
            writer.writerow([
                snap.get("as_of_date"),
                snap.get("corridor") or snap.get("corridor_id"),
                snap.get("risk_level"),
                snap.get("probability"),
                snap.get("risk_score"),
            ])

    return output.getvalue().encode("utf-8")


def export_alerts_csv() -> bytes:
    """Exports all alert history as CSV bytes."""
    from src.api.services.alert_service import get_alert_history

    alerts, _ = get_alert_history(page=1, limit=1000)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "corridor_id", "severity", "metric", "threshold",
                     "observed_value", "status", "triggered_at", "resolved_at",
                     "acknowledged_by", "message"])
    for alert in alerts:
        writer.writerow([
            alert.get("id"), alert.get("corridor_id"), alert.get("severity"),
            alert.get("metric"), alert.get("threshold"), alert.get("observed_value"),
            alert.get("status"), alert.get("triggered_at"), alert.get("resolved_at"),
            alert.get("acknowledged_by"), alert.get("message"),
        ])
    return output.getvalue().encode("utf-8")


def generate_pdf_report() -> bytes:
    """
    Generates a PDF executive summary using reportlab.
    Falls back to a plaintext PDF representation if reportlab is unavailable.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.enums import TA_CENTER, TA_LEFT

        report = generate_daily_report()
        portfolio = report["portfolio_risk"]
        now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                                rightMargin=2*cm, leftMargin=2*cm,
                                topMargin=2*cm, bottomMargin=2*cm)
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle("title", fontSize=18, fontName="Helvetica-Bold",
                                     alignment=TA_CENTER, spaceAfter=8)
        sub_style = ParagraphStyle("sub", fontSize=11, fontName="Helvetica",
                                   alignment=TA_CENTER, textColor=colors.grey, spaceAfter=16)
        h2_style = ParagraphStyle("h2", fontSize=13, fontName="Helvetica-Bold",
                                  spaceBefore=14, spaceAfter=6)
        body_style = styles["Normal"]

        elements = []

        # Title block
        elements.append(Paragraph("India Energy Supply Chain Resilience Platform", title_style))
        elements.append(Paragraph(f"Daily Risk Intelligence Report — {report['report_date']}", sub_style))
        elements.append(Paragraph(f"Generated: {now_str}", sub_style))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#334155")))
        elements.append(Spacer(1, 12))

        # Executive Summary
        elements.append(Paragraph("Executive Summary", h2_style))
        exc = report["executive_summary"]
        portfolio_color = {
            "CRITICAL": "#dc2626", "HIGH": "#ea580c", "MEDIUM": "#d97706",
            "LOW": "#16a34a", "MINIMAL": "#15803d"
        }.get(exc["portfolio_risk_level"], "#6b7280")
        elements.append(Paragraph(
            f"<b>Portfolio Risk Score:</b> {exc['portfolio_risk_score']:.1f} / 100 &nbsp;&nbsp; "
            f"<b>Level:</b> <font color='{portfolio_color}'>{exc['portfolio_risk_level']}</font>",
            body_style
        ))
        elements.append(Paragraph(f"<b>Dominant Driver:</b> {exc['dominant_driver']}", body_style))
        elements.append(Paragraph(f"<b>Active Alerts:</b> {exc['active_alerts_count']}", body_style))
        if exc["critical_corridors"]:
            elements.append(Paragraph(
                f"<b>High/Critical Corridors:</b> {', '.join(exc['critical_corridors'])}", body_style))
        elements.append(Spacer(1, 12))

        # Corridor Risk Table
        elements.append(Paragraph("Corridor Risk Snapshot", h2_style))
        table_data = [["Corridor", "Risk Level", "Probability", "Risk Score"]]
        for snap in report["corridor_snapshots"]:
            corridor = snap.get("corridor") or snap.get("corridor_id", "N/A")
            level = str(snap.get("risk_level", "N/A"))
            prob = f"{float(snap.get('probability') or 0.0):.4f}"
            score = f"{float(snap.get('risk_score') or 0.0):.1f}"
            table_data.append([corridor, level, prob, score])

        tbl = Table(table_data, colWidths=[4.5*cm, 3.5*cm, 3.5*cm, 3.5*cm])
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
            ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",   (0, 0), (-1, -1), 10),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("GRID",       (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("ALIGN",      (2, 0), (-1, -1), "CENTER"),
            ("PADDING",    (0, 0), (-1, -1), 6),
        ]))
        elements.append(tbl)
        elements.append(Spacer(1, 12))

        # Portfolio Breakdown
        elements.append(Paragraph("Portfolio Risk Breakdown (India Import Weights)", h2_style))
        pb_data = [["Corridor", "Weight", "Risk Score", "Weighted Contribution"]]
        for item in portfolio["weighted_breakdown"]:
            pb_data.append([
                item["corridor_id"],
                f"{item['weight']*100:.0f}%",
                f"{item['risk_score']:.1f}",
                f"{item['weighted_contribution']:.2f}",
            ])
        pb_tbl = Table(pb_data, colWidths=[4*cm, 2.5*cm, 4*cm, 4.5*cm])
        pb_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
            ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",   (0, 0), (-1, -1), 10),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
            ("GRID",       (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("ALIGN",      (1, 0), (-1, -1), "CENTER"),
            ("PADDING",    (0, 0), (-1, -1), 6),
        ]))
        elements.append(pb_tbl)
        elements.append(Spacer(1, 16))

        # Active Alerts
        if report["active_alerts"]:
            elements.append(Paragraph("Active Alerts", h2_style))
            for alert in report["active_alerts"][:10]:
                sev = alert.get("severity", "WARNING")
                color = "#dc2626" if sev == "CRITICAL" else "#d97706"
                elements.append(Paragraph(
                    f"<font color='{color}'>●</font> <b>[{sev}]</b> {alert.get('message', '')}",
                    body_style
                ))
            elements.append(Spacer(1, 12))

        # Disclaimer
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey))
        elements.append(Spacer(1, 6))
        elements.append(Paragraph(f"<i>{report['data_disclaimer']}</i>",
                                  ParagraphStyle("disc", fontSize=8, textColor=colors.grey)))

        doc.build(elements)
        return buffer.getvalue()

    except ImportError:
        logger.warning("reportlab not installed. Returning text-based PDF stub.")
        return _fallback_text_pdf()


def _fallback_text_pdf() -> bytes:
    """Simple text fallback when reportlab is unavailable."""
    report = generate_daily_report()
    lines = [
        "India Energy Supply Chain Resilience Platform",
        f"Daily Risk Report — {report['report_date']}",
        "",
        f"Portfolio Risk: {report['executive_summary']['portfolio_risk_score']:.1f} / 100",
        f"Level: {report['executive_summary']['portfolio_risk_level']}",
        f"Active Alerts: {report['executive_summary']['active_alerts_count']}",
        "",
        "--- Corridor Snapshots ---",
    ]
    for snap in report["corridor_snapshots"]:
        lines.append(
            f"{snap.get('corridor', snap.get('corridor_id'))} | "
            f"{snap.get('risk_level')} | prob={snap.get('probability', 0):.4f}"
        )
    return "\n".join(lines).encode("utf-8")
