"""
WebSocket Route Handler — Phase 20
Surfaces live WebSocket endpoint /ws/alerts for real-time corridor risk alert push.
"""

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from src.api.services.websocket_service import alert_ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Real-Time Push"])


@router.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """
    WebSocket endpoint for real-time corridor risk alert push stream.
    Clients receive immediate JSON payloads whenever a corridor crosses a risk threshold.
    """
    await alert_ws_manager.connect(websocket)
    try:
        # Send initial confirmation message
        await websocket.send_json({
            "type": "CONNECTED",
            "message": "Subscribed to live corridor risk alert stream.",
            "client_count": len(alert_ws_manager.active_connections)
        })
        while True:
            # Keep connection open; handle client ping/pong heartbeat
            data = await websocket.receive_text()
            if data.strip().lower() == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        alert_ws_manager.disconnect(websocket)
    except Exception as exc:
        logger.warning(f"WebSocket error on /ws/alerts: {exc}")
        alert_ws_manager.disconnect(websocket)
