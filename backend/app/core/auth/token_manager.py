"""
Token Management Service
Handles JWT token creation, validation, refresh, and revocation for SSO and standard auth.
"""

import asyncio
import json
import logging
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from uuid import uuid4

import jwt
from fastapi import HTTPException, status
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete

from app.core.config import settings
from app.models.user import User
from app.schemas.auth import JWTTokenClaims, SSOSession

logger = logging.getLogger(__name__)


class TokenManager:
    """Manages JWT tokens with secure storage, refresh, and revocation."""
    
    def __init__(self, redis_client=None):
        self.redis_client = redis_client
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.algorithm = settings.JWT_ALGORITHM
        self.secret_key = settings.JWT_SECRET_KEY
        self.access_token_expire_minutes = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        self.refresh_token_expire_days = settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
        
        # In-memory fallback for token blacklist and refresh tokens
        self._blacklisted_tokens: Set[str] = set()
        self._refresh_tokens: Dict[str, Dict[str, Any]] = {}
        
        # Initialize Redis connection if not provided
        if redis_client is None:
            self._init_redis_connection()
    
    def _init_redis_connection(self):
        """Initialize Redis connection with fallback to in-memory storage."""
        try:
            import redis.asyncio as redis
            from app.core.config import settings
            
            if hasattr(settings, 'REDIS_URL') and settings.REDIS_URL:
                self.redis_client = redis.from_url(str(settings.REDIS_URL))
                logger.info("TokenManager: Using Redis for token storage")
            else:
                logger.warning("TokenManager: Redis URL not configured, using in-memory storage")
        except Exception as e:
            logger.warning(f"TokenManager: Failed to initialize Redis, using in-memory storage: {e}")
            self.redis_client = None
        
    async def create_access_token(
        self, 
        user: User, 
        expires_delta: Optional[timedelta] = None,
        sso_session: Optional[SSOSession] = None
    ) -> str:
        """Create a new access token."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        # Build token claims
        claims = JWTTokenClaims(
            sub=str(user.id),
            email=user.email,
            name=user.full_name,
            roles=user.roles or [],
            permissions=user.permissions or [],
            sso_provider=sso_session.provider if sso_session else None,
            sso_session_id=sso_session.session_id if sso_session else None,
            iat=int(datetime.utcnow().timestamp()),
            exp=int(expire.timestamp()),
            iss=settings.APP_NAME,
            aud="opssight-api"
        )
        
        # Create JWT token
        token = jwt.encode(
            claims.dict(),
            self.secret_key,
            algorithm=self.algorithm
        )
        
        # Store token metadata
        await self._store_token_metadata(token, user.id, expire)
        
        return token
    
    async def create_refresh_token(
        self, 
        user: User, 
        access_token: str,
        device_id: Optional[str] = None
    ) -> str:
        """Create a new refresh token."""
        refresh_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        
        # Store refresh token
        token_data = {
            "user_id": str(user.id),
            "access_token": access_token,
            "device_id": device_id,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": expires_at.isoformat(),
            "is_active": True
        }
        
        # Use Redis if available, otherwise fallback to in-memory
        if self.redis_client:
            await self.redis_client.setex(
                f"refresh_token:{refresh_token}",
                int(timedelta(days=self.refresh_token_expire_days).total_seconds()),
                json.dumps(token_data)
            )
        else:
            self._refresh_tokens[refresh_token] = token_data
        
        return refresh_token
    
    async def validate_access_token(self, token: str) -> Dict[str, Any]:
        """Validate an access token and return claims."""
        try:
            # Check if token is blacklisted
            if await self._is_token_blacklisted(token):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has been revoked"
                )
            
            # Decode and validate token
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
                audience="opssight-api"
            )
            
            # Check expiration
            exp = payload.get("exp")
            if exp and datetime.utcnow().timestamp() > exp:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has expired"
                )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    
    async def refresh_access_token(
        self, 
        refresh_token: str,
        db: AsyncSession
    ) -> tuple[str, str]:
        """Refresh access token using refresh token."""
        try:
            # Get refresh token data
            token_data = await self._get_refresh_token_data(refresh_token)
            if not token_data:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid refresh token"
                )
            
            # Check if refresh token is expired
            expires_at = datetime.fromisoformat(token_data["expires_at"])
            if datetime.utcnow() > expires_at:
                # Clean up expired token
                await self._revoke_refresh_token(refresh_token)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Refresh token has expired"
                )
            
            # Get user
            user_id = token_data["user_id"]
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            
            if not user or not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found or inactive"
                )
            
            # Revoke old access token
            old_access_token = token_data["access_token"]
            await self._blacklist_token(old_access_token)
            
            # Create new access token
            new_access_token = await self.create_access_token(user)
            
            # Create new refresh token
            new_refresh_token = await self.create_refresh_token(
                user, 
                new_access_token,
                token_data.get("device_id")
            )
            
            # Revoke old refresh token
            await self._revoke_refresh_token(refresh_token)
            
            return new_access_token, new_refresh_token
            
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token refresh failed"
            )
    
    async def revoke_token(self, token: str) -> None:
        """Revoke an access token."""
        await self._blacklist_token(token)
    
    async def revoke_refresh_token(self, refresh_token: str) -> None:
        """Revoke a refresh token."""
        await self._revoke_refresh_token(refresh_token)
    
    async def revoke_all_user_tokens(self, user_id: str) -> None:
        """Revoke all tokens for a user."""
        # This would typically involve querying all active tokens for the user
        # For now, we'll implement a simple version
        if self.redis_client:
            # Get all refresh tokens for user
            pattern = f"refresh_token:*"
            keys = await self.redis_client.keys(pattern)
            
            for key in keys:
                token_data = await self.redis_client.get(key)
                if token_data:
                    data = json.loads(token_data)
                    if data.get("user_id") == user_id:
                        # Revoke refresh token
                        await self.redis_client.delete(key)
                        # Blacklist access token
                        access_token = data.get("access_token")
                        if access_token:
                            await self._blacklist_token(access_token)
    
    async def get_user_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all active sessions for a user."""
        sessions = []
        
        if self.redis_client:
            pattern = f"refresh_token:*"
            keys = await self.redis_client.keys(pattern)
            
            for key in keys:
                token_data = await self.redis_client.get(key)
                if token_data:
                    data = json.loads(token_data)
                    if data.get("user_id") == user_id and data.get("is_active"):
                        sessions.append({
                            "device_id": data.get("device_id"),
                            "created_at": data.get("created_at"),
                            "expires_at": data.get("expires_at"),
                            "last_used": data.get("last_used")
                        })
        else:
            # Fallback to in-memory storage
            for token, data in self._refresh_tokens.items():
                if data.get("user_id") == user_id and data.get("is_active"):
                    sessions.append({
                        "device_id": data.get("device_id"),
                        "created_at": data.get("created_at"),
                        "expires_at": data.get("expires_at"),
                        "last_used": data.get("last_used")
                    })
        
        return sessions
    
    async def cleanup_expired_tokens(self) -> None:
        """Clean up expired tokens (should be run periodically)."""
        if self.redis_client:
            # Redis handles TTL automatically
            pass
        else:
            # Clean up in-memory storage
            now = datetime.utcnow()
            
            # Clean up refresh tokens
            expired_refresh_tokens = []
            for token, data in self._refresh_tokens.items():
                expires_at = datetime.fromisoformat(data["expires_at"])
                if now > expires_at:
                    expired_refresh_tokens.append(token)
            
            for token in expired_refresh_tokens:
                del self._refresh_tokens[token]
    
    # Private methods
    
    async def _store_token_metadata(self, token: str, user_id: str, expires_at: datetime) -> None:
        """Store token metadata for tracking."""
        metadata = {
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": expires_at.isoformat()
        }
        
        if self.redis_client:
            # Store with TTL
            ttl = int((expires_at - datetime.utcnow()).total_seconds())
            await self.redis_client.setex(
                f"token_metadata:{token}",
                ttl,
                json.dumps(metadata)
            )
    
    async def _is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted."""
        if self.redis_client:
            blacklisted = await self.redis_client.get(f"blacklisted_token:{token}")
            return blacklisted is not None
        else:
            return token in self._blacklisted_tokens
    
    async def _blacklist_token(self, token: str) -> None:
        """Add token to blacklist."""
        try:
            # Get token expiration for TTL
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
                options={"verify_exp": False}
            )
            exp = payload.get("exp")
            
            if self.redis_client and exp:
                # Store in Redis with TTL
                ttl = max(0, int(exp - datetime.utcnow().timestamp()))
                await self.redis_client.setex(
                    f"blacklisted_token:{token}",
                    ttl,
                    "1"
                )
            else:
                # Fallback to in-memory storage
                self._blacklisted_tokens.add(token)
        except Exception as e:
            logger.error(f"Failed to blacklist token: {e}")
    
    async def _get_refresh_token_data(self, refresh_token: str) -> Optional[Dict[str, Any]]:
        """Get refresh token data."""
        if self.redis_client:
            token_data = await self.redis_client.get(f"refresh_token:{refresh_token}")
            return json.loads(token_data) if token_data else None
        else:
            return self._refresh_tokens.get(refresh_token)
    
    async def _revoke_refresh_token(self, refresh_token: str) -> None:
        """Revoke a refresh token."""
        if self.redis_client:
            await self.redis_client.delete(f"refresh_token:{refresh_token}")
        else:
            self._refresh_tokens.pop(refresh_token, None)


# Global token manager instance
token_manager = TokenManager()


async def get_current_user_from_token(token: str, db: AsyncSession) -> User:
    """Get current user from JWT token."""
    try:
        # Validate token
        payload = await token_manager.validate_access_token(token)
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        # Get user from database
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is disabled"
            )
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token validation failed"
        )