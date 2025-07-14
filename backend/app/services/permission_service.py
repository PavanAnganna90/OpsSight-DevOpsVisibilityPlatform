"""
Permission Service for managing system-wide permissions and permission assignments.
Provides CRUD operations and bulk management functionality for permissions.
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc
from typing import List, Optional, Dict, Any, Tuple, Set
from datetime import datetime
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.role import (
    Role,
    Permission,
    SystemRole,
    PermissionType,
    role_permissions,
)
from app.models.user import User
from app.schemas.role import (
    Permission,
    PermissionCreate,
    PermissionUpdate,
    BulkPermissionUpdate,
    PermissionStatistics,
)

logger = logging.getLogger(__name__)


class PermissionService:
    """Service class for permission management."""

    @staticmethod
    async def get_permissions(
        db: AsyncSession,
        category: Optional[str] = None,
        is_active: Optional[bool] = None,
        organization_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Permission]:
        """
        Get permissions with optional filtering.

        Args:
            db: Database session
            category: Filter by permission category
            is_active: Filter by active status
            organization_id: Filter by organization
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List[Permission]: List of permissions
        """
        try:
            query = select(Permission)

            # Apply filters
            if category:
                query = query.filter(Permission.category == category)
            if is_active is not None:
                query = query.filter(Permission.is_active == is_active)
            if organization_id is not None:
                query = query.filter(Permission.organization_id == organization_id)

            # Apply pagination
            result = await db.execute(query.offset(skip).limit(limit))
            permissions = result.scalars().all()

            return permissions

        except Exception as e:
            logger.error(f"Error retrieving permissions: {e}")
            raise

    @staticmethod
    async def get_permission_by_id(
        db: AsyncSession, permission_id: int
    ) -> Optional[Permission]:
        """
        Get a permission by ID.

        Args:
            db: Database session
            permission_id: ID of the permission

        Returns:
            Optional[Permission]: Permission or None
        """
        try:
            query = select(Permission).filter(Permission.id == permission_id)
            result = await db.execute(query)
            permission = result.scalars().first()
            if not permission:
                return None

            return permission

        except Exception as e:
            logger.error(f"Error retrieving permission {permission_id}: {e}")
            raise

    @staticmethod
    async def create_permission(
        db: AsyncSession, permission_data: PermissionCreate
    ) -> Permission:
        """
        Create a new permission.

        Args:
            db: Database session
            permission_data: Permission creation data

        Returns:
            Permission: Created permission

        Raises:
            ValueError: If permission already exists or validation fails
        """
        try:
            # Check if permission already exists for this organization
            query = select(Permission).filter(
                Permission.name == permission_data.name,
                Permission.organization_id == permission_data.organization_id,
            )
            existing = await db.execute(query)
            existing = existing.scalars().first()

            if existing:
                raise ValueError(
                    f"Permission {permission_data.name} already exists for this organization"
                )

            # Create new permission
            permission = Permission(
                name=permission_data.name,
                display_name=permission_data.display_name,
                description=permission_data.description,
                category=permission_data.category,
                organization_id=permission_data.organization_id,
                is_active=permission_data.is_active,
                is_system_permission=permission_data.is_system_permission,
            )

            db.add(permission)
            await db.commit()
            await db.refresh(permission)

            logger.info(f"Created permission: {permission.name}")
            return permission

        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating permission: {e}")
            raise

    @staticmethod
    async def update_permission(
        db: AsyncSession, permission_id: int, permission_data: PermissionUpdate
    ) -> Optional[Permission]:
        """
        Update an existing permission.

        Args:
            db: Database session
            permission_id: ID of the permission to update
            permission_data: Updated permission data

        Returns:
            Optional[Permission]: Updated permission or None
        """
        try:
            query = select(Permission).filter(Permission.id == permission_id)
            result = await db.execute(query)
            permission = result.scalars().first()
            if not permission:
                return None

            # Update fields that are provided
            update_data = permission_data.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(permission, field, value)

            await db.commit()
            await db.refresh(permission)

            logger.info(f"Updated permission: {permission.name}")
            return permission

        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating permission {permission_id}: {e}")
            raise

    @staticmethod
    async def delete_permission(db: AsyncSession, permission_id: int) -> bool:
        """
        Delete a permission.

        Args:
            db: Database session
            permission_id: ID of the permission to delete

        Returns:
            bool: True if deleted, False if not found
        """
        try:
            query = select(Permission).filter(Permission.id == permission_id)
            result = await db.execute(query)
            permission = result.scalars().first()
            if not permission:
                return False

            # Remove permission from all roles that have it
            permission.roles.clear()

            await db.delete(permission)
            await db.commit()

            logger.info(f"Deleted permission: {permission.name}")
            return True

        except Exception as e:
            await db.rollback()
            logger.error(f"Error deleting permission {permission_id}: {e}")
            raise

    @staticmethod
    async def get_permission_categories(
        db: AsyncSession,
    ) -> Dict[str, List[Permission]]:
        """
        Get all permission categories with their permissions.
        Optimized to use efficient database queries and indexing.

        Args:
            db: Database session

        Returns:
            Dict[str, List[Permission]]: Categories with permissions
        """
        try:
            # Get categories from the model
            categories = Permission.get_permission_categories()

            # Get all permission names we need
            all_permission_names = []
            for permission_types in categories.values():
                all_permission_names.extend(permission_types)

            # Single optimized query using the new index (idx_permission_name_active)
            query = select(Permission).filter(
                and_(
                    Permission.name.in_(all_permission_names),
                    Permission.is_active == True
                )
            )
            result = await db.execute(query)
            db_permissions = result.scalars().all()

            # Create a lookup dictionary for O(1) access
            permission_lookup = {p.name: p for p in db_permissions}

            # Map to response format using efficient lookup
            category_data = {}
            for category_name, permission_types in categories.items():
                category_permissions = []
                for perm_type in permission_types:
                    db_perm = permission_lookup.get(perm_type)
                    if db_perm:
                        category_permissions.append(db_perm)

                category_data[category_name] = category_permissions

            return category_data

        except Exception as e:
            logger.error(f"Error retrieving permission categories: {e}")
            raise

    @staticmethod
    async def bulk_update_permissions(
        db: AsyncSession, bulk_data: BulkPermissionUpdate
    ) -> Dict[str, Any]:
        """
        Bulk update multiple permissions.

        Args:
            db: Database session
            bulk_data: Bulk update data

        Returns:
            Dict[str, Any]: Results of bulk operation
        """
        try:
            results = {
                "updated": [],
                "errors": [],
                "total_processed": len(bulk_data.permission_updates),
            }

            for update_item in bulk_data.permission_updates:
                try:
                    query = select(Permission).filter(
                        Permission.id == update_item.permission_id
                    )
                    result = await db.execute(query)
                    permission = result.scalars().first()

                    if not permission:
                        results["errors"].append(
                            {
                                "permission_id": update_item.permission_id,
                                "error": "Permission not found",
                            }
                        )
                        continue

                    # Apply updates
                    update_data = update_item.updates.model_dump(exclude_unset=True)
                    for field, value in update_data.items():
                        setattr(permission, field, value)

                    results["updated"].append(
                        {"permission_id": permission.id, "name": permission.name}
                    )

                except Exception as e:
                    results["errors"].append(
                        {"permission_id": update_item.permission_id, "error": str(e)}
                    )

            await db.commit()

            logger.info(f"Bulk updated {len(results['updated'])} permissions")
            return results

        except Exception as e:
            await db.rollback()
            logger.error(f"Error in bulk permission update: {e}")
            raise

    @staticmethod
    async def assign_permissions_to_role(
        db: AsyncSession, role_id: int, permission_ids: List[int]
    ) -> Dict[str, Any]:
        """
        Assign permissions to a role.

        Args:
            db: Database session
            role_id: ID of the role
            permission_ids: List of permission IDs to assign

        Returns:
            Dict[str, Any]: Results of assignment operation
        """
        try:
            query = select(Role).filter(Role.id == role_id)
            result = await db.execute(query)
            role = result.scalars().first()
            if not role:
                raise ValueError(f"Role {role_id} not found")

            query = select(Permission).filter(Permission.id.in_(permission_ids))
            result = await db.execute(query)
            permissions = result.scalars().all()
            found_permission_ids = {p.id for p in permissions}
            missing_ids = set(permission_ids) - found_permission_ids

            if missing_ids:
                raise ValueError(f"Permissions not found: {list(missing_ids)}")

            # Add permissions to role (avoid duplicates)
            assigned_count = 0
            for permission in permissions:
                if permission not in role.permissions:
                    role.permissions.append(permission)
                    assigned_count += 1

            await db.commit()

            result = {
                "role_id": role_id,
                "permissions_assigned": assigned_count,
                "total_permissions": len(role.permissions),
                "assigned_permission_ids": [p.id for p in permissions],
            }

            logger.info(f"Assigned {assigned_count} permissions to role {role_id}")
            return result

        except Exception as e:
            await db.rollback()
            logger.error(f"Error assigning permissions to role {role_id}: {e}")
            raise

    @staticmethod
    async def revoke_permissions_from_role(
        db: AsyncSession, role_id: int, permission_ids: List[int]
    ) -> Dict[str, Any]:
        """
        Revoke permissions from a role.

        Args:
            db: Database session
            role_id: ID of the role
            permission_ids: List of permission IDs to revoke

        Returns:
            Dict[str, Any]: Results of revocation operation
        """
        try:
            query = select(Role).filter(Role.id == role_id)
            result = await db.execute(query)
            role = result.scalars().first()
            if not role:
                raise ValueError(f"Role {role_id} not found")

            query = select(Permission).filter(Permission.id.in_(permission_ids))
            result = await db.execute(query)
            permissions = result.scalars().all()
            found_permission_ids = {p.id for p in permissions}
            missing_ids = set(permission_ids) - found_permission_ids

            if missing_ids:
                raise ValueError(f"Permissions not found: {list(missing_ids)}")

            # Remove permissions from role
            revoked_count = 0
            for permission in permissions:
                if permission in role.permissions:
                    role.permissions.remove(permission)
                    revoked_count += 1

            await db.commit()

            result = {
                "role_id": role_id,
                "permissions_revoked": revoked_count,
                "total_permissions": len(role.permissions),
                "revoked_permission_ids": [p.id for p in permissions],
            }

            logger.info(f"Revoked {revoked_count} permissions from role {role_id}")
            return result

        except Exception as e:
            await db.rollback()
            logger.error(f"Error revoking permissions from role {role_id}: {e}")
            raise

    @staticmethod
    async def get_permission_statistics(
        db: AsyncSession, organization_id: Optional[int] = None
    ) -> PermissionStatistics:
        """
        Get statistics about permission usage and distribution.

        Args:
            db: Database session
            organization_id: Optional organization filter

        Returns:
            PermissionStatistics: Permission usage statistics
        """
        try:
            base_query = select(Permission)
            if organization_id:
                base_query = base_query.filter(
                    Permission.organization_id == organization_id
                )

            # Total permissions
            total_permissions = await db.execute(base_query.count())
            total_permissions = total_permissions.scalar()
            active_permissions = await db.execute(
                base_query.filter(Permission.is_active == True).count()
            )
            active_permissions = active_permissions.scalar()
            system_permissions = await db.execute(
                base_query.filter(Permission.is_system_permission == True).count()
            )
            system_permissions = system_permissions.scalar()

            # Permissions by category
            category_stats = select(
                Permission.category, func.count(Permission.id).label("count")
            ).group_by(Permission.category)

            if organization_id:
                category_stats = category_stats.filter(
                    Permission.organization_id == organization_id
                )

            result = await db.execute(category_stats)
            category_counts = {cat: count for cat, count in result.fetchall()}

            # Role usage statistics
            role_query = select(Role)
            if organization_id:
                role_query = role_query.filter(Role.organization_id == organization_id)

            total_roles = await db.execute(role_query.count())
            total_roles = total_roles.scalar()

            # Most/least used permissions
            permission_usage = (
                select(
                    Permission.id,
                    Permission.name,
                    Permission.display_name,
                    func.count(role_permissions.c.role_id).label("usage_count"),
                )
                .outerjoin(role_permissions)
                .group_by(Permission.id)
            )

            if organization_id:
                permission_usage = permission_usage.filter(
                    Permission.organization_id == organization_id
                )

            result = await db.execute(permission_usage)
            usage_results = result.fetchall()

            most_used = (
                max(usage_results, key=lambda x: x.usage_count)
                if usage_results
                else None
            )
            least_used = (
                min(usage_results, key=lambda x: x.usage_count)
                if usage_results
                else None
            )

            return PermissionStatistics(
                total_permissions=total_permissions,
                active_permissions=active_permissions,
                system_permissions=system_permissions,
                organization_permissions=total_permissions - system_permissions,
                permissions_by_category=category_counts,
                total_roles=total_roles,
                most_used_permission=(
                    {
                        "id": most_used.id,
                        "name": most_used.name,
                        "display_name": most_used.display_name,
                        "usage_count": most_used.usage_count,
                    }
                    if most_used
                    else None
                ),
                least_used_permission=(
                    {
                        "id": least_used.id,
                        "name": least_used.name,
                        "display_name": least_used.display_name,
                        "usage_count": least_used.usage_count,
                    }
                    if least_used
                    else None
                ),
                average_permissions_per_role=(
                    sum(r.usage_count for r in usage_results) / total_roles
                    if total_roles > 0
                    else 0
                ),
            )

        except Exception as e:
            logger.error(f"Error retrieving permission statistics: {e}")
            raise

    @staticmethod
    async def get_user_effective_permissions(
        db: AsyncSession, 
        user_id: int, 
        organization_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get all effective permissions for a user (from roles + direct assignments).
        
        Args:
            db: Database session
            user_id: ID of the user
            organization_id: Optional organization context
            
        Returns:
            Dict containing effective permissions and their sources
        """
        try:
            from app.models.user_role import UserRole
            from app.models.user_permission import UserPermission
            
            # Get user
            user_query = select(User).filter(User.id == user_id)
            result = await db.execute(user_query)
            user = result.scalars().first()
            if not user:
                raise ValueError(f"User {user_id} not found")
            
            effective_permissions = {}
            permission_sources = {}
            
            # Get permissions from roles
            role_permissions_query = (
                select(Permission, Role.name.label("role_name"))
                .join(role_permissions)
                .join(Role)
                .join(UserRole, UserRole.role_id == Role.id)
                .filter(UserRole.user_id == user_id)
                .filter(UserRole.is_active == True)
            )
            
            if organization_id:
                role_permissions_query = role_permissions_query.filter(
                    UserRole.organization_id == organization_id
                )
            
            result = await db.execute(role_permissions_query)
            role_perms = result.fetchall()
            
            for permission, role_name in role_perms:
                perm_key = f"{permission.name}:{permission.organization_id or 'system'}"
                effective_permissions[perm_key] = permission
                if perm_key not in permission_sources:
                    permission_sources[perm_key] = []
                permission_sources[perm_key].append({
                    "type": "role",
                    "source": role_name,
                    "inherited": True
                })
            
            # Get direct user permissions
            user_permissions_query = (
                select(Permission, UserPermission.granted_by)
                .join(UserPermission)
                .filter(UserPermission.user_id == user_id)
                .filter(UserPermission.is_active == True)
            )
            
            if organization_id:
                user_permissions_query = user_permissions_query.filter(
                    UserPermission.organization_id == organization_id
                )
            
            result = await db.execute(user_permissions_query)
            user_perms = result.fetchall()
            
            for permission, granted_by in user_perms:
                perm_key = f"{permission.name}:{permission.organization_id or 'system'}"
                effective_permissions[perm_key] = permission
                if perm_key not in permission_sources:
                    permission_sources[perm_key] = []
                permission_sources[perm_key].append({
                    "type": "direct",
                    "source": f"user:{granted_by}",
                    "inherited": False
                })
            
            return {
                "user_id": user_id,
                "organization_id": organization_id,
                "permissions": list(effective_permissions.values()),
                "permission_sources": permission_sources,
                "total_permissions": len(effective_permissions)
            }
            
        except Exception as e:
            logger.error(f"Error retrieving effective permissions for user {user_id}: {e}")
            raise

    @staticmethod
    async def check_user_permission(
        db: AsyncSession,
        user_id: int,
        permission_name: str,
        organization_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Check if a user has a specific permission (from any source).
        
        Args:
            db: Database session
            user_id: ID of the user
            permission_name: Name of the permission to check
            organization_id: Optional organization context
            
        Returns:
            Dict with check result and source information
        """
        try:
            effective_perms = await PermissionService.get_user_effective_permissions(
                db, user_id, organization_id
            )
            
            # Check both system and organization-scoped permissions
            has_system_perm = any(
                p.name == permission_name and p.organization_id is None 
                for p in effective_perms["permissions"]
            )
            
            has_org_perm = False
            if organization_id:
                has_org_perm = any(
                    p.name == permission_name and p.organization_id == organization_id
                    for p in effective_perms["permissions"]
                )
            
            has_permission = has_system_perm or has_org_perm
            
            # Get source information
            sources = []
            for perm_key, source_list in effective_perms["permission_sources"].items():
                perm_name, scope = perm_key.split(":", 1)
                if perm_name == permission_name:
                    if scope == "system" or (organization_id and scope == str(organization_id)):
                        sources.extend(source_list)
            
            return {
                "user_id": user_id,
                "permission": permission_name,
                "organization_id": organization_id,
                "has_permission": has_permission,
                "sources": sources,
                "checked_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error checking permission {permission_name} for user {user_id}: {e}")
            raise

    @staticmethod
    async def get_permissions_by_resource(
        db: AsyncSession,
        resource_type: str,
        organization_id: Optional[int] = None
    ) -> List[Permission]:
        """
        Get permissions filtered by resource type/category.
        
        Args:
            db: Database session
            resource_type: Type of resource (e.g., 'user', 'team', 'project')
            organization_id: Optional organization filter
            
        Returns:
            List[Permission]: Permissions for the resource type
        """
        try:
            query = select(Permission).filter(
                Permission.category == resource_type,
                Permission.is_active == True
            )
            
            if organization_id:
                query = query.filter(
                    or_(
                        Permission.organization_id == organization_id,
                        Permission.is_system_permission == True
                    )
                )
            
            result = await db.execute(query)
            permissions = result.scalars().all()
            
            return permissions
            
        except Exception as e:
            logger.error(f"Error retrieving permissions for resource {resource_type}: {e}")
            raise

    @staticmethod
    async def validate_permission_hierarchy(
        db: AsyncSession,
        role_id: int,
        permission_ids: List[int]
    ) -> Dict[str, Any]:
        """
        Validate that permission assignments respect role hierarchy rules.
        
        Args:
            db: Database session
            role_id: ID of the role
            permission_ids: List of permission IDs to validate
            
        Returns:
            Dict with validation results
        """
        try:
            from app.utils.role_utils import RoleComparison
            
            # Get role
            role_query = select(Role).filter(Role.id == role_id)
            result = await db.execute(role_query)
            role = result.scalars().first()
            if not role:
                raise ValueError(f"Role {role_id} not found")
            
            # Get permissions
            perms_query = select(Permission).filter(Permission.id.in_(permission_ids))
            result = await db.execute(perms_query)
            permissions = result.scalars().all()
            
            validation_results = {
                "role_id": role_id,
                "role_name": role.name,
                "role_priority": role.priority,
                "valid_assignments": [],
                "invalid_assignments": [],
                "warnings": []
            }
            
            for permission in permissions:
                # Check if permission is appropriate for role level
                is_valid = True
                warning = None
                
                # System permissions should only be assigned to high-privilege roles
                if permission.is_system_permission and role.priority < 80:
                    is_valid = False
                    warning = "System permission requires higher privilege role"
                
                # Organization admin permissions
                elif permission.category == "organization" and role.priority < 60:
                    warning = "Organization permission may require higher privilege role"
                
                assignment_result = {
                    "permission_id": permission.id,
                    "permission_name": permission.name,
                    "category": permission.category,
                    "is_system": permission.is_system_permission,
                    "valid": is_valid,
                    "warning": warning
                }
                
                if is_valid:
                    validation_results["valid_assignments"].append(assignment_result)
                else:
                    validation_results["invalid_assignments"].append(assignment_result)
                
                if warning:
                    validation_results["warnings"].append(assignment_result)
            
            return validation_results
            
        except Exception as e:
            logger.error(f"Error validating permission hierarchy for role {role_id}: {e}")
            raise
