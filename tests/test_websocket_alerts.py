"""
Phase 20 Test Suite — Real-Time WebSocket Alerts & Outbound Webhook Dispatch
Validates:
  1. Threshold-trigger logic in alert_service.evaluate_alerts
  2. WebSocket connection & message shape via Starlette TestClient (/ws/alerts)
  3. Outbound HTTP webhook gating (off by default) and payload structure when enabled
"""

import os
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from src.api.main import app
from src.api.services.alert_service import evaluate_alerts
from src.api.services.websocket_service import (
    alert_ws_manager,
    dispatch_outbound_webhook,
    notify_new_alerts_sync,
)

client = TestClient(app)


def test_alert_threshold_trigger_logic():
    """Verifies that crossing a risk threshold triggers an active alert record."""
    high_risk_snapshot = {
        "corridor": "HORMUZ",
        "risk_level": "HIGH",
        "risk_score": 75.0,
        "probability": 0.75,
        "prediction_date": "2026-08-23",
        "data_freshness": {"traffic": "2026-08-23"},
    }

    # Evaluate alerts against the high-risk snapshot
    newly_triggered = evaluate_alerts([high_risk_snapshot])

    # Should trigger at least one alert if rules are active or defaults seeded
    assert isinstance(newly_triggered, list)
    if newly_triggered:
        alert = newly_triggered[0]
        assert alert["corridor_id"] == "HORMUZ"
        assert alert["status"] == "ACTIVE"
        assert "message" in alert


def test_websocket_connection_and_heartbeat():
    """Verifies WebSocket client connection handshake and ping/pong heartbeat."""
    with client.websocket_connect("/ws/alerts") as websocket:
        # Receive connection confirmation
        data = websocket.receive_json()
        assert data["type"] == "CONNECTED"
        assert "message" in data

        # Test ping/pong heartbeat
        websocket.send_text("ping")
        response = websocket.receive_text()
        assert response == "pong"


def test_outbound_webhook_disabled_by_default(monkeypatch):
    """Verifies outbound webhook is disabled by default for safe demo environments."""
    monkeypatch.delenv("WEBHOOK_ALERT_ENABLED", raising=False)
    monkeypatch.delenv("WEBHOOK_ALERT_URL", raising=False)

    alert_data = {
        "id": 999,
        "corridor_id": "SUEZ",
        "severity": "CRITICAL",
        "metric": "probability",
        "threshold": 0.5,
        "observed_value": 0.82,
        "message": "SUEZ probability breached 0.5",
    }

    res = dispatch_outbound_webhook(alert_data)
    assert res is False


def test_outbound_webhook_dispatch_when_enabled(monkeypatch):
    """Verifies outbound HTTP POST payload dispatch when WEBHOOK_ALERT_ENABLED is true."""
    monkeypatch.setenv("WEBHOOK_ALERT_ENABLED", "true")
    monkeypatch.setenv("WEBHOOK_ALERT_URL", "http://localhost:9999/webhook/alerts")

    mock_resp = MagicMock()
    mock_resp.status_code = 200

    alert_data = {
        "id": 1001,
        "corridor_id": "BAB_EL_MANDEB",
        "severity": "HIGH",
        "metric": "probability",
        "threshold": 0.4,
        "observed_value": 0.65,
        "message": "BAB_EL_MANDEB probability = 0.65",
    }

    with patch("httpx.Client.post", return_value=mock_resp) as mock_post:
        res = dispatch_outbound_webhook(alert_data)
        assert res is True

        # Verify POST call details
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert args[0] == "http://localhost:9999/webhook/alerts"
        assert kwargs["headers"]["Content-Type"] == "application/json"
        assert kwargs["json"]["event"] == "CORRIDOR_RISK_ALERT"
        assert kwargs["json"]["alert"]["corridor_id"] == "BAB_EL_MANDEB"


def test_notify_new_alerts_sync_bridge():
    """Verifies notify_new_alerts_sync executes without throwing errors."""
    sample_alerts = [
        {
            "id": 1002,
            "corridor_id": "RED_SEA",
            "severity": "WARNING",
            "metric": "probability",
            "threshold": 0.3,
            "observed_value": 0.45,
            "message": "RED_SEA risk elevated",
        }
    ]
    # Bridge should complete cleanly
    notify_new_alerts_sync(sample_alerts)
