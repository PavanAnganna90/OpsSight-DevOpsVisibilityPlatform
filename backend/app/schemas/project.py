from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime


class ProjectBase(BaseModel):
    """Base project schema with common fields"""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    repository_url: Optional[str] = None
    default_branch: str = Field(default="main", min_length=1)
    environments: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    settings: Optional[Dict[str, Any]] = None
    is_active: bool = True


class ProjectCreate(ProjectBase):
    """Schema for creating a new project"""

    owner_user_id: int = Field(..., gt=0)


class ProjectUpdate(BaseModel):
    """Schema for updating an existing project"""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    repository_url: Optional[str] = None
    default_branch: Optional[str] = Field(None, min_length=1)
    environments: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    settings: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class Project(ProjectBase):
    """Complete project schema for responses"""

    id: int
    owner_user_id: int
    created_at: datetime
    updated_at: datetime

    # Statistics (computed fields)
    pipeline_count: int = 0
    cluster_count: int = 0
    automation_run_count: int = 0
    infrastructure_change_count: int = 0
    alert_count: int = 0
    team_count: int = 0

    # Owner details (populated from relationship)
    owner_email: Optional[str] = None
    owner_full_name: Optional[str] = None
    owner_github_username: Optional[str] = None

    class Config:
        from_attributes = True


class ProjectSummary(BaseModel):
    """Project summary with key metrics"""

    id: int
    name: str
    description: Optional[str] = None
    is_active: bool

    # Quick stats
    total_pipelines: int = 0
    active_pipelines: int = 0
    total_clusters: int = 0
    healthy_clusters: int = 0
    active_alerts: int = 0
    critical_alerts: int = 0

    # Recent activity
    last_pipeline_run: Optional[datetime] = None
    last_deployment: Optional[datetime] = None
    last_alert: Optional[datetime] = None


class ProjectStats(BaseModel):
    """Detailed project statistics"""

    # Pipeline metrics
    total_pipeline_runs: int = 0
    successful_pipeline_runs: int = 0
    failed_pipeline_runs: int = 0
    pipeline_success_rate: float = 0.0
    average_pipeline_duration: Optional[float] = None

    # Infrastructure metrics
    total_infrastructure_changes: int = 0
    successful_changes: int = 0
    failed_changes: int = 0
    pending_approvals: int = 0
    infrastructure_success_rate: float = 0.0

    # Automation metrics
    total_automation_runs: int = 0
    successful_automation_runs: int = 0
    failed_automation_runs: int = 0
    automation_success_rate: float = 0.0
    hosts_managed: int = 0

    # Alert metrics
    total_alerts: int = 0
    resolved_alerts: int = 0
    average_resolution_time: Optional[float] = None  # minutes
    alerts_by_severity: Dict[str, int] = {}

    # Resource utilization
    average_cpu_usage: Optional[float] = None
    average_memory_usage: Optional[float] = None
    total_cost_estimate: Optional[float] = None


class ProjectWithStats(Project):
    """Project with detailed statistics"""

    stats: ProjectStats


class ProjectResourceSummary(BaseModel):
    """Summary of project resources"""

    pipelines: List[Dict[str, Any]] = []
    clusters: List[Dict[str, Any]] = []
    recent_automation_runs: List[Dict[str, Any]] = []
    recent_infrastructure_changes: List[Dict[str, Any]] = []
    active_alerts: List[Dict[str, Any]] = []


class ProjectWithResources(Project):
    """Project with resource summary"""

    resources: ProjectResourceSummary


class ProjectAccess(BaseModel):
    """Schema for project access control"""

    user_id: int
    project_id: int
    access_level: str  # owner, admin, write, read
    granted_at: datetime
    granted_by_user_id: int

    # User details
    user_email: Optional[str] = None
    user_full_name: Optional[str] = None
    user_github_username: Optional[str] = None

    class Config:
        from_attributes = True


class ProjectAccessCreate(BaseModel):
    """Schema for granting project access"""

    user_id: int = Field(..., gt=0)
    project_id: int = Field(..., gt=0)
    access_level: str = Field(..., pattern=r"^(owner|admin|write|read)$")


class ProjectAccessUpdate(BaseModel):
    """Schema for updating project access"""

    access_level: str = Field(..., pattern=r"^(owner|admin|write|read)$")


class ProjectEnvironment(BaseModel):
    """Schema for project environment configuration"""

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    config: Dict[str, Any] = {}
    is_production: bool = False
    deployment_approval_required: bool = False
    auto_deploy_enabled: bool = False
    notification_channels: List[str] = []


class ProjectNotificationSettings(BaseModel):
    """Schema for project notification settings"""

    pipeline_notifications: Dict[str, Any] = {}
    infrastructure_notifications: Dict[str, Any] = {}
    automation_notifications: Dict[str, Any] = {}
    alert_notifications: Dict[str, Any] = {}
    default_channels: List[str] = []
    escalation_rules: List[Dict[str, Any]] = []


class ProjectIntegration(BaseModel):
    """Schema for project integrations"""

    id: int
    project_id: int
    integration_type: str  # github, slack, jira, etc.
    name: str
    config: Dict[str, Any]
    is_active: bool = True
    last_sync: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectIntegrationCreate(BaseModel):
    """Schema for creating project integrations"""

    project_id: int = Field(..., gt=0)
    integration_type: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=255)
    config: Dict[str, Any]


class ProjectIntegrationUpdate(BaseModel):
    """Schema for updating project integrations"""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class ProjectActivity(BaseModel):
    """Schema for project activity tracking"""

    id: int
    project_id: int
    user_id: Optional[int] = None
    activity_type: str  # pipeline_run, deployment, alert, etc.
    description: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    # User details
    user_name: Optional[str] = None
    user_email: Optional[str] = None

    class Config:
        from_attributes = True


class ProjectHealth(BaseModel):
    """Schema for project health assessment"""

    overall_score: float = Field(..., ge=0, le=100)
    pipeline_health: float = Field(..., ge=0, le=100)
    infrastructure_health: float = Field(..., ge=0, le=100)
    automation_health: float = Field(..., ge=0, le=100)
    alert_health: float = Field(..., ge=0, le=100)

    issues: List[str] = []
    recommendations: List[str] = []
    last_assessment: datetime


class ProjectWithHealth(Project):
    """Project with health assessment"""

    health: ProjectHealth
