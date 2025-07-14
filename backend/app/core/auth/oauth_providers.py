"""
OAuth2 Provider System for Multi-Provider Authentication.

This module provides a flexible OAuth2 authentication system that supports
multiple providers including GitHub, Google, Microsoft, and GitLab.
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Dict, Optional, List, Any
import httpx
from urllib.parse import urlencode
from dataclasses import dataclass

from app.core.config.settings import settings


class OAuthProvider(str, Enum):
    """Supported OAuth providers."""
    GITHUB = "github"
    GOOGLE = "google"
    MICROSOFT = "microsoft"
    GITLAB = "gitlab"


@dataclass
class OAuthUserInfo:
    """Standardized user information from OAuth providers."""
    provider: str
    provider_id: str
    email: str
    name: str
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None


class BaseOAuthProvider(ABC):
    """Base class for OAuth providers."""
    
    def __init__(self):
        self.client_id = self.get_client_id()
        self.client_secret = self.get_client_secret()
        self.callback_url = self.get_callback_url()
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the provider name."""
        pass
    
    @property
    @abstractmethod
    def auth_url(self) -> str:
        """Return the authorization URL."""
        pass
    
    @property
    @abstractmethod
    def token_url(self) -> str:
        """Return the token exchange URL."""
        pass
    
    @property
    @abstractmethod
    def user_info_url(self) -> str:
        """Return the user info URL."""
        pass
    
    @property
    @abstractmethod
    def scope(self) -> str:
        """Return the required OAuth scope."""
        pass
    
    @abstractmethod
    def get_client_id(self) -> str:
        """Get client ID from settings."""
        pass
    
    @abstractmethod
    def get_client_secret(self) -> str:
        """Get client secret from settings."""
        pass
    
    @abstractmethod
    def get_callback_url(self) -> str:
        """Get callback URL from settings."""
        pass
    
    @abstractmethod
    async def parse_user_info(self, user_data: Dict[str, Any]) -> OAuthUserInfo:
        """Parse provider-specific user data into standardized format."""
        pass
    
    def get_authorization_url(self, state: str) -> str:
        """Generate OAuth authorization URL."""
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.callback_url,
            "scope": self.scope,
            "state": state,
            "response_type": "code",
        }
        return f"{self.auth_url}?{urlencode(params)}"
    
    async def exchange_code_for_token(self, code: str) -> Optional[str]:
        """Exchange authorization code for access token."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.token_url,
                    data={
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "code": code,
                        "redirect_uri": self.callback_url,
                        "grant_type": "authorization_code",
                    },
                    headers={"Accept": "application/json"},
                )
                response.raise_for_status()
                data = response.json()
                return data.get("access_token")
            except httpx.HTTPError:
                return None
    
    async def get_user_info(self, access_token: str) -> Optional[OAuthUserInfo]:
        """Fetch and parse user information."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.user_info_url,
                    headers=self.get_auth_headers(access_token),
                )
                response.raise_for_status()
                user_data = response.json()
                return await self.parse_user_info(user_data)
            except httpx.HTTPError:
                return None
    
    def get_auth_headers(self, access_token: str) -> Dict[str, str]:
        """Get authentication headers for API requests."""
        return {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }


class GitHubOAuthProvider(BaseOAuthProvider):
    """GitHub OAuth provider implementation."""
    
    @property
    def provider_name(self) -> str:
        return OAuthProvider.GITHUB.value
    
    @property
    def auth_url(self) -> str:
        return "https://github.com/login/oauth/authorize"
    
    @property
    def token_url(self) -> str:
        return "https://github.com/login/oauth/access_token"
    
    @property
    def user_info_url(self) -> str:
        return "https://api.github.com/user"
    
    @property
    def scope(self) -> str:
        return "read:user user:email"
    
    def get_client_id(self) -> str:
        return settings.GITHUB_CLIENT_ID
    
    def get_client_secret(self) -> str:
        return settings.GITHUB_CLIENT_SECRET
    
    def get_callback_url(self) -> str:
        return str(settings.GITHUB_CALLBACK_URL)
    
    def get_auth_headers(self, access_token: str) -> Dict[str, str]:
        """GitHub uses 'token' prefix for authorization."""
        return {
            "Authorization": f"token {access_token}",
            "Accept": "application/json",
        }
    
    async def parse_user_info(self, user_data: Dict[str, Any]) -> OAuthUserInfo:
        """Parse GitHub user data."""
        return OAuthUserInfo(
            provider=self.provider_name,
            provider_id=str(user_data.get("id", "")),
            email=user_data.get("email", ""),
            name=user_data.get("name", ""),
            username=user_data.get("login"),
            avatar_url=user_data.get("avatar_url"),
            raw_data=user_data,
        )


