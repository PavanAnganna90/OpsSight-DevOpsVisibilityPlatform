"""
GitHub data processing service for transforming and normalizing API data.
Handles data transformation, validation, and preparation for database storage.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Tuple, Union
from dataclasses import dataclass
from enum import Enum

from app.models.pipeline import PipelineStatus
from app.models.project import Project
from app.services.github.github_actions_service import (
    GitHubWorkflowRun,
    GitHubActionStatus,
    GitHubActionConclusion,
)

logger = logging.getLogger(__name__)


class ProcessingStatus(Enum):
    """Data processing status."""

    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class ProcessedPipelineData:
    """Processed pipeline data ready for database storage."""

    name: str
    repository_url: str
    branch: str
    provider: str
    external_id: str
    project_id: int
    metadata: Dict[str, Any]


@dataclass
class ProcessedPipelineRun:
    """Processed pipeline run data ready for database storage."""

    external_id: str
    name: str
    status: PipelineStatus
    branch: str
    commit_sha: str
    started_at: datetime
    completed_at: Optional[datetime]
    duration_seconds: Optional[int]
    external_url: str
    metadata: Dict[str, Any]


@dataclass
class ProcessingResult:
    """Result of data processing operation."""

    status: ProcessingStatus
    processed_count: int
    skipped_count: int
    error_count: int
    errors: List[str]
    pipeline_data: Optional[ProcessedPipelineData]
    pipeline_runs: List[ProcessedPipelineRun]
    processing_metadata: Dict[str, Any]


class GitHubDataProcessor:
    """
    Service for processing and transforming GitHub Actions data.
    Handles normalization, validation, and preparation for storage.
    """

    def __init__(self):
        """Initialize GitHub data processor."""
        self.supported_providers = ["github_actions"]

    def process_repository_for_pipeline(
        self, repository_data: Dict[str, Any], project_id: int
    ) -> ProcessedPipelineData:
        """
        Process repository data into pipeline data structure.

        Args:
            repository_data (Dict[str, Any]): GitHub repository data
            project_id (int): Target project ID

        Returns:
            ProcessedPipelineData: Processed pipeline data
        """
        # Extract repository information
        full_name = repository_data.get("full_name", "unknown/unknown")
        html_url = repository_data.get("html_url", "")
        default_branch = repository_data.get("default_branch", "main")

        # Create pipeline metadata
        metadata = {
            "github_repo_id": repository_data.get("id"),
            "language": repository_data.get("language"),
            "visibility": repository_data.get("visibility", "public"),
            "size": repository_data.get("size", 0),
            "stars": repository_data.get("stargazers_count", 0),
            "forks": repository_data.get("forks_count", 0),
            "has_actions": repository_data.get("has_actions", False),
            "created_at": repository_data.get("created_at"),
            "updated_at": repository_data.get("updated_at"),
            "pushed_at": repository_data.get("pushed_at"),
            "clone_url": repository_data.get("clone_url", ""),
            "ssh_url": repository_data.get("ssh_url", ""),
        }

        return ProcessedPipelineData(
            name=full_name,
            repository_url=html_url,
            branch=default_branch,
            provider="github_actions",
            external_id=f"github:{full_name}",
            project_id=project_id,
            metadata=metadata,
        )

    def process_workflow_runs(
        self,
        workflow_runs: List[GitHubWorkflowRun],
        repository_full_name: str,
        filter_days: Optional[int] = None,
    ) -> ProcessingResult:
        """
        Process GitHub workflow runs into pipeline run data structures.

        Args:
            workflow_runs (List[GitHubWorkflowRun]): Raw workflow run data
            repository_full_name (str): Repository identifier
            filter_days (Optional[int]): Filter runs within N days

        Returns:
            ProcessingResult: Processing results with transformed data
        """
        processed_runs = []
        errors = []
        skipped_count = 0

        # Filter by date if specified
        cutoff_date = None
        if filter_days:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=filter_days)

        for run in workflow_runs:
            try:
                # Apply date filter
                if cutoff_date and run.created_at < cutoff_date:
                    skipped_count += 1
                    continue

                # Map GitHub status to internal status
                internal_status = self._map_github_status_to_pipeline_status(
                    run.status, run.conclusion
                )

                # Calculate completion time
                completed_at = None
                if run.status == "completed":
                    completed_at = run.updated_at

                # Prepare metadata
                metadata = {
                    "github_run_id": run.id,
                    "github_workflow_id": run.workflow_id,
                    "github_run_number": run.run_number,
                    "github_status": run.status,
                    "github_conclusion": run.conclusion,
                    "github_head_sha": run.head_sha,
                    "github_head_branch": run.head_branch,
                    "repository_full_name": run.repository_full_name,
                    "html_url": run.html_url,
                    "created_at": run.created_at.isoformat(),
                    "updated_at": run.updated_at.isoformat(),
                }

                processed_run = ProcessedPipelineRun(
                    external_id=str(run.id),
                    name=run.name,
                    status=internal_status,
                    branch=run.head_branch,
                    commit_sha=run.head_sha,
                    started_at=run.created_at,
                    completed_at=completed_at,
                    duration_seconds=run.duration_seconds,
                    external_url=run.html_url,
                    metadata=metadata,
                )

                processed_runs.append(processed_run)

            except Exception as e:
                error_msg = f"Failed to process workflow run {run.id}: {str(e)}"
                errors.append(error_msg)
                logger.warning(error_msg)
                continue

        # Determine overall processing status
        total_runs = len(workflow_runs)
        processed_count = len(processed_runs)
        error_count = len(errors)

        if error_count == 0 and processed_count > 0:
            status = ProcessingStatus.SUCCESS
        elif processed_count > 0:
            status = ProcessingStatus.PARTIAL
        elif error_count > 0:
            status = ProcessingStatus.FAILED
        else:
            status = ProcessingStatus.SKIPPED

        # Create processing metadata
        processing_metadata = {
            "repository": repository_full_name,
            "total_workflow_runs": total_runs,
            "filter_days": filter_days,
            "cutoff_date": cutoff_date.isoformat() if cutoff_date else None,
            "processing_timestamp": datetime.now(timezone.utc).isoformat(),
        }

        return ProcessingResult(
            status=status,
            processed_count=processed_count,
            skipped_count=skipped_count,
            error_count=error_count,
            errors=errors,
            pipeline_data=None,
            pipeline_runs=processed_runs,
            processing_metadata=processing_metadata,
        )

    def process_job_data(
        self, job_data: List[Dict[str, Any]], run_id: int
    ) -> Dict[str, Any]:
        """
        Process GitHub Actions job data for analytics.

        Args:
            job_data (List[Dict[str, Any]]): Raw job data
            run_id (int): Workflow run ID

        Returns:
            Dict[str, Any]: Processed job analytics
        """
        if not job_data:
            return {
                "run_id": run_id,
                "total_jobs": 0,
                "job_summary": {},
                "step_summary": {},
                "performance_metrics": {},
            }

        # Process job statistics
        job_stats = {
            "total_jobs": len(job_data),
            "successful_jobs": 0,
            "failed_jobs": 0,
            "cancelled_jobs": 0,
            "in_progress_jobs": 0,
            "total_job_duration": 0,
            "average_job_duration": 0,
            "longest_job_duration": 0,
            "shortest_job_duration": float("inf"),
        }

        step_stats = {
            "total_steps": 0,
            "successful_steps": 0,
            "failed_steps": 0,
            "skipped_steps": 0,
            "total_step_duration": 0,
            "average_step_duration": 0,
        }

        job_details = []
        all_durations = []

        for job in job_data:
            # Process individual job
            job_duration = job.get("duration_seconds", 0)
            conclusion = job.get("conclusion", "unknown")

            # Update job statistics
            if conclusion == "success":
                job_stats["successful_jobs"] += 1
            elif conclusion == "failure":
                job_stats["failed_jobs"] += 1
            elif conclusion == "cancelled":
                job_stats["cancelled_jobs"] += 1
            elif job.get("status") == "in_progress":
                job_stats["in_progress_jobs"] += 1

            if job_duration > 0:
                job_stats["total_job_duration"] += job_duration
                all_durations.append(job_duration)
                job_stats["longest_job_duration"] = max(
                    job_stats["longest_job_duration"], job_duration
                )
                job_stats["shortest_job_duration"] = min(
                    job_stats["shortest_job_duration"], job_duration
                )

            # Process job steps if available
            if "steps" in job and job["steps"]:
                for step in job["steps"]:
                    step_stats["total_steps"] += 1
                    step_conclusion = step.get("conclusion", "unknown")
                    step_duration = step.get("duration_seconds", 0)

                    if step_conclusion == "success":
                        step_stats["successful_steps"] += 1
                    elif step_conclusion == "failure":
                        step_stats["failed_steps"] += 1
                    elif step_conclusion == "skipped":
                        step_stats["skipped_steps"] += 1

                    if step_duration > 0:
                        step_stats["total_step_duration"] += step_duration

            # Extract job summary
            job_details.append(
                {
                    "id": job.get("id"),
                    "name": job.get("job_name", job.get("name", "Unknown")),
                    "status": job.get("status"),
                    "conclusion": conclusion,
                    "duration_seconds": job_duration,
                    "runner_name": job.get("runner_name"),
                    "labels": job.get("labels", []),
                    "step_count": len(job.get("steps", [])),
                }
            )

        # Calculate averages
        if job_stats["total_jobs"] > 0:
            job_stats["average_job_duration"] = (
                job_stats["total_job_duration"] / job_stats["total_jobs"]
            )

        if step_stats["total_steps"] > 0:
            step_stats["average_step_duration"] = (
                step_stats["total_step_duration"] / step_stats["total_steps"]
            )

        # Handle edge case for shortest duration
        if job_stats["shortest_job_duration"] == float("inf"):
            job_stats["shortest_job_duration"] = 0

        # Performance insights
        performance_metrics = {
            "parallelization_score": self._calculate_parallelization_score(job_data),
            "efficiency_score": self._calculate_efficiency_score(job_stats, step_stats),
            "reliability_score": self._calculate_reliability_score(job_stats),
            "duration_distribution": self._analyze_duration_distribution(all_durations),
        }

        return {
            "run_id": run_id,
            "total_jobs": job_stats["total_jobs"],
            "job_summary": job_stats,
            "step_summary": step_stats,
            "job_details": job_details,
            "performance_metrics": performance_metrics,
            "processing_timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def _map_github_status_to_pipeline_status(
        self, github_status: str, conclusion: Optional[str]
    ) -> PipelineStatus:
        """Map GitHub Actions status to internal pipeline status."""
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

    def _calculate_parallelization_score(self, job_data: List[Dict[str, Any]]) -> float:
        """Calculate how well the workflow utilizes parallel execution."""
        if len(job_data) <= 1:
            return 0.0

        # Simple heuristic: more concurrent jobs = better parallelization
        concurrent_jobs = len([j for j in job_data if j.get("status") != "skipped"])
        max_possible_parallel = min(len(job_data), 10)  # Reasonable upper limit

        return min(concurrent_jobs / max_possible_parallel, 1.0) * 100

    def _calculate_efficiency_score(
        self, job_stats: Dict[str, Any], step_stats: Dict[str, Any]
    ) -> float:
        """Calculate workflow efficiency based on success rates and timing."""
        if job_stats["total_jobs"] == 0:
            return 0.0

        # Success rate component (70% weight)
        success_rate = job_stats["successful_jobs"] / job_stats["total_jobs"]

        # Speed component (30% weight) - inverse of average duration relative to benchmark
        benchmark_duration = 300  # 5 minutes as reasonable benchmark
        avg_duration = job_stats.get("average_job_duration", benchmark_duration)
        speed_score = min(benchmark_duration / max(avg_duration, 1), 1.0)

        efficiency = (success_rate * 0.7) + (speed_score * 0.3)
        return efficiency * 100

    def _calculate_reliability_score(self, job_stats: Dict[str, Any]) -> float:
        """Calculate workflow reliability based on failure patterns."""
        if job_stats["total_jobs"] == 0:
            return 0.0

        # Higher score for fewer failures and cancellations
        failure_rate = job_stats["failed_jobs"] / job_stats["total_jobs"]
        cancellation_rate = job_stats["cancelled_jobs"] / job_stats["total_jobs"]

        reliability = 1.0 - (failure_rate * 0.8) - (cancellation_rate * 0.2)
        return max(reliability, 0.0) * 100

    def _analyze_duration_distribution(self, durations: List[float]) -> Dict[str, Any]:
        """Analyze the distribution of job durations."""
        if not durations:
            return {"quartiles": [], "outliers": [], "consistency_score": 0.0}

        sorted_durations = sorted(durations)
        n = len(sorted_durations)

        # Calculate quartiles
        q1_idx = n // 4
        q2_idx = n // 2
        q3_idx = 3 * n // 4

        quartiles = {
            "q1": sorted_durations[q1_idx] if q1_idx < n else 0,
            "median": sorted_durations[q2_idx] if q2_idx < n else 0,
            "q3": sorted_durations[q3_idx] if q3_idx < n else 0,
        }

        # Identify outliers (simple IQR method)
        iqr = quartiles["q3"] - quartiles["q1"]
        lower_bound = quartiles["q1"] - 1.5 * iqr
        upper_bound = quartiles["q3"] + 1.5 * iqr

        outliers = [d for d in durations if d < lower_bound or d > upper_bound]

        # Consistency score (lower variance = higher consistency)
        if len(durations) > 1:
            mean_duration = sum(durations) / len(durations)
            variance = sum((d - mean_duration) ** 2 for d in durations) / len(durations)
            # Normalize to 0-100 scale (inverse of coefficient of variation)
            cv = (variance**0.5) / mean_duration if mean_duration > 0 else 1
            consistency_score = max(0, 100 * (1 - min(cv, 1)))
        else:
            consistency_score = 100.0

        return {
            "quartiles": quartiles,
            "outliers": outliers,
            "outlier_count": len(outliers),
            "consistency_score": consistency_score,
        }


# Create singleton instance
github_data_processor = GitHubDataProcessor()
