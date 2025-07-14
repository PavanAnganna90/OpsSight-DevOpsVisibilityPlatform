"""
GitHub OAuth service for handling authentication and user information.
"""

from typing import Dict, Any
import httpx
from fastapi import HTTPException, status

from app.core.config import settings


class GitHubOAuth:
    """
    Handles GitHub OAuth authentication flow and user information retrieval.
    """

    def __init__(self):
        """Initialize GitHub OAuth service with configuration."""
        self.client_id = settings.GITHUB_CLIENT_ID
        self.client_secret = settings.GITHUB_CLIENT_SECRET
        self.base_url = "https://github.com"
        self.api_url = "https://api.github.com"

        if not self.client_id or not self.client_secret:
            raise ValueError("GitHub OAuth credentials not configured")

    async def get_access_token(self, code: str) -> str:
        """
        Exchange GitHub OAuth code for access token.

        Args:
            code (str): The OAuth code received from GitHub

        Returns:
            str: The GitHub access token

        Raises:
            HTTPException: If token exchange fails
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/login/oauth/access_token",
                json={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                },
                headers={"Accept": "application/json"},
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Failed to exchange GitHub code for token",
                )

            data = response.json()
            if "error" in data:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=data.get("error_description", "GitHub OAuth error"),
                )

            return data["access_token"]

    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """
        Fetch user information from GitHub using access token.

        Args:
            access_token (str): GitHub OAuth access token

        Returns:
            Dict[str, Any]: User information from GitHub

        Raises:
            HTTPException: If user info fetch fails
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/user",
                headers={
                    "Authorization": f"token {access_token}",
                    "Accept": "application/json",
                },
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Failed to fetch GitHub user info",
                )

            return response.json()


# Create a singleton instance
github_oauth = GitHubOAuth()
