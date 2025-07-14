"""
GitHub OAuth utilities for authentication.

This module provides functions for handling GitHub OAuth authentication flow,
including URL generation, token exchange, and user data retrieval.
"""

from typing import Dict, Optional
import httpx
from urllib.parse import urlencode

from app.core.config.settings import settings


class GitHubOAuth:
    """
    GitHub OAuth handler class.

    Provides methods for handling GitHub OAuth authentication flow.
    """

    # GitHub OAuth endpoints
    AUTH_URL = "https://github.com/login/oauth/authorize"
    TOKEN_URL = "https://github.com/login/oauth/access_token"
    USER_URL = "https://api.github.com/user"

    @classmethod
    def get_authorization_url(cls, state: str) -> str:
        """
        Generate GitHub OAuth authorization URL.

        Args:
            state: CSRF token for security

        Returns:
            str: Authorization URL with required parameters
        """
        params = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": str(settings.GITHUB_CALLBACK_URL),
            "scope": "read:user user:email",
            "state": state,
        }
        return f"{cls.AUTH_URL}?{urlencode(params)}"

    @classmethod
    async def exchange_code_for_token(cls, code: str) -> Optional[str]:
        """
        Exchange authorization code for access token.

        Args:
            code: Authorization code from GitHub

        Returns:
            Optional[str]: Access token if successful, None otherwise

        Raises:
            httpx.HTTPError: If the request fails
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                cls.TOKEN_URL,
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": str(settings.GITHUB_CALLBACK_URL),
                },
                headers={"Accept": "application/json"},
            )
            response.raise_for_status()
            data = response.json()
            return data.get("access_token")

    @classmethod
    async def get_user_data(cls, access_token: str) -> Dict:
        """
        Fetch user data from GitHub API.

        Args:
            access_token: GitHub OAuth access token

        Returns:
            Dict: User data from GitHub

        Raises:
            httpx.HTTPError: If the request fails
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                cls.USER_URL,
                headers={
                    "Authorization": f"token {access_token}",
                    "Accept": "application/json",
                },
            )
            response.raise_for_status()
            return response.json()

    @classmethod
    async def get_user_emails(cls, access_token: str) -> Dict:
        """
        Fetch user email data from GitHub API.

        Args:
            access_token: GitHub OAuth access token

        Returns:
            Dict: User email data from GitHub

        Raises:
            httpx.HTTPError: If the request fails
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{cls.USER_URL}/emails",
                headers={
                    "Authorization": f"token {access_token}",
                    "Accept": "application/json",
                },
            )
            response.raise_for_status()
            return response.json()
