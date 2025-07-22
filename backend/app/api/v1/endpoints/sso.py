"""
Single Sign-On (SSO) Configuration and Management Endpoints.

This module provides API endpoints for SSO configuration, provider management,
and unified authentication flow handling for both OAuth2 and SAML providers.
"""

from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.core.auth.oauth_providers import OAuthProviderFactory, OAuthProvider
from app.core.auth.saml_provider import get_saml_provider
from app.core.config.settings import settings
from app.schemas.auth import (
    SSOConfigResponse,
    SSOProviderInfo,
    SSOLoginRequest,
    SSOLoginResponse
)

router = APIRouter()


@router.get("/config", response_model=SSOConfigResponse)
async def get_sso_config():
    """
    Get SSO configuration including available OAuth2 and SAML providers.
    
    Returns:
        SSO configuration with available providers and their status.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    oauth_providers = []
    saml_providers = []
    
    # Check OAuth2 providers
    for provider in OAuthProvider:
        try:
            is_configured = OAuthProviderFactory.is_provider_configured(provider)
            logger.info(f"Provider {provider.value} configured: {is_configured}")
            if is_configured:
                oauth_providers.append({
                    "name": provider.value,
                    "display_name": provider.value.title(),
                    "icon": f"/icons/{provider.value}.svg",
                    "enabled": True
                })
        except Exception as e:
            logger.error(f"Error checking provider {provider.value}: {e}")
            pass
    
    # Check SAML providers
    try:
        saml_provider = get_saml_provider()
        
        # Check if basic SAML is configured
        saml_configured = bool(
            getattr(settings, 'SAML_SP_ENTITY_ID', None) and
            getattr(settings, 'SAML_ACS_URL', None) and
            getattr(settings, 'SAML_IDP_ENTITY_ID', None) and
            getattr(settings, 'SAML_IDP_SSO_URL', None)
        )
        
        if saml_configured:
            # Azure AD SAML
            if getattr(settings, 'SAML_IDP_ENTITY_ID', '').find('azure') != -1:
                saml_providers.append(SSOProviderInfo(
                    name="azure_saml",
                    display_name="Azure Active Directory",
                    icon="azure",
                    enabled=True,
                    type="saml",
                    configured=True
                ))
            
            # Generic SAML
            saml_providers.append(SSOProviderInfo(
                name="saml",
                display_name="SAML SSO",
                icon="saml",
                enabled=True,
                type="saml",
                configured=True
            ))
            
    except Exception:
        # SAML not available
        pass
    
    logger.info(f"Returning oauth_providers: {oauth_providers}")
    logger.info(f"Returning saml_providers: {saml_providers}")
    
    return SSOConfigResponse(
        oauth_providers=oauth_providers,
        saml_providers=saml_providers,
        sso_enabled=len(oauth_providers + saml_providers) > 0,
        default_provider=None
    )


@router.post("/oauth/{provider}/login", response_model=SSOLoginResponse)
async def initiate_oauth_login(
    provider: str,
    request: SSOLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Initiate OAuth2 login flow.
    
    Args:
        provider: OAuth provider name
        request: OAuth login request details
    
    Returns:
        OAuth authorization URL and state for redirection.
    """
    try:
        # Validate provider
        provider_enum = OAuthProvider(provider.lower())
        
        if not OAuthProviderFactory.is_provider_configured(provider_enum):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"OAuth provider '{provider}' is not configured"
            )
        
        # Create provider instance
        oauth_provider = OAuthProviderFactory.create_provider(provider_enum)
        
        # Generate state if not provided
        state = request.state or f"oauth_{provider}_{id(request)}"
        
        # Generate authorization URL
        authorization_url = oauth_provider.get_authorization_url(state)
        
        return SSOLoginResponse(
            success=True,
            redirect_url=authorization_url,
            state=state,
            provider=provider,
            type="oauth2"
        )
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider: {provider}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate OAuth login: {str(e)}"
        )


@router.post("/saml/{provider}/login", response_model=SSOLoginResponse)
async def initiate_saml_login(
    provider: str,
    request: SSOLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Initiate SAML SSO login flow.
    
    Args:
        provider: SAML provider name  
        request: SAML login request details
    
    Returns:
        SAML SSO URL and relay state for redirection.
    """
    try:
        saml_provider = get_saml_provider()
        
        # Generate relay state if not provided
        relay_state = request.state or f"saml_{provider}_{id(request)}"
        
        # Generate SAML login URL
        sso_url = saml_provider.get_login_url(return_to=relay_state)
        
        return SSOLoginResponse(
            success=True,
            sso_url=sso_url,
            relay_state=relay_state,
            provider=provider,
            type="saml"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate SAML login: {str(e)}"
        )


@router.get("/providers")
async def list_all_sso_providers():
    """
    List all available SSO providers (OAuth2 + SAML) with their status.
    
    Returns:
        Comprehensive list of SSO providers and configuration status.
    """
    config = await get_sso_config()
    
    all_providers = config.oauth_providers + config.saml_providers
    
    return {
        "providers": all_providers,
        "total_count": len(all_providers),
        "enabled_count": len([p for p in all_providers if p.enabled]),
        "oauth_count": len(config.oauth_providers),
        "saml_count": len(config.saml_providers),
        "sso_enabled": config.sso_enabled
    }


@router.get("/health")
async def check_sso_health():
    """
    Check overall SSO system health status.
    
    Returns:
        Health status for all SSO providers and the overall system.
    """
    oauth_health = []
    saml_health = []
    
    # Check OAuth providers
    for provider in OAuthProvider:
        try:
            is_configured = OAuthProviderFactory.is_provider_configured(provider)
            oauth_health.append({
                "provider": provider.value,
                "type": "oauth2",
                "status": "configured" if is_configured else "not_configured",
                "enabled": is_configured
            })
        except Exception as e:
            oauth_health.append({
                "provider": provider.value,
                "type": "oauth2", 
                "status": "error",
                "enabled": False,
                "error": str(e)
            })
    
    # Check SAML provider
    try:
        saml_provider = get_saml_provider()
        saml_configured = bool(
            getattr(settings, 'SAML_SP_ENTITY_ID', None) and
            getattr(settings, 'SAML_ACS_URL', None)
        )
        
        saml_health.append({
            "provider": "saml",
            "type": "saml",
            "status": "configured" if saml_configured else "not_configured",
            "enabled": saml_configured
        })
        
    except Exception as e:
        saml_health.append({
            "provider": "saml",
            "type": "saml",
            "status": "error",
            "enabled": False,
            "error": str(e)
        })
    
    all_providers = oauth_health + saml_health
    healthy_providers = [p for p in all_providers if p["enabled"]]
    
    return {
        "overall_status": "healthy" if len(healthy_providers) > 0 else "degraded",
        "total_providers": len(all_providers),
        "healthy_providers": len(healthy_providers),
        "oauth_providers": oauth_health,
        "saml_providers": saml_health,
        "sso_available": len(healthy_providers) > 0
    }