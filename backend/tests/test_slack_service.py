"""
Tests for Slack service integration.
Tests message formatting, API calls, and OAuth flow.
"""

import pytest
import json
from unittest.mock import patch, AsyncMock, MagicMock
from datetime import datetime
import httpx

from app.services.slack_service import (
    SlackService,
    SlackMessageFormatter,
    SlackRateLimiter,
)
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.schemas.alert import SlackNotificationData


class TestSlackRateLimiter:
    """Test Slack API rate limiting."""

    @pytest.mark.asyncio
    async def test_rate_limiter_allows_under_limit(self):
        """Test that rate limiter allows calls under the limit."""
        limiter = SlackRateLimiter()
        limiter.max_calls_per_minute = 5

        # Should allow calls under the limit
        for _ in range(4):
            await limiter.wait_if_needed()

        assert len(limiter.calls) == 4

    @pytest.mark.asyncio
    async def test_rate_limiter_blocks_over_limit(self):
        """Test that rate limiter blocks calls over the limit."""
        limiter = SlackRateLimiter()
        limiter.max_calls_per_minute = 2

        # Fill up the limit
        await limiter.wait_if_needed()
        await limiter.wait_if_needed()

        # Mock sleep to avoid actual waiting in tests
        with patch("asyncio.sleep") as mock_sleep:
            await limiter.wait_if_needed()
            mock_sleep.assert_called_once()


class TestSlackMessageFormatter:
    """Test Slack message formatting."""

    def create_test_alert(self) -> Alert:
        """Create a test alert for formatting."""
        alert = Alert()
        alert.id = 1
        alert.alert_id = "test-alert-1"
        alert.title = "Test Alert"
        alert.message = "This is a test alert message"
        alert.severity = AlertSeverity.CRITICAL
        alert.status = AlertStatus.ACTIVE
        alert.source = "test-system"
        alert.category = "performance"
        alert.triggered_at = datetime.now()
        return alert

    def test_format_alert_message_basic(self):
        """Test basic alert message formatting."""
        alert = self.create_test_alert()
        formatter = SlackMessageFormatter()

        result = formatter.format_alert_message(alert)

        assert "attachments" in result
        assert len(result["attachments"]) == 1
        attachment = result["attachments"][0]

        assert attachment["color"] == "#FF0000"  # Critical = red
        assert "blocks" in attachment

        # Check header block
        header_block = attachment["blocks"][0]
        assert header_block["type"] == "header"
        assert "🔴 Test Alert" in header_block["text"]["text"]

    def test_format_alert_message_with_actions(self):
        """Test alert message formatting with action buttons."""
        alert = self.create_test_alert()
        formatter = SlackMessageFormatter()

        result = formatter.format_alert_message(alert, include_actions=True)
        attachment = result["attachments"][0]

        # Find actions block
        actions_block = None
        for block in attachment["blocks"]:
            if block["type"] == "actions":
                actions_block = block
                break

        assert actions_block is not None
        assert len(actions_block["elements"]) == 3  # Acknowledge, Resolve, View Details

        # Check button texts
        button_texts = [elem["text"]["text"] for elem in actions_block["elements"]]
        assert "Acknowledge" in button_texts
        assert "Resolve" in button_texts
        assert "View Details" in button_texts

    def test_format_alert_message_without_actions(self):
        """Test alert message formatting without action buttons."""
        alert = self.create_test_alert()
        formatter = SlackMessageFormatter()

        result = formatter.format_alert_message(alert, include_actions=False)
        attachment = result["attachments"][0]

        # Should not have actions block
        for block in attachment["blocks"]:
            assert block["type"] != "actions"

    def test_format_alert_message_resolved_status(self):
        """Test alert message formatting for resolved alert."""
        alert = self.create_test_alert()
        alert.status = AlertStatus.RESOLVED
        formatter = SlackMessageFormatter()

        result = formatter.format_alert_message(alert, include_actions=True)
        attachment = result["attachments"][0]

        # Should not have actions block for resolved alerts
        for block in attachment["blocks"]:
            assert block["type"] != "actions"

        # Check for resolved emoji
        header_block = attachment["blocks"][0]
        assert "✅" in header_block["text"]["text"]

    def test_format_alert_summary_empty(self):
        """Test alert summary formatting with no alerts."""
        formatter = SlackMessageFormatter()

        result = formatter.format_alert_summary([])

        assert "text" in result
        assert "No active alerts" in result["text"]
        assert "blocks" in result
        assert (
            "All systems are operating normally" in result["blocks"][0]["text"]["text"]
        )

    def test_format_alert_summary_with_alerts(self):
        """Test alert summary formatting with multiple alerts."""
        alerts = []
        for i in range(3):
            alert = self.create_test_alert()
            alert.id = i + 1
            alert.title = f"Test Alert {i + 1}"
            alert.severity = [
                AlertSeverity.CRITICAL,
                AlertSeverity.HIGH,
                AlertSeverity.MEDIUM,
            ][i]
            alerts.append(alert)

        formatter = SlackMessageFormatter()
        result = formatter.format_alert_summary(alerts)

        assert "blocks" in result

        # Check header
        header_block = result["blocks"][0]
        assert header_block["type"] == "header"
        assert "3 alerts" in header_block["text"]["text"]

        # Should have individual alert blocks
        alert_blocks = [
            block
            for block in result["blocks"]
            if block["type"] == "section" and "Test Alert" in str(block)
        ]
        assert len(alert_blocks) == 3


