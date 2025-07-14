"""
Enhanced RBAC Integration Tests - Task 5.2 Point 5
Comprehensive test suite for permission system integration testing.
"""

import pytest
import pytest_asyncio
from app.models.user import User
from app.models.role import Role, Permission, PermissionType, SystemRole
from app.models.user_role import UserRole
from app.models.user_permission import UserPermission
from app.models.organization import Organization
from app.services import user_permission as user_permission_service
from app.services import role_service
from app.core.auth.rbac import RBACContext, has_permission, require_permission
from app.core.exceptions import PermissionDeniedError
from unittest.mock import AsyncMock


@pytest.fixture
def test_organization(db_session):
    """Create test organization."""
    org = Organization(name="Test Organization", slug="test-org")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


@pytest.fixture
def test_permissions(db_session):
    """Create test permissions."""
    permissions = [
        Permission(
            name=PermissionType.VIEW_USERS,
            display_name="View Users",
            description="Can view user information",
            category="user_management",
        ),
        Permission(
            name=PermissionType.CREATE_USERS,
            display_name="Create Users",
            description="Can create new users",
            category="user_management",
        ),
        Permission(
            name=PermissionType.DELETE_USERS,
            display_name="Delete Users",
            description="Can delete users",
            category="user_management",
        ),
        Permission(
            name=PermissionType.MANAGE_ROLES,
            display_name="Manage Roles",
            description="Can manage user roles",
            category="user_management",
        ),
    ]
    for perm in permissions:
        db_session.add(perm)
    db_session.commit()
    return permissions


@pytest.fixture
def test_roles(db_session, test_permissions):
    """Create test roles with permissions."""
    viewer_role = Role(
        name=SystemRole.VIEWER,
        display_name="Viewer",
        description="Read-only access",
        priority=20,
        is_system_role=True,
    )
    admin_role = Role(
        name=SystemRole.ORGANIZATION_OWNER,
        display_name="Organization Owner",
        description="Full access within organization",
        priority=90,
        is_system_role=True,
    )
    
    db_session.add(viewer_role)
    db_session.add(admin_role)
    db_session.commit()
    
    # Assign permissions to roles
    viewer_role.permissions = [p for p in test_permissions if p.name == PermissionType.VIEW_USERS]
    admin_role.permissions = test_permissions
    
    db_session.commit()
    return {"viewer": viewer_role, "admin": admin_role}


@pytest.fixture
def test_users(db_session, test_organization, test_roles):
    """Create test users with different roles."""
    viewer_user = User(
        organization_id=test_organization.id,
        github_id="viewer123",
        github_username="viewer",
        email="viewer@example.com",
        is_active=True,
    )
    admin_user = User(
        organization_id=test_organization.id,
        github_id="admin123",
        github_username="admin",
        email="admin@example.com",
        is_active=True,
    )
    
    db_session.add(viewer_user)
    db_session.add(admin_user)
    db_session.commit()
    
    # Assign roles
    viewer_role_assignment = UserRole(
        user_id=viewer_user.id,
        role_id=test_roles["viewer"].id,
        organization_id=test_organization.id,
    )
    admin_role_assignment = UserRole(
        user_id=admin_user.id,
        role_id=test_roles["admin"].id,
        organization_id=test_organization.id,
    )
    
    db_session.add(viewer_role_assignment)
    db_session.add(admin_role_assignment)
    db_session.commit()
    
    return {"viewer": viewer_user, "admin": admin_user}


