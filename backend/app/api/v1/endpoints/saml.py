"""
SAML 2.0 Authentication Endpoints.

This module provides API endpoints for SAML 2.0 SSO authentication flows
supporting enterprise identity providers like Azure AD, Okta, and others.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Form
from fastapi.responses import Response, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.core.auth.saml_provider import get_saml_provider, SAMLError
from app.services.sso_service import SSOService
from app.schemas.auth import SSOLoginResponse

router = APIRouter()


@router.get("/metadata")
async def get_saml_metadata():
    """
    Get SAML Service Provider metadata.
    
    Returns the SP metadata XML that should be provided to the Identity Provider
    for configuration. This includes the ACS URL, entity ID, and other SP details.
    """
    try:
        saml_provider = get_saml_provider()
        metadata = saml_provider.get_metadata()
        
        return Response(
            content=metadata,
            media_type="application/xml",
            headers={
                "Content-Disposition": "attachment; filename=sp-metadata.xml"
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate SAML metadata: {str(e)}"
        )


@router.get("/login")
async def initiate_saml_login(
    idp: Optional[str] = None,
    relay_state: Optional[str] = None
):
    """
    Initiate SAML SSO login.
    
    Args:
        idp: Identity Provider identifier (optional)
        relay_state: Relay state to be returned after authentication
    
    Returns:
        Redirect to Identity Provider for authentication.
    """
    try:
        saml_provider = get_saml_provider()
        
        # Generate login URL
        login_url = saml_provider.get_login_url(return_to=relay_state)
        
        return RedirectResponse(url=login_url, status_code=status.HTTP_302_FOUND)
        
    except SAMLError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SAML login initiation failed: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate SAML login: {str(e)}"
        )


@router.post("/acs", response_model=SSOLoginResponse)
async def handle_saml_assertion(
    request: Request,
    db: AsyncSession = Depends(get_db),
    SAMLResponse: str = Form(...),
    RelayState: Optional[str] = Form(None)
):
    """
    Handle SAML Assertion Consumer Service (ACS) POST.
    
    This endpoint receives the SAML response from the Identity Provider
    after successful authentication and processes it to create a user session.
    
    Args:
        SAMLResponse: Base64-encoded SAML response from IdP
        RelayState: Relay state returned from IdP
    
    Returns:
        JWT access token and user information or redirect response.
    """
    try:
        saml_provider = get_saml_provider()
        
        # Process SAML response
        user_info = saml_provider.process_response(SAMLResponse)
        
        # Use SSO service to handle user creation/authentication
        sso_service = SSOService(db)
        
        # For now, use a generic SAML provider name
        # In a real implementation, you'd determine the provider from the response
        provider_name = "saml"
        
        login_response = await sso_service.handle_saml_response(
            provider=provider_name,
            saml_response=SAMLResponse,
            relay_state=RelayState
        )
        
        if login_response.success:
            # If RelayState contains a redirect URL, redirect there with token
            if RelayState and RelayState.startswith(('http://', 'https://')):
                redirect_url = f"{RelayState}?token={login_response.access_token}"
                return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
            else:
                # Return JSON response with token
                return login_response
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"SAML authentication failed: {login_response.error_description}"
            )
            
    except SAMLError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SAML response processing failed: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SAML ACS processing failed: {str(e)}"
        )


@router.get("/logout")
async def initiate_saml_logout(
    name_id: Optional[str] = None,
    session_index: Optional[str] = None,
    return_to: Optional[str] = None
):
    """
    Initiate SAML Single Logout (SLO).
    
    Args:
        name_id: User's SAML NameID
        session_index: SAML session index
        return_to: URL to redirect to after logout
    
    Returns:
        Redirect to Identity Provider for logout.
    """
    try:
        saml_provider = get_saml_provider()
        
        # Generate logout URL
        logout_url = saml_provider.get_logout_url(
            return_to=return_to,
            name_id=name_id,
            session_index=session_index
        )
        
        return RedirectResponse(url=logout_url, status_code=status.HTTP_302_FOUND)
        
    except SAMLError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SAML logout initiation failed: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate SAML logout: {str(e)}"
        )


@router.post("/sls")
async def handle_saml_logout(
    request: Request,
    SAMLRequest: Optional[str] = Form(None),
    SAMLResponse: Optional[str] = Form(None),
    RelayState: Optional[str] = Form(None)
):
    """
    Handle SAML Single Logout Service (SLS).
    
    This endpoint processes SLO requests and responses from the Identity Provider.
    
    Args:
        SAMLRequest: SAML logout request (if initiated by IdP)
        SAMLResponse: SAML logout response (if initiated by SP)
        RelayState: Relay state
    
    Returns:
        Appropriate response based on SLO flow.
    """
    try:
        saml_provider = get_saml_provider()
        
        if SAMLRequest:
            # Process logout request from IdP
            response_url = saml_provider.process_slo_request(SAMLRequest)
            return RedirectResponse(url=response_url, status_code=status.HTTP_302_FOUND)
            
        elif SAMLResponse:
            # Process logout response from IdP
            # In this case, just redirect to a logout success page
            logout_url = RelayState or "/auth/logout-success"
            return RedirectResponse(url=logout_url, status_code=status.HTTP_302_FOUND)
            
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No SAML request or response provided"
            )
            
    except SAMLError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SAML SLO processing failed: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SAML SLS processing failed: {str(e)}"
        )


@router.get("/health")
async def check_saml_health():
    """
    Check SAML provider health status.
    
    Returns:
        Health status information for SAML configuration.
    """
    try:
        saml_provider = get_saml_provider()
        
        # Basic health check - ensure we can generate metadata
        try:
            metadata = saml_provider.get_metadata()
            status_result = "healthy" if metadata else "error"
        except Exception:
            status_result = "error"
        
        # Check if SAML settings are configured
        from app.core.config.settings import settings
        
        configured = bool(
            getattr(settings, 'SAML_SP_ENTITY_ID', None) and
            getattr(settings, 'SAML_ACS_URL', None)
        )
        
        return {
            "provider": "saml",
            "status": status_result,
            "configured": configured,
            "sp_entity_id": getattr(settings, 'SAML_SP_ENTITY_ID', None),
            "acs_url": getattr(settings, 'SAML_ACS_URL', None),
            "message": "SAML provider health check completed"
        }
        
    except Exception as e:
        return {
            "provider": "saml",
            "status": "error",
            "configured": False,
            "message": f"SAML health check failed: {str(e)}"
        }


@router.get("/providers")
async def list_saml_providers():
    """
    List configured SAML Identity Providers.
    
    Returns:
        List of available SAML IdPs and their configuration status.
    """
    from app.core.config.settings import settings
    
    providers = []
    
    # Check for Azure AD SAML
    if hasattr(settings, 'SAML_IDP_ENTITY_ID') and settings.SAML_IDP_ENTITY_ID:
        providers.append({
            "provider": "azure_ad",
            "name": "Azure Active Directory",
            "entity_id": settings.SAML_IDP_ENTITY_ID,
            "sso_url": getattr(settings, 'SAML_IDP_SSO_URL', None),
            "configured": bool(settings.SAML_IDP_ENTITY_ID and 
                             getattr(settings, 'SAML_IDP_SSO_URL', None)),
            "enabled": True
        })
    
    # Add more providers based on configuration
    # This would be expanded based on actual provider configurations
    
    return {
        "providers": providers,
        "total_count": len(providers),
        "enabled_count": len([p for p in providers if p.get("enabled", False)])
    }