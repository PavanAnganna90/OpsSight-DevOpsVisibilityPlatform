"""
Main notification service for orchestrating notifications across channels.
Handles user preferences, deduplication, and routing to appropriate services.
"""

import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.db.database import get_db
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.user import User
from app.models.notification_preference import (
    NotificationPreference,
    NotificationChannel,
    NotificationFrequency,
    NotificationType,
)
from app.models.notification_log import NotificationLog, DeliveryStatus
from app.services.email_service import EmailService
from app.services.slack_notification_service import SlackNotificationService
from app.services.push_notification_service import push_notification_service

logger = logging.getLogger(__name__)


class NotificationRouter:
    """Routes notifications to appropriate channels based on user preferences."""

    def __init__(self):
        """Initialize notification router with channel services."""
        self.email_service = EmailService()
        self.slack_service = SlackNotificationService()
        self.push_service = push_notification_service

    async def send_notification(
        self,
        db: AsyncSession,
        user_id: int,
        notification_type: NotificationType,
        content: Dict[str, Any],
        source_type: str = None,
        source_id: int = None,
        team_id: int = None,
        project_id: int = None,
        priority: str = "normal",
        bypass_preferences: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Send notification to user across enabled channels.

        Args:
            db: AsyncSession for database operations
            user_id: ID of the recipient user
            notification_type: Type of notification
            content: Notification content and context
            source_type: Type of source entity (optional)
            source_id: ID of source entity (optional)
            team_id: Associated team ID (optional)
            project_id: Associated project ID (optional)
            priority: Notification priority
            bypass_preferences: Skip preference checks for critical notifications

        Returns:
            List of delivery results for each channel
        """
        results = []

        try:
            # Get user and their notification preferences
            user = (
                await db.execute(select(User).filter(User.id == user_id))
                .scalars()
                .first()
            )
            if not user:
                logger.error(f"User {user_id} not found")
                return []

            # Get user preferences for this notification type
            preferences = await self._get_user_preferences(
                db, user_id, notification_type, team_id, project_id
            )

            # Check for deduplication
            if not bypass_preferences:
                dedup_key = NotificationLog.create_deduplication_key(
                    user_id=user_id,
                    notification_type=notification_type.value,
                    source_type=source_type,
                    source_id=source_id,
                    time_window_minutes=30,
                )

                existing_log = (
                    await db.execute(
                        select(NotificationLog).filter(
                            NotificationLog.deduplication_key == dedup_key
                        )
                    )
                    .scalars()
                    .first()
                )

                if existing_log:
                    logger.info(f"Skipping duplicate notification for user {user_id}")
                    return []

            # Send to each enabled channel
            for pref in preferences:
                if not bypass_preferences and not pref.should_send_notification():
                    continue

                # Create notification log entry
                notification_id = str(uuid.uuid4())
                log_entry = NotificationLog(
                    notification_id=notification_id,
                    user_id=user_id,
                    channel=pref.channel.value,
                    recipient_address=self._get_recipient_address(user, pref.channel),
                    notification_type=notification_type.value,
                    source_type=source_type,
                    source_id=source_id,
                    team_id=team_id,
                    project_id=project_id,
                    priority=priority,
                    deduplication_key=dedup_key if not bypass_preferences else None,
                    content="",  # Will be set after sending
                    subject=content.get("subject", ""),
                    template_name=content.get("template_name"),
                )

                # Route to appropriate channel service
                delivery_result = await self._route_to_channel(
                    pref.channel, user, content, log_entry, db
                )

                # Update log entry with result
                if delivery_result.get("status") == "sent":
                    log_entry.mark_sent(
                        provider_message_id=delivery_result.get("message_id"),
                        provider_response=delivery_result,
                    )
                elif delivery_result.get("status") == "failed":
                    log_entry.mark_failed(
                        error_message=delivery_result.get("error", "Unknown error"),
                        error_details=delivery_result,
                    )

                # Set content after successful send
                log_entry.content = delivery_result.get("content", "")[
                    :1000
                ]  # Truncate for storage

                db.add(log_entry)
                results.append(delivery_result)

            await db.commit()
            return results

        except Exception as e:
            logger.error(f"Failed to send notification to user {user_id}: {str(e)}")
            if "db" in locals():
                await db.rollback()
            return [{"status": "failed", "error": str(e)}]

    async def _get_user_preferences(
        self,
        db: AsyncSession,
        user_id: int,
        notification_type: NotificationType,
        team_id: int = None,
        project_id: int = None,
    ) -> List[NotificationPreference]:
        """Get user preferences for the given notification type."""
        query = await db.execute(
            select(NotificationPreference).filter(
                and_(
                    NotificationPreference.user_id == user_id,
                    NotificationPreference.notification_type == notification_type,
                    NotificationPreference.is_enabled == True,
                )
            )
        )

        # Add team/project filters if specified
        if team_id or project_id:
            query = await db.execute(
                select(NotificationPreference).filter(
                    or_(
                        NotificationPreference.team_id == team_id,
                        NotificationPreference.project_id == project_id,
                        and_(
                            NotificationPreference.team_id.is_(None),
                            NotificationPreference.project_id.is_(None),
                        ),
                    )
                )
            )
        else:
            # Only get global preferences
            query = await db.execute(
                select(NotificationPreference).filter(
                    and_(
                        NotificationPreference.team_id.is_(None),
                        NotificationPreference.project_id.is_(None),
                    )
                )
            )

        return query.scalars().all()

    def _get_recipient_address(self, user: User, channel: NotificationChannel) -> str:
        """Get the recipient address for the given channel."""
        if channel == NotificationChannel.EMAIL:
            return user.email or ""
        elif channel == NotificationChannel.SLACK:
            # This would need to be extended with Slack user mapping
            return f"@{user.github_username}"
        elif channel == NotificationChannel.PUSH:
            return f"user:{user.id}"  # Push notifications use user ID
        else:
            return ""

    async def _route_to_channel(
        self,
        channel: NotificationChannel,
        user: User,
        content: Dict[str, Any],
        log_entry: NotificationLog,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """Route notification to the appropriate channel service."""
        try:
            if channel == NotificationChannel.EMAIL:
                return await self._send_email_notification(user, content, log_entry)
            elif channel == NotificationChannel.SLACK:
                return await self._send_slack_notification(user, content, log_entry)
            elif channel == NotificationChannel.PUSH:
                return await self._send_push_notification(user, content, log_entry, db)
            else:
                return {"status": "failed", "error": f"Unsupported channel: {channel}"}

        except Exception as e:
            logger.error(f"Failed to route notification to {channel}: {str(e)}")
            return {"status": "failed", "error": str(e)}

    async def _send_email_notification(
        self, user: User, content: Dict[str, Any], log_entry: NotificationLog
    ) -> Dict[str, Any]:
        """Send notification via email."""
        if not user.email:
            return {"status": "failed", "error": "User has no email address"}

        # Determine email method based on content type
        if content.get("alert"):
            result = await self.email_service.send_alert_notification(
                alert=content["alert"],
                to_email=user.email,
                include_context=content.get("include_context", True),
            )
        elif content.get("digest_data"):
            result = await self.email_service.send_digest_email(
                to_email=user.email,
                digest_data=content["digest_data"],
                digest_type=content.get("digest_type", "daily"),
            )
        else:
            # Generic email
            result = await self.email_service.send_email(
                to_email=user.email,
                subject=content.get("subject", "OpsSight Notification"),
                content=content.get("body", ""),
                template_name=content.get("template_name"),
                template_context=content.get("template_context"),
            )

        result["content"] = content.get("subject", "")
        return result

    async def _send_slack_notification(
        self, user: User, content: Dict[str, Any], log_entry: NotificationLog
    ) -> Dict[str, Any]:
        """Send notification via Slack using enhanced service."""
        try:
            # Use enhanced Slack notification service with user mapping
            return await self.slack_service.send_notification(
                user=user, content=content, log_entry=log_entry
            )

        except Exception as e:
            return {"status": "failed", "error": str(e)}

    async def _send_push_notification(
        self, user: User, content: Dict[str, Any], log_entry: NotificationLog, db: AsyncSession
    ) -> Dict[str, Any]:
        """Send notification via push notification service."""
        try:
            # Determine the notification type and route to appropriate method
            if content.get("alert"):
                result = await self.push_service.send_alert_notification(
                    db=db,
                    user_id=user.id,
                    alert_data=content,
                    log_entry=log_entry
                )
            elif content.get("deployment"):
                result = await self.push_service.send_deployment_notification(
                    db=db,
                    user_id=user.id,
                    deployment_data=content,
                    log_entry=log_entry
                )
            elif content.get("team_data"):
                result = await self.push_service.send_team_notification(
                    db=db,
                    user_id=user.id,
                    team_data=content,
                    log_entry=log_entry
                )
            else:
                # Generic push notification
                from app.services.push_notification_service import PushNotificationData
                
                notification = PushNotificationData(
                    title=content.get("subject", "OpsSight Notification"),
                    body=content.get("body", "You have a new notification"),
                    data=content.get("data", {}),
                    category=content.get("category", "default"),
                    priority=content.get("priority", "normal")
                )
                
                result = await self.push_service.send_to_user(
                    db=db,
                    user_id=user.id,
                    notification=notification,
                    log_entry=log_entry
                )

            result["content"] = content.get("subject", content.get("title", ""))
            return result

        except Exception as e:
            logger.error(f"Failed to send push notification: {str(e)}")
            return {"status": "failed", "error": str(e)}


class NotificationService:
    """Main service for managing notifications."""

    def __init__(self):
        """Initialize notification service."""
        self.router = NotificationRouter()

    async def send_alert_notification(
        self,
        db: AsyncSession,
        alert: Alert,
        user_ids: List[int] = None,
        team_id: int = None,
        bypass_preferences: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Send alert notification to users.

        Args:
            db: AsyncSession for database operations
            alert: Alert object to send
            user_ids: Specific users to notify (optional)
            team_id: Team to notify (optional)
            bypass_preferences: Skip preference checks for critical alerts

        Returns:
            List of delivery results
        """
        # Determine notification type based on alert severity
        notification_type_map = {
            AlertSeverity.CRITICAL: NotificationType.ALERT_CRITICAL,
            AlertSeverity.HIGH: NotificationType.ALERT_HIGH,
            AlertSeverity.MEDIUM: NotificationType.ALERT_MEDIUM,
            AlertSeverity.LOW: NotificationType.ALERT_LOW,
        }

        notification_type = notification_type_map.get(
            alert.severity, NotificationType.ALERT_MEDIUM
        )

        # Get target users
        target_users = (
            user_ids or await self._get_team_users(db, team_id) if team_id else []
        )

        if not target_users:
            logger.warning(f"No target users for alert {alert.id}")
            return []

        # Prepare notification content
        content = {
            "alert": alert,
            "subject": f"[{alert.severity.value.upper()}] {alert.title}",
            "include_context": True,
            "template_name": "alert_notification",
        }

        # Send to all target users
        all_results = []
        for user_id in target_users:
            results = await self.router.send_notification(
                db=db,
                user_id=user_id,
                notification_type=notification_type,
                content=content,
                source_type="alert",
                source_id=alert.id,
                team_id=team_id,
                priority=(
                    "high"
                    if alert.severity in [AlertSeverity.CRITICAL, AlertSeverity.HIGH]
                    else "normal"
                ),
                bypass_preferences=bypass_preferences
                or alert.severity == AlertSeverity.CRITICAL,
            )
            all_results.extend(results)

        return all_results

    async def send_digest_notification(
        self,
        db: AsyncSession,
        user_id: int,
        digest_data: Dict[str, Any],
        digest_type: str = "daily",
    ) -> List[Dict[str, Any]]:
        """
        Send digest notification to user.

        Args:
            db: AsyncSession for database operations
            user_id: ID of the recipient user
            digest_data: Aggregated digest data
            digest_type: Type of digest (daily, weekly)

        Returns:
            List of delivery results
        """
        notification_type_map = {
            "daily": NotificationType.DIGEST_DAILY,
            "weekly": NotificationType.DIGEST_WEEKLY,
        }

        notification_type = notification_type_map.get(
            digest_type, NotificationType.DIGEST_DAILY
        )

        content = {
            "digest_data": digest_data,
            "digest_type": digest_type,
            "subject": f"📊 {digest_type.title()} OpsSight Digest",
            "template_name": f"digest_{digest_type}",
        }

        return await self.router.send_notification(
            db=db,
            user_id=user_id,
            notification_type=notification_type,
            content=content,
            source_type="digest",
            priority="low",
        )

    async def _get_team_users(self, db: AsyncSession, team_id: int) -> List[int]:
        """Get user IDs for team members."""
        try:
            from app.models.team import Team

            team = (
                await db.execute(select(Team).filter(Team.id == team_id))
                .scalars()
                .first()
            )
            if not team:
                return []

            return [member.id for member in team.members]

        except Exception as e:
            logger.error(f"Failed to get team users for team {team_id}: {str(e)}")
            return []

    async def create_user_default_preferences(
        self, db: AsyncSession, user_id: int
    ) -> None:
        """Create default notification preferences for a new user."""
        try:
            # Check if user already has preferences
            existing = (
                await db.execute(
                    select(NotificationPreference).filter(
                        NotificationPreference.user_id == user_id
                    )
                )
                .scalars()
                .first()
            )

            if existing:
                logger.info(f"User {user_id} already has notification preferences")
                return

            # Create default preferences
            defaults = NotificationPreference.get_default_preferences(user_id)

            for pref in defaults:
                db.add(pref)

            await db.commit()
            logger.info(f"Created default notification preferences for user {user_id}")

        except Exception as e:
            logger.error(
                f"Failed to create default preferences for user {user_id}: {str(e)}"
            )
            if "db" in locals():
                await db.rollback()

    async def get_user_preferences(
        self, db: AsyncSession, user_id: int
    ) -> List[Dict[str, Any]]:
        """Get all notification preferences for a user."""
        try:
            preferences = (
                await db.execute(
                    select(NotificationPreference).filter(
                        NotificationPreference.user_id == user_id
                    )
                )
                .scalars()
                .all()
            )

            return [pref.to_dict() for pref in preferences]

        except Exception as e:
            logger.error(f"Failed to get preferences for user {user_id}: {str(e)}")
            return []

    async def update_user_preference(
        self,
        db: AsyncSession,
        user_id: int,
        preference_id: int,
        updates: Dict[str, Any],
    ) -> bool:
        """Update a specific notification preference."""
        try:
            preference = (
                await db.execute(
                    select(NotificationPreference).filter(
                        and_(
                            NotificationPreference.id == preference_id,
                            NotificationPreference.user_id == user_id,
                        )
                    )
                )
                .scalars()
                .first()
            )

            if not preference:
                return False

            # Update allowed fields
            allowed_fields = [
                "is_enabled",
                "frequency",
                "quiet_hours_start",
                "quiet_hours_end",
                "timezone",
                "channel_settings",
            ]

            for field, value in updates.items():
                if field in allowed_fields and hasattr(preference, field):
                    if field == "channel_settings" and isinstance(value, dict):
                        preference.set_channel_settings(value)
                    else:
                        setattr(preference, field, value)

            await db.commit()
            return True

        except Exception as e:
            logger.error(
                f"Failed to update preference {preference_id} for user {user_id}: {str(e)}"
            )
            if "db" in locals():
                await db.rollback()
            return False