class TestSlackService:
    """Test Slack service functionality."""

    @pytest.fixture
    def slack_service(self):
        """Create a Slack service instance for testing."""
        with patch("app.services.slack_service.settings") as mock_settings:
            mock_settings.SLACK_BOT_TOKEN = "xoxb-test-token"
            mock_settings.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test"
            mock_settings.SLACK_CLIENT_ID = "test-client-id"
            mock_settings.SLACK_CLIENT_SECRET = "test-client-secret"
            mock_settings.PROJECT_NAME = "OpsSight"
            mock_settings.VERSION = "0.1.0"
            mock_settings.FRONTEND_URL = "http://localhost:3000"

            service = SlackService()
            return service

    def test_oauth_url_generation(self, slack_service):
        """Test OAuth URL generation."""
        url = slack_service.get_oauth_url("test-state")

        assert "https://slack.com/oauth/v2/authorize" in url
        assert "client_id=test-client-id" in url
        assert "state=test-state" in url
        assert "chat:write" in url

    def test_oauth_url_generation_no_client_id(self):
        """Test OAuth URL generation without client ID."""
        with patch("app.services.slack_service.settings") as mock_settings:
            mock_settings.SLACK_CLIENT_ID = None
            service = SlackService()

            with pytest.raises(ValueError, match="Slack client ID not configured"):
                service.get_oauth_url("test-state")

    @pytest.mark.asyncio
    async def test_exchange_code_for_token_success(self, slack_service):
        """Test successful OAuth code exchange."""
        mock_response = {
            "ok": True,
            "access_token": "xoxp-test-token",
            "team": {"id": "T123", "name": "Test Team"},
        }

        with patch.object(slack_service.client, "post") as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = mock_response

            result = await slack_service.exchange_code_for_token("test-code")

            assert result["ok"] is True
            assert result["access_token"] == "xoxp-test-token"
            mock_post.assert_called_once()

    @pytest.mark.asyncio
    async def test_exchange_code_for_token_failure(self, slack_service):
        """Test failed OAuth code exchange."""
        mock_response = {"ok": False, "error": "invalid_code"}

        with patch.object(slack_service.client, "post") as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = mock_response

            with pytest.raises(Exception):
                await slack_service.exchange_code_for_token("invalid-code")

    @pytest.mark.asyncio
    async def test_send_message_success(self, slack_service):
        """Test successful message sending."""
        mock_response = {"ok": True, "ts": "1234567890.123456", "channel": "C123456789"}

        with patch.object(slack_service.client, "post") as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = mock_response

            result = await slack_service.send_message("#general", "Test message")

            assert result["ok"] is True
            assert result["ts"] == "1234567890.123456"
            mock_post.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_message_with_blocks(self, slack_service):
        """Test sending message with blocks."""
        message_blocks = {
            "blocks": [
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": "Test message with blocks"},
                }
            ]
        }

        mock_response = {"ok": True, "ts": "1234567890.123456"}

        with patch.object(slack_service.client, "post") as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = mock_response

            result = await slack_service.send_message("#general", message_blocks)

            assert result["ok"] is True

            # Check that blocks were included in the payload
            call_args = mock_post.call_args
            payload = call_args[1]["json"]
            assert "blocks" in payload

    @pytest.mark.asyncio
    async def test_send_webhook_message_success(self, slack_service):
        """Test successful webhook message sending."""
        with patch.object(slack_service.client, "post") as mock_post:
            mock_post.return_value.status_code = 200

            result = await slack_service.send_webhook_message("Test webhook message")

            assert result is True
            mock_post.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_webhook_message_failure(self, slack_service):
        """Test failed webhook message sending."""
        with patch.object(slack_service.client, "post") as mock_post:
            mock_post.return_value.status_code = 400

            result = await slack_service.send_webhook_message("Test webhook message")

            assert result is False

    @pytest.mark.asyncio
    async def test_send_alert_notification_with_bot_token(self, slack_service):
        """Test sending alert notification with bot token."""
        alert = Alert()
        alert.id = 1
        alert.title = "Test Alert"
        alert.message = "Test message"
        alert.severity = AlertSeverity.HIGH
        alert.status = AlertStatus.ACTIVE
        alert.source = "test"

        mock_response = {"ok": True, "ts": "1234567890.123456"}

        with patch.object(slack_service, "send_message") as mock_send:
            mock_send.return_value = mock_response

            result = await slack_service.send_alert_notification(alert, "#alerts")

            assert result is True
            mock_send.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_alert_notification_with_webhook(self, slack_service):
        """Test sending alert notification with webhook."""
        # Remove bot token to force webhook usage
        slack_service.bot_token = None

        alert = Alert()
        alert.id = 1
        alert.title = "Test Alert"
        alert.message = "Test message"
        alert.severity = AlertSeverity.HIGH
        alert.status = AlertStatus.ACTIVE
        alert.source = "test"

        with patch.object(slack_service, "send_webhook_message") as mock_send:
            mock_send.return_value = True

            result = await slack_service.send_alert_notification(alert, "#alerts")

            assert result is True
            mock_send.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_alert_notification_no_credentials(self, slack_service):
        """Test sending alert notification without credentials."""
        # Remove all credentials
        slack_service.bot_token = None
        slack_service.webhook_url = None

        alert = Alert()
        alert.id = 1
        alert.title = "Test Alert"

        result = await slack_service.send_alert_notification(alert, "#alerts")

        assert result is False

    @pytest.mark.asyncio
    async def test_get_channels_success(self, slack_service):
        """Test successful channel listing."""
        mock_response = {
            "ok": True,
            "channels": [
                {"id": "C123", "name": "general"},
                {"id": "C456", "name": "alerts"},
            ],
        }

        with patch.object(slack_service.client, "get") as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = mock_response

            channels = await slack_service.get_channels()

            assert len(channels) == 2
            assert channels[0]["name"] == "general"
            assert channels[1]["name"] == "alerts"

    @pytest.mark.asyncio
    async def test_get_user_info_success(self, slack_service):
        """Test successful user info retrieval."""
        mock_response = {
            "ok": True,
            "user": {"id": "U123456789", "name": "testuser", "real_name": "Test User"},
        }

        with patch.object(slack_service.client, "get") as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = mock_response

            user_info = await slack_service.get_user_info("U123456789")

            assert user_info["id"] == "U123456789"
            assert user_info["name"] == "testuser"

    @pytest.mark.asyncio
    async def test_test_connection_all_configured(self, slack_service):
        """Test connection test with all credentials configured."""
        mock_auth_response = {
            "ok": True,
            "team": "Test Team",
            "user": "test-bot",
            "bot_id": "B123456789",
        }

        with (
            patch.object(slack_service.client, "get") as mock_get,
            patch.object(slack_service.client, "post") as mock_post,
        ):

            # Mock API test
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = mock_auth_response

            # Mock webhook test
            mock_post.return_value.status_code = 200

            results = await slack_service.test_connection()

            assert results["bot_token_configured"] is True
            assert results["webhook_url_configured"] is True
            assert results["oauth_configured"] is True
            assert results["api_connection"] is True
            assert results["webhook_connection"] is True
            assert "team_info" in results

    @pytest.mark.asyncio
    async def test_test_connection_no_credentials(self):
        """Test connection test without credentials."""
        with patch("app.services.slack_service.settings") as mock_settings:
            mock_settings.SLACK_BOT_TOKEN = None
            mock_settings.SLACK_WEBHOOK_URL = None
            mock_settings.SLACK_CLIENT_ID = None
            mock_settings.SLACK_CLIENT_SECRET = None
            mock_settings.PROJECT_NAME = "OpsSight"
            mock_settings.VERSION = "0.1.0"

            service = SlackService()
            results = await service.test_connection()

            assert results["bot_token_configured"] is False
            assert results["webhook_url_configured"] is False
            assert results["oauth_configured"] is False
            assert results["api_connection"] is False
            assert results["webhook_connection"] is False


