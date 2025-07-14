from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

from ..models.pipeline import PipelineStatus, PipelineType


class PipelineBase(BaseModel):
    """Base pipeline schema with common fields"""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    repository_url: str = Field(..., min_length=1)
    branch: str = Field(default="main", min_length=1)
    pipeline_type: PipelineType
    config: Optional[Dict[str, Any]] = None
    is_active: bool = True


class PipelineCreate(PipelineBase):
    """Schema for creating a new pipeline"""

    project_id: int = Field(..., gt=0)


class PipelineUpdate(BaseModel):
    """Schema for updating an existing pipeline"""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    branch: Optional[str] = Field(None, min_length=1)
    pipeline_type: Optional[PipelineType] = None
    config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class PipelineRunBase(BaseModel):
    """Base schema for pipeline run data"""

    run_number: int = Field(..., gt=0)
    commit_sha: str = Field(..., min_length=40, max_length=40)
    commit_message: Optional[str] = None
    triggered_by: str = Field(..., min_length=1)
    trigger_event: str = Field(..., min_length=1)

    @validator("commit_sha")
    def validate_commit_sha(cls, v):
        if not all(c in "0123456789abcdef" for c in v.lower()):
            raise ValueError("commit_sha must be a valid hex string")
        return v.lower()


class PipelineRunCreate(PipelineRunBase):
    """Schema for creating a pipeline run"""

    pipeline_id: int = Field(..., gt=0)


class PipelineRunUpdate(BaseModel):
    """Schema for updating a pipeline run"""

    status: Optional[PipelineStatus] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    logs_url: Optional[str] = None
    artifacts_url: Optional[str] = None
    test_results: Optional[Dict[str, Any]] = None
    deployment_info: Optional[Dict[str, Any]] = None
    resource_usage: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


class PipelineRun(PipelineRunBase):
    """Complete pipeline run schema for responses"""

    id: int
    pipeline_id: int
    status: PipelineStatus
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    logs_url: Optional[str] = None
    artifacts_url: Optional[str] = None
    test_results: Optional[Dict[str, Any]] = None
    deployment_info: Optional[Dict[str, Any]] = None
    resource_usage: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Pipeline(PipelineBase):
    """Complete pipeline schema for responses"""

    id: int
    project_id: int
    external_id: Optional[str] = None
    last_run_status: Optional[PipelineStatus] = None
    last_run_at: Optional[datetime] = None
    total_runs: int = 0
    success_rate: float = 0.0
    average_duration: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    # Related data
    runs: Optional[List[PipelineRun]] = None

    class Config:
        from_attributes = True


class PipelineStats(BaseModel):
    """Pipeline statistics schema"""

    total_runs: int
    success_rate: float
    failure_rate: float
    average_duration: Optional[float] = None
    runs_last_30_days: int
    success_rate_last_30_days: float


class PipelineWithStats(Pipeline):
    """Pipeline with computed statistics"""

    stats: PipelineStats


class GitHubActionsData(BaseModel):
    """Schema for GitHub Actions webhook data"""

    workflow_run: Dict[str, Any]
    repository: Dict[str, Any]
    sender: Dict[str, Any]


# Aliases for endpoint compatibility
PipelineResponse = Pipeline
PipelineRunResponse = PipelineRun
PipelineCreateRequest = PipelineCreate
PipelineUpdateRequest = PipelineUpdate
