"""
WebSocket service for real-time updates and notifications.
Handles pipeline status updates, alerts, and system notifications.
"""

import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Set, Any, Optional, Union
from dataclasses import dataclass, asdict
from enum import Enum

from fastapi import WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.models.project import Project

logger = logging.getLogger(__name__)


class MessageType(Enum):
    """WebSocket message types."""

    PIPELINE_UPDATE = "pipeline_update"
    PIPELINE_RUN_STARTED = "pipeline_run_started"
    PIPELINE_RUN_COMPLETED = "pipeline_run_completed"
    ALERT_CREATED = "alert_created"
    ALERT_RESOLVED = "alert_resolved"
    SYSTEM_NOTIFICATION = "system_notification"
    HEARTBEAT = "heartbeat"
    ERROR = "error"
    AUTHENTICATION = "authentication"


@dataclass
class WebSocketMessage:
    """WebSocket message structure."""

    type: MessageType
    payload: Dict[str, Any]
    timestamp: datetime
    user_id: Optional[int] = None
    project_id: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary for JSON serialization."""
        return {
            "type": self.type.value,
            "payload": self.payload,
            "timestamp": self.timestamp.isoformat(),
            "user_id": self.user_id,
            "project_id": self.project_id,
        }


@dataclass
class ConnectionInfo:
    """WebSocket connection information."""

    websocket: WebSocket
    user_id: int
    project_ids: Set[int]
    connected_at: datetime
    last_heartbeat: datetime


class WebSocketManager:
    """
    WebSocket connection manager for real-time updates.
    Handles connection lifecycle, message broadcasting, and user subscriptions.
    """

    def __init__(self):
        """Initialize WebSocket manager."""
        self.connections: Dict[str, ConnectionInfo] = {}
        self.user_connections: Dict[int, Set[str]] = {}
        self.project_subscriptions: Dict[int, Set[str]] = {}
        self.heartbeat_interval = 30  # seconds
        self.cleanup_interval = 60  # seconds
        self._cleanup_task: Optional[asyncio.Task] = None

    async def connect(
        self, websocket: WebSocket, user_id: int, project_ids: List[int]
    ) -> str:
        """
        Accept new WebSocket connection and register user subscriptions.

        Args:
            websocket (WebSocket): FastAPI WebSocket instance
            user_id (int): Authenticated user ID
            project_ids (List[int]): Project IDs user has access to

        Returns:
            str: Connection ID
        """
        await websocket.accept()

        # Generate connection ID
        connection_id = f"{user_id}_{datetime.now().timestamp()}"

        # Store connection info
        connection_info = ConnectionInfo(
            websocket=websocket,
            user_id=user_id,
            project_ids=set(project_ids),
            connected_at=datetime.now(timezone.utc),
            last_heartbeat=datetime.now(timezone.utc),
        )

        self.connections[connection_id] = connection_info

        # Update user connections tracking
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(connection_id)

        # Update project subscriptions
        for project_id in project_ids:
            if project_id not in self.project_subscriptions:
                self.project_subscriptions[project_id] = set()
            self.project_subscriptions[project_id].add(connection_id)

        # Start cleanup task if not running
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._periodic_cleanup())

        logger.info(
            f"WebSocket connected: user_id={user_id}, connection_id={connection_id}"
        )

        # Send welcome message
        welcome_message = WebSocketMessage(
            type=MessageType.SYSTEM_NOTIFICATION,
            payload={
                "message": "Connected to OpsSight real-time updates",
                "connection_id": connection_id,
                "projects": list(project_ids),
            },
            timestamp=datetime.now(timezone.utc),
            user_id=user_id,
        )
        await self._send_to_connection(connection_id, welcome_message)

        return connection_id

    async def disconnect(self, connection_id: str):
        """
        Handle WebSocket disconnection and cleanup subscriptions.

        Args:
            connection_id (str): Connection ID to disconnect
        """
        if connection_id not in self.connections:
            return

        connection_info = self.connections[connection_id]
        user_id = connection_info.user_id

        # Remove from user connections
        if user_id in self.user_connections:
            self.user_connections[user_id].discard(connection_id)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

        # Remove from project subscriptions
        for project_id in connection_info.project_ids:
            if project_id in self.project_subscriptions:
                self.project_subscriptions[project_id].discard(connection_id)
                if not self.project_subscriptions[project_id]:
                    del self.project_subscriptions[project_id]

        # Remove connection
        del self.connections[connection_id]

        logger.info(
            f"WebSocket disconnected: user_id={user_id}, connection_id={connection_id}"
        )

    async def broadcast_to_project(self, project_id: int, message: WebSocketMessage):
        """
        Broadcast message to all connections subscribed to a project.

        Args:
            project_id (int): Project ID
            message (WebSocketMessage): Message to broadcast
        """
        if project_id not in self.project_subscriptions:
            return

        connection_ids = self.project_subscriptions[project_id].copy()

        # Send to all project subscribers
        for connection_id in connection_ids:
            await self._send_to_connection(connection_id, message)

        logger.debug(
            f"Broadcasted to project {project_id}: {len(connection_ids)} connections"
        )

    async def send_to_user(self, user_id: int, message: WebSocketMessage):
        """
        Send message to all connections for a specific user.

        Args:
            user_id (int): User ID
            message (WebSocketMessage): Message to send
        """
        if user_id not in self.user_connections:
            return

        connection_ids = self.user_connections[user_id].copy()

        # Send to all user connections
        for connection_id in connection_ids:
            await self._send_to_connection(connection_id, message)

        logger.debug(f"Sent to user {user_id}: {len(connection_ids)} connections")

    async def broadcast_system_notification(self, message: str, level: str = "info"):
        """
        Broadcast system notification to all connected users.

        Args:
            message (str): Notification message
            level (str): Notification level (info, warning, error)
        """
        notification = WebSocketMessage(
            type=MessageType.SYSTEM_NOTIFICATION,
            payload={"message": message, "level": level, "system": True},
            timestamp=datetime.now(timezone.utc),
        )

        connection_ids = list(self.connections.keys())
        for connection_id in connection_ids:
            await self._send_to_connection(connection_id, notification)

        logger.info(
            f"System notification broadcasted to {len(connection_ids)} connections"
        )

    async def handle_heartbeat(self, connection_id: str):
        """
        Handle heartbeat from client to keep connection alive.

        Args:
            connection_id (str): Connection ID
        """
        if connection_id in self.connections:
            self.connections[connection_id].last_heartbeat = datetime.now(timezone.utc)

            # Send heartbeat response
            heartbeat_message = WebSocketMessage(
                type=MessageType.HEARTBEAT,
                payload={"status": "alive"},
                timestamp=datetime.now(timezone.utc),
            )
            await self._send_to_connection(connection_id, heartbeat_message)

    async def _send_to_connection(self, connection_id: str, message: WebSocketMessage):
        """
        Send message to specific connection with error handling.

        Args:
            connection_id (str): Connection ID
            message (WebSocketMessage): Message to send
        """
        if connection_id not in self.connections:
            return

        try:
            websocket = self.connections[connection_id].websocket
            await websocket.send_text(json.dumps(message.to_dict()))

        except WebSocketDisconnect:
            await self.disconnect(connection_id)
        except Exception as e:
            logger.error(f"Error sending WebSocket message to {connection_id}: {e}")
            await self.disconnect(connection_id)

    async def _periodic_cleanup(self):
        """Periodic cleanup of stale connections."""
        while True:
            try:
                await asyncio.sleep(self.cleanup_interval)
                await self._cleanup_stale_connections()
            except Exception as e:
                logger.error(f"Error in periodic cleanup: {e}")

    async def _cleanup_stale_connections(self):
        """Remove connections that haven't sent heartbeat recently."""
        now = datetime.now(timezone.utc)
        stale_connections = []

        for connection_id, connection_info in self.connections.items():
            time_since_heartbeat = (
                now - connection_info.last_heartbeat
            ).total_seconds()
            if (
                time_since_heartbeat > self.heartbeat_interval * 3
            ):  # 3x heartbeat interval
                stale_connections.append(connection_id)

        for connection_id in stale_connections:
            logger.warning(f"Cleaning up stale connection: {connection_id}")
            await self.disconnect(connection_id)

    def get_connection_stats(self) -> Dict[str, Any]:
        """
        Get connection statistics.

        Returns:
            Dict[str, Any]: Connection statistics
        """
        return {
            "total_connections": len(self.connections),
            "total_users": len(self.user_connections),
            "total_project_subscriptions": len(self.project_subscriptions),
            "connections_per_user": {
                user_id: len(connections)
                for user_id, connections in self.user_connections.items()
            },
            "subscriptions_per_project": {
                project_id: len(connections)
                for project_id, connections in self.project_subscriptions.items()
            },
        }


