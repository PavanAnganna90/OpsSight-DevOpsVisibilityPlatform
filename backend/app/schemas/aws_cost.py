"""
Pydantic schemas for AWS Cost Explorer data.
Defines request/response models for AWS cost data operations.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from enum import Enum


class CostGranularityEnum(str, Enum):
    """Cost data granularity options"""

    DAILY = "DAILY"
    MONTHLY = "MONTHLY"
    HOURLY = "HOURLY"


class AnomalyTypeEnum(str, Enum):
    """Cost anomaly types"""

    SPIKE = "SPIKE"
    TREND_INCREASE = "TREND_INCREASE"
    UNUSUAL_SERVICE = "UNUSUAL_SERVICE"
    BUDGET_EXCEED = "BUDGET_EXCEED"


class SeverityEnum(str, Enum):
    """Anomaly severity levels"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# AWS Account Schemas
class AwsAccountBase(BaseModel):
    """Base AWS Account schema"""

    account_id: str = Field(..., min_length=12, max_length=12)
    account_name: str = Field(..., min_length=1, max_length=255)
    region: str = Field(default="us-east-1", max_length=50)
    is_active: bool = Field(default=True)
    project_id: Optional[int] = None


class AwsAccountCreate(AwsAccountBase):
    """Schema for creating AWS account"""

    access_key_id: str = Field(..., min_length=16, max_length=255)
    secret_access_key: str = Field(..., min_length=16, max_length=255)


class AwsAccountUpdate(BaseModel):
    """Schema for updating AWS account"""

    account_name: Optional[str] = Field(None, max_length=255)
    region: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    project_id: Optional[int] = None


class AwsAccount(AwsAccountBase):
    """AWS Account response schema"""

    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Cost Data Schemas
class AwsCostDataBase(BaseModel):
    """Base cost data schema"""

    start_date: date
    end_date: date
    granularity: CostGranularityEnum = CostGranularityEnum.DAILY
    service_name: Optional[str] = None
    region: Optional[str] = None
    usage_type: Optional[str] = None
    operation: Optional[str] = None
    linked_account_id: Optional[str] = None
    instance_type: Optional[str] = None
    unblended_cost: Decimal = Field(default=0, ge=0)
    blended_cost: Decimal = Field(default=0, ge=0)
    net_unblended_cost: Decimal = Field(default=0, ge=0)
    net_blended_cost: Decimal = Field(default=0, ge=0)
    amortized_cost: Decimal = Field(default=0, ge=0)
    usage_quantity: Optional[Decimal] = None
    usage_unit: Optional[str] = None
    currency: str = Field(default="USD", max_length=3)


class AwsCostDataCreate(AwsCostDataBase):
    """Schema for creating cost data"""

    aws_account_id: int
    raw_data: Optional[Dict[str, Any]] = None


class AwsCostData(AwsCostDataBase):
    """Cost data response schema"""

    id: int
    aws_account_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Request/Response Schemas for API endpoints
class CostDataRequest(BaseModel):
    """Request schema for fetching cost data"""

    start_date: date
    end_date: date
    granularity: CostGranularityEnum = CostGranularityEnum.DAILY
    group_by: Optional[List[str]] = Field(
        default=None, description="Group by dimensions: service, region, usage_type"
    )
    filter_by: Optional[Dict[str, Any]] = Field(
        default=None, description="Filter criteria"
    )
    metrics: Optional[List[str]] = Field(
        default=["UnblendedCost"], description="Cost metrics to retrieve"
    )

    @validator("end_date")
    def validate_date_range(cls, v, values):
        """Ensure end_date is after start_date"""
        if "start_date" in values and v <= values["start_date"]:
            raise ValueError("end_date must be after start_date")
        return v


class CostDataResponse(BaseModel):
    """Response schema for cost data"""

    account_id: str
    total_cost: Decimal
    cost_data: List[AwsCostData]
    summary: Dict[str, Any]
    metadata: Dict[str, Any]


class CostSummaryResponse(BaseModel):
    """Response schema for cost summary"""

    account_id: str
    period: Dict[str, date]
    total_cost: Decimal
    cost_breakdown: Dict[str, Decimal]
    top_services: List[Dict[str, Any]]
    trends: Dict[str, Any]
