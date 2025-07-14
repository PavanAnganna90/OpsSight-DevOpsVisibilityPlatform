# Permission System Implementation Guide

## Overview

This document provides comprehensive guidance for developers working with the Enhanced RBAC (Role-Based Access Control) permission system in the OpsSight DevOps platform. The system implements a hierarchical, organization-scoped permission model with support for both role-based and user-specific permissions.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Permission Models](#permission-models)
4. [Service Layer](#service-layer)
5. [API Endpoints](#api-endpoints)
6. [Middleware Integration](#middleware-integration)
7. [Usage Examples](#usage-examples)
8. [Best Practices](#best-practices)
9. [Testing Guidelines](#testing-guidelines)
10. [Troubleshooting](#troubleshooting)

## Architecture Overview

The permission system is built on a multi-layered architecture:

```
┌─────────────────┐
│   API Layer     │  ← Permission-aware endpoints
├─────────────────┤
│  Middleware     │  ← RBAC enforcement
├─────────────────┤
│ Service Layer   │  ← Business logic
├─────────────────┤
│  Data Layer     │  ← Models and relationships
└─────────────────┘
```

### Key Design Principles

1. **Organization Isolation**: All permissions are scoped to organizations
2. **Hierarchical Roles**: System roles with defined priorities and inheritance
3. **User Override**: Direct user permissions can override role permissions
4. **Performance Optimized**: Efficient query patterns and caching
5. **Audit Ready**: All permission changes are trackable

## Core Components

### 1. Permission Types

Permissions are categorized into logical groups:

```python
class PermissionType(str, Enum):
    # User Management
    VIEW_USERS = "view_users"
    CREATE_USERS = "create_users"
    EDIT_USERS = "edit_users"
    DELETE_USERS = "delete_users"
    MANAGE_ROLES = "manage_roles"
    
    # Team Management
    VIEW_TEAMS = "view_teams"
    CREATE_TEAMS = "create_teams"
    EDIT_TEAMS = "edit_teams"
    DELETE_TEAMS = "delete_teams"
    
    # Project Management
    VIEW_PROJECTS = "view_projects"
    CREATE_PROJECTS = "create_projects"
    EDIT_PROJECTS = "edit_projects"
    DELETE_PROJECTS = "delete_projects"
    
    # Infrastructure
    VIEW_INFRASTRUCTURE = "view_infrastructure"
    MANAGE_INFRASTRUCTURE = "manage_infrastructure"
    
    # API Access
    API_READ_ACCESS = "api_read_access"
    API_WRITE_ACCESS = "api_write_access"
    API_ADMIN_ACCESS = "api_admin_access"
```

### 2. System Roles

The system defines six primary roles with clear hierarchies:

```python
class SystemRole(str, Enum):
    SUPER_ADMIN = "super_admin"          # Priority: 100
    ORGANIZATION_OWNER = "org_owner"     # Priority: 90
    DEVOPS_ADMIN = "devops_admin"        # Priority: 80
    MANAGER = "manager"                  # Priority: 60
    ENGINEER = "engineer"                # Priority: 40
    API_ONLY = "api_only"                # Priority: 30
    VIEWER = "viewer"                    # Priority: 20
```

### 3. Permission Resolution

The system resolves permissions using a priority-based approach:

1. **User-specific permissions** (highest priority)
2. **Role-based permissions** (inherited from assigned roles)
3. **Default deny** (no permission granted)

## Permission Models

### Core Models

#### Permission Model
```python
class Permission(Base):
    __tablename__ = "permissions"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[PermissionType] = mapped_column(unique=True)
    display_name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(50))
    
    # Relationships
    roles: Mapped[List["Role"]] = relationship(
        secondary="role_permissions", back_populates="permissions"
    )
    user_permissions: Mapped[List["UserPermission"]] = relationship(
        back_populates="permission"
    )
```

#### Role Model
```python
class Role(Base):
    __tablename__ = "roles"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[SystemRole] = mapped_column(unique=True)
    display_name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text)
    priority: Mapped[int] = mapped_column(default=0)
    is_system_role: Mapped[bool] = mapped_column(default=False)
    
    # Relationships
    permissions: Mapped[List["Permission"]] = relationship(
        secondary="role_permissions", back_populates="roles"
    )
    user_roles: Mapped[List["UserRole"]] = relationship(
        back_populates="role"
    )
```

#### UserPermission Model
```python
class UserPermission(Base):
    __tablename__ = "user_permissions"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    permission_id: Mapped[int] = mapped_column(ForeignKey("permissions.id"))
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    is_active: Mapped[bool] = mapped_column(default=True)
    granted_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    granted_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    
    # Relationships
    user: Mapped["User"] = relationship(foreign_keys=[user_id])
    permission: Mapped["Permission"] = relationship()
    organization: Mapped["Organization"] = relationship()
    granter: Mapped[Optional["User"]] = relationship(foreign_keys=[granted_by])
```

## Service Layer

### UserPermissionService

The service layer provides comprehensive permission management:

```python
class UserPermissionService:
    
    async def assign_user_permission(
        self,
        db: AsyncSession,
        user_id: int,
        permission_id: int,
        organization_id: int,
        granted_by: Optional[int] = None
    ) -> UserPermission:
        """
        Assign a permission directly to a user.
        
        Args:
            db: Database session
            user_id: Target user ID
            permission_id: Permission to assign
            organization_id: Organization context
            granted_by: User granting the permission
            
        Returns:
            UserPermission: The created or updated permission assignment
            
        Raises:
            ValueError: If user or permission not found
            PermissionError: If granter lacks required permissions
        """
        # Implementation details...
    
    async def revoke_user_permission(
        self,
        db: AsyncSession,
        user_id: int,
        permission_id: int,
        organization_id: int
    ) -> bool:
        """
        Revoke a permission from a user.
        
        Args:
            db: Database session
            user_id: Target user ID
            permission_id: Permission to revoke
            organization_id: Organization context
            
        Returns:
            bool: True if permission was revoked, False if not found
        """
        # Implementation details...
    
    async def list_user_permissions(
        self,
        db: AsyncSession,
        user_id: int,
        organization_id: int,
        include_role_permissions: bool = True
    ) -> List[Permission]:
        """
        List all permissions for a user.
        
        Args:
            db: Database session
            user_id: Target user ID
            organization_id: Organization context
            include_role_permissions: Include permissions from roles
            
        Returns:
            List[Permission]: All permissions for the user
        """
        # Implementation details...
    
    async def has_permission(
        self,
        db: AsyncSession,
        user_id: int,
        permission: PermissionType,
        organization_id: int
    ) -> bool:
        """
        Check if a user has a specific permission.
        
        Args:
            db: Database session
            user_id: Target user ID
            permission: Permission to check
            organization_id: Organization context
            
        Returns:
            bool: True if user has the permission
        """
        # Implementation details...
```

### RoleService

Manages role assignments and role-based permissions:

```python
class RoleService:
    
    async def assign_role_to_user(
        self,
        db: AsyncSession,
        user_id: int,
        role_id: int,
        organization_id: int
    ) -> UserRole:
        """Assign a role to a user."""
        # Implementation details...
    
    async def get_role_permissions(
        self,
        db: AsyncSession,
        role_id: int
    ) -> List[Permission]:
        """Get all permissions for a role."""
        # Implementation details...
    
    async def update_role_permissions(
        self,
        db: AsyncSession,
        role_id: int,
        permission_ids: List[int]
    ) -> Role:
        """Update permissions for a role."""
        # Implementation details...
```

## API Endpoints

### User Permission Endpoints

#### Assign User Permission
```http
POST /api/v1/permissions/users/{user_id}/permissions/assign
Content-Type: application/json

{
    "user_id": 123,
    "permission_id": 456,
    "organization_id": 789
}
```

**Response:**
```json
{
    "id": 1,
    "user_id": 123,
    "permission_id": 456,
    "organization_id": 789,
    "is_active": true,
    "granted_at": "2025-01-09T10:00:00Z",
    "granted_by": 999
}
```

#### Revoke User Permission
```http
POST /api/v1/permissions/users/{user_id}/permissions/revoke
Content-Type: application/json

{
    "user_id": 123,
    "permission_id": 456,
    "organization_id": 789
}
```

**Response:**
```json
{
    "success": true,
    "message": "Permission revoked successfully"
}
```

#### List User Permissions
```http
GET /api/v1/permissions/users/{user_id}/permissions?organization_id=789
```

**Response:**
```json
[
    {
        "id": 1,
        "name": "view_users",
        "display_name": "View Users",
        "description": "Can view user information",
        "category": "user_management",
        "source": "role"
    },
    {
        "id": 2,
        "name": "create_users",
        "display_name": "Create Users",
        "description": "Can create new users",
        "category": "user_management",
        "source": "direct"
    }
]
```

### Permission Validation Endpoints

#### Validate Single Permission
```http
GET /api/v1/permissions/validate/{user_id}/{permission_name}?organization_id=789
```

**Response:**
```json
{
    "has_permission": true,
    "permission": "view_users",
    "source": "role",
    "role_name": "organization_owner"
}
```

#### Bulk Permission Validation
```http
POST /api/v1/permissions/validate/bulk
Content-Type: application/json

{
    "user_id": 123,
    "permissions": ["view_users", "create_users", "delete_users"],
    "organization_id": 789
}
```

**Response:**
```json
{
    "view_users": true,
    "create_users": true,
    "delete_users": false
}
```

### Role Permission Endpoints

#### List Role Permissions
```http
GET /api/v1/permissions/roles/{role_id}/permissions
```

#### Update Role Permissions
```http
PUT /api/v1/permissions/roles/{role_id}/permissions
Content-Type: application/json

{
    "permission_ids": [1, 2, 3, 4]
}
```

## Middleware Integration

### RBAC Context

The RBAC system uses a context-based approach for permission checking:

```python
from app.core.auth.rbac import RBACContext, get_rbac_context, require_permission

@router.get("/protected-endpoint")
async def protected_endpoint(
    rbac_context: RBACContext = Depends(get_rbac_context)
):
    """Example of using RBAC context directly."""
    if not await rbac_context.has_permission(PermissionType.VIEW_USERS):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Endpoint logic here
    return {"message": "Access granted"}
```

### Permission Decorators

Use the `require_permission` decorator for automatic permission checking:

```python
@router.post("/users")
@require_permission(PermissionType.CREATE_USERS)
async def create_user(
    user_data: UserCreate,
    rbac_context: RBACContext = Depends(get_rbac_context)
):
    """Create a new user - requires CREATE_USERS permission."""
    # User creation logic
    return {"message": "User created successfully"}
```

### Multiple Permission Requirements

For endpoints requiring multiple permissions:

```python
@router.delete("/users/{user_id}")
@require_permission([PermissionType.DELETE_USERS, PermissionType.VIEW_USERS])
async def delete_user(
    user_id: int,
    rbac_context: RBACContext = Depends(get_rbac_context)
):
    """Delete a user - requires both DELETE_USERS and VIEW_USERS permissions."""
    # User deletion logic
    return {"message": "User deleted successfully"}
```

## Usage Examples

### Basic Permission Checking

```python
from app.core.auth.rbac import RBACContext, has_permission

async def check_user_permissions(db: AsyncSession, user_id: int, org_id: int):
    """Example of checking permissions programmatically."""
    user = await db.get(User, user_id)
    context = RBACContext(user, db)
    
    # Check single permission
    can_view = await has_permission(context, PermissionType.VIEW_USERS)
    
    # Check multiple permissions
    permissions_to_check = [
        PermissionType.VIEW_USERS,
        PermissionType.CREATE_USERS,
        PermissionType.DELETE_USERS
    ]
    
    permission_results = {}
    for perm in permissions_to_check:
        permission_results[perm] = await has_permission(context, perm)
    
    return permission_results
```

### Service Layer Integration

```python
from app.services.user_permission import UserPermissionService

async def manage_user_permissions(
    db: AsyncSession,
    admin_user_id: int,
    target_user_id: int,
    org_id: int
):
    """Example of managing permissions through service layer."""
    service = UserPermissionService()
    
    # Assign permission
    await service.assign_user_permission(
        db=db,
        user_id=target_user_id,
        permission_id=1,  # VIEW_USERS permission ID
        organization_id=org_id,
        granted_by=admin_user_id
    )
    
    # Check if user has permission
    has_perm = await service.has_permission(
        db=db,
        user_id=target_user_id,
        permission=PermissionType.VIEW_USERS,
        organization_id=org_id
    )
    
    # List all user permissions
    all_permissions = await service.list_user_permissions(
        db=db,
        user_id=target_user_id,
        organization_id=org_id
    )
    
    return {
        "assigned": True,
        "has_permission": has_perm,
        "all_permissions": all_permissions
    }
```

### Frontend Integration

```typescript
// Example TypeScript/React integration
import { usePermissions } from '@/hooks/usePermissions';

function UserManagementComponent() {
    const { hasPermission, loading } = usePermissions();
    
    if (loading) return <Loading />;
    
    return (
        <div>
            {hasPermission('view_users') && (
                <UserList />
            )}
            
            {hasPermission('create_users') && (
                <CreateUserButton />
            )}
            
            {hasPermission('delete_users') && (
                <DeleteUserButton />
            )}
        </div>
    );
}
```

## Best Practices

### 1. Permission Naming

- Use descriptive, action-based names: `view_users`, `create_projects`
- Group by resource type: `user_*`, `project_*`, `infrastructure_*`
- Maintain consistency across the application

### 2. Role Design

- Keep roles simple and focused
- Avoid creating too many granular roles
- Use role hierarchy effectively
- Document role purposes and use cases

### 3. Performance Optimization

- Cache permission checks where appropriate
- Use bulk operations for multiple permission assignments
- Optimize database queries with proper indexing
- Consider permission inheritance in query design

### 4. Security Considerations

- Always validate organization context
- Use least privilege principle
- Audit permission changes
- Implement proper error handling

### 5. Testing

- Test permission inheritance scenarios
- Verify organization isolation
- Test edge cases and error conditions
- Include performance testing for permission checks

## Testing Guidelines

### Unit Tests

```python
@pytest.mark.asyncio
async def test_user_permission_assignment(db_session, test_user, test_permission):
    """Test direct user permission assignment."""
    service = UserPermissionService()
    
    # Assign permission
    result = await service.assign_user_permission(
        db=db_session,
        user_id=test_user.id,
        permission_id=test_permission.id,
        organization_id=test_user.organization_id
    )
    
    assert result.user_id == test_user.id
    assert result.permission_id == test_permission.id
    assert result.is_active is True
    
    # Verify permission check
    has_perm = await service.has_permission(
        db=db_session,
        user_id=test_user.id,
        permission=test_permission.name,
        organization_id=test_user.organization_id
    )
    
    assert has_perm is True
```

### Integration Tests

```python
@pytest.mark.asyncio
async def test_rbac_middleware_integration(test_app, test_user, test_permission):
    """Test RBAC middleware integration."""
    # Setup user with specific permission
    # Make API request to protected endpoint
    # Verify access is granted/denied appropriately
```

### Performance Tests

```python
@pytest.mark.asyncio
async def test_permission_check_performance(db_session, test_user):
    """Test that permission checks are performant."""
    import time
    
    service = UserPermissionService()
    context = RBACContext(test_user, db_session)
    
    start_time = time.time()
    for _ in range(100):
        await has_permission(context, PermissionType.VIEW_USERS)
    end_time = time.time()
    
    assert end_time - start_time < 1.0  # Should complete quickly
```

## Troubleshooting

### Common Issues

#### Permission Not Found
```python
# Check if permission exists in database
permission = await db.get(Permission, permission_id)
if not permission:
    raise ValueError(f"Permission {permission_id} not found")
```

#### Organization Context Missing
```python
# Always include organization context
if not organization_id:
    raise ValueError("Organization context is required")
```

#### Performance Issues
```python
# Use proper indexing and query optimization
# Consider caching for frequently checked permissions
# Use bulk operations where possible
```

### Debug Tools

#### Permission Audit
```python
async def audit_user_permissions(db: AsyncSession, user_id: int, org_id: int):
    """Debug tool to audit user permissions."""
    user = await db.get(User, user_id)
    
    # Get direct permissions
    direct_perms = await db.execute(
        select(UserPermission)
        .where(UserPermission.user_id == user_id)
        .where(UserPermission.organization_id == org_id)
        .where(UserPermission.is_active == True)
    )
    
    # Get role permissions
    role_perms = await db.execute(
        select(Permission)
        .join(RolePermission)
        .join(Role)
        .join(UserRole)
        .where(UserRole.user_id == user_id)
        .where(UserRole.organization_id == org_id)
        .where(UserRole.is_active == True)
    )
    
    return {
        "direct_permissions": direct_perms.scalars().all(),
        "role_permissions": role_perms.scalars().all()
    }
```

#### Role Analysis
```python
async def analyze_role_permissions(db: AsyncSession, role_id: int):
    """Debug tool to analyze role permissions."""
    role = await db.get(Role, role_id)
    
    return {
        "role_name": role.name,
        "permissions": [p.name for p in role.permissions],
        "user_count": len(role.user_roles)
    }
```

## Migration Guide

### From Legacy System

1. **Audit Current Permissions**: Document existing permission structure
2. **Map to New System**: Create mapping from old to new permission names
3. **Create Migration Script**: Bulk convert existing permissions
4. **Test Thoroughly**: Verify all users maintain appropriate access
5. **Monitor**: Watch for permission-related issues post-migration

### Database Migration

```python
"""Migration script for permission system."""

async def migrate_permissions():
    # Create new permission records
    # Update user role assignments
    # Migrate existing permission data
    # Verify data integrity
    pass
```

## Conclusion

The Enhanced RBAC Permission System provides a robust, scalable solution for managing user permissions in the OpsSight platform. By following this implementation guide, developers can effectively integrate permission checking into their features while maintaining security and performance standards.

For additional support or questions, refer to the system architecture documentation or contact the development team.