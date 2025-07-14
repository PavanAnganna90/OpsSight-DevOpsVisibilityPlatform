"""
Tests for Notification Integration Service

Tests the integration between the notification system and existing OpsSight infrastructure
including alerts, pipelines, deployments, and team management.
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.services.notification_integration_service import NotificationIntegrationService
from app.models import (
    Alert,
    AlertSeverity,
    AlertStatus,
    Pipeline,
    PipelineStatus,
    AutomationRun,
    AutomationStatus,
    AutomationType,
    NotificationPreference,
    NotificationLog,
    User,
    Team,
    NotificationChannel,
    NotificationFrequency,
    NotificationType,
    DeliveryStatus,
)
from app.services.notification_service import NotificationService


class TestNotificationIntegrationService:
    """Test the NotificationIntegrationService functionality."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        return Mock(spec=Session)

    @pytest.fixture
    def integration_service(self, mock_db):
        """Create a NotificationIntegrationService instance with mocked dependencies."""
        with (
            patch("app.services.notification_integration_service.NotificationService"),
            patch(
                "app.services.notification_integration_service.SlackNotificationService"
            ),
            patch("app.services.notification_integration_service.EmailService"),
        ):
            service = NotificationIntegrationService(mock_db)
            service.notification_service.send_notification = AsyncMock(
                return_value=True
            )
            return service

    @pytest.fixture
    def sample_alert(self):
        """Create a sample alert for testing."""
        alert = Mock(spec=Alert)
        alert.id = 1
        alert.alert_id = "test-alert-001"
        alert.title = "Test Alert"
        alert.message = "This is a test alert message"
        alert.severity = AlertSeverity.HIGH
        alert.status = AlertStatus.ACTIVE
        alert.source = "test"
        alert.category = "performance"
        alert.pipeline_id = 1
        alert.cluster_id = None
        alert.automation_run_id = None
        alert.project_id = 1
        alert.triggered_at = datetime.utcnow()
        alert.resolved_at = None
        alert.resolved_by_user_id = None
        alert.resolution_comment = None
        alert.get_context_data = Mock(return_value={"test": "data"})
        alert.get_labels = Mock(return_value={"env": "test"})
        return alert

    @pytest.fixture
    def sample_pipeline(self):
        """Create a sample pipeline for testing."""
        pipeline = Mock(spec=Pipeline)
        pipeline.id = 1
        pipeline.name = "Test Pipeline"
        pipeline.type = PipelineStatus.FAILED
        pipeline.project_id = 1
        return pipeline

    @pytest.fixture
    def sample_automation_run(self):
        """Create a sample automation run for testing."""
        automation_run = Mock(spec=AutomationRun)
        automation_run.id = 1
        automation_run.name = "Test Deployment"
        automation_run.type = "deployment"
        automation_run.environment = "production"
        automation_run.status = AutomationStatus.RUNNING
        automation_run.project_id = 1
        automation_run.started_at = datetime.utcnow()
        automation_run.completed_at = None
        return automation_run

    @pytest.fixture
    def sample_notification_preferences(self):
        """Create sample notification preferences."""
        prefs = []

        # Email preference for high severity alerts
        email_pref = Mock(spec=NotificationPreference)
        email_pref.user_id = 1
        email_pref.notification_type = NotificationType.ALERT_TRIGGERED
        email_pref.channel = NotificationChannel.EMAIL
        email_pref.frequency = NotificationFrequency.IMMEDIATE
        email_pref.enabled = True
        email_pref.min_severity = "high"
        email_pref.team_id = None
        email_pref.project_id = None
        prefs.append(email_pref)

        # Slack preference for pipeline failures
        slack_pref = Mock(spec=NotificationPreference)
        slack_pref.user_id = 1
        slack_pref.notification_type = NotificationType.PIPELINE_FAILED
        slack_pref.channel = NotificationChannel.SLACK
        slack_pref.frequency = NotificationFrequency.IMMEDIATE
        slack_pref.enabled = True
        slack_pref.team_id = None
        slack_pref.project_id = None
        prefs.append(slack_pref)

        return prefs


