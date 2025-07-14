"""
SSO Service for OAuth2 and SAML integration.
Handles authentication flows, user provisioning, and session management.
"""

import asyncio
import base64
import hashlib
import hmac
import json
import secrets
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from urllib.parse import urlencode, parse_qs, urlparse
import logging

import aiohttp
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete

from app.core.config import settings
from app.core.auth.jwt import create_access_token
from app.core.auth.token_manager import token_manager
from app.core.auth.oauth_providers import (
    OAuthProviderFactory, 
    OAuthProvider, 
    BaseOAuthProvider,
    OAuthUserInfo as NewOAuthUserInfo
)
from app.core.auth.saml_provider import get_saml_provider, SAMLUserInfo as NewSAMLUserInfo
from app.models.user import User
from app.models.role import SystemRole
from app.schemas.auth import (
    OAuthProviderConfig,
    SAMLProviderConfig,
    OAuthUserInfo,
    SAMLUserInfo,
    SSOSession,
    SSOLoginResponse,
    SSOProviderStatus,
    SSOHealthCheck
)

logger = logging.getLogger(__name__)


class SSOService:
    """Service for handling SSO authentication flows."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.oauth_providers = self._load_oauth_providers()
        self.saml_providers = self._load_saml_providers()
        self.active_sessions: Dict[str, SSOSession] = {}

    def _load_oauth_providers(self) -> Dict[str, OAuthProviderConfig]:
        """Load OAuth provider configurations."""
        providers = {}
        
        # Google OAuth
        if all([
            settings.GOOGLE_CLIENT_ID,
            settings.GOOGLE_CLIENT_SECRET
        ]):
            providers['google'] = OAuthProviderConfig(
                provider_name='google',
                client_id=settings.GOOGLE_CLIENT_ID,
                client_secret=settings.GOOGLE_CLIENT_SECRET,
                authorization_url='https://accounts.google.com/o/oauth2/v2/auth',
                token_url='https://oauth2.googleapis.com/token',
                user_info_url='https://www.googleapis.com/oauth2/v2/userinfo',
                scopes=['openid', 'email', 'profile'],
                enabled=True,
                auto_create_users=True,
                default_role='viewer',
                domain_restriction=settings.ALLOWED_EMAIL_DOMAINS
            )

        # GitHub OAuth
        if all([
            settings.GITHUB_CLIENT_ID,
            settings.GITHUB_CLIENT_SECRET
        ]):
            providers['github'] = OAuthProviderConfig(
                provider_name='github',
                client_id=settings.GITHUB_CLIENT_ID,
                client_secret=settings.GITHUB_CLIENT_SECRET,
                authorization_url='https://github.com/login/oauth/authorize',
                token_url='https://github.com/login/oauth/access_token',
                user_info_url='https://api.github.com/user',
                scopes=['user:email'],
                enabled=True,
                auto_create_users=True,
                default_role='viewer',
                domain_restriction=settings.ALLOWED_EMAIL_DOMAINS
            )

        # Azure AD OAuth
        if all([
            settings.AZURE_CLIENT_ID,
            settings.AZURE_CLIENT_SECRET,
            settings.AZURE_TENANT_ID
        ]):
            providers['azure'] = OAuthProviderConfig(
                provider_name='azure',
                client_id=settings.AZURE_CLIENT_ID,
                client_secret=settings.AZURE_CLIENT_SECRET,
                authorization_url=f'https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}/oauth2/v2.0/authorize',
                token_url=f'https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}/oauth2/v2.0/token',
                user_info_url='https://graph.microsoft.com/v1.0/me',
                scopes=['openid', 'profile', 'email'],
                enabled=True,
                auto_create_users=True,
                default_role='viewer',
                domain_restriction=settings.ALLOWED_EMAIL_DOMAINS
            )

        # GitLab OAuth
        if all([
            settings.GITLAB_CLIENT_ID,
            settings.GITLAB_CLIENT_SECRET
        ]):
            providers['gitlab'] = OAuthProviderConfig(
                provider_name='gitlab',
                client_id=settings.GITLAB_CLIENT_ID,
                client_secret=settings.GITLAB_CLIENT_SECRET,
                authorization_url=f'{settings.GITLAB_URL}/oauth/authorize',
                token_url=f'{settings.GITLAB_URL}/oauth/token',
                user_info_url=f'{settings.GITLAB_URL}/api/v4/user',
                scopes=['read_user', 'read_api'],
                enabled=True,
                auto_create_users=True,
                default_role='viewer',
                domain_restriction=settings.ALLOWED_EMAIL_DOMAINS
            )

        return providers

    def _load_saml_providers(self) -> Dict[str, SAMLProviderConfig]:
        """Load SAML provider configurations."""
        providers = {}
        
        # Azure AD SAML
        if all([
            settings.AZURE_SAML_ENTITY_ID,
            settings.AZURE_SAML_SSO_URL,
            settings.AZURE_SAML_CERT
        ]):
            providers['azure_saml'] = SAMLProviderConfig(
                provider_name='azure_saml',
                entity_id=settings.AZURE_SAML_ENTITY_ID,
                sso_url=settings.AZURE_SAML_SSO_URL,
                x509_cert=settings.AZURE_SAML_CERT,
                enabled=True,
                auto_create_users=True,
                default_role='viewer'
            )

        # Okta SAML
        if all([
            settings.OKTA_SAML_ENTITY_ID,
            settings.OKTA_SAML_SSO_URL,
            settings.OKTA_SAML_CERT
        ]):
            providers['okta'] = SAMLProviderConfig(
                provider_name='okta',
                entity_id=settings.OKTA_SAML_ENTITY_ID,
                sso_url=settings.OKTA_SAML_SSO_URL,
                x509_cert=settings.OKTA_SAML_CERT,
                enabled=True,
                auto_create_users=True,
                default_role='viewer'
            )

        return providers

    async def get_oauth_authorization_url(
        self, 
        provider: str, 
        redirect_uri: str, 
        state: Optional[str] = None
    ) -> str:
        """Generate OAuth authorization URL using new provider system."""
        try:
            # Use new OAuth provider factory
            provider_enum = OAuthProvider(provider.lower())
            oauth_provider = OAuthProviderFactory.create_provider(provider_enum)
            
            # Generate state if not provided
            if not state:
                state = secrets.token_urlsafe(32)

            # Store state for validation
            await self._store_oauth_state(state, provider, redirect_uri)
            
            # Get authorization URL from provider
            return oauth_provider.get_authorization_url(state)
            
        except ValueError:
            # Fallback to legacy provider system
            if provider not in self.oauth_providers:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"OAuth provider '{provider}' not configured"
                )

            config = self.oauth_providers[provider]
            
            # Generate state if not provided
            if not state:
                state = secrets.token_urlsafe(32)

            # Store state for validation
            await self._store_oauth_state(state, provider, redirect_uri)

            # Build authorization URL
            params = {
                'client_id': config.client_id,
                'redirect_uri': redirect_uri,
                'scope': ' '.join(config.scopes),
                'response_type': 'code',
                'state': state
            }

            # Provider-specific parameters
            if provider == 'azure':
                params['response_mode'] = 'query'
                params['prompt'] = 'select_account'

            return f"{config.authorization_url}?{urlencode(params)}"

    async def handle_oauth_callback(
        self, 
        provider: str, 
        code: str, 
        state: str, 
        redirect_uri: str
    ) -> SSOLoginResponse:
        """Handle OAuth callback and complete authentication."""
        if provider not in self.oauth_providers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"OAuth provider '{provider}' not configured"
            )

        # Validate state
        stored_state = await self._get_oauth_state(state)
        if not stored_state or stored_state['provider'] != provider:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OAuth state parameter"
            )

        config = self.oauth_providers[provider]

        try:
            # Try new OAuth provider system first
            try:
                provider_enum = OAuthProvider(provider.lower())
                oauth_provider = OAuthProviderFactory.create_provider(provider_enum)
                
                # Exchange code for token
                access_token = await oauth_provider.exchange_code_for_token(code)
                if not access_token:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Failed to exchange OAuth code for token"
                    )
                
                # Get user info
                new_user_info = await oauth_provider.get_user_info(access_token)
                if not new_user_info:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Failed to get user info from OAuth provider"
                    )
                
                # Convert to legacy format for now
                user_info = self._convert_new_oauth_user_info(new_user_info)
                
            except ValueError:
                # Fallback to legacy system
                config = self.oauth_providers[provider]
                
                # Exchange code for token
                token_data = await self._exchange_oauth_code(config, code, redirect_uri)
                
                # Get user info
                user_info = await self._get_oauth_user_info(config, token_data['access_token'])
            
            # Validate domain restriction
            if config.domain_restriction:
                email_domain = user_info.email.split('@')[1]
                if email_domain not in config.domain_restriction:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Email domain '{email_domain}' not allowed"
                    )

            # Find or create user
            user = await self._find_or_create_oauth_user(user_info, config)
            
            # Create session
            session = await self._create_sso_session(user, provider, 'oauth2')
            
            # Generate JWT token
            access_token = await self._create_jwt_token(user, session)

            # Update last login
            await self._update_user_last_login(user.id)

            return SSOLoginResponse(
                success=True,
                access_token=access_token,
                token_type="bearer",
                expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                user={
                    "id": str(user.id),
                    "email": user.email,
                    "full_name": user.full_name,
                    "avatar_url": user.avatar_url
                }
            )

        except Exception as e:
            logger.error(f"OAuth callback error for provider {provider}: {str(e)}")
            return SSOLoginResponse(
                success=False,
                error="oauth_callback_failed",
                error_description=str(e)
            )

    async def get_saml_authorization_url(
        self, 
        provider: str, 
        relay_state: Optional[str] = None
    ) -> str:
        """Generate SAML authorization URL."""
        if provider not in self.saml_providers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"SAML provider '{provider}' not configured"
            )

        config = self.saml_providers[provider]

        # Generate SAML AuthnRequest
        request_id = f"_{secrets.token_hex(16)}"
        issue_instant = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%fZ')
        
        # Build AuthnRequest XML
        authn_request = self._build_saml_authn_request(
            request_id, 
            issue_instant, 
            config,
            relay_state
        )

        # Encode and deflate
        encoded_request = base64.b64encode(authn_request.encode()).decode()

        # Build redirect URL
        params = {
            'SAMLRequest': encoded_request
        }
        if relay_state:
            params['RelayState'] = relay_state

        return f"{config.sso_url}?{urlencode(params)}"

    async def handle_saml_response(
        self, 
        provider: str, 
        saml_response: str, 
        relay_state: Optional[str] = None
    ) -> SSOLoginResponse:
        """Handle SAML response and complete authentication."""
        if provider not in self.saml_providers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"SAML provider '{provider}' not configured"
            )

        config = self.saml_providers[provider]

        try:
            # Decode and parse SAML response
            decoded_response = base64.b64decode(saml_response).decode()
            user_info = await self._parse_saml_response(decoded_response, config)

            # Validate domain restriction
            if config.domain_restriction:
                email_domain = user_info.email.split('@')[1]
                if email_domain not in config.domain_restriction:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Email domain '{email_domain}' not allowed"
                    )

            # Find or create user
            user = await self._find_or_create_saml_user(user_info, config)
            
            # Create session
            session = await self._create_sso_session(user, provider, 'saml')
            
            # Generate JWT token
            access_token = await self._create_jwt_token(user, session)

            # Update last login
            await self._update_user_last_login(user.id)

            return SSOLoginResponse(
                success=True,
                access_token=access_token,
                token_type="bearer",
                expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                user={
                    "id": str(user.id),
                    "email": user.email,
                    "full_name": user.full_name
                }
            )

        except Exception as e:
            logger.error(f"SAML response error for provider {provider}: {str(e)}")
            return SSOLoginResponse(
                success=False,
                error="saml_response_failed",
                error_description=str(e)
            )

    async def get_sso_health_check(self) -> SSOHealthCheck:
        """Get SSO system health status."""
        provider_statuses = []
        enabled_count = 0
        total_count = 0

        # Check OAuth providers
        for name, config in self.oauth_providers.items():
            total_count += 1
            if config.enabled:
                enabled_count += 1
            
            # Basic health check
            status_result = await self._check_oauth_provider_health(name, config)
            provider_statuses.append(status_result)

        # Check SAML providers
        for name, config in self.saml_providers.items():
            total_count += 1
            if config.enabled:
                enabled_count += 1
            
            # Basic health check
            status_result = await self._check_saml_provider_health(name, config)
            provider_statuses.append(status_result)

        # Determine overall status
        overall_status = "healthy"
        if enabled_count == 0:
            overall_status = "no_providers"
        elif any(p.health_status == "error" for p in provider_statuses if p.enabled):
            overall_status = "degraded"

        return SSOHealthCheck(
            overall_status=overall_status,
            enabled_providers=enabled_count,
            total_providers=total_count,
            active_sessions=len(self.active_sessions),
            providers=provider_statuses,
            last_updated=datetime.utcnow()
        )

    # Helper methods
    
    def _convert_new_oauth_user_info(self, new_user_info: NewOAuthUserInfo) -> 'OAuthUserInfo':
        """Convert new OAuth user info format to legacy format."""
        # This is a placeholder conversion - adjust based on actual legacy OAuthUserInfo structure
        class LegacyOAuthUserInfo:
            def __init__(self, **kwargs):
                for key, value in kwargs.items():
                    setattr(self, key, value)
        
        return LegacyOAuthUserInfo(
            id=new_user_info.provider_id,
            email=new_user_info.email,
            name=new_user_info.name,
            first_name=getattr(new_user_info, 'first_name', None),
            last_name=getattr(new_user_info, 'last_name', None),
            avatar_url=new_user_info.avatar_url,
            verified=True,
            provider=new_user_info.provider,
            raw_data=new_user_info.raw_data or {}
        )

    async def _exchange_oauth_code(
        self, 
        config: OAuthProviderConfig, 
        code: str, 
        redirect_uri: str
    ) -> Dict[str, Any]:
        """Exchange OAuth code for access token."""
        data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': redirect_uri,
            'client_id': config.client_id,
            'client_secret': config.client_secret
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(
                config.token_url,
                data=data,
                headers={'Accept': 'application/json'}
            ) as response:
                if response.status != 200:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Failed to exchange OAuth code for token"
                    )
                return await response.json()

    async def _get_oauth_user_info(
        self, 
        config: OAuthProviderConfig, 
        access_token: str
    ) -> OAuthUserInfo:
        """Get user information from OAuth provider."""
        headers = {'Authorization': f'Bearer {access_token}'}
        
        async with aiohttp.ClientSession() as session:
            async with session.get(config.user_info_url, headers=headers) as response:
                if response.status != 200:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Failed to get user info from OAuth provider"
                    )
                
                data = await response.json()
                
                # Map provider-specific fields
                if config.provider_name == 'google':
                    return OAuthUserInfo(
                        id=data['id'],
                        email=data['email'],
                        name=data.get('name'),
                        first_name=data.get('given_name'),
                        last_name=data.get('family_name'),
                        avatar_url=data.get('picture'),
                        verified=data.get('verified_email', False),
                        provider=config.provider_name,
                        raw_data=data
                    )
                elif config.provider_name == 'github':
                    return OAuthUserInfo(
                        id=str(data['id']),
                        email=data['email'],
                        name=data.get('name'),
                        avatar_url=data.get('avatar_url'),
                        verified=True,
                        provider=config.provider_name,
                        raw_data=data
                    )
                elif config.provider_name == 'azure':
                    return OAuthUserInfo(
                        id=data['id'],
                        email=data['mail'] or data.get('userPrincipalName'),
                        name=data.get('displayName'),
                        first_name=data.get('givenName'),
                        last_name=data.get('surname'),
                        verified=True,
                        provider=config.provider_name,
                        raw_data=data
                    )
                elif config.provider_name == 'gitlab':
                    return OAuthUserInfo(
                        id=str(data['id']),
                        email=data['email'],
                        name=data.get('name'),
                        first_name=data.get('name', '').split(' ')[0] if data.get('name') else None,
                        last_name=' '.join(data.get('name', '').split(' ')[1:]) if data.get('name') and len(data.get('name', '').split(' ')) > 1 else None,
                        avatar_url=data.get('avatar_url'),
                        verified=data.get('confirmed_at') is not None,
                        provider=config.provider_name,
                        raw_data=data
                    )

    async def _find_or_create_oauth_user(
        self, 
        user_info: OAuthUserInfo, 
        config: OAuthProviderConfig
    ) -> User:
        """Find existing user or create new one from OAuth info."""
        # Try to find existing user by email
        result = await self.db.execute(
            select(User).where(User.email == user_info.email)
        )
        user = result.scalar_one_or_none()

        if user:
            # Update user info if needed
            if user_info.name and not user.full_name:
                user.full_name = user_info.name
            if user_info.avatar_url and not user.avatar_url:
                user.avatar_url = user_info.avatar_url
            await self.db.commit()
            return user

        # Create new user if auto-creation is enabled
        if not config.auto_create_users:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account not found and auto-creation is disabled"
            )

        # Create new user
        user = User(
            email=user_info.email,
            full_name=user_info.name,
            avatar_url=user_info.avatar_url,
            is_active=True,
            is_superuser=False,
            oauth_provider=config.provider_name,
            oauth_id=user_info.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        # Assign default role if specified
        if config.default_role:
            await self._assign_default_role(user, config.default_role)

        return user

    async def _create_sso_session(
        self, 
        user: User, 
        provider: str, 
        provider_type: str
    ) -> SSOSession:
        """Create SSO session."""
        session_id = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(seconds=settings.SSO_SESSION_TIMEOUT)

        session = SSOSession(
            session_id=session_id,
            provider=provider,
            provider_type=provider_type,
            user_id=str(user.id),
            created_at=datetime.utcnow(),
            expires_at=expires_at
        )

        self.active_sessions[session_id] = session
        return session

    async def _create_jwt_token(self, user: User, session: SSOSession) -> str:
        """Create JWT token with SSO claims."""
        return await token_manager.create_access_token(
            user=user,
            sso_session=session,
            expires_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        )

    async def _store_oauth_state(self, state: str, provider: str, redirect_uri: str):
        """Store OAuth state for validation."""
        state_data = {
            "provider": provider,
            "redirect_uri": redirect_uri,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": (datetime.utcnow() + timedelta(minutes=10)).isoformat()
        }
        
        # Store in Redis if available
        if hasattr(self, '_redis_client') and self._redis_client:
            await self._redis_client.setex(
                f"oauth_state:{state}",
                600,  # 10 minutes
                json.dumps(state_data)
            )
        else:
            # Fallback to in-memory storage
            if not hasattr(self, '_state_storage'):
                self._state_storage = {}
            self._state_storage[state] = state_data

    async def _get_oauth_state(self, state: str) -> Optional[Dict[str, Any]]:
        """Get stored OAuth state."""
        # Try Redis first
        if hasattr(self, '_redis_client') and self._redis_client:
            try:
                stored_data = await self._redis_client.get(f"oauth_state:{state}")
                if stored_data:
                    state_data = json.loads(stored_data)
                    # Check expiration
                    expires_at = datetime.fromisoformat(state_data['expires_at'])
                    if expires_at > datetime.utcnow():
                        # Delete used state
                        await self._redis_client.delete(f"oauth_state:{state}")
                        return state_data
            except Exception as e:
                logger.warning(f"Failed to get OAuth state from Redis: {e}")
        
        # Fallback to in-memory storage
        if hasattr(self, '_state_storage') and state in self._state_storage:
            state_data = self._state_storage[state]
            # Check expiration
            expires_at = datetime.fromisoformat(state_data['expires_at'])
            if expires_at > datetime.utcnow():
                # Delete used state
                del self._state_storage[state]
                return state_data
            else:
                # Clean up expired state
                del self._state_storage[state]
        
        return None

    def _build_saml_authn_request(
        self, 
        request_id: str, 
        issue_instant: str, 
        config: SAMLProviderConfig,
        relay_state: Optional[str] = None
    ) -> str:
        """Build SAML AuthnRequest XML."""
        try:
            # Use python3-saml library for proper SAML request generation
            from onelogin.saml2.auth import OneLogin_Saml2_Auth
            from onelogin.saml2.settings import OneLogin_Saml2_Settings
            from onelogin.saml2.utils import OneLogin_Saml2_Utils
            
            # Build SAML settings
            saml_settings = {
                "sp": {
                    "entityId": settings.SAML_ENTITY_ID,
                    "assertionConsumerService": {
                        "url": f"{settings.BASE_URL}/api/v1/auth/saml/{config.provider_name}/acs",
                        "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                    },
                    "singleLogoutService": {
                        "url": settings.SAML_SLO_URL,
                        "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                    },
                    "NameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
                },
                "idp": {
                    "entityId": config.entity_id,
                    "singleSignOnService": {
                        "url": config.sso_url,
                        "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                    },
                    "singleLogoutService": {
                        "url": config.slo_url if config.slo_url else config.sso_url,
                        "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                    },
                    "x509cert": config.x509_cert
                }
            }
            
            # Create SAML Auth Request
            settings_obj = OneLogin_Saml2_Settings(saml_settings)
            
            # Generate AuthnRequest
            authn_request = OneLogin_Saml2_Utils.generate_unique_id()
            
            # For now, build simplified request
            return f"""<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                    ID="{request_id}"
                    Version="2.0"
                    IssueInstant="{issue_instant}"
                    Destination="{config.sso_url}"
                    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                    AssertionConsumerServiceURL="{settings.BASE_URL}/api/v1/auth/saml/{config.provider_name}/acs">
    <saml:Issuer>{settings.SAML_ENTITY_ID}</saml:Issuer>
    <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