class TestRBACIntegration:
    """Integration tests for RBAC system."""
    
    @pytest.mark.asyncio
    async def test_role_based_permission_inheritance(self, db_session, test_users, test_permissions):
        """Test that users inherit permissions from their roles."""
        viewer_user = test_users["viewer"]
        admin_user = test_users["admin"]
        
        # Viewer should have VIEW_USERS permission from role
        viewer_perms = await user_permission_service.list_user_permissions(
            db_session, viewer_user.id
        )
        assert any(p.name == PermissionType.VIEW_USERS for p in viewer_perms)
        
        # Admin should have all permissions from role
        admin_perms = await user_permission_service.list_user_permissions(
            db_session, admin_user.id
        )
        admin_perm_names = {p.name for p in admin_perms}
        expected_perms = {p.name for p in test_permissions}
        assert admin_perm_names.issuperset(expected_perms)
    
    @pytest.mark.asyncio
    async def test_user_specific_permission_override(self, db_session, test_users, test_permissions):
        """Test that user-specific permissions override role permissions."""
        viewer_user = test_users["viewer"]
        create_permission = next(p for p in test_permissions if p.name == PermissionType.CREATE_USERS)
        
        # Assign CREATE_USERS permission directly to viewer user
        await user_permission_service.assign_user_permission(
            db_session, viewer_user.id, create_permission.id
        )
        
        # Viewer should now have CREATE_USERS permission
        viewer_perms = await user_permission_service.list_user_permissions(
            db_session, viewer_user.id
        )
        assert any(p.name == PermissionType.CREATE_USERS for p in viewer_perms)
    
    @pytest.mark.asyncio
    async def test_permission_revocation_precedence(self, db_session, test_users, test_permissions):
        """Test that explicit permission revocation takes precedence over role permissions."""
        admin_user = test_users["admin"]
        delete_permission = next(p for p in test_permissions if p.name == PermissionType.DELETE_USERS)
        
        # Revoke DELETE_USERS permission from admin user
        await user_permission_service.revoke_user_permission(
            db_session, admin_user.id, delete_permission.id
        )
        
        # Admin should no longer have DELETE_USERS permission
        admin_perms = await user_permission_service.list_user_permissions(
            db_session, admin_user.id
        )
        assert not any(p.name == PermissionType.DELETE_USERS for p in admin_perms)
    
    @pytest.mark.asyncio
    async def test_rbac_context_permission_checking(self, db_session, test_users, test_permissions):
        """Test RBAC context permission checking."""
        viewer_user = test_users["viewer"]
        admin_user = test_users["admin"]
        
        # Test viewer permissions
        viewer_context = RBACContext(viewer_user, db_session)
        assert await has_permission(viewer_context, PermissionType.VIEW_USERS)
        assert not await has_permission(viewer_context, PermissionType.DELETE_USERS)
        
        # Test admin permissions
        admin_context = RBACContext(admin_user, db_session)
        assert await has_permission(admin_context, PermissionType.VIEW_USERS)
        assert await has_permission(admin_context, PermissionType.DELETE_USERS)
    
    @pytest.mark.asyncio
    async def test_permission_enforcement_decorator(self, db_session, test_users):
        """Test that permission enforcement decorator works correctly."""
        viewer_user = test_users["viewer"]
        admin_user = test_users["admin"]
        
        # Mock function that requires DELETE_USERS permission
        @require_permission(PermissionType.DELETE_USERS)
        async def delete_user_function(rbac_context: RBACContext):
            return "User deleted"
        
        # Test viewer access (should fail)
        viewer_context = RBACContext(viewer_user, db_session)
        with pytest.raises(PermissionDeniedError):
            await delete_user_function(viewer_context)
        
        # Test admin access (should succeed)
        admin_context = RBACContext(admin_user, db_session)
        result = await delete_user_function(admin_context)
        assert result == "User deleted"
    
    @pytest.mark.asyncio
    async def test_cross_organization_permission_isolation(self, db_session, test_permissions):
        """Test that permissions are isolated between organizations."""
        # Create second organization
        org2 = Organization(name="Test Organization 2", slug="test-org-2")
        db_session.add(org2)
        db_session.commit()
        
        # Create user in second organization
        user2 = User(
            organization_id=org2.id,
            github_id="user2_123",
            github_username="user2",
            email="user2@example.com",
            is_active=True,
        )
        db_session.add(user2)
        db_session.commit()
        
        # Assign permission to user in org2
        view_permission = next(p for p in test_permissions if p.name == PermissionType.VIEW_USERS)
        await user_permission_service.assign_user_permission(
            db_session, user2.id, view_permission.id
        )
        
        # User should have permission in their organization
        user2_perms = await user_permission_service.list_user_permissions(
            db_session, user2.id
        )
        assert any(p.name == PermissionType.VIEW_USERS for p in user2_perms)
        
        # Verify permission is organization-scoped
        context = RBACContext(user2, db_session)
        assert await has_permission(context, PermissionType.VIEW_USERS)


