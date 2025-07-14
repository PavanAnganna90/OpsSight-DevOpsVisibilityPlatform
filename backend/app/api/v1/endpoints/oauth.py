"""
OAuth 2.0 Authentication Endpoints.

This module provides API endpoints for OAuth2 authentication flows
supporting multiple providers including Google, Microsoft, GitLab, and GitHub.
"""

from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.core.auth.oauth_providers import (
    OAuthProviderFactory, 
    OAuthProvider, 
    BaseOAuthProvider
)
from app.services.sso_service import SSOService
from app.schemas.auth import (
    OAuthAuthorizationUrlResponse,
    OAuthProviderListResponse,
    OAuthProviderInfo,
    SSOLoginResponse
)

router = APIRouter()


@router.get("/providers", response_model=OAuthProviderListResponse)
async def list_oauth_providers():
    """
    List available OAuth providers and their configuration status.
    
    Returns information about which OAuth providers are available
    and properly configured for authentication.
    """
    providers = []
    
    for provider in OAuthProvider:
        try:
            is_configured = OAuthProviderFactory.is_provider_configured(provider)
            oauth_provider = OAuthProviderFactory.create_provider(provider) if is_configured else None
            
            providers.append(OAuthProviderInfo(
                provider=provider.value,
                name=provider.value.title(),
                configured=is_configured,
                enabled=is_configured,  # Enable if configured
                description=f"{provider.value.title()} OAuth 2.0 authentication"
            ))
        except Exception:
            # Provider not available or misconfigured
            providers.append(OAuthProviderInfo(
                provider=provider.value,
                name=provider.value.title(),
                configured=False,
                enabled=False,
                description=f"{provider.value.title()} OAuth 2.0 authentication (not configured)"
            ))
    
    return OAuthProviderListResponse(
        providers=providers,
        total_count=len(providers),
        enabled_count=len([p for p in providers if p.enabled])
    )


@router.get("/{provider}/authorize", response_model=OAuthAuthorizationUrlResponse)
async def get_oauth_authorization_url(
    provider: str,
    redirect_uri: Optional[str] = None,
    state: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get OAuth authorization URL for the specified provider.
    
    Args:
        provider: OAuth provider name (github, google, microsoft, gitlab)
        redirect_uri: Custom redirect URI (optional)
        state: Custom state parameter for CSRF protection (optional)
    
    Returns:
        Authorization URL and state parameter for OAuth flow initiation.
    """
    try:
        # Validate provider
        provider_enum = OAuthProvider(provider.lower())
        
        # Check if provider is configured
        if not OAuthProviderFactory.is_provider_configured(provider_enum):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"OAuth provider '{provider}' is not configured"
            )
        
        # Create provider instance
        oauth_provider = OAuthProviderFactory.create_provider(provider_enum)
        
        # Use SSO service for URL generation (includes state management)
        sso_service = SSOService(db)
        
        # Use default redirect URI if not provided
        if not redirect_uri:
            redirect_uri = f"/auth/callback/{provider}"
        
        authorization_url = await sso_service.get_oauth_authorization_url(
            provider=provider,
            redirect_uri=redirect_uri,
            state=state
        )
        
        return OAuthAuthorizationUrlResponse(
            authorization_url=authorization_url,
            provider=provider,
            state=state
        )
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider: {provider}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate authorization URL: {str(e)}"
        )


@router.get("/{provider}/callback")
async def handle_oauth_callback(
    provider: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None
):
    """
    Handle OAuth callback from the provider.
    
    This endpoint processes the authorization code received from the OAuth provider
    and completes the authentication flow.
    
    Args:
        provider: OAuth provider name
        code: Authorization code from provider
        state: State parameter for CSRF validation
        error: Error code from provider (if any)
        error_description: Error description from provider (if any)
    
    Returns:
        Redirect to frontend with authentication result or JWT token.
    """
    # Handle OAuth errors
    if error:
        error_msg = error_description or error
        # Redirect to frontend with error
        return RedirectResponse(
            url=f"/auth/error?error={error}&description={error_msg}",
            status_code=status.HTTP_302_FOUND
        )
    
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization code not provided"
        )
    
    try:
        # Validate provider
        provider_enum = OAuthProvider(provider.lower())
        
        if not OAuthProviderFactory.is_provider_configured(provider_enum):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"OAuth provider '{provider}' is not configured"
            )
        
        # Use SSO service to handle callback
        sso_service = SSOService(db)
        
        # Get redirect URI from request
        redirect_uri = str(request.url_for("handle_oauth_callback", provider=provider))
        
        # Process callback
        login_response = await sso_service.handle_oauth_callback(
            provider=provider,
            code=code,
            state=state,
            redirect_uri=redirect_uri
        )
        
        if login_response.success:
            # Redirect to frontend with token
            frontend_url = f"/auth/success?token={login_response.access_token}"
            return RedirectResponse(url=frontend_url, status_code=status.HTTP_302_FOUND)
        else:
            # Redirect to frontend with error
            error_url = f"/auth/error?error={login_response.error}&description={login_response.error_description}"
            return RedirectResponse(url=error_url, status_code=status.HTTP_302_FOUND)
            
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider: {provider}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth callback processing failed: {str(e)}"
        )


@router.post("/{provider}/token", response_model=SSOLoginResponse)
async def exchange_oauth_token(
    provider: str,
    code: str,
    redirect_uri: str,
    state: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Exchange OAuth authorization code for access token (API endpoint).
    
    This is an alternative to the callback endpoint for programmatic access.
    
    Args:
        provider: OAuth provider name
        code: Authorization code from provider
        redirect_uri: Redirect URI used in authorization request
        state: State parameter for validation
    
    Returns:
        JWT access token and user information.
    """
    try:
        # Validate provider
        provider_enum = OAuthProvider(provider.lower())
        
        if not OAuthProviderFactory.is_provider_configured(provider_enum):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"OAuth provider '{provider}' is not configured"
            )
        
        # Use SSO service to handle token exchange
        sso_service = SSOService(db)
        
        login_response = await sso_service.handle_oauth_callback(
            provider=provider,
            code=code,
            state=state,
            redirect_uri=redirect_uri
        )
        
        return login_response
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider: {provider}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token exchange failed: {str(e)}"
        )


@router.get("/{provider}/health")
async def check_oauth_provider_health(provider: str):
    """
    Check the health status of a specific OAuth provider.
    
    Args:
        provider: OAuth provider name
    
    Returns:
        Health status information for the provider.
    """
    try:
        # Validate provider
        provider_enum = OAuthProvider(provider.lower())
        
        is_configured = OAuthProviderFactory.is_provider_configured(provider_enum)
        
        if not is_configured:
            return {
                "provider": provider,
                "status": "not_configured",
                "configured": False,
                "message": f"OAuth provider '{provider}' is not configured"
            }
        
        # Create provider instance and check basic connectivity
        oauth_provider = OAuthProviderFactory.create_provider(provider_enum)
        
        # Basic health check - try to access authorization URL
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(oauth_provider.auth_url, timeout=5.0)
                if response.status_code < 500:
                    status_result = "healthy"
                else:
                    status_result = "degraded"
        except Exception:
            status_result = "error"
        
        return {
            "provider": provider,
            "status": status_result,
            "configured": True,
            "auth_url": oauth_provider.auth_url,
            "message": f"OAuth provider '{provider}' health check completed"
        }
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider: {provider}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Health check failed: {str(e)}"
        )