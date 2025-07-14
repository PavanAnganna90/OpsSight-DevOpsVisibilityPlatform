"""
Pipeline management API endpoints.
Handles CI/CD pipeline data including GitHub Actions integration.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, HttpUrl

from app.core.dependencies import get_db, get_async_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.pipeline import Pipeline, PipelineRun
from app.services.github import github_actions_service, github_repository_service
from app.schemas.pipeline import (
    PipelineResponse,
    PipelineRunResponse,
    PipelineCreateRequest,
    PipelineUpdateRequest,
)

router = APIRouter()


class GitHubSyncRequest(BaseModel):
    """Request model for GitHub Actions sync."""

    repository_url: HttpUrl
    days_back: Optional[int] = 30


class GitHubSyncResponse(BaseModel):
    """Response model for GitHub Actions sync."""

    success: bool
    message: str
    pipeline_id: Optional[int] = None
    repository: Optional[str] = None
    runs_synced: Optional[int] = None
    total_runs_found: Optional[int] = None
    sync_timestamp: Optional[str] = None


@router.get("/", response_model=List[PipelineResponse])
async def get_pipelines(
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    provider: Optional[str] = Query(
        None, description="Filter by provider (e.g., github_actions)"
    ),
    limit: int = Query(50, le=100, description="Maximum number of pipelines to return"),
    offset: int = Query(0, ge=0, description="Number of pipelines to skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve pipelines with optional filtering.

    Args:
        project_id (Optional[int]): Filter by project ID
        provider (Optional[str]): Filter by provider type
        limit (int): Maximum results to return
        offset (int): Number of results to skip
        db (Session): Database session
        current_user (User): Authenticated user

    Returns:
        List[PipelineResponse]: List of pipelines
    """
    query = db.query(Pipeline).join(Project)

    # Apply project-based access control
    accessible_projects = [
        p.id for p in db.query(Project).all() if p.is_accessible_by_user(current_user)
    ]

    if not accessible_projects:
        return []

    query = query.filter(Project.id.in_(accessible_projects))

    # Apply filters
    if project_id:
        if project_id not in accessible_projects:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to specified project",
            )
        query = query.filter(Pipeline.project_id == project_id)

    if provider:
        query = query.filter(Pipeline.provider == provider)

    # Apply pagination
    pipelines = query.offset(offset).limit(limit).all()

    return [PipelineResponse.model_validate(pipeline) for pipeline in pipelines]


@router.get("/{pipeline_id}", response_model=PipelineResponse)
async def get_pipeline(
    pipeline_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve a specific pipeline by ID.

    Args:
        pipeline_id (int): Pipeline ID
        db (Session): Database session
        current_user (User): Authenticated user

    Returns:
        PipelineResponse: Pipeline details
    """
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()

    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found"
        )

    # Check access through project
    project = db.query(Project).filter(Project.id == pipeline.project_id).first()
    if not project or not project.is_accessible_by_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to pipeline"
        )

    return PipelineResponse.model_validate(pipeline)


@router.get("/{pipeline_id}/runs", response_model=List[PipelineRunResponse])
async def get_pipeline_runs(
    pipeline_id: int,
    status: Optional[str] = Query(None, description="Filter by run status"),
    branch: Optional[str] = Query(None, description="Filter by branch"),
    limit: int = Query(50, le=100, description="Maximum number of runs to return"),
    offset: int = Query(0, ge=0, description="Number of runs to skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve pipeline runs for a specific pipeline.

    Args:
        pipeline_id (int): Pipeline ID
        status (Optional[str]): Filter by run status
        branch (Optional[str]): Filter by branch
        limit (int): Maximum results to return
        offset (int): Number of results to skip
        db (Session): Database session
        current_user (User): Authenticated user

    Returns:
        List[PipelineRunResponse]: List of pipeline runs
    """
    # Verify pipeline access
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()

    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found"
        )

    # Check access through project
    project = db.query(Project).filter(Project.id == pipeline.project_id).first()
    if not project or not project.is_accessible_by_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to pipeline"
        )

    # Build query
    query = db.query(PipelineRun).filter(PipelineRun.pipeline_id == pipeline_id)

    if status:
        query = query.filter(PipelineRun.status == status)
    if branch:
        query = query.filter(PipelineRun.branch == branch)

    # Apply pagination and ordering
    runs = (
        query.order_by(PipelineRun.started_at.desc()).offset(offset).limit(limit).all()
    )

    return [PipelineRunResponse.model_validate(run) for run in runs]