class GoogleOAuthProvider(BaseOAuthProvider):
    """Google OAuth provider implementation."""
    
    @property
    def provider_name(self) -> str:
        return OAuthProvider.GOOGLE.value
    
    @property
    def auth_url(self) -> str:
        return "https://accounts.google.com/o/oauth2/v2/auth"
    
    @property
    def token_url(self) -> str:
        return "https://oauth2.googleapis.com/token"
    
    @property
    def user_info_url(self) -> str:
        return "https://www.googleapis.com/oauth2/v2/userinfo"
    
    @property
    def scope(self) -> str:
        return "openid email profile"
    
    def get_client_id(self) -> str:
        return settings.GOOGLE_CLIENT_ID
    
    def get_client_secret(self) -> str:
        return settings.GOOGLE_CLIENT_SECRET
    
    def get_callback_url(self) -> str:
        return str(settings.GOOGLE_CALLBACK_URL)
    
    async def parse_user_info(self, user_data: Dict[str, Any]) -> OAuthUserInfo:
        """Parse Google user data."""
        return OAuthUserInfo(
            provider=self.provider_name,
            provider_id=str(user_data.get("id", "")),
            email=user_data.get("email", ""),
            name=user_data.get("name", ""),
            username=user_data.get("email", "").split("@")[0],
            avatar_url=user_data.get("picture"),
            raw_data=user_data,
        )


class MicrosoftOAuthProvider(BaseOAuthProvider):
    """Microsoft OAuth provider implementation."""
    
    @property
    def provider_name(self) -> str:
        return OAuthProvider.MICROSOFT.value
    
    @property
    def auth_url(self) -> str:
        return "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
    
    @property
    def token_url(self) -> str:
        return "https://login.microsoftonline.com/common/oauth2/v2.0/token"
    
    @property
    def user_info_url(self) -> str:
        return "https://graph.microsoft.com/v1.0/me"
    
    @property
    def scope(self) -> str:
        return "openid email profile User.Read"
    
    def get_client_id(self) -> str:
        return settings.MICROSOFT_CLIENT_ID
    
    def get_client_secret(self) -> str:
        return settings.MICROSOFT_CLIENT_SECRET
    
    def get_callback_url(self) -> str:
        return str(settings.MICROSOFT_CALLBACK_URL)
    
    async def parse_user_info(self, user_data: Dict[str, Any]) -> OAuthUserInfo:
        """Parse Microsoft user data."""
        return OAuthUserInfo(
            provider=self.provider_name,
            provider_id=str(user_data.get("id", "")),
            email=user_data.get("mail") or user_data.get("userPrincipalName", ""),
            name=user_data.get("displayName", ""),
            username=user_data.get("userPrincipalName", "").split("@")[0],
            avatar_url=None,  # Microsoft Graph requires additional API call for photo
            raw_data=user_data,
        )


class GitLabOAuthProvider(BaseOAuthProvider):
    """GitLab OAuth provider implementation."""
    
    @property
    def provider_name(self) -> str:
        return OAuthProvider.GITLAB.value
    
    @property
    def auth_url(self) -> str:
        return "https://gitlab.com/oauth/authorize"
    
    @property
    def token_url(self) -> str:
        return "https://gitlab.com/oauth/token"
    
    @property
    def user_info_url(self) -> str:
        return "https://gitlab.com/api/v4/user"
    
    @property
    def scope(self) -> str:
        return "read_user"
    
    def get_client_id(self) -> str:
        return settings.GITLAB_CLIENT_ID
    
    def get_client_secret(self) -> str:
        return settings.GITLAB_CLIENT_SECRET
    
    def get_callback_url(self) -> str:
        return str(settings.GITLAB_CALLBACK_URL)
    
    async def parse_user_info(self, user_data: Dict[str, Any]) -> OAuthUserInfo:
        """Parse GitLab user data."""
        return OAuthUserInfo(
            provider=self.provider_name,
            provider_id=str(user_data.get("id", "")),
            email=user_data.get("email", ""),
            name=user_data.get("name", ""),
            username=user_data.get("username"),
            avatar_url=user_data.get("avatar_url"),
            raw_data=user_data,
        )


class OAuthProviderFactory:
    """Factory for creating OAuth provider instances."""
    
    _providers = {
        OAuthProvider.GITHUB: GitHubOAuthProvider,
        OAuthProvider.GOOGLE: GoogleOAuthProvider,
        OAuthProvider.MICROSOFT: MicrosoftOAuthProvider,
        OAuthProvider.GITLAB: GitLabOAuthProvider,
    }
    
    @classmethod
    def create_provider(cls, provider: OAuthProvider) -> BaseOAuthProvider:
        """Create an OAuth provider instance."""
        provider_class = cls._providers.get(provider)
        if not provider_class:
            raise ValueError(f"Unsupported OAuth provider: {provider}")
        return provider_class()
    
    @classmethod
    def get_available_providers(cls) -> List[str]:
        """Get list of available OAuth providers."""
        return [provider.value for provider in cls._providers.keys()]
    
    @classmethod
    def is_provider_configured(cls, provider: OAuthProvider) -> bool:
        """Check if a provider is properly configured."""
        try:
            provider_instance = cls.create_provider(provider)
            return bool(
                provider_instance.client_id 
                and provider_instance.client_secret 
                and provider_instance.callback_url
            )
        except (ValueError, AttributeError):
            return False


# Convenience functions for backward compatibility
async def get_github_oauth_provider() -> GitHubOAuthProvider:
    """Get GitHub OAuth provider instance."""
    return OAuthProviderFactory.create_provider(OAuthProvider.GITHUB)


async def get_oauth_provider(provider: str) -> BaseOAuthProvider:
    """Get OAuth provider instance by name."""
    provider_enum = OAuthProvider(provider.lower())
    return OAuthProviderFactory.create_provider(provider_enum)