"""
AWS Cost Explorer models for storing and managing cost data.
Provides data models for AWS cost tracking, anomaly detection, and budgeting.
"""

from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Optional, Dict, Any, List
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Numeric,
    JSON,
    ForeignKey,
    Boolean,
    Date,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class CostGranularity(str, Enum):
    """Granularity options for cost data"""

    DAILY = "DAILY"
    MONTHLY = "MONTHLY"
    HOURLY = "HOURLY"


class CostDimension(str, Enum):
    """Dimension options for cost grouping"""

    SERVICE = "SERVICE"
    REGION = "REGION"
    USAGE_TYPE = "USAGE_TYPE"
    OPERATION = "OPERATION"
    LINKED_ACCOUNT = "LINKED_ACCOUNT"
    INSTANCE_TYPE = "INSTANCE_TYPE"


class AnomalyType(str, Enum):
    """Types of cost anomalies"""

    SPIKE = "SPIKE"
    TREND_INCREASE = "TREND_INCREASE"
    UNUSUAL_SERVICE = "UNUSUAL_SERVICE"
    BUDGET_EXCEED = "BUDGET_EXCEED"


class AwsAccount(Base):
    """AWS Account configuration for cost monitoring"""

    __tablename__ = "aws_accounts"

    id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy support
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False, index=True
    )

    account_id = Column(
        String(12), index=True, nullable=False
    )  # Removed unique constraint for multi-tenancy
    account_name = Column(String(255), nullable=False)
    access_key_id = Column(String(255), nullable=False)  # Encrypted
    secret_access_key = Column(String(255), nullable=False)  # Encrypted
    region = Column(String(50), default="us-east-1", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Foreign key to associate with projects/teams
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)

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
    organization = relationship("Organization", back_populates="aws_accounts")
    project = relationship("Project")
    cost_data = relationship(
        "AwsCostData", back_populates="aws_account", cascade="all, delete-orphan"
    )
    cost_anomalies = relationship(
        "AwsCostAnomaly", back_populates="aws_account", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<AwsAccount(id={self.id}, account_id='{self.account_id}', org_id={self.organization_id}, name='{self.account_name}')>"

    def belongs_to_organization(self, organization_id: int) -> bool:
        """Check if AWS account belongs to a specific organization."""
        return self.organization_id == organization_id


class AwsCostData(Base):
    """AWS cost data storage"""

    __tablename__ = "aws_cost_data"

    id = Column(Integer, primary_key=True, index=True)
    aws_account_id = Column(Integer, ForeignKey("aws_accounts.id"), nullable=False)

    # Time dimensions
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    granularity = Column(String(20), nullable=False, default=CostGranularity.DAILY)

    # Cost dimensions
    service_name = Column(String(255), nullable=True, index=True)
    region = Column(String(50), nullable=True, index=True)
    usage_type = Column(String(255), nullable=True)
    operation = Column(String(255), nullable=True)
    linked_account_id = Column(String(12), nullable=True)
    instance_type = Column(String(100), nullable=True)

    # Cost metrics
    unblended_cost = Column(Numeric(12, 4), nullable=False, default=0)
    blended_cost = Column(Numeric(12, 4), nullable=False, default=0)
    net_unblended_cost = Column(Numeric(12, 4), nullable=False, default=0)
    net_blended_cost = Column(Numeric(12, 4), nullable=False, default=0)
    amortized_cost = Column(Numeric(12, 4), nullable=False, default=0)

    # Usage metrics
    usage_quantity = Column(Numeric(15, 6), nullable=True)
    usage_unit = Column(String(50), nullable=True)

    # Additional metadata
    currency = Column(String(3), default="USD", nullable=False)
    raw_data = Column(JSON, nullable=True)  # Store original AWS response

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
    aws_account = relationship("AwsAccount", back_populates="cost_data")

    def __repr__(self) -> str:
        return f"<AwsCostData(account_id={self.aws_account_id}, service={self.service_name}, cost={self.unblended_cost}, date={self.start_date})>"


class AwsCostForecast(Base):
    """AWS cost forecast data"""

    __tablename__ = "aws_cost_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    aws_account_id = Column(Integer, ForeignKey("aws_accounts.id"), nullable=False)

    # Forecast period
    forecast_date = Column(Date, nullable=False, index=True)
    forecast_type = Column(String(50), nullable=False)  # daily, monthly, quarterly

    # Forecast dimensions
    service_name = Column(String(255), nullable=True, index=True)
    region = Column(String(50), nullable=True)

    # Forecast values
    predicted_cost = Column(Numeric(12, 4), nullable=False)
    confidence_interval_lower = Column(Numeric(12, 4), nullable=True)
    confidence_interval_upper = Column(Numeric(12, 4), nullable=True)
    confidence_level = Column(Numeric(3, 2), default=0.80, nullable=False)  # 80%

    # Model information
    model_type = Column(String(100), nullable=False)  # linear_regression, arima, etc.
    model_accuracy = Column(Numeric(5, 4), nullable=True)  # R² or similar metric
    training_period_days = Column(Integer, nullable=False)

    # Metadata
    currency = Column(String(3), default="USD", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    aws_account = relationship("AwsAccount")


class AwsCostAnomaly(Base):
    """AWS cost anomaly detection results"""

    __tablename__ = "aws_cost_anomalies"

    id = Column(Integer, primary_key=True, index=True)
    aws_account_id = Column(Integer, ForeignKey("aws_accounts.id"), nullable=False)

    # Anomaly details
    anomaly_type = Column(String(50), nullable=False)
    detected_date = Column(Date, nullable=False, index=True)
    severity = Column(String(20), nullable=False)  # low, medium, high, critical

    # Affected resources
    service_name = Column(String(255), nullable=True)
    region = Column(String(50), nullable=True)
    resource_identifier = Column(String(500), nullable=True)

    # Anomaly metrics
    expected_cost = Column(Numeric(12, 4), nullable=False)
    actual_cost = Column(Numeric(12, 4), nullable=False)
    cost_variance = Column(Numeric(12, 4), nullable=False)
    variance_percentage = Column(Numeric(5, 2), nullable=False)

    # Detection details
    detection_method = Column(String(100), nullable=False)
    confidence_score = Column(Numeric(3, 2), nullable=False)  # 0.00 to 1.00
    threshold_breached = Column(Numeric(12, 4), nullable=True)

    # Status and resolution
    is_resolved = Column(Boolean, default=False, nullable=False)
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(255), nullable=True)

    # Alerting
    alert_sent = Column(Boolean, default=False, nullable=False)
    alert_sent_at = Column(DateTime, nullable=True)

    # Metadata
    raw_data = Column(JSON, nullable=True)
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
    aws_account = relationship("AwsAccount", back_populates="cost_anomalies")

    def __repr__(self) -> str:
        return f"<AwsCostAnomaly(type={self.anomaly_type}, service={self.service_name}, variance={self.variance_percentage}%)>"


class AwsCostBudget(Base):
    """AWS cost budget configuration"""

    __tablename__ = "aws_cost_budgets"

    id = Column(Integer, primary_key=True, index=True)
    aws_account_id = Column(Integer, ForeignKey("aws_accounts.id"), nullable=False)

    # Budget configuration
    name = Column(String(255), nullable=False)
    budget_type = Column(
        String(50), nullable=False
    )  # COST, USAGE, RI_UTILIZATION, etc.
    time_unit = Column(String(20), nullable=False)  # MONTHLY, QUARTERLY, ANNUALLY

    # Budget limits
    budget_limit = Column(Numeric(12, 4), nullable=False)
    currency = Column(String(3), default="USD", nullable=False)

    # Budget period
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)

    # Filters
    service_filters = Column(JSON, nullable=True)  # List of services
    region_filters = Column(JSON, nullable=True)  # List of regions
    tag_filters = Column(JSON, nullable=True)  # Tag-based filters

    # Alert thresholds
    alert_thresholds = Column(JSON, nullable=False)  # [50, 80, 100] percentages

    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    aws_account = relationship("AwsAccount")