class TestAlertIntegration:
    """Test alert integration functionality."""

    @pytest.mark.asyncio
    async def test_handle_alert_triggered(
        self, integration_service, sample_alert, mock_db
    ):
        """Test handling of triggered alerts."""
        # Setup mock database responses
        mock_db.query.return_value.filter.return_value.all.return_value = []

        # Mock _get_alert_recipients to return test recipients
        integration_service._get_alert_recipients = AsyncMock(
            return_value=[{"user_id": 1, "preference": Mock()}]
        )
        integration_service._send_notification_to_recipient = AsyncMock()

        # Execute
        await integration_service.handle_alert_triggered(sample_alert)

        # Verify
        integration_service._get_alert_recipients.assert_called_once_with(sample_alert)
        integration_service._send_notification_to_recipient.assert_called_once()

    @pytest.mark.asyncio
    async def test_handle_alert_resolved(
        self, integration_service, sample_alert, mock_db
    ):
        """Test handling of resolved alerts."""
        # Setup resolved alert
        sample_alert.status = AlertStatus.RESOLVED
        sample_alert.resolved_by_user_id = 1
        sample_alert.resolved_at = datetime.utcnow()
        sample_alert.resolution_comment = "Fixed the issue"

        # Mock user lookup
        mock_user = Mock()
        mock_user.full_name = "Test User"
        mock_user.email = "test@example.com"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user

        integration_service._get_alert_recipients = AsyncMock(
            return_value=[{"user_id": 1, "preference": Mock()}]
        )
        integration_service._send_notification_to_recipient = AsyncMock()

        # Execute
        await integration_service.handle_alert_resolved(
            sample_alert, resolved_by_user_id=1
        )

        # Verify
        integration_service._get_alert_recipients.assert_called_once_with(sample_alert)
        integration_service._send_notification_to_recipient.assert_called_once()

    @pytest.mark.asyncio
    async def test_alert_severity_threshold(self, integration_service, sample_alert):
        """Test alert severity threshold filtering."""
        # Test high alert meets high threshold
        assert (
            integration_service._alert_meets_severity_threshold(sample_alert, "high")
            == True
        )

        # Test high alert meets medium threshold
        assert (
            integration_service._alert_meets_severity_threshold(sample_alert, "medium")
            == True
        )

        # Test high alert doesn't meet critical threshold
        assert (
            integration_service._alert_meets_severity_threshold(
                sample_alert, "critical"
            )
            == False
        )

        # Test with no threshold (should always pass)
        assert (
            integration_service._alert_meets_severity_threshold(sample_alert, None)
            == True
        )


class TestPipelineIntegration:
    """Test pipeline integration functionality."""

    @pytest.mark.asyncio
    async def test_handle_pipeline_failed(self, integration_service, sample_pipeline):
        """Test handling of failed pipelines."""
        integration_service._get_pipeline_recipients = AsyncMock(
            return_value=[{"user_id": 1, "preference": Mock()}]
        )
        integration_service._send_notification_to_recipient = AsyncMock()

        # Execute
        await integration_service.handle_pipeline_failed(
            sample_pipeline, pipeline_run_id=123
        )

        # Verify
        integration_service._get_pipeline_recipients.assert_called_once_with(
            sample_pipeline
        )
        integration_service._send_notification_to_recipient.assert_called_once()

    @pytest.mark.asyncio
    async def test_handle_pipeline_succeeded(
        self, integration_service, sample_pipeline
    ):
        """Test handling of successful pipelines."""
        integration_service._get_pipeline_recipients = AsyncMock(
            return_value=[{"user_id": 1, "preference": Mock()}]
        )
        integration_service._user_wants_success_notifications = Mock(return_value=True)
        integration_service._send_notification_to_recipient = AsyncMock()

        # Execute
        await integration_service.handle_pipeline_succeeded(
            sample_pipeline, pipeline_run_id=123
        )

        # Verify
        integration_service._get_pipeline_recipients.assert_called_once_with(
            sample_pipeline
        )
        integration_service._send_notification_to_recipient.assert_called_once()

    @pytest.mark.asyncio
    async def test_pipeline_success_filtering(
        self, integration_service, sample_pipeline
    ):
        """Test that success notifications are filtered by user preferences."""
        integration_service._get_pipeline_recipients = AsyncMock(
            return_value=[
                {"user_id": 1, "preference": Mock()},
                {"user_id": 2, "preference": Mock()},
            ]
        )

        # Only user 1 wants success notifications
        def mock_wants_success(user_id):
            return user_id == 1

        integration_service._user_wants_success_notifications = Mock(
            side_effect=mock_wants_success
        )
        integration_service._send_notification_to_recipient = AsyncMock()

        # Execute
        await integration_service.handle_pipeline_succeeded(sample_pipeline)

        # Verify only one notification sent (to user 1)
        assert integration_service._send_notification_to_recipient.call_count == 1


