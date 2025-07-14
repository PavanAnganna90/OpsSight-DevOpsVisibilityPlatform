from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from decimal import Decimal

from ..models.infrastructure_change import ChangeStatus, ChangeType, ResourceType


class InfrastructureChangeBase(BaseModel):
    """Base infrastructure change schema with common fields"""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    change_type: ChangeType
    terraform_version: Optional[str] = None
    workspace: str = Field(default="default", min_length=1)
    target_environment: str = Field(..., min_length=1)
    config_path: Optional[str] = None
    variables: Optional[Dict[str, Any]] = None
    auto_approve: bool = False
    destroy_mode: bool = False


class InfrastructureChangeCreate(InfrastructureChangeBase):
    """Schema for creating a new infrastructure change"""

    project_id: int = Field(..., gt=0)
    initiated_by_user_id: int = Field(..., gt=0)


class InfrastructureChangeUpdate(BaseModel):
    """Schema for updating an infrastructure change"""

    status: Optional[ChangeStatus] = None
    plan_started_at: Optional[datetime] = None
    plan_finished_at: Optional[datetime] = None
    apply_started_at: Optional[datetime] = None
    apply_finished_at: Optional[datetime] = None
    approved_by_user_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    resources_to_add: Optional[int] = Field(None, ge=0)
    resources_to_change: Optional[int] = Field(None, ge=0)
    resources_to_destroy: Optional[int] = Field(None, ge=0)
    estimated_cost_change: Optional[Decimal] = None
    plan_output: Optional[str] = None
    apply_output: Optional[str] = None
    state_backup_path: Optional[str] = None
    error_message: Optional[str] = None


class ResourceChange(BaseModel):
    """Schema for individual resource changes"""

    address: str
    resource_type: ResourceType
    resource_name: str
    action: str  # create, update, delete, replace, no-op
    before: Optional[Dict[str, Any]] = None
    after: Optional[Dict[str, Any]] = None
    change_summary: Optional[str] = None
    requires_replacement: bool = False
    sensitive_attributes: List[str] = []


class TerraformPlan(BaseModel):
    """Schema for Terraform plan data"""

    format_version: str
    terraform_version: str
    planned_values: Dict[str, Any]
    resource_changes: List[ResourceChange]
    configuration: Dict[str, Any]
    prior_state: Optional[Dict[str, Any]] = None
    variables: Dict[str, Any] = {}
    timestamp: datetime


class CostEstimate(BaseModel):
    """Schema for cost estimation"""

    currency: str = "USD"
    monthly_cost_before: Optional[Decimal] = None
    monthly_cost_after: Optional[Decimal] = None
    monthly_cost_change: Optional[Decimal] = None
    breakdown_by_resource: Dict[str, Decimal] = {}
    breakdown_by_service: Dict[str, Decimal] = {}
    confidence_level: str = "medium"  # low, medium, high
    estimation_timestamp: datetime


class ApprovalRequest(BaseModel):
    """Schema for approval request data"""

    requested_by_user_id: int
    requested_at: datetime
    reason: Optional[str] = None
    urgency: str = "normal"  # low, normal, high, critical
    impact_assessment: Optional[str] = None
    rollback_plan: Optional[str] = None
    estimated_downtime: Optional[int] = None  # minutes
    affected_services: List[str] = []


class InfrastructureChange(InfrastructureChangeBase):
    """Complete infrastructure change schema for responses"""

    id: int
    project_id: int
    initiated_by_user_id: int
    external_id: Optional[str] = None
    status: ChangeStatus

    # Plan phase
    plan_started_at: Optional[datetime] = None
    plan_finished_at: Optional[datetime] = None
    plan_duration_seconds: Optional[int] = None

    # Apply phase
    apply_started_at: Optional[datetime] = None
    apply_finished_at: Optional[datetime] = None
    apply_duration_seconds: Optional[int] = None

    # Approval
    approved_by_user_id: Optional[int] = None
    approved_at: Optional[datetime] = None

    # Resource changes
    resources_to_add: int = 0
    resources_to_change: int = 0
    resources_to_destroy: int = 0

    # Cost estimation
    estimated_cost_change: Optional[Decimal] = None

    # Outputs and logs
    plan_output: Optional[str] = None
    apply_output: Optional[str] = None
    state_backup_path: Optional[str] = None
    error_message: Optional[str] = None

    # Timestamps
    created_at: datetime
    updated_at: datetime

    # Related data
    resource_changes: Optional[List[ResourceChange]] = None
    cost_estimate: Optional[CostEstimate] = None
    approval_request: Optional[ApprovalRequest] = None

    class Config:
        from_attributes = True


class InfrastructureChangeWithPlan(InfrastructureChange):
    """Infrastructure change with Terraform plan data"""

    terraform_plan: TerraformPlan


class ChangeStats(BaseModel):
    """Infrastructure change statistics schema"""

    total_changes: int = Field(..., ge=0)
    successful_changes: int = Field(..., ge=0)
    failed_changes: int = Field(..., ge=0)
    pending_approval: int = Field(..., ge=0)
    success_rate: float = Field(..., ge=0, le=100)
    average_plan_duration: Optional[float] = None
    average_apply_duration: Optional[float] = None
    total_cost_impact: Optional[Decimal] = None
    most_changed_resources: List[Dict[str, Any]] = []


class InfrastructureStats(BaseModel):
    """Overall infrastructure statistics"""

    total_resources: int = Field(..., ge=0)
    resources_by_type: Dict[str, int] = {}
    resources_by_environment: Dict[str, int] = {}
    monthly_cost_by_environment: Dict[str, Decimal] = {}
    drift_detection_summary: Dict[str, Any] = {}
    compliance_status: Dict[str, Any] = {}


class TerraformState(BaseModel):
    """Schema for Terraform state data"""

    version: int
    terraform_version: str
    serial: int
    lineage: str
    outputs: Dict[str, Any] = {}
    resources: List[Dict[str, Any]] = []
    check_results: Optional[List[Dict[str, Any]]] = None


class DriftDetection(BaseModel):
    """Schema for infrastructure drift detection"""

    detected_at: datetime
    has_drift: bool
    drifted_resources: List[Dict[str, Any]] = []
    drift_summary: str
    recommended_actions: List[str] = []
    severity: str = "low"  # low, medium, high, critical


class ComplianceCheck(BaseModel):
    """Schema for compliance checking results"""

    policy_name: str
    policy_version: str
    status: str  # passed, failed, warning
    violations: List[Dict[str, Any]] = []
    recommendations: List[str] = []
    checked_at: datetime
    severity: str = "low"  # low, medium, high, critical
