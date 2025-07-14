"""
GitHub integration services for OpsSight DevOps platform.
Provides OAuth authentication and GitHub Actions API integration.
"""

from .github_oauth import github_oauth, GitHubOAuth
from .github_actions_service import (
    github_actions_service,
    GitHubActionsService,
    GitHubWorkflowRun,
    GitHubActionStatus,
    GitHubActionConclusion,
)
from .github_repository_service import (
    github_repository_service,
    GitHubRepositoryService,
    GitHubRepository,
    RepositoryVisibility,
)
from .github_data_processor import (
    github_data_processor,
    GitHubDataProcessor,
    ProcessedPipelineData,
    ProcessedPipelineRun,
    ProcessingResult,
    ProcessingStatus,
)

__all__ = [
    "github_oauth",
    "GitHubOAuth",
    "github_actions_service",
    "GitHubActionsService",
    "GitHubWorkflowRun",
    "GitHubActionStatus",
    "GitHubActionConclusion",
    "github_repository_service",
    "GitHubRepositoryService",
    "GitHubRepository",
    "RepositoryVisibility",
    "github_data_processor",
    "GitHubDataProcessor",
    "ProcessedPipelineData",
    "ProcessedPipelineRun",
    "ProcessingResult",
    "ProcessingStatus",
]
