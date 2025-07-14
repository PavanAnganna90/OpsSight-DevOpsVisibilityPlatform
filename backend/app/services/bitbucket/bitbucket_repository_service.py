"""
Bitbucket repository service for discovering and managing repositories.
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
from app.services.bitbucket.bitbucket_oauth import bitbucket_oauth

logger = logging.getLogger(__name__)


class BitbucketVisibility(Enum):
    """Bitbucket repository visibility options."""

    PUBLIC = "public"
    PRIVATE = "private"


@dataclass
class BitbucketRepository:
    """Bitbucket repository data structure."""

    uuid: str
    name: str
    full_name: str
    description: Optional[str]
    website: Optional[str]
    scm: str
    is_private: bool
    has_issues: bool
    has_wiki: bool
    language: Optional[str]
    size: int
    created_on: str
    updated_on: str
    fork_policy: str
    mainbranch: Optional[Dict[str, Any]]
    project: Dict[str, Any]
    owner: Dict[str, Any]
    links: Dict[str, Any]


class BitbucketRepositoryService:
    """
    Service for Bitbucket repository discovery and management.
    Handles repository listing, permissions, and metadata.
    """

    def __init__(self):
        """Initialize Bitbucket repository service."""
        self.api_url = "https://api.bitbucket.org/2.0"

    async def _make_authenticated_request(
        self, access_token: str, endpoint: str, params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Make authenticated request to Bitbucket API.

        Args:
            access_token (str): Bitbucket OAuth access token
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
                        detail="Invalid Bitbucket access token",
                    )
                elif response.status_code == 403:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Insufficient Bitbucket permissions",
                    )
                elif response.status_code == 404:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Bitbucket resource not found",
                    )
                elif response.status_code == 429:
                    # Bitbucket rate limiting
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Bitbucket API rate limit exceeded",
                    )

                response.raise_for_status()
                return response.json()

            except httpx.HTTPError as e:
                logger.error(f"Bitbucket API request failed: {e}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Bitbucket API request failed",
                )

    async def _make_paginated_request(
        self,
        access_token: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        max_pages: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Make paginated request to Bitbucket API.

        Args:
            access_token (str): Bitbucket OAuth access token
            endpoint (str): API endpoint path
            params (Optional[Dict[str, Any]]): Query parameters
            max_pages (int): Maximum pages to fetch

        Returns:
            List[Dict[str, Any]]: Combined results from all pages
        """
        all_results = []
        current_params = params.copy() if params else {}
        current_params.setdefault("pagelen", 50)  # Bitbucket default is 10, we use 50
        next_url = f"{self.api_url}/{endpoint}"
        pages_fetched = 0

        while next_url and pages_fetched < max_pages:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
                "User-Agent": f"{settings.PROJECT_NAME}/{settings.VERSION}",
            }

            async with httpx.AsyncClient() as client:
                try:
                    response = await client.get(
                        next_url,
                        headers=headers,
                        params=current_params if pages_fetched == 0 else None,
                        timeout=30.0,
                    )

                    if response.status_code == 401:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid Bitbucket access token",
                        )

                    response.raise_for_status()
                    data = response.json()

                    if "values" in data:
                        all_results.extend(data["values"])
                    
                    # Check for next page
                    next_url = data.get("next")
                    pages_fetched += 1

                except httpx.HTTPError as e:
                    logger.error(f"Bitbucket API paginated request failed: {e}")
                    break

        return all_results

    async def discover_repositories(
        self, access_token: str, query: Optional[str] = None
    ) -> List[BitbucketRepository]:
        """
        Discover Bitbucket repositories for the authenticated user.

        Args:
            access_token (str): Bitbucket OAuth access token
            query (Optional[str]): Optional search query

        Returns:
            List[BitbucketRepository]: List of discovered repositories

        Raises:
            HTTPException: If API request fails
        """
        try:
            logger.info("Starting Bitbucket repository discovery")

            params = {
                "role": "member",  # Repositories user is a member of
                "sort": "-updated_on",
                "pagelen": 50,
            }

            if query:
                params["q"] = f'name ~ "{query}"'

            # Get repositories for the authenticated user
            repo_data = await self._make_paginated_request(
                access_token, "repositories", params, max_pages=5
            )

            repositories = []
            for repo in repo_data:
                try:
                    bitbucket_repo = BitbucketRepository(
                        uuid=repo["uuid"],
                        name=repo["name"],
                        full_name=repo["full_name"],
                        description=repo.get("description"),
                        website=repo.get("website"),
                        scm=repo.get("scm", "git"),
                        is_private=repo.get("is_private", False),
                        has_issues=repo.get("has_issues", False),
                        has_wiki=repo.get("has_wiki", False),
                        language=repo.get("language"),
                        size=repo.get("size", 0),
                        created_on=repo["created_on"],
                        updated_on=repo["updated_on"],
                        fork_policy=repo.get("fork_policy", "allow_forks"),
                        mainbranch=repo.get("mainbranch"),
                        project=repo.get("project", {}),
                        owner=repo.get("owner", {}),
                        links=repo.get("links", {}),
                    )
                    repositories.append(bitbucket_repo)

                except KeyError as e:
                    logger.warning(f"Skipping Bitbucket repository due to missing field {e}: {repo.get('name', 'unknown')}")
                    continue

            logger.info(f"Discovered {len(repositories)} Bitbucket repositories")
            return repositories

        except Exception as e:
            logger.error(f"Bitbucket repository discovery failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to discover Bitbucket repositories",
            )

    async def get_repository_details(
        self, access_token: str, workspace: str, repo_slug: str
    ) -> Optional[BitbucketRepository]:
        """
        Get detailed information about a specific Bitbucket repository.

        Args:
            access_token (str): Bitbucket OAuth access token
            workspace (str): Bitbucket workspace name
            repo_slug (str): Repository slug

        Returns:
            Optional[BitbucketRepository]: Repository details or None if not found

        Raises:
            HTTPException: If API request fails
        """
        try:
            repo_data = await self._make_authenticated_request(
                access_token, f"repositories/{workspace}/{repo_slug}"
            )

            return BitbucketRepository(
                uuid=repo_data["uuid"],
                name=repo_data["name"],
                full_name=repo_data["full_name"],
                description=repo_data.get("description"),
                website=repo_data.get("website"),
                scm=repo_data.get("scm", "git"),
                is_private=repo_data.get("is_private", False),
                has_issues=repo_data.get("has_issues", False),
                has_wiki=repo_data.get("has_wiki", False),
                language=repo_data.get("language"),
                size=repo_data.get("size", 0),
                created_on=repo_data["created_on"],
                updated_on=repo_data["updated_on"],
                fork_policy=repo_data.get("fork_policy", "allow_forks"),
                mainbranch=repo_data.get("mainbranch"),
                project=repo_data.get("project", {}),
                owner=repo_data.get("owner", {}),
                links=repo_data.get("links", {}),
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get Bitbucket repository details: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get Bitbucket repository details",
            )

    async def search_repositories(
        self, access_token: str, query: str, per_page: int = 20
    ) -> List[BitbucketRepository]:
        """
        Search Bitbucket repositories accessible to the user.

        Args:
            access_token (str): Bitbucket OAuth access token
            query (str): Search query
            per_page (int): Number of results per page

        Returns:
            List[BitbucketRepository]: Search results

        Raises:
            HTTPException: If API request fails
        """
        try:
            params = {
                "q": f'name ~ "{query}"',
                "sort": "-updated_on",
                "pagelen": min(per_page, 50),  # Bitbucket max is 100, we limit to 50
            }

            repo_data = await self._make_paginated_request(
                access_token, "repositories", params, max_pages=3
            )

            repositories = []
            for repo in repo_data:
                try:
                    bitbucket_repo = BitbucketRepository(
                        uuid=repo["uuid"],
                        name=repo["name"],
                        full_name=repo["full_name"],
                        description=repo.get("description"),
                        website=repo.get("website"),
                        scm=repo.get("scm", "git"),
                        is_private=repo.get("is_private", False),
                        has_issues=repo.get("has_issues", False),
                        has_wiki=repo.get("has_wiki", False),
                        language=repo.get("language"),
                        size=repo.get("size", 0),
                        created_on=repo["created_on"],
                        updated_on=repo["updated_on"],
                        fork_policy=repo.get("fork_policy", "allow_forks"),
                        mainbranch=repo.get("mainbranch"),
                        project=repo.get("project", {}),
                        owner=repo.get("owner", {}),
                        links=repo.get("links", {}),
                    )
                    repositories.append(bitbucket_repo)

                except KeyError as e:
                    logger.warning(f"Skipping Bitbucket repository in search due to missing field {e}")
                    continue

            return repositories

        except Exception as e:
            logger.error(f"Bitbucket repository search failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to search Bitbucket repositories",
            )

    async def validate_repository_access(
        self, access_token: str, workspace: str, repo_slug: str
    ) -> bool:
        """
        Validate that the user has access to a specific Bitbucket repository.

        Args:
            access_token (str): Bitbucket OAuth access token
            workspace (str): Bitbucket workspace name
            repo_slug (str): Repository slug

        Returns:
            bool: True if user has access, False otherwise
        """
        try:
            await self._make_authenticated_request(
                access_token, f"repositories/{workspace}/{repo_slug}"
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
            access_token (str): Bitbucket OAuth access token

        Returns:
            int: Total number of accessible repositories
        """
        try:
            params = {
                "role": "member",
                "pagelen": 1,  # We only need the count
            }

            headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
                "User-Agent": f"{settings.PROJECT_NAME}/{settings.VERSION}",
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/repositories",
                    headers=headers,
                    params=params,
                    timeout=30.0,
                )

                if response.status_code == 200:
                    data = response.json()
                    return data.get("size", 0)

                return 0

        except Exception as e:
            logger.error(f"Failed to get Bitbucket repositories count: {e}")
            return 0

    async def get_repository_branches(
        self, access_token: str, workspace: str, repo_slug: str
    ) -> List[Dict[str, Any]]:
        """
        Get branches for a Bitbucket repository.

        Args:
            access_token (str): Bitbucket OAuth access token
            workspace (str): Bitbucket workspace name
            repo_slug (str): Repository slug

        Returns:
            List[Dict[str, Any]]: List of repository branches
        """
        try:
            branch_data = await self._make_paginated_request(
                access_token, f"repositories/{workspace}/{repo_slug}/refs/branches"
            )
            return branch_data

        except HTTPException as e:
            if e.status_code == 404:
                return []
            raise
        except Exception as e:
            logger.error(f"Failed to get Bitbucket repository branches: {e}")
            return []

    async def get_repository_commits(
        self, access_token: str, workspace: str, repo_slug: str, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get recent commits for a Bitbucket repository.

        Args:
            access_token (str): Bitbucket OAuth access token
            workspace (str): Bitbucket workspace name
            repo_slug (str): Repository slug
            limit (int): Number of commits to return

        Returns:
            List[Dict[str, Any]]: List of recent commits
        """
        try:
            params = {
                "pagelen": min(limit, 50),
            }

            commit_data = await self._make_paginated_request(
                access_token, f"repositories/{workspace}/{repo_slug}/commits", params, max_pages=2
            )
            return commit_data

        except HTTPException as e:
            if e.status_code == 404:
                return []
            raise
        except Exception as e:
            logger.error(f"Failed to get Bitbucket repository commits: {e}")
            return []


# Global service instance
bitbucket_repository_service = BitbucketRepositoryService()