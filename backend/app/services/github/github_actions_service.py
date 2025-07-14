"""
GitHub Actions service for fetching and processing CI/CD pipeline data.
Integrates with GitHub Actions API to retrieve workflow runs, jobs, and metrics.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.db.database import get_db
from app.models.pipeline import Pipeline, PipelineRun, PipelineStatus
from app.models.project import Project
from app.services.github.github_oauth import github_oauth
from app.core.exceptions import GitHubAPIException, NetworkException, RateLimitException
from app.core.app_logging import github_logger, performance_logger, LogCategory

logger = logging.getLogger(__name__)


class GitHubActionStatus(Enum):
    """GitHub Actions workflow status mapping."""

    QUEUED = "queued"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class GitHubActionConclusion(Enum):
    """GitHub Actions workflow conclusion mapping."""

    SUCCESS = "success"
    FAILURE = "failure"
    NEUTRAL = "neutral"
    CANCELLED = "cancelled"
    SKIPPED = "skipped"
    TIMED_OUT = "timed_out"
    ACTION_REQUIRED = "action_required"


@dataclass
class GitHubWorkflowRun:
    """GitHub workflow run data structure."""

    id: int
    name: str
    head_branch: str
    status: str
    conclusion: Optional[str]
    created_at: datetime
    updated_at: datetime
    duration_seconds: Optional[int]
    repository_full_name: str
    workflow_id: int
    run_number: int
    html_url: str
    head_sha: str


class GitHubActionsService:
    """
    Service for integrating with GitHub Actions API.
    Handles authentication, data fetching, and transformation.
    """

    def __init__(self):
        """Initialize GitHub Actions service."""
        self.api_url = "https://api.github.com"
        self.rate_limit_remaining = 5000  # GitHub default
        self.rate_limit_reset = datetime.now(timezone.utc)

    async def _make_authenticated_request(
        self, access_token: str, endpoint: str, params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Make authenticated request to GitHub API with rate limiting and enhanced error handling.

        Args:
            access_token (str): GitHub OAuth access token
            endpoint (str): API endpoint path
            params (Optional[Dict[str, Any]]): Query parameters

        Returns:
            Dict[str, Any]: API response data

        Raises:
            GitHubAPIException: If API request fails
            RateLimitException: If rate limit is exceeded
            NetworkException: If network error occurs
        """
        # Check rate limit
        if (
            self.rate_limit_remaining < 100
            and datetime.now(timezone.utc) < self.rate_limit_reset
        ):
            wait_seconds = (self.rate_limit_reset - datetime.now(timezone.utc)).seconds
            github_logger.log_rate_limit_warning(
                remaining=self.rate_limit_remaining,
                reset_time=self.rate_limit_reset.isoformat(),
                endpoint=endpoint,
            )
            await asyncio.sleep(min(wait_seconds, 300))  # Max 5 min wait

        headers = {
            "Authorization": f"token {access_token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": f"{settings.PROJECT_NAME}/{settings.VERSION}",
        }

        start_time = datetime.now()

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.api_url}/{endpoint}",
                    headers=headers,
                    params=params or {},
                    timeout=30.0,
                )

                duration_ms = (datetime.now() - start_time).total_seconds() * 1000

                # Update rate limit info
                self.rate_limit_remaining = int(
                    response.headers.get("x-ratelimit-remaining", 5000)
                )
                if reset_time := response.headers.get("x-ratelimit-reset"):
                    self.rate_limit_reset = datetime.fromtimestamp(
                        int(reset_time), tz=timezone.utc
                    )

                # Log API call
                github_logger.log_api_call(
                    endpoint=endpoint,
                    method="GET",
                    status_code=response.status_code,
                    duration_ms=duration_ms,
                    rate_limit_remaining=self.rate_limit_remaining,
                    rate_limit_reset=self.rate_limit_reset.isoformat(),
                )

                if response.status_code == 401:
                    raise GitHubAPIException(
                        message="GitHub access token invalid or expired",
                        github_error={"status_code": 401, "endpoint": endpoint},
                    )
                elif response.status_code == 403:
                    if "rate limit" in response.text.lower():
                        raise RateLimitException(
                            message="GitHub API rate limit exceeded",
                            limit=5000,
                            window=3600,
                            reset_time=self.rate_limit_reset.isoformat(),
                        )
                    raise GitHubAPIException(
                        message="Insufficient GitHub permissions",
                        github_error={"status_code": 403, "endpoint": endpoint},
                    )
                elif response.status_code == 404:
                    raise GitHubAPIException(
                        message="GitHub repository or resource not found",
                        github_error={"status_code": 404, "endpoint": endpoint},
                    )
                elif response.status_code >= 400:
                    raise GitHubAPIException(
                        message=f"GitHub API error: {response.status_code}",
                        github_error={
                            "status_code": response.status_code,
                            "endpoint": endpoint,
                            "response_text": response.text,
                        },
                    )

                return response.json()

            except httpx.TimeoutException:
                raise NetworkException(
                    message="GitHub API request timeout",
                    endpoint=f"{self.api_url}/{endpoint}",
                    timeout=True,
                )
            except httpx.NetworkError as e:
                raise NetworkException(
                    message=f"GitHub API network error: {str(e)}",
                    endpoint=f"{self.api_url}/{endpoint}",
                )

    async def fetch_repository_workflows(
        self, access_token: str, owner: str, repo: str
    ) -> List[Dict[str, Any]]:
        """
        Fetch all workflows for a repository.

        Args:
            access_token (str): GitHub OAuth access token
            owner (str): Repository owner
            repo (str): Repository name

        Returns:
            List[Dict[str, Any]]: List of workflow definitions
        """
        endpoint = f"repos/{owner}/{repo}/actions/workflows"
        response = await self._make_authenticated_request(access_token, endpoint)
        return response.get("workflows", [])

    async def fetch_workflow_runs(
        self,
        access_token: str,
        owner: str,
        repo: str,
        workflow_id: Optional[int] = None,
        branch: Optional[str] = None,
        status: Optional[str] = None,
        per_page: int = 30,
        page: int = 1,
    ) -> Tuple[List[GitHubWorkflowRun], Dict[str, Any]]:
        """
        Fetch workflow runs for a repository with pagination.

        Args:
            access_token (str): GitHub OAuth access token
            owner (str): Repository owner
            repo (str): Repository name
            workflow_id (Optional[int]): Specific workflow ID
            branch (Optional[str]): Filter by branch
            status (Optional[str]): Filter by status
            per_page (int): Results per page (max 100)
            page (int): Page number

        Returns:
            Tuple[List[GitHubWorkflowRun], Dict[str, Any]]: Workflow runs and pagination info
        """
        endpoint = f"repos/{owner}/{repo}/actions/runs"
        params = {"per_page": min(per_page, 100), "page": page}

        if workflow_id:
            params["workflow_id"] = workflow_id
        if branch:
            params["branch"] = branch
        if status:
            params["status"] = status

        response = await self._make_authenticated_request(
            access_token, endpoint, params
        )

        # Transform runs to our data structure
        workflow_runs = []
        for run_data in response.get("workflow_runs", []):
            try:
                # Calculate duration if both timestamps exist
                duration_seconds = None
                if run_data.get("created_at") and run_data.get("updated_at"):
                    created = datetime.fromisoformat(
                        run_data["created_at"].replace("Z", "+00:00")
                    )
                    updated = datetime.fromisoformat(
                        run_data["updated_at"].replace("Z", "+00:00")
                    )
                    duration_seconds = int((updated - created).total_seconds())

                workflow_run = GitHubWorkflowRun(
                    id=run_data["id"],
                    name=run_data.get("name", "Unnamed Workflow"),
                    head_branch=run_data.get("head_branch", "unknown"),
                    status=run_data["status"],
                    conclusion=run_data.get("conclusion"),
                    created_at=datetime.fromisoformat(
                        run_data["created_at"].replace("Z", "+00:00")
                    ),
                    updated_at=datetime.fromisoformat(
                        run_data["updated_at"].replace("Z", "+00:00")
                    ),
                    duration_seconds=duration_seconds,
                    repository_full_name=run_data["repository"]["full_name"],
                    workflow_id=run_data["workflow_id"],
                    run_number=run_data["run_number"],
                    html_url=run_data["html_url"],
                    head_sha=run_data["head_sha"],
                )
                workflow_runs.append(workflow_run)

            except (KeyError, ValueError) as e:
                logger.warning(f"Skipping malformed workflow run data: {e}")
                continue

        # Extract pagination info
        pagination_info = {
            "total_count": response.get("total_count", 0),
            "current_page": page,
            "per_page": per_page,
            "has_next": len(workflow_runs) == per_page,
        }

        return workflow_runs, pagination_info

    def _map_github_status_to_pipeline_status(
        self, github_status: str, conclusion: Optional[str]
    ) -> PipelineStatus:
        """
        Map GitHub Actions status to internal pipeline status.

        Args:
            github_status (str): GitHub workflow status
            conclusion (Optional[str]): GitHub workflow conclusion

        Returns:
            PipelineStatus: Mapped internal status
        """
        if github_status in ["queued", "pending"]:
            return PipelineStatus.PENDING
        elif github_status == "in_progress":
            return PipelineStatus.RUNNING
        elif github_status == "completed":
            if conclusion == "success":
                return PipelineStatus.SUCCESS
            elif conclusion in ["failure", "timed_out"]:
                return PipelineStatus.FAILED
            elif conclusion == "cancelled":
                return PipelineStatus.CANCELLED
            else:
                return PipelineStatus.FAILED
        else:
            return PipelineStatus.FAILED

    async def sync_pipeline_data(
        self,
        db: AsyncSession,
        project_id: int,
        access_token: str,
        repository_url: str,
        days_back: int = 30,
    ) -> Dict[str, Any]:
        """
        Sync pipeline data from GitHub Actions to database.

        Args:
            db (AsyncSession): Database session
            project_id (int): Project ID
            access_token (str): GitHub OAuth access token
            repository_url (str): GitHub repository URL
            days_back (int): Days of history to fetch

        Returns:
            Dict[str, Any]: Sync summary with statistics
        """
        try:
            # Extract owner/repo from URL
            # Handle various GitHub URL formats
            url_parts = repository_url.replace("https://github.com/", "").replace(
                ".git", ""
            )
            if "/" not in url_parts:
                raise ValueError("Invalid GitHub repository URL format")

            owner, repo = url_parts.split("/", 1)

            # Get or create pipeline record
            pipeline = await db.execute(
                select(Pipeline).filter(
                    Pipeline.project_id == project_id,
                    Pipeline.repository_url == repository_url,
                )
            )
            pipeline = pipeline.scalars().first()

            if not pipeline:
                # Create new pipeline
                pipeline = Pipeline(
                    project_id=project_id,
                    name=f"{owner}/{repo}",
                    repository_url=repository_url,
                    branch="main",  # Will be updated with actual branches
                    provider="github_actions",
                    external_id=f"github:{owner}/{repo}",
                )
                db.add(pipeline)
                await db.commit()
                await db.refresh(pipeline)

            # Fetch recent workflow runs
            since_date = datetime.now(timezone.utc) - timedelta(days=days_back)
            workflow_runs, _ = await self.fetch_workflow_runs(
                access_token=access_token, owner=owner, repo=repo, per_page=100
            )

            # Filter runs by date
            recent_runs = [run for run in workflow_runs if run.created_at >= since_date]

            # Sync pipeline runs
            synced_count = 0
            for run in recent_runs:
                existing_run = await db.execute(
                    select(PipelineRun).filter(
                        PipelineRun.pipeline_id == pipeline.id,
                        PipelineRun.external_id == str(run.id),
                    )
                )
                existing_run = existing_run.scalars().first()

                if not existing_run:
                    pipeline_run = PipelineRun(
                        pipeline_id=pipeline.id,
                        external_id=str(run.id),
                        name=run.name,
                        status=self._map_github_status_to_pipeline_status(
                            run.status, run.conclusion
                        ),
                        branch=run.head_branch,
                        commit_sha=run.head_sha,
                        started_at=run.created_at,
                        completed_at=(
                            run.updated_at if run.status == "completed" else None
                        ),
                        duration_seconds=run.duration_seconds,
                        external_url=run.html_url,
                        metadata={
                            "github_run_number": run.run_number,
                            "github_workflow_id": run.workflow_id,
                            "github_conclusion": run.conclusion,
                            "github_status": run.status,
                        },
                    )
                    db.add(pipeline_run)
                    synced_count += 1

            # Commit all changes
            await db.commit()

            # Update pipeline statistics
            pipeline.recalculate_success_rate()
            await db.commit()

            logger.info(f"Synced {synced_count} pipeline runs for {owner}/{repo}")

            return {
                "pipeline_id": pipeline.id,
                "repository": f"{owner}/{repo}",
                "runs_synced": synced_count,
                "total_runs_found": len(workflow_runs),
                "recent_runs_filtered": len(recent_runs),
                "sync_timestamp": datetime.now(timezone.utc).isoformat(),
            }

        except GitHubAPIException:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            logger.error(
                f"Error syncing pipeline data: {e}",
                extra={
                    "category": LogCategory.GITHUB.value,
                    "project_id": project_id,
                    "repository_url": repository_url,
                    "error": str(e),
                },
            )
            raise GitHubAPIException(
                message=f"Failed to sync pipeline data: {str(e)}",
                github_error={"operation": "sync_pipeline_data", "error": str(e)},
            )

    async def get_workflow_run_jobs(
        self,
        access_token: str,
        owner: str,
        repo: str,
        run_id: int,
        include_steps: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Get jobs for a specific workflow run with enhanced details.

        Args:
            access_token (str): GitHub OAuth access token
            owner (str): Repository owner
            repo (str): Repository name
            run_id (int): Workflow run ID
            include_steps (bool): Whether to include step details

        Returns:
            List[Dict[str, Any]]: List of enhanced job data
        """
        endpoint = f"repos/{owner}/{repo}/actions/runs/{run_id}/jobs"
        response = await self._make_authenticated_request(access_token, endpoint)
        jobs = response.get("jobs", [])

        # Enhance job data with additional processing
        enhanced_jobs = []
        for job in jobs:
            enhanced_job = self._enhance_job_data(job)

            # Calculate job metrics
            if enhanced_job["started_at"] and enhanced_job["completed_at"]:
                started = datetime.fromisoformat(
                    enhanced_job["started_at"].replace("Z", "+00:00")
                )
                completed = datetime.fromisoformat(
                    enhanced_job["completed_at"].replace("Z", "+00:00")
                )
                enhanced_job["duration_seconds"] = (completed - started).total_seconds()
            else:
                enhanced_job["duration_seconds"] = 0

            # Process steps if requested
            if include_steps and "steps" in enhanced_job:
                enhanced_job["steps"] = [
                    self._enhance_step_data(step) for step in enhanced_job["steps"]
                ]

                # Calculate step statistics
                steps = enhanced_job["steps"]
                enhanced_job["step_statistics"] = {
                    "total_steps": len(steps),
                    "completed_steps": len(
                        [s for s in steps if s["conclusion"] == "success"]
                    ),
                    "failed_steps": len(
                        [s for s in steps if s["conclusion"] == "failure"]
                    ),
                    "skipped_steps": len(
                        [s for s in steps if s["conclusion"] == "skipped"]
                    ),
                    "longest_step_duration": max(
                        [s.get("duration_seconds", 0) for s in steps], default=0
                    ),
                    "total_step_duration": sum(
                        [s.get("duration_seconds", 0) for s in steps]
                    ),
                }

            enhanced_jobs.append(enhanced_job)

        return enhanced_jobs

    def _enhance_job_data(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enhance job data with additional calculated fields.

        Args:
            job (Dict[str, Any]): Raw job data from GitHub API

        Returns:
            Dict[str, Any]: Enhanced job data
        """
        enhanced = job.copy()

        # Extract job metadata
        enhanced["job_name"] = job.get("name", "Unknown Job")
        enhanced["runner_name"] = job.get("runner_name", "Unknown Runner")
        enhanced["runner_group_name"] = job.get("runner_group_name", "Default")
        enhanced["labels"] = job.get("labels", [])

        # Process workflow reference
        if "workflow_name" in job:
            enhanced["workflow_info"] = {
                "name": job["workflow_name"],
                "head_branch": job.get("head_branch"),
                "head_sha": job.get("head_sha"),
            }

        # Calculate status insights
        enhanced["is_successful"] = job.get("conclusion") == "success"
        enhanced["is_running"] = job.get("status") == "in_progress"
        enhanced["is_failed"] = job.get("conclusion") in [
            "failure",
            "cancelled",
            "timed_out",
        ]

        # Timing information
        enhanced["queued_duration"] = None
        if job.get("created_at") and job.get("started_at"):
            created = datetime.fromisoformat(job["created_at"].replace("Z", "+00:00"))
            started = datetime.fromisoformat(job["started_at"].replace("Z", "+00:00"))
            enhanced["queued_duration"] = (started - created).total_seconds()

        return enhanced

    def _enhance_step_data(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enhance step data with additional calculated fields.

        Args:
            step (Dict[str, Any]): Raw step data from GitHub API

        Returns:
            Dict[str, Any]: Enhanced step data
        """
        enhanced = step.copy()

        # Calculate step duration
        if step.get("started_at") and step.get("completed_at"):
            started = datetime.fromisoformat(step["started_at"].replace("Z", "+00:00"))
            completed = datetime.fromisoformat(
                step["completed_at"].replace("Z", "+00:00")
            )
            enhanced["duration_seconds"] = (completed - started).total_seconds()
        else:
            enhanced["duration_seconds"] = 0

        # Step status insights
        enhanced["is_successful"] = step.get("conclusion") == "success"
        enhanced["is_running"] = step.get("status") == "in_progress"
        enhanced["is_failed"] = step.get("conclusion") == "failure"
        enhanced["is_skipped"] = step.get("conclusion") == "skipped"

        # Action information
        if "uses" in step:
            enhanced["action_info"] = {
                "uses": step["uses"],
                "is_custom_action": not step["uses"].startswith("actions/"),
                "action_owner": (
                    step["uses"].split("/")[0] if "/" in step["uses"] else None
                ),
            }

        return enhanced

    async def get_workflow_run_artifacts(
        self, access_token: str, owner: str, repo: str, run_id: int
    ) -> List[Dict[str, Any]]:
        """
        Get artifacts for a specific workflow run.

        Args:
            access_token (str): GitHub OAuth access token
            owner (str): Repository owner
            repo (str): Repository name
            run_id (int): Workflow run ID

        Returns:
            List[Dict[str, Any]]: List of artifact data
        """
        endpoint = f"repos/{owner}/{repo}/actions/runs/{run_id}/artifacts"
        response = await self._make_authenticated_request(access_token, endpoint)
        return response.get("artifacts", [])

    async def get_repository_workflows(
        self, access_token: str, owner: str, repo: str
    ) -> List[Dict[str, Any]]:
        """
        Get all workflows for a repository.

        Args:
            access_token (str): GitHub OAuth access token
            owner (str): Repository owner
            repo (str): Repository name

        Returns:
            List[Dict[str, Any]]: List of workflow data
        """
        endpoint = f"repos/{owner}/{repo}/actions/workflows"
        response = await self._make_authenticated_request(access_token, endpoint)
        workflows = response.get("workflows", [])

        # Enhance workflow data
        enhanced_workflows = []
        for workflow in workflows:
            enhanced = workflow.copy()
            enhanced["file_name"] = workflow.get("path", "").split("/")[-1]
            enhanced["is_active"] = workflow.get("state") == "active"
            enhanced_workflows.append(enhanced)

        return enhanced_workflows

    async def sync_pipeline_data_enhanced(
        self,
        db: AsyncSession,
        project_id: int,
        access_token: str,
        repository_url: str,
        days_back: int = 30,
        use_data_processor: bool = True,
    ) -> Dict[str, Any]:
        """
        Enhanced sync pipeline data from GitHub Actions to database using data processor.

        Args:
            db (AsyncSession): Database session
            project_id (int): Project ID
            access_token (str): GitHub OAuth access token
            repository_url (str): GitHub repository URL
            days_back (int): Days of history to fetch
            use_data_processor (bool): Whether to use enhanced data processing

        Returns:
            Dict[str, Any]: Enhanced sync summary with analytics
        """
        try:
            # Import here to avoid circular imports
            from app.services.github.github_data_processor import github_data_processor

            # Extract owner/repo from URL
            url_parts = repository_url.replace("https://github.com/", "").replace(
                ".git", ""
            )
            if "/" not in url_parts:
                raise ValueError("Invalid GitHub repository URL format")

            owner, repo = url_parts.split("/", 1)

            # Get or create pipeline record
            pipeline = await db.execute(
                select(Pipeline).filter(
                    Pipeline.project_id == project_id,
                    Pipeline.repository_url == repository_url,
                )
            )
            pipeline = pipeline.scalars().first()

            if not pipeline:
                # Fetch repository details for enhanced pipeline creation
                from app.services.github.github_repository_service import (
                    github_repository_service,
                )

                repo_details = await github_repository_service.get_repository_details(
                    access_token=access_token, owner=owner, repo=repo
                )

                # Process repository data
                if use_data_processor:
                    pipeline_data = (
                        github_data_processor.process_repository_for_pipeline(
                            repository_data={
                                "full_name": f"{owner}/{repo}",
                                "html_url": repository_url,
                                "default_branch": repo_details.default_branch,
                                "id": repo_details.id,
                                "language": repo_details.language,
                                "visibility": repo_details.visibility,
                                "size": repo_details.size,
                                "stargazers_count": repo_details.stargazers_count,
                                "forks_count": repo_details.forks_count,
                                "has_actions": repo_details.has_actions,
                                "created_at": repo_details.created_at,
                                "updated_at": repo_details.updated_at,
                                "pushed_at": repo_details.pushed_at,
                                "clone_url": repo_details.clone_url,
                                "ssh_url": repo_details.ssh_url,
                            },
                            project_id=project_id,
                        )
                    )

                    # Create enhanced pipeline
                    pipeline = Pipeline(
                        project_id=pipeline_data.project_id,
                        name=pipeline_data.name,
                        repository_url=pipeline_data.repository_url,
                        branch=pipeline_data.branch,
                        provider=pipeline_data.provider,
                        external_id=pipeline_data.external_id,
                        metadata=pipeline_data.metadata,
                    )
                else:
                    # Create basic pipeline
                    pipeline = Pipeline(
                        project_id=project_id,
                        name=f"{owner}/{repo}",
                        repository_url=repository_url,
                        branch=repo_details.default_branch,
                        provider="github_actions",
                        external_id=f"github:{owner}/{repo}",
                    )

                db.add(pipeline)
                await db.commit()
                await db.refresh(pipeline)

            # Fetch recent workflow runs
            workflow_runs, _ = await self.fetch_workflow_runs(
                access_token=access_token, owner=owner, repo=repo, per_page=100
            )

            # Process workflow runs using data processor
            processing_result = github_data_processor.process_workflow_runs(
                workflow_runs=workflow_runs,
                repository_full_name=f"{owner}/{repo}",
                filter_days=days_back,
            )

            # Sync pipeline runs to database
            synced_count = 0
            for processed_run in processing_result.pipeline_runs:
                existing_run = await db.execute(
                    select(PipelineRun).filter(
                        PipelineRun.pipeline_id == pipeline.id,
                        PipelineRun.external_id == processed_run.external_id,
                    )
                )
                existing_run = existing_run.scalars().first()

                if not existing_run:
                    pipeline_run = PipelineRun(
                        pipeline_id=pipeline.id,
                        external_id=processed_run.external_id,
                        name=processed_run.name,
                        status=processed_run.status,
                        branch=processed_run.branch,
                        commit_sha=processed_run.commit_sha,
                        started_at=processed_run.started_at,
                        completed_at=processed_run.completed_at,
                        duration_seconds=processed_run.duration_seconds,
                        external_url=processed_run.external_url,
                        metadata=processed_run.metadata,
                    )
                    db.add(pipeline_run)
                    synced_count += 1

            # Commit all changes
            await db.commit()

            # Update pipeline statistics
            pipeline.recalculate_success_rate()
            await db.commit()

            logger.info(
                f"Enhanced sync completed: {synced_count} pipeline runs for {owner}/{repo}"
            )

            # Prepare enhanced response
            return {
                "pipeline_id": pipeline.id,
                "repository": f"{owner}/{repo}",
                "runs_synced": synced_count,
                "total_runs_found": len(workflow_runs),
                "sync_timestamp": datetime.now(timezone.utc).isoformat(),
                "enhanced_processing": True,
                "processing_status": processing_result.status.value,
                "processed_count": processing_result.processed_count,
                "skipped_count": processing_result.skipped_count,
                "error_count": processing_result.error_count,
                "processing_errors": processing_result.errors,
                "processing_metadata": processing_result.processing_metadata,
            }

        except Exception as e:
            await db.rollback()
            logger.error(f"Error in enhanced sync pipeline data: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to sync pipeline data: {str(e)}",
            )


# Create singleton instance
github_actions_service = GitHubActionsService()
