"""
Metrics schemas for OpsSight DevOps platform.
Handles metric data validation and serialization.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID


class MetricBase(BaseModel):
    """Base metric schema with common fields."""

    name: str = Field(..., description="Metric name")
    value: float = Field(..., description="Metric value")
    unit: Optional[str] = Field(None, description="Unit of measurement")
    tags: Optional[Dict[str, str]] = Field(
        default_factory=dict, description="Metric tags"
    )
    source: Optional[str] = Field(None, description="Data source")


class MetricCreate(MetricBase):
    """Schema for creating a new metric."""

    timestamp: Optional[datetime] = Field(None, description="Metric timestamp")


class MetricUpdate(BaseModel):
    """Schema for updating a metric."""

    name: Optional[str] = Field(None, description="Metric name")
    value: Optional[float] = Field(None, description="Metric value")
    unit: Optional[str] = Field(None, description="Unit of measurement")
    tags: Optional[Dict[str, str]] = Field(None, description="Metric tags")
    source: Optional[str] = Field(None, description="Data source")


class MetricResponse(MetricBase):
    """Schema for metric response."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Metric ID")
    timestamp: datetime = Field(..., description="Metric timestamp")
    created_at: datetime = Field(..., description="Creation timestamp")


class MetricsListResponse(BaseModel):
    """Schema for paginated metrics list."""

    metrics: List[MetricResponse] = Field(..., description="List of metrics")
    total: int = Field(..., description="Total number of metrics")
    skip: int = Field(..., description="Number of skipped records")
    limit: int = Field(..., description="Number of returned records")
    filters: Optional[Dict[str, Any]] = Field(None, description="Applied filters")


class MetricAggregation(BaseModel):
    """Schema for metric aggregation results."""

    metric_name: str = Field(..., description="Metric name")
    aggregation_type: str = Field(..., description="Aggregation type")
    interval: str = Field(..., description="Aggregation interval")
    start_time: datetime = Field(..., description="Start time")
    end_time: datetime = Field(..., description="End time")
    data_points: List[Dict[str, Any]] = Field(..., description="Aggregated data points")
    summary: Dict[str, float] = Field(..., description="Summary statistics")


class ServiceHealth(BaseModel):
    """Schema for individual service health."""

    status: str = Field(..., description="Service status")
    response_time: float = Field(..., description="Response time in ms")
    uptime: float = Field(..., description="Uptime percentage")


class SystemHealthResponse(BaseModel):
    """Schema for system health overview."""

    status: str = Field(..., description="Overall system status")
    services: Dict[str, ServiceHealth] = Field(..., description="Service health status")
    metrics: Dict[str, float] = Field(..., description="System metrics")
    alerts_count: int = Field(..., description="Number of active alerts")
    last_updated: datetime = Field(..., description="Last update timestamp")
