"""
Notification log model for tracking sent notifications.
Stores audit trail and enables deduplication of notifications.
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
from typing import Optional, Dict, Any
import json

from app.db.database import Base


class DeliveryStatus(str, Enum):
    """Enumeration for notification delivery status."""

    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    BOUNCED = "bounced"
    REJECTED = "rejected"


class NotificationLog(Base):
    """
    Notification log model for tracking sent notifications.

    Provides audit trail for all notifications sent through the system,
    enables deduplication, and tracks delivery status.
    """

    __tablename__ = "notification_logs"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Notification identification
    notification_id = Column(
        String, unique=True, index=True, nullable=False
    )  # UUID for tracking
    digest_id = Column(String, index=True, nullable=True)  # For grouped notifications

    # Recipient information
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    channel = Column(String, nullable=False, index=True)  # email, slack, etc.
    recipient_address = Column(
        String, nullable=False
    )  # email address, slack channel, etc.

    # Notification content
    notification_type = Column(String, nullable=False, index=True)
    subject = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    template_name = Column(String, nullable=True)

    # Source information
    source_type = Column(String, nullable=True)  # alert, pipeline, automation, etc.
    source_id = Column(Integer, nullable=True)  # ID of the source entity
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)

    # Delivery tracking
    status = Column(
        SQLEnum(DeliveryStatus), nullable=False, default=DeliveryStatus.PENDING
    )
    delivery_attempts = Column(Integer, default=0, nullable=False)
    last_delivery_attempt = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)

    # Error tracking
    error_message = Column(Text, nullable=True)
    error_details = Column(Text, nullable=True)  # JSON with additional error info

    # Provider-specific tracking
    provider_message_id = Column(String, nullable=True)  # External service message ID
    provider_response = Column(Text, nullable=True)  # JSON response from provider

    # Metadata
    notification_metadata = Column(Text, nullable=True)  # JSON with additional context
    priority = Column(String, nullable=True, default="normal")

    # Deduplication
    deduplication_key = Column(
        String, index=True, nullable=True
    )  # For preventing duplicates

    # Timestamps
    scheduled_at = Column(
        DateTime(timezone=True), nullable=True
    )  # For delayed notifications
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
        "User", back_populates="notification_logs", foreign_keys=[user_id]
    )
    team = relationship(
        "Team", back_populates="notification_logs", foreign_keys=[team_id]
    )
    project = relationship(
        "Project", back_populates="notification_logs", foreign_keys=[project_id]
    )

    def __repr__(self) -> str:
        """String representation of NotificationLog model."""
        return f"<NotificationLog(id={self.id}, notification_id='{self.notification_id}', channel='{self.channel}', status='{self.status}')>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert notification log model to dictionary for API responses."""
        return {
            "id": self.id,
            "notification_id": self.notification_id,
            "digest_id": self.digest_id,
            "user_id": self.user_id,
            "channel": self.channel,
            "recipient_address": self.recipient_address,
            "notification_type": self.notification_type,
            "subject": self.subject,
            "content": (
                self.content[:500] + "..." if len(self.content) > 500 else self.content
            ),  # Truncate for API
            "template_name": self.template_name,
            "source_type": self.source_type,
            "source_id": self.source_id,
            "team_id": self.team_id,
            "project_id": self.project_id,
            "status": self.status,
            "delivery_attempts": self.delivery_attempts,
            "last_delivery_attempt": (
                self.last_delivery_attempt.isoformat()
                if self.last_delivery_attempt
                else None
            ),
            "delivered_at": (
                self.delivered_at.isoformat() if self.delivered_at else None
            ),
            "error_message": self.error_message,
            "provider_message_id": self.provider_message_id,
            "metadata": self.get_metadata(),
            "priority": self.priority,
            "deduplication_key": self.deduplication_key,
            "scheduled_at": (
                self.scheduled_at.isoformat() if self.scheduled_at else None
            ),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def get_metadata(self) -> Optional[Dict[str, Any]]:
        """Parse notification_metadata JSON string to dictionary."""
        if self.notification_metadata:
            try:
                return json.loads(self.notification_metadata)
            except json.JSONDecodeError:
                return None
        return None

    def set_metadata(self, metadata_dict: Dict[str, Any]) -> None:
        """Set notification metadata as JSON string."""
        self.notification_metadata = (
            json.dumps(metadata_dict) if metadata_dict else None
        )

    def get_error_details(self) -> Optional[Dict[str, Any]]:
        """Parse error_details JSON string to dictionary."""
        if self.error_details:
            try:
                return json.loads(self.error_details)
            except json.JSONDecodeError:
                return None
        return None

    def set_error_details(self, error_dict: Dict[str, Any]) -> None:
        """Set error details as JSON string."""
        self.error_details = json.dumps(error_dict) if error_dict else None

    def get_provider_response(self) -> Optional[Dict[str, Any]]:
        """Parse provider_response JSON string to dictionary."""
        if self.provider_response:
            try:
                return json.loads(self.provider_response)
            except json.JSONDecodeError:
                return None
        return None

    def set_provider_response(self, response_dict: Dict[str, Any]) -> None:
        """Set provider response as JSON string."""
        self.provider_response = json.dumps(response_dict) if response_dict else None

    def mark_sent(
        self, provider_message_id: str = None, provider_response: Dict[str, Any] = None
    ) -> None:
        """Mark notification as sent."""
        self.status = DeliveryStatus.SENT
        self.last_delivery_attempt = func.now()
        if provider_message_id:
            self.provider_message_id = provider_message_id
        if provider_response:
            self.set_provider_response(provider_response)

    def mark_delivered(self) -> None:
        """Mark notification as delivered."""
        self.status = DeliveryStatus.DELIVERED
        self.delivered_at = func.now()

    def mark_failed(
        self, error_message: str, error_details: Dict[str, Any] = None
    ) -> None:
        """Mark notification as failed."""
        self.status = DeliveryStatus.FAILED
        self.error_message = error_message
        self.last_delivery_attempt = func.now()
        self.delivery_attempts += 1
        if error_details:
            self.set_error_details(error_details)

    def increment_delivery_attempt(self) -> None:
        """Increment delivery attempt counter."""
        self.delivery_attempts += 1
        self.last_delivery_attempt = func.now()

    def is_deliverable(self, max_attempts: int = 3) -> bool:
        """Check if notification can still be attempted for delivery."""
        return (
            self.status in [DeliveryStatus.PENDING, DeliveryStatus.FAILED]
            and self.delivery_attempts < max_attempts
        )

    def is_delivered(self) -> bool:
        """Check if notification was successfully delivered."""
        return self.status in [DeliveryStatus.SENT, DeliveryStatus.DELIVERED]

    def is_failed(self) -> bool:
        """Check if notification failed permanently."""
        return self.status in [
            DeliveryStatus.FAILED,
            DeliveryStatus.BOUNCED,
            DeliveryStatus.REJECTED,
        ]

    @classmethod
    def create_deduplication_key(
        cls,
        user_id: int,
        notification_type: str,
        source_type: str = None,
        source_id: int = None,
        time_window_minutes: int = 60,
    ) -> str:
        """
        Create a deduplication key for preventing duplicate notifications.

        Args:
            user_id: ID of the recipient user
            notification_type: Type of notification
            source_type: Type of source entity (optional)
            source_id: ID of source entity (optional)
            time_window_minutes: Time window for deduplication in minutes

        Returns:
            str: Deduplication key
        """
        import hashlib
        from datetime import datetime, timedelta

        # Round current time to the nearest time window
        now = datetime.utcnow()
        window_start = now.replace(
            minute=now.minute // time_window_minutes * time_window_minutes,
            second=0,
            microsecond=0,
        )

        key_parts = [
            str(user_id),
            notification_type,
            str(source_type) if source_type else "",
            str(source_id) if source_id else "",
            window_start.isoformat(),
        ]

        key_string = "|".join(key_parts)
        return hashlib.md5(key_string.encode()).hexdigest()
