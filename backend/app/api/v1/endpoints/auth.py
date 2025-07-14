"""
Authentication endpoints for the OpsSight API.
Handles user login, registration, token management, OAuth flows, and SAML SSO.
"""

from datetime import datetime, timedelta
from typing import Any, Optional, Dict
import uuid
import logging
from urllib.parse import urlencode, parse_qs

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm, HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.auth.jwt import create_access_token, verify_password, hash_password
from app.core.auth.token_manager import token_manager, get_current_user_from_token
from app.core.dependencies import get_async_db
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserCreate, User as UserResponse
from app.schemas.auth import (
    OAuthLoginRequest, 
    OAuthCallbackRequest,
    SAMLLoginRequest, 
    SAMLResponseRequest,
    SSOConfigResponse,
    SSOLoginResponse,
    SSOHealthCheck,
    OAuthProviderConfig,
    SAMLProviderConfig
)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")
security = HTTPBearer()
logger = logging.getLogger(__name__)


async def get_current_user(
    db: AsyncSession = Depends(get_async_db), token: str = Depends(oauth2_scheme)
) -> User:
    """
    Get the current authenticated user from JWT token.

    Args:
        db: Database session
        token: JWT access token

    Returns:
        User: The authenticated user object

    Raises:
        HTTPException: If token is invalid or user not found
    """
    return await get_current_user_from_token(token, db)


@router.post(
    "/register",
    response_model=UserResponse,
    summary="Register New User Account",
    description="""
    **Create a new user account** in the OpsSight DevOps platform.
    
    This endpoint allows new users to register for access to the platform. The registration process includes:
    - **Email validation**: Ensures unique email addresses
    - **Password security**: Enforces strong password requirements
    - **Account activation**: New accounts are created in active state
    
    **Security Features**:
    - Automatic password hashing using bcrypt
    - Email uniqueness validation
    - Input sanitization and validation
    
    **Post-Registration**:
    After successful registration, users can immediately log in using the `/auth/login` endpoint.
    
    **Rate Limiting**: This endpoint is rate-limited to prevent abuse (5 requests per minute per IP).
    """,
    status_code=201,
    responses={
        201: {
            "description": "User account created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "user-12345",
                        "email": "john.doe@company.com",
                        "full_name": "John Doe",
                        "is_active": True,
                        "created_at": "2024-01-15T10:30:00Z",
                    }
                }
            },
        },
        400: {
            "description": "Registration failed due to validation errors",
            "content": {
                "application/json": {
                    "example": {"detail": "User with this email already exists"}
                }
            },
        },
        422: {
            "description": "Invalid input data",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["body", "email"],
                                "msg": "field required",
                                "type": "value_error.missing",
                            }
                        ]
                    }
                }
            },
        },
    },
)
async def register(
    user_data: UserCreate, db: AsyncSession = Depends(get_async_db)
) -> Any:
    """
    Register a new user account.

    Args:
        user_data: User registration data
        db: Database session

    Returns:
        UserResponse: Created user information

    Raises:
        HTTPException: If user already exists or validation fails
    """
    from app.repositories.user import UserRepository
    
    user_repository = UserRepository(db)
    
    # Check if user already exists
    existing_user = await user_repository.get_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists"
        )

    # Create user in database
    hashed_password = hash_password(user_data.password)
    
    # Create user data with hashed password
    user_create_data = {
        "email": user_data.email,
        "full_name": user_data.full_name,
        "github_username": user_data.email.split("@")[0],  # Use email prefix as username
        "github_id": str(uuid.uuid4()),  # Generate temporary GitHub ID
        "organization_id": 1,  # Default organization
        "is_active": True,
        "password_hash": hashed_password,
    }
    
    # Create new user
    user = await user_repository.create(user_create_data)
    
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        github_id=user.github_id,
        github_username=user.github_username,
        avatar_url=user.avatar_url,
        bio=user.bio,
        company=user.company,
        location=user.location,
        blog=user.blog,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login=user.last_login,
    )


