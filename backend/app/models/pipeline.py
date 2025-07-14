"""
Pipeline model for CI/CD pipeline tracking.
Stores pipeline execution data, status, and metrics.
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
from typing import Optional, Dict, Any
import json

from app.db.models import Base


class PipelineStatus(str, Enum):
    """Enumeration for pipeline execution status."""

    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"
    SKIPPED = "skipped"


class PipelineType(str, Enum):
    """Enumeration for pipeline types."""

    BUILD = "build"
    TEST = "test"
    DEPLOY = "deploy"
    RELEASE = "release"
    ROLLBACK = "rollback"
    SCHEDULED = "scheduled"


class Pipeline(Base):
    """
    Pipeline model for tracking CI/CD pipeline executions.

    Stores comprehensive information about pipeline runs including
    status, timing, artifacts, and relationships to projects and users.
    """

    __tablename__ = "pipelines"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Pipeline identification
    pipeline_id = Column(
        String, unique=True, index=True, nullable=False
    )  # External pipeline ID (GitHub Actions, etc.)
    name = Column(String, index=True, nullable=False)
    pipeline_type = Column(
        SQLEnum(PipelineType), nullable=False, default=PipelineType.BUILD
    )

    # Status and execution info
    status = Column(
        SQLEnum(PipelineStatus), nullable=False, default=PipelineStatus.PENDING
    )
    branch = Column(String, index=True, nullable=False)
    commit_sha = Column(String, index=True, nullable=False)
    commit_message = Column(Text, nullable=True)

    # Timing information
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Float, nullable=True)  # Calculated field

    # Build information
    build_number = Column(Integer, nullable=True)
    workflow_name = Column(String, nullable=True)
    job_name = Column(String, nullable=True)

    # Repository information
    repository_url = Column(String, nullable=False)
    repository_name = Column(String, index=True, nullable=False)
    repository_owner = Column(String, index=True, nullable=False)

    # Error and log information
    error_message = Column(Text, nullable=True)
    log_url = Column(String, nullable=True)
    artifacts_url = Column(String, nullable=True)

    # Metadata and configuration
    environment = Column(String, nullable=True)  # dev, staging, prod
    config_data = Column(Text, nullable=True)  # JSON string for additional config
    labels = Column(Text, nullable=True)  # JSON array of labels/tags

    # Relationships
    triggered_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)

    # Performance metrics
    queue_time_seconds = Column(Float, nullable=True)
    setup_time_seconds = Column(Float, nullable=True)
    execution_time_seconds = Column(Float, nullable=True)
    teardown_time_seconds = Column(Float, nullable=True)

    # Resource usage
    cpu_usage_percent = Column(Float, nullable=True)
    memory_usage_mb = Column(Float, nullable=True)
    storage_usage_mb = Column(Float, nullable=True)

    # Flags
    is_production_deploy = Column(Boolean, default=False, nullable=False)
    is_rollback = Column(Boolean, default=False, nullable=False)
    is_scheduled = Column(Boolean, default=False, nullable=False)

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
        back_populates="triggered_pipelines",
        foreign_keys=[triggered_by_user_id],
    )
    project = relationship(
        "Project", back_populates="pipelines", foreign_keys=[project_id]
    )
    runs = relationship(
        "PipelineRun", back_populates="pipeline", cascade="all, delete-orphan"
    )
    alerts = relationship(
        "Alert", back_populates="pipeline", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        """String representation of Pipeline model."""
        return f"<Pipeline(id={self.id}, name='{self.name}', status='{self.status}', branch='{self.branch}')>"

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert pipeline model to dictionary for API responses.

        Returns:
            dict: Pipeline data with calculated fields
        """
        return {
            "id": self.id,
            "pipeline_id": self.pipeline_id,
            "name": self.name,
            "pipeline_type": self.pipeline_type,
            "status": self.status,
            "branch": self.branch,
            "commit_sha": self.commit_sha,
            "commit_message": self.commit_message,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": (
                self.completed_at.isoformat() if self.completed_at else None
            ),
            "duration_seconds": self.duration_seconds,
            "build_number": self.build_number,
            "workflow_name": self.workflow_name,
            "job_name": self.job_name,
            "repository_url": self.repository_url,
            "repository_name": self.repository_name,
            "repository_owner": self.repository_owner,
            "error_message": self.error_message,
            "log_url": self.log_url,
            "artifacts_url": self.artifacts_url,
            "environment": self.environment,
            "config_data": self.get_config_data(),
            "labels": self.get_labels(),
            "triggered_by_user_id": self.triggered_by_user_id,
            "project_id": self.project_id,
            "queue_time_seconds": self.queue_time_seconds,
            "setup_time_seconds": self.setup_time_seconds,
            "execution_time_seconds": self.execution_time_seconds,
            "teardown_time_seconds": self.teardown_time_seconds,
            "cpu_usage_percent": self.cpu_usage_percent,
            "memory_usage_mb": self.memory_usage_mb,
            "storage_usage_mb": self.storage_usage_mb,
            "is_production_deploy": self.is_production_deploy,
            "is_rollback": self.is_rollback,
            "is_scheduled": self.is_scheduled,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def get_config_data(self) -> Optional[Dict[str, Any]]:
        """
        Parse config_data JSON string to dictionary.

        Returns:
            dict or None: Parsed configuration data
        """
        if self.config_data:
            try:
                return json.loads(self.config_data)
            except json.JSONDecodeError:
                return None
        return None

    def set_config_data(self, config: Dict[str, Any]) -> None:
        """
        Set configuration data as JSON string.

        Args:
            config (dict): Configuration data to store
        """
        self.config_data = json.dumps(config) if config else None

    def get_labels(self) -> Optional[list]:
        """
        Parse labels JSON string to list.

        Returns:
            list or None: Pipeline labels/tags
        """
        if self.labels:
            try:
                return json.loads(self.labels)
            except json.JSONDecodeError:
                return None
        return None

    def set_labels(self, labels: list) -> None:
        """
        Set labels as JSON string.

        Args:
            labels (list): Labels/tags to store
        """
        self.labels = json.dumps(labels) if labels else None

    def calculate_duration(self) -> None:
        """
        Calculate pipeline duration if start and end times are available.
        Updates the duration_seconds field.
        """
        if self.started_at and self.completed_at:
            delta = self.completed_at - self.started_at
            self.duration_seconds = delta.total_seconds()

    def is_finished(self) -> bool:
        """
        Check if pipeline execution is finished.

        Returns:
            bool: True if pipeline is in a terminal state
        """
        return self.status in [
            PipelineStatus.SUCCESS,
            PipelineStatus.FAILED,
            PipelineStatus.CANCELLED,
            PipelineStatus.SKIPPED,
        ]

    def is_successful(self) -> bool:
        """
        Check if pipeline executed successfully.

        Returns:
            bool: True if pipeline completed successfully
        """
        return self.status == PipelineStatus.SUCCESS

    @classmethod
    def from_github_actions_data(
        cls, workflow_data: Dict[str, Any], repository_info: Dict[str, Any]
    ) -> "Pipeline":
        """
        Create Pipeline instance from GitHub Actions workflow data.

        Args:
            workflow_data (dict): Workflow run data from GitHub API
            repository_info (dict): Repository information

        Returns:
            Pipeline: New Pipeline instance with GitHub Actions data
        """
        # Map GitHub Actions status to our enum
        status_mapping = {
            "queued": PipelineStatus.PENDING,
            "in_progress": PipelineStatus.RUNNING,
            "completed": PipelineStatus.SUCCESS,
            "failure": PipelineStatus.FAILED,
            "cancelled": PipelineStatus.CANCELLED,
            "skipped": PipelineStatus.SKIPPED,
        }

        github_status = workflow_data.get("status", "queued")
        conclusion = workflow_data.get("conclusion")

        # Use conclusion for completed workflows
        if github_status == "completed" and conclusion:
            if conclusion == "success":
                status = PipelineStatus.SUCCESS
            elif conclusion == "failure":
                status = PipelineStatus.FAILED
            elif conclusion == "cancelled":
                status = PipelineStatus.CANCELLED
            elif conclusion == "skipped":
                status = PipelineStatus.SKIPPED
            else:
                status = PipelineStatus.FAILED
        else:
            status = status_mapping.get(github_status, PipelineStatus.PENDING)

        return cls(
            pipeline_id=str(workflow_data.get("id")),
            name=workflow_data.get("name", "Unknown Workflow"),
            pipeline_type=PipelineType.BUILD,  # Default, can be updated based on workflow name
            status=status,
            branch=workflow_data.get("head_branch", "main"),
            commit_sha=workflow_data.get("head_sha"),
            commit_message=workflow_data.get("head_commit", {}).get("message"),
            started_at=workflow_data.get("run_started_at"),
            completed_at=(
                workflow_data.get("updated_at") if status.is_finished() else None
            ),
            build_number=workflow_data.get("run_number"),
            workflow_name=workflow_data.get("name"),
            repository_url=repository_info.get("html_url"),
            repository_name=repository_info.get("name"),
            repository_owner=repository_info.get("owner", {}).get("login"),
            log_url=workflow_data.get("logs_url"),
            artifacts_url=workflow_data.get("artifacts_url"),
            environment=workflow_data.get("environment"),
        )