class TestDeploymentIntegration:
    """Test deployment integration functionality."""

    @pytest.mark.asyncio
    async def test_handle_deployment_started(
        self, integration_service, sample_automation_run
    ):
        """Test handling of deployment starts."""
        integration_service._get_deployment_recipients = AsyncMock(
            return_value=[{"user_id": 1, "preference": Mock()}]
        )
        integration_service._send_notification_to_recipient = AsyncMock()

        # Execute
        await integration_service.handle_deployment_started(sample_automation_run)

        # Verify
        integration_service._get_deployment_recipients.assert_called_once_with(
            sample_automation_run
        )
        integration_service._send_notification_to_recipient.assert_called_once()

    @pytest.mark.asyncio
    async def test_handle_deployment_completed(
        self, integration_service, sample_automation_run
    ):
        """Test handling of deployment completion."""
        # Setup completed deployment
        sample_automation_run.status = AutomationStatus.COMPLETED
        sample_automation_run.completed_at = datetime.utcnow()

        integration_service._get_deployment_recipients = AsyncMock(
            return_value=[{"user_id": 1, "preference": Mock()}]
        )
        integration_service._send_notification_to_recipient = AsyncMock()

        # Execute
        await integration_service.handle_deployment_completed(sample_automation_run)

        # Verify
        integration_service._get_deployment_recipients.assert_called_once_with(
            sample_automation_run
        )
        integration_service._send_notification_to_recipient.assert_called_once()

    @pytest.mark.asyncio
    async def test_non_deployment_automation_ignored(
        self, integration_service, sample_automation_run
    ):
        """Test that non-deployment automation runs are ignored."""
        # Change type to non-deployment
        sample_automation_run.type = "terraform"

        integration_service._get_deployment_recipients = AsyncMock()

        # Execute
        await integration_service.handle_deployment_started(sample_automation_run)

        # Verify no processing occurred
        integration_service._get_deployment_recipients.assert_not_called()


class TestSecurityIntegration:
    """Test security vulnerability integration."""

    @pytest.mark.asyncio
    async def test_handle_security_vulnerability(self, integration_service):
        """Test handling of security vulnerabilities."""
        vulnerability_data = {
            "vulnerability_id": "CVE-2023-12345",
            "title": "Critical SQL Injection",
            "description": "SQL injection vulnerability in user input",
            "severity": "critical",
            "cvss_score": 9.8,
            "component": "web-api",
            "project_id": 1,
            "detected_at": datetime.utcnow().isoformat(),
        }

        integration_service._get_security_vulnerability_recipients = AsyncMock(
            return_value=[{"user_id": 1, "preference": Mock()}]
        )
        integration_service._send_notification_to_recipient = AsyncMock()

        # Execute
        await integration_service.handle_security_vulnerability(vulnerability_data)

        # Verify
        integration_service._get_security_vulnerability_recipients.assert_called_once_with(
            vulnerability_data
        )
        integration_service._send_notification_to_recipient.assert_called_once()


