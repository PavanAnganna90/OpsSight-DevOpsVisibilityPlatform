"""
InfrastructureChange model for Terraform deployment tracking.
Stores infrastructure changes, terraform plans, and deployment status.
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
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from typing import Optional, Dict, Any, List
import json

from app.db.models import Base


class ChangeStatus(str, Enum):
    """Enumeration for infrastructure change status."""

    PLANNED = "planned"
    APPLYING = "applying"
    APPLIED = "applied"
    FAILED = "failed"
    CANCELLED = "cancelled"
    DESTROYED = "destroyed"
    DESTROYING = "destroying"


class ChangeType(str, Enum):
    """Enumeration for change types."""

    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    REPLACE = "replace"
    NO_CHANGE = "no_change"


class ResourceType(str, Enum):
    """Enumeration for common resource types."""

    COMPUTE = "compute"
    NETWORK = "network"
    STORAGE = "storage"
    DATABASE = "database"
    SECURITY = "security"
    IAM = "iam"
    MONITORING = "monitoring"
    OTHER = "other"


class InfrastructureChange(Base):
    """
    InfrastructureChange model for tracking Terraform infrastructure changes.

    Stores comprehensive information about infrastructure deployments including
    terraform plans, resource changes, and deployment status.
    """

    __tablename__ = "infrastructure_changes"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Change identification
    change_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, index=True, nullable=False)
    change_type = Column(SQLEnum(ChangeType), nullable=False)

    # Status and execution info
    status = Column(SQLEnum(ChangeStatus), nullable=False, default=ChangeStatus.PLANNED)
    terraform_version = Column(String, nullable=True)
    workspace = Column(String, index=True, nullable=True)

    # Resource information
    resource_type = Column(
        SQLEnum(ResourceType), nullable=True, default=ResourceType.OTHER
    )
    resource_name = Column(String, index=True, nullable=False)
    resource_address = Column(String, nullable=False)  # Full terraform address
    provider_name = Column(String, nullable=True)  # aws, azure, gcp, etc.

    # Change details
    plan_summary = Column(Text, nullable=True)  # Human-readable summary
    plan_json = Column(Text, nullable=True)  # Full terraform plan JSON
    diff_output = Column(Text, nullable=True)  # Terraform plan diff

    # Timing information
    planned_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Float, nullable=True)

    # Environment and project info
    environment = Column(String, index=True, nullable=True)  # dev, staging, prod
    region = Column(String, nullable=True)
    availability_zone = Column(String, nullable=True)

    # Repository and source information
    repository_url = Column(String, nullable=True)
    repository_branch = Column(String, nullable=True)
    commit_sha = Column(String, index=True, nullable=True)
    terraform_config_path = Column(String, nullable=True)

    # Resource configuration
    resource_config = Column(Text, nullable=True)  # JSON of resource configuration
    previous_config = Column(Text, nullable=True)  # JSON of previous configuration
    variables = Column(Text, nullable=True)  # JSON of terraform variables

    # Cost and impact information
    estimated_cost_change = Column(Float, nullable=True)  # Monthly cost delta
    risk_level = Column(String, nullable=True)  # low, medium, high, critical
    impact_scope = Column(String, nullable=True)  # local, service, region, global

    # Approval and governance
    requires_approval = Column(Boolean, default=False, nullable=False)
    approved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approval_comment = Column(Text, nullable=True)

    # Change statistics
    resources_to_add = Column(Integer, default=0, nullable=False)
    resources_to_change = Column(Integer, default=0, nullable=False)
    resources_to_destroy = Column(Integer, default=0, nullable=False)

    # Error and log information
    error_message = Column(Text, nullable=True)
    apply_log = Column(Text, nullable=True)
    state_file_url = Column(String, nullable=True)
    plan_file_url = Column(String, nullable=True)

    # Compliance and tagging
    compliance_tags = Column(Text, nullable=True)  # JSON array of compliance tags
    resource_tags = Column(Text, nullable=True)  # JSON object of resource tags

    # Relationships
    triggered_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)

    # Flags
    is_automated = Column(Boolean, default=False, nullable=False)
    is_rollback = Column(Boolean, default=False, nullable=False)
    is_dry_run = Column(Boolean, default=False, nullable=False)
    affects_production = Column(Boolean, default=False, nullable=False)

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
    triggered_by = relationship(
        "User",
        back_populates="triggered_infrastructure_changes",
        foreign_keys=[triggered_by_user_id],
    )
    approved_by = relationship(
        "User",
        back_populates="approved_infrastructure_changes",
        foreign_keys=[approved_by_user_id],
    )
    project = relationship(
        "Project", back_populates="infrastructure_changes", foreign_keys=[project_id]
    )
    alerts = relationship(
        "Alert", back_populates="infrastructure_change", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        """String representation of InfrastructureChange model."""
        return f"<InfrastructureChange(id={self.id}, resource='{self.resource_name}', type='{self.change_type}', status='{self.status}')>"

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert infrastructure change model to dictionary for API responses.

        Returns:
            dict: Infrastructure change data
        """
        return {
            "id": self.id,
            "change_id": self.change_id,
            "name": self.name,
            "change_type": self.change_type,
            "status": self.status,
            "terraform_version": self.terraform_version,
            "workspace": self.workspace,
            "resource_type": self.resource_type,
            "resource_name": self.resource_name,
            "resource_address": self.resource_address,
            "provider_name": self.provider_name,
            "plan_summary": self.plan_summary,
            "plan_json": self.get_plan_json(),
            "diff_output": self.diff_output,
            "planned_at": self.planned_at.isoformat() if self.planned_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": (
                self.completed_at.isoformat() if self.completed_at else None
            ),
            "duration_seconds": self.duration_seconds,
            "environment": self.environment,
            "region": self.region,
            "availability_zone": self.availability_zone,
            "repository_url": self.repository_url,
            "repository_branch": self.repository_branch,
            "commit_sha": self.commit_sha,
            "terraform_config_path": self.terraform_config_path,
            "resource_config": self.get_resource_config(),
            "previous_config": self.get_previous_config(),
            "variables": self.get_variables(),
            "estimated_cost_change": self.estimated_cost_change,
            "risk_level": self.risk_level,
            "impact_scope": self.impact_scope,
            "requires_approval": self.requires_approval,
            "approved_by_user_id": self.approved_by_user_id,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "approval_comment": self.approval_comment,
            "resources_to_add": self.resources_to_add,
            "resources_to_change": self.resources_to_change,
            "resources_to_destroy": self.resources_to_destroy,
            "error_message": self.error_message,
            "apply_log": self.apply_log,
            "state_file_url": self.state_file_url,
            "plan_file_url": self.plan_file_url,
            "compliance_tags": self.get_compliance_tags(),
            "resource_tags": self.get_resource_tags(),
            "triggered_by_user_id": self.triggered_by_user_id,
            "project_id": self.project_id,
            "is_automated": self.is_automated,
            "is_rollback": self.is_rollback,
            "is_dry_run": self.is_dry_run,
            "affects_production": self.affects_production,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def get_plan_json(self) -> Optional[Dict[str, Any]]:
        """Parse plan_json string to dictionary."""
        if self.plan_json:
            try:
                return json.loads(self.plan_json)
            except json.JSONDecodeError:
                return None
        return None

    def set_plan_json(self, plan_data: Dict[str, Any]) -> None:
        """Set plan data as JSON string."""
        self.plan_json = json.dumps(plan_data) if plan_data else None

    def get_resource_config(self) -> Optional[Dict[str, Any]]:
        """Parse resource_config string to dictionary."""
        if self.resource_config:
            try:
                return json.loads(self.resource_config)
            except json.JSONDecodeError:
                return None
        return None

    def set_resource_config(self, config: Dict[str, Any]) -> None:
        """Set resource configuration as JSON string."""
        self.resource_config = json.dumps(config) if config else None

    def get_previous_config(self) -> Optional[Dict[str, Any]]:
        """Parse previous_config string to dictionary."""
        if self.previous_config:
            try:
                return json.loads(self.previous_config)
            except json.JSONDecodeError:
                return None
        return None

    def set_previous_config(self, config: Dict[str, Any]) -> None:
        """Set previous configuration as JSON string."""
        self.previous_config = json.dumps(config) if config else None

    def get_variables(self) -> Optional[Dict[str, Any]]:
        """Parse variables string to dictionary."""
        if self.variables:
            try:
                return json.loads(self.variables)
            except json.JSONDecodeError:
                return None
        return None

    def set_variables(self, vars_dict: Dict[str, Any]) -> None:
        """Set terraform variables as JSON string."""
        self.variables = json.dumps(vars_dict) if vars_dict else None

    def get_compliance_tags(self) -> Optional[List[str]]:
        """Parse compliance_tags string to list."""
        if self.compliance_tags:
            try:
                return json.loads(self.compliance_tags)
            except json.JSONDecodeError:
                return None
        return None

    def set_compliance_tags(self, tags: List[str]) -> None:
        """Set compliance tags as JSON string."""
        self.compliance_tags = json.dumps(tags) if tags else None

    def get_resource_tags(self) -> Optional[Dict[str, str]]:
        """Parse resource_tags string to dictionary."""
        if self.resource_tags:
            try:
                return json.loads(self.resource_tags)
            except json.JSONDecodeError:
                return None
        return None

    def set_resource_tags(self, tags: Dict[str, str]) -> None:
        """Set resource tags as JSON string."""
        self.resource_tags = json.dumps(tags) if tags else None

    def calculate_duration(self) -> None:
        """Calculate change duration if start and end times are available."""
        if self.started_at and self.completed_at:
            delta = self.completed_at - self.started_at
            self.duration_seconds = delta.total_seconds()

    def is_finished(self) -> bool:
        """Check if infrastructure change is finished."""
        return self.status in [
            ChangeStatus.APPLIED,
            ChangeStatus.FAILED,
            ChangeStatus.CANCELLED,
            ChangeStatus.DESTROYED,
        ]

    def is_successful(self) -> bool:
        """Check if infrastructure change was successful."""
        return self.status in [ChangeStatus.APPLIED, ChangeStatus.DESTROYED]

    def is_destructive(self) -> bool:
        """Check if change involves resource destruction."""
        return (
            self.change_type in [ChangeType.DELETE, ChangeType.REPLACE]
            or self.resources_to_destroy > 0
        )

    def needs_approval(self) -> bool:
        """Check if change requires approval and hasn't been approved yet."""
        return self.requires_approval and not self.approved_at

    def get_change_summary(self) -> Dict[str, Any]:
        """Get summary of infrastructure changes."""
        total_changes = (
            self.resources_to_add + self.resources_to_change + self.resources_to_destroy
        )

        return {
            "total_changes": total_changes,
            "resources_to_add": self.resources_to_add,
            "resources_to_change": self.resources_to_change,
            "resources_to_destroy": self.resources_to_destroy,
            "is_destructive": self.is_destructive(),
            "risk_level": self.risk_level,
            "impact_scope": self.impact_scope,
            "estimated_cost_change": self.estimated_cost_change,
            "affects_production": self.affects_production,
            "needs_approval": self.needs_approval(),
        }

    @classmethod
    def from_terraform_plan(
        cls, plan_data: Dict[str, Any], metadata: Dict[str, Any]
    ) -> "InfrastructureChange":
        """
        Create InfrastructureChange instance from Terraform plan data.

        Args:
            plan_data (dict): Terraform plan output
            metadata (dict): Additional metadata about the change

        Returns:
            InfrastructureChange: New InfrastructureChange instance
        """
        # Extract resource changes from plan
        resource_changes = plan_data.get("resource_changes", [])

        # Count different types of changes
        resources_to_add = sum(
            1
            for rc in resource_changes
            if "create" in rc.get("change", {}).get("actions", [])
        )
        resources_to_change = sum(
            1
            for rc in resource_changes
            if "update" in rc.get("change", {}).get("actions", [])
        )
        resources_to_destroy = sum(
            1
            for rc in resource_changes
            if "delete" in rc.get("change", {}).get("actions", [])
        )

        # Determine primary change type
        if (
            resources_to_add > 0
            and resources_to_change == 0
            and resources_to_destroy == 0
        ):
            change_type = ChangeType.CREATE
        elif (
            resources_to_destroy > 0
            and resources_to_add == 0
            and resources_to_change == 0
        ):
            change_type = ChangeType.DELETE
        elif resources_to_change > 0:
            change_type = ChangeType.UPDATE
        elif "replace" in str(plan_data):
            change_type = ChangeType.REPLACE
        else:
            change_type = ChangeType.NO_CHANGE

        # Determine if approval is required (production or destructive changes)
        requires_approval = (
            metadata.get("environment") == "prod"
            or resources_to_destroy > 0
            or metadata.get("estimated_cost_change", 0) > 100  # Changes over $100/month
        )

        return cls(
            change_id=metadata.get(
                "change_id", plan_data.get("terraform_version", "unknown")
            ),
            name=metadata.get("name", "Terraform Change"),
            change_type=change_type,
            status=ChangeStatus.PLANNED,
            terraform_version=plan_data.get("terraform_version"),
            workspace=metadata.get("workspace"),
            resource_name=metadata.get("resource_name", "multiple"),
            resource_address=metadata.get("resource_address", "unknown"),
            provider_name=metadata.get("provider_name"),
            plan_summary=metadata.get("plan_summary"),
            planned_at=metadata.get("planned_at"),
            environment=metadata.get("environment"),
            region=metadata.get("region"),
            repository_url=metadata.get("repository_url"),
            repository_branch=metadata.get("repository_branch"),
            commit_sha=metadata.get("commit_sha"),
            terraform_config_path=metadata.get("terraform_config_path"),
            estimated_cost_change=metadata.get("estimated_cost_change"),
            risk_level=metadata.get("risk_level", "medium"),
            impact_scope=metadata.get("impact_scope", "local"),
            requires_approval=requires_approval,
            resources_to_add=resources_to_add,
            resources_to_change=resources_to_change,
            resources_to_destroy=resources_to_destroy,
            affects_production=metadata.get("environment") == "prod",
        )
