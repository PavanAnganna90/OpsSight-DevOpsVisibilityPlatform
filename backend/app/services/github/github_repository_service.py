"""
GitHub repository service for discovering and managing repositories.
Handles repository discovery, permissions, and metadata fetching.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

import httpx
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.services.github.github_oauth import github_oauth

logger = logging.getLogger(__name__)


class RepositoryVisibility(Enum):
    """Repository visibility options."""

    PUBLIC = "public"
    PRIVATE = "private"
    INTERNAL = "internal"


@dataclass
class GitHubRepository:
    """GitHub repository data structure."""

    id: int
    name: str
    full_name: str
    description: Optional[str]
    html_url: str
    clone_url: str
    ssh_url: str
    default_branch: str
    language: Optional[str]
    visibility: str
    size: int
    stargazers_count: int
    watchers_count: int
    forks_count: int
    open_issues_count: int
    has_actions: bool
    permissions: Dict[str, bool]
    created_at: str
    updated_at: str
    pushed_at: Optional[str]


class GitHubRepositoryService:
    """
    Service for GitHub repository discovery and management.
    Handles repository listing, permissions, and metadata.
    """

    def __init__(self):
        """Initialize GitHub repository service."""
        self.api_url = "https://api.github.com"

    async def _make_authenticated_request(
        self, access_token: str, endpoint: str, params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Make authenticated request to GitHub API.
        Reuses the same pattern as GitHubActionsService.

        Args:
            access_token (str): GitHub OAuth access token
            endpoint (str): API endpoint path
            params (Optional[Dict[str, Any]]): Query parameters

        Returns:
            Dict[str, Any]: API response data

        Raises:
            HTTPException: If API request fails
        """
        headers = {
            "Authorization": f"token {access_token}",
            "Accept": "application/vnd.github.v3+json",
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
                        detail="GitHub access token invalid or expired",
                    )
                elif response.status_code == 403:
                    if "rate limit" in response.text.lower():
                        raise HTTPException(
                            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="GitHub API rate limit exceeded",
                        )
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Insufficient GitHub permissions",
                    )
                elif response.status_code == 404:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="GitHub resource not found",
                    )
                elif response.status_code >= 400:
                    logger.error(
                        f"GitHub API error: {response.status_code} - {response.text}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"GitHub API error: {response.status_code}",
                    )

                return response.json()

            except httpx.TimeoutException:
                logger.error("GitHub API request timeout")
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail="GitHub API request timeout",
                )
            except httpx.NetworkError as e:
                logger.error(f"GitHub API network error: {e}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="GitHub API network error",
                )

    async def list_user_repositories(
        self,
        access_token: str,
        visibility: Optional[str] = None,
        sort: str = "updated",
        per_page: int = 30,
        page: int = 1,
    ) -> Tuple[List[GitHubRepository], Dict[str, Any]]:
        """
        List repositories for the authenticated user.

        Args:
            access_token (str): GitHub OAuth access token
            visibility (Optional[str]): Filter by visibility (all, public, private)
            sort (str): Sort order (created, updated, pushed, full_name)
            per_page (int): Results per page (max 100)
            page (int): Page number

        Returns:
            Tuple[List[GitHubRepository], Dict[str, Any]]: Repositories and pagination info
        """
        params = {"sort": sort, "per_page": min(per_page, 100), "page": page}

        if visibility:
            params["visibility"] = visibility

        response = await self._make_authenticated_request(
            access_token, "user/repos", params
        )

        # Transform repositories to our data structure
        repositories = []
        for repo_data in response if isinstance(response, list) else []:
            try:
                repository = GitHubRepository(
                    id=repo_data["id"],
                    name=repo_data["name"],
                    full_name=repo_data["full_name"],
                    description=repo_data.get("description"),
                    html_url=repo_data["html_url"],
                    clone_url=repo_data["clone_url"],
                    ssh_url=repo_data["ssh_url"],
                    default_branch=repo_data.get("default_branch", "main"),
                    language=repo_data.get("language"),
                    visibility=repo_data.get("visibility", "public"),
                    size=repo_data.get("size", 0),
                    stargazers_count=repo_data.get("stargazers_count", 0),
                    watchers_count=repo_data.get("watchers_count", 0),
                    forks_count=repo_data.get("forks_count", 0),
                    open_issues_count=repo_data.get("open_issues_count", 0),
                    has_actions=repo_data.get("has_actions", False),
                    permissions=repo_data.get("permissions", {}),
                    created_at=repo_data["created_at"],
                    updated_at=repo_data["updated_at"],
                    pushed_at=repo_data.get("pushed_at"),
                )
                repositories.append(repository)

            except (KeyError, ValueError) as e:
                logger.warning(f"Skipping malformed repository data: {e}")
                continue

        # Extract pagination info
        pagination_info = {
            "current_page": page,
            "per_page": per_page,
            "total_repositories": len(repositories),
            "has_next": len(repositories) == per_page,
        }

        return repositories, pagination_info

    async def get_repository_details(
        self, access_token: str, owner: str, repo: str
    ) -> GitHubRepository:
        """
        Get detailed information for a specific repository.

        Args:
            access_token (str): GitHub OAuth access token
            owner (str): Repository owner
            repo (str): Repository name

        Returns:
            GitHubRepository: Repository details
        """
        endpoint = f"repos/{owner}/{repo}"
        repo_data = await self._make_authenticated_request(access_token, endpoint)

        return GitHubRepository(
            id=repo_data["id"],
            name=repo_data["name"],
            full_name=repo_data["full_name"],
            description=repo_data.get("description"),
            html_url=repo_data["html_url"],
            clone_url=repo_data["clone_url"],
            ssh_url=repo_data["ssh_url"],
            default_branch=repo_data.get("default_branch", "main"),
            language=repo_data.get("language"),
            visibility=repo_data.get("visibility", "public"),
            size=repo_data.get("size", 0),
            stargazers_count=repo_data.get("stargazers_count", 0),
            watchers_count=repo_data.get("watchers_count", 0),
            forks_count=repo_data.get("forks_count", 0),
            open_issues_count=repo_data.get("open_issues_count", 0),
            has_actions=repo_data.get("has_actions", False),
            permissions=repo_data.get("permissions", {}),
            created_at=repo_data["created_at"],
            updated_at=repo_data["updated_at"],
            pushed_at=repo_data.get("pushed_at"),
        )

    async def check_repository_actions_enabled(
        self, access_token: str, owner: str, repo: str
    ) -> bool:
        """
        Check if GitHub Actions is enabled for a repository.

        Args:
            access_token (str): GitHub OAuth access token
            owner (str): Repository owner
            repo (str): Repository name

        Returns:
            bool: True if Actions is enabled
        """
        try:
            endpoint = f"repos/{owner}/{repo}/actions/workflows"
            await self._make_authenticated_request(
                access_token, endpoint, {"per_page": 1}
            )
            return True
        except HTTPException as e:
            if e.status_code == 404:
                return False
            raise

    async def search_repositories(
        self,
        access_token: str,
        query: str,
        sort: str = "updated",
        per_page: int = 30,
        page: int = 1,
    ) -> Tuple[List[GitHubRepository], Dict[str, Any]]:
        """
        Search repositories using GitHub search API.

        Args:
            access_token (str): GitHub OAuth access token
            query (str): Search query
            sort (str): Sort order (stars, forks, updated)
            per_page (int): Results per page (max 100)
            page (int): Page number

        Returns:
            Tuple[List[GitHubRepository], Dict[str, Any]]: Search results and pagination info
        """
        params = {
            "q": query,
            "sort": sort,
            "per_page": min(per_page, 100),
            "page": page,
        }

        endpoint = "search/repositories"
        response = await self._make_authenticated_request(
            access_token, endpoint, params
        )

        # Transform search results
        repositories = []
        for repo_data in response.get("items", []):
            try:
                repository = GitHubRepository(
                    id=repo_data["id"],
                    name=repo_data["name"],
                    full_name=repo_data["full_name"],
                    description=repo_data.get("description"),
                    html_url=repo_data["html_url"],
                    clone_url=repo_data["clone_url"],
                    ssh_url=repo_data["ssh_url"],
                    default_branch=repo_data.get("default_branch", "main"),
                    language=repo_data.get("language"),
                    visibility=repo_data.get("visibility", "public"),
                    size=repo_data.get("size", 0),
                    stargazers_count=repo_data.get("stargazers_count", 0),
                    watchers_count=repo_data.get("watchers_count", 0),
                    forks_count=repo_data.get("forks_count", 0),
                    open_issues_count=repo_data.get("open_issues_count", 0),
                    has_actions=repo_data.get("has_actions", False),
                    permissions=repo_data.get("permissions", {}),
                    created_at=repo_data["created_at"],
                    updated_at=repo_data["updated_at"],
                    pushed_at=repo_data.get("pushed_at"),
                )
                repositories.append(repository)

            except (KeyError, ValueError) as e:
                logger.warning(f"Skipping malformed repository data: {e}")
                continue

        # Extract pagination info
        pagination_info = {
            "total_count": response.get("total_count", 0),
            "current_page": page,
            "per_page": per_page,
            "has_next": len(repositories) == per_page,
        }

        return repositories, pagination_info


# Create singleton instance
github_repository_service = GitHubRepositoryService()
