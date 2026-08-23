"""
Phase 21 Test Suite — Backtest Replay Series & Board Pack PDF Export
Validates:
  1. GET /api/monitoring/backtest/replay endpoint data structure & metric fields
  2. GET /api/reports/board-pack/pdf endpoint binary payload generation & headers
"""

import pytest
from fastapi.testclient import TestClient
from src.api.main import app
from src.models.backtest import get_backtest_replay_series
from src.api.services.report_service import export_board_pack_pdf

client = TestClient(app)


def test_get_backtest_replay_service():
    """Verifies backtest replay series service returns valid timeline structure."""
    result = get_backtest_replay_series(corridor_id="RED_SEA", start_date="2023-11-01", end_date="2024-02-28")
    assert result["corridor_id"] == "RED_SEA"
    assert "series" in result
    assert len(result["series"]) > 0
    assert "detection_rate" in result
    assert "false_alarm_rate" in result

    first_item = result["series"][0]
    assert "date" in first_item
    assert "predicted_probability" in first_item
    assert "actual_disruption" in first_item
    assert isinstance(first_item["predicted_probability"], float)
    assert first_item["actual_disruption"] in (0, 1)


def test_get_backtest_replay_route():
    """Verifies GET /api/monitoring/backtest/replay endpoint."""
    response = client.get("/api/monitoring/backtest/replay?corridor=HORMUZ")
    assert response.status_code == 200

    data = response.json()
    assert data["corridor_id"] == "HORMUZ"
    assert len(data["series"]) > 0
    assert "window_title" in data


def test_export_board_pack_pdf_service():
    """Verifies ReportLab PDF generation service returns valid PDF binary bytes."""
    pdf_bytes = export_board_pack_pdf()
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 500
    # PDF files start with %PDF
    assert pdf_bytes.startswith(b"%PDF") or b"India Energy" in pdf_bytes


def test_download_board_pack_pdf_route():
    """Verifies GET /api/reports/board-pack/pdf endpoint returns application/pdf content."""
    response = client.get(
        "/api/reports/board-pack/pdf",
        headers={"Authorization": "Bearer erp_pubadmin_defaultadminsecretkey987654321"}
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment; filename=India_Energy_Resilience_Board_Pack_" in response.headers["content-disposition"]
    assert len(response.content) > 500
