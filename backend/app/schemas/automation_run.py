from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime

from ..models.automation_run import AutomationStatus, AutomationType


class AutomationRunBase(BaseModel):
    """Base automation run schema with common fields"""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    automation_type: AutomationType
    playbook_path: Optional[str] = None
    inventory_path: Optional[str] = None
    extra_vars: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    limit_hosts: Optional[str] = None
    check_mode: bool = False
    diff_mode: bool = False
    verbose_level: int = Field(default=0, ge=0, le=4)


class AutomationRunCreate(AutomationRunBase):
    """Schema for creating a new automation run"""

    project_id: int = Field(..., gt=0)
    triggered_by_user_id: int = Field(..., gt=0)


class AutomationRunUpdate(BaseModel):
    """Schema for updating an automation run"""

    status: Optional[AutomationStatus] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    total_hosts: Optional[int] = Field(None, ge=0)
    successful_hosts: Optional[int] = Field(None, ge=0)
    failed_hosts: Optional[int] = Field(None, ge=0)
    unreachable_hosts: Optional[int] = Field(None, ge=0)
    skipped_hosts: Optional[int] = Field(None, ge=0)
    total_tasks: Optional[int] = Field(None, ge=0)
    successful_tasks: Optional[int] = Field(None, ge=0)
    failed_tasks: Optional[int] = Field(None, ge=0)
    skipped_tasks: Optional[int] = Field(None, ge=0)
    changed_tasks: Optional[int] = Field(None, ge=0)
    coverage_percentage: Optional[float] = Field(None, ge=0, le=100)
    logs: Optional[str] = None
    output: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


class HostResult(BaseModel):
    """Schema for individual host results"""

    hostname: str
    status: str  # ok, failed, unreachable, skipped
    task_count: int = Field(..., ge=0)
    changed_count: int = Field(..., ge=0)
    failed_count: int = Field(..., ge=0)
    skipped_count: int = Field(..., ge=0)
    unreachable_count: int = Field(..., ge=0)
    facts: Optional[Dict[str, Any]] = None
    errors: Optional[List[str]] = None


class TaskResult(BaseModel):
    """Schema for individual task results"""

    task_name: str
    action: str
    status: str  # ok, failed, skipped, changed
    host: str
    duration: Optional[float] = None
    changed: bool = False
    failed: bool = False
    skipped: bool = False
    message: Optional[str] = None
    result: Optional[Dict[str, Any]] = None


class AutomationRun(AutomationRunBase):
    """Complete automation run schema for responses"""

    id: int
    project_id: int
    triggered_by_user_id: int
    external_id: Optional[str] = None
    status: AutomationStatus

    # Execution details
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None

    # Host statistics
    total_hosts: int = 0
    successful_hosts: int = 0
    failed_hosts: int = 0
    unreachable_hosts: int = 0
    skipped_hosts: int = 0

    # Task statistics
    total_tasks: int = 0
    successful_tasks: int = 0
    failed_tasks: int = 0
    skipped_tasks: int = 0
    changed_tasks: int = 0

    # Coverage and results
    coverage_percentage: Optional[float] = None
    logs: Optional[str] = None
    output: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

    # Timestamps
    created_at: datetime
    updated_at: datetime

    # Related data
    host_results: Optional[List[HostResult]] = None
    task_results: Optional[List[TaskResult]] = None

    class Config:
        from_attributes = True


class AutomationRunSummary(BaseModel):
    """Summary schema for automation run execution"""

    success_rate: float = Field(..., ge=0, le=100)
    host_success_rate: float = Field(..., ge=0, le=100)
    task_success_rate: float = Field(..., ge=0, le=100)
    coverage_percentage: float = Field(..., ge=0, le=100)
    total_duration: Optional[int] = None
    average_task_duration: Optional[float] = None
    most_common_failures: List[str] = []
    performance_metrics: Dict[str, Any] = {}


class AutomationRunWithSummary(AutomationRun):
    """Automation run with execution summary"""

    summary: AutomationRunSummary


class AutomationStats(BaseModel):
    """Automation statistics schema"""

    total_runs: int = Field(..., ge=0)
    successful_runs: int = Field(..., ge=0)
    failed_runs: int = Field(..., ge=0)
    success_rate: float = Field(..., ge=0, le=100)
    average_duration: Optional[float] = None
    total_hosts_managed: int = Field(..., ge=0)
    most_used_playbooks: List[Dict[str, Any]] = []
    recent_failures: List[str] = []


class AnsibleCallbackData(BaseModel):
    """Schema for Ansible callback plugin data"""

    play: Dict[str, Any]
    task: Dict[str, Any]
    host: str
    result: Dict[str, Any]
    event_type: str
    timestamp: datetime


class AnsibleInventory(BaseModel):
    """Schema for Ansible inventory data"""

    hosts: List[str]
    groups: Dict[str, List[str]]
    host_vars: Dict[str, Dict[str, Any]]
    group_vars: Dict[str, Dict[str, Any]]


class PlaybookValidation(BaseModel):
    """Schema for playbook validation results"""

    is_valid: bool
    syntax_errors: List[str] = []
    warnings: List[str] = []
    tasks_count: int = Field(..., ge=0)
    hosts_count: int = Field(..., ge=0)
    estimated_duration: Optional[int] = None
