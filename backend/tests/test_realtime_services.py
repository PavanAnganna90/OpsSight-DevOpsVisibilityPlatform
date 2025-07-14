"""
Tests for real-time services including WebSocket and background tasks.
Tests WebSocket connections, message handling, and background task processing.
"""

import asyncio
import json
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import Mock, AsyncMock, patch
from httpx import AsyncClient, ASGITransport

from app.services.websocket_service import (
    WebSocketManager,
    PipelineUpdateNotifier,
    WebSocketMessage,
    MessageType,
)
from app.services.background_tasks import BackgroundTaskManager, TaskStatus
from app.models.user import User
from app.models.project import Project
from app.models.pipeline import Pipeline, PipelineRun, PipelineStatus
from app.main import app


class TestWebSocketManager:
    """Test WebSocket connection management."""

    @pytest.fixture
    def ws_manager(self):
        """Create WebSocket manager instance."""
        return WebSocketManager()

    @pytest.fixture
    def mock_websocket(self):
        """Create mock WebSocket."""
        websocket = Mock(spec=WebSocket)
        websocket.accept = AsyncMock()
        websocket.send_text = AsyncMock()
        websocket.receive_text = AsyncMock()
        return websocket

    @pytest.mark.asyncio
    async def test_connect_websocket(self, ws_manager, mock_websocket):
        """Test WebSocket connection establishment."""
        user_id = 1
        project_ids = [1, 2, 3]

        connection_id = await ws_manager.connect(
            websocket=mock_websocket, user_id=user_id, project_ids=project_ids
        )

        # Verify connection was established
        assert connection_id in ws_manager.connections
        assert user_id in ws_manager.user_connections
        assert connection_id in ws_manager.user_connections[user_id]

        # Verify project subscriptions
        for project_id in project_ids:
            assert project_id in ws_manager.project_subscriptions
            assert connection_id in ws_manager.project_subscriptions[project_id]

        # Verify WebSocket was accepted and welcome message sent
        mock_websocket.accept.assert_called_once()
        mock_websocket.send_text.assert_called_once()

    @pytest.mark.asyncio
    async def test_disconnect_websocket(self, ws_manager, mock_websocket):
        """Test WebSocket disconnection cleanup."""
        user_id = 1
        project_ids = [1, 2]

        # Connect first
        connection_id = await ws_manager.connect(
            websocket=mock_websocket, user_id=user_id, project_ids=project_ids
        )

        # Disconnect
        await ws_manager.disconnect(connection_id)

        # Verify cleanup
        assert connection_id not in ws_manager.connections
        assert (
            user_id not in ws_manager.user_connections
            or not ws_manager.user_connections[user_id]
        )

        for project_id in project_ids:
            assert (
                project_id not in ws_manager.project_subscriptions
                or connection_id not in ws_manager.project_subscriptions[project_id]
            )

    @pytest.mark.asyncio
    async def test_broadcast_to_project(self, ws_manager, mock_websocket):
        """Test broadcasting messages to project subscribers."""
        user_id = 1
        project_id = 1

        # Connect user to project
        connection_id = await ws_manager.connect(
            websocket=mock_websocket, user_id=user_id, project_ids=[project_id]
        )

        # Create test message
        message = WebSocketMessage(
            type=MessageType.PIPELINE_UPDATE,
            payload={"test": "data"},
            timestamp=datetime.now(timezone.utc),
            project_id=project_id,
        )

        # Broadcast message
        await ws_manager.broadcast_to_project(project_id, message)

        # Verify message was sent (account for welcome message + broadcast)
        assert mock_websocket.send_text.call_count == 2

    @pytest.mark.asyncio
    async def test_send_to_user(self, ws_manager, mock_websocket):
        """Test sending messages to specific user."""
        user_id = 1

        # Connect user
        connection_id = await ws_manager.connect(
            websocket=mock_websocket, user_id=user_id, project_ids=[1]
        )

        # Create test message
        message = WebSocketMessage(
            type=MessageType.SYSTEM_NOTIFICATION,
            payload={"message": "Test notification"},
            timestamp=datetime.now(timezone.utc),
            user_id=user_id,
        )

        # Send message to user
        await ws_manager.send_to_user(user_id, message)

        # Verify message was sent (welcome + user message)
        assert mock_websocket.send_text.call_count == 2

    @pytest.mark.asyncio
    async def test_heartbeat_handling(self, ws_manager, mock_websocket):
        """Test heartbeat message handling."""
        user_id = 1

        # Connect user
        connection_id = await ws_manager.connect(
            websocket=mock_websocket, user_id=user_id, project_ids=[1]
        )

        # Handle heartbeat
        await ws_manager.handle_heartbeat(connection_id)

        # Verify heartbeat response was sent
        assert mock_websocket.send_text.call_count == 2  # Welcome + heartbeat

    @pytest.mark.asyncio
    async def test_websocket_error_handling(self, ws_manager, mock_websocket):
        """Test WebSocket error handling and cleanup."""
        user_id = 1

        # Setup mock to raise exception on send
        mock_websocket.send_text.side_effect = Exception("Connection lost")

        # Connect user
        connection_id = await ws_manager.connect(
            websocket=mock_websocket, user_id=user_id, project_ids=[1]
        )

        # Connection should be automatically cleaned up due to error
        assert connection_id not in ws_manager.connections

    def test_connection_stats(self, ws_manager):
        """Test connection statistics retrieval."""
        stats = ws_manager.get_connection_stats()

        assert "total_connections" in stats
        assert "total_users" in stats
        assert "total_project_subscriptions" in stats
        assert "connections_per_user" in stats
        assert "subscriptions_per_project" in stats


