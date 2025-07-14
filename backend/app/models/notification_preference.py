"""
Notification preference model for user notification settings.
Stores user preferences for notification channels, frequency, and types.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    Enum as SQLEnum,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from typing import Optional, Dict, Any, List
import json

from app.db.models import Base


class NotificationChannel(str, Enum):
    """Enumeration for notification channels."""

    EMAIL = "email"
    SLACK = "slack"
    WEBHOOK = "webhook"
    SMS = "sms"
    TEAMS = "teams"
    DISCORD = "discord"
    PUSH = "push"


class NotificationFrequency(str, Enum):
    """Enumeration for notification frequency."""

    IMMEDIATE = "immediate"
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    NEVER = "never"


class NotificationType(str, Enum):
    """Enumeration for notification types."""

    ALERT_CRITICAL = "alert_critical"
    ALERT_HIGH = "alert_high"
    ALERT_MEDIUM = "alert_medium"
    ALERT_LOW = "alert_low"
    PIPELINE_SUCCESS = "pipeline_success"
    PIPELINE_FAILURE = "pipeline_failure"
    DEPLOYMENT_SUCCESS = "deployment_success"
    DEPLOYMENT_FAILURE = "deployment_failure"
    INFRASTRUCTURE_CHANGE = "infrastructure_change"
    AUTOMATION_RUN = "automation_run"
    TEAM_ACTIVITY = "team_activity"
    SYSTEM_MAINTENANCE = "system_maintenance"
    DIGEST_DAILY = "digest_daily"
    DIGEST_WEEKLY = "digest_weekly"


class NotificationPreference(Base):
    """
    Notification preference model for storing user notification settings.

    Defines how users want to receive notifications across different
    channels, frequencies, and notification types.
    """

    __tablename__ = "notification_preferences"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # User association
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Notification configuration
    notification_type = Column(SQLEnum(NotificationType), nullable=False, index=True)
    channel = Column(SQLEnum(NotificationChannel), nullable=False)
    frequency = Column(
        SQLEnum(NotificationFrequency),
        nullable=False,
        default=NotificationFrequency.IMMEDIATE,
    )

    # Channel-specific settings
    is_enabled = Column(Boolean, default=True, nullable=False)
    channel_settings = Column(
        Text, nullable=True
    )  # JSON for channel-specific configuration

    # Team and project filtering
    team_id = Column(
        Integer, ForeignKey("teams.id"), nullable=True
    )  # Team-specific preferences
    project_id = Column(
        Integer, ForeignKey("projects.id"), nullable=True
    )  # Project-specific preferences

    # Quiet hours and do not disturb
    quiet_hours_start = Column(String, nullable=True)  # HH:MM format
    quiet_hours_end = Column(String, nullable=True)  # HH:MM format
    timezone = Column(String, nullable=True, default="UTC")

    # Timestamps
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    user = relationship(
        "User", back_populates="notification_preferences", foreign_keys=[user_id]
    )
    team = relationship(
        "Team", back_populates="notification_preferences", foreign_keys=[team_id]
    )
    project = relationship(
        "Project", back_populates="notification_preferences", foreign_keys=[project_id]
    )

    def __repr__(self) -> str:
        """String representation of NotificationPreference model."""
        return f"<NotificationPreference(id={self.id}, user_id={self.user_id}, type='{self.notification_type}', channel='{self.channel}')>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert notification preference model to dictionary for API responses."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "notification_type": self.notification_type,
            "channel": self.channel,
            "frequency": self.frequency,
            "is_enabled": self.is_enabled,
            "channel_settings": self.get_channel_settings(),
            "team_id": self.team_id,
            "project_id": self.project_id,
            "quiet_hours_start": self.quiet_hours_start,
            "quiet_hours_end": self.quiet_hours_end,
            "timezone": self.timezone,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def get_channel_settings(self) -> Optional[Dict[str, Any]]:
        """Parse channel_settings JSON string to dictionary."""
        if self.channel_settings:
            try:
                return json.loads(self.channel_settings)
            except json.JSONDecodeError:
                return None
        return None

    def set_channel_settings(self, settings: Dict[str, Any]) -> None:
        """Set channel settings as JSON string."""
        self.channel_settings = json.dumps(settings) if settings else None

    def is_in_quiet_hours(self, current_time: str) -> bool:
        """
        Check if current time is within quiet hours.

        Args:
            current_time: Time in HH:MM format

        Returns:
            bool: True if in quiet hours, False otherwise
        """
        if not self.quiet_hours_start or not self.quiet_hours_end:
            return False

        try:
            from datetime import time

            current = time.fromisoformat(current_time)
            start = time.fromisoformat(self.quiet_hours_start)
            end = time.fromisoformat(self.quiet_hours_end)

            if start <= end:
                # Same day range (e.g., 09:00 to 17:00)
                return start <= current <= end
            else:
                # Overnight range (e.g., 22:00 to 06:00)
                return current >= start or current <= end
        except (ValueError, TypeError):
            return False

    def should_send_notification(self, current_time: str = None) -> bool:
        """
        Determine if notification should be sent based on preferences.

        Args:
            current_time: Current time in HH:MM format (optional)

        Returns:
            bool: True if notification should be sent, False otherwise
        """
        if not self.is_enabled:
            return False

        if self.frequency == NotificationFrequency.NEVER:
            return False

        if current_time and self.is_in_quiet_hours(current_time):
            return False

        return True

    @classmethod
    def get_default_preferences(cls, user_id: int) -> List["NotificationPreference"]:
        """
        Create default notification preferences for a new user.

        Args:
            user_id: ID of the user to create preferences for

        Returns:
            List[NotificationPreference]: Default preference objects
        """
        defaults = [
            # Critical alerts - immediate email and Slack
            cls(
                user_id=user_id,
                notification_type=NotificationType.ALERT_CRITICAL,
                channel=NotificationChannel.EMAIL,
                frequency=NotificationFrequency.IMMEDIATE,
                is_enabled=True,
            ),
            cls(
                user_id=user_id,
                notification_type=NotificationType.ALERT_CRITICAL,
                channel=NotificationChannel.SLACK,
                frequency=NotificationFrequency.IMMEDIATE,
                is_enabled=True,
            ),
            # High priority alerts - immediate
            cls(
                user_id=user_id,
                notification_type=NotificationType.ALERT_HIGH,
                channel=NotificationChannel.EMAIL,
                frequency=NotificationFrequency.IMMEDIATE,
                is_enabled=True,
            ),
            # Pipeline failures - immediate
            cls(
                user_id=user_id,
                notification_type=NotificationType.PIPELINE_FAILURE,
                channel=NotificationChannel.SLACK,
                frequency=NotificationFrequency.IMMEDIATE,
                is_enabled=True,
            ),
            # Deployment failures - immediate
            cls(
                user_id=user_id,
                notification_type=NotificationType.DEPLOYMENT_FAILURE,
                channel=NotificationChannel.EMAIL,
                frequency=NotificationFrequency.IMMEDIATE,
                is_enabled=True,
            ),
            # Daily digest - email
            cls(
                user_id=user_id,
                notification_type=NotificationType.DIGEST_DAILY,
                channel=NotificationChannel.EMAIL,
                frequency=NotificationFrequency.DAILY,
                is_enabled=True,
            ),
            # Weekly digest - email
            cls(
                user_id=user_id,
                notification_type=NotificationType.DIGEST_WEEKLY,
                channel=NotificationChannel.EMAIL,
                frequency=NotificationFrequency.WEEKLY,
                is_enabled=False,  # Disabled by default
            ),
        ]
        return defaults
