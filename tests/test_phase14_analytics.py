"""
Phase 14 Test Suite — Advanced Analytics, Alerting & Reporting
"""

import os
import json
import pytest
from fastapi.testclient import TestClient
from src.api.main import app
from src.api.services.alert_service import evaluate_alerts

client = TestClient(app)

def test_alerts_rules_endpoints():
    """Verify that alert rules can be listed and created/updated."""
    # 1. Get default rules
    response = client.get("/api/alerts/rules")
    assert response.status_code == 200
    body = response.json()
    assert "rules" in body
    rules = body["rules"]
    assert isinstance(rules, list)
    assert len(rules) > 0
    # Check fields of the first rule
    rule = rules[0]
    assert "id" in rule
    assert "corridor_id" in rule
    assert "metric" in rule
    assert "threshold" in rule
    assert "enabled" in rule

    # 2. Add a new rule
    new_rule = {
        "corridor_id": "HORMUZ",
        "metric": "risk_score",
        "operator": ">=",
        "threshold": 85.0,
        "severity": "CRITICAL"
    }
    post_res = client.post("/api/alerts/rules", json=new_rule)
    assert post_res.status_code == 201
    res_body = post_res.json()
    assert "rule" in res_body
    created_rule = res_body["rule"]
    assert created_rule["corridor_id"] == "HORMUZ"
    assert created_rule["metric"] == "risk_score"
    assert created_rule["threshold"] == 85.0
    assert created_rule["enabled"] is True

def test_alerts_evaluation_and_acknowledgement():
    """Verify that evaluating rules creates alerts, and we can acknowledge them."""
    # 1. Trigger alert evaluation with a high risk score snapshot
    new_alerts = evaluate_alerts([
        {"corridor_id": "HORMUZ", "risk_score": 95.0, "predicted_risk_probability": 0.95}
    ])
    assert isinstance(new_alerts, list)

    # 2. Get active alerts
    response = client.get("/api/alerts")
    assert response.status_code == 200
    body = response.json()
    assert "active_alerts" in body
    alerts = body["active_alerts"]
    assert isinstance(alerts, list)

    if len(alerts) > 0:
        alert = alerts[0]
        alert_id = alert["id"]
        assert "corridor_id" in alert
        assert "rule_id" in alert
        assert "observed_value" in alert
        assert "status" in alert
        assert alert["status"] == "ACTIVE"

        # Acknowledge the alert
        ack_payload = {"acknowledged_by": "test_user"}
        ack_res = client.post(f"/api/alerts/{alert_id}/acknowledge", json=ack_payload)
        assert ack_res.status_code == 200
        assert "acknowledged by test_user" in ack_res.json()["message"]

def test_forecast_endpoints():
    """Verify that the 7-day risk forecast endpoint works."""
    for corridor in ["HORMUZ", "BAB_EL_MANDEB", "SUEZ", "RED_SEA"]:
        response = client.get(f"/api/forecast/{corridor}")
        assert response.status_code == 200
        forecast_data = response.json()
        assert "corridor_id" in forecast_data
        assert forecast_data["corridor_id"] == corridor
        assert "forecast" in forecast_data
        assert isinstance(forecast_data["forecast"], list)
        # Verify 7 days of forecast
        assert len(forecast_data["forecast"]) == 7
        for point in forecast_data["forecast"]:
            assert "forecast_date" in point
            assert "forecasted_probability" in point
            assert 0.0 <= point["forecasted_probability"] <= 1.0
            assert "risk_level" in point

def test_portfolio_risk_endpoint():
    """Verify that the India portfolio risk aggregation works."""
    response = client.get("/api/portfolio/risk")
    assert response.status_code == 200
    portfolio = response.json()
    assert "portfolio_risk_score" in portfolio
    assert 0.0 <= portfolio["portfolio_risk_score"] <= 100.0
    assert "portfolio_risk_level" in portfolio
    assert "weighted_breakdown" in portfolio
    assert isinstance(portfolio["weighted_breakdown"], list)
    # Check that it contains modeled corridors
    corridor_ids = [c["corridor_id"] for c in portfolio["weighted_breakdown"]]
    assert len(corridor_ids) > 0

def test_reports_endpoints():
    """Verify that daily JSON, CSV exports, and PDF reports generate successfully."""
    # 1. JSON Daily report
    res_daily = client.get("/api/reports/daily")
    assert res_daily.status_code == 200
    report_json = res_daily.json()
    assert "executive_summary" in report_json
    assert "portfolio_risk" in report_json
    assert "corridor_snapshots" in report_json
    assert "active_alerts" in report_json
    assert "seven_day_forecasts" in report_json

    # 2. CSV Risk History export
    res_csv_history = client.get("/api/reports/export/csv?type=risk_history&corridor_id=HORMUZ&days=10")
    assert res_csv_history.status_code == 200
    assert res_csv_history.headers["content-type"].startswith("text/csv")
    assert "corridor_id" in res_csv_history.text

    # 3. CSV Alerts export
    res_csv_alerts = client.get("/api/reports/export/csv?type=alerts")
    assert res_csv_alerts.status_code == 200
    assert res_csv_alerts.headers["content-type"].startswith("text/csv")

    # 4. PDF Executive Summary report
    res_pdf = client.get("/api/reports/export/pdf")
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert len(res_pdf.content) > 0
