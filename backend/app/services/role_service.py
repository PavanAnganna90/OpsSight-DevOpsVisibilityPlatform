"""
Role Service for managing system-wide roles and permissions.
Provides CRUD operations and RBAC functionality for roles and permissions.
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.role import (
    Role,
    Permission,
    SystemRole,
    PermissionType,
    role_permissions,
)
from app.models.user import User
from app.models.user_role import UserRole
from app.schemas.role import (
    RoleCreate,
    RoleUpdate,
    PermissionCreate,
    PermissionUpdate,
    RoleAssignment,
    BulkRoleAssignment,
    BulkPermissionUpdate,
    SystemRoleSetup,
    RoleStatistics,
    PermissionStatistics,
    RBACAnalytics,
)
from app.core.cache_decorators import cached, DataType, invalidate_cache_pattern

logger = logging.getLogger(__name__)


class RoleService:
    """Service class for role and permission management."""

    @staticmethod
    async def create_role(db: AsyncSession, role_data: RoleCreate) -> Role:
        """
        Create a new role with optional permissions.

        Args:
            db (AsyncSession): Database session
            role_data (RoleCreate): Role creation data

        Returns:
            Role: Created role instance

        Raises:
            ValueError: If role name already exists
        """
        try:
            # Check if role already exists
            existing_role = await db.execute(
                select(Role).filter(Role.name == role_data.name)
            )
            existing_role = existing_role.scalars().first()
            if existing_role:
                raise ValueError(f"Role with name '{role_data.name}' already exists")

            # Create role
            role = Role(
                name=role_data.name,
                display_name=role_data.display_name,
                description=role_data.description,
                is_active=role_data.is_active,
                is_default=role_data.is_default,
                priority=role_data.priority,
            )

            # Add permissions if provided
            if role_data.permission_ids:
                permissions = await db.execute(
                    select(Permission).filter(
                        Permission.id.in_(role_data.permission_ids)
                    )
                )
                permissions = permissions.scalars().all()
                role.permissions.extend(permissions)

            db.add(role)
            await db.commit()
            await db.refresh(role)

            # Invalidate cache for role-related endpoints
            await invalidate_cache_pattern("endpoint:list_roles:*")
            await invalidate_cache_pattern("endpoint:get_permission_categories:*")

            logger.info(f"Created role: {role.name} (ID: {role.id})")
            return role

        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating role: {e}")
            raise

    @staticmethod
    async def get_role_by_id(db: AsyncSession, role_id: int) -> Optional[Role]:
        """Get role by ID with permissions loaded."""
        role = await db.execute(
            select(Role)
            .options(joinedload(Role.permissions))
            .filter(Role.id == role_id)
        )
        return role.scalars().first()

    @staticmethod
    async def get_role_by_name(
        db: AsyncSession, role_name: SystemRole
    ) -> Optional[Role]:
        """Get role by name with permissions loaded."""
        role = await db.execute(
            select(Role)
            .options(joinedload(Role.permissions))
            .filter(Role.name == role_name)
        )
        return role.scalars().first()

    @staticmethod
    @cached(ttl=300, data_type=DataType.DATABASE_QUERY)  # Cache for 5 minutes
    async def get_roles(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        include_permissions: bool = True,
    ) -> List[Role]:
        """
        Get list of roles with optional filtering.
        
        Performance: This endpoint is cached for 5 minutes to optimize response time.
        Cache is automatically invalidated when roles are created, updated, or deleted.
        """
        query = select(Role)

        if include_permissions:
            query = query.options(joinedload(Role.permissions))

        if is_active is not None:
            query = query.filter(Role.is_active == is_active)

        query = (
            query.order_by(desc(Role.priority), Role.display_name)
            .offset(skip)
            .limit(limit)
        )
        roles = await db.execute(query)
        return roles.scalars().all()

    @staticmethod
    async def update_role(
        db: AsyncSession, role_id: int, role_data: RoleUpdate
    ) -> Optional[Role]:
        """Update role information and permissions."""
        try:
            role = await RoleService.get_role_by_id(db, role_id)
            if not role:
                return None

            # Update basic fields
            for field, value in role_data.model_dump(exclude_unset=True).items():
                if field != "permission_ids" and hasattr(role, field):
                    setattr(role, field, value)

            # Update permissions if provided
            if role_data.permission_ids is not None:
                permissions = await db.execute(
                    select(Permission).filter(
                        Permission.id.in_(role_data.permission_ids)
                    )
                )
                permissions = permissions.scalars().all()
                role.permissions.clear()
                role.permissions.extend(permissions)

            await db.commit()
            await db.refresh(role)

            # Invalidate cache for role-related endpoints
            await invalidate_cache_pattern("endpoint:list_roles:*")
            await invalidate_cache_pattern(f"endpoint:get_role_permissions:*/{role_id}/*")

            logger.info(f"Updated role: {role.name} (ID: {role.id})")
            return role

        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating role {role_id}: {e}")
            raise

    @staticmethod
    async def delete_role(db: AsyncSession, role_id: int) -> bool:
        """Delete role and handle user reassignments."""
        try:
            role = await RoleService.get_role_by_id(db, role_id)
            if not role:
                return False

            # Check if role is assigned to users
            user_count = await db.execute(
                select(User).filter(User.role_id == role_id).count()
            )
            user_count = user_count.scalar()
            if user_count > 0:
                # Get default role for reassignment
                default_role = await db.execute(
                    select(Role).filter(Role.is_default == True)
                )
                default_role = default_role.scalars().first()
                if default_role:
                    # Reassign users to default role
                    await db.execute(
                        update(User)
                        .filter(User.role_id == role_id)
                        .values(role_id=default_role.id)
                    )
                else:
                    # Remove role assignment
                    await db.execute(
                        update(User)
                        .filter(User.role_id == role_id)
                        .values(role_id=None)
                    )

            await db.delete(role)
            await db.commit()

            logger.info(f"Deleted role: {role.name} (ID: {role.id})")
            return True

        except Exception as e:
            await db.rollback()
            logger.error(f"Error deleting role {role_id}: {e}")
            raise

    @staticmethod
    async def create_permission(
        db: AsyncSession, permission_data: PermissionCreate
    ) -> Permission:
        """Create a new permission."""
        try:
            # Check if permission already exists
            existing_permission = await db.execute(
                select(Permission).filter(Permission.name == permission_data.name)
            )
            existing_permission = existing_permission.scalars().first()
            if existing_permission:
                raise ValueError(f"Permission '{permission_data.name}' already exists")

            permission = Permission(
                name=permission_data.name,
                display_name=permission_data.display_name,
                description=permission_data.description,
                category=permission_data.category,
                is_active=permission_data.is_active,
            )

            db.add(permission)
            await db.commit()
            await db.refresh(permission)

            logger.info(f"Created permission: {permission.name} (ID: {permission.id})")
            return permission

        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating permission: {e}")
            raise

    @staticmethod
    async def get_permissions(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        category: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> List[Permission]:
        """Get list of permissions with optional filtering."""
        query = select(Permission)

        if category:
            query = query.filter(Permission.category == category)

        if is_active is not None:
            query = query.filter(Permission.is_active == is_active)

        query = (
            query.order_by(Permission.category, Permission.display_name)
            .offset(skip)
            .limit(limit)
        )
        permissions = await db.execute(query)
        return permissions.scalars().all()

    @staticmethod
    async def assign_role_to_user(db: AsyncSession, user_id: int, role_id: int) -> bool:
        """Assign a role to a user."""
        try:
            user = await db.execute(select(User).filter(User.id == user_id))
            user = user.scalars().first()
            role = await db.execute(select(Role).filter(Role.id == role_id))
            role = role.scalars().first()

            if not user or not role:
                return False

            user.role_id = role_id
            await db.commit()

            logger.info(f"Assigned role {role.name} to user {user.github_username}")
            return True

        except Exception as e:
            await db.rollback()
            logger.error(f"Error assigning role {role_id} to user {user_id}: {e}")
            raise

    @staticmethod
    async def remove_role_from_user(db: AsyncSession, user_id: int) -> bool:
        """Remove role assignment from a user."""
        try:
            user = await db.execute(select(User).filter(User.id == user_id))
            user = user.scalars().first()
            if not user:
                return False

            user.role_id = None
            await db.commit()

            logger.info(f"Removed role from user {user.github_username}")
            return True

        except Exception as e:
            await db.rollback()
            logger.error(f"Error removing role from user {user_id}: {e}")
            raise

    @staticmethod
    async def bulk_assign_roles(
        db: AsyncSession, assignments: BulkRoleAssignment
    ) -> Dict[str, Any]:
        """Assign role to multiple users."""
        try:
            successful = []
            failed = []

            role = await db.execute(select(Role).filter(Role.id == assignments.role_id))
            role = role.scalars().first()
            if not role:
                return {
                    "successful_assignments": [],
                    "failed_assignments": [{"error": "Role not found"}],
                    "total_processed": 0,
                    "success_count": 0,
                    "failure_count": 1,
                }

            for user_id in assignments.user_ids:
                try:
                    if await RoleService.assign_role_to_user(
                        db, user_id, assignments.role_id
                    ):
                        successful.append(
                            {
                                "user_id": user_id,
                                "role_id": assignments.role_id,
                                "role_name": role.name,
                                "assigned_at": datetime.utcnow(),
                                "success": True,
                            }
                        )
                    else:
                        failed.append({"user_id": user_id, "error": "User not found"})
                except Exception as e:
                    failed.append({"user_id": user_id, "error": str(e)})

            return {
                "successful_assignments": successful,
                "failed_assignments": failed,
                "total_processed": len(assignments.user_ids),
                "success_count": len(successful),
                "failure_count": len(failed),
            }

        except Exception as e:
            logger.error(f"Error in bulk role assignment: {e}")
            raise

    @staticmethod
    async def check_user_permission(
        db: AsyncSession, user_id: int, permission: PermissionType
    ) -> bool:
        stmt = (
            select(User)
            .options(
                selectinload(User.user_roles)
                .selectinload(UserRole.role)
                .selectinload(Role.permissions),
                selectinload(User.user_permissions),
            )
            .where(User.id == user_id)
        )
        result = await db.execute(stmt)
        user = result.scalars().first()
        if not user:
            return False
        if user.is_superuser:
            return True
        for up in user.user_permissions:
            if (
                up.is_active
                and up.permission
                and up.permission.name == permission
                and up.organization_id is None
            ):
                return True
        for user_role in user.user_roles:
            if (
                user_role.is_valid()
                and user_role.role
                and user_role.role.has_permission(permission)
            ):
                return True
        return False

    @staticmethod
    async def get_user_permissions(db: AsyncSession, user_id: int) -> List[str]:
        stmt = (
            select(User)
            .options(selectinload(User.role).selectinload(Role.permissions))
            .where(User.id == user_id)
        )
        result = await db.execute(stmt)
        user = result.scalars().first()
        if not user:
            return []
        if user.is_superuser:
            return [perm.value for perm in PermissionType]
        if user.role:
            return [perm.name.value for perm in user.role.permissions]
        return []

    @staticmethod
    async def setup_default_system(
        db: AsyncSession, setup_data: SystemRoleSetup
    ) -> Dict[str, Any]:
        """Set up default roles and permissions."""
        try:
            created_permissions = []
            created_roles = []

            # Create default permissions
            if setup_data.create_default_permissions:
                for (
                    category,
                    permissions,
                ) in Permission.get_permission_categories().items():
                    for perm_type in permissions:
                        existing = await db.execute(
                            select(Permission).filter(Permission.name == perm_type)
                        )
                        existing = existing.scalars().first()
                        if not existing:
                            permission = Permission(
                                name=perm_type,
                                display_name=perm_type.value.replace("_", " ").title(),
                                description=f"{perm_type.value.replace('_', ' ').title()} permission",
                                category=category,
                                is_active=True,
                            )
                            db.add(permission)
                            created_permissions.append(permission.name.value)

            await db.commit()

            # Create default roles
            if setup_data.create_default_roles:
                for role_type in SystemRole:
                    existing = await db.execute(
                        select(Role).filter(Role.name == role_type)
                    )
                    existing = existing.scalars().first()
                    if not existing:
                        role = Role(
                            name=role_type,
                            display_name=role_type.value.replace("_", " ").title(),
                            description=f"Default {role_type.value.replace('_', ' ')} role",
                            is_active=True,
                            is_default=(role_type == SystemRole.VIEWER),
                            priority={
                                "super_admin": 100,
                                "org_owner": 90,
                                "devops_admin": 80,
                                "manager": 60,
                                "engineer": 40,
                                "api_only": 30,
                                "viewer": 20,
                            }.get(role_type.value, 0),
                        )

                        # Assign default permissions
                        default_perms = Role.get_default_permissions(role_type)
                        permissions = await db.execute(
                            select(Permission).filter(
                                Permission.name.in_(default_perms)
                            )
                        )
                        permissions = permissions.scalars().all()
                        role.permissions.extend(permissions)

                        db.add(role)
                        created_roles.append(role.name.value)

            await db.commit()

            # Assign super admin role if requested
            if setup_data.assign_super_admin:
                super_admin_role = await db.execute(
                    select(Role).filter(Role.name == SystemRole.SUPER_ADMIN)
                )
                super_admin_role = super_admin_role.scalars().first()
                if super_admin_role:
                    await RoleService.assign_role_to_user(
                        db, setup_data.assign_super_admin, super_admin_role.id
                    )

            logger.info(
                f"System setup complete. Created {len(created_permissions)} permissions and {len(created_roles)} roles"
            )

            return {
                "created_permissions": created_permissions,
                "created_roles": created_roles,
                "total_permissions": len(created_permissions),
                "total_roles": len(created_roles),
                "success": True,
            }

        except Exception as e:
            await db.rollback()
            logger.error(f"Error setting up default system: {e}")
            raise

    @staticmethod
    async def get_role_statistics(db: AsyncSession) -> List[RoleStatistics]:
        """Get usage statistics for all roles."""
        roles = await db.execute(select(Role).options(joinedload(Role.permissions)))
        roles = roles.scalars().all()
        statistics = []

        for role in roles:
            user_count = await db.execute(
                select(User).filter(User.role_id == role.id).count()
            )
            user_count = user_count.scalar()
            last_assigned = await db.execute(
                select(func.max(User.updated_at)).filter(User.role_id == role.id)
            )
            last_assigned = last_assigned.scalar()

            statistics.append(
                RoleStatistics(
                    role_id=role.id,
                    role_name=role.name,
                    user_count=user_count,
                    permission_count=len(role.permissions),
                    last_assigned=last_assigned,
                    most_common_permissions=[
                        perm.name.value for perm in role.permissions[:5]
                    ],
                )
            )

        return statistics

    @staticmethod
    async def get_rbac_analytics(db: AsyncSession) -> RBACAnalytics:
        """Get comprehensive RBAC analytics."""
        total_roles = await db.execute(select(Role).count())
        total_roles = total_roles.scalar()
        total_permissions = await db.execute(select(Permission).count())
        total_permissions = total_permissions.scalar()
        total_users_with_roles = await db.execute(
            select(User).filter(User.role_id.isnot(None)).count()
        )
        total_users_with_roles = total_users_with_roles.scalar()

        # Role distribution
        role_distribution = {}
        for role in await db.execute(select(Role)):
            role = role.scalars().first()
            user_count = await db.execute(
                select(User).filter(User.role_id == role.id).count()
            )
            user_count = user_count.scalar()
            role_distribution[role.name.value] = user_count

        # Permission coverage
        permission_coverage = {}
        for permission in await db.execute(select(Permission)):
            permission = permission.scalars().first()
            user_count = await db.execute(
                select(User)
                .join(Role)
                .join(role_permissions)
                .filter(role_permissions.c.permission_id == permission.id)
                .count()
            )
            user_count = user_count.scalar()
            permission_coverage[permission.name.value] = user_count

        # Unused permissions
        unused_permissions = [
            perm.name.value
            for perm in await db.execute(select(Permission))
            if permission_coverage.get(perm.name.value, 0) == 0
        ]

        return RBACAnalytics(
            total_roles=total_roles,
            total_permissions=total_permissions,
            total_users_with_roles=total_users_with_roles,
            role_distribution=role_distribution,
            permission_coverage=permission_coverage,
            unused_permissions=unused_permissions,
            over_privileged_users=[],  # Would require more complex analysis
            under_privileged_users=[],  # Would require more complex analysis
        )
