"""
Notification Integration Service

Integrates the notification system with existing OpsSight infrastructure including:
- Alert system integration for automatic notifications
- Pipeline and deployment event notifications
- Team and RBAC integration for permission management
- Real-time event processing and notification triggers
"""

import logging
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from sqlalchemy.orm import Session

from app.models import (
    Alert,
    AlertSeverity,
    AlertStatus,
    Pipeline,
    PipelineStatus,
    AutomationRun,
    AutomationStatus,
    InfrastructureChange,
    ChangeStatus,
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
from app.services.slack_notification_service import SlackNotificationService
from app.services.email_service import EmailService
from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)


class NotificationIntegrationService:
    """
    Service for integrating notifications with existing OpsSight infrastructure.

    Handles automatic notification triggers from alerts, pipelines, deployments,
    and other system events based on user preferences and team configurations.
    """

    def __init__(self, db: Session):
        """Initialize the integration service with database session."""
        self.db = db
        self.notification_service = NotificationService(db)
        self.slack_service = SlackNotificationService()
        self.email_service = EmailService()

    # Alert Integration Methods

    async def handle_alert_triggered(self, alert: Alert) -> None:
        """
        Handle notification when an alert is triggered.

        Args:
            alert: The triggered alert instance
        """
        try:
            logger.info(
                f"Processing notification for triggered alert: {alert.alert_id}"
            )

            # Determine notification type based on alert
            notification_type = self._get_notification_type_for_alert(alert)

            # Get relevant users and teams for this alert
            recipients = await self._get_alert_recipients(alert)

            # Create notification request
            notification_request = Dict[str, Any](
                notification_type=notification_type,
                title=f"Alert Triggered: {alert.title}",
                message=alert.message,
                severity=alert.severity.value,
                context={
                    "alert_id": alert.alert_id,
                    "alert_severity": alert.severity.value,
                    "alert_source": alert.source,
                    "alert_category": alert.category,
                    "triggered_at": (
                        alert.triggered_at.isoformat() if alert.triggered_at else None
                    ),
                    "context_data": alert.get_context_data(),
                    "labels": alert.get_labels(),
                },
                metadata={
                    "related_alert_id": alert.id,
                    "pipeline_id": alert.pipeline_id,
                    "cluster_id": alert.cluster_id,
                    "automation_run_id": alert.automation_run_id,
                    "project_id": alert.project_id,
                },
            )

            # Send notifications to all recipients
            for recipient in recipients:
                await self._send_notification_to_recipient(
                    notification_request, recipient
                )

            logger.info(f"Sent alert notifications to {len(recipients)} recipients")

        except Exception as e:
            logger.error(f"Error handling alert triggered notification: {e}")

    async def handle_alert_resolved(
        self, alert: Alert, resolved_by_user_id: Optional[int] = None
    ) -> None:
        """
        Handle notification when an alert is resolved.

        Args:
            alert: The resolved alert instance
            resolved_by_user_id: ID of the user who resolved the alert
        """
        try:
            logger.info(f"Processing notification for resolved alert: {alert.alert_id}")

            # Only notify for high/critical alerts or if someone manually resolved
            if (
                alert.severity not in [AlertSeverity.HIGH, AlertSeverity.CRITICAL]
                and not resolved_by_user_id
            ):
                logger.debug(
                    f"Skipping resolved notification for {alert.severity} alert without manual resolution"
                )
                return

            notification_type = NotificationType.ALERT_RESOLVED
            recipients = await self._get_alert_recipients(alert)

            resolved_by_name = "System"
            if resolved_by_user_id:
                resolved_user = (
                    self.db.query(User).filter(User.id == resolved_by_user_id).first()
                )
                if resolved_user:
                    resolved_by_name = resolved_user.full_name or resolved_user.email

            notification_request = Dict[str, Any](
                notification_type=notification_type,
                title=f"Alert Resolved: {alert.title}",
                message=f"Alert has been resolved by {resolved_by_name}. "
                + (alert.resolution_comment or "No resolution comment provided."),
                severity="info",
                context={
                    "alert_id": alert.alert_id,
                    "alert_severity": alert.severity.value,
                    "resolved_by": resolved_by_name,
                    "resolved_at": (
                        alert.resolved_at.isoformat() if alert.resolved_at else None
                    ),
                    "resolution_comment": alert.resolution_comment,
                },
                metadata={
                    "related_alert_id": alert.id,
                    "resolved_by_user_id": resolved_by_user_id,
                },
            )

            for recipient in recipients:
                await self._send_notification_to_recipient(
                    notification_request, recipient
                )

            logger.info(
                f"Sent alert resolved notifications to {len(recipients)} recipients"
            )

        except Exception as e:
            logger.error(f"Error handling alert resolved notification: {e}")

    # Pipeline Integration Methods

    async def handle_pipeline_failed(
        self, pipeline: Pipeline, pipeline_run_id: Optional[int] = None
    ) -> None:
        """
        Handle notification when a pipeline fails.

        Args:
            pipeline: The failed pipeline instance
            pipeline_run_id: ID of the specific pipeline run that failed
        """
        try:
            logger.info(f"Processing notification for failed pipeline: {pipeline.id}")

            notification_type = NotificationType.PIPELINE_FAILED
            recipients = await self._get_pipeline_recipients(pipeline)

            notification_request = Dict[str, Any](
                notification_type=notification_type,
                title=f"Pipeline Failed: {pipeline.name}",
                message=f"Pipeline '{pipeline.name}' has failed. Please check the logs for more details.",
                severity="high",
                context={
                    "pipeline_id": pipeline.id,
                    "pipeline_name": pipeline.name,
                    "pipeline_type": pipeline.type.value if pipeline.type else None,
                    "project_id": pipeline.project_id,
                    "pipeline_run_id": pipeline_run_id,
                    "failed_at": datetime.utcnow().isoformat(),
                },
                metadata={
                    "related_pipeline_id": pipeline.id,
                    "pipeline_run_id": pipeline_run_id,
                    "project_id": pipeline.project_id,
                },
            )

            for recipient in recipients:
                await self._send_notification_to_recipient(
                    notification_request, recipient
                )

            logger.info(
                f"Sent pipeline failed notifications to {len(recipients)} recipients"
            )

        except Exception as e:
            logger.error(f"Error handling pipeline failed notification: {e}")

    async def handle_pipeline_succeeded(
        self, pipeline: Pipeline, pipeline_run_id: Optional[int] = None
    ) -> None:
        """
        Handle notification when a pipeline succeeds.

        Args:
            pipeline: The successful pipeline instance
            pipeline_run_id: ID of the specific pipeline run that succeeded
        """
        try:
            logger.info(
                f"Processing notification for successful pipeline: {pipeline.id}"
            )

            notification_type = NotificationType.PIPELINE_SUCCEEDED
            recipients = await self._get_pipeline_recipients(pipeline)

            # Filter recipients who want success notifications
            success_recipients = [
                r
                for r in recipients
                if self._user_wants_success_notifications(r.get("user_id"))
            ]

            if not success_recipients:
                logger.debug("No recipients want pipeline success notifications")
                return

            notification_request = Dict[str, Any](
                notification_type=notification_type,
                title=f"Pipeline Succeeded: {pipeline.name}",
                message=f"Pipeline '{pipeline.name}' completed successfully.",
                severity="info",
                context={
                    "pipeline_id": pipeline.id,
                    "pipeline_name": pipeline.name,
                    "pipeline_type": pipeline.type.value if pipeline.type else None,
                    "project_id": pipeline.project_id,
                    "pipeline_run_id": pipeline_run_id,
                    "completed_at": datetime.utcnow().isoformat(),
                },
                metadata={
                    "related_pipeline_id": pipeline.id,
                    "pipeline_run_id": pipeline_run_id,
                    "project_id": pipeline.project_id,
                },
            )

            for recipient in success_recipients:
                await self._send_notification_to_recipient(
                    notification_request, recipient
                )

            logger.info(
                f"Sent pipeline success notifications to {len(success_recipients)} recipients"
            )

        except Exception as e:
            logger.error(f"Error handling pipeline success notification: {e}")

    # Deployment Integration Methods

    async def handle_deployment_started(self, automation_run: AutomationRun) -> None:
        """
        Handle notification when a deployment starts.

        Args:
            automation_run: The automation run representing the deployment
        """
        try:
            if automation_run.type != "deployment":
                return

            logger.info(
                f"Processing notification for deployment started: {automation_run.id}"
            )

            notification_type = NotificationType.DEPLOYMENT_STARTED
            recipients = await self._get_deployment_recipients(automation_run)

            notification_request = Dict[str, Any](
                notification_type=notification_type,
                title=f"Deployment Started: {automation_run.name}",
                message=f"Deployment '{automation_run.name}' has started.",
                severity="info",
                context={
                    "automation_run_id": automation_run.id,
                    "deployment_name": automation_run.name,
                    "environment": automation_run.environment,
                    "project_id": automation_run.project_id,
                    "started_at": (
                        automation_run.started_at.isoformat()
                        if automation_run.started_at
                        else None
                    ),
                },
                metadata={
                    "related_automation_run_id": automation_run.id,
                    "project_id": automation_run.project_id,
                },
            )

            for recipient in recipients:
                await self._send_notification_to_recipient(
                    notification_request, recipient
                )

            logger.info(
                f"Sent deployment started notifications to {len(recipients)} recipients"
            )

        except Exception as e:
            logger.error(f"Error handling deployment started notification: {e}")

    async def handle_deployment_completed(self, automation_run: AutomationRun) -> None:
        """
        Handle notification when a deployment completes.

        Args:
            automation_run: The completed automation run representing the deployment
        """
        try:
            if automation_run.type != "deployment":
                return

            logger.info(
                f"Processing notification for deployment completed: {automation_run.id}"
            )

            notification_type = NotificationType.DEPLOYMENT_COMPLETED
            recipients = await self._get_deployment_recipients(automation_run)

            status_message = (
                "successfully"
                if automation_run.status == AutomationStatus.COMPLETED
                else "with issues"
            )
            severity = (
                "info"
                if automation_run.status == AutomationStatus.COMPLETED
                else "medium"
            )

            notification_request = Dict[str, Any](
                notification_type=notification_type,
                title=f"Deployment Completed: {automation_run.name}",
                message=f"Deployment '{automation_run.name}' completed {status_message}.",
                severity=severity,
                context={
                    "automation_run_id": automation_run.id,
                    "deployment_name": automation_run.name,
                    "environment": automation_run.environment,
                    "status": automation_run.status.value,
                    "project_id": automation_run.project_id,
                    "completed_at": (
                        automation_run.completed_at.isoformat()
                        if automation_run.completed_at
                        else None
                    ),
                },
                metadata={
                    "related_automation_run_id": automation_run.id,
                    "project_id": automation_run.project_id,
                },
            )

            for recipient in recipients:
                await self._send_notification_to_recipient(
                    notification_request, recipient
                )

            logger.info(
                f"Sent deployment completed notifications to {len(recipients)} recipients"
            )

        except Exception as e:
            logger.error(f"Error handling deployment completed notification: {e}")

    # Security Integration Methods

    async def handle_security_vulnerability(
        self, vulnerability_data: Dict[str, Any]
    ) -> None:
        """
        Handle notification for security vulnerabilities.

        Args:
            vulnerability_data: Dictionary containing vulnerability information
        """
        try:
            logger.info(f"Processing notification for security vulnerability")

            notification_type = NotificationType.SECURITY_VULNERABILITY
            severity = vulnerability_data.get("severity", "medium")

            # Get security team and project owners
            recipients = await self._get_security_vulnerability_recipients(
                vulnerability_data
            )

            notification_request = Dict[str, Any](
                notification_type=notification_type,
                title=f"Security Vulnerability Detected: {vulnerability_data.get('title', 'Unknown')}",
                message=vulnerability_data.get(
                    "description",
                    "A security vulnerability was detected in your project.",
                ),
                severity=severity,
                context={
                    "vulnerability_id": vulnerability_data.get("vulnerability_id"),
                    "severity": severity,
                    "cvss_score": vulnerability_data.get("cvss_score"),
                    "affected_component": vulnerability_data.get("component"),
                    "project_id": vulnerability_data.get("project_id"),
                    "detected_at": vulnerability_data.get(
                        "detected_at", datetime.utcnow().isoformat()
                    ),
                },
                metadata={
                    "vulnerability_data": vulnerability_data,
                    "project_id": vulnerability_data.get("project_id"),
                },
            )

            for recipient in recipients:
                await self._send_notification_to_recipient(
                    notification_request, recipient
                )

            logger.info(
                f"Sent security vulnerability notifications to {len(recipients)} recipients"
            )

        except Exception as e:
            logger.error(f"Error handling security vulnerability notification: {e}")

    # Helper Methods

    def _get_notification_type_for_alert(self, alert: Alert) -> NotificationType:
        """Determine the appropriate notification type for an alert."""
        if alert.status == AlertStatus.RESOLVED:
            return NotificationType.ALERT_RESOLVED
        else:
            return NotificationType.ALERT_TRIGGERED

    async def _get_alert_recipients(self, alert: Alert) -> List[Dict[str, Any]]:
        """Get list of users who should receive notifications for this alert."""
        recipients = []

        try:
            # Get project-based recipients
            if alert.project_id:
                project_recipients = await self._get_project_team_members(
                    alert.project_id
                )
                recipients.extend(project_recipients)

            # Get global alert recipients (users with global alert preferences)
            global_recipients = (
                self.db.query(NotificationPreference)
                .filter(
                    NotificationPreference.notification_type
                    == NotificationType.ALERT_TRIGGERED,
                    NotificationPreference.enabled == True,
                    NotificationPreference.project_id.is_(None),
                    NotificationPreference.team_id.is_(None),
                )
                .all()
            )

            for pref in global_recipients:
                if self._alert_meets_severity_threshold(alert, pref.min_severity):
                    recipients.append({"user_id": pref.user_id, "preference": pref})

            # Remove duplicates
            seen_users = set()
            unique_recipients = []
            for recipient in recipients:
                user_id = recipient["user_id"]
                if user_id not in seen_users:
                    seen_users.add(user_id)
                    unique_recipients.append(recipient)

            return unique_recipients

        except Exception as e:
            logger.error(f"Error getting alert recipients: {e}")
            return []

    async def _get_pipeline_recipients(
        self, pipeline: Pipeline
    ) -> List[Dict[str, Any]]:
        """Get list of users who should receive notifications for this pipeline."""
        recipients = []

        try:
            # Get project team members
            if pipeline.project_id:
                project_recipients = await self._get_project_team_members(
                    pipeline.project_id
                )
                recipients.extend(project_recipients)

            return recipients

        except Exception as e:
            logger.error(f"Error getting pipeline recipients: {e}")
            return []

    async def _get_deployment_recipients(
        self, automation_run: AutomationRun
    ) -> List[Dict[str, Any]]:
        """Get list of users who should receive notifications for this deployment."""
        recipients = []

        try:
            # Get project team members
            if automation_run.project_id:
                project_recipients = await self._get_project_team_members(
                    automation_run.project_id
                )
                recipients.extend(project_recipients)

            return recipients

        except Exception as e:
            logger.error(f"Error getting deployment recipients: {e}")
            return []

    async def _get_security_vulnerability_recipients(
        self, vulnerability_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Get list of users who should receive security vulnerability notifications."""
        recipients = []

        try:
            # Get project team members if project_id is available
            project_id = vulnerability_data.get("project_id")
            if project_id:
                project_recipients = await self._get_project_team_members(project_id)
                recipients.extend(project_recipients)

            # Get users with security notification preferences
            security_recipients = (
                self.db.query(NotificationPreference)
                .filter(
                    NotificationPreference.notification_type
                    == NotificationType.SECURITY_VULNERABILITY,
                    NotificationPreference.enabled == True,
                )
                .all()
            )

            for pref in security_recipients:
                recipients.append({"user_id": pref.user_id, "preference": pref})

            return recipients

        except Exception as e:
            logger.error(f"Error getting security vulnerability recipients: {e}")
            return []

    async def _get_project_team_members(self, project_id: int) -> List[Dict[str, Any]]:
        """Get team members for a specific project."""
        try:
            # This would need to be implemented based on the project-team relationship
            # For now, return empty list as placeholder
            # TODO: Implement project team member lookup
            return []

        except Exception as e:
            logger.error(f"Error getting project team members: {e}")
            return []

    def _alert_meets_severity_threshold(
        self, alert: Alert, min_severity: Optional[str]
    ) -> bool:
        """Check if alert severity meets the minimum threshold."""
        if not min_severity:
            return True

        severity_levels = {"low": 1, "medium": 2, "high": 3, "critical": 4}

        alert_level = severity_levels.get(alert.severity.value, 1)
        min_level = severity_levels.get(min_severity, 1)

        return alert_level >= min_level

    def _user_wants_success_notifications(self, user_id: int) -> bool:
        """Check if user wants to receive success notifications."""
        try:
            success_pref = (
                self.db.query(NotificationPreference)
                .filter(
                    NotificationPreference.user_id == user_id,
                    NotificationPreference.notification_type
                    == NotificationType.PIPELINE_SUCCEEDED,
                    NotificationPreference.enabled == True,
                )
                .first()
            )

            return success_pref is not None

        except Exception as e:
            logger.error(f"Error checking success notification preference: {e}")
            return False

    async def _send_notification_to_recipient(
        self, request: Dict[str, Any], recipient: Dict[str, Any]
    ) -> None:
        """Send notification to a specific recipient."""
        try:
            user_id = recipient["user_id"]

            # Get user's notification preferences for this type
            preferences = (
                self.db.query(NotificationPreference)
                .filter(
                    NotificationPreference.user_id == user_id,
                    NotificationPreference.notification_type
                    == request["notification_type"],
                    NotificationPreference.enabled == True,
                )
                .all()
            )

            if not preferences:
                logger.debug(
                    f"No enabled preferences found for user {user_id} and type {request['notification_type']}"
                )
                return

            # Send via each enabled channel
            for pref in preferences:
                try:
                    success = await self.notification_service.send_notification(
                        user_id=user_id,
                        team_id=pref.team_id,
                        notification_request=request,
                    )

                    if success:
                        logger.debug(
                            f"Successfully sent {request['notification_type']} notification to user {user_id} via {pref.channel}"
                        )
                    else:
                        logger.warning(
                            f"Failed to send {request['notification_type']} notification to user {user_id} via {pref.channel}"
                        )

                except Exception as e:
                    logger.error(
                        f"Error sending notification to user {user_id} via {pref.channel}: {e}"
                    )

        except Exception as e:
            logger.error(f"Error sending notification to recipient: {e}")


# Factory function for easy integration
def create_notification_integration_service(
    db: Session,
) -> NotificationIntegrationService:
    """Create and return a NotificationIntegrationService instance."""
    return NotificationIntegrationService(db)