class AwsCostSummary(Base):
    """Daily/Monthly cost summaries for quick access"""

    __tablename__ = "aws_cost_summaries"

    id = Column(Integer, primary_key=True, index=True)
    aws_account_id = Column(Integer, ForeignKey("aws_accounts.id"), nullable=False)

    # Summary period
    summary_date = Column(Date, nullable=False, index=True)
    summary_type = Column(String(20), nullable=False)  # daily, monthly

    # Cost totals
    total_cost = Column(Numeric(12, 4), nullable=False, default=0)
    total_usage_cost = Column(Numeric(12, 4), nullable=False, default=0)
    total_ri_cost = Column(Numeric(12, 4), nullable=False, default=0)
    total_savings_plans_cost = Column(Numeric(12, 4), nullable=False, default=0)

    # Top services (JSON with service name and cost)
    top_services = Column(JSON, nullable=True)

    # Month-over-month comparison
    previous_period_cost = Column(Numeric(12, 4), nullable=True)
    cost_change_amount = Column(Numeric(12, 4), nullable=True)
    cost_change_percentage = Column(Numeric(5, 2), nullable=True)

    # Metadata
    currency = Column(String(3), default="USD", nullable=False)
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
    aws_account = relationship("AwsAccount")

    def __repr__(self) -> str:
        return f"<AwsCostSummary(account_id={self.aws_account_id}, date={self.summary_date}, total={self.total_cost})>"
