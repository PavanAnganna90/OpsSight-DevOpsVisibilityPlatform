"""
Role-Based Access Control (RBAC) middleware for FastAPI.
Provides decorators, dependencies, and utilities for permission checking.
"""

from functools import wraps
from typing import List, Optional, Callable, Union
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging
import asyncio

from app.models.user import User
from app.models.role import PermissionType, SystemRole
from app.models.team import TeamRole
from app.models.user_team import UserTeam
from app.services.role_service import RoleService

# from app.api.v1.endpoints.auth import get_current_user
from app.db.database import get_db, get_async_db

logger = logging.getLogger(__name__)


class PermissionDeniedError(HTTPException):
    """Custom exception for permission denied errors."""

    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class RBACContext:
    """Context class for RBAC operations."""

    def __init__(self, user: User, db: AsyncSession, team_id: Optional[int] = None):
        self.user = user
        self.db = db
        self.team_id = team_id
        self._team_role = None

    async def team_role(self) -> Optional[TeamRole]:
        """Get user's role in the current team context."""
        if self.team_id and self._team_role is None:
            result = await self.db.execute(
                select(UserTeam).where(
                    UserTeam.user_id == self.user.id,
                    UserTeam.team_id == self.team_id,
                    UserTeam.is_active == True,
                )
            )
            membership = result.scalars().first()
            self._team_role = membership.role if membership else None
        return self._team_role

    async def has_system_permission(self, permission: PermissionType) -> bool:
        """Check if user has a system-wide permission."""
        return await RoleService.check_user_permission(
            self.db, self.user.id, permission
        )

    async def has_team_permission(self, permission: TeamRole) -> bool:
        """Check if user has a specific team role or higher."""
        if not self.team_id:
            return False

        current_role = await self.team_role()
        if not current_role:
            return False

        # Define role hierarchy (higher index = more permissions)
        role_hierarchy = [
            TeamRole.VIEWER,
            TeamRole.MEMBER,
            TeamRole.ADMIN,
            TeamRole.OWNER,
        ]
        required_level = role_hierarchy.index(permission)
        current_level = role_hierarchy.index(current_role)

        return current_level >= required_level

    async def is_team_member(self) -> bool:
        """Check if user is a member of the current team."""
        return await self.team_role() is not None

    def is_resource_owner(self, resource_user_id: int) -> bool:
        """Check if user owns the resource."""
        return self.user.id == resource_user_id

    async def can_access_resource(
        self, resource_user_id: int, required_permission: PermissionType
    ) -> bool:
        """Check if user can access a resource (owner or has permission)."""
        return self.is_resource_owner(
            resource_user_id
        ) or await self.has_system_permission(required_permission)


def require_permissions(
    permissions: Union[PermissionType, List[PermissionType]], all_required: bool = True
) -> Callable:
    """
    Decorator to require system-wide permissions.

    Args:
        permissions: Single permission or list of permissions
        all_required: If True, user needs ALL permissions; if False, user needs ANY permission
    """
    if isinstance(permissions, PermissionType):
        permissions = [permissions]

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract user and db from function arguments or dependencies
            current_user = kwargs.get("current_user")
            db = kwargs.get("db")

            if not current_user or not db:
                raise PermissionDeniedError("Authentication required")

            context = RBACContext(current_user, db)

            # Check permissions
            if all_required:
                # User needs ALL permissions
                has_access = all(
                    await context.has_system_permission(perm) for perm in permissions
                )
            else:
                # User needs ANY permission
                has_access = any(
                    await context.has_system_permission(perm) for perm in permissions
                )

            if not has_access:
                perm_names = [perm.value for perm in permissions]
                logger.warning(
                    f"User {current_user.id} denied access. Required permissions: {perm_names}"
                )
                raise PermissionDeniedError(
                    f"Required permissions: {', '.join(perm_names)}"
                )

            logger.info(
                f"User {current_user.id} granted access with permissions: {perm_names}"
            )
            return await func(*args, **kwargs)

        return wrapper

    return decorator


