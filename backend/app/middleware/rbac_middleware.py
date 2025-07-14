"""
RBAC Middleware for FastAPI Application

Provides comprehensive access control middleware that enforces role-based permissions
across all API endpoints automatically based on route patterns and configurations.
"""

import asyncio
import re
from typing import Dict, List, Optional, Tuple, Callable, Any
from fastapi import Request, Response, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import logging
from datetime import datetime
import json

from app.models.role import PermissionType
from app.models.user import User
from app.core.auth.rbac import audit_access_attempt, PermissionDeniedError, get_rbac_context, RBACContext
from app.services.user_permission import UserPermissionService
from app.core.dependencies import get_async_db
from app.core.auth.jwt import verify_jwt_token
from app.core.cache import get_cache
from app.core.config import settings

logger = logging.getLogger(__name__)


class RBACMiddleware(BaseHTTPMiddleware):
    """
    Middleware to enforce RBAC permissions on API endpoints.
    
    Features:
    - Route-based permission mapping
    - Automatic permission checking
    - Bypass for public endpoints
    - Comprehensive audit logging
    - Organization context detection
    """
    
    def __init__(self, app, permission_config: Optional[Dict] = None):
        super().__init__(app)
        self.security = HTTPBearer(auto_error=False)
        self.permission_config = permission_config or self._default_permission_config()
        self.permission_service = UserPermissionService()
        self.cache = get_cache()
        self.public_endpoints = {
            "/docs", "/redoc", "/openapi.json", "/health", "/metrics",
            "/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/callback",
            "/api/v1/auth/refresh", "/api/v1/auth/me", "/favicon.ico"
        }
        self.rate_limit_cache = {}
        self.max_requests_per_minute = 100
        
    def _default_permission_config(self) -> Dict[str, Dict]:
        """
        Default permission configuration for API endpoints.
        Maps URL patterns to required permissions.
        """
        return {
            # User management endpoints
            "^/api/v1/users/?$": {
                "GET": [PermissionType.VIEW_USERS],
                "POST": [PermissionType.MANAGE_USERS]
            },
            "^/api/v1/users/[0-9]+/?$": {
                "GET": [PermissionType.VIEW_USERS],
                "PUT": [PermissionType.MANAGE_USERS],
                "DELETE": [PermissionType.MANAGE_USERS]
            },
            
            # Role management endpoints
            "^/api/v1/roles/?$": {
                "GET": [PermissionType.VIEW_ROLES],
                "POST": [PermissionType.MANAGE_ROLES]
            },
            "^/api/v1/roles/[0-9]+/?$": {
                "GET": [PermissionType.VIEW_ROLES],
                "PUT": [PermissionType.MANAGE_ROLES],
                "DELETE": [PermissionType.MANAGE_ROLES]
            },
            
            # Permission management endpoints
            "^/api/v1/permissions/?.*$": {
                "GET": [PermissionType.VIEW_ROLES],
                "POST": [PermissionType.MANAGE_ROLES],
                "PUT": [PermissionType.MANAGE_ROLES],
                "DELETE": [PermissionType.MANAGE_ROLES]
            },
            
            # Team management endpoints
            "^/api/v1/teams/?$": {
                "GET": [PermissionType.VIEW_TEAMS],
                "POST": [PermissionType.MANAGE_TEAMS]
            },
            "^/api/v1/teams/[0-9]+/?$": {
                "GET": [PermissionType.VIEW_TEAMS],
                "PUT": [PermissionType.MANAGE_TEAMS],
                "DELETE": [PermissionType.MANAGE_TEAMS]
            },
            
            # Project management endpoints
            "^/api/v1/projects/?$": {
                "GET": [PermissionType.VIEW_PROJECTS],
                "POST": [PermissionType.MANAGE_PROJECTS]
            },
            "^/api/v1/projects/[0-9]+/?$": {
                "GET": [PermissionType.VIEW_PROJECTS],
                "PUT": [PermissionType.MANAGE_PROJECTS],
                "DELETE": [PermissionType.MANAGE_PROJECTS]
            },
            
            # Infrastructure endpoints
            "^/api/v1/infrastructure/?.*$": {
                "GET": [PermissionType.VIEW_INFRASTRUCTURE],
                "POST": [PermissionType.MANAGE_INFRASTRUCTURE],
                "PUT": [PermissionType.MANAGE_INFRASTRUCTURE],
                "DELETE": [PermissionType.MANAGE_INFRASTRUCTURE]
            },
            
            # Pipeline endpoints
            "^/api/v1/pipelines/?.*$": {
                "GET": [PermissionType.VIEW_PIPELINES],
                "POST": [PermissionType.MANAGE_PIPELINES],
                "PUT": [PermissionType.MANAGE_PIPELINES],
                "DELETE": [PermissionType.MANAGE_PIPELINES]
            },
            
            # Monitoring endpoints
            "^/api/v1/monitoring/?.*$": {
                "GET": [PermissionType.VIEW_MONITORING],
                "POST": [PermissionType.MANAGE_MONITORING],
                "PUT": [PermissionType.MANAGE_MONITORING],
                "DELETE": [PermissionType.MANAGE_MONITORING]
            },
            
            # Admin endpoints - require elevated permissions
            "^/api/v1/admin/?.*$": {
                "GET": [PermissionType.ADMIN_READ],
                "POST": [PermissionType.ADMIN_WRITE],
                "PUT": [PermissionType.ADMIN_WRITE],
                "DELETE": [PermissionType.ADMIN_WRITE]
            }
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Main middleware dispatch method.
        
        Args:
            request: FastAPI request object
            call_next: Next middleware/handler in chain
            
        Returns:
            Response: HTTP response
        """
        start_time = datetime.utcnow()
        
        try:
            # Skip RBAC for public endpoints
            if self._is_public_endpoint(request.url.path):
                return await call_next(request)
            
            # Skip RBAC for preflight OPTIONS requests
            if request.method == "OPTIONS":
                return await call_next(request)
            
            # Extract user and check authentication
            user = await self._get_current_user(request)
            if not user:
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Authentication required"}
                )
            
            # Get organization context from URL
            organization_id = self._extract_organization_id(request)
            
            # Check for suspicious activity
            await self._check_suspicious_activity(user, request)
            
            # Check permissions for this endpoint
            await self._check_endpoint_permissions(request, user, organization_id)
            
            # Add user to request state for downstream use
            request.state.current_user = user
            request.state.organization_id = organization_id
            
            # Process request
            response = await call_next(request)
            
            # Log successful access
            await self._log_access_attempt(
                user=user,
                request=request,
                granted=True,
                organization_id=organization_id,
                duration=(datetime.utcnow() - start_time).total_seconds()
            )
            
            return response
            
        except PermissionDeniedError as e:
            # Log denied access
            if 'user' in locals():
                await self._log_access_attempt(
                    user=user,
                    request=request,
                    granted=False,
                    reason=str(e),
                    organization_id=organization_id if 'organization_id' in locals() else None,
                    duration=(datetime.utcnow() - start_time).total_seconds()
                )
            
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": str(e)}
            )
            
        except HTTPException as e:
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail}
            )
            
        except Exception as e:
            logger.error(f"RBAC Middleware error: {e}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Internal server error"}
            )
    
    def _is_public_endpoint(self, path: str) -> bool:
        """Check if endpoint is public and should bypass RBAC."""
        return any(path.startswith(endpoint) for endpoint in self.public_endpoints)
    
    async def _get_current_user(self, request: Request) -> Optional[User]:
        """
        Extract and validate user from request.
        
        Args:
            request: FastAPI request object
            
        Returns:
            Optional[User]: Authenticated user or None
        """
        try:
            # Try to get authorization header
            authorization = request.headers.get("authorization")
            if not authorization:
                return None
            
            # Extract Bearer token
            if not authorization.startswith("Bearer "):
                return None
            
            token = authorization.split(" ", 1)[1]
            
            # Check cache first
            cache_key = f"user_token:{token[:20]}"  # Use first 20 chars for cache key
            cached_user = await self.cache.get(cache_key)
            if cached_user:
                return cached_user
            
            # Validate JWT token
            payload = verify_jwt_token(token)
            if not payload:
                return None
            
            user_id = payload.get("user_id")
            if not user_id:
                return None
            
            # Get user from database
            async for db in get_async_db():
                try:
                    user = await db.get(User, user_id)
                    if user and user.is_active:
                        # Cache user for 5 minutes
                        await self.cache.set(cache_key, user, ttl=300)
                        return user
                    break
                except Exception as e:
                    logger.error(f"Error fetching user from database: {e}")
                    break
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting current user: {e}")
            return None
    
    def _extract_organization_id(self, request: Request) -> Optional[int]:
        """
        Extract organization ID from URL path parameters.
        
        Args:
            request: FastAPI request object
            
        Returns:
            Optional[int]: Organization ID if found
        """
        try:
            # Check path parameters
            if hasattr(request, 'path_params'):
                org_id = request.path_params.get('organization_id')
                if org_id:
                    return int(org_id)
            
            # Check URL path for organization context
            path = request.url.path
            org_match = re.search(r'/organizations/(\d+)/', path)
            if org_match:
                return int(org_match.group(1))
            
            # Check query parameters
            org_id = request.query_params.get('organization_id')
            if org_id:
                return int(org_id)
                
            return None
            
        except (ValueError, TypeError):
            return None
    
    async def _check_endpoint_permissions(
        self, 
        request: Request, 
        user: User, 
        organization_id: Optional[int]
    ) -> None:
        """
        Check if user has required permissions for endpoint.
        
        Args:
            request: FastAPI request object
            user: Authenticated user
            organization_id: Organization context
            
        Raises:
            PermissionDeniedError: If user lacks required permissions
        """
        try:
            path = request.url.path
            method = request.method
            
            # Find matching permission configuration
            required_permissions = self._get_required_permissions(path, method)
            
            if not required_permissions:
                # No specific permissions required for this endpoint
                return
            
            # Check rate limiting first
            await self._check_rate_limit(user.id, request)
            
            # Get database session for permission checking
            async for db in get_async_db():
                try:
                    # Create RBAC context
                    rbac_context = RBACContext(user, db)
                    
                    # Check each required permission
                    missing_permissions = []
                    for permission in required_permissions:
                        has_perm = await self.permission_service.has_permission(
                            db, user.id, permission, organization_id or user.organization_id
                        )
                        
                        if not has_perm:
                            missing_permissions.append(permission.value)
                    
                    if missing_permissions:
                        raise PermissionDeniedError(
                            f"Missing required permissions: {', '.join(missing_permissions)}"
                        )
                    
                    logger.info(
                        f"User {user.id} granted access to {method} {path} "
                        f"with permissions: {[p.value for p in required_permissions]}"
                    )
                    break
                    
                except Exception as e:
                    if isinstance(e, PermissionDeniedError):
                        raise
                    logger.error(f"Error checking permissions: {e}")
                    raise PermissionDeniedError("Permission check failed")
            
        except PermissionDeniedError:
            raise
        except Exception as e:
            logger.error(f"Error in permission check: {e}")
            raise PermissionDeniedError("Permission validation failed")
    
    def _get_required_permissions(self, path: str, method: str) -> List[PermissionType]:
        """
        Get required permissions for a specific path and method.
        
        Args:
            path: URL path
            method: HTTP method
            
        Returns:
            List[PermissionType]: Required permissions
        """
        try:
            for pattern, config in self.permission_config.items():
                if re.match(pattern, path):
                    method_config = config.get(method.upper(), [])
                    if isinstance(method_config, list):
                        return method_config
                    elif isinstance(method_config, PermissionType):
                        return [method_config]
            
            return []
            
        except Exception as e:
            logger.error(f"Error getting required permissions: {e}")
            return []
    
    async def _log_access_attempt(
        self,
        user: User,
        request: Request,
        granted: bool,
        reason: Optional[str] = None,
        organization_id: Optional[int] = None,
        duration: Optional[float] = None
    ):
        """
        Log access attempt for audit trail.
        
        Args:
            user: User attempting access
            request: FastAPI request object
            granted: Whether access was granted
            reason: Reason if access was denied
            organization_id: Organization context
            duration: Request duration in seconds
        """
        try:
            audit_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user.id,
                "username": getattr(user, 'username', getattr(user, 'github_username', 'unknown')),
                "method": request.method,
                "path": request.url.path,
                "query_params": dict(request.query_params),
                "user_agent": request.headers.get("user-agent"),
                "ip_address": request.client.host if request.client else None,
                "granted": granted,
                "reason": reason,
                "organization_id": organization_id,
                "duration_seconds": duration,
            }
            
            # Log the access attempt
            if granted:
                logger.info(f"RBAC_ACCESS_GRANTED: {json.dumps(audit_entry)}")
            else:
                logger.warning(f"RBAC_ACCESS_DENIED: {json.dumps(audit_entry)}")
            
        except Exception as e:
            logger.error(f"Error logging access attempt: {e}")
    
    async def _check_rate_limit(self, user_id: int, request: Request) -> None:
        """
        Check if user has exceeded rate limit.
        
        Args:
            user_id: User ID
            request: FastAPI request object
            
        Raises:
            HTTPException: If rate limit exceeded
        """
        try:
            now = datetime.utcnow()
            cache_key = f"rate_limit:{user_id}:{now.strftime('%Y-%m-%d-%H-%M')}"
            
            # Get current request count
            current_count = await self.cache.get(cache_key) or 0
            
            if current_count >= self.max_requests_per_minute:
                logger.warning(
                    f"Rate limit exceeded for user {user_id} from {request.client.host}"
                )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded. Please try again later."
                )
            
            # Increment counter
            await self.cache.set(cache_key, current_count + 1, ttl=60)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error checking rate limit: {e}")
            # Don't fail the request if rate limiting fails
    
    async def _check_suspicious_activity(self, user: User, request: Request) -> None:
        """
        Check for suspicious activity patterns.
        
        Args:
            user: User making the request
            request: FastAPI request object
        """
        try:
            # Check for unusual access patterns
            cache_key = f"activity:{user.id}:{datetime.utcnow().strftime('%Y-%m-%d-%H')}"
            
            # Get activity count for this hour
            activity_count = await self.cache.get(cache_key) or 0
            
            # If user is making too many requests, log as suspicious
            if activity_count > 500:  # Adjust threshold as needed
                logger.warning(
                    f"Suspicious activity detected for user {user.id}: "
                    f"{activity_count} requests in past hour from {request.client.host}"
                )
                
                # Could implement additional security measures here
                # such as temporary account lockout or additional verification
            
            # Update activity count
            await self.cache.set(cache_key, activity_count + 1, ttl=3600)
            
        except Exception as e:
            logger.error(f"Error checking suspicious activity: {e}")
    
    def _is_sensitive_endpoint(self, path: str) -> bool:
        """
        Check if endpoint handles sensitive operations.
        
        Args:
            path: URL path
            
        Returns:
            bool: True if endpoint is sensitive
        """
        sensitive_patterns = [
            "/api/v1/admin/",
            "/api/v1/permissions/",
            "/api/v1/roles/",
            "/api/v1/users/",
            "/api/v1/audit/",
        ]
        
        return any(pattern in path for pattern in sensitive_patterns)


class RBACRoute:
    """
    Decorator for adding RBAC permissions to specific routes.
    Provides more granular control than middleware.
    """
    
    def __init__(
        self, 
        permissions: List[PermissionType], 
        organization_scoped: bool = False,
        require_all: bool = True
    ):
        self.permissions = permissions
        self.organization_scoped = organization_scoped
        self.require_all = require_all
    
    def __call__(self, func: Callable) -> Callable:
        """
        Decorator to add RBAC checking to a route function.
        
        Args:
            func: Route function to decorate
            
        Returns:
            Decorated function with RBAC checking
        """
        async def wrapper(*args, **kwargs):
            # Extract user and db from function arguments
            current_user = kwargs.get("current_user")
            db = kwargs.get("db")
            organization_id = kwargs.get("organization_id") if self.organization_scoped else None
            
            if not current_user or not db:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Check permissions
            missing_permissions = []
            granted_permissions = []
            
            for permission in self.permissions:
                permission_check = await PermissionService.check_user_permission(
                    db, current_user.id, permission.value, organization_id
                )
                
                if permission_check["has_permission"]:
                    granted_permissions.append(permission.value)
                else:
                    missing_permissions.append(permission.value)
            
            # Determine if access should be granted
            if self.require_all:
                # User needs ALL permissions
                if missing_permissions:
                    raise PermissionDeniedError(
                        f"Required permissions: {', '.join(missing_permissions)}"
                    )
            else:
                # User needs ANY permission
                if not granted_permissions:
                    raise PermissionDeniedError(
                        f"Required any of: {', '.join([p.value for p in self.permissions])}"
                    )
            
            # Log successful access
            await audit_access_attempt(
                user=current_user,
                resource=func.__name__,
                action="execute",
                granted=True,
                organization_id=organization_id
            )
            
            return await func(*args, **kwargs)
        
        return wrapper


def require_rbac_permissions(
    permissions: List[PermissionType], 
    organization_scoped: bool = False,
    require_all: bool = True
) -> Callable:
    """
    Convenience decorator for RBAC route protection.
    
    Args:
        permissions: List of required permissions
        organization_scoped: Whether to check organization-specific permissions
        require_all: Whether user needs all permissions (True) or any (False)
        
    Returns:
        Decorator function
    """
    return RBACRoute(permissions, organization_scoped, require_all)