"""
Endpoint Protection Utilities

Provides utilities for easily applying RBAC protection to existing API endpoints
and route handlers.
"""

from functools import wraps
from typing import List, Optional, Callable, Dict, Any
from fastapi import HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.role import PermissionType
from app.models.user import User
from app.core.dependencies import get_async_db
from app.core.auth.rbac import audit_access_attempt, PermissionDeniedError
from app.services.permission_service import PermissionService
import logging

logger = logging.getLogger(__name__)


def protect_endpoint(
    permissions: List[PermissionType],
    organization_scoped: bool = False,
    require_all: bool = True,
    audit_resource: Optional[str] = None
):
    """
    Decorator to protect API endpoints with RBAC permissions.
    
    Args:
        permissions: List of required permissions
        organization_scoped: Whether permissions are organization-scoped
        require_all: Whether user needs ALL permissions (True) or ANY (False)
        audit_resource: Custom resource name for audit logging
        
    Returns:
        Decorator function
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract dependencies from kwargs
            current_user = kwargs.get("current_user")
            db = kwargs.get("db") 
            organization_id = kwargs.get("organization_id") if organization_scoped else None
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            if not db:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Database session not available"
                )
            
            # Check permissions
            await _check_permissions(
                db=db,
                user=current_user,
                permissions=permissions,
                organization_id=organization_id,
                require_all=require_all,
                resource_name=audit_resource or func.__name__
            )
            
            # Execute the original function
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def protect_admin_endpoint(audit_resource: Optional[str] = None):
    """
    Convenience decorator for admin-only endpoints.
    
    Args:
        audit_resource: Custom resource name for audit logging
        
    Returns:
        Decorator function
    """
    return protect_endpoint(
        permissions=[PermissionType.ADMIN_READ, PermissionType.ADMIN_WRITE],
        require_all=False,
        audit_resource=audit_resource
    )


def protect_user_management(audit_resource: Optional[str] = None):
    """
    Convenience decorator for user management endpoints.
    
    Args:
        audit_resource: Custom resource name for audit logging
        
    Returns:
        Decorator function
    """
    return protect_endpoint(
        permissions=[PermissionType.MANAGE_USERS],
        audit_resource=audit_resource
    )


def protect_resource_access(
    resource_type: str,
    action: str = "read",
    organization_scoped: bool = True,
    audit_resource: Optional[str] = None
):
    """
    Convenience decorator for resource-based access control.
    
    Args:
        resource_type: Type of resource (user, team, project, etc.)
        action: Action being performed (read, write, delete)
        organization_scoped: Whether to check organization-scoped permissions
        audit_resource: Custom resource name for audit logging
        
    Returns:
        Decorator function
    """
    # Map resource types and actions to permissions
    permission_map = {
        "user": {
            "read": [PermissionType.VIEW_USERS],
            "write": [PermissionType.MANAGE_USERS],
            "delete": [PermissionType.MANAGE_USERS]
        },
        "team": {
            "read": [PermissionType.VIEW_TEAMS],
            "write": [PermissionType.MANAGE_TEAMS],
            "delete": [PermissionType.MANAGE_TEAMS]
        },
        "project": {
            "read": [PermissionType.VIEW_PROJECTS],
            "write": [PermissionType.MANAGE_PROJECTS],
            "delete": [PermissionType.MANAGE_PROJECTS]
        },
        "role": {
            "read": [PermissionType.VIEW_ROLES],
            "write": [PermissionType.MANAGE_ROLES],
            "delete": [PermissionType.MANAGE_ROLES]
        },
        "infrastructure": {
            "read": [PermissionType.VIEW_INFRASTRUCTURE],
            "write": [PermissionType.MANAGE_INFRASTRUCTURE],
            "delete": [PermissionType.MANAGE_INFRASTRUCTURE]
        },
        "pipeline": {
            "read": [PermissionType.VIEW_PIPELINES],
            "write": [PermissionType.MANAGE_PIPELINES],
            "delete": [PermissionType.MANAGE_PIPELINES]
        },
        "monitoring": {
            "read": [PermissionType.VIEW_MONITORING],
            "write": [PermissionType.MANAGE_MONITORING],
            "delete": [PermissionType.MANAGE_MONITORING]
        }
    }
    
    permissions = permission_map.get(resource_type, {}).get(action, [])
    if not permissions:
        raise ValueError(f"Unknown resource type '{resource_type}' or action '{action}'")
    
    return protect_endpoint(
        permissions=permissions,
        organization_scoped=organization_scoped,
        audit_resource=audit_resource or f"{resource_type}_{action}"
    )


async def _check_permissions(
    db: AsyncSession,
    user: User,
    permissions: List[PermissionType],
    organization_id: Optional[int],
    require_all: bool,
    resource_name: str
) -> None:
    """
    Internal function to check user permissions.
    
    Args:
        db: Database session
        user: User to check permissions for
        permissions: List of required permissions
        organization_id: Organization context
        require_all: Whether user needs all permissions
        resource_name: Resource name for audit logging
        
    Raises:
        PermissionDeniedError: If user lacks required permissions
    """
    try:
        missing_permissions = []
        granted_permissions = []
        
        # Check each permission
        for permission in permissions:
            permission_check = await PermissionService.check_user_permission(
                db, user.id, permission.value, organization_id
            )
            
            if permission_check["has_permission"]:
                granted_permissions.append({
                    "permission": permission.value,
                    "sources": permission_check["sources"]
                })
            else:
                missing_permissions.append(permission.value)
        
        # Determine if access should be granted
        access_granted = False
        if require_all:
            # User needs ALL permissions
            access_granted = len(missing_permissions) == 0
        else:
            # User needs ANY permission
            access_granted = len(granted_permissions) > 0
        
        # Log access attempt
        await audit_access_attempt(
            user=user,
            resource=resource_name,
            action="access",
            granted=access_granted,
            reason=f"Missing permissions: {missing_permissions}" if not access_granted else None,
            organization_id=organization_id
        )
        
        # Raise error if access denied
        if not access_granted:
            if require_all and missing_permissions:
                raise PermissionDeniedError(
                    f"Required permissions: {', '.join(missing_permissions)}"
                )
            elif not require_all:
                raise PermissionDeniedError(
                    f"Required any of: {', '.join([p.value for p in permissions])}"
                )
        
        # Log successful access
        logger.info(
            f"User {user.id} granted access to {resource_name} "
            f"with permissions: {[p['permission'] for p in granted_permissions]}"
        )
        
    except PermissionDeniedError:
        raise
    except Exception as e:
        logger.error(f"Error checking permissions for {resource_name}: {e}")
        await audit_access_attempt(
            user=user,
            resource=resource_name,
            action="access",
            granted=False,
            reason=f"Permission check failed: {str(e)}",
            organization_id=organization_id
        )
        raise PermissionDeniedError("Permission check failed")


# FastAPI dependency factories for easy integration

def require_permission_dependency(
    permission: PermissionType,
    organization_scoped: bool = False
):
    """
    Create a FastAPI dependency that requires a specific permission.
    
    Args:
        permission: Required permission
        organization_scoped: Whether to check organization-scoped permissions
        
    Returns:
        FastAPI dependency function
    """
    async def permission_check(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_db),
        organization_id: Optional[int] = None
    ) -> User:
        """Check permission dependency."""
        org_id = organization_id if organization_scoped else None
        
        await _check_permissions(
            db=db,
            user=current_user,
            permissions=[permission],
            organization_id=org_id,
            require_all=True,
            resource_name=f"dependency_{permission.value}"
        )
        
        return current_user
    
    return permission_check


def require_any_permission_dependency(*permissions: PermissionType, organization_scoped: bool = False):
    """
    Create a FastAPI dependency that requires any of the specified permissions.
    
    Args:
        permissions: Required permissions (user needs ANY)
        organization_scoped: Whether to check organization-scoped permissions
        
    Returns:
        FastAPI dependency function
    """
    async def permission_check(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_db),
        organization_id: Optional[int] = None
    ) -> User:
        """Check any permission dependency."""
        org_id = organization_id if organization_scoped else None
        
        await _check_permissions(
            db=db,
            user=current_user,
            permissions=list(permissions),
            organization_id=org_id,
            require_all=False,
            resource_name=f"dependency_any_of_{[p.value for p in permissions]}"
        )
        
        return current_user
    
    return permission_check


# Import current user with fallback
try:
    from app.api.v1.endpoints.auth import get_current_user
except ImportError:
    async def get_current_user() -> User:
        from app.models.user import User
        # Mock user for development
        return User(
            id=1,
            github_username="demo_user",
            email="demo@opsight.local",
            full_name="Demo User",
            is_active=True,
            is_superuser=False,
        )