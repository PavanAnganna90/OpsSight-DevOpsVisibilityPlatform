"""
Role management API endpoints.
Demonstrates RBAC middleware integration for system role management.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.core.dependencies import get_db, get_async_db
from app.models.user import User
from app.models.role import PermissionType
from app.schemas.role import (
    RoleResponse,
    RoleCreate,
    RoleUpdate,
    UserRoleAssignmentRequest,
    UserRoleAssignmentResponse,
    RolePermissionsResponse,
)
from app.services.role_service import RoleService
from app.core.auth import (
    get_current_user,
    require_permission,
    get_rbac_context,
    RBACContext,
    PermissionDeniedError,
    audit_access_attempt,
)
from app.core.cache_decorators import cached_endpoint, DataType

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=List[RoleResponse])
@cached_endpoint(ttl=300, data_type=DataType.API_RESPONSE)  # Cache for 5 minutes
async def list_roles(
    db: Session = Depends(get_db),
    context: RBACContext = Depends(require_permission(PermissionType.VIEW_ROLES)),
) -> List[RoleResponse]:
    """
    List all available system roles.

    Requires VIEW_ROLES permission.
    """
    try:
        roles = await RoleService.get_all_roles(db)
        audit_access_attempt(
            user=context.user, resource="roles", action="list", granted=True
        )
        return roles
    except Exception as e:
        logger.error(f"Error listing roles: {e}")
        audit_access_attempt(
            user=context.user,
            resource="roles",
            action="list",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve roles",
        )


@router.post("/", response_model=RoleResponse)
async def create_role(
    role_data: RoleCreate,
    db: Session = Depends(get_db),
    context: RBACContext = Depends(require_permission(PermissionType.MANAGE_ROLES)),
) -> RoleResponse:
    """
    Create a new system role.

    Requires MANAGE_ROLES permission.
    """
    try:
        role = await RoleService.create_role(db, role_data)
        audit_access_attempt(
            user=context.user, resource="roles", action="create", granted=True
        )
        logger.info(f"User {context.user.id} created role: {role.name}")
        return role
    except ValueError as e:
        audit_access_attempt(
            user=context.user,
            resource="roles",
            action="create",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating role: {e}")
        audit_access_attempt(
            user=context.user,
            resource="roles",
            action="create",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create role",
        )


@router.get("/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    context: RBACContext = Depends(require_permission(PermissionType.VIEW_ROLES)),
) -> RoleResponse:
    """
    Get a specific role by ID.

    Requires VIEW_ROLES permission.
    """
    try:
        role = await RoleService.get_role_by_id(db, role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Role not found"
            )

        audit_access_attempt(
            user=context.user, resource=f"roles/{role_id}", action="view", granted=True
        )
        return role
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving role {role_id}: {e}")
        audit_access_attempt(
            user=context.user,
            resource=f"roles/{role_id}",
            action="view",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve role",
        )


@router.put("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: int,
    role_data: RoleUpdate,
    db: Session = Depends(get_db),
    context: RBACContext = Depends(require_permission(PermissionType.MANAGE_ROLES)),
) -> RoleResponse:
    """
    Update an existing role.

    Requires MANAGE_ROLES permission.
    """
    try:
        role = await RoleService.update_role(db, role_id, role_data)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Role not found"
            )

        audit_access_attempt(
            user=context.user,
            resource=f"roles/{role_id}",
            action="update",
            granted=True,
        )
        logger.info(f"User {context.user.id} updated role: {role_id}")
        return role
    except HTTPException:
        raise
    except ValueError as e:
        audit_access_attempt(
            user=context.user,
            resource=f"roles/{role_id}",
            action="update",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating role {role_id}: {e}")
        audit_access_attempt(
            user=context.user,
            resource=f"roles/{role_id}",
            action="update",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update role",
        )


@router.delete("/{role_id}")
async def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    context: RBACContext = Depends(require_permission(PermissionType.MANAGE_ROLES)),
) -> dict:
    """
    Delete a role.

    Requires MANAGE_ROLES permission.
    """
    try:
        success = await RoleService.delete_role(db, role_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Role not found"
            )

        audit_access_attempt(
            user=context.user,
            resource=f"roles/{role_id}",
            action="delete",
            granted=True,
        )
        logger.info(f"User {context.user.id} deleted role: {role_id}")
        return {"message": "Role deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting role {role_id}: {e}")
        audit_access_attempt(
            user=context.user,
            resource=f"roles/{role_id}",
            action="delete",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete role",
        )


@router.post("/assign", response_model=UserRoleAssignmentResponse)
async def assign_user_role(
    assignment: UserRoleAssignmentRequest,
    db: Session = Depends(get_db),
    context: RBACContext = Depends(require_permission(PermissionType.UPDATE_USERS)),
) -> UserRoleAssignmentResponse:
    """
    Assign a role to a user.

    Requires USER_MANAGE permission.
    """
    try:
        result = await RoleService.assign_user_role(
            db, assignment.user_id, assignment.role_id
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to assign role to user",
            )

        audit_access_attempt(
            user=context.user,
            resource=f"users/{assignment.user_id}/roles",
            action="assign",
            granted=True,
        )
        logger.info(
            f"User {context.user.id} assigned role {assignment.role_id} to user {assignment.user_id}"
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning role: {e}")
        audit_access_attempt(
            user=context.user,
            resource=f"users/{assignment.user_id}/roles",
            action="assign",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign role",
        )


@router.get("/{role_id}/permissions", response_model=RolePermissionsResponse)
@cached_endpoint(ttl=600, data_type=DataType.API_RESPONSE)  # Cache for 10 minutes
async def get_role_permissions(
    role_id: int,
    db: Session = Depends(get_db),
    context: RBACContext = Depends(require_permission(PermissionType.VIEW_ROLES)),
) -> RolePermissionsResponse:
    """
    Get permissions for a specific role.

    Requires VIEW_ROLES permission.
    """
    try:
        permissions = await RoleService.get_role_permissions(db, role_id)
        if permissions is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Role not found"
            )

        audit_access_attempt(
            user=context.user,
            resource=f"roles/{role_id}/permissions",
            action="view",
            granted=True,
        )
        return permissions
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving role permissions: {e}")
        audit_access_attempt(
            user=context.user,
            resource=f"roles/{role_id}/permissions",
            action="view",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve role permissions",
        )
