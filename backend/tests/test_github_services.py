"""
Comprehensive unit tests for GitHub integration services.
Tests GitHub Actions, repository, and data processing services.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

from app.services.github.github_actions_service import (
    github_actions_service,
    GitHubActionsService,
    GitHubWorkflowRun,
)
from app.services.github.github_repository_service import (
    github_repository_service,
    GitHubRepositoryService,
    GitHubRepository,
)
from app.services.github.github_data_processor import (
    github_data_processor,
    GitHubDataProcessor,
    ProcessedPipelineData,
    ProcessedPipelineRun,
    ProcessingStatus,
)
from app.models.pipeline import PipelineStatus


class TestGitHubActionsService:
    """Test GitHub Actions service functionality."""

    def test_initialization(self):
        """Test service initialization."""
        service = GitHubActionsService()
        assert service.api_url == "https://api.github.com"

    @pytest.mark.asyncio
    async def test_fetch_workflow_runs_success(self):
        """Test successful workflow runs fetching."""
        service = GitHubActionsService()

        # Mock API response
        mock_response = {
            "total_count": 1,
            "workflow_runs": [
                {
                    "id": 12345,
                    "name": "CI",
                    "head_branch": "main",
                    "status": "completed",
                    "conclusion": "success",
                    "created_at": "2023-01-01T12:00:00Z",
                    "updated_at": "2023-01-01T12:05:00Z",
                    "repository": {"full_name": "test/repo"},
                    "workflow_id": 123,
                    "run_number": 1,
                    "html_url": "https://github.com/test/repo/actions/runs/12345",
                    "head_sha": "abc123",
                }
            ],
        }

        with patch.object(
            service, "_make_authenticated_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = mock_response

            workflow_runs, pagination = await service.fetch_workflow_runs(
                access_token="test_token", owner="test", repo="repo"
            )

            assert len(workflow_runs) == 1
            assert workflow_runs[0].id == 12345
            assert workflow_runs[0].name == "CI"
            assert workflow_runs[0].status == "completed"
            assert workflow_runs[0].conclusion == "success"
            assert pagination["total_count"] == 1

    @pytest.mark.asyncio
    async def test_get_workflow_run_jobs_with_steps(self):
        """Test fetching workflow run jobs with step details."""
        service = GitHubActionsService()

        # Mock job response with steps
        mock_response = {
            "jobs": [
                {
                    "id": 67890,
                    "name": "build",
                    "status": "completed",
                    "conclusion": "success",
                    "started_at": "2023-01-01T12:01:00Z",
                    "completed_at": "2023-01-01T12:04:00Z",
                    "created_at": "2023-01-01T12:00:00Z",
                    "runner_name": "GitHub Actions 2",
                    "labels": ["ubuntu-latest"],
                    "steps": [
                        {
                            "name": "Checkout",
                            "status": "completed",
                            "conclusion": "success",
                            "started_at": "2023-01-01T12:01:30Z",
                            "completed_at": "2023-01-01T12:02:00Z",
                            "uses": "actions/checkout@v3",
                        },
                        {
                            "name": "Setup Node",
                            "status": "completed",
                            "conclusion": "success",
                            "started_at": "2023-01-01T12:02:00Z",
                            "completed_at": "2023-01-01T12:02:30Z",
                            "uses": "actions/setup-node@v3",
                        },
                    ],
                }
            ]
        }

        with patch.object(
            service, "_make_authenticated_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = mock_response

            jobs = await service.get_workflow_run_jobs(
                access_token="test_token",
                owner="test",
                repo="repo",
                run_id=12345,
                include_steps=True,
            )

            assert len(jobs) == 1
            job = jobs[0]
            assert job["id"] == 67890
            assert job["job_name"] == "build"
            assert job["is_successful"] is True
            assert job["duration_seconds"] == 180  # 3 minutes
            assert "step_statistics" in job
            assert job["step_statistics"]["total_steps"] == 2
            assert job["step_statistics"]["completed_steps"] == 2

            # Check step enhancement
            steps = job["steps"]
            assert len(steps) == 2
            assert steps[0]["is_successful"] is True
            assert steps[0]["duration_seconds"] == 30
            assert steps[0]["action_info"]["uses"] == "actions/checkout@v3"
            assert steps[0]["action_info"]["is_custom_action"] is False

    def test_map_github_status_to_pipeline_status(self):
        """Test GitHub status mapping to internal pipeline status."""
        service = GitHubActionsService()

        # Test various status mappings
        assert (
            service._map_github_status_to_pipeline_status("queued", None)
            == PipelineStatus.PENDING
        )
        assert (
            service._map_github_status_to_pipeline_status("in_progress", None)
            == PipelineStatus.RUNNING
        )
        assert (
            service._map_github_status_to_pipeline_status("completed", "success")
            == PipelineStatus.SUCCESS
        )
        assert (
            service._map_github_status_to_pipeline_status("completed", "failure")
            == PipelineStatus.FAILED
        )
        assert (
            service._map_github_status_to_pipeline_status("completed", "cancelled")
            == PipelineStatus.CANCELLED
        )
        assert (
            service._map_github_status_to_pipeline_status("unknown", None)
            == PipelineStatus.FAILED
        )


class TestGitHubRepositoryService:
    """Test GitHub repository service functionality."""

    def test_initialization(self):
        """Test service initialization."""
        service = GitHubRepositoryService()
        assert service.api_url == "https://api.github.com"

    @pytest.mark.asyncio
    async def test_list_user_repositories(self):
        """Test listing user repositories."""
        service = GitHubRepositoryService()

        # Mock API response
        mock_response = [
            {
                "id": 123456,
                "name": "test-repo",
                "full_name": "user/test-repo",
                "description": "A test repository",
                "html_url": "https://github.com/user/test-repo",
                "clone_url": "https://github.com/user/test-repo.git",
                "ssh_url": "git@github.com:user/test-repo.git",
                "default_branch": "main",
                "language": "Python",
                "visibility": "public",
                "size": 1024,
                "stargazers_count": 5,
                "watchers_count": 3,
                "forks_count": 2,
                "open_issues_count": 1,
                "has_actions": True,
                "permissions": {"admin": True, "push": True, "pull": True},
                "created_at": "2023-01-01T00:00:00Z",
                "updated_at": "2023-01-02T00:00:00Z",
                "pushed_at": "2023-01-02T12:00:00Z",
            }
        ]

        with patch.object(
            service, "_make_authenticated_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = mock_response

            repositories, pagination = await service.list_user_repositories(
                access_token="test_token",
                visibility="public",
                sort="updated",
                per_page=30,
                page=1,
            )

            assert len(repositories) == 1
            repo = repositories[0]
            assert repo.id == 123456
            assert repo.name == "test-repo"
            assert repo.full_name == "user/test-repo"
            assert repo.language == "Python"
            assert repo.has_actions is True
            assert pagination["current_page"] == 1

    @pytest.mark.asyncio
    async def test_check_repository_actions_enabled(self):
        """Test checking if GitHub Actions is enabled."""
        service = GitHubRepositoryService()

        with patch.object(
            service, "_make_authenticated_request", new_callable=AsyncMock
        ) as mock_request:
            # Test enabled case
            mock_request.return_value = {"workflows": []}
            result = await service.check_repository_actions_enabled(
                access_token="test_token", owner="test", repo="repo"
            )
            assert result is True

            # Test disabled case (404 response)
            from fastapi import HTTPException

            mock_request.side_effect = HTTPException(status_code=404)
            result = await service.check_repository_actions_enabled(
                access_token="test_token", owner="test", repo="repo"
            )
            assert result is False


class TestGitHubDataProcessor:
    """Test GitHub data processor functionality."""

    def test_initialization(self):
        """Test processor initialization."""
        processor = GitHubDataProcessor()
        assert "github_actions" in processor.supported_providers

    def test_process_repository_for_pipeline(self):
        """Test processing repository data for pipeline creation."""
        processor = GitHubDataProcessor()

        repository_data = {
            "id": 123456,
            "full_name": "user/test-repo",
            "html_url": "https://github.com/user/test-repo",
            "default_branch": "main",
            "language": "Python",
            "visibility": "public",
            "size": 1024,
            "stargazers_count": 5,
            "forks_count": 2,
            "has_actions": True,
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-02T00:00:00Z",
            "pushed_at": "2023-01-02T12:00:00Z",
            "clone_url": "https://github.com/user/test-repo.git",
            "ssh_url": "git@github.com:user/test-repo.git",
        }

        pipeline_data = processor.process_repository_for_pipeline(
            repository_data=repository_data, project_id=1
        )

        assert isinstance(pipeline_data, ProcessedPipelineData)
        assert pipeline_data.name == "user/test-repo"
        assert pipeline_data.repository_url == "https://github.com/user/test-repo"
        assert pipeline_data.branch == "main"
        assert pipeline_data.provider == "github_actions"
        assert pipeline_data.external_id == "github:user/test-repo"
        assert pipeline_data.project_id == 1
        assert pipeline_data.metadata["github_repo_id"] == 123456
        assert pipeline_data.metadata["language"] == "Python"
        assert pipeline_data.metadata["has_actions"] is True

    def test_process_workflow_runs(self):
        """Test processing workflow runs."""
        processor = GitHubDataProcessor()

        # Create mock workflow run
        workflow_run = GitHubWorkflowRun(
            id=12345,
            name="CI",
            head_branch="main",
            status="completed",
            conclusion="success",
            created_at=datetime.now(timezone.utc) - timedelta(days=1),
            updated_at=datetime.now(timezone.utc) - timedelta(days=1, hours=-1),
            duration_seconds=300,
            repository_full_name="user/test-repo",
            workflow_id=123,
            run_number=1,
            html_url="https://github.com/user/test-repo/actions/runs/12345",
            head_sha="abc123",
        )

        result = processor.process_workflow_runs(
            workflow_runs=[workflow_run],
            repository_full_name="user/test-repo",
            filter_days=7,
        )

        assert result.status == ProcessingStatus.SUCCESS
        assert result.processed_count == 1
        assert result.error_count == 0
        assert len(result.pipeline_runs) == 1

        processed_run = result.pipeline_runs[0]
        assert isinstance(processed_run, ProcessedPipelineRun)
        assert processed_run.external_id == "12345"
        assert processed_run.name == "CI"
        assert processed_run.status == PipelineStatus.SUCCESS
        assert processed_run.branch == "main"
        assert processed_run.commit_sha == "abc123"
        assert processed_run.duration_seconds == 300
        assert "github_run_id" in processed_run.metadata

    def test_process_job_data(self):
        """Test processing job data for analytics."""
        processor = GitHubDataProcessor()

        job_data = [
            {
                "id": 67890,
                "name": "build",
                "status": "completed",
                "conclusion": "success",
                "duration_seconds": 180,
                "runner_name": "GitHub Actions 2",
                "labels": ["ubuntu-latest"],
                "steps": [
                    {
                        "name": "Checkout",
                        "conclusion": "success",
                        "duration_seconds": 30,
                    },
                    {"name": "Build", "conclusion": "success", "duration_seconds": 120},
                ],
            },
            {
                "id": 67891,
                "name": "test",
                "status": "completed",
                "conclusion": "failure",
                "duration_seconds": 60,
                "runner_name": "GitHub Actions 3",
                "labels": ["ubuntu-latest"],
                "steps": [
                    {"name": "Test", "conclusion": "failure", "duration_seconds": 60}
                ],
            },
        ]

        analytics = processor.process_job_data(job_data, run_id=12345)

        assert analytics["run_id"] == 12345
        assert analytics["total_jobs"] == 2

        job_summary = analytics["job_summary"]
        assert job_summary["total_jobs"] == 2
        assert job_summary["successful_jobs"] == 1
        assert job_summary["failed_jobs"] == 1
        assert job_summary["total_job_duration"] == 240
        assert job_summary["average_job_duration"] == 120
        assert job_summary["longest_job_duration"] == 180
        assert job_summary["shortest_job_duration"] == 60

        step_summary = analytics["step_summary"]
        assert step_summary["total_steps"] == 3
        assert step_summary["successful_steps"] == 2
        assert step_summary["failed_steps"] == 1
        assert step_summary["total_step_duration"] == 210

        performance_metrics = analytics["performance_metrics"]
        assert "parallelization_score" in performance_metrics
        assert "efficiency_score" in performance_metrics
        assert "reliability_score" in performance_metrics
        assert "duration_distribution" in performance_metrics

        # Check job details
        job_details = analytics["job_details"]
        assert len(job_details) == 2
        assert job_details[0]["name"] == "build"
        assert job_details[0]["conclusion"] == "success"
        assert job_details[1]["name"] == "test"
        assert job_details[1]["conclusion"] == "failure"

    def test_map_github_status_to_pipeline_status(self):
        """Test GitHub status mapping."""
        processor = GitHubDataProcessor()

        # Test status mappings
        assert (
            processor._map_github_status_to_pipeline_status("queued", None)
            == PipelineStatus.PENDING
        )
        assert (
            processor._map_github_status_to_pipeline_status("in_progress", None)
            == PipelineStatus.RUNNING
        )
        assert (
            processor._map_github_status_to_pipeline_status("completed", "success")
            == PipelineStatus.SUCCESS
        )
        assert (
            processor._map_github_status_to_pipeline_status("completed", "failure")
            == PipelineStatus.FAILED
        )
        assert (
            processor._map_github_status_to_pipeline_status("completed", "cancelled")
            == PipelineStatus.CANCELLED
        )

    def test_calculate_performance_scores(self):
        """Test performance score calculations."""
        processor = GitHubDataProcessor()

        # Test parallelization score
        job_data_parallel = [{"status": "completed"} for _ in range(5)]
        score = processor._calculate_parallelization_score(job_data_parallel)
        assert 0 <= score <= 100

        # Test efficiency score
        job_stats = {
            "total_jobs": 10,
            "successful_jobs": 8,
            "average_job_duration": 300,
        }
        step_stats = {}
        efficiency = processor._calculate_efficiency_score(job_stats, step_stats)
        assert 0 <= efficiency <= 100

        # Test reliability score
        reliability = processor._calculate_reliability_score(job_stats)
        assert 0 <= reliability <= 100

        # Test duration distribution analysis
        durations = [
            100,
            150,
            200,
            250,
            300,
            350,
            400,
            450,
            500,
            1000,
        ]  # Include outlier
        distribution = processor._analyze_duration_distribution(durations)
        assert "quartiles" in distribution
        assert "outliers" in distribution
        assert "consistency_score" in distribution
        assert len(distribution["outliers"]) > 0  # Should detect the 1000 as outlier

    def test_edge_cases(self):
        """Test edge cases and error handling."""
        processor = GitHubDataProcessor()

        # Test empty job data
        analytics = processor.process_job_data([], run_id=12345)
        assert analytics["total_jobs"] == 0
        assert analytics["job_summary"] == {}

        # Test empty workflow runs
        result = processor.process_workflow_runs([], "user/repo")
        assert result.status == ProcessingStatus.SKIPPED
        assert result.processed_count == 0

        # Test duration distribution with single value
        distribution = processor._analyze_duration_distribution([100])
        assert distribution["consistency_score"] == 100.0

        # Test empty duration list
        distribution = processor._analyze_duration_distribution([])
        assert distribution["quartiles"] == []
        assert distribution["outliers"] == []
        assert distribution["consistency_score"] == 0.0


# Integration test
class TestGitHubServicesIntegration:
    """Test integration between GitHub services."""

    @pytest.mark.asyncio
    async def test_end_to_end_workflow(self):
        """Test complete workflow from repository to processed data."""
        # This would be an integration test that combines all services
        # For now, we'll test that services can be imported and instantiated together

        actions_service = GitHubActionsService()
        repo_service = GitHubRepositoryService()
        data_processor = GitHubDataProcessor()

        assert actions_service is not None
        assert repo_service is not None
        assert data_processor is not None

        # Test that singleton instances are the same
        assert github_actions_service is actions_service.__class__()
        assert github_repository_service is repo_service.__class__()
        assert github_data_processor is data_processor.__class__()