class TestSlackServiceIntegration:
    """Integration tests for Slack service."""

    @pytest.mark.asyncio
    async def test_full_alert_workflow(self):
        """Test complete alert notification workflow."""
        with patch("app.services.slack_service.settings") as mock_settings:
            mock_settings.SLACK_BOT_TOKEN = "xoxb-test-token"
            mock_settings.PROJECT_NAME = "OpsSight"
            mock_settings.VERSION = "0.1.0"
            mock_settings.FRONTEND_URL = "http://localhost:3000"

            service = SlackService()

            # Create test alert
            alert = Alert()
            alert.id = 1
            alert.alert_id = "test-alert-1"
            alert.title = "Critical System Alert"
            alert.message = "Database connection failed"
            alert.severity = AlertSeverity.CRITICAL
            alert.status = AlertStatus.ACTIVE
            alert.source = "monitoring"
            alert.category = "database"
            alert.triggered_at = datetime.now()

            # Mock successful API call
            mock_response = {"ok": True, "ts": "1234567890.123456"}

            with patch.object(service.client, "post") as mock_post:
                mock_post.return_value.status_code = 200
                mock_post.return_value.json.return_value = mock_response

                # Send alert notification
                result = await service.send_alert_notification(alert, "#alerts")

                assert result is True
                mock_post.assert_called_once()

                # Verify the message format
                call_args = mock_post.call_args
                payload = call_args[1]["json"]

                assert payload["channel"] == "#alerts"
                assert "attachments" in payload
                attachment = payload["attachments"][0]
                assert attachment["color"] == "#FF0000"  # Critical = red
                assert "blocks" in attachment
