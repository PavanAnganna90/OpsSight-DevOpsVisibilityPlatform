"""
Permission management API endpoints.
Provides comprehensive CRUD operations for permissions and permission assignments.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.core.dependencies import get_async_db
from app.models.user import User
from app.models.role import PermissionType, Permission, Role
from app.schemas.role import (
    Permission,
    PermissionCreate,
    PermissionUpdate,
    BulkPermissionUpdate,
    PermissionStatistics,
)
from app.services.permission_service import PermissionService
from app.core.auth import (
    get_current_user,
    require_permission,
    get_rbac_context,
    RBACContext,
    PermissionDeniedError,
    audit_access_attempt,
)
from app.schemas.user_permission import (
    UserPermissionCreate,
    UserPermissionRevoke,
    UserPermissionOut,
)
from app.services import user_permission as user_permission_service
from app.core.cache_decorators import cached_endpoint, DataType

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=List[Permission])
@cached_endpoint(ttl=600, data_type=DataType.API_RESPONSE)  # Cache for 10 minutes
async def list_permissions(
    category: Optional[str] = Query(None, description="Filter by permission category"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    organization_id: Optional[int] = Query(None, description="Filter by organization"),
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.VIEW_ROLES)),
) -> List[Permission]:
    """
    List all available permissions with optional filtering.

    Requires VIEW_ROLES permission.
    """
    try:
        permissions = await PermissionService.get_permissions(
            db, category=category, is_active=is_active, organization_id=organization_id
        )

        await audit_access_attempt(
            user=context.user, resource="permissions", action="list", granted=True
        )
        return permissions
    except Exception as e:
        logger.error(f"Error listing permissions: {e}")
        await audit_access_attempt(
            user=context.user,
            resource="permissions",
            action="list",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve permissions",
        )


@router.post("/", response_model=Permission)
async def create_permission(
    permission_data: PermissionCreate,
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.MANAGE_ROLES)),
) -> Permission:
    """
    Create a new permission.

    Requires MANAGE_ROLES permission.
    """
    try:
        permission = await PermissionService.create_permission(db, permission_data)

        await audit_access_attempt(
            user=context.user, resource="permissions", action="create", granted=True
        )
        logger.info(f"User {context.user.id} created permission: {permission.name}")
        return permission
    except ValueError as e:
        await audit_access_attempt(
            user=context.user,
            resource="permissions",
            action="create",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating permission: {e}")
        await audit_access_attempt(
            user=context.user,
            resource="permissions",
            action="create",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create permission",
        )


@router.get("/{permission_id}", response_model=Permission)
async def get_permission(
    permission_id: int,
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.VIEW_ROLES)),
) -> Permission:
    """
    Get a specific permission by ID.

    Requires VIEW_ROLES permission.
    """
    try:
        permission = await PermissionService.get_permission_by_id(db, permission_id)
        if not permission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Permission not found"
            )

        await audit_access_attempt(
            user=context.user,
            resource=f"permissions/{permission_id}",
            action="view",
            granted=True,
        )
        return permission
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving permission {permission_id}: {e}")
        await audit_access_attempt(
            user=context.user,
            resource=f"permissions/{permission_id}",
            action="view",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve permission",
        )


@router.put("/{permission_id}", response_model=Permission)
async def update_permission(
    permission_id: int,
    permission_data: PermissionUpdate,
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.MANAGE_ROLES)),
) -> Permission:
    """
    Update a permission.

    Requires MANAGE_ROLES permission.
    """
    try:
        permission = await PermissionService.update_permission(
            db, permission_id, permission_data
        )
        if not permission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Permission not found"
            )

        await audit_access_attempt(
            user=context.user,
            resource=f"permissions/{permission_id}",
            action="update",
            granted=True,
        )
        logger.info(f"User {context.user.id} updated permission: {permission.name}")
        return permission
    except ValueError as e:
        await audit_access_attempt(
            user=context.user,
            resource=f"permissions/{permission_id}",
            action="update",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating permission {permission_id}: {e}")
        await audit_access_attempt(
            user=context.user,
            resource=f"permissions/{permission_id}",
            action="update",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update permission",
        )


@router.delete("/{permission_id}")
async def delete_permission(
    permission_id: int,
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.MANAGE_ROLES)),
):
    """
    Delete a permission.

    Requires MANAGE_ROLES permission.
    Note: This will remove the permission from all roles that have it.
    """
    try:
        success = await PermissionService.delete_permission(db, permission_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Permission not found"
            )

        await audit_access_attempt(
            user=context.user,
            resource=f"permissions/{permission_id}",
            action="delete",
            granted=True,
        )
        logger.info(f"User {context.user.id} deleted permission: {permission_id}")
        return {"message": "Permission deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting permission {permission_id}: {e}")
        await audit_access_attempt(
            user=context.user,
            resource=f"permissions/{permission_id}",
            action="delete",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete permission",
        )


@router.get("/categories/all", response_model=Dict[str, List[Permission]])
@cached_endpoint(ttl=3600, data_type=DataType.API_RESPONSE)  # Cache for 1 hour
async def get_permission_categories(
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.VIEW_ROLES)),
) -> Dict[str, List[Permission]]:
    """
    Get all permission categories with their associated permissions.

    Requires VIEW_ROLES permission.
    """
    try:
        categories = await PermissionService.get_permission_categories(db)

        await audit_access_attempt(
            user=context.user,
            resource="permissions/categories",
            action="view",
            granted=True,
        )
        return categories
    except Exception as e:
        logger.error(f"Error retrieving permission categories: {e}")
        await audit_access_attempt(
            user=context.user,
            resource="permissions/categories",
            action="view",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve permission categories",
        )


@router.post("/bulk/update", response_model=Dict[str, Any])
async def bulk_update_permissions(
    bulk_data: BulkPermissionUpdate,
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.MANAGE_ROLES)),
) -> Dict[str, Any]:
    """
    Bulk update multiple permissions.

    Requires MANAGE_ROLES permission.
    """
    try:
        result = await PermissionService.bulk_update_permissions(db, bulk_data)

        await audit_access_attempt(
            user=context.user,
            resource="permissions/bulk",
            action="update",
            granted=True,
        )
        logger.info(f"User {context.user.id} performed bulk permission update")
        return result
    except ValueError as e:
        await audit_access_attempt(
            user=context.user,
            resource="permissions/bulk",
            action="update",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error in bulk permission update: {e}")
        await audit_access_attempt(
            user=context.user,
            resource="permissions/bulk",
            action="update",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform bulk permission update",
        )


@router.get("/statistics", response_model=PermissionStatistics)
async def get_permission_statistics(
    organization_id: Optional[int] = Query(None, description="Filter by organization"),
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.VIEW_ROLES)),
) -> PermissionStatistics:
    """
    Get statistics about permission usage and distribution.

    Requires VIEW_ROLES permission.
    """
    try:
        stats = await PermissionService.get_permission_statistics(db, organization_id)

        await audit_access_attempt(
            user=context.user,
            resource="permissions/statistics",
            action="view",
            granted=True,
        )
        return stats
    except Exception as e:
        logger.error(f"Error retrieving permission statistics: {e}")
        await audit_access_attempt(
            user=context.user,
            resource="permissions/statistics",
            action="view",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve permission statistics",
        )


@router.post("/users/{user_id}/permissions/assign", response_model=UserPermissionOut)
async def assign_permission_to_user(
    user_id: int,
    data: UserPermissionCreate = Body(...),
    db: AsyncSession = Depends(get_async_db),
) -> UserPermissionOut:
    """
    Assign a permission directly to a user (optionally organization-scoped).
    Requires MANAGE_ROLES permission.
    """
    logger.debug(
        f"[DEBUG] assign_permission_to_user: db type={type(db)}, repr={repr(db)}"
    )
    print(f"[DEBUG] assign_permission_to_user: user_id={user_id}, data={data}")
    logger.info(
        f"[assign_permission_to_user] Incoming request for user_id={user_id}: {data.json()}"
    )
    try:
        user_permission = await user_permission_service.assign_user_permission(
            db,
            user_id=user_id,
            permission_id=data.permission_id,
            organization_id=data.organization_id,
        )
        return user_permission
    except Exception as e:
        logger.error(f"Error assigning permission to user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign permission to user",
        )


@router.post("/users/{user_id}/permissions/revoke", response_model=dict)
async def revoke_permission_from_user(
    user_id: int,
    data: UserPermissionRevoke = Body(...),
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.MANAGE_ROLES)),
) -> dict:
    """
    Revoke a direct user-permission assignment (soft delete).
    Requires MANAGE_ROLES permission.
    """
    logger.debug(
        f"[DEBUG] revoke_permission_from_user: db type={type(db)}, repr={repr(db)}"
    )
    print(
        f"[DEBUG] revoke_permission_from_user: user_id={user_id}, data={data.dict() if hasattr(data, 'dict') else data}"
    )
    logger.info(
        f"[revoke_permission_from_user] Incoming request for user_id={user_id}: {data.json()}"
    )
    try:
        revoked = await user_permission_service.revoke_user_permission(
            db,
            user_id=user_id,
            permission_id=data.permission_id,
            organization_id=data.organization_id,
        )
        await audit_access_attempt(
            user=context.user,
            resource=f"users/{user_id}/permissions",
            action="revoke",
            granted=revoked,
        )
        if not revoked:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User permission not found or already revoked",
            )
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking permission from user {user_id}: {e}")
        await audit_access_attempt(
            user=context.user,
            resource=f"users/{user_id}/permissions",
            action="revoke",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke permission from user",
        )


@router.get("/users/{user_id}/permissions", response_model=List[UserPermissionOut])
async def list_user_permissions(
    user_id: int,
    organization_id: Optional[int] = Query(None, description="Filter by organization"),
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.VIEW_ROLES)),
) -> List[UserPermissionOut]:
    """
    List all direct user-permissions for a user (optionally organization-scoped).
    Requires VIEW_ROLES permission.
    """
    try:
        permissions = await user_permission_service.list_user_permissions(
            db, user_id, organization_id
        )
        return permissions
    except Exception as e:
        logger.error(f"Error listing user permissions for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list user permissions",
        )


@router.get("/users/{user_id}/effective", response_model=Dict[str, Any])
async def get_user_effective_permissions(
    user_id: int,
    organization_id: Optional[int] = Query(None, description="Filter by organization"),
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.VIEW_ROLES)),
) -> Dict[str, Any]:
    """
    Get all effective permissions for a user (from roles + direct assignments).
    
    Requires VIEW_ROLES permission.
    """
    try:
        effective_perms = await PermissionService.get_user_effective_permissions(
            db, user_id, organization_id
        )
        
        await audit_access_attempt(
            user=context.user,
            resource=f"users/{user_id}/effective-permissions",
            action="view",
            granted=True,
        )
        return effective_perms
    except ValueError as e:
        await audit_access_attempt(
            user=context.user,
            resource=f"users/{user_id}/effective-permissions",
            action="view",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error retrieving effective permissions for user {user_id}: {e}")
        await audit_access_attempt(
            user=context.user,
            resource=f"users/{user_id}/effective-permissions",
            action="view",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve effective permissions",
        )


@router.post("/users/{user_id}/check", response_model=Dict[str, Any])
async def check_user_permission(
    user_id: int,
    permission_name: str = Body(..., embed=True),
    organization_id: Optional[int] = Body(None, embed=True),
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.VIEW_ROLES)),
) -> Dict[str, Any]:
    """
    Check if a user has a specific permission (from any source).
    
    Requires VIEW_ROLES permission.
    """
    try:
        check_result = await PermissionService.check_user_permission(
            db, user_id, permission_name, organization_id
        )
        
        await audit_access_attempt(
            user=context.user,
            resource=f"users/{user_id}/permission-check",
            action="check",
            granted=True,
        )
        return check_result
    except ValueError as e:
        await audit_access_attempt(
            user=context.user,
            resource=f"users/{user_id}/permission-check",
            action="check",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error checking permission {permission_name} for user {user_id}: {e}")
        await audit_access_attempt(
            user=context.user,
            resource=f"users/{user_id}/permission-check",
            action="check",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check user permission",
        )


@router.get("/resources/{resource_type}", response_model=List[Permission])
async def get_permissions_by_resource(
    resource_type: str,
    organization_id: Optional[int] = Query(None, description="Filter by organization"),
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.VIEW_ROLES)),
) -> List[Permission]:
    """
    Get permissions filtered by resource type/category.
    
    Requires VIEW_ROLES permission.
    """
    try:
        permissions = await PermissionService.get_permissions_by_resource(
            db, resource_type, organization_id
        )
        
        await audit_access_attempt(
            user=context.user,
            resource=f"permissions/resources/{resource_type}",
            action="view",
            granted=True,
        )
        return permissions
    except Exception as e:
        logger.error(f"Error retrieving permissions for resource {resource_type}: {e}")
        await audit_access_attempt(
            user=context.user,
            resource=f"permissions/resources/{resource_type}",
            action="view",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve permissions for resource type",
        )


@router.post("/roles/{role_id}/validate", response_model=Dict[str, Any])
async def validate_permission_hierarchy(
    role_id: int,
    permission_ids: List[int] = Body(..., embed=True),
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.MANAGE_ROLES)),
) -> Dict[str, Any]:
    """
    Validate that permission assignments respect role hierarchy rules.
    
    Requires MANAGE_ROLES permission.
    """
    try:
        validation_result = await PermissionService.validate_permission_hierarchy(
            db, role_id, permission_ids
        )
        
        await audit_access_attempt(
            user=context.user,
            resource=f"roles/{role_id}/permission-validation",
            action="validate",
            granted=True,
        )
        return validation_result
    except ValueError as e:
        await audit_access_attempt(
            user=context.user,
            resource=f"roles/{role_id}/permission-validation",
            action="validate",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error validating permission hierarchy for role {role_id}: {e}")
        await audit_access_attempt(
            user=context.user,
            resource=f"roles/{role_id}/permission-validation",
            action="validate",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate permission hierarchy",
        )


@router.post("/roles/{role_id}/assign", response_model=Dict[str, Any])
async def assign_permissions_to_role(
    role_id: int,
    permission_ids: List[int] = Body(..., embed=True),
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.MANAGE_ROLES)),
) -> Dict[str, Any]:
    """
    Assign permissions to a role with validation.
    
    Requires MANAGE_ROLES permission.
    """
    try:
        # First validate the assignments
        validation = await PermissionService.validate_permission_hierarchy(
            db, role_id, permission_ids
        )
        
        # If there are invalid assignments, return validation error
        if validation["invalid_assignments"]:
            raise ValueError(f"Invalid permission assignments: {validation['invalid_assignments']}")
        
        # Proceed with assignment
        result = await PermissionService.assign_permissions_to_role(
            db, role_id, permission_ids
        )
        
        # Include validation warnings in response
        result["validation_warnings"] = validation["warnings"]
        
        await audit_access_attempt(
            user=context.user,
            resource=f"roles/{role_id}/permissions",
            action="assign",
            granted=True,
        )
        logger.info(f"User {context.user.id} assigned permissions to role {role_id}")
        return result
    except ValueError as e:
        await audit_access_attempt(
            user=context.user,
            resource=f"roles/{role_id}/permissions",
            action="assign",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error assigning permissions to role {role_id}: {e}")
        await audit_access_attempt(
            user=context.user,
            resource=f"roles/{role_id}/permissions",
            action="assign",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign permissions to role",
        )


@router.post("/roles/{role_id}/revoke", response_model=Dict[str, Any])
async def revoke_permissions_from_role(
    role_id: int,
    permission_ids: List[int] = Body(..., embed=True),
    db: AsyncSession = Depends(get_async_db),
    context: RBACContext = Depends(require_permission(PermissionType.MANAGE_ROLES)),
) -> Dict[str, Any]:
    """
    Revoke permissions from a role.
    
    Requires MANAGE_ROLES permission.
    """
    try:
        result = await PermissionService.revoke_permissions_from_role(
            db, role_id, permission_ids
        )
        
        await audit_access_attempt(
            user=context.user,
            resource=f"roles/{role_id}/permissions",
            action="revoke",
            granted=True,
        )
        logger.info(f"User {context.user.id} revoked permissions from role {role_id}")
        return result
    except ValueError as e:
        await audit_access_attempt(
            user=context.user,
            resource=f"roles/{role_id}/permissions",
            action="revoke",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error revoking permissions from role {role_id}: {e}")
        await audit_access_attempt(
            user=context.user,
            resource=f"roles/{role_id}/permissions",
            action="revoke",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke permissions from role",
        )
