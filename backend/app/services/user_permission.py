from sqlalchemy.orm import Session
from app.models.user_permission import UserPermission
from app.models.user import User
from app.models.role import Permission
from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select


class UserPermissionService:
    """Service for managing user permissions."""
    
    def __init__(self):
        pass
    
    async def assign_permission(
        self,
        db: AsyncSession,
        user_id: int,
        permission_id: int,
        organization_id: Optional[int] = None,
    ) -> UserPermission:
        """Assign a permission to a user."""
        return await assign_user_permission(db, user_id, permission_id, organization_id)
    
    async def revoke_permission(
        self,
        db: AsyncSession,
        user_id: int,
        permission_id: int,
        organization_id: Optional[int] = None,
    ) -> bool:
        """Revoke a permission from a user."""
        return await revoke_user_permission(db, user_id, permission_id, organization_id)
    
    async def get_user_permissions(
        self,
        db: AsyncSession,
        user_id: int,
        organization_id: Optional[int] = None,
    ) -> List[UserPermission]:
        """Get all permissions for a user."""
        return await get_user_permissions(db, user_id, organization_id)


async def assign_user_permission(
    db: AsyncSession,
    user_id: int,
    permission_id: int,
    organization_id: Optional[int] = None,
) -> UserPermission:
    """
    Assign a permission directly to a user (optionally scoped to an organization).

    Args:
        db (AsyncSession): SQLAlchemy async session.
        user_id (int): ID of the user.
        permission_id (int): ID of the permission.
        organization_id (Optional[int]): Organization scope, or None for system-wide.

    Returns:
        UserPermission: The created or updated UserPermission object.
    """
    stmt = select(UserPermission).filter_by(
        user_id=user_id, permission_id=permission_id, organization_id=organization_id
    )
    result = await db.execute(stmt)
    user_permission = result.scalars().first()
    if user_permission:
        if not user_permission.is_active:
            user_permission.is_active = True
            user_permission.updated_at = datetime.utcnow()
            await db.commit()
        return user_permission
    user_permission = UserPermission(
        user_id=user_id,
        permission_id=permission_id,
        organization_id=organization_id,
        is_active=True,
    )
    db.add(user_permission)
    await db.commit()
    await db.refresh(user_permission)
    return user_permission


async def revoke_user_permission(
    db: AsyncSession,
    user_id: int,
    permission_id: int,
    organization_id: Optional[int] = None,
) -> bool:
    """
    Revoke a direct user-permission assignment (soft delete by setting is_active=False).

    Args:
        db (AsyncSession): SQLAlchemy async session.
        user_id (int): ID of the user.
        permission_id (int): ID of the permission.
        organization_id (Optional[int]): Organization scope, or None for system-wide.

    Returns:
        bool: True if revoked, False if not found.
    """
    stmt = select(UserPermission).filter_by(
        user_id=user_id,
        permission_id=permission_id,
        organization_id=organization_id,
        is_active=True,
    )
    result = await db.execute(stmt)
    user_permission = result.scalars().first()
    if user_permission:
        user_permission.is_active = False
        user_permission.updated_at = datetime.utcnow()
        await db.commit()
        return True
    return False


async def list_user_permissions(
    db: AsyncSession, user_id: int, organization_id: Optional[int] = None
) -> List[Permission]:
    """
    List all active permissions directly assigned to a user (optionally scoped to an organization).

    Args:
        db (AsyncSession): SQLAlchemy async session.
        user_id (int): ID of the user.
        organization_id (Optional[int]): Organization scope, or None for system-wide.

    Returns:
        List[Permission]: List of Permission objects.
    """
    stmt = (
        select(Permission)
        .join(UserPermission)
        .filter(UserPermission.user_id == user_id, UserPermission.is_active == True)
    )
    if organization_id is not None:
        stmt = stmt.filter(UserPermission.organization_id == organization_id)
    else:
        stmt = stmt.filter(UserPermission.organization_id == None)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_user_permissions(
    db: AsyncSession, user_id: int, organization_id: Optional[int] = None
) -> List[UserPermission]:
    """
    Get all UserPermission objects for a user.

    Args:
        db (AsyncSession): SQLAlchemy async session.
        user_id (int): ID of the user.
        organization_id (Optional[int]): Organization scope, or None for system-wide.

    Returns:
        List[UserPermission]: List of UserPermission objects.
    """
    stmt = select(UserPermission).filter(
        UserPermission.user_id == user_id, 
        UserPermission.is_active == True
    )
    if organization_id is not None:
        stmt = stmt.filter(UserPermission.organization_id == organization_id)
    else:
        stmt = stmt.filter(UserPermission.organization_id == None)
    result = await db.execute(stmt)
    return result.scalars().all()