class TestPipelineUpdateNotifier:
    """Test pipeline update notifications."""

    @pytest.fixture
    def mock_ws_manager(self):
        """Create mock WebSocket manager."""
        manager = Mock(spec=WebSocketManager)
        manager.broadcast_to_project = AsyncMock()
        return manager

    @pytest.fixture
    def notifier(self, mock_ws_manager):
        """Create pipeline update notifier."""
        return PipelineUpdateNotifier(mock_ws_manager)

    @pytest.mark.asyncio
    async def test_notify_pipeline_run_started(self, notifier, mock_ws_manager):
        """Test pipeline run started notification."""
        project_id = 1
        pipeline_id = 1
        run_data = {
            "id": "run_123",
            "name": "Build Pipeline",
            "branch": "main",
            "commit_sha": "abc123",
            "started_at": "2023-01-01T00:00:00Z",
            "external_url": "https://github.com/owner/repo/actions/runs/123",
        }

        await notifier.notify_pipeline_run_started(
            project_id=project_id, pipeline_id=pipeline_id, run_data=run_data
        )

        # Verify broadcast was called
        mock_ws_manager.broadcast_to_project.assert_called_once()
        call_args = mock_ws_manager.broadcast_to_project.call_args

        assert call_args[0][0] == project_id  # project_id
        assert call_args[0][1].type == MessageType.PIPELINE_RUN_STARTED
        assert call_args[0][1].payload["pipeline_id"] == pipeline_id
        assert call_args[0][1].payload["run_id"] == "run_123"

    @pytest.mark.asyncio
    async def test_notify_pipeline_run_completed(self, notifier, mock_ws_manager):
        """Test pipeline run completed notification."""
        project_id = 1
        pipeline_id = 1
        run_data = {
            "id": "run_123",
            "name": "Build Pipeline",
            "status": "success",
            "branch": "main",
            "commit_sha": "abc123",
            "completed_at": "2023-01-01T01:00:00Z",
            "duration_seconds": 3600,
            "external_url": "https://github.com/owner/repo/actions/runs/123",
        }

        await notifier.notify_pipeline_run_completed(
            project_id=project_id, pipeline_id=pipeline_id, run_data=run_data
        )

        # Verify broadcast was called
        mock_ws_manager.broadcast_to_project.assert_called_once()
        call_args = mock_ws_manager.broadcast_to_project.call_args

        assert call_args[0][0] == project_id
        assert call_args[0][1].type == MessageType.PIPELINE_RUN_COMPLETED
        assert call_args[0][1].payload["success"] is True