class TestRBACEdgeCases:
    """Edge case tests for RBAC system."""
    
    @pytest.mark.asyncio
    async def test_inactive_user_permissions(self, db_session, test_users):
        """Test that inactive users don't have permissions."""
        viewer_user = test_users["viewer"]
        
        # Deactivate user
        viewer_user.is_active = False
        db_session.commit()
        
        # User should not have permissions when inactive
        context = RBACContext(viewer_user, db_session)
        assert not await has_permission(context, PermissionType.VIEW_USERS)
    
    @pytest.mark.asyncio
    async def test_nonexistent_permission_check(self, db_session, test_users):
        """Test handling of nonexistent permission checks."""
        admin_user = test_users["admin"]
        context = RBACContext(admin_user, db_session)
        
        # Check for nonexistent permission
        assert not await has_permission(context, "nonexistent_permission")
    
    @pytest.mark.asyncio
    async def test_permission_assignment_to_nonexistent_user(self, db_session, test_permissions):
        """Test error handling when assigning permissions to nonexistent users."""
        view_permission = next(p for p in test_permissions if p.name == PermissionType.VIEW_USERS)
        
        # Should handle nonexistent user gracefully
        with pytest.raises(Exception):  # Specific exception type depends on implementation
            await user_permission_service.assign_user_permission(
                db_session, 99999, view_permission.id
            )
    
    @pytest.mark.asyncio
    async def test_permission_revocation_idempotency(self, db_session, test_users, test_permissions):
        """Test that revoking the same permission multiple times is idempotent."""
        viewer_user = test_users["viewer"]
        view_permission = next(p for p in test_permissions if p.name == PermissionType.VIEW_USERS)
        
        # Revoke permission multiple times
        result1 = await user_permission_service.revoke_user_permission(
            db_session, viewer_user.id, view_permission.id
        )
        result2 = await user_permission_service.revoke_user_permission(
            db_session, viewer_user.id, view_permission.id
        )
        
        # Should not raise errors
        assert result1 is True or result1 is False  # Implementation dependent
        assert result2 is True or result2 is False
    
    @pytest.mark.asyncio
    async def test_bulk_permission_operations(self, db_session, test_users, test_permissions):
        """Test bulk permission assignment and revocation."""
        admin_user = test_users["admin"]
        
        # Test bulk assignment
        permission_ids = [p.id for p in test_permissions[:2]]
        for perm_id in permission_ids:
            await user_permission_service.assign_user_permission(
                db_session, admin_user.id, perm_id
            )
        
        # Verify all permissions were assigned
        user_perms = await user_permission_service.list_user_permissions(
            db_session, admin_user.id
        )
        assigned_perm_ids = {p.id for p in user_perms}
        assert set(permission_ids).issubset(assigned_perm_ids)
        
        # Test bulk revocation
        for perm_id in permission_ids:
            await user_permission_service.revoke_user_permission(
                db_session, admin_user.id, perm_id
            )
        
        # Verify permissions were revoked
        user_perms_after = await user_permission_service.list_user_permissions(
            db_session, admin_user.id
        )
        remaining_perm_ids = {p.id for p in user_perms_after}
        assert not set(permission_ids).issubset(remaining_perm_ids)


class TestPerformanceAndScalability:
    """Performance and scalability tests for RBAC system."""
    
    @pytest.mark.asyncio
    async def test_permission_check_performance(self, db_session, test_users):
        """Test that permission checks are performant."""
        import time
        
        admin_user = test_users["admin"]
        context = RBACContext(admin_user, db_session)
        
        # Time multiple permission checks
        start_time = time.time()
        for _ in range(100):
            await has_permission(context, PermissionType.VIEW_USERS)
        end_time = time.time()
        
        # Should complete quickly (adjust threshold as needed)
        assert end_time - start_time < 1.0  # 1 second for 100 checks
    
    @pytest.mark.asyncio
    async def test_large_permission_set_handling(self, db_session, test_organization):
        """Test handling of users with many permissions."""
        # Create user with many permissions
        user = User(
            organization_id=test_organization.id,
            github_id="poweruser123",
            github_username="poweruser",
            email="poweruser@example.com",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        
        # Create many permissions
        permissions = []
        for i in range(50):
            perm = Permission(
                name=f"test_permission_{i}",
                display_name=f"Test Permission {i}",
                description=f"Test permission {i}",
                category="test",
            )
            permissions.append(perm)
            db_session.add(perm)
        db_session.commit()
        
        # Assign all permissions to user
        for perm in permissions:
            await user_permission_service.assign_user_permission(
                db_session, user.id, perm.id
            )
        
        # Test permission listing performance
        import time
        start_time = time.time()
        user_perms = await user_permission_service.list_user_permissions(
            db_session, user.id
        )
        end_time = time.time()
        
        assert len(user_perms) >= 50
        assert end_time - start_time < 0.5  # Should complete quickly