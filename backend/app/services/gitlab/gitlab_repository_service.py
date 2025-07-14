"""
GitLab repository service for discovering and managing repositories.
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
from app.services.gitlab.gitlab_oauth import gitlab_oauth

logger = logging.getLogger(__name__)


class GitLabVisibility(Enum):
    """GitLab repository visibility options."""

    PUBLIC = "public"
    PRIVATE = "private"
    INTERNAL = "internal"


@dataclass
class GitLabRepository:
    """GitLab repository data structure."""

    id: int
    name: str
    name_with_namespace: str
    path: str
    path_with_namespace: str
    description: Optional[str]
    web_url: str
    http_url_to_repo: str
    ssh_url_to_repo: str
    default_branch: Optional[str]
    tag_list: List[str]
    topics: List[str]
    visibility: str
    namespace: Dict[str, Any]
    star_count: int
    forks_count: int
    open_issues_count: int
    merge_requests_enabled: bool
    issues_enabled: bool
    wiki_enabled: bool
    snippets_enabled: bool
    ci_enabled: bool
    builds_enabled: bool
    shared_runners_enabled: bool
    archived: bool
    permissions: Dict[str, Any]
    created_at: str
    last_activity_at: str
    avatar_url: Optional[str]


class GitLabRepositoryService:
    """
    Service for GitLab repository discovery and management.
    Handles repository listing, permissions, and metadata.
    """

    def __init__(self):
        """Initialize GitLab repository service."""
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
                elif response.status_code == 429:
                    # GitLab rate limiting
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="GitLab API rate limit exceeded",
                    )

                response.raise_for_status()
                return response.json()

            except httpx.HTTPError as e:
                logger.error(f"GitLab API request failed: {e}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="GitLab API request failed",
                )

    async def _make_paginated_request(
        self,
        access_token: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        max_pages: int = 10,
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
        current_params.setdefault("per_page", 50)  # GitLab default is 20, we use 50
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

                    # Check if there are more pages using GitLab pagination headers
                    next_page = response.headers.get("X-Next-Page")
                    if not next_page:
                        break

                    page = int(next_page)

                except httpx.HTTPError as e:
                    logger.error(f"GitLab API paginated request failed: {e}")
                    break

        return all_results

    async def discover_repositories(
        self, access_token: str, query: Optional[str] = None
    ) -> List[GitLabRepository]:
        """
        Discover GitLab repositories for the authenticated user.

        Args:
            access_token (str): GitLab OAuth access token
            query (Optional[str]): Optional search query

        Returns:
            List[GitLabRepository]: List of discovered repositories

        Raises:
            HTTPException: If API request fails
        """
        try:
            logger.info("Starting GitLab repository discovery")

            params = {
                "membership": "true",  # Only repositories user is a member of
                "simple": "false",     # Get full repository information
                "order_by": "last_activity_at",
                "sort": "desc",
                "per_page": 50,
            }

            if query:
                params["search"] = query

            # Get repositories the user has access to
            repo_data = await self._make_paginated_request(
                access_token, "projects", params, max_pages=5
            )

            repositories = []
            for repo in repo_data:
                try:
                    gitlab_repo = GitLabRepository(
                        id=repo["id"],
                        name=repo["name"],
                        name_with_namespace=repo["name_with_namespace"],
                        path=repo["path"],
                        path_with_namespace=repo["path_with_namespace"],
                        description=repo.get("description"),
                        web_url=repo["web_url"],
                        http_url_to_repo=repo["http_url_to_repo"],
                        ssh_url_to_repo=repo["ssh_url_to_repo"],
                        default_branch=repo.get("default_branch"),
                        tag_list=repo.get("tag_list", []),
                        topics=repo.get("topics", []),
                        visibility=repo["visibility"],
                        namespace=repo["namespace"],
                        star_count=repo.get("star_count", 0),
                        forks_count=repo.get("forks_count", 0),
                        open_issues_count=repo.get("open_issues_count", 0),
                        merge_requests_enabled=repo.get("merge_requests_enabled", True),
                        issues_enabled=repo.get("issues_enabled", True),
                        wiki_enabled=repo.get("wiki_enabled", True),
                        snippets_enabled=repo.get("snippets_enabled", True),
                        ci_enabled=repo.get("ci_enabled", True),
                        builds_enabled=repo.get("builds_enabled", True),
                        shared_runners_enabled=repo.get("shared_runners_enabled", True),
                        archived=repo.get("archived", False),
                        permissions=repo.get("permissions", {}),
                        created_at=repo["created_at"],
                        last_activity_at=repo["last_activity_at"],
                        avatar_url=repo.get("avatar_url"),
                    )
                    repositories.append(gitlab_repo)

                except KeyError as e:
                    logger.warning(f"Skipping GitLab repository due to missing field {e}: {repo.get('name', 'unknown')}")
                    continue

            logger.info(f"Discovered {len(repositories)} GitLab repositories")
            return repositories

        except Exception as e:
            logger.error(f"GitLab repository discovery failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to discover GitLab repositories",
            )

    async def get_repository_details(
        self, access_token: str, project_id: int
    ) -> Optional[GitLabRepository]:
        """
        Get detailed information about a specific GitLab repository.

        Args:
            access_token (str): GitLab OAuth access token
            project_id (int): GitLab project ID

        Returns:
            Optional[GitLabRepository]: Repository details or None if not found

        Raises:
            HTTPException: If API request fails
        """
        try:
            repo_data = await self._make_authenticated_request(
                access_token, f"projects/{project_id}"
            )

            return GitLabRepository(
                id=repo_data["id"],
                name=repo_data["name"],
                name_with_namespace=repo_data["name_with_namespace"],
                path=repo_data["path"],
                path_with_namespace=repo_data["path_with_namespace"],
                description=repo_data.get("description"),
                web_url=repo_data["web_url"],
                http_url_to_repo=repo_data["http_url_to_repo"],
                ssh_url_to_repo=repo_data["ssh_url_to_repo"],
                default_branch=repo_data.get("default_branch"),
                tag_list=repo_data.get("tag_list", []),
                topics=repo_data.get("topics", []),
                visibility=repo_data["visibility"],
                namespace=repo_data["namespace"],
                star_count=repo_data.get("star_count", 0),
                forks_count=repo_data.get("forks_count", 0),
                open_issues_count=repo_data.get("open_issues_count", 0),
                merge_requests_enabled=repo_data.get("merge_requests_enabled", True),
                issues_enabled=repo_data.get("issues_enabled", True),
                wiki_enabled=repo_data.get("wiki_enabled", True),
                snippets_enabled=repo_data.get("snippets_enabled", True),
                ci_enabled=repo_data.get("ci_enabled", True),
                builds_enabled=repo_data.get("builds_enabled", True),
                shared_runners_enabled=repo_data.get("shared_runners_enabled", True),
                archived=repo_data.get("archived", False),
                permissions=repo_data.get("permissions", {}),
                created_at=repo_data["created_at"],
                last_activity_at=repo_data["last_activity_at"],
                avatar_url=repo_data.get("avatar_url"),
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get GitLab repository details: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get GitLab repository details",
            )

    async def search_repositories(
        self, access_token: str, query: str, per_page: int = 20
    ) -> List[GitLabRepository]:
        """
        Search GitLab repositories accessible to the user.

        Args:
            access_token (str): GitLab OAuth access token
            query (str): Search query
            per_page (int): Number of results per page

        Returns:
            List[GitLabRepository]: Search results

        Raises:
            HTTPException: If API request fails
        """
        try:
            params = {
                "search": query,
                "membership": "true",
                "order_by": "last_activity_at",
                "sort": "desc",
                "per_page": min(per_page, 50),  # GitLab max is 100, we limit to 50
            }

            repo_data = await self._make_paginated_request(
                access_token, "projects", params, max_pages=3
            )

            repositories = []
            for repo in repo_data:
                try:
                    gitlab_repo = GitLabRepository(
                        id=repo["id"],
                        name=repo["name"],
                        name_with_namespace=repo["name_with_namespace"],
                        path=repo["path"],
                        path_with_namespace=repo["path_with_namespace"],
                        description=repo.get("description"),
                        web_url=repo["web_url"],
                        http_url_to_repo=repo["http_url_to_repo"],
                        ssh_url_to_repo=repo["ssh_url_to_repo"],
                        default_branch=repo.get("default_branch"),
                        tag_list=repo.get("tag_list", []),
                        topics=repo.get("topics", []),
                        visibility=repo["visibility"],
                        namespace=repo["namespace"],
                        star_count=repo.get("star_count", 0),
                        forks_count=repo.get("forks_count", 0),
                        open_issues_count=repo.get("open_issues_count", 0),
                        merge_requests_enabled=repo.get("merge_requests_enabled", True),
                        issues_enabled=repo.get("issues_enabled", True),
                        wiki_enabled=repo.get("wiki_enabled", True),
                        snippets_enabled=repo.get("snippets_enabled", True),
                        ci_enabled=repo.get("ci_enabled", True),
                        builds_enabled=repo.get("builds_enabled", True),
                        shared_runners_enabled=repo.get("shared_runners_enabled", True),
                        archived=repo.get("archived", False),
                        permissions=repo.get("permissions", {}),
                        created_at=repo["created_at"],
                        last_activity_at=repo["last_activity_at"],
                        avatar_url=repo.get("avatar_url"),
                    )
                    repositories.append(gitlab_repo)

                except KeyError as e:
                    logger.warning(f"Skipping GitLab repository in search due to missing field {e}")
                    continue

            return repositories

        except Exception as e:
            logger.error(f"GitLab repository search failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to search GitLab repositories",
            )

    async def validate_repository_access(
        self, access_token: str, project_id: int
    ) -> bool:
        """
        Validate that the user has access to a specific GitLab repository.

        Args:
            access_token (str): GitLab OAuth access token
            project_id (int): GitLab project ID

        Returns:
            bool: True if user has access, False otherwise
        """
        try:
            await self._make_authenticated_request(
                access_token, f"projects/{project_id}"
            )
            return True

        except HTTPException as e:
            if e.status_code in [401, 403, 404]:
                return False
            raise

    async def get_user_repositories_count(self, access_token: str) -> int:
        """
        Get the total count of repositories accessible to the user.

        Args:
            access_token (str): GitLab OAuth access token

        Returns:
            int: Total number of accessible repositories
        """
        try:
            params = {
                "membership": "true",
                "simple": "true",
                "per_page": 1,  # We only need the count
            }

            headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
                "User-Agent": f"{settings.PROJECT_NAME}/{settings.VERSION}",
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/projects",
                    headers=headers,
                    params=params,
                    timeout=30.0,
                )

                if response.status_code == 200:
                    # GitLab returns total count in X-Total header
                    total_count = response.headers.get("X-Total", "0")
                    return int(total_count)

                return 0

        except Exception as e:
            logger.error(f"Failed to get GitLab repositories count: {e}")
            return 0

    async def get_repository_languages(
        self, access_token: str, project_id: int
    ) -> Dict[str, float]:
        """
        Get programming languages used in a GitLab repository.

        Args:
            access_token (str): GitLab OAuth access token
            project_id (int): GitLab project ID

        Returns:
            Dict[str, float]: Language breakdown with percentages
        """
        try:
            languages_data = await self._make_authenticated_request(
                access_token, f"projects/{project_id}/languages"
            )
            return languages_data

        except HTTPException as e:
            if e.status_code == 404:
                return {}
            raise
        except Exception as e:
            logger.error(f"Failed to get GitLab repository languages: {e}")
            return {}


# Global service instance
gitlab_repository_service = GitLabRepositoryService()