def require_team_role(team_role: TeamRole, team_id_param: str = "team_id") -> Callable:
    """
    Decorator to require specific team role.

    Args:
        team_role: Required team role
        team_id_param: Parameter name containing team ID
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get("current_user")
            db = kwargs.get("db")
            team_id = kwargs.get(team_id_param)

            if not current_user or not db:
                raise PermissionDeniedError("Authentication required")

            if not team_id:
                raise PermissionDeniedError("Team context required")

            context = RBACContext(current_user, db)

            if not await context.has_team_permission(team_role):
                logger.warning(
                    f"User {current_user.id} denied team access. Required role: {team_role.value}"
                )
                raise PermissionDeniedError(f"Required team role: {team_role.value}")

            logger.info(
                f"User {current_user.id} granted team access with role: {await context.team_role().value}"
            )
            return await func(*args, **kwargs)

        return wrapper

    return decorator


def require_admin() -> Callable:
    """Decorator to require admin permissions."""
    return require_permissions(
        [
            PermissionType.UPDATE_USERS,
            PermissionType.UPDATE_TEAMS,
            PermissionType.UPDATE_PROJECTS,
        ],
        all_required=False,
    )


def require_superuser() -> Callable:
    """Decorator to require superuser permissions."""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get("current_user")

            if not current_user:
                raise PermissionDeniedError("Authentication required")

            if not current_user.is_superuser:
                logger.warning(f"User {current_user.id} denied superuser access")
                raise PermissionDeniedError("Superuser access required")

            logger.info(f"Superuser {current_user.id} granted access")
            return await func(*args, **kwargs)

        return wrapper

    return decorator


# FastAPI Dependencies


async def get_rbac_context(
    request: Request,
    # current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
) -> RBACContext:
    """
    FastAPI dependency to get RBAC context.
    For demo purposes, this is simplified without user authentication.

    Returns:
        RBACContext: Context object for permission checking
    """
    # For demo purposes, create a mock user
    from app.models.user import User

    mock_user = User(
        id=1,
        github_username="demo_user",
        email="demo@opsight.local",
        full_name="Demo User",
        is_active=True,
        is_superuser=False,
    )

    # Extract team_id from path parameters if available
    team_id = request.path_params.get("team_id")
    if team_id:
        try:
            team_id = int(team_id)
        except (ValueError, TypeError):
            team_id = None

    return RBACContext(mock_user, db, team_id)


def require_permission(permission: PermissionType):
    """
    FastAPI dependency factory for permission checking.

    Args:
        permission: Required permission

    Returns:
        Dependency function
    """

    async def check_permission(
        context: RBACContext = Depends(get_rbac_context),
    ) -> RBACContext:
        if not await context.has_system_permission(permission):
            logger.warning(
                f"User {context.user.id} denied access. Required permission: {permission.value}"
            )
            raise PermissionDeniedError(f"Required permission: {permission.value}")

        logger.info(
            f"User {context.user.id} granted access with permission: {permission.value}"
        )
        return context

    return check_permission


# Enhanced permission checking functions using the new PermissionService

def require_enhanced_permission(permission: PermissionType, organization_id: Optional[int] = None) -> Callable:
    """
    Enhanced FastAPI dependency factory to require a specific permission with dual-level support.
    
    Args:
        permission: Required permission
        organization_id: Optional organization context
        
    Returns:
        FastAPI dependency function
    """
    async def permission_dependency(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_db),
        request: Request = None
    ) -> RBACContext:
        """Check if user has required permission using enhanced service."""
        try:
            # Use organization_id from URL path if available and not specified
            org_id = organization_id
            if org_id is None and request:
                path_params = getattr(request, 'path_params', {})
                org_id = path_params.get('organization_id')
            
            context = RBACContext(current_user, db)
            
            # Check permission using the enhanced permission service
            from app.services.permission_service import PermissionService
            permission_check = await PermissionService.check_user_permission(
                db, current_user.id, permission.value, org_id
            )
            
            if not permission_check["has_permission"]:
                logger.warning(
                    f"User {current_user.id} denied access. Required permission: {permission.value}"
                )
                await audit_access_attempt(
                    user=current_user,
                    resource=str(request.url) if request else "unknown",
                    action="access",
                    granted=False,
                    reason=f"Missing permission: {permission.value}"
                )
                raise PermissionDeniedError(f"Required permission: {permission.value}")
            
            logger.info(
                f"User {current_user.id} granted access with permission: {permission.value} from sources: {permission_check['sources']}"
            )
            return context
            
        except PermissionDeniedError:
            raise
        except Exception as e:
            logger.error(f"Error checking permission {permission.value}: {e}")
            raise PermissionDeniedError("Permission check failed")
    
    return permission_dependency


def require_any_enhanced_permission(*permissions: PermissionType, organization_id: Optional[int] = None) -> Callable:
    """
    Enhanced FastAPI dependency factory to require ANY of the specified permissions.
    
    Args:
        permissions: List of permissions (user needs ANY one)
        organization_id: Optional organization context
        
    Returns:
        FastAPI dependency function
    """
    async def permission_dependency(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_db),
        request: Request = None
    ) -> RBACContext:
        """Check if user has any of the required permissions."""
        try:
            org_id = organization_id
            if org_id is None and request:
                path_params = getattr(request, 'path_params', {})
                org_id = path_params.get('organization_id')
            
            context = RBACContext(current_user, db)
            
            # Check each permission until one passes
            from app.services.permission_service import PermissionService
            granted_permissions = []
            
            for permission in permissions:
                permission_check = await PermissionService.check_user_permission(
                    db, current_user.id, permission.value, org_id
                )
                if permission_check["has_permission"]:
                    granted_permissions.append({
                        "permission": permission.value,
                        "sources": permission_check["sources"]
                    })
            
            if not granted_permissions:
                permission_names = [p.value for p in permissions]
                logger.warning(
                    f"User {current_user.id} denied access. Required ANY of: {permission_names}"
                )
                await audit_access_attempt(
                    user=current_user,
                    resource=str(request.url) if request else "unknown",
                    action="access",
                    granted=False,
                    reason=f"Missing any permission from: {permission_names}"
                )
                raise PermissionDeniedError(f"Required any of: {', '.join(permission_names)}")
            
            logger.info(
                f"User {current_user.id} granted access with permissions: {granted_permissions}"
            )
            return context
            
        except PermissionDeniedError:
            raise
        except Exception as e:
            logger.error(f"Error checking permissions {[p.value for p in permissions]}: {e}")
            raise PermissionDeniedError("Permission check failed")
    
    return permission_dependency


async def audit_access_attempt(
    user: User,
    resource: str,
    action: str,
    granted: bool,
    reason: Optional[str] = None,
    organization_id: Optional[int] = None
):
    """
    Audit access attempts for security monitoring.
    
    Args:
        user: User attempting access
        resource: Resource being accessed
        action: Action being performed
        granted: Whether access was granted
        reason: Reason if access was denied
        organization_id: Optional organization context
    """
    try:
        from datetime import datetime
        
        # Create audit log entry
        audit_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user.id,
            "username": getattr(user, 'username', getattr(user, 'github_username', 'unknown')),
            "resource": resource,
            "action": action,
            "granted": granted,
            "reason": reason,
            "organization_id": organization_id,
        }
        
        # Log the attempt
        if granted:
            logger.info(f"ACCESS GRANTED: {audit_entry}")
        else:
            logger.warning(f"ACCESS DENIED: {audit_entry}")
        
        # In a production system, you would also store this in a dedicated audit table
        # For now, we're using structured logging which can be processed by log aggregation systems
        
    except Exception as e:
        logger.error(f"Error auditing access attempt: {e}")
        # Don't raise here as audit failures shouldn't block the main operation


# Import get_current_user with fallback handling
try:
    from app.api.v1.endpoints.auth import get_current_user
except ImportError:
    # Fallback for testing or if auth module is not available
    async def get_current_user() -> User:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Authentication not implemented"
        )


def require_team_access(min_role: TeamRole = TeamRole.MEMBER):
    """
    FastAPI dependency factory for team access checking.

    Args:
        min_role: Minimum required team role

    Returns:
        Dependency function
    """

    async def check_team_access(
        context: RBACContext = Depends(get_rbac_context),
    ) -> RBACContext:
        if not context.team_id:
            raise PermissionDeniedError("Team context required")

        if not await context.has_team_permission(min_role):
            logger.warning(
                f"User {context.user.id} denied team access. Required role: {min_role.value}"
            )
            raise PermissionDeniedError(f"Required team role: {min_role.value}")

        logger.info(
            f"User {context.user.id} granted team access with role: {min_role.value}"
        )
        return context

    return check_team_access


def require_resource_access(
    permission: PermissionType, resource_user_id_param: str = "user_id"
):
    """
    FastAPI dependency factory for resource access checking.
    Allows access if user owns the resource OR has the required permission.

    Args:
        permission: Required permission for non-owners
        resource_user_id_param: Parameter name containing resource owner ID

    Returns:
        Dependency function
    """

    async def check_resource_access(
        request: Request, context: RBACContext = Depends(get_rbac_context)
    ) -> RBACContext:
        # Extract resource owner ID from path parameters
        resource_user_id = request.path_params.get(resource_user_id_param)
        if resource_user_id:
            try:
                resource_user_id = int(resource_user_id)
            except (ValueError, TypeError):
                raise PermissionDeniedError("Invalid resource identifier")
        else:
            raise PermissionDeniedError("Resource identifier required")

        if not await context.can_access_resource(resource_user_id, permission):
            logger.warning(
                f"User {context.user.id} denied resource access. Required permission: {permission.value}"
            )
            raise PermissionDeniedError(
                f"Required permission: {permission.value} or resource ownership"
            )

        logger.info(f"User {context.user.id} granted resource access")
        return context

    return check_resource_access


# Utility Functions


async def check_multiple_permissions(user, db, permissions, all_required=True):
    """
    Async: Check if a user has multiple permissions.
    Args:
        user: The user object.
        db: The database/session object.
        permissions (list): List of permissions to check.
        all_required (bool): If True, all permissions are required. If False, any one suffices.
    Returns:
        bool: True if the user has the required permissions.
    """
    results = []
    for perm in permissions:
        # Await the async has_permission function
        result = await RoleService.check_user_permission(db, user.id, perm)
        results.append(result)
    if all_required:
        return all(results)
    else:
        return any(results)


def get_user_effective_permissions(user: User, db: Session) -> List[str]:
    """
    Get all effective permissions for a user.

    Args:
        user: User to get permissions for
        db: Database session

    Returns:
        List[str]: List of permission names
    """
    return RoleService.get_user_permissions(db, user.id)


def audit_access_attempt(
    user: User, resource: str, action: str, granted: bool, reason: Optional[str] = None
):
    """
    Log access attempts for audit purposes.

    Args:
        user: User attempting access
        resource: Resource being accessed
        action: Action being performed
        granted: Whether access was granted
        reason: Reason for denial (if applicable)
    """
    log_level = logging.INFO if granted else logging.WARNING
    status = "GRANTED" if granted else "DENIED"

    log_msg = f"ACCESS {status}: User {user.id} ({user.github_username}) -> {resource}:{action}"
    if reason and not granted:
        log_msg += f" - {reason}"

    logger.log(log_level, log_msg)
