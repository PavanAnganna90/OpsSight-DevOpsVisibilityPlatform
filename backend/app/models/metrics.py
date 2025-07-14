"""
Time-series models for metrics data.
Optimized for high-volume time-series data with partitioning and compression.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    Float,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import TIMESTAMP, JSONB
from enum import Enum
from typing import Optional, Dict, Any, List
from datetime import datetime
import json

from app.db.models import Base


class MetricType(str, Enum):
    """Enumeration for metric types."""

    GAUGE = "gauge"  # Point-in-time value
    COUNTER = "counter"  # Cumulative value
    HISTOGRAM = "histogram"  # Distribution of values
    SUMMARY = "summary"  # Statistical summary
    RATE = "rate"  # Rate of change


class MetricSource(str, Enum):
    """Enumeration for metric data sources."""

    KUBERNETES = "kubernetes"
    DOCKER = "docker"
    AWS_CLOUDWATCH = "aws_cloudwatch"
    PROMETHEUS = "prometheus"
    CUSTOM = "custom"
    APPLICATION = "application"
    INFRASTRUCTURE = "infrastructure"


class Metric(Base):
    """
    Time-series metric data model optimized for TimescaleDB.

    This model stores high-volume time-series metrics with automatic
    partitioning by time and efficient compression for historical data.
    """

    __tablename__ = "metrics"

    # Composite primary key for time-series data
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Multi-tenancy support
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False, index=True
    )

    # Time dimension (primary partitioning key for TimescaleDB)
    timestamp = Column(TIMESTAMP(timezone=True), nullable=False, index=True)

    # Metric identification and metadata
    metric_name = Column(String(255), nullable=False, index=True)
    metric_type = Column(String(20), nullable=False, default=MetricType.GAUGE)
    source = Column(String(50), nullable=False, default=MetricSource.CUSTOM)
    source_id = Column(
        String(255), nullable=True, index=True
    )  # External source identifier

    # Metric value and metadata
    value = Column(Float, nullable=False)
    unit = Column(String(50), nullable=True)

    # Context and dimensions (for grouping and filtering)
    service_name = Column(String(255), nullable=True, index=True)
    environment = Column(String(50), nullable=True, index=True)
    cluster_id = Column(Integer, ForeignKey("clusters.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)

    # Labels and tags (JSONB for flexible querying)
    labels = Column(JSONB, nullable=True, default=lambda: {})
    tags = Column(JSONB, nullable=True, default=lambda: {})

    # Additional metadata
    additional_metadata = Column(JSONB, nullable=True, default=lambda: {})

    # Data quality and processing
    is_interpolated = Column(Boolean, default=False, nullable=False)
    confidence_score = Column(Float, nullable=True)  # Data quality indicator

    # Audit fields
    created_at = Column(TIMESTAMP(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    organization = relationship("Organization", back_populates="metrics")
    cluster = relationship("Cluster", back_populates="metrics")
    project = relationship("Project", back_populates="metrics")

    # Indexes for efficient time-series queries
    __table_args__ = (
        # Compound index for time-series queries
        Index(
            "ix_metrics_org_time_name", "organization_id", "timestamp", "metric_name"
        ),
        Index("ix_metrics_source_time", "source", "source_id", "timestamp"),
        Index(
            "ix_metrics_service_env_time", "service_name", "environment", "timestamp"
        ),
        Index("ix_metrics_project_time", "project_id", "timestamp"),
        Index("ix_metrics_cluster_time", "cluster_id", "timestamp"),
        # GIN indexes for JSON fields
        Index(
            "ix_metrics_labels_gin",
            "labels",
            postgresql_using="gin",
            postgresql_ops={"labels": "jsonb_path_ops"},
        ),
        Index(
            "ix_metrics_tags_gin",
            "tags",
            postgresql_using="gin",
            postgresql_ops={"tags": "jsonb_path_ops"},
        ),
    )

    def __repr__(self) -> str:
        """String representation of Metric model."""
        return f"<Metric(name='{self.metric_name}', value={self.value}, timestamp='{self.timestamp}')>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert metric to dictionary for API responses."""
        return {
            "id": self.id,
            "organization_id": self.organization_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "metric_name": self.metric_name,
            "metric_type": self.metric_type,
            "source": self.source,
            "source_id": self.source_id,
            "value": self.value,
            "unit": self.unit,
            "service_name": self.service_name,
            "environment": self.environment,
            "cluster_id": self.cluster_id,
            "project_id": self.project_id,
            "labels": self.labels or {},
            "tags": self.tags or {},
            "additional_metadata": self.additional_metadata or {},
            "is_interpolated": self.is_interpolated,
            "confidence_score": self.confidence_score,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @classmethod
    def get_time_bucket_query(cls, bucket_interval: str = "1 hour"):
        """
        Helper method to get time-bucketed aggregation query.

        Args:
            bucket_interval: TimescaleDB time bucket interval (e.g., '1 hour', '1 day')

        Returns:
            SQLAlchemy query for time-bucketed data
        """
        from sqlalchemy import text

        return text(
            f"""
            SELECT 
                time_bucket('{bucket_interval}', timestamp) AS bucket,
                metric_name,
                service_name,
                environment,
                AVG(value) as avg_value,
                MAX(value) as max_value,
                MIN(value) as min_value,
                COUNT(*) as data_points
            FROM metrics 
            WHERE organization_id = :org_id
            GROUP BY bucket, metric_name, service_name, environment
            ORDER BY bucket DESC
        """
        )


class MetricSummary(Base):
    """
    Pre-aggregated metric summaries for faster analytics queries.

    This model stores pre-computed metric aggregations at different time
    resolutions to improve query performance for dashboards and reporting.
    """

    __tablename__ = "metric_summaries"

    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Multi-tenancy support
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False, index=True
    )

    # Time dimension and resolution
    time_bucket = Column(TIMESTAMP(timezone=True), nullable=False, index=True)
    resolution = Column(String(20), nullable=False)  # '1min', '5min', '1hour', '1day'

    # Metric identification
    metric_name = Column(String(255), nullable=False, index=True)
    metric_type = Column(String(20), nullable=False)
    source = Column(String(50), nullable=False)

    # Context dimensions
    service_name = Column(String(255), nullable=True, index=True)
    environment = Column(String(50), nullable=True, index=True)
    cluster_id = Column(Integer, ForeignKey("clusters.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)

    # Aggregated values
    avg_value = Column(Float, nullable=True)
    min_value = Column(Float, nullable=True)
    max_value = Column(Float, nullable=True)
    sum_value = Column(Float, nullable=True)
    count_value = Column(Integer, nullable=False, default=0)

    # Statistical measures
    stddev_value = Column(Float, nullable=True)
    percentile_50 = Column(Float, nullable=True)  # Median
    percentile_95 = Column(Float, nullable=True)
    percentile_99 = Column(Float, nullable=True)

    # Data quality indicators
    data_points = Column(Integer, nullable=False, default=0)
    interpolated_points = Column(Integer, nullable=False, default=0)
    missing_points = Column(Integer, nullable=False, default=0)

    # Audit fields
    created_at = Column(TIMESTAMP(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    organization = relationship("Organization")
    cluster = relationship("Cluster")
    project = relationship("Project")

    # Indexes for efficient querying
    __table_args__ = (
        Index(
            "ix_metric_summaries_org_bucket_resolution",
            "organization_id",
            "time_bucket",
            "resolution",
        ),
        Index("ix_metric_summaries_name_bucket", "metric_name", "time_bucket"),
        Index("ix_metric_summaries_service_bucket", "service_name", "time_bucket"),
        Index("ix_metric_summaries_project_bucket", "project_id", "time_bucket"),
        Index("ix_metric_summaries_cluster_bucket", "cluster_id", "time_bucket"),
    )

    def __repr__(self) -> str:
        """String representation of MetricSummary model."""
        return f"<MetricSummary(name='{self.metric_name}', bucket='{self.time_bucket}', resolution='{self.resolution}')>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert metric summary to dictionary for API responses."""
        return {
            "id": self.id,
            "organization_id": self.organization_id,
            "time_bucket": self.time_bucket.isoformat() if self.time_bucket else None,
            "resolution": self.resolution,
            "metric_name": self.metric_name,
            "metric_type": self.metric_type,
            "source": self.source,
            "service_name": self.service_name,
            "environment": self.environment,
            "cluster_id": self.cluster_id,
            "project_id": self.project_id,
            "avg_value": self.avg_value,
            "min_value": self.min_value,
            "max_value": self.max_value,
            "sum_value": self.sum_value,
            "count_value": self.count_value,
            "stddev_value": self.stddev_value,
            "percentile_50": self.percentile_50,
            "percentile_95": self.percentile_95,
            "percentile_99": self.percentile_99,
            "data_points": self.data_points,
            "interpolated_points": self.interpolated_points,
            "missing_points": self.missing_points,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class MetricThreshold(Base):
    """
    Metric thresholds for alerting and monitoring.

    Defines warning and critical thresholds for metrics to trigger
    alerts and notifications when values exceed defined limits.
    """

    __tablename__ = "metric_thresholds"

    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Multi-tenancy support
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False, index=True
    )

    # Metric identification
    metric_name = Column(String(255), nullable=False, index=True)

    # Context filters (optional - applies to all if null)
    service_name = Column(String(255), nullable=True, index=True)
    environment = Column(String(50), nullable=True, index=True)
    cluster_id = Column(Integer, ForeignKey("clusters.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)

    # Threshold values
    warning_min = Column(Float, nullable=True)
    warning_max = Column(Float, nullable=True)
    critical_min = Column(Float, nullable=True)
    critical_max = Column(Float, nullable=True)

    # Threshold configuration
    evaluation_window = Column(
        String(50), nullable=False, default="5m"
    )  # e.g., "5m", "1h"
    consecutive_violations = Column(Integer, nullable=False, default=1)

    # Status and metadata
    is_active = Column(Boolean, default=True, nullable=False)
    description = Column(Text, nullable=True)
    threshold_metadata = Column(JSONB, nullable=True, default=lambda: {})

    # Audit fields
    created_at = Column(TIMESTAMP(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    organization = relationship("Organization")
    cluster = relationship("Cluster")
    project = relationship("Project")
    creator = relationship("User")

    # Indexes
    __table_args__ = (
        Index("ix_metric_thresholds_org_metric", "organization_id", "metric_name"),
        Index("ix_metric_thresholds_service_metric", "service_name", "metric_name"),
        Index("ix_metric_thresholds_active", "is_active"),
    )

    def __repr__(self) -> str:
        """String representation of MetricThreshold model."""
        return f"<MetricThreshold(metric='{self.metric_name}', service='{self.service_name}')>"
