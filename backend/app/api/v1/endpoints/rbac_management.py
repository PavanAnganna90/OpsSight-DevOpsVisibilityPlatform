"""
Advanced RBAC Management API Endpoints
Comprehensive role and permission management for teams and organizations
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
import logging

from app.core.dependencies import get_async_db
from app.models.user import User
from app.models.role import Role, Permission, PermissionType, SystemRole
from app.models.team import Team, TeamRole
from app.models.user_role import UserRole
from app.models.user_team import UserTeam
from app.models.user_permission import UserPermission
from app.schemas.role import (
    RoleResponse,
    RoleCreate,
    RoleUpdate,
    PermissionResponse,
    UserRoleAssignment,
    RolePermissionAssignment,
    UserPermissionAssignment,
)
from app.services.role_service import RoleService
from app.services.permission_service import PermissionService
from app.services.team_service import TeamService
from app.core.auth import (
    get_current_user,
    require_permission,
    require_team_access,
    RBACContext,
    PermissionDeniedError,
    audit_access_attempt,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/roles", response_model=List[RoleResponse])
async def list_roles(
    organization_id: Optional[int] = Query(None, description="Filter by organization"),
    include_system_roles: bool = Query(False, description="Include system-wide roles"),
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.VIEW_ROLES)),
) -> List[RoleResponse]:
    """
    List all roles with optional filtering.
    """
    try:
        roles = await RoleService.get_all_roles(
            db, 
            organization_id=organization_id,
            include_system_roles=include_system_roles
        )
        
        audit_access_attempt(
            user_id=context.user.id,
            action="list_roles",
            resource="roles",
            success=True,
            metadata={
                "organization_id": organization_id,
                "include_system_roles": include_system_roles,
                "role_count": len(roles)
            }
        )
        
        return [RoleResponse.from_orm(role) for role in roles]
        
    except Exception as e:
        logger.error(f"Failed to list roles: {str(e)}")
        audit_access_attempt(
            user_id=context.user.id,
            action="list_roles",
            resource="roles",
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve roles"
        )


@router.post("/roles", response_model=RoleResponse)
async def create_role(
    role_data: RoleCreate,
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.MANAGE_ROLES)),
) -> RoleResponse:
    """
    Create a new role with specified permissions.
    """
    try:
        # Validate permissions exist
        for permission_id in role_data.permission_ids:
            permission = await PermissionService.get_permission_by_id(db, permission_id)
            if not permission:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Permission with ID {permission_id} not found"
                )
        
        role = await RoleService.create_role(
            db,
            name=role_data.name,
            display_name=role_data.display_name,
            description=role_data.description,
            organization_id=role_data.organization_id,
            permission_ids=role_data.permission_ids,
            is_default=role_data.is_default,
            priority=role_data.priority
        )
        
        audit_access_attempt(
            user_id=context.user.id,
            action="create_role",
            resource="roles",
            success=True,
            metadata={
                "role_id": role.id,
                "role_name": role.name,
                "organization_id": role.organization_id,
                "permissions_count": len(role_data.permission_ids)
            }
        )
        
        return RoleResponse.from_orm(role)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create role: {str(e)}")
        audit_access_attempt(
            user_id=context.user.id,
            action="create_role",
            resource="roles",
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create role"
        )


@router.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: int = Path(..., description="Role ID"),
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.VIEW_ROLES)),
) -> RoleResponse:
    """
    Get detailed information about a specific role.
    """
    try:
        role = await RoleService.get_role_by_id(db, role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        
        # Check organization access if not a system role
        if role.organization_id and not await context.has_system_permission(PermissionType.VIEW_ALL_ORGANIZATIONS):
            # Additional organization access check would go here
            pass
        
        audit_access_attempt(
            user_id=context.user.id,
            action="get_role",
            resource="roles",
            resource_id=str(role_id),
            success=True
        )
        
        return RoleResponse.from_orm(role)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get role {role_id}: {str(e)}")
        audit_access_attempt(
            user_id=context.user.id,
            action="get_role",
            resource="roles",
            resource_id=str(role_id),
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve role"
        )


@router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: int = Path(..., description="Role ID"),
    role_data: RoleUpdate = ...,
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.MANAGE_ROLES)),
) -> RoleResponse:
    """
    Update an existing role.
    """
    try:
        role = await RoleService.get_role_by_id(db, role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        
        # Prevent updating system roles unless super admin
        if role.is_system_role and not await context.has_system_permission(PermissionType.MANAGE_SYSTEM_SETTINGS):
            raise PermissionDeniedError("Cannot modify system roles")
        
        updated_role = await RoleService.update_role(
            db,
            role_id=role_id,
            display_name=role_data.display_name,
            description=role_data.description,
            permission_ids=role_data.permission_ids,
            is_active=role_data.is_active,
            priority=role_data.priority
        )
        
        audit_access_attempt(
            user_id=context.user.id,
            action="update_role",
            resource="roles",
            resource_id=str(role_id),
            success=True,
            metadata={"updated_fields": role_data.dict(exclude_unset=True)}
        )
        
        return RoleResponse.from_orm(updated_role)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update role {role_id}: {str(e)}")
        audit_access_attempt(
            user_id=context.user.id,
            action="update_role",
            resource="roles",
            resource_id=str(role_id),
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update role"
        )


@router.delete("/roles/{role_id}")
async def delete_role(
    role_id: int = Path(..., description="Role ID"),
    force: bool = Query(False, description="Force delete even if users assigned"),
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.MANAGE_ROLES)),
):
    """
    Delete a role.
    """
    try:
        role = await RoleService.get_role_by_id(db, role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        
        # Prevent deleting system roles
        if role.is_system_role:
            raise PermissionDeniedError("Cannot delete system roles")
        
        # Check if role has active users
        if not force:
            active_users = await RoleService.get_users_with_role(db, role_id)
            if active_users:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Role has {len(active_users)} active users. Use force=true to delete anyway."
                )
        
        await RoleService.delete_role(db, role_id)
        
        audit_access_attempt(
            user_id=context.user.id,
            action="delete_role",
            resource="roles",
            resource_id=str(role_id),
            success=True,
            metadata={"force": force, "role_name": role.name}
        )
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Role deleted successfully"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete role {role_id}: {str(e)}")
        audit_access_attempt(
            user_id=context.user.id,
            action="delete_role",
            resource="roles",
            resource_id=str(role_id),
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete role"
        )


@router.get("/permissions", response_model=List[PermissionResponse])
async def list_permissions(
    category: Optional[str] = Query(None, description="Filter by permission category"),
    organization_id: Optional[int] = Query(None, description="Filter by organization"),
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.VIEW_ROLES)),
) -> List[PermissionResponse]:
    """
    List all available permissions.
    """
    try:
        permissions = await PermissionService.get_all_permissions(
            db, 
            category=category,
            organization_id=organization_id
        )
        
        audit_access_attempt(
            user_id=context.user.id,
            action="list_permissions",
            resource="permissions",
            success=True,
            metadata={
                "category": category,
                "organization_id": organization_id,
                "permission_count": len(permissions)
            }
        )
        
        return [PermissionResponse.from_orm(perm) for perm in permissions]
        
    except Exception as e:
        logger.error(f"Failed to list permissions: {str(e)}")
        audit_access_attempt(
            user_id=context.user.id,
            action="list_permissions",
            resource="permissions",
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve permissions"
        )


@router.post("/users/{user_id}/roles")
async def assign_user_role(
    user_id: int = Path(..., description="User ID"),
    assignment: UserRoleAssignment = ...,
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.MANAGE_USERS)),
):
    """
    Assign a role to a user.
    """
    try:
        # Validate user exists
        user = await db.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Validate role exists
        role = await RoleService.get_role_by_id(db, assignment.role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        
        # Assign role
        user_role = await RoleService.assign_role_to_user(
            db,
            user_id=user_id,
            role_id=assignment.role_id,
            organization_id=assignment.organization_id,
            expires_at=assignment.expires_at,
            granted_by=context.user.id
        )
        
        audit_access_attempt(
            user_id=context.user.id,
            action="assign_user_role",
            resource="user_roles",
            success=True,
            metadata={
                "target_user_id": user_id,
                "role_id": assignment.role_id,
                "organization_id": assignment.organization_id
            }
        )
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Role assigned successfully",
                "user_role_id": user_role.id
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to assign role to user {user_id}: {str(e)}")
        audit_access_attempt(
            user_id=context.user.id,
            action="assign_user_role",
            resource="user_roles",
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign role"
        )


@router.delete("/users/{user_id}/roles/{role_id}")
async def revoke_user_role(
    user_id: int = Path(..., description="User ID"),
    role_id: int = Path(..., description="Role ID"),
    organization_id: Optional[int] = Query(None, description="Organization context"),
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.MANAGE_USERS)),
):
    """
    Revoke a role from a user.
    """
    try:
        success = await RoleService.revoke_role_from_user(
            db,
            user_id=user_id,
            role_id=role_id,
            organization_id=organization_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User role assignment not found"
            )
        
        audit_access_attempt(
            user_id=context.user.id,
            action="revoke_user_role",
            resource="user_roles",
            success=True,
            metadata={
                "target_user_id": user_id,
                "role_id": role_id,
                "organization_id": organization_id
            }
        )
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Role revoked successfully"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to revoke role from user {user_id}: {str(e)}")
        audit_access_attempt(
            user_id=context.user.id,
            action="revoke_user_role",
            resource="user_roles",
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke role"
        )


@router.get("/users/{user_id}/effective-permissions")
async def get_user_effective_permissions(
    user_id: int = Path(..., description="User ID"),
    organization_id: Optional[int] = Query(None, description="Organization context"),
    team_id: Optional[int] = Query(None, description="Team context"),
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.VIEW_USERS)),
) -> Dict[str, Any]:
    """
    Get all effective permissions for a user across roles and direct assignments.
    """
    try:
        # Check if requesting user can view this user's permissions
        if user_id != context.user.id and not await context.has_system_permission(PermissionType.MANAGE_USERS):
            raise PermissionDeniedError("Cannot view other user's permissions")
        
        effective_permissions = await RoleService.get_user_effective_permissions(
            db,
            user_id=user_id,
            organization_id=organization_id,
            team_id=team_id
        )
        
        audit_access_attempt(
            user_id=context.user.id,
            action="get_user_effective_permissions",
            resource="user_permissions",
            success=True,
            metadata={
                "target_user_id": user_id,
                "organization_id": organization_id,
                "team_id": team_id
            }
        )
        
        return {
            "user_id": user_id,
            "organization_id": organization_id,
            "team_id": team_id,
            "effective_permissions": effective_permissions,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get effective permissions for user {user_id}: {str(e)}")
        audit_access_attempt(
            user_id=context.user.id,
            action="get_user_effective_permissions",
            resource="user_permissions",
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user permissions"
        )


@router.post("/teams/{team_id}/members/{user_id}/role")
async def update_team_member_role(
    team_id: int = Path(..., description="Team ID"),
    user_id: int = Path(..., description="User ID"),
    new_role: TeamRole = Query(..., description="New team role"),
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_team_access(TeamRole.ADMIN, "team_id")),
):
    """
    Update a team member's role.
    """
    try:
        # Prevent role changes to team owners unless requester is owner
        current_role = await TeamService.get_user_team_role(db, user_id, team_id)
        if current_role == TeamRole.OWNER and not await context.has_team_permission(TeamRole.OWNER):
            raise PermissionDeniedError("Only team owners can modify owner roles")
        
        # Prevent users from promoting themselves to owner
        if user_id == context.user.id and new_role == TeamRole.OWNER:
            raise PermissionDeniedError("Cannot promote yourself to owner")
        
        success = await TeamService.update_member_role(
            db,
            team_id=team_id,
            user_id=user_id,
            new_role=new_role,
            updated_by=context.user.id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team member not found"
            )
        
        audit_access_attempt(
            user_id=context.user.id,
            action="update_team_member_role",
            resource="team_memberships",
            success=True,
            metadata={
                "team_id": team_id,
                "target_user_id": user_id,
                "old_role": current_role,
                "new_role": new_role
            }
        )
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Team member role updated successfully",
                "team_id": team_id,
                "user_id": user_id,
                "new_role": new_role
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update team member role: {str(e)}")
        audit_access_attempt(
            user_id=context.user.id,
            action="update_team_member_role",
            resource="team_memberships",
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update team member role"
        )


@router.get("/rbac/health")
async def rbac_health_check(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Health check endpoint for RBAC system.
    """
    try:
        # Check basic RBAC functionality
        user_roles = await RoleService.get_user_roles(db, current_user.id)
        user_permissions = await RoleService.get_user_permissions(db, current_user.id)
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": current_user.id,
            "roles_count": len(user_roles),
            "permissions_count": len(user_permissions),
            "rbac_version": "2.0"
        }
        
    except Exception as e:
        logger.error(f"RBAC health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e),
            "rbac_version": "2.0"
        }