"""
WebSocket & Outbound Webhook Service — Phase 20
Manages live WebSocket client connections for real-time corridor risk alert pushes.
Includes optional outbound HTTP webhook dispatcher gated by environment variables.
"""

import os
import json
import logging
import asyncio
import datetime
from typing import List, Dict, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
import httpx

logger = logging.getLogger(__name__)


class AlertWebSocketManager:
    """
    Manages active WebSocket connections for live risk alert streaming.
    """

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast_alert(self, alert_data: Dict[str, Any]):
        """
        Broadcasts a single risk alert payload to all connected WebSocket clients.
        """
        if not self.active_connections:
            return

        message = {
            "type": "ALERT_TRIGGERED",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "alert": alert_data,
        }
        json_msg = json.dumps(message)
        disconnected = []

        for connection in self.active_connections:
            try:
                await connection.send_text(json_msg)
            except Exception as e:
                logger.warning(f"Failed to send WebSocket message: {e}")
                disconnected.append(connection)

        for dead_conn in disconnected:
            self.disconnect(dead_conn)

    async def broadcast_alerts(self, alerts: List[Dict[str, Any]]):
        """
        Broadcasts multiple risk alert payloads to all connected WebSocket clients.
        """
        for alert in alerts:
            await self.broadcast_alert(alert)


# Singleton connection manager instance
alert_ws_manager = AlertWebSocketManager()


def dispatch_outbound_webhook(alert_data: Dict[str, Any]) -> bool:
    """
    Dispatches a POST request with the alert payload to WEBHOOK_ALERT_URL.
    Gated behind WEBHOOK_ALERT_ENABLED=true (off by default for safe demo environments).
    """
    enabled = os.getenv("WEBHOOK_ALERT_ENABLED", "false").lower() in ("true", "1", "yes")
    webhook_url = os.getenv("WEBHOOK_ALERT_URL", "").strip()

    if not enabled or not webhook_url:
        logger.debug("Outbound webhook disabled or URL unconfigured. Skipping dispatch.")
        return False

    try:
        payload = {
            "event": "CORRIDOR_RISK_ALERT",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "alert": alert_data,
        }
        headers = {"Content-Type": "application/json"}
        with httpx.Client(timeout=5.0) as client:
            resp = client.post(webhook_url, json=payload, headers=headers)
            logger.info(f"Outbound webhook dispatched to {webhook_url} (status={resp.status_code})")
            return resp.status_code in (200, 201, 202, 204)
    except Exception as e:
        logger.error(f"Outbound alert webhook dispatch failed: {e}")
        return False


def notify_new_alerts_sync(alerts: List[Dict[str, Any]]):
    """
    Synchronous bridge called by alert_service.evaluate_alerts to push live alerts
    to active WebSocket connections and trigger outbound webhooks.
    """
    if not alerts:
        return

    # 1. Outbound Webhook dispatch (per alert)
    for alert in alerts:
        dispatch_outbound_webhook(alert)

    # 2. WebSocket broadcast
    try:
        loop = asyncio.get_running_loop()
        if loop.is_running():
            loop.create_task(alert_ws_manager.broadcast_alerts(alerts))
    except RuntimeError:
        # No running loop in current thread; execute using asyncio.run
        try:
            asyncio.run(alert_ws_manager.broadcast_alerts(alerts))
        except Exception as e:
            logger.warning(f"Could not broadcast alert via WebSocket loop: {e}")
