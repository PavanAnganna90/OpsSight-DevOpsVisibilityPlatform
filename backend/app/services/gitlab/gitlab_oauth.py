"""
GitLab OAuth service for handling OAuth2 authentication flow.
Handles authorization, token exchange, and user information retrieval.
"""

import logging
from typing import Optional, Dict, Any
from urllib.parse import urlencode
import secrets

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)


class GitLabOAuth:
    """
    GitLab OAuth2 service for authentication and authorization.
    Handles the complete OAuth flow with GitLab.
    """

    def __init__(self):
        """Initialize GitLab OAuth service."""
        self.client_id = settings.GITLAB_CLIENT_ID
        self.client_secret = settings.GITLAB_CLIENT_SECRET
        self.redirect_uri = settings.GITLAB_CALLBACK_URL
        self.authorization_base_url = "https://gitlab.com/oauth/authorize"
        self.token_url = "https://gitlab.com/oauth/token"
        self.api_base_url = "https://gitlab.com/api/v4"

    def generate_authorization_url(self, state: Optional[str] = None) -> str:
        """
        Generate GitLab OAuth authorization URL.

        Args:
            state (Optional[str]): Optional state parameter for security

        Returns:
            str: Authorization URL for GitLab OAuth
        """
        if not state:
            state = secrets.token_urlsafe(32)

        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": "api read_user read_repository write_repository",
            "state": state,
        }

        authorization_url = f"{self.authorization_base_url}?{urlencode(params)}"
        logger.info(f"Generated GitLab authorization URL with state: {state}")
        
        return authorization_url

    async def exchange_code_for_token(
        self, code: str, state: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Exchange authorization code for access token.

        Args:
            code (str): Authorization code from GitLab
            state (Optional[str]): State parameter for validation

        Returns:
            Dict[str, Any]: Token information including access_token

        Raises:
            HTTPException: If token exchange fails
        """
        try:
            data = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": self.redirect_uri,
            }

            headers = {
                "Accept": "application/json",
                "User-Agent": f"{settings.PROJECT_NAME}/{settings.VERSION}",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.token_url,
                    data=data,
                    headers=headers,
                    timeout=30.0,
                )

                if response.status_code != 200:
                    logger.error(f"GitLab token exchange failed: {response.status_code} - {response.text}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Failed to exchange GitLab authorization code for token",
                    )

                token_data = response.json()
                
                # Validate required fields
                if "access_token" not in token_data:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid GitLab token response",
                    )

                logger.info("Successfully exchanged GitLab authorization code for token")
                return token_data

        except httpx.HTTPError as e:
            logger.error(f"GitLab token exchange HTTP error: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="GitLab OAuth service unavailable",
            )
        except Exception as e:
            logger.error(f"GitLab token exchange error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="GitLab OAuth token exchange failed",
            )

    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """
        Get GitLab user information using access token.

        Args:
            access_token (str): GitLab OAuth access token

        Returns:
            Dict[str, Any]: User information from GitLab

        Raises:
            HTTPException: If user info request fails
        """
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
                "User-Agent": f"{settings.PROJECT_NAME}/{settings.VERSION}",
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base_url}/user",
                    headers=headers,
                    timeout=30.0,
                )

                if response.status_code == 401:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid GitLab access token",
                    )
                elif response.status_code != 200:
                    logger.error(f"GitLab user info request failed: {response.status_code} - {response.text}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Failed to get GitLab user information",
                    )

                user_data = response.json()
                logger.info(f"Retrieved GitLab user info for user: {user_data.get('username')}")
                return user_data

        except httpx.HTTPError as e:
            logger.error(f"GitLab user info HTTP error: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="GitLab API unavailable",
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"GitLab user info error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get GitLab user information",
            )

    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh GitLab access token using refresh token.

        Args:
            refresh_token (str): GitLab refresh token

        Returns:
            Dict[str, Any]: New token information

        Raises:
            HTTPException: If token refresh fails
        """
        try:
            data = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            }

            headers = {
                "Accept": "application/json",
                "User-Agent": f"{settings.PROJECT_NAME}/{settings.VERSION}",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.token_url,
                    data=data,
                    headers=headers,
                    timeout=30.0,
                )

                if response.status_code != 200:
                    logger.error(f"GitLab token refresh failed: {response.status_code} - {response.text}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Failed to refresh GitLab token",
                    )

                token_data = response.json()
                logger.info("Successfully refreshed GitLab access token")
                return token_data

        except httpx.HTTPError as e:
            logger.error(f"GitLab token refresh HTTP error: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="GitLab OAuth service unavailable",
            )
        except Exception as e:
            logger.error(f"GitLab token refresh error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="GitLab token refresh failed",
            )

    async def revoke_token(self, access_token: str) -> bool:
        """
        Revoke GitLab access token.

        Args:
            access_token (str): GitLab access token to revoke

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            data = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "token": access_token,
            }

            headers = {
                "Accept": "application/json",
                "User-Agent": f"{settings.PROJECT_NAME}/{settings.VERSION}",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://gitlab.com/oauth/revoke",
                    data=data,
                    headers=headers,
                    timeout=30.0,
                )

                if response.status_code == 200:
                    logger.info("Successfully revoked GitLab access token")
                    return True
                else:
                    logger.warning(f"GitLab token revocation failed: {response.status_code}")
                    return False

        except Exception as e:
            logger.error(f"GitLab token revocation error: {e}")
            return False

    async def validate_token(self, access_token: str) -> bool:
        """
        Validate GitLab access token by making a test API call.

        Args:
            access_token (str): GitLab access token to validate

        Returns:
            bool: True if token is valid, False otherwise
        """
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
                "User-Agent": f"{settings.PROJECT_NAME}/{settings.VERSION}",
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base_url}/user",
                    headers=headers,
                    timeout=10.0,
                )

                return response.status_code == 200

        except Exception:
            return False

    def get_scopes(self) -> list[str]:
        """
        Get the list of OAuth scopes required for GitLab integration.

        Returns:
            list[str]: List of required OAuth scopes
        """
        return [
            "api",              # Full API access
            "read_user",        # Read user information
            "read_repository",  # Read repository information
            "write_repository", # Write repository access for webhooks
        ]

    def is_configured(self) -> bool:
        """
        Check if GitLab OAuth is properly configured.

        Returns:
            bool: True if properly configured, False otherwise
        """
        return bool(
            self.client_id and 
            self.client_secret and 
            self.redirect_uri
        )


# Global GitLab OAuth service instance
gitlab_oauth = GitLabOAuth()