class TestRecipientLookup:
    """Test recipient lookup functionality."""

    @pytest.mark.asyncio
    async def test_get_alert_recipients_with_project(
        self, integration_service, sample_alert, mock_db
    ):
        """Test getting alert recipients for project-based alerts."""
        # Mock project team members
        integration_service._get_project_team_members = AsyncMock(
            return_value=[{"user_id": 1, "preference": Mock()}]
        )

        # Mock global alert preferences
        mock_prefs = [Mock()]
        mock_prefs[0].user_id = 2
        mock_prefs[0].min_severity = "medium"
        mock_db.query.return_value.filter.return_value.all.return_value = mock_prefs

        integration_service._alert_meets_severity_threshold = Mock(return_value=True)

        # Execute
        recipients = await integration_service._get_alert_recipients(sample_alert)

        # Verify
        assert (
            len(recipients) == 2
        )  # One from project team, one from global preferences
        integration_service._get_project_team_members.assert_called_once_with(
            sample_alert.project_id
        )

    def test_user_wants_success_notifications(self, integration_service, mock_db):
        """Test checking user success notification preferences."""
        # Mock preference exists
        mock_pref = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = mock_pref

        result = integration_service._user_wants_success_notifications(1)

        assert result == True

        # Mock no preference
        mock_db.query.return_value.filter.return_value.first.return_value = None

        result = integration_service._user_wants_success_notifications(1)

        assert result == False


class TestNotificationSending:
    """Test notification sending functionality."""

    @pytest.mark.asyncio
    async def test_send_notification_to_recipient(self, integration_service, mock_db):
        """Test sending notifications to individual recipients."""
        # Setup mock notification request
        request = NotificationRequest(
            notification_type=NotificationType.ALERT_TRIGGERED,
            title="Test Alert",
            message="Test message",
            severity="high",
            context={"test": "data"},
            metadata={"alert_id": 1},
        )

        recipient = {"user_id": 1, "preference": Mock()}

        # Mock user preferences
        mock_prefs = [Mock()]
        mock_prefs[0].team_id = None
        mock_prefs[0].channel = NotificationChannel.EMAIL
        mock_db.query.return_value.filter.return_value.all.return_value = mock_prefs

        # Execute
        await integration_service._send_notification_to_recipient(request, recipient)

        # Verify notification service was called
        integration_service.notification_service.send_notification.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_notification_no_preferences(self, integration_service, mock_db):
        """Test that no notifications are sent when user has no preferences."""
        request = NotificationRequest(
            notification_type=NotificationType.ALERT_TRIGGERED,
            title="Test Alert",
            message="Test message",
            severity="high",
            context={},
            metadata={},
        )

        recipient = {"user_id": 1, "preference": Mock()}

        # Mock no preferences
        mock_db.query.return_value.filter.return_value.all.return_value = []

        # Execute
        await integration_service._send_notification_to_recipient(request, recipient)

        # Verify no notification was sent
        integration_service.notification_service.send_notification.assert_not_called()


class TestErrorHandling:
    """Test error handling in integration service."""

    @pytest.mark.asyncio
    async def test_alert_triggered_error_handling(
        self, integration_service, sample_alert
    ):
        """Test error handling in alert triggered processing."""
        # Mock an exception in recipient lookup
        integration_service._get_alert_recipients = AsyncMock(
            side_effect=Exception("Database error")
        )

        # Should not raise exception, just log error
        await integration_service.handle_alert_triggered(sample_alert)

        # Verify error was handled gracefully
        integration_service._get_alert_recipients.assert_called_once()

    @pytest.mark.asyncio
    async def test_notification_sending_error_handling(
        self, integration_service, mock_db
    ):
        """Test error handling in notification sending."""
        request = NotificationRequest(
            notification_type=NotificationType.ALERT_TRIGGERED,
            title="Test Alert",
            message="Test message",
            severity="high",
            context={},
            metadata={},
        )

        recipient = {"user_id": 1, "preference": Mock()}

        # Mock database error
        mock_db.query.side_effect = Exception("Database connection failed")

        # Should not raise exception
        await integration_service._send_notification_to_recipient(request, recipient)

        # Verify error was handled


if __name__ == "__main__":
    pytest.main([__file__])
