"""
GitLab CI/CD service for managing pipelines and jobs.
Handles pipeline information, job status, and CI/CD analytics.
"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)


class GitLabPipelineStatus(Enum):
    """GitLab pipeline status options."""
    
    CREATED = "created"
    WAITING_FOR_RESOURCE = "waiting_for_resource"
    PREPARING = "preparing"
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELED = "canceled"
    SKIPPED = "skipped"
    MANUAL = "manual"
    SCHEDULED = "scheduled"


class GitLabJobStatus(Enum):
    """GitLab job status options."""
    
    CREATED = "created"
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELED = "canceled"
    SKIPPED = "skipped"
    MANUAL = "manual"


@dataclass
class GitLabPipeline:
    """GitLab pipeline data structure."""
    
    id: int
    project_id: int
    status: str
    ref: str
    sha: str
    web_url: str
    created_at: str
    updated_at: str
    started_at: Optional[str]
    finished_at: Optional[str]
    committed_at: Optional[str]
    duration: Optional[int]
    queued_duration: Optional[int]
    coverage: Optional[str]
    tag: bool
    yaml_errors: Optional[str]
    user: Dict[str, Any]
    source: str


@dataclass
class GitLabJob:
    """GitLab job data structure."""
    
    id: int
    name: str
    stage: str
    status: str
    created_at: str
    started_at: Optional[str]
    finished_at: Optional[str]
    duration: Optional[float]
    queued_duration: Optional[float]
    web_url: str
    allow_failure: bool
    failure_reason: Optional[str]
    runner: Optional[Dict[str, Any]]
    pipeline: Dict[str, Any]


@dataclass
class GitLabPipelineVariable:
    """GitLab pipeline variable data structure."""
    
    key: str
    value: str
    variable_type: str
    protected: bool
    masked: bool
    raw: bool


class GitLabCIService:
    """
    Service for GitLab CI/CD pipeline and job management.
    Handles pipeline information, job status, and CI/CD analytics.
    """

    def __init__(self):
        """Initialize GitLab CI service."""
        self.api_url = "https://gitlab.com/api/v4"

    async def _make_authenticated_request(
        self, access_token: str, endpoint: str, params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Make authenticated request to GitLab API.

        Args:
            access_token (str): GitLab OAuth access token
            endpoint (str): API endpoint path
            params (Optional[Dict[str, Any]]): Query parameters

        Returns:
            Dict[str, Any]: API response data

        Raises:
            HTTPException: If API request fails
        """
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "User-Agent": f"{settings.PROJECT_NAME}/{settings.VERSION}",
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.api_url}/{endpoint}",
                    headers=headers,
                    params=params or {},
                    timeout=30.0,
                )

                if response.status_code == 401:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid GitLab access token",
                    )
                elif response.status_code == 403:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Insufficient GitLab permissions",
                    )
                elif response.status_code == 404:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="GitLab resource not found",
                    )

                response.raise_for_status()
                return response.json()

            except httpx.HTTPError as e:
                logger.error(f"GitLab CI API request failed: {e}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="GitLab CI API request failed",
                )

    async def _make_paginated_request(
        self,
        access_token: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        max_pages: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Make paginated request to GitLab API.

        Args:
            access_token (str): GitLab OAuth access token
            endpoint (str): API endpoint path
            params (Optional[Dict[str, Any]]): Query parameters
            max_pages (int): Maximum pages to fetch

        Returns:
            List[Dict[str, Any]]: Combined results from all pages
        """
        all_results = []
        current_params = params.copy() if params else {}
        current_params.setdefault("per_page", 50)
        page = 1

        while page <= max_pages:
            current_params["page"] = page

            headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
                "User-Agent": f"{settings.PROJECT_NAME}/{settings.VERSION}",
            }

            async with httpx.AsyncClient() as client:
                try:
                    response = await client.get(
                        f"{self.api_url}/{endpoint}",
                        headers=headers,
                        params=current_params,
                        timeout=30.0,
                    )

                    if response.status_code == 401:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid GitLab access token",
                        )

                    response.raise_for_status()
                    page_results = response.json()

                    if not page_results:
                        break

                    all_results.extend(page_results)

                    # Check if there are more pages
                    next_page = response.headers.get("X-Next-Page")
                    if not next_page:
                        break

                    page = int(next_page)

                except httpx.HTTPError as e:
                    logger.error(f"GitLab CI API paginated request failed: {e}")
                    break

        return all_results

    async def get_project_pipelines(
        self, 
        access_token: str, 
        project_id: int,
        status: Optional[str] = None,
        ref: Optional[str] = None,
        limit: int = 50
    ) -> List[GitLabPipeline]:
        """
        Get pipelines for a GitLab project.

        Args:
            access_token (str): GitLab OAuth access token
            project_id (int): GitLab project ID
            status (Optional[str]): Filter by pipeline status
            ref (Optional[str]): Filter by Git reference
            limit (int): Maximum number of pipelines to return

        Returns:
            List[GitLabPipeline]: List of project pipelines

        Raises:
            HTTPException: If API request fails
        """
        try:
            params = {
                "order_by": "updated_at",
                "sort": "desc",
                "per_page": min(limit, 100),
            }

            if status:
                params["status"] = status
            if ref:
                params["ref"] = ref

            pipeline_data = await self._make_paginated_request(
                access_token, f"projects/{project_id}/pipelines", params
            )

            pipelines = []
            for pipeline in pipeline_data:
                try:
                    gitlab_pipeline = GitLabPipeline(
                        id=pipeline["id"],
                        project_id=pipeline["project_id"],
                        status=pipeline["status"],
                        ref=pipeline["ref"],
                        sha=pipeline["sha"],
                        web_url=pipeline["web_url"],
                        created_at=pipeline["created_at"],
                        updated_at=pipeline["updated_at"],
                        started_at=pipeline.get("started_at"),
                        finished_at=pipeline.get("finished_at"),
                        committed_at=pipeline.get("committed_at"),
                        duration=pipeline.get("duration"),
                        queued_duration=pipeline.get("queued_duration"),
                        coverage=pipeline.get("coverage"),
                        tag=pipeline.get("tag", False),
                        yaml_errors=pipeline.get("yaml_errors"),
                        user=pipeline.get("user", {}),
                        source=pipeline.get("source", "unknown"),
                    )
                    pipelines.append(gitlab_pipeline)

                except KeyError as e:
                    logger.warning(f"Skipping GitLab pipeline due to missing field {e}")
                    continue

            logger.info(f"Retrieved {len(pipelines)} pipelines for project {project_id}")
            return pipelines

        except Exception as e:
            logger.error(f"Failed to get GitLab project pipelines: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get GitLab project pipelines",
            )

    async def get_pipeline_details(
        self, access_token: str, project_id: int, pipeline_id: int
    ) -> Optional[GitLabPipeline]:
        """
        Get detailed information about a specific pipeline.

        Args:
            access_token (str): GitLab OAuth access token
            project_id (int): GitLab project ID
            pipeline_id (int): GitLab pipeline ID

        Returns:
            Optional[GitLabPipeline]: Pipeline details or None if not found

        Raises:
            HTTPException: If API request fails
        """
        try:
            pipeline_data = await self._make_authenticated_request(
                access_token, f"projects/{project_id}/pipelines/{pipeline_id}"
            )

            return GitLabPipeline(
                id=pipeline_data["id"],
                project_id=pipeline_data["project_id"],
                status=pipeline_data["status"],
                ref=pipeline_data["ref"],
                sha=pipeline_data["sha"],
                web_url=pipeline_data["web_url"],
                created_at=pipeline_data["created_at"],
                updated_at=pipeline_data["updated_at"],
                started_at=pipeline_data.get("started_at"),
                finished_at=pipeline_data.get("finished_at"),
                committed_at=pipeline_data.get("committed_at"),
                duration=pipeline_data.get("duration"),
                queued_duration=pipeline_data.get("queued_duration"),
                coverage=pipeline_data.get("coverage"),
                tag=pipeline_data.get("tag", False),
                yaml_errors=pipeline_data.get("yaml_errors"),
                user=pipeline_data.get("user", {}),
                source=pipeline_data.get("source", "unknown"),
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get GitLab pipeline details: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get GitLab pipeline details",
            )

    async def get_pipeline_jobs(
        self, access_token: str, project_id: int, pipeline_id: int
    ) -> List[GitLabJob]:
        """
        Get jobs for a specific pipeline.

        Args:
            access_token (str): GitLab OAuth access token
            project_id (int): GitLab project ID
            pipeline_id (int): GitLab pipeline ID

        Returns:
            List[GitLabJob]: List of pipeline jobs

        Raises:
            HTTPException: If API request fails
        """
        try:
            job_data = await self._make_paginated_request(
                access_token, f"projects/{project_id}/pipelines/{pipeline_id}/jobs"
            )

            jobs = []
            for job in job_data:
                try:
                    gitlab_job = GitLabJob(
                        id=job["id"],
                        name=job["name"],
                        stage=job["stage"],
                        status=job["status"],
                        created_at=job["created_at"],
                        started_at=job.get("started_at"),
                        finished_at=job.get("finished_at"),
                        duration=job.get("duration"),
                        queued_duration=job.get("queued_duration"),
                        web_url=job["web_url"],
                        allow_failure=job.get("allow_failure", False),
                        failure_reason=job.get("failure_reason"),
                        runner=job.get("runner"),
                        pipeline=job.get("pipeline", {}),
                    )
                    jobs.append(gitlab_job)

                except KeyError as e:
                    logger.warning(f"Skipping GitLab job due to missing field {e}")
                    continue

            return jobs

        except Exception as e:
            logger.error(f"Failed to get GitLab pipeline jobs: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get GitLab pipeline jobs",
            )

    async def retry_pipeline(
        self, access_token: str, project_id: int, pipeline_id: int
    ) -> bool:
        """
        Retry a failed pipeline.

        Args:
            access_token (str): GitLab OAuth access token
            project_id (int): GitLab project ID
            pipeline_id (int): GitLab pipeline ID

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
                "User-Agent": f"{settings.PROJECT_NAME}/{settings.VERSION}",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/projects/{project_id}/pipelines/{pipeline_id}/retry",
                    headers=headers,
                    timeout=30.0,
                )

                return response.status_code == 201

        except Exception as e:
            logger.error(f"Failed to retry GitLab pipeline: {e}")
            return False

    async def cancel_pipeline(
        self, access_token: str, project_id: int, pipeline_id: int
    ) -> bool:
        """
        Cancel a running pipeline.

        Args:
            access_token (str): GitLab OAuth access token
            project_id (int): GitLab project ID
            pipeline_id (int): GitLab pipeline ID

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
                "User-Agent": f"{settings.PROJECT_NAME}/{settings.VERSION}",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/projects/{project_id}/pipelines/{pipeline_id}/cancel",
                    headers=headers,
                    timeout=30.0,
                )

                return response.status_code == 200

        except Exception as e:
            logger.error(f"Failed to cancel GitLab pipeline: {e}")
            return False

    async def get_project_variables(
        self, access_token: str, project_id: int
    ) -> List[GitLabPipelineVariable]:
        """
        Get CI/CD variables for a project.

        Args:
            access_token (str): GitLab OAuth access token
            project_id (int): GitLab project ID

        Returns:
            List[GitLabPipelineVariable]: List of project variables

        Raises:
            HTTPException: If API request fails
        """
        try:
            variable_data = await self._make_paginated_request(
                access_token, f"projects/{project_id}/variables"
            )

            variables = []
            for var in variable_data:
                try:
                    gitlab_variable = GitLabPipelineVariable(
                        key=var["key"],
                        value=var["value"],
                        variable_type=var.get("variable_type", "env_var"),
                        protected=var.get("protected", False),
                        masked=var.get("masked", False),
                        raw=var.get("raw", False),
                    )
                    variables.append(gitlab_variable)

                except KeyError as e:
                    logger.warning(f"Skipping GitLab variable due to missing field {e}")
                    continue

            return variables

        except Exception as e:
            logger.error(f"Failed to get GitLab project variables: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get GitLab project variables",
            )

    async def get_pipeline_statistics(
        self, access_token: str, project_id: int, days: int = 30
    ) -> Dict[str, Any]:
        """
        Get pipeline statistics for a project.

        Args:
            access_token (str): GitLab OAuth access token
            project_id (int): GitLab project ID
            days (int): Number of days to analyze

        Returns:
            Dict[str, Any]: Pipeline statistics

        Raises:
            HTTPException: If API request fails
        """
        try:
            # Get recent pipelines
            params = {
                "order_by": "created_at",
                "sort": "desc",
                "per_page": 100,
            }

            pipelines_data = await self._make_paginated_request(
                access_token, f"projects/{project_id}/pipelines", params, max_pages=3
            )

            # Calculate statistics
            total_pipelines = len(pipelines_data)
            success_count = sum(1 for p in pipelines_data if p["status"] == "success")
            failed_count = sum(1 for p in pipelines_data if p["status"] == "failed")
            canceled_count = sum(1 for p in pipelines_data if p["status"] == "canceled")
            running_count = sum(1 for p in pipelines_data if p["status"] == "running")

            # Calculate success rate
            completed_pipelines = success_count + failed_count + canceled_count
            success_rate = (success_count / completed_pipelines * 100) if completed_pipelines > 0 else 0

            # Calculate average duration
            durations = [p["duration"] for p in pipelines_data if p.get("duration")]
            avg_duration = sum(durations) / len(durations) if durations else 0

            return {
                "total_pipelines": total_pipelines,
                "success_count": success_count,
                "failed_count": failed_count,
                "canceled_count": canceled_count,
                "running_count": running_count,
                "success_rate": round(success_rate, 2),
                "average_duration_seconds": round(avg_duration, 2),
                "days_analyzed": days,
            }

        except Exception as e:
            logger.error(f"Failed to get GitLab pipeline statistics: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get GitLab pipeline statistics",
            )


# Global service instance
gitlab_ci_service = GitLabCIService()