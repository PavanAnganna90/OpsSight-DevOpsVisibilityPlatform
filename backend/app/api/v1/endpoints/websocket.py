"""
WebSocket API endpoints for real-time updates.
Handles WebSocket connections, authentication, and real-time notifications.
"""

import json
import logging
from typing import List, Optional

from fastapi import (
    APIRouter,
    WebSocket,
    WebSocketDisconnect,
    Depends,
    HTTPException,
    status,
    Query,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_async_db
from app.core.auth import get_current_user_websocket, get_current_user
from app.models.user import User
from app.models.project import Project
from app.services.websocket_service import websocket_manager, MessageType
from app.services.background_tasks import background_task_manager

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_async_db),
):
    """
    WebSocket endpoint for real-time updates.

    Query Parameters:
        token (str): Authentication token
    """
    try:
        # Authenticate user via token
        if not token:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="Authentication token required",
            )
            return

        # Get current user from token (implement this in auth module)
        try:
            current_user = await get_current_user_websocket(token, db)
        except Exception as e:
            logger.error(f"WebSocket authentication failed: {e}")
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="Invalid authentication token",
            )
            return

        # Get user's accessible projects
        user_projects = await db.execute(
            Project.query.filter(Project.is_accessible_by_user(current_user))
        )

        project_ids = [project.id for project in user_projects.scalars().all()]

        # Connect to WebSocket manager
        connection_id = await websocket_manager.connect(
            websocket=websocket, user_id=current_user.id, project_ids=project_ids
        )

        logger.info(
            f"WebSocket connected: user={current_user.email}, projects={len(project_ids)}"
        )

        try:
            # Listen for messages from client
            while True:
                data = await websocket.receive_text()

                try:
                    message = json.loads(data)
                    await handle_client_message(connection_id, message)

                except json.JSONDecodeError:
                    logger.warning(
                        f"Invalid JSON received from {connection_id}: {data}"
                    )
                    continue
                except Exception as e:
                    logger.error(f"Error handling message from {connection_id}: {e}")
                    continue

        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected: {connection_id}")
        except Exception as e:
            logger.error(f"WebSocket error for {connection_id}: {e}")
        finally:
            await websocket_manager.disconnect(connection_id)

    except Exception as e:
        logger.error(f"WebSocket endpoint error: {e}")
        try:
            await websocket.close(
                code=status.WS_1011_INTERNAL_ERROR, reason="Internal server error"
            )
        except:
            pass


async def handle_client_message(connection_id: str, message: dict):
    """
    Handle messages received from WebSocket clients.

    Args:
        connection_id (str): Connection ID
        message (dict): Message from client
    """
    message_type = message.get("type")

    if message_type == "heartbeat":
        # Handle heartbeat from client
        await websocket_manager.handle_heartbeat(connection_id)

    elif message_type == "subscribe_project":
        # Handle project subscription request
        project_id = message.get("project_id")
        if project_id:
            # Verify user has access to project (would need access control logic)
            logger.debug(
                f"Project subscription request: {connection_id} -> {project_id}"
            )

    elif message_type == "request_pipeline_status":
        # Handle request for current pipeline status
        project_id = message.get("project_id")
        if project_id:
            logger.debug(f"Pipeline status request: {connection_id} -> {project_id}")
            # Would implement pipeline status fetching and sending

    else:
        logger.warning(f"Unknown message type from {connection_id}: {message_type}")


@router.get("/ws/status")
async def get_websocket_status(current_user: User = Depends(get_current_user)):
    """
    Get WebSocket connection statistics.

    Returns:
        Dict[str, Any]: Connection statistics and health info
    """
    stats = websocket_manager.get_connection_stats()
    task_status = background_task_manager.get_task_status()

    return {
        "websocket": stats,
        "background_tasks": task_status,
        "health": "healthy" if task_status["running"] else "degraded",
    }


@router.post("/ws/broadcast")
async def broadcast_system_notification(
    message: str, level: str = "info", current_user: User = Depends(get_current_user)
):
    """
    Broadcast system notification to all connected users.
    Requires admin privileges.

    Args:
        message (str): Notification message
        level (str): Notification level (info, warning, error)
    """
    # Check if user has admin privileges (implement permission check)
    if not hasattr(current_user, "is_admin") or not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required"
        )

    await websocket_manager.broadcast_system_notification(message, level)

    return {
        "message": "Notification broadcasted successfully",
        "level": level,
        "broadcast_message": message,
    }


@router.post("/background-tasks/start")
async def start_background_tasks(current_user: User = Depends(get_current_user)):
    """
    Start background task processing.
    Requires admin privileges.
    """
    # Check admin privileges
    if not hasattr(current_user, "is_admin") or not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required"
        )

    if background_task_manager.running:
        return {"message": "Background tasks already running"}

    await background_task_manager.start()

    return {
        "message": "Background tasks started successfully",
        "status": background_task_manager.get_task_status(),
    }


@router.post("/background-tasks/stop")
async def stop_background_tasks(current_user: User = Depends(get_current_user)):
    """
    Stop background task processing.
    Requires admin privileges.
    """
    # Check admin privileges
    if not hasattr(current_user, "is_admin") or not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required"
        )

    if not background_task_manager.running:
        return {"message": "Background tasks already stopped"}

    await background_task_manager.stop()

    return {
        "message": "Background tasks stopped successfully",
        "status": background_task_manager.get_task_status(),
    }