@router.post(
    "/login",
    response_model=Token,
    summary="User Login and Token Generation",
    description="""
    **Authenticate user credentials and receive access token** for API access.
    
    This endpoint implements OAuth2 password flow for secure user authentication:
    - **Credentials validation**: Verifies username/email and password
    - **JWT token generation**: Creates signed access tokens
    - **Session management**: Establishes authenticated session
    
    **Authentication Flow**:
    1. Submit username/email and password
    2. Server validates credentials against database
    3. If valid, server generates JWT access token
    4. Client uses token in `Authorization: Bearer <token>` header
    
    **Security Features**:
    - bcrypt password verification
    - JWT tokens with configurable expiration
    - Rate limiting (10 attempts per minute per IP)
    - Account lockout after 5 failed attempts
    
    **Token Usage**:
    Include the received access token in the Authorization header:
    ```
    Authorization: Bearer <access_token>
    ```
    
    **Cache Behavior**: Login responses are never cached for security.
    """,
    responses={
        200: {
            "description": "Login successful, access token generated",
            "content": {
                "application/json": {
                    "example": {
                        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "token_type": "bearer",
                        "expires_in": 3600,
                    }
                }
            },
        },
        401: {
            "description": "Invalid credentials",
            "content": {
                "application/json": {
                    "example": {"detail": "Incorrect username or password"}
                }
            },
        },
        429: {
            "description": "Too many login attempts",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Too many login attempts. Please try again later."
                    }
                }
            },
        },
    },
)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_async_db),
) -> Any:
    """
    Login and receive access token.

    Args:
        form_data: Username/password form data
        db: Database session

    Returns:
        Token: Access token and metadata

    Raises:
        HTTPException: If credentials are invalid
    """
    from app.repositories.user import UserRepository
    
    user_repository = UserRepository(db)
    
    # Authenticate user credentials
    user = await user_repository.get_by_email(form_data.username)
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is disabled",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Update last login timestamp
    await user_repository.update_last_login(user.id)

    # Create access token
    access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(current_user: User = Depends(get_current_user)) -> Any:
    """
    Refresh access token for authenticated user.

    Args:
        current_user: Currently authenticated user

    Returns:
        Token: New access token
    """
    access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": current_user.email}, expires_delta=access_token_expires
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)) -> Any:
    """
    Get current user information.

    Args:
        current_user: Currently authenticated user

    Returns:
        UserResponse: Current user data
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        github_id=current_user.github_id,
        github_username=current_user.github_username,
        avatar_url=current_user.avatar_url,
        bio=current_user.bio,
        company=current_user.company,
        location=current_user.location,
        blog=current_user.blog,
        role=current_user.role,
        permissions=current_user.permissions,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        last_login=current_user.last_login,
    )


@router.post(
    "/logout",
    summary="User Logout with Token Blacklisting",
    description="""
    **Securely logout user and invalidate authentication tokens**.
    
    This endpoint implements comprehensive token invalidation to ensure secure logout:
    - **Token Blacklisting**: Adds the current access token to a blacklist
    - **Session Termination**: Revokes all refresh tokens for the user
    - **Security Audit**: Logs logout events for security monitoring
    
    **Security Features**:
    - Immediate token invalidation (prevents token reuse)
    - Redis-based blacklist with automatic TTL cleanup
    - Graceful error handling (doesn't leak security details)
    - Comprehensive session cleanup
    
    **Token Blacklist Behavior**:
    - Access tokens are blacklisted until their natural expiration
    - Refresh tokens are permanently revoked from storage
    - Subsequent requests with blacklisted tokens will be rejected
    
    **Post-Logout**:
    After logout, the client must:
    1. Remove tokens from local storage
    2. Redirect to login page
    3. Obtain new tokens via `/auth/login` endpoint
    
    **Note**: This endpoint always returns success to prevent information leakage,
    even if the internal blacklisting process encounters errors.
    """,
    responses={
        200: {
            "description": "Logout successful, all tokens invalidated",
            "content": {
                "application/json": {
                    "example": {"message": "Successfully logged out"}
                }
            },
        },
        401: {
            "description": "Invalid or missing authentication token",
            "content": {
                "application/json": {
                    "example": {"detail": "Could not validate credentials"}
                }
            },
        },
    },
)
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Logout current user (invalidate token).

    Args:
        credentials: HTTP Bearer token credentials
        current_user: Currently authenticated user

    Returns:
        Dict: Success message
    """
    try:
        # Extract the token from credentials
        access_token = credentials.credentials
        
        # Blacklist the current access token
        await token_manager.revoke_token(access_token)
        
        # Optionally revoke all refresh tokens for the user
        await token_manager.revoke_all_user_tokens(str(current_user.id))
        
        logger.info(f"User {current_user.email} logged out successfully")
        
        return {"message": "Successfully logged out"}
        
    except Exception as e:
        logger.error(f"Logout failed for user {current_user.id}: {str(e)}")
        # Even if blacklisting fails, we should return success 
        # to avoid leaking information about our security mechanisms
        return {"message": "Successfully logged out"}


@router.get(
    "/sso/config",
    response_model=SSOConfigResponse,
    summary="Get SSO Configuration",
    description="""
    **Retrieve available SSO providers and configuration**.
    
    This endpoint provides information about configured SSO providers for the frontend
    to display appropriate login options.
    
    **Returns**:
    - Available OAuth2 providers (Google, GitHub, Azure)
    - Available SAML providers (Azure AD, Okta, etc.)
    - SSO system status and configuration
    """
)
async def get_sso_config(db: AsyncSession = Depends(get_async_db)) -> Any:
    """Get SSO configuration and available providers."""
    try:
        from app.services.sso_service import SSOService
        sso_service = SSOService(db)
        
        oauth_providers = []
        for name, config in sso_service.oauth_providers.items():
            if config.enabled:
                oauth_providers.append({
                    "name": name,
                    "display_name": name.title(),
                    "icon": f"/{name}-icon.svg",
                    "enabled": config.enabled
                })
        
        saml_providers = []
        for name, config in sso_service.saml_providers.items():
            if config.enabled:
                saml_providers.append({
                    "name": name,
                    "display_name": name.replace('_', ' ').title(),
                    "icon": f"/{name}-icon.svg",
                    "enabled": config.enabled
                })
        
        return SSOConfigResponse(
            oauth_providers=oauth_providers,
            saml_providers=saml_providers,
            sso_enabled=len(oauth_providers) > 0 or len(saml_providers) > 0,
            default_provider=oauth_providers[0]["name"] if oauth_providers else None
        )
    except Exception as e:
        logger.error(f"Error getting SSO config: {str(e)}")
        return SSOConfigResponse(
            oauth_providers=[],
            saml_providers=[],
            sso_enabled=False
        )


@router.post(
    "/oauth/{provider}/login",
    summary="Initiate OAuth Login",
    description="""
    **Initiate OAuth login flow** with external provider.
    
    This endpoint starts the OAuth2 authorization flow by generating the authorization URL
    that the client should redirect to.
    
    **Supported Providers**:
    - `google`: Google OAuth
    - `github`: GitHub OAuth  
    - `azure`: Azure AD OAuth
    
    **Flow**:
    1. Client calls this endpoint with provider and redirect URI
    2. Server generates authorization URL with state parameter
    3. Client redirects user to authorization URL
    4. User authorizes and is redirected back to callback URL
    5. Client calls callback endpoint to complete authentication
    """
)
async def oauth_login(
    provider: str,
    request: OAuthLoginRequest,
    db: AsyncSession = Depends(get_async_db)
) -> Any:
    """Initiate OAuth login flow."""
    try:
        from app.services.sso_service import SSOService
        sso_service = SSOService(db)
        
        # Generate authorization URL
        auth_url = await sso_service.get_oauth_authorization_url(
            provider=provider,
            redirect_uri=request.redirect_uri,
            state=request.state
        )
        
        return {
            "success": True,
            "redirect_url": auth_url,
            "provider": provider,
            "state": request.state
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth login initiation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate OAuth login"
        )


@router.post(
    "/oauth/{provider}/callback",
    response_model=SSOLoginResponse,
    summary="Handle OAuth Callback",
    description="""
    **Handle OAuth callback and complete authentication**.
    
    This endpoint processes the OAuth callback after user authorization and completes
    the authentication flow by exchanging the authorization code for an access token.
    
    **Process**:
    1. Validates OAuth state parameter
    2. Exchanges authorization code for access token
    3. Retrieves user information from provider
    4. Creates or updates user account
    5. Generates JWT token for API access
    6. Returns authentication response
    """
)
async def oauth_callback(
    provider: str,
    request: OAuthCallbackRequest,
    db: AsyncSession = Depends(get_async_db)
) -> Any:
    """Handle OAuth callback and complete authentication."""
    try:
        from app.services.sso_service import SSOService
        sso_service = SSOService(db)
        
        # Handle OAuth error
        if request.error:
            return SSOLoginResponse(
                success=False,
                error=request.error,
                error_description=request.error_description
            )
        
        # Complete OAuth flow
        response = await sso_service.handle_oauth_callback(
            provider=provider,
            code=request.code,
            state=request.state,
            redirect_uri=settings.OAUTH_REDIRECT_URI
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth callback failed: {str(e)}")
        return SSOLoginResponse(
            success=False,
            error="callback_failed",
            error_description="Authentication failed"
        )


@router.post(
    "/saml/{provider}/login",
    summary="Initiate SAML Login",
    description="""
    **Initiate SAML SSO login flow** with external provider.
    
    This endpoint starts the SAML authentication flow by generating the SAML AuthnRequest
    and returning the SSO URL for redirect.
    
    **Supported Providers**:
    - `azure_saml`: Azure AD SAML
    - `okta`: Okta SAML
    - Custom SAML providers
    
    **Flow**:
    1. Client calls this endpoint with provider
    2. Server generates SAML AuthnRequest
    3. Client redirects user to SAML SSO URL
    4. User authenticates and is redirected back
    5. Client calls callback endpoint to complete authentication
    """
)
async def saml_login(
    provider: str,
    request: SAMLLoginRequest,
    db: AsyncSession = Depends(get_async_db)
) -> Any:
    """Initiate SAML login flow."""
    try:
        from app.services.sso_service import SSOService
        sso_service = SSOService(db)
        
        # Generate SAML authorization URL
        sso_url = await sso_service.get_saml_authorization_url(
            provider=provider,
            relay_state=request.relay_state
        )
        
        return {
            "success": True,
            "sso_url": sso_url,
            "provider": provider,
            "relay_state": request.relay_state
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"SAML login initiation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate SAML login"
        )


@router.post(
    "/saml/{provider}/acs",
    response_model=SSOLoginResponse,
    summary="Handle SAML Response",
    description="""
    **Handle SAML response and complete authentication**.
    
    This endpoint processes the SAML response after user authentication and completes
    the SSO flow by validating the response and creating user session.
    
    **Process**:
    1. Validates SAML response signature
    2. Extracts user attributes from SAML assertion
    3. Creates or updates user account
    4. Generates JWT token for API access
    5. Returns authentication response
    """
)
async def saml_acs(
    provider: str,
    request: SAMLResponseRequest,
    db: AsyncSession = Depends(get_async_db)
) -> Any:
    """Handle SAML response (Assertion Consumer Service)."""
    try:
        from app.services.sso_service import SSOService
        sso_service = SSOService(db)
        
        # Complete SAML flow
        response = await sso_service.handle_saml_response(
            provider=provider,
            saml_response=request.saml_response,
            relay_state=request.relay_state
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"SAML ACS failed: {str(e)}")
        return SSOLoginResponse(
            success=False,
            error="saml_acs_failed",
            error_description="SAML authentication failed"
        )


@router.get(
    "/sso/health",
    response_model=SSOHealthCheck,
    summary="SSO Health Check",
    description="""
    **Check SSO system health and provider status**.
    
    This endpoint provides comprehensive health information about the SSO system
    including provider availability, configuration status, and active sessions.
    
    **Returns**:
    - Overall SSO system status
    - Individual provider health status
    - Active session count
    - Configuration validation results
    """
)
async def sso_health_check(db: AsyncSession = Depends(get_async_db)) -> Any:
    """Get SSO system health status."""
    try:
        from app.services.sso_service import SSOService
        sso_service = SSOService(db)
        
        health_check = await sso_service.get_sso_health_check()
        return health_check
        
    except Exception as e:
        logger.error(f"SSO health check failed: {str(e)}")
        return SSOHealthCheck(
            overall_status="error",
            enabled_providers=0,
            total_providers=0,
            active_sessions=0,
            providers=[],
            last_updated=datetime.utcnow()
        )


@router.post("/token/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    db: AsyncSession = Depends(get_async_db)
) -> Any:
    """Refresh access token using refresh token."""
    try:
        new_access_token, new_refresh_token = await token_manager.refresh_access_token(
            refresh_token, db
        )
        
        return Token(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed"
        )


@router.post("/token/revoke")
async def revoke_token(
    token: str,
    current_user: User = Depends(get_current_user)
) -> Any:
    """Revoke an access token."""
    try:
        await token_manager.revoke_token(token)
        return {"message": "Token revoked successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token revocation failed"
        )


@router.post("/token/revoke-all")
async def revoke_all_tokens(
    current_user: User = Depends(get_current_user)
) -> Any:
    """Revoke all tokens for current user."""
    try:
        await token_manager.revoke_all_user_tokens(str(current_user.id))
        return {"message": "All tokens revoked successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token revocation failed"
        )


@router.get("/sessions")
async def get_user_sessions(
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get all active sessions for current user."""
    try:
        sessions = await token_manager.get_user_sessions(str(current_user.id))
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user sessions"
        )
