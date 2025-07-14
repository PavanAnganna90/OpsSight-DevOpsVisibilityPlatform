"""
Tests for the enhanced Slack notification service.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta

from app.services.slack_notification_service import (
    SlackNotificationService,
    SlackUserMapper,
    SlackDigestFormatter,
)
from app.models.user import User
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.notification_log import NotificationLog


@pytest.fixture
def mock_user():
    """Create a mock user."""
    user = MagicMock(spec=User)
    user.id = 1
    user.email = "test@example.com"
    user.github_username = "testuser"
    user.full_name = "Test User"
    return user


@pytest.fixture
def mock_alert():
    """Create a mock alert."""
    alert = MagicMock(spec=Alert)
    alert.id = 1
    alert.title = "Test Alert"
    alert.message = "This is a test alert"
    alert.severity = AlertSeverity.HIGH
    alert.status = AlertStatus.ACTIVE
    alert.source = "test-service"
    alert.category = "infrastructure"
    alert.triggered_at = datetime.utcnow()
    return alert


@pytest.fixture
def mock_notification_log():
    """Create a mock notification log."""
    log = MagicMock(spec=NotificationLog)
    log.notification_id = "test-notification-123"
    return log


@pytest.fixture
def slack_user_mapper():
    """Create SlackUserMapper with mocked SlackService."""
    mock_slack_service = MagicMock()
    mock_slack_service.bot_token = "test-token"
    mock_slack_service.rate_limiter = MagicMock()
    mock_slack_service.rate_limiter.wait_if_needed = AsyncMock()
    mock_slack_service.client = MagicMock()
    mock_slack_service.api_base_url = "https://slack.com/api"

    return SlackUserMapper(mock_slack_service)


@pytest.fixture
def slack_notification_service():
    """Create SlackNotificationService with mocked dependencies."""
    with patch(
        "app.services.slack_notification_service.SlackService"
    ) as mock_slack_service_class:
        mock_slack_service = MagicMock()
        mock_slack_service_class.return_value = mock_slack_service

        service = SlackNotificationService()
        return service


class TestSlackUserMapper:
    """Test SlackUserMapper functionality."""

    @pytest.mark.asyncio
    async def test_find_user_by_email_success(self, slack_user_mapper, mock_user):
        """Test successful user lookup by email."""
        # Mock successful API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"ok": True, "user": {"id": "U123456"}}

        slack_user_mapper.slack_service.client.get = AsyncMock(
            return_value=mock_response
        )

        result = await slack_user_mapper._find_user_by_email(mock_user.email)

        assert result == "U123456"
        slack_user_mapper.slack_service.client.get.assert_called_once()

    @pytest.mark.asyncio
    async def test_find_user_by_email_not_found(self, slack_user_mapper, mock_user):
        """Test user lookup by email when not found."""
        # Mock API response with user not found
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"ok": False, "error": "users_not_found"}

        slack_user_mapper.slack_service.client.get = AsyncMock(
            return_value=mock_response
        )

        result = await slack_user_mapper._find_user_by_email(mock_user.email)

        assert result is None

    @pytest.mark.asyncio
    async def test_find_user_by_display_name_success(self, slack_user_mapper):
        """Test successful user lookup by display name."""
        # Mock users.list API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "ok": True,
            "members": [
                {
                    "id": "U123456",
                    "profile": {"display_name": "testuser", "real_name": "Test User"},
                },
                {
                    "id": "U789012",
                    "profile": {"display_name": "otheruser", "real_name": "Other User"},
                },
            ],
        }

        slack_user_mapper.slack_service.client.get = AsyncMock(
            return_value=mock_response
        )

        result = await slack_user_mapper._find_user_by_display_name("testuser")

        assert result == "U123456"

    @pytest.mark.asyncio
    async def test_get_slack_user_id_with_cache(self, slack_user_mapper, mock_user):
        """Test user ID retrieval with caching."""
        # Pre-populate cache
        cache_key = f"user_{mock_user.id}"
        slack_user_mapper._user_cache[cache_key] = "U123456"
        slack_user_mapper._cache_expiry[cache_key] = datetime.utcnow() + timedelta(
            minutes=30
        )

        result = await slack_user_mapper.get_slack_user_id(mock_user)

        assert result == "U123456"
        # Should not make API calls when cached
        assert not hasattr(slack_user_mapper.slack_service.client, "get")

    @pytest.mark.asyncio
    async def test_get_slack_user_id_no_token(self, slack_user_mapper, mock_user):
        """Test user ID retrieval when no bot token is configured."""
        slack_user_mapper.slack_service.bot_token = None

        result = await slack_user_mapper.get_slack_user_id(mock_user)

        assert result is None

    def test_clear_cache(self, slack_user_mapper):
        """Test cache clearing."""
        # Populate cache
        slack_user_mapper._user_cache["test"] = "value"
        slack_user_mapper._cache_expiry["test"] = datetime.utcnow()

        slack_user_mapper.clear_cache()

        assert len(slack_user_mapper._user_cache) == 0
        assert len(slack_user_mapper._cache_expiry) == 0


class TestSlackDigestFormatter:
    """Test SlackDigestFormatter functionality."""

    def test_format_daily_digest_with_alerts(self):
        """Test digest formatting with alert data."""
        digest_data = {
            "date_range": "2024-01-15",
            "stats": {
                "critical_alerts": 2,
                "high_alerts": 5,
                "successful_pipelines": 10,
                "failed_pipelines": 1,
            },
            "alerts": [
                {
                    "title": "Database Connection Failed",
                    "severity": "critical",
                    "source": "monitoring",
                    "triggered_at": "2024-01-15 10:30:00",
                },
                {
                    "title": "High CPU Usage",
                    "severity": "high",
                    "source": "metrics",
                    "triggered_at": "2024-01-15 11:45:00",
                },
            ],
            "pipelines": [
                {"name": "frontend-build", "status": "success"},
                {"name": "backend-deploy", "status": "failed"},
            ],
        }

        result = SlackDigestFormatter.format_daily_digest(digest_data)

        assert "blocks" in result
        assert result["unfurl_links"] is False
        assert result["unfurl_media"] is False

        blocks = result["blocks"]
        assert len(blocks) >= 5  # Header, context, stats, alerts, pipelines, actions

        # Check header
        assert blocks[0]["type"] == "header"
        assert "Daily OpsSight Digest" in blocks[0]["text"]["text"]

        # Check that critical alerts are mentioned
        stats_block = next(
            (b for b in blocks if b["type"] == "section" and "fields" in b), None
        )
        assert stats_block is not None

        # Check action buttons
        actions_block = next((b for b in blocks if b["type"] == "actions"), None)
        assert actions_block is not None
        assert len(actions_block["elements"]) == 2

    def test_format_daily_digest_no_activity(self):
        """Test digest formatting with no activity."""
        digest_data = {
            "date_range": "2024-01-15",
            "stats": {},
            "alerts": [],
            "pipelines": [],
        }

        result = SlackDigestFormatter.format_daily_digest(digest_data)

        blocks = result["blocks"]

        # Should have a "no activity" message
        no_activity_block = next(
            (
                b
                for b in blocks
                if b["type"] == "section" and "Great job" in b["text"]["text"]
            ),
            None,
        )
        assert no_activity_block is not None


class TestSlackNotificationService:
    """Test SlackNotificationService functionality."""

    @pytest.mark.asyncio
    async def test_send_alert_notification_success(
        self, slack_notification_service, mock_user, mock_alert, mock_notification_log
    ):
        """Test successful alert notification sending."""
        # Mock user mapping
        slack_notification_service.user_mapper.get_slack_user_id = AsyncMock(
            return_value="U123456"
        )

        # Mock Slack service response
        slack_notification_service.slack_service.send_alert_notification = AsyncMock(
            return_value=True
        )

        content = {"alert": mock_alert, "include_actions": True}

        result = await slack_notification_service.send_notification(
            mock_user, content, mock_notification_log
        )

        assert result["status"] == "sent"
        assert "message_id" in result
        assert result["content"] == mock_alert.title
        assert result["channel"] == "U123456"

    @pytest.mark.asyncio
    async def test_send_digest_notification_success(
        self, slack_notification_service, mock_user, mock_notification_log
    ):
        """Test successful digest notification sending."""
        # Mock user mapping
        slack_notification_service.user_mapper.get_slack_user_id = AsyncMock(
            return_value="U123456"
        )

        # Mock Slack service response
        mock_response = {"ok": True, "ts": "1234567890.123"}
        slack_notification_service.slack_service.send_message = AsyncMock(
            return_value=mock_response
        )

        digest_data = {
            "date_range": "2024-01-15",
            "stats": {"critical_alerts": 1},
            "alerts": [],
            "pipelines": [],
        }

        content = {"digest_data": digest_data, "subject": "Daily Digest"}

        result = await slack_notification_service.send_notification(
            mock_user, content, mock_notification_log
        )

        assert result["status"] == "sent"
        assert result["message_id"] == "1234567890.123"
        assert result["content"] == "Daily Digest"

    @pytest.mark.asyncio
    async def test_send_generic_notification_with_action(
        self, slack_notification_service, mock_user, mock_notification_log
    ):
        """Test generic notification with action button."""
        # Mock user mapping
        slack_notification_service.user_mapper.get_slack_user_id = AsyncMock(
            return_value="U123456"
        )

        # Mock Slack service response
        mock_response = {"ok": True, "ts": "1234567890.123"}
        slack_notification_service.slack_service.send_message = AsyncMock(
            return_value=mock_response
        )

        content = {
            "subject": "Test Notification",
            "body": "This is a test notification",
            "action_url": "https://opssight.dev/test",
            "action_text": "View Details",
        }

        result = await slack_notification_service.send_notification(
            mock_user, content, mock_notification_log
        )

        assert result["status"] == "sent"

        # Verify action button was added
        call_args = slack_notification_service.slack_service.send_message.call_args
        message = call_args[0][1]  # Second argument (message)
        assert "blocks" in message
        assert len(message["blocks"]) == 2  # Text block + action block

    @pytest.mark.asyncio
    async def test_send_notification_user_not_found(
        self, slack_notification_service, mock_user, mock_notification_log
    ):
        """Test notification when Slack user is not found."""
        # Mock user mapping to return None
        slack_notification_service.user_mapper.get_slack_user_id = AsyncMock(
            return_value=None
        )

        content = {"subject": "Test"}

        result = await slack_notification_service.send_notification(
            mock_user, content, mock_notification_log
        )

        assert result["status"] == "failed"
        assert "Slack user not found" in result["error"]

    @pytest.mark.asyncio
    async def test_send_team_notification_alert(
        self, slack_notification_service, mock_alert
    ):
        """Test sending alert to team channel."""
        # Mock Slack service response
        slack_notification_service.slack_service.send_alert_notification = AsyncMock(
            return_value=True
        )

        content = {"alert": mock_alert}

        result = await slack_notification_service.send_team_notification(
            "#team-alerts", content
        )

        assert result["status"] == "sent"
        assert result["channel"] == "#team-alerts"
        assert result["content"] == mock_alert.title

    @pytest.mark.asyncio
    async def test_test_user_mapping_success(
        self, slack_notification_service, mock_user
    ):
        """Test user mapping testing functionality."""
        # Mock successful mapping
        slack_notification_service.user_mapper.get_slack_user_id = AsyncMock(
            return_value="U123456"
        )

        # Mock user info response
        slack_user_info = {
            "profile": {
                "real_name": "Test User",
                "display_name": "testuser",
                "email": "test@example.com",
            }
        }
        slack_notification_service.slack_service.get_user_info = AsyncMock(
            return_value=slack_user_info
        )

        result = await slack_notification_service.test_user_mapping(mock_user)

        assert result["user_id"] == mock_user.id
        assert result["slack_user_id"] == "U123456"
        assert result["mapping_successful"] is True
        assert result["slack_user_info"]["real_name"] == "Test User"

    @pytest.mark.asyncio
    async def test_test_user_mapping_failure(
        self, slack_notification_service, mock_user
    ):
        """Test user mapping testing when mapping fails."""
        # Mock failed mapping
        slack_notification_service.user_mapper.get_slack_user_id = AsyncMock(
            return_value=None
        )

        result = await slack_notification_service.test_user_mapping(mock_user)

        assert result["user_id"] == mock_user.id
        assert result["slack_user_id"] is None
        assert result["mapping_successful"] is False

    @pytest.mark.asyncio
    async def test_clear_user_cache(self, slack_notification_service):
        """Test clearing user cache."""
        # Mock cache clearing
        slack_notification_service.user_mapper.clear_cache = MagicMock()

        await slack_notification_service.clear_user_cache()

        slack_notification_service.user_mapper.clear_cache.assert_called_once()