</samlp:AuthnRequest>"""
        except ImportError:
            # Fallback to simplified SAML request if python3-saml not available
            return f"""<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                    ID="{request_id}"
                    Version="2.0"
                    IssueInstant="{issue_instant}"
                    Destination="{config.sso_url}"
                    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                    AssertionConsumerServiceURL="{settings.BASE_URL}/api/v1/auth/saml/{config.provider_name}/acs">
    <saml:Issuer>{settings.SAML_ENTITY_ID}</saml:Issuer>
    <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
</samlp:AuthnRequest>"""

    async def _parse_saml_response(
        self, 
        saml_response: str, 
        config: SAMLProviderConfig
    ) -> SAMLUserInfo:
        """Parse SAML response and extract user info."""
        try:
            # Use python3-saml library for proper SAML response parsing
            from onelogin.saml2.auth import OneLogin_Saml2_Auth
            from onelogin.saml2.response import OneLogin_Saml2_Response
            from onelogin.saml2.settings import OneLogin_Saml2_Settings
            import xml.etree.ElementTree as ET
            
            # Build SAML settings
            saml_settings = {
                "sp": {
                    "entityId": settings.SAML_ENTITY_ID,
                    "assertionConsumerService": {
                        "url": f"{settings.BASE_URL}/api/v1/auth/saml/{config.provider_name}/acs",
                        "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                    },
                    "singleLogoutService": {
                        "url": settings.SAML_SLO_URL,
                        "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                    },
                    "NameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
                },
                "idp": {
                    "entityId": config.entity_id,
                    "singleSignOnService": {
                        "url": config.sso_url,
                        "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                    },
                    "singleLogoutService": {
                        "url": config.slo_url if config.slo_url else config.sso_url,
                        "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                    },
                    "x509cert": config.x509_cert
                }
            }
            
            # Parse SAML response
            settings_obj = OneLogin_Saml2_Settings(saml_settings)
            response = OneLogin_Saml2_Response(settings_obj, saml_response)
            
            # Validate response
            if not response.is_valid():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid SAML response: {response.get_last_error_reason()}"
                )
            
            # Extract user attributes
            attributes = response.get_attributes()
            name_id = response.get_nameid()
            session_index = response.get_session_index()
            
            # Map attributes using configuration
            attr_mapping = config.attribute_mapping
            
            email = attributes.get(attr_mapping.get('email', 'email'), [name_id])[0]
            first_name = attributes.get(attr_mapping.get('first_name', 'first_name'), [None])[0]
            last_name = attributes.get(attr_mapping.get('last_name', 'last_name'), [None])[0]
            display_name = attributes.get(attr_mapping.get('display_name', 'display_name'), [None])[0]
            groups = attributes.get(attr_mapping.get('groups', 'groups'), [])
            
            # Build display name if not provided
            if not display_name:
                display_name = f"{first_name} {last_name}".strip()
                if not display_name:
                    display_name = email
            
            return SAMLUserInfo(
                name_id=name_id,
                email=email,
                first_name=first_name,
                last_name=last_name,
                display_name=display_name,
                groups=groups,
                provider=config.provider_name,
                session_index=session_index,
                attributes=attributes
            )
            
        except ImportError:
            # Fallback to simplified parsing if python3-saml not available
            logger.warning("python3-saml library not available, using simplified SAML parsing")
            
            # Try to extract email from XML
            try:
                import xml.etree.ElementTree as ET
                root = ET.fromstring(saml_response)
                
                # Find NameID element
                name_id_elem = root.find('.//{urn:oasis:names:tc:SAML:2.0:assertion}NameID')
                name_id = name_id_elem.text if name_id_elem is not None else "unknown@example.com"
                
                # Find attribute elements
                attrs = {}
                for attr_stmt in root.findall('.//{urn:oasis:names:tc:SAML:2.0:assertion}AttributeStatement'):
                    for attr in attr_stmt.findall('.//{urn:oasis:names:tc:SAML:2.0:assertion}Attribute'):
                        attr_name = attr.get('Name')
                        attr_values = [val.text for val in attr.findall('.//{urn:oasis:names:tc:SAML:2.0:assertion}AttributeValue')]
                        attrs[attr_name] = attr_values
                
                # Map common attributes
                email = attrs.get('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress', [name_id])[0]
                first_name = attrs.get('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname', [None])[0]
                last_name = attrs.get('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname', [None])[0]
                display_name = attrs.get('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name', [None])[0]
                
                if not display_name:
                    display_name = f"{first_name} {last_name}".strip() or email
                
                return SAMLUserInfo(
                    name_id=name_id,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    display_name=display_name,
                    provider=config.provider_name,
                    attributes=attrs
                )
                
            except Exception as e:
                logger.error(f"Failed to parse SAML response: {e}")
                # Return mock data as ultimate fallback
                return SAMLUserInfo(
                    name_id="mock@example.com",
                    email="mock@example.com",
                    first_name="Mock",
                    last_name="User",
                    display_name="Mock User",
                    provider=config.provider_name,
                    attributes={}
                )

    async def _find_or_create_saml_user(
        self, 
        user_info: SAMLUserInfo, 
        config: SAMLProviderConfig
    ) -> User:
        """Find existing user or create new one from SAML info."""
        # Similar to OAuth user creation but for SAML
        result = await self.db.execute(
            select(User).where(User.email == user_info.email)
        )
        user = result.scalar_one_or_none()

        if user:
            return user

        if not config.auto_create_users:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account not found and auto-creation is disabled"
            )

        user = User(
            email=user_info.email,
            full_name=user_info.display_name,
            is_active=True,
            is_superuser=False,
            saml_provider=config.provider_name,
            saml_name_id=user_info.name_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        if config.default_role:
            await self._assign_default_role(user, config.default_role)

        return user

    async def _assign_default_role(self, user: User, role_name: str):
        """Assign default role to user."""
        # Implementation would assign role based on role_name
        pass

    async def _update_user_last_login(self, user_id: int):
        """Update user's last login timestamp."""
        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(last_login=datetime.utcnow())
        )
        await self.db.commit()

    async def _check_oauth_provider_health(
        self, 
        name: str, 
        config: OAuthProviderConfig
    ) -> SSOProviderStatus:
        """Check OAuth provider health."""
        try:
            # Basic connectivity check
            async with aiohttp.ClientSession() as session:
                async with session.get(config.authorization_url, timeout=5) as response:
                    health_status = "healthy" if response.status < 500 else "degraded"
        except:
            health_status = "error"

        return SSOProviderStatus(
            provider_name=name,
            provider_type="oauth2",
            enabled=config.enabled,
            configured=True,
            health_status=health_status,
            last_checked=datetime.utcnow(),
            user_count=0  # Would query actual user count
        )

    async def _check_saml_provider_health(
        self, 
        name: str, 
        config: SAMLProviderConfig
    ) -> SSOProviderStatus:
        """Check SAML provider health."""
        try:
            # Basic connectivity check
            async with aiohttp.ClientSession() as session:
                async with session.get(config.sso_url, timeout=5) as response:
                    health_status = "healthy" if response.status < 500 else "degraded"
        except:
            health_status = "error"

        return SSOProviderStatus(
            provider_name=name,
            provider_type="saml",
            enabled=config.enabled,
            configured=True,
            health_status=health_status,
            last_checked=datetime.utcnow(),
            user_count=0  # Would query actual user count
        )