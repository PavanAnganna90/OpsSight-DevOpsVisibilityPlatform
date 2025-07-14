"""
Authentication schemas for OAuth2 and SAML SSO integration.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator, EmailStr


class OAuthProviderConfig(BaseModel):
    """OAuth provider configuration."""
    provider_name: str = Field(..., description="Provider name (google, github, azure, etc.)")
    client_id: str = Field(..., description="OAuth client ID")
    client_secret: str = Field(..., description="OAuth client secret")
    authorization_url: str = Field(..., description="OAuth authorization endpoint")
    token_url: str = Field(..., description="OAuth token endpoint")
    user_info_url: str = Field(..., description="User information endpoint")
    scopes: List[str] = Field(default=[], description="Required OAuth scopes")
    enabled: bool = Field(default=True, description="Whether provider is enabled")
    auto_create_users: bool = Field(default=True, description="Auto-create users on first login")
    default_role: Optional[str] = Field(default="viewer", description="Default role for new users")
    domain_restriction: Optional[List[str]] = Field(default=None, description="Allowed email domains")


class SAMLProviderConfig(BaseModel):
    """SAML provider configuration."""
    provider_name: str = Field(..., description="SAML provider name")
    entity_id: str = Field(..., description="SAML entity ID")
    sso_url: str = Field(..., description="SAML SSO endpoint")
    slo_url: Optional[str] = Field(default=None, description="SAML SLO endpoint")
    x509_cert: str = Field(..., description="X.509 certificate for signature verification")
    enabled: bool = Field(default=True, description="Whether provider is enabled")
    auto_create_users: bool = Field(default=True, description="Auto-create users on first login")
    default_role: Optional[str] = Field(default="viewer", description="Default role for new users")
    attribute_mapping: Dict[str, str] = Field(
        default={
            "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
            "first_name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
            "last_name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
            "display_name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
            "groups": "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups"
        },
        description="SAML attribute mapping"
    )
    domain_restriction: Optional[List[str]] = Field(default=None, description="Allowed email domains")


class OAuthLoginRequest(BaseModel):
    """OAuth login request."""
    provider: str = Field(..., description="OAuth provider name")
    redirect_uri: str = Field(..., description="Redirect URI after authentication")
    state: Optional[str] = Field(default=None, description="OAuth state parameter")
    scopes: Optional[List[str]] = Field(default=None, description="Additional scopes to request")


class OAuthCallbackRequest(BaseModel):
    """OAuth callback request."""
    provider: str = Field(..., description="OAuth provider name")
    code: str = Field(..., description="OAuth authorization code")
    state: Optional[str] = Field(default=None, description="OAuth state parameter")
    error: Optional[str] = Field(default=None, description="OAuth error if any")
    error_description: Optional[str] = Field(default=None, description="OAuth error description")


class SAMLLoginRequest(BaseModel):
    """SAML login request."""
    provider: str = Field(..., description="SAML provider name")
    relay_state: Optional[str] = Field(default=None, description="SAML RelayState parameter")


class SAMLResponseRequest(BaseModel):
    """SAML response processing request."""
    provider: str = Field(..., description="SAML provider name")
    saml_response: str = Field(..., description="Base64-encoded SAML response")
    relay_state: Optional[str] = Field(default=None, description="SAML RelayState parameter")


class SSOConfigResponse(BaseModel):
    """SSO configuration response."""
    oauth_providers: List[Dict[str, Any]] = Field(default=[], description="Available OAuth providers")
    saml_providers: List[Dict[str, Any]] = Field(default=[], description="Available SAML providers")
    sso_enabled: bool = Field(default=False, description="Whether SSO is enabled")
    default_provider: Optional[str] = Field(default=None, description="Default SSO provider")


class OAuthUserInfo(BaseModel):
    """OAuth user information."""
    id: str = Field(..., description="Provider user ID")
    email: EmailStr = Field(..., description="User email")
    name: Optional[str] = Field(default=None, description="User full name")
    first_name: Optional[str] = Field(default=None, description="User first name")
    last_name: Optional[str] = Field(default=None, description="User last name")
    avatar_url: Optional[str] = Field(default=None, description="User avatar URL")
    verified: bool = Field(default=False, description="Whether email is verified")
    provider: str = Field(..., description="OAuth provider name")
    raw_data: Dict[str, Any] = Field(default={}, description="Raw provider response")


class SAMLUserInfo(BaseModel):
    """SAML user information."""
    name_id: str = Field(..., description="SAML NameID")
    email: EmailStr = Field(..., description="User email")
    first_name: Optional[str] = Field(default=None, description="User first name")
    last_name: Optional[str] = Field(default=None, description="User last name")
    display_name: Optional[str] = Field(default=None, description="User display name")
    groups: Optional[List[str]] = Field(default=None, description="User groups")
    provider: str = Field(..., description="SAML provider name")
    session_index: Optional[str] = Field(default=None, description="SAML session index")
    attributes: Dict[str, Any] = Field(default={}, description="Raw SAML attributes")


class OAuthProviderInfo(BaseModel):
    """OAuth provider information."""
    provider: str = Field(..., description="Provider identifier")
    name: str = Field(..., description="Provider display name")
    configured: bool = Field(..., description="Whether provider is configured")
    enabled: bool = Field(..., description="Whether provider is enabled")
    description: Optional[str] = Field(default=None, description="Provider description")


class OAuthProviderListResponse(BaseModel):
    """OAuth provider list response."""
    providers: List[OAuthProviderInfo] = Field(..., description="Available providers")
    total_count: int = Field(..., description="Total number of providers")
    enabled_count: int = Field(..., description="Number of enabled providers")


class OAuthAuthorizationUrlResponse(BaseModel):
    """OAuth authorization URL response."""
    authorization_url: str = Field(..., description="OAuth authorization URL")
    provider: str = Field(..., description="Provider name")
    state: Optional[str] = Field(default=None, description="OAuth state parameter")


class SSOSession(BaseModel):
    """SSO session information."""
    session_id: str = Field(..., description="Session identifier")
    provider: str = Field(..., description="SSO provider")
    provider_type: str = Field(..., description="Provider type (oauth2/saml)")
    user_id: str = Field(..., description="User identifier")
    created_at: datetime = Field(..., description="Session creation time")
    expires_at: datetime = Field(..., description="Session expiration time")


class SSOLoginResponse(BaseModel):
    """SSO login response."""
    success: bool = Field(..., description="Whether login was successful")
    access_token: Optional[str] = Field(default=None, description="JWT access token")
    token_type: Optional[str] = Field(default="bearer", description="Token type")
    expires_in: Optional[int] = Field(default=None, description="Token expiration in seconds")
    user: Optional[Dict[str, Any]] = Field(default=None, description="User information")
    error: Optional[str] = Field(default=None, description="Error code if failed")
    error_description: Optional[str] = Field(default=None, description="Error description if failed")


class SSOProviderInfo(BaseModel):
    """SSO provider information."""
    name: str = Field(..., description="Provider name")
    display_name: str = Field(..., description="Display name")
    icon: Optional[str] = Field(default=None, description="Provider icon URL")
    enabled: bool = Field(..., description="Whether provider is enabled")


class SSOProviderStatus(BaseModel):
    """SSO provider status."""
    provider_name: str = Field(..., description="Provider name")
    provider_type: str = Field(..., description="Provider type (oauth2/saml)")
    enabled: bool = Field(..., description="Whether provider is enabled")
    configured: bool = Field(..., description="Whether provider is configured")
    health_status: str = Field(..., description="Health status (healthy/degraded/error)")
    last_checked: datetime = Field(..., description="Last health check time")
    user_count: int = Field(default=0, description="Number of users using this provider")


class SSOHealthCheck(BaseModel):
    """SSO system health check."""
    overall_status: str = Field(..., description="Overall SSO health status")
    enabled_providers: int = Field(..., description="Number of enabled providers")
    total_providers: int = Field(..., description="Total number of providers")
    active_sessions: int = Field(..., description="Number of active SSO sessions")
    providers: List[SSOProviderStatus] = Field(..., description="Individual provider statuses")
    last_updated: datetime = Field(..., description="Last update time")


class SSOSession(BaseModel):
    """SSO session information."""
    session_id: str = Field(..., description="SSO session ID")
    provider: str = Field(..., description="SSO provider name")
    provider_type: str = Field(..., description="Provider type (oauth2 or saml)")
    user_id: str = Field(..., description="User ID")
    created_at: datetime = Field(..., description="Session creation time")
    expires_at: datetime = Field(..., description="Session expiration time")
    provider_session_id: Optional[str] = Field(default=None, description="Provider session ID")
    ip_address: Optional[str] = Field(default=None, description="Client IP address")
    user_agent: Optional[str] = Field(default=None, description="Client user agent")


class SSOConfiguration(BaseModel):
    """Complete SSO configuration."""
    enabled: bool = Field(default=False, description="Whether SSO is enabled")
    require_sso: bool = Field(default=False, description="Whether SSO is required")
    default_provider: Optional[str] = Field(default=None, description="Default SSO provider")
    oauth_providers: List[OAuthProviderConfig] = Field(default=[], description="OAuth providers")
    saml_providers: List[SAMLProviderConfig] = Field(default=[], description="SAML providers")
    session_timeout: int = Field(default=3600, description="SSO session timeout in seconds")
    allow_local_login: bool = Field(default=True, description="Allow local username/password login")
    auto_redirect: bool = Field(default=False, description="Auto-redirect to SSO provider")


class JWTTokenClaims(BaseModel):
    """JWT token claims for SSO integration."""
    sub: str = Field(..., description="Subject (user ID)")
    email: str = Field(..., description="User email")
    name: Optional[str] = Field(default=None, description="User name")
    roles: List[str] = Field(default=[], description="User roles")
    permissions: List[str] = Field(default=[], description="User permissions")
    sso_provider: Optional[str] = Field(default=None, description="SSO provider used")
    sso_session_id: Optional[str] = Field(default=None, description="SSO session ID")
    iat: int = Field(..., description="Issued at timestamp")
    exp: int = Field(..., description="Expiration timestamp")
    iss: str = Field(default="opssight", description="Token issuer")
    aud: str = Field(default="opssight-api", description="Token audience")


class SSOLoginResponse(BaseModel):
    """SSO login response."""
    success: bool = Field(..., description="Whether login was successful")
    access_token: Optional[str] = Field(default=None, description="JWT access token")
    refresh_token: Optional[str] = Field(default=None, description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: Optional[int] = Field(default=None, description="Token expiration in seconds")
    user: Optional[Dict[str, Any]] = Field(default=None, description="User information")
    redirect_url: Optional[str] = Field(default=None, description="Redirect URL for OAuth flow")
    sso_url: Optional[str] = Field(default=None, description="SSO URL for SAML flow")
    error: Optional[str] = Field(default=None, description="Error message if failed")
    error_description: Optional[str] = Field(default=None, description="Detailed error description")


class SSOProviderStatus(BaseModel):
    """SSO provider status."""
    provider_name: str = Field(..., description="Provider name")
    provider_type: str = Field(..., description="Provider type (oauth2 or saml)")
    enabled: bool = Field(..., description="Whether provider is enabled")
    configured: bool = Field(..., description="Whether provider is properly configured")
    health_status: str = Field(..., description="Provider health status")
    last_checked: datetime = Field(..., description="Last health check time")
    error_message: Optional[str] = Field(default=None, description="Last error message")
    user_count: int = Field(default=0, description="Number of users using this provider")


class SSOHealthCheck(BaseModel):
    """SSO system health check."""
    overall_status: str = Field(..., description="Overall SSO system status")
    enabled_providers: int = Field(..., description="Number of enabled providers")
    total_providers: int = Field(..., description="Total number of configured providers")
    active_sessions: int = Field(..., description="Number of active SSO sessions")
    providers: List[SSOProviderStatus] = Field(..., description="Individual provider statuses")
    last_updated: datetime = Field(..., description="Last health check update time")