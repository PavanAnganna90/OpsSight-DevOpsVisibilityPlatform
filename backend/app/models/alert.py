"""
Alert model for system alerts and notifications.
Stores alert data, channels, and status tracking.
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

from app.db.database import Base


class AlertSeverity(str, Enum):
    """Enumeration for alert severity levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertStatus(str, Enum):
    """Enumeration for alert status."""

    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"


class AlertChannel(str, Enum):
    """Enumeration for alert channels."""

    EMAIL = "email"
    SLACK = "slack"
    WEBHOOK = "webhook"
    SMS = "sms"
    TEAMS = "teams"
    DISCORD = "discord"


class Alert(Base):
    """
    Alert model for tracking system alerts and notifications.

    Stores alert information including severity, status, channels,
    and related metadata for monitoring and notification systems.
    """

    __tablename__ = "alerts"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Alert identification
    alert_id = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, index=True, nullable=False)
    message = Column(Text, nullable=False)

    # Alert classification
    severity = Column(
        SQLEnum(AlertSeverity), nullable=False, default=AlertSeverity.MEDIUM
    )
    status = Column(SQLEnum(AlertStatus), nullable=False, default=AlertStatus.ACTIVE)
    source = Column(
        String, index=True, nullable=False
    )  # pipeline, cluster, automation, etc.
    category = Column(
        String, index=True, nullable=True
    )  # performance, security, availability

    # Notification channels
    channels = Column(Text, nullable=True)  # JSON array of channels

    # Context and metadata
    context_data = Column(Text, nullable=True)  # JSON object with context
    labels = Column(Text, nullable=True)  # JSON object with labels
    annotations = Column(Text, nullable=True)  # JSON object with annotations

    # Related entities
    pipeline_id = Column(Integer, ForeignKey("pipelines.id"), nullable=True)
    cluster_id = Column(Integer, ForeignKey("clusters.id"), nullable=True)
    automation_run_id = Column(Integer, ForeignKey("automation_runs.id"), nullable=True)
    infrastructure_change_id = Column(
        Integer, ForeignKey("infrastructure_changes.id"), nullable=True
    )
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)

    # Alert lifecycle
    acknowledged_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_comment = Column(Text, nullable=True)

    # Timestamps
    triggered_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
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
    pipeline = relationship(
        "Pipeline", back_populates="alerts", foreign_keys=[pipeline_id]
    )
    cluster = relationship(
        "Cluster", back_populates="alerts", foreign_keys=[cluster_id]
    )
    automation_run = relationship(
        "AutomationRun", back_populates="alerts", foreign_keys=[automation_run_id]
    )
    infrastructure_change = relationship(
        "InfrastructureChange",
        back_populates="alerts",
        foreign_keys=[infrastructure_change_id],
    )
    project = relationship(
        "Project", back_populates="alerts", foreign_keys=[project_id]
    )
    acknowledged_by = relationship(
        "User",
        back_populates="acknowledged_alerts",
        foreign_keys=[acknowledged_by_user_id],
    )
    resolved_by = relationship(
        "User", back_populates="resolved_alerts", foreign_keys=[resolved_by_user_id]
    )

    def __repr__(self) -> str:
        """String representation of Alert model."""
        return f"<Alert(id={self.id}, title='{self.title}', severity='{self.severity}', status='{self.status}')>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert alert model to dictionary for API responses."""
        return {
            "id": self.id,
            "alert_id": self.alert_id,
            "title": self.title,
            "message": self.message,
            "severity": self.severity,
            "status": self.status,
            "source": self.source,
            "category": self.category,
            "channels": self.get_channels(),
            "context_data": self.get_context_data(),
            "labels": self.get_labels(),
            "annotations": self.get_annotations(),
            "pipeline_id": self.pipeline_id,
            "cluster_id": self.cluster_id,
            "automation_run_id": self.automation_run_id,
            "infrastructure_change_id": self.infrastructure_change_id,
            "project_id": self.project_id,
            "acknowledged_by_user_id": self.acknowledged_by_user_id,
            "acknowledged_at": (
                self.acknowledged_at.isoformat() if self.acknowledged_at else None
            ),
            "resolved_by_user_id": self.resolved_by_user_id,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "resolution_comment": self.resolution_comment,
            "triggered_at": (
                self.triggered_at.isoformat() if self.triggered_at else None
            ),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def get_channels(self) -> Optional[List[str]]:
        """Parse channels JSON string to list."""
        if self.channels:
            try:
                return json.loads(self.channels)
            except json.JSONDecodeError:
                return None
        return None

    def set_channels(self, channels_list: List[str]) -> None:
        """Set channels as JSON string."""
        self.channels = json.dumps(channels_list) if channels_list else None

    def get_context_data(self) -> Optional[Dict[str, Any]]:
        """Parse context_data JSON string to dictionary."""
        if self.context_data:
            try:
                return json.loads(self.context_data)
            except json.JSONDecodeError:
                return None
        return None

    def set_context_data(self, context: Dict[str, Any]) -> None:
        """Set context data as JSON string."""
        self.context_data = json.dumps(context) if context else None

    def get_labels(self) -> Optional[Dict[str, str]]:
        """Parse labels JSON string to dictionary."""
        if self.labels:
            try:
                return json.loads(self.labels)
            except json.JSONDecodeError:
                return None
        return None

    def set_labels(self, labels_dict: Dict[str, str]) -> None:
        """Set labels as JSON string."""
        self.labels = json.dumps(labels_dict) if labels_dict else None

    def get_annotations(self) -> Optional[Dict[str, str]]:
        """Parse annotations JSON string to dictionary."""
        if self.annotations:
            try:
                return json.loads(self.annotations)
            except json.JSONDecodeError:
                return None
        return None

    def set_annotations(self, annotations_dict: Dict[str, str]) -> None:
        """Set annotations as JSON string."""
        self.annotations = json.dumps(annotations_dict) if annotations_dict else None

    def acknowledge(self, user_id: int, comment: Optional[str] = None) -> None:
        """Acknowledge the alert."""
        self.status = AlertStatus.ACKNOWLEDGED
        self.acknowledged_by_user_id = user_id
        self.acknowledged_at = func.now()
        if comment:
            self.resolution_comment = comment

    def resolve(self, user_id: int, comment: Optional[str] = None) -> None:
        """Resolve the alert."""
        self.status = AlertStatus.RESOLVED
        self.resolved_by_user_id = user_id
        self.resolved_at = func.now()
        if comment:
            self.resolution_comment = comment

    def suppress(self) -> None:
        """Suppress the alert."""
        self.status = AlertStatus.SUPPRESSED

    def is_active(self) -> bool:
        """Check if alert is active."""
        return self.status == AlertStatus.ACTIVE

    def is_resolved(self) -> bool:
        """Check if alert is resolved."""
        return self.status == AlertStatus.RESOLVED
