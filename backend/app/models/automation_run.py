"""
AutomationRun model for Ansible playbook execution tracking.
Stores automation run data, status, and execution logs.
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

from app.db.database import Base


class AutomationStatus(str, Enum):
    """Enumeration for automation run status."""

    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"
    SKIPPED = "skipped"
    PARTIAL_SUCCESS = "partial_success"


class AutomationType(str, Enum):
    """Enumeration for automation types."""

    PLAYBOOK = "playbook"
    ROLE = "role"
    TASK = "task"
    AD_HOC = "ad_hoc"
    TOWER_JOB = "tower_job"


class AutomationRun(Base):
    """
    AutomationRun model for tracking Ansible automation executions.

    Stores comprehensive information about automation runs including
    playbooks, hosts, tasks, and execution results.
    """

    __tablename__ = "automation_runs"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Automation identification
    automation_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, index=True, nullable=False)
    automation_type = Column(
        SQLEnum(AutomationType), nullable=False, default=AutomationType.PLAYBOOK
    )

    # Status and execution info
    status = Column(
        SQLEnum(AutomationStatus), nullable=False, default=AutomationStatus.PENDING
    )
    playbook_name = Column(String, index=True, nullable=True)
    inventory_name = Column(String, nullable=True)

    # Timing information
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Float, nullable=True)

    # Execution details
    ansible_version = Column(String, nullable=True)
    python_version = Column(String, nullable=True)
    command_line = Column(Text, nullable=True)
    working_directory = Column(String, nullable=True)

    # Host and task statistics
    total_hosts = Column(Integer, nullable=True)
    successful_hosts = Column(Integer, nullable=True)
    failed_hosts = Column(Integer, nullable=True)
    unreachable_hosts = Column(Integer, nullable=True)
    skipped_hosts = Column(Integer, nullable=True)

    total_tasks = Column(Integer, nullable=True)
    successful_tasks = Column(Integer, nullable=True)
    failed_tasks = Column(Integer, nullable=True)
    skipped_tasks = Column(Integer, nullable=True)
    changed_tasks = Column(Integer, nullable=True)

    # Detailed execution data
    host_results = Column(Text, nullable=True)
    task_results = Column(Text, nullable=True)
    play_results = Column(Text, nullable=True)

    # Error and log information
    error_message = Column(Text, nullable=True)
    log_output = Column(Text, nullable=True)
    log_url = Column(String, nullable=True)

    # Configuration and variables
    extra_vars = Column(Text, nullable=True)
    vault_password_file = Column(String, nullable=True)
    tags = Column(Text, nullable=True)
    skip_tags = Column(Text, nullable=True)

    # Repository and source information
    repository_url = Column(String, nullable=True)
    repository_branch = Column(String, nullable=True)
    commit_sha = Column(String, nullable=True)
    playbook_path = Column(String, nullable=True)

    # Environment and target information
    environment = Column(String, nullable=True)
    target_group = Column(String, nullable=True)
    dry_run = Column(Boolean, default=False, nullable=False)
    check_mode = Column(Boolean, default=False, nullable=False)

    # Performance metrics
    setup_time_seconds = Column(Float, nullable=True)
    execution_time_seconds = Column(Float, nullable=True)
    teardown_time_seconds = Column(Float, nullable=True)

    # Coverage metrics
    coverage_percentage = Column(Float, nullable=True)
    automation_score = Column(Float, nullable=True)

    # Relationships
    triggered_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)

    # Flags
    is_scheduled = Column(Boolean, default=False, nullable=False)
    is_manual_trigger = Column(Boolean, default=True, nullable=False)
    has_failures = Column(Boolean, default=False, nullable=False)

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
        back_populates="triggered_automation_runs",
        foreign_keys=[triggered_by_user_id],
    )
    project = relationship(
        "Project", back_populates="automation_runs", foreign_keys=[project_id]
    )
    alerts = relationship(
        "Alert", back_populates="automation_run", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        """String representation of AutomationRun model."""
        return f"<AutomationRun(id={self.id}, name='{self.name}', status='{self.status}', hosts={self.total_hosts})>"

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert automation run model to dictionary for API responses.

        Returns:
            dict: Automation run data with calculated fields
        """
        return {
            "id": self.id,
            "automation_id": self.automation_id,
            "name": self.name,
            "automation_type": self.automation_type,
            "status": self.status,
            "playbook_name": self.playbook_name,
            "inventory_name": self.inventory_name,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": (
                self.completed_at.isoformat() if self.completed_at else None
            ),
            "duration_seconds": self.duration_seconds,
            "ansible_version": self.ansible_version,
            "python_version": self.python_version,
            "command_line": self.command_line,
            "working_directory": self.working_directory,
            "total_hosts": self.total_hosts,
            "successful_hosts": self.successful_hosts,
            "failed_hosts": self.failed_hosts,
            "unreachable_hosts": self.unreachable_hosts,
            "skipped_hosts": self.skipped_hosts,
            "total_tasks": self.total_tasks,
            "successful_tasks": self.successful_tasks,
            "failed_tasks": self.failed_tasks,
            "skipped_tasks": self.skipped_tasks,
            "changed_tasks": self.changed_tasks,
            "host_results": self.get_host_results(),
            "task_results": self.get_task_results(),
            "play_results": self.get_play_results(),
            "error_message": self.error_message,
            "log_output": self.log_output,
            "log_url": self.log_url,
            "extra_vars": self.get_extra_vars(),
            "vault_password_file": self.vault_password_file,
            "tags": self.get_tags(),
            "skip_tags": self.get_skip_tags(),
            "repository_url": self.repository_url,
            "repository_branch": self.repository_branch,
            "commit_sha": self.commit_sha,
            "playbook_path": self.playbook_path,
            "environment": self.environment,
            "target_group": self.target_group,
            "dry_run": self.dry_run,
            "check_mode": self.check_mode,
            "setup_time_seconds": self.setup_time_seconds,
            "execution_time_seconds": self.execution_time_seconds,
            "teardown_time_seconds": self.teardown_time_seconds,
            "coverage_percentage": self.coverage_percentage,
            "automation_score": self.automation_score,
            "triggered_by_user_id": self.triggered_by_user_id,
            "project_id": self.project_id,
            "is_scheduled": self.is_scheduled,
            "is_manual_trigger": self.is_manual_trigger,
            "has_failures": self.has_failures,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def get_host_results(self) -> Optional[List[Dict[str, Any]]]:
        """
        Parse host_results JSON string to list of dictionaries.

        Returns:
            list or None: Host execution results
        """
        if self.host_results:
            try:
                return json.loads(self.host_results)
            except json.JSONDecodeError:
                return None
        return None

    def set_host_results(self, results: List[Dict[str, Any]]) -> None:
        """
        Set host results as JSON string.

        Args:
            results (list): Host execution results
        """
        self.host_results = json.dumps(results) if results else None

    def get_task_results(self) -> Optional[List[Dict[str, Any]]]:
        """
        Parse task_results JSON string to list of dictionaries.

        Returns:
            list or None: Task execution results
        """
        if self.task_results:
            try:
                return json.loads(self.task_results)
            except json.JSONDecodeError:
                return None
        return None

    def set_task_results(self, results: List[Dict[str, Any]]) -> None:
        """
        Set task results as JSON string.

        Args:
            results (list): Task execution results
        """
        self.task_results = json.dumps(results) if results else None

    def get_play_results(self) -> Optional[List[Dict[str, Any]]]:
        """
        Parse play_results JSON string to list of dictionaries.

        Returns:
            list or None: Play execution results
        """
        if self.play_results:
            try:
                return json.loads(self.play_results)
            except json.JSONDecodeError:
                return None
        return None

    def set_play_results(self, results: List[Dict[str, Any]]) -> None:
        """
        Set play results as JSON string.

        Args:
            results (list): Play execution results
        """
        self.play_results = json.dumps(results) if results else None

    def get_extra_vars(self) -> Optional[Dict[str, Any]]:
        """
        Parse extra_vars JSON string to dictionary.

        Returns:
            dict or None: Extra variables used in the run
        """
        if self.extra_vars:
            try:
                return json.loads(self.extra_vars)
            except json.JSONDecodeError:
                return None
        return None

    def set_extra_vars(self, vars_dict: Dict[str, Any]) -> None:
        """
        Set extra variables as JSON string.

        Args:
            vars_dict (dict): Extra variables to store
        """
        self.extra_vars = json.dumps(vars_dict) if vars_dict else None

    def get_tags(self) -> Optional[List[str]]:
        """
        Parse tags JSON string to list.

        Returns:
            list or None: Tags used in the run
        """
        if self.tags:
            try:
                return json.loads(self.tags)
            except json.JSONDecodeError:
                return None
        return None

    def set_tags(self, tags_list: List[str]) -> None:
        """
        Set tags as JSON string.

        Args:
            tags_list (list): Tags to store
        """
        self.tags = json.dumps(tags_list) if tags_list else None

    def get_skip_tags(self) -> Optional[List[str]]:
        """
        Parse skip_tags JSON string to list.

        Returns:
            list or None: Skip tags used in the run
        """
        if self.skip_tags:
            try:
                return json.loads(self.skip_tags)
            except json.JSONDecodeError:
                return None
        return None

    def set_skip_tags(self, skip_tags_list: List[str]) -> None:
        """
        Set skip tags as JSON string.

        Args:
            skip_tags_list (list): Skip tags to store
        """
        self.skip_tags = json.dumps(skip_tags_list) if skip_tags_list else None

    def calculate_duration(self) -> None:
        """
        Calculate automation run duration if start and end times are available.
        Updates the duration_seconds field.
        """
        if self.started_at and self.completed_at:
            delta = self.completed_at - self.started_at
            self.duration_seconds = delta.total_seconds()

    def calculate_success_rate(self) -> float:
        """
        Calculate overall success rate for the automation run.

        Returns:
            float: Success rate as percentage (0-100)
        """
        if not self.total_hosts or self.total_hosts == 0:
            return 0.0

        successful = self.successful_hosts or 0
        return (successful / self.total_hosts) * 100.0

    def calculate_coverage_percentage(self) -> None:
        """
        Calculate automation coverage percentage.
        Updates the coverage_percentage field.
        """
        if self.total_hosts and self.successful_hosts is not None:
            self.coverage_percentage = (
                self.successful_hosts / self.total_hosts
            ) * 100.0
        else:
            self.coverage_percentage = 0.0

    def calculate_automation_score(self) -> None:
        """
        Calculate automation maturity score based on various factors.
        Updates the automation_score field.
        """
        score = 0.0

        # Success rate contribution (40%)
        success_rate = self.calculate_success_rate()
        score += (success_rate / 100.0) * 40.0

        # Task efficiency contribution (30%)
        if self.total_tasks and self.successful_tasks:
            task_efficiency = (self.successful_tasks / self.total_tasks) * 30.0
            score += task_efficiency

        # Automation practices contribution (30%)
        practices_score = 0.0

        # Check mode usage (good practice)
        if self.check_mode:
            practices_score += 5.0

        # Has proper tagging
        if self.get_tags():
            practices_score += 5.0

        # Version control integration
        if self.repository_url and self.commit_sha:
            practices_score += 10.0

        # Environment specification
        if self.environment:
            practices_score += 5.0

        # Low failure rate
        if self.failed_hosts is not None and self.total_hosts:
            failure_rate = (self.failed_hosts / self.total_hosts) * 100.0
            if failure_rate < 5:
                practices_score += 5.0

        score += practices_score

        self.automation_score = min(100.0, max(0.0, score))

    def is_finished(self) -> bool:
        """
        Check if automation run is finished.

        Returns:
            bool: True if automation run is in a terminal state
        """
        return self.status in [
            AutomationStatus.SUCCESS,
            AutomationStatus.FAILED,
            AutomationStatus.CANCELLED,
            AutomationStatus.SKIPPED,
            AutomationStatus.PARTIAL_SUCCESS,
        ]

    def is_successful(self) -> bool:
        """
        Check if automation run was successful.

        Returns:
            bool: True if automation run completed successfully
        """
        return self.status in [
            AutomationStatus.SUCCESS,
            AutomationStatus.PARTIAL_SUCCESS,
        ]

    def has_host_failures(self) -> bool:
        """
        Check if there were any host failures.

        Returns:
            bool: True if any hosts failed or were unreachable
        """
        return (self.failed_hosts and self.failed_hosts > 0) or (
            self.unreachable_hosts and self.unreachable_hosts > 0
        )

    def get_execution_summary(self) -> Dict[str, Any]:
        """
        Get summary of automation execution.

        Returns:
            dict: Execution summary with key metrics
        """
        return {
            "status": self.status,
            "success_rate": self.calculate_success_rate(),
            "duration_seconds": self.duration_seconds,
            "hosts": {
                "total": self.total_hosts,
                "successful": self.successful_hosts,
                "failed": self.failed_hosts,
                "unreachable": self.unreachable_hosts,
                "skipped": self.skipped_hosts,
            },
            "tasks": {
                "total": self.total_tasks,
                "successful": self.successful_tasks,
                "failed": self.failed_tasks,
                "skipped": self.skipped_tasks,
                "changed": self.changed_tasks,
            },
            "coverage_percentage": self.coverage_percentage,
            "automation_score": self.automation_score,
            "has_failures": self.has_host_failures(),
        }

    @classmethod
    def from_ansible_callback_data(
        cls, callback_data: Dict[str, Any], run_metadata: Dict[str, Any]
    ) -> "AutomationRun":
        """
        Create AutomationRun instance from Ansible callback plugin data.

        Args:
            callback_data (dict): Data from Ansible callback plugin
            run_metadata (dict): Additional run metadata

        Returns:
            AutomationRun: New AutomationRun instance with Ansible data
        """
        # Extract basic information
        stats = callback_data.get("stats", {})

        # Calculate totals
        total_hosts = len(stats) if stats else 0
        successful_hosts = sum(
            1
            for host_stats in stats.values()
            if host_stats.get("failures", 0) == 0
            and host_stats.get("unreachable", 0) == 0
        )
        failed_hosts = sum(
            1 for host_stats in stats.values() if host_stats.get("failures", 0) > 0
        )
        unreachable_hosts = sum(
            1 for host_stats in stats.values() if host_stats.get("unreachable", 0) > 0
        )

        # Determine status
        if failed_hosts > 0 or unreachable_hosts > 0:
            if successful_hosts > 0:
                status = AutomationStatus.PARTIAL_SUCCESS
            else:
                status = AutomationStatus.FAILED
        else:
            status = AutomationStatus.SUCCESS

        return cls(
            automation_id=run_metadata.get("uuid", "unknown"),
            name=run_metadata.get("playbook", "Unknown Playbook"),
            automation_type=AutomationType.PLAYBOOK,
            status=status,
            playbook_name=run_metadata.get("playbook"),
            inventory_name=run_metadata.get("inventory"),
            started_at=run_metadata.get("started_at"),
            completed_at=run_metadata.get("completed_at"),
            ansible_version=run_metadata.get("ansible_version"),
            python_version=run_metadata.get("python_version"),
            command_line=run_metadata.get("command_line"),
            working_directory=run_metadata.get("working_directory"),
            total_hosts=total_hosts,
            successful_hosts=successful_hosts,
            failed_hosts=failed_hosts,
            unreachable_hosts=unreachable_hosts,
            environment=run_metadata.get("environment"),
            target_group=run_metadata.get("target_group"),
            dry_run=run_metadata.get("dry_run", False),
            check_mode=run_metadata.get("check_mode", False),
        )
