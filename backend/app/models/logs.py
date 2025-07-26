"""
Time-series models for logs and events data.
Optimized for high-volume log ingestion with partitioning and compression.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    Index,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID, JSONB
from enum import Enum
from typing import Optional, Dict, Any, List
from datetime import datetime
import json
import uuid

from app.db.database import Base


class LogLevel(str, Enum):
    """Enumeration for log levels."""

    TRACE = "trace"
    DEBUG = "debug"
    INFO = "info"
    WARN = "warn"
    ERROR = "error"
    FATAL = "fatal"


class LogSource(str, Enum):
    """Enumeration for log sources."""

    APPLICATION = "application"
    KUBERNETES = "kubernetes"
    DOCKER = "docker"
    NGINX = "nginx"
    SYSTEM = "system"
    SECURITY = "security"
    AUDIT = "audit"
    INFRASTRUCTURE = "infrastructure"


class EventType(str, Enum):
    """Enumeration for event types."""

    DEPLOYMENT = "deployment"
    SCALING = "scaling"
    ALERT = "alert"
    INCIDENT = "incident"
    CONFIG_CHANGE = "config_change"
    SECURITY_EVENT = "security_event"
    USER_ACTION = "user_action"
    SYSTEM_EVENT = "system_event"
    CUSTOM = "custom"


class LogEntry(Base):
    """
    Time-series log data model optimized for TimescaleDB.

    Stores high-volume log entries with automatic partitioning by time
    and efficient compression for historical data.
    """

    __tablename__ = "log_entries"

    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Multi-tenancy support
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False, index=True
    )

    # Time dimension (primary partitioning key)
    timestamp = Column(TIMESTAMP(timezone=True), nullable=False, index=True)

    # Log identification and metadata
    log_level = Column(String(10), nullable=False, default=LogLevel.INFO, index=True)
    source = Column(
        String(50), nullable=False, default=LogSource.APPLICATION, index=True
    )
    source_id = Column(
        String(255), nullable=True, index=True
    )  # Container ID, Pod name, etc.

    # Message and content
    message = Column(Text, nullable=False)
    raw_log = Column(Text, nullable=True)  # Original log line

    # Context and dimensions
    service_name = Column(String(255), nullable=True, index=True)
    environment = Column(String(50), nullable=True, index=True)
    cluster_id = Column(Integer, ForeignKey("clusters.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)

    # Application context
    application_name = Column(String(255), nullable=True, index=True)
    version = Column(String(100), nullable=True)
    instance_id = Column(String(255), nullable=True)

    # Request context (for application logs)
    trace_id = Column(String(128), nullable=True)
    span_id = Column(String(64), nullable=True)
    request_id = Column(String(128), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Technical details
    host = Column(String(255), nullable=True, index=True)
    container_name = Column(String(255), nullable=True)
    pod_name = Column(String(255), nullable=True)
    namespace = Column(String(255), nullable=True)

    # Structured data and labels
    labels = Column(JSONB, nullable=True, default=lambda: {})
    tags = Column(JSONB, nullable=True, default=lambda: {})
    structured_data = Column(
        JSONB, nullable=True, default=lambda: {}
    )  # Parsed log fields

    # Error information
    error_code = Column(String(50), nullable=True)
    stack_trace = Column(Text, nullable=True)

    # Additional metadata
    additional_metadata = Column(JSONB, nullable=True, default=lambda: {})

    # Processing information
    parsed_at = Column(TIMESTAMP(timezone=True), nullable=True)
    enriched_at = Column(TIMESTAMP(timezone=True), nullable=True)

    # Audit fields
    created_at = Column(TIMESTAMP(timezone=True), default=func.now(), nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="log_entries")
    cluster = relationship("Cluster", back_populates="log_entries")
    project = relationship("Project", back_populates="log_entries")
    user = relationship("User")

    # Indexes for efficient log queries
    __table_args__ = (
        # Primary time-series indexes
        Index(
            "ix_log_entries_org_time_level", "organization_id", "timestamp", "log_level"
        ),
        Index("ix_log_entries_source_time", "source", "source_id", "timestamp"),
        Index("ix_log_entries_service_time", "service_name", "timestamp"),
        Index("ix_log_entries_app_time", "application_name", "timestamp"),
        # Tracing and debugging indexes
        Index("ix_log_entries_trace_id", "trace_id"),
        Index("ix_log_entries_request_id", "request_id"),
        # Infrastructure indexes
        Index("ix_log_entries_host_time", "host", "timestamp"),
        Index("ix_log_entries_container_time", "container_name", "timestamp"),
        Index("ix_log_entries_pod_time", "pod_name", "timestamp"),
        # JSON field indexes
        Index(
            "ix_log_entries_labels_gin",
            "labels",
            postgresql_using="gin",
            postgresql_ops={"labels": "jsonb_path_ops"},
        ),
        Index(
            "ix_log_entries_structured_gin",
            "structured_data",
            postgresql_using="gin",
            postgresql_ops={"structured_data": "jsonb_path_ops"},
        ),
    )

    def __repr__(self) -> str:
        """String representation of LogEntry model."""
        return f"<LogEntry(level='{self.log_level}', service='{self.service_name}', timestamp='{self.timestamp}')>"

    def to_dict(self, include_raw: bool = False) -> Dict[str, Any]:
        """Convert log entry to dictionary for API responses."""
        data = {
            "id": self.id,
            "organization_id": self.organization_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "log_level": self.log_level,
            "source": self.source,
            "source_id": self.source_id,
            "message": self.message,
            "service_name": self.service_name,
            "environment": self.environment,
            "cluster_id": self.cluster_id,
            "project_id": self.project_id,
            "application_name": self.application_name,
            "version": self.version,
            "instance_id": self.instance_id,
            "trace_id": self.trace_id,
            "span_id": self.span_id,
            "request_id": self.request_id,
            "user_id": self.user_id,
            "host": self.host,
            "container_name": self.container_name,
            "pod_name": self.pod_name,
            "namespace": self.namespace,
            "labels": self.labels or {},
            "tags": self.tags or {},
            "structured_data": self.structured_data or {},
            "error_code": self.error_code,
            "additional_metadata": self.additional_metadata or {},
            "parsed_at": self.parsed_at.isoformat() if self.parsed_at else None,
            "enriched_at": self.enriched_at.isoformat() if self.enriched_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

        if include_raw:
            data["raw_log"] = self.raw_log
            data["stack_trace"] = self.stack_trace

        return data


class Event(Base):
    """
    Time-series event data model for tracking significant occurrences.

    Stores events like deployments, scaling, alerts, and incidents
    with structured metadata for analytics and alerting.
    """

    __tablename__ = "events"

    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Multi-tenancy support
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False, index=True
    )

    # Time dimension
    timestamp = Column(TIMESTAMP(timezone=True), nullable=False, index=True)
    end_timestamp = Column(
        TIMESTAMP(timezone=True), nullable=True
    )  # For duration events

    # Event identification
    event_type = Column(
        String(50), nullable=False, default=EventType.CUSTOM, index=True
    )
    event_name = Column(String(255), nullable=False, index=True)
    event_id = Column(String(128), nullable=True, unique=True)  # External event ID

    # Event details
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(
        String(20), nullable=False, default="info"
    )  # info, warning, error, critical

    # Context and scope
    service_name = Column(String(255), nullable=True, index=True)
    environment = Column(String(50), nullable=True, index=True)
    cluster_id = Column(Integer, ForeignKey("clusters.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)

    # Source information
    source = Column(String(100), nullable=True)
    source_url = Column(String(1000), nullable=True)
    triggered_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Event status and resolution
    status = Column(
        String(50), nullable=False, default="open"
    )  # open, acknowledged, resolved, closed
    resolved_at = Column(TIMESTAMP(timezone=True), nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    # Impact and metrics
    affected_services = Column(JSONB, nullable=True, default=lambda: [])
    impact_level = Column(String(20), nullable=True)  # low, medium, high, critical
    downtime_duration = Column(Integer, nullable=True)  # Duration in seconds

    # Structured event data
    event_data = Column(JSONB, nullable=True, default=lambda: {})
    labels = Column(JSONB, nullable=True, default=lambda: {})
    tags = Column(JSONB, nullable=True, default=lambda: {})

    # Correlation and relationships
    parent_event_id = Column(Integer, ForeignKey("events.id"), nullable=True)
    correlation_id = Column(String(128), nullable=True, index=True)

    # Additional metadata
    event_metadata = Column(JSONB, nullable=True, default=lambda: {})

    # Audit fields
    created_at = Column(TIMESTAMP(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    organization = relationship("Organization", back_populates="events")
    cluster = relationship("Cluster", back_populates="events")
    project = relationship("Project", back_populates="events")
    triggered_by_user = relationship("User", foreign_keys=[triggered_by])
    resolved_by_user = relationship("User", foreign_keys=[resolved_by])
    parent_event = relationship("Event", remote_side=[id])
    child_events = relationship("Event", back_populates="parent_event")

    # Indexes for efficient event queries
    __table_args__ = (
        Index("ix_events_org_time_type", "organization_id", "timestamp", "event_type"),
        Index("ix_events_service_time", "service_name", "timestamp"),
        Index("ix_events_severity_time", "severity", "timestamp"),
        Index("ix_events_status_time", "status", "timestamp"),
        Index("ix_events_correlation", "correlation_id"),
        Index("ix_events_project_time", "project_id", "timestamp"),
        Index("ix_events_cluster_time", "cluster_id", "timestamp"),
        # JSON field indexes
        Index(
            "ix_events_labels_gin",
            "labels",
            postgresql_using="gin",
            postgresql_ops={"labels": "jsonb_path_ops"},
        ),
        Index(
            "ix_events_event_data_gin",
            "event_data",
            postgresql_using="gin",
            postgresql_ops={"event_data": "jsonb_path_ops"},
        ),
    )

    def __repr__(self) -> str:
        """String representation of Event model."""
        return f"<Event(type='{self.event_type}', name='{self.event_name}', timestamp='{self.timestamp}')>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for API responses."""
        return {
            "id": self.id,
            "organization_id": self.organization_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "end_timestamp": (
                self.end_timestamp.isoformat() if self.end_timestamp else None
            ),
            "event_type": self.event_type,
            "event_name": self.event_name,
            "event_id": self.event_id,
            "title": self.title,
            "description": self.description,
            "severity": self.severity,
            "service_name": self.service_name,
            "environment": self.environment,
            "cluster_id": self.cluster_id,
            "project_id": self.project_id,
            "source": self.source,
            "source_url": self.source_url,
            "triggered_by": self.triggered_by,
            "status": self.status,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "resolved_by": self.resolved_by,
            "resolution_notes": self.resolution_notes,
            "affected_services": self.affected_services or [],
            "impact_level": self.impact_level,
            "downtime_duration": self.downtime_duration,
            "event_data": self.event_data or {},
            "labels": self.labels or {},
            "tags": self.tags or {},
            "parent_event_id": self.parent_event_id,
            "correlation_id": self.correlation_id,
            "event_metadata": self.event_metadata or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @property
    def duration_seconds(self) -> Optional[int]:
        """Calculate event duration in seconds."""
        if self.timestamp and self.end_timestamp:
            return int((self.end_timestamp - self.timestamp).total_seconds())
        return None
