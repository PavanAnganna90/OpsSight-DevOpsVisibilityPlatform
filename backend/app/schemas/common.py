"""
Common schemas and response models for the OpsSight DevOps Platform API.

This module provides reusable Pydantic models for consistent API responses,
error handling, and documentation across all endpoints.
"""

from typing import Any, Dict, List, Optional, Union
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class ResponseStatus(str, Enum):
    """Standard response status values."""

    SUCCESS = "success"
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class HealthStatus(str, Enum):
    """Health check status values."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


# Base Response Models
class BaseResponse(BaseModel):
    """Base response model for all API endpoints."""

    status: ResponseStatus = Field(..., description="Response status indicator")
    message: Optional[str] = Field(None, description="Human-readable message")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Response timestamp in UTC"
    )
    request_id: Optional[str] = Field(
        None, description="Unique request identifier for tracing"
    )

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class SuccessResponse(BaseResponse):
    """Success response with data payload."""

    status: ResponseStatus = ResponseStatus.SUCCESS
    data: Optional[Any] = Field(None, description="Response data payload")


class ErrorResponse(BaseResponse):
    """Error response with detailed error information."""

    status: ResponseStatus = ResponseStatus.ERROR
    error_code: Optional[str] = Field(None, description="Machine-readable error code")
    details: Optional[Dict[str, Any]] = Field(
        None, description="Additional error details"
    )


class PaginatedResponse(SuccessResponse):
    """Paginated response with metadata."""

    pagination: Dict[str, Union[int, str]] = Field(
        ...,
        description="Pagination metadata",
        example={
            "page": 1,
            "page_size": 20,
            "total": 150,
            "total_pages": 8,
            "has_next": True,
            "has_previous": False,
            "next_page": "/api/v1/resource?page=2",
            "previous_page": None,
        },
    )


# Health Check Models
class HealthCheckResponse(BaseModel):
    """Basic health check response."""

    status: HealthStatus = Field(..., description="Overall health status")
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service version")
    environment: str = Field(..., description="Deployment environment")

    class Config:
        schema_extra = {
            "example": {
                "status": "healthy",
                "service": "OpsSight DevOps Platform",
                "version": "2.0.0",
                "environment": "production",
            }
        }


class DetailedHealthCheckResponse(HealthCheckResponse):
    """Detailed health check with dependency status."""

    dependencies: Dict[str, bool] = Field(
        ...,
        description="Status of external dependencies",
        example={"database": True, "redis": True, "cache_manager": True},
    )


# API Information Models
class APIFeature(BaseModel):
    """API feature description."""

    name: str = Field(..., description="Feature name")
    description: str = Field(..., description="Feature description")
    endpoint: Optional[str] = Field(
        None, description="Primary endpoint for this feature"
    )


class APIInfoResponse(BaseModel):
    """API information and navigation response."""

    message: str = Field(..., description="Welcome message")
    description: str = Field(..., description="API description")
    version: str = Field(..., description="API version")
    docs_url: Optional[str] = Field(None, description="Documentation URL")
    api_version: str = Field(..., description="API version path")
    features: List[str] = Field(..., description="Available features")

    class Config:
        schema_extra = {
            "example": {
                "message": "Welcome to OpsSight DevOps Platform",
                "description": "Modern DevOps platform for CI/CD, infrastructure management, and team collaboration",
                "version": "2.0.0",
                "docs_url": "/docs",
                "api_version": "/api/v1",
                "features": [
                    "Authentication & Authorization",
                    "Infrastructure Management",
                    "CI/CD Pipelines",
                    "Real-time Monitoring",
                    "Team Collaboration",
                ],
            }
        }


# Cache Performance Models
class CacheMetrics(BaseModel):
    """Cache performance metrics."""

    hit_rate: float = Field(..., ge=0, le=1, description="Cache hit rate (0.0 to 1.0)")
    miss_rate: float = Field(
        ..., ge=0, le=1, description="Cache miss rate (0.0 to 1.0)"
    )
    total_requests: int = Field(..., ge=0, description="Total cache requests")
    hits: int = Field(..., ge=0, description="Cache hits")
    misses: int = Field(..., ge=0, description="Cache misses")
    size: int = Field(..., ge=0, description="Current cache size")
    max_size: int = Field(..., gt=0, description="Maximum cache size")

    class Config:
        schema_extra = {
            "example": {
                "hit_rate": 0.85,
                "miss_rate": 0.15,
                "total_requests": 1000,
                "hits": 850,
                "misses": 150,
                "size": 500,
                "max_size": 1000,
            }
        }


class APIPerformanceInfo(BaseModel):
    """API performance information."""

    response_time_ms: float = Field(
        ..., ge=0, description="Average response time in milliseconds"
    )
    cache_enabled: bool = Field(
        ..., description="Whether caching is enabled for this endpoint"
    )
    cache_ttl: Optional[int] = Field(None, description="Cache TTL in seconds")
    cache_level: Optional[str] = Field(
        None, description="Cache level (memory, redis, both)"
    )

    class Config:
        schema_extra = {
            "example": {
                "response_time_ms": 45.2,
                "cache_enabled": True,
                "cache_ttl": 300,
                "cache_level": "both",
            }
        }


# Common Field Types
class IDField(BaseModel):
    """Common ID field with validation."""

    id: int = Field(..., gt=0, description="Unique identifier")


class TimestampFields(BaseModel):
    """Common timestamp fields."""

    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


# Export commonly used models
__all__ = [
    "ResponseStatus",
    "HealthStatus",
    "BaseResponse",
    "SuccessResponse",
    "ErrorResponse",
    "PaginatedResponse",
    "HealthCheckResponse",
    "DetailedHealthCheckResponse",
    "APIInfoResponse",
    "CacheMetrics",
    "APIPerformanceInfo",
    "IDField",
    "TimestampFields",
]
