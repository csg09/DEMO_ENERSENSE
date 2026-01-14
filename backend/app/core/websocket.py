"""WebSocket connection manager for real-time notifications."""

from typing import List, Dict
from fastapi import WebSocket
import json


class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""

    def __init__(self):
        # Map of tenant_id -> list of active connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, tenant_id: str):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        if tenant_id not in self.active_connections:
            self.active_connections[tenant_id] = []
        self.active_connections[tenant_id].append(websocket)

    def disconnect(self, websocket: WebSocket, tenant_id: str):
        """Remove a WebSocket connection."""
        if tenant_id in self.active_connections:
            if websocket in self.active_connections[tenant_id]:
                self.active_connections[tenant_id].remove(websocket)
            if not self.active_connections[tenant_id]:
                del self.active_connections[tenant_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a message to a specific WebSocket."""
        await websocket.send_text(message)

    async def broadcast_to_tenant(self, tenant_id: str, message: dict):
        """Broadcast a message to all connections for a tenant."""
        if tenant_id in self.active_connections:
            message_text = json.dumps(message)
            disconnected = []
            for connection in self.active_connections[tenant_id]:
                try:
                    await connection.send_text(message_text)
                except Exception:
                    disconnected.append(connection)

            # Clean up disconnected connections
            for conn in disconnected:
                self.disconnect(conn, tenant_id)

    async def broadcast_alert(self, tenant_id: str, alert: dict):
        """Broadcast a new alert notification to all tenant connections."""
        message = {
            "type": "new_alert",
            "data": alert
        }
        await self.broadcast_to_tenant(tenant_id, message)

    async def broadcast_alert_update(self, tenant_id: str, alert: dict):
        """Broadcast an alert update to all tenant connections."""
        message = {
            "type": "alert_update",
            "data": alert
        }
        await self.broadcast_to_tenant(tenant_id, message)


# Global connection manager instance
manager = ConnectionManager()