class TestBackgroundTaskManager:
    """Test background task management."""

    @pytest.fixture
    def task_manager(self):
        """Create background task manager instance."""
        return BackgroundTaskManager()

    @pytest.mark.asyncio
    async def test_start_background_tasks(self, task_manager):
        """Test starting background tasks."""
        await task_manager.start()

        assert task_manager.running is True
        assert len(task_manager.tasks) > 0
        assert len(task_manager.task_metrics) > 0

        # Clean up
        await task_manager.stop()

    @pytest.mark.asyncio
    async def test_stop_background_tasks(self, task_manager):
        """Test stopping background tasks."""
        await task_manager.start()
        await task_manager.stop()

        assert task_manager.running is False
        assert len(task_manager.tasks) == 0

    def test_task_metrics_update(self, task_manager):
        """Test task metrics updating."""
        task_name = "test_task"

        # Update metrics for successful run
        task_manager._update_task_metrics(task_name, True, 5.0)

        metrics = task_manager.task_metrics[task_name]
        assert metrics.total_runs == 1
        assert metrics.successful_runs == 1
        assert metrics.failed_runs == 0
        assert metrics.average_duration_seconds == 5.0

        # Update metrics for failed run
        task_manager._update_task_metrics(task_name, False, 3.0, "Test error")

        assert metrics.total_runs == 2
        assert metrics.successful_runs == 1
        assert metrics.failed_runs == 1
        assert metrics.average_duration_seconds == 4.0  # (5.0 + 3.0) / 2
        assert metrics.last_error_message == "Test error"

    def test_get_task_status(self, task_manager):
        """Test getting task status information."""
        status = task_manager.get_task_status()

        assert "running" in status
        assert "tasks" in status
        assert "configuration" in status
        assert status["running"] is False

        # Test configuration values
        config = status["configuration"]
        assert "github_sync_interval" in config
        assert "pipeline_check_interval" in config
        assert "cleanup_interval" in config


class TestWebSocketIntegration:
    """Integration tests for WebSocket functionality."""

    @pytest.mark.asyncio
    async def test_websocket_message_serialization(self):
        """Test WebSocket message serialization."""
        message = WebSocketMessage(
            type=MessageType.PIPELINE_UPDATE,
            payload={"test": "data", "number": 123},
            timestamp=datetime.now(timezone.utc),
            user_id=1,
            project_id=2,
        )

        serialized = message.to_dict()

        assert serialized["type"] == "pipeline_update"
        assert serialized["payload"]["test"] == "data"
        assert serialized["payload"]["number"] == 123
        assert serialized["user_id"] == 1
        assert serialized["project_id"] == 2
        assert "timestamp" in serialized

        # Verify JSON serialization
        json_str = json.dumps(serialized)
        assert json_str is not None

        # Verify deserialization
        deserialized = json.loads(json_str)
        assert deserialized["type"] == "pipeline_update"

    @pytest.mark.asyncio
    async def test_multiple_user_subscriptions(self):
        """Test multiple users subscribing to same project."""
        ws_manager = WebSocketManager()

        # Create mock WebSockets for two users
        ws1 = Mock(spec=WebSocket)
        ws1.accept = AsyncMock()
        ws1.send_text = AsyncMock()

        ws2 = Mock(spec=WebSocket)
        ws2.accept = AsyncMock()
        ws2.send_text = AsyncMock()

        # Connect both users to same project
        project_id = 1
        connection1 = await ws_manager.connect(ws1, user_id=1, project_ids=[project_id])
        connection2 = await ws_manager.connect(ws2, user_id=2, project_ids=[project_id])

        # Broadcast message to project
        message = WebSocketMessage(
            type=MessageType.PIPELINE_UPDATE,
            payload={"update": "test"},
            timestamp=datetime.now(timezone.utc),
            project_id=project_id,
        )

        await ws_manager.broadcast_to_project(project_id, message)

        # Verify both users received the broadcast
        assert ws1.send_text.call_count == 2  # Welcome + broadcast
        assert ws2.send_text.call_count == 2  # Welcome + broadcast

        # Clean up
        await ws_manager.disconnect(connection1)
        await ws_manager.disconnect(connection2)


@pytest.mark.asyncio
async def test_example():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get("/api/v1/realtime/some-endpoint")
    # ... existing code ...
    # ... apply similar changes to all other test functions using client ...