# Create singleton instance
websocket_manager = WebSocketManager()


class PipelineUpdateNotifier:
    """
    Service for sending pipeline-related real-time updates.
    Integrates with WebSocket manager to notify users of pipeline changes.
    """

    def __init__(self, ws_manager: WebSocketManager):
        """Initialize with WebSocket manager."""
        self.ws_manager = ws_manager

    async def notify_pipeline_run_started(
        self, project_id: int, pipeline_id: int, run_data: Dict[str, Any]
    ):
        """Notify users when a pipeline run starts."""
        message = WebSocketMessage(
            type=MessageType.PIPELINE_RUN_STARTED,
            payload={
                "pipeline_id": pipeline_id,
                "run_id": run_data.get("id"),
                "name": run_data.get("name"),
                "branch": run_data.get("branch"),
                "commit_sha": run_data.get("commit_sha"),
                "started_at": run_data.get("started_at"),
                "external_url": run_data.get("external_url"),
            },
            timestamp=datetime.now(timezone.utc),
            project_id=project_id,
        )

        await self.ws_manager.broadcast_to_project(project_id, message)

    async def notify_pipeline_run_completed(
        self, project_id: int, pipeline_id: int, run_data: Dict[str, Any]
    ):
        """Notify users when a pipeline run completes."""
        message = WebSocketMessage(
            type=MessageType.PIPELINE_RUN_COMPLETED,
            payload={
                "pipeline_id": pipeline_id,
                "run_id": run_data.get("id"),
                "name": run_data.get("name"),
                "status": run_data.get("status"),
                "branch": run_data.get("branch"),
                "commit_sha": run_data.get("commit_sha"),
                "completed_at": run_data.get("completed_at"),
                "duration_seconds": run_data.get("duration_seconds"),
                "external_url": run_data.get("external_url"),
                "success": run_data.get("status") == "success",
            },
            timestamp=datetime.now(timezone.utc),
            project_id=project_id,
        )

        await self.ws_manager.broadcast_to_project(project_id, message)

    async def notify_pipeline_update(
        self, project_id: int, pipeline_data: Dict[str, Any]
    ):
        """Notify users of general pipeline updates."""
        message = WebSocketMessage(
            type=MessageType.PIPELINE_UPDATE,
            payload=pipeline_data,
            timestamp=datetime.now(timezone.utc),
            project_id=project_id,
        )

        await self.ws_manager.broadcast_to_project(project_id, message)


# Create pipeline notifier instance
pipeline_notifier = PipelineUpdateNotifier(websocket_manager)