@router.post("/github/sync", response_model=GitHubSyncResponse)
async def sync_github_actions(
    project_id: int,
    sync_request: GitHubSyncRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Sync GitHub Actions data for a project.

    Args:
        project_id (int): Project ID to sync data for
        sync_request (GitHubSyncRequest): Sync configuration
        background_tasks (BackgroundTasks): Background task handler
        db (Session): Database session
        current_user (User): Authenticated user

    Returns:
        GitHubSyncResponse: Sync operation result
    """
    # Verify project access
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    if not project.is_accessible_by_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to project"
        )

    # Verify user has GitHub access token
    if not current_user.github_access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="GitHub access token required. Please authenticate with GitHub.",
        )

    try:
        # Perform sync operation
        sync_result = await github_actions_service.sync_pipeline_data(
            db=db,
            project_id=project_id,
            access_token=current_user.github_access_token,
            repository_url=str(sync_request.repository_url),
            days_back=sync_request.days_back,
        )

        return GitHubSyncResponse(
            success=True,
            message="GitHub Actions data synced successfully",
            **sync_result,
        )

    except Exception as e:
        return GitHubSyncResponse(
            success=False, message=f"Failed to sync GitHub Actions data: {str(e)}"
        )


@router.get("/github/repositories")
async def get_github_repositories(
    visibility: Optional[str] = Query(
        None, description="Filter by visibility (all, public, private)"
    ),
    sort: str = Query(
        "updated", description="Sort order (created, updated, pushed, full_name)"
    ),
    search: Optional[str] = Query(None, description="Search query for repositories"),
    per_page: int = Query(30, le=100, description="Results per page"),
    page: int = Query(1, ge=1, description="Page number"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get GitHub repositories accessible to the current user.

    Args:
        visibility (Optional[str]): Filter by visibility
        sort (str): Sort order
        search (Optional[str]): Search query
        per_page (int): Results per page
        page (int): Page number
        db (Session): Database session
        current_user (User): Authenticated user

    Returns:
        Dict[str, Any]: Repository data with pagination
    """
    if not current_user.github_access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="GitHub access token required. Please authenticate with GitHub.",
        )

    try:
        if search:
            # Use search API for text queries
            repositories, pagination = (
                await github_repository_service.search_repositories(
                    access_token=current_user.github_access_token,
                    query=search,
                    sort=sort,
                    per_page=per_page,
                    page=page,
                )
            )
        else:
            # Use user repositories API
            repositories, pagination = (
                await github_repository_service.list_user_repositories(
                    access_token=current_user.github_access_token,
                    visibility=visibility,
                    sort=sort,
                    per_page=per_page,
                    page=page,
                )
            )

        # Convert dataclasses to dicts for JSON response
        repository_dicts = [
            {
                "id": repo.id,
                "name": repo.name,
                "full_name": repo.full_name,
                "description": repo.description,
                "html_url": repo.html_url,
                "clone_url": repo.clone_url,
                "ssh_url": repo.ssh_url,
                "default_branch": repo.default_branch,
                "language": repo.language,
                "visibility": repo.visibility,
                "size": repo.size,
                "stargazers_count": repo.stargazers_count,
                "watchers_count": repo.watchers_count,
                "forks_count": repo.forks_count,
                "open_issues_count": repo.open_issues_count,
                "has_actions": repo.has_actions,
                "permissions": repo.permissions,
                "created_at": repo.created_at,
                "updated_at": repo.updated_at,
                "pushed_at": repo.pushed_at,
            }
            for repo in repositories
        ]

        return {
            "repositories": repository_dicts,
            "pagination": pagination,
            "filters": {"visibility": visibility, "sort": sort, "search": search},
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch GitHub repositories: {str(e)}",
        )


@router.get("/{pipeline_id}/metrics")
async def get_pipeline_metrics(
    pipeline_id: int,
    days: int = Query(30, ge=1, le=365, description="Number of days for metrics"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get pipeline metrics and analytics.

    Args:
        pipeline_id (int): Pipeline ID
        days (int): Number of days to include in metrics
        db (Session): Database session
        current_user (User): Authenticated user

    Returns:
        Dict[str, Any]: Pipeline metrics
    """
    # Verify pipeline access
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()

    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found"
        )

    # Check access through project
    project = db.query(Project).filter(Project.id == pipeline.project_id).first()
    if not project or not project.is_accessible_by_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to pipeline"
        )

    # Calculate metrics using pipeline helper methods
    metrics = pipeline.calculate_metrics(days=days)

    return {
        "pipeline_id": pipeline_id,
        "pipeline_name": pipeline.name,
        "metrics_period_days": days,
        "success_rate": metrics.get("success_rate", 0.0),
        "avg_duration_seconds": metrics.get("avg_duration", 0),
        "total_runs": metrics.get("total_runs", 0),
        "failed_runs": metrics.get("failed_runs", 0),
        "deployment_frequency": metrics.get("deployment_frequency", 0.0),
        "last_updated": (
            pipeline.updated_at.isoformat() if pipeline.updated_at else None
        ),
    }