class PipelineRun(Base):
    """
    Individual pipeline run model for tracking specific executions.

    Represents a single execution/run of a pipeline with detailed
    timing, status, and execution information.
    """

    __tablename__ = "pipeline_runs"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Pipeline relationship
    pipeline_id = Column(
        Integer, ForeignKey("pipelines.id"), nullable=False, index=True
    )

    # Run identification
    external_id = Column(
        String, index=True, nullable=True
    )  # External run ID (GitHub Actions run ID, etc.)
    run_number = Column(Integer, nullable=True)

    # Status and execution info
    status = Column(
        SQLEnum(PipelineStatus), nullable=False, default=PipelineStatus.PENDING
    )
    branch = Column(String, index=True, nullable=False)
    commit_sha = Column(String, index=True, nullable=False)
    commit_message = Column(Text, nullable=True)

    # Timing information
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Float, nullable=True)

    # Execution details
    workflow_name = Column(String, nullable=True)
    job_name = Column(String, nullable=True)
    environment = Column(String, nullable=True)

    # Results and artifacts
    error_message = Column(Text, nullable=True)
    log_url = Column(String, nullable=True)
    artifacts_url = Column(String, nullable=True)
    test_results_url = Column(String, nullable=True)

    # Performance metrics
    queue_time_seconds = Column(Float, nullable=True)
    setup_time_seconds = Column(Float, nullable=True)
    execution_time_seconds = Column(Float, nullable=True)
    teardown_time_seconds = Column(Float, nullable=True)

    # Resource usage
    cpu_usage_percent = Column(Float, nullable=True)
    memory_usage_mb = Column(Float, nullable=True)
    storage_usage_mb = Column(Float, nullable=True)

    # Configuration and metadata
    config_data = Column(Text, nullable=True)  # JSON string
    labels = Column(Text, nullable=True)  # JSON array of labels/tags

    # User who triggered this run
    triggered_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

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
    pipeline = relationship("Pipeline", back_populates="runs")
    triggered_by = relationship("User", foreign_keys=[triggered_by_user_id])

    def __repr__(self) -> str:
        """String representation of PipelineRun model."""
        return f"<PipelineRun(id={self.id}, pipeline_id={self.pipeline_id}, status='{self.status}', branch='{self.branch}')>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert pipeline run model to dictionary for API responses."""
        return {
            "id": self.id,
            "pipeline_id": self.pipeline_id,
            "external_id": self.external_id,
            "run_number": self.run_number,
            "status": self.status,
            "branch": self.branch,
            "commit_sha": self.commit_sha,
            "commit_message": self.commit_message,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": (
                self.completed_at.isoformat() if self.completed_at else None
            ),
            "duration_seconds": self.duration_seconds,
            "workflow_name": self.workflow_name,
            "job_name": self.job_name,
            "environment": self.environment,
            "error_message": self.error_message,
            "log_url": self.log_url,
            "artifacts_url": self.artifacts_url,
            "test_results_url": self.test_results_url,
            "queue_time_seconds": self.queue_time_seconds,
            "setup_time_seconds": self.setup_time_seconds,
            "execution_time_seconds": self.execution_time_seconds,
            "teardown_time_seconds": self.teardown_time_seconds,
            "cpu_usage_percent": self.cpu_usage_percent,
            "memory_usage_mb": self.memory_usage_mb,
            "storage_usage_mb": self.storage_usage_mb,
            "config_data": self.get_config_data(),
            "labels": self.get_labels(),
            "triggered_by_user_id": self.triggered_by_user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def get_config_data(self) -> Optional[Dict[str, Any]]:
        """Parse config_data JSON string to dictionary."""
        if self.config_data:
            try:
                return json.loads(self.config_data)
            except json.JSONDecodeError:
                return None
        return None

    def set_config_data(self, config: Dict[str, Any]) -> None:
        """Set configuration data as JSON string."""
        self.config_data = json.dumps(config) if config else None

    def get_labels(self) -> Optional[list]:
        """Parse labels JSON string to list."""
        if self.labels:
            try:
                return json.loads(self.labels)
            except json.JSONDecodeError:
                return None
        return None

    def set_labels(self, labels: list) -> None:
        """Set labels as JSON string."""
        self.labels = json.dumps(labels) if labels else None

    def calculate_duration(self) -> None:
        """Calculate and set duration_seconds based on started_at and completed_at."""
        if self.started_at and self.completed_at:
            delta = self.completed_at - self.started_at
            self.duration_seconds = delta.total_seconds()

    def is_finished(self) -> bool:
        """Check if the pipeline run has finished execution."""
        return self.status in [
            PipelineStatus.SUCCESS,
            PipelineStatus.FAILED,
            PipelineStatus.CANCELLED,
            PipelineStatus.SKIPPED,
        ]

    def is_successful(self) -> bool:
        """Check if the pipeline run completed successfully."""
        return self.status == PipelineStatus.SUCCESS
