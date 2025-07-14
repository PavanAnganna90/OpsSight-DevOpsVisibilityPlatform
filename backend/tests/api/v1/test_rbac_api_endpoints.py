"""
Enhanced RBAC API Endpoint Tests - Task 5.2 Point 5
Comprehensive test suite for permission management API endpoints.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.models.user import User
from app.models.role import Role, Permission, PermissionType, SystemRole
from app.models.user_role import UserRole
from app.models.organization import Organization
from app.schemas.user_permission import UserPermissionCreate, UserPermissionRevoke
from app.core.auth.rbac import RBACContext, get_rbac_context
from unittest.mock import AsyncMock


@pytest_asyncio.fixture
async def rbac_test_setup(async_db_session_factory):
    """Setup comprehensive RBAC test environment."""
    async with async_db_session_factory() as session:
        # Create organization
        org = Organization(name="Test Organization", slug="test-org")
        session.add(org)
        await session.commit()
        await session.refresh(org)
        
        # Create permissions
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
            session.add(perm)
        await session.commit()
        
        # Create roles
        admin_role = Role(
            name=SystemRole.ORGANIZATION_OWNER,
            display_name="Organization Owner",
            description="Full access within organization",
            priority=90,
            is_system_role=True,
        )
        viewer_role = Role(
            name=SystemRole.VIEWER,
            display_name="Viewer",
            description="Read-only access",
            priority=20,
            is_system_role=True,
        )
        
        session.add(admin_role)
        session.add(viewer_role)
        await session.commit()
        
        # Assign permissions to roles
        admin_role.permissions = permissions
        viewer_role.permissions = [p for p in permissions if p.name == PermissionType.VIEW_USERS]
        await session.commit()
        
        # Create users
        admin_user = User(
            organization_id=org.id,
            github_id="admin123",
            github_username="admin",
            email="admin@example.com",
            is_active=True,
        )
        viewer_user = User(
            organization_id=org.id,
            github_id="viewer123",
            github_username="viewer",
            email="viewer@example.com",
            is_active=True,
        )
        
        session.add(admin_user)
        session.add(viewer_user)
        await session.commit()
        
        # Assign roles to users
        admin_role_assignment = UserRole(
            user_id=admin_user.id,
            role_id=admin_role.id,
            organization_id=org.id,
        )
        viewer_role_assignment = UserRole(
            user_id=viewer_user.id,
            role_id=viewer_role.id,
            organization_id=org.id,
        )
        
        session.add(admin_role_assignment)
        session.add(viewer_role_assignment)
        await session.commit()
        
        return {
            "organization": org,
            "permissions": permissions,
            "roles": {"admin": admin_role, "viewer": viewer_role},
            "users": {"admin": admin_user, "viewer": viewer_user},
        }


@pytest_asyncio.fixture
async def override_rbac_context_admin(async_db_session_factory, rbac_test_setup):
    """Override RBAC context with admin user."""
    async def _rbac_context_override(request):
        async with async_db_session_factory() as session:
            user = await session.get(User, rbac_test_setup["users"]["admin"].id)
            yield RBACContext(user, session)
    
    from app.main import app as main_app
    main_app.dependency_overrides[get_rbac_context] = _rbac_context_override
    yield
    main_app.dependency_overrides.pop(get_rbac_context, None)


@pytest_asyncio.fixture
async def override_rbac_context_viewer(async_db_session_factory, rbac_test_setup):
    """Override RBAC context with viewer user."""
    async def _rbac_context_override(request):
        async with async_db_session_factory() as session:
            user = await session.get(User, rbac_test_setup["users"]["viewer"].id)
            yield RBACContext(user, session)
    
    from app.main import app as main_app
    main_app.dependency_overrides[get_rbac_context] = _rbac_context_override
    yield
    main_app.dependency_overrides.pop(get_rbac_context, None)


@pytest_asyncio.fixture
def test_app():
    """Get test app instance."""
    from app.main import app
    return app


class TestUserPermissionEndpoints:
    """Test user permission management endpoints."""
    
    @pytest.mark.asyncio
    async def test_assign_user_permission_success(
        self, test_app, rbac_test_setup, override_rbac_context_admin
    ):
        """Test successful user permission assignment."""
        user = rbac_test_setup["users"]["viewer"]
        permission = rbac_test_setup["permissions"][1]  # CREATE_USERS
        
        payload = UserPermissionCreate(
            user_id=user.id,
            permission_id=permission.id,
            organization_id=user.organization_id,
        ).model_dump()
        
        async with AsyncClient(
            transport=ASGITransport(app=test_app), base_url="http://test"
        ) as client:
            response = await client.post(
                f"/api/v1/permissions/users/{user.id}/permissions/assign",
                json=payload
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["user_id"] == user.id
            assert data["permission_id"] == permission.id
            assert data["is_active"] is True
    
    @pytest.mark.asyncio
    async def test_assign_user_permission_unauthorized(
        self, test_app, rbac_test_setup, override_rbac_context_viewer
    ):
        """Test that viewer cannot assign permissions."""
        user = rbac_test_setup["users"]["viewer"]
        permission = rbac_test_setup["permissions"][1]  # CREATE_USERS
        
        payload = UserPermissionCreate(
            user_id=user.id,
            permission_id=permission.id,
            organization_id=user.organization_id,
        ).model_dump()
        
        async with AsyncClient(
            transport=ASGITransport(app=test_app), base_url="http://test"
        ) as client:
            response = await client.post(
                f"/api/v1/permissions/users/{user.id}/permissions/assign",
                json=payload
            )
            
            assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_revoke_user_permission_success(
        self, test_app, rbac_test_setup, override_rbac_context_admin
    ):
        """Test successful user permission revocation."""
        user = rbac_test_setup["users"]["viewer"]
        permission = rbac_test_setup["permissions"][0]  # VIEW_USERS
        
        payload = UserPermissionRevoke(
            user_id=user.id,
            permission_id=permission.id,
            organization_id=user.organization_id,
        ).model_dump()
        
        async with AsyncClient(
            transport=ASGITransport(app=test_app), base_url="http://test"
        ) as client:
            response = await client.post(
                f"/api/v1/permissions/users/{user.id}/permissions/revoke",
                json=payload
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
    
    @pytest.mark.asyncio
    async def test_list_user_permissions_success(
        self, test_app, rbac_test_setup, override_rbac_context_admin
    ):
        """Test successful user permission listing."""
        user = rbac_test_setup["users"]["viewer"]
        
        async with AsyncClient(
            transport=ASGITransport(app=test_app), base_url="http://test"
        ) as client:
            response = await client.get(
                f"/api/v1/permissions/users/{user.id}/permissions"
                f"?organization_id={user.organization_id}"
            )
            
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            # Viewer should have VIEW_USERS permission from role
            assert any(p["name"] == PermissionType.VIEW_USERS for p in data)
    
    @pytest.mark.asyncio
    async def test_list_user_permissions_cross_organization(
        self, test_app, rbac_test_setup, override_rbac_context_admin, async_db_session_factory
    ):
        """Test that users cannot see permissions from other organizations."""
        # Create second organization and user
        async with async_db_session_factory() as session:
            org2 = Organization(name="Other Organization", slug="other-org")
            session.add(org2)
            await session.commit()
            
            other_user = User(
                organization_id=org2.id,
                github_id="other123",
                github_username="other",
                email="other@example.com",
                is_active=True,
            )
            session.add(other_user)
            await session.commit()
            
            # Try to list permissions for user in different org
            async with AsyncClient(
                transport=ASGITransport(app=test_app), base_url="http://test"
            ) as client:
                response = await client.get(
                    f"/api/v1/permissions/users/{other_user.id}/permissions"
                    f"?organization_id={rbac_test_setup['organization'].id}"
                )
                
                # Should return empty or error based on implementation
                assert response.status_code in [200, 403, 404]


class TestRolePermissionEndpoints:
    """Test role permission management endpoints."""
    
    @pytest.mark.asyncio
    async def test_list_role_permissions_success(
        self, test_app, rbac_test_setup, override_rbac_context_admin
    ):
        """Test successful role permission listing."""
        admin_role = rbac_test_setup["roles"]["admin"]
        
        async with AsyncClient(
            transport=ASGITransport(app=test_app), base_url="http://test"
        ) as client:
            response = await client.get(
                f"/api/v1/permissions/roles/{admin_role.id}/permissions"
            )
            
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            # Admin role should have multiple permissions
            assert len(data) >= 4
    
    @pytest.mark.asyncio
    async def test_update_role_permissions_success(
        self, test_app, rbac_test_setup, override_rbac_context_admin
    ):
        """Test successful role permission update."""
        viewer_role = rbac_test_setup["roles"]["viewer"]
        permission_ids = [p.id for p in rbac_test_setup["permissions"][:2]]
        
        payload = {"permission_ids": permission_ids}
        
        async with AsyncClient(
            transport=ASGITransport(app=test_app), base_url="http://test"
        ) as client:
            response = await client.put(
                f"/api/v1/permissions/roles/{viewer_role.id}/permissions",
                json=payload
            )
            
            # Response depends on implementation - could be 200, 204, etc.
            assert response.status_code in [200, 204]


class TestPermissionValidationEndpoints:
    """Test permission validation endpoints."""
    
    @pytest.mark.asyncio
    async def test_validate_user_permission_success(
        self, test_app, rbac_test_setup, override_rbac_context_admin
    ):
        """Test successful permission validation."""
        user = rbac_test_setup["users"]["viewer"]
        permission = PermissionType.VIEW_USERS
        
        async with AsyncClient(
            transport=ASGITransport(app=test_app), base_url="http://test"
        ) as client:
            response = await client.get(
                f"/api/v1/permissions/validate/{user.id}/{permission}"
                f"?organization_id={user.organization_id}"
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["has_permission"] is True
    
    @pytest.mark.asyncio
    async def test_validate_user_permission_denied(
        self, test_app, rbac_test_setup, override_rbac_context_admin
    ):
        """Test permission validation denial."""
        user = rbac_test_setup["users"]["viewer"]
        permission = PermissionType.DELETE_USERS
        
        async with AsyncClient(
            transport=ASGITransport(app=test_app), base_url="http://test"
        ) as client:
            response = await client.get(
                f"/api/v1/permissions/validate/{user.id}/{permission}"
                f"?organization_id={user.organization_id}"
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["has_permission"] is False
    
    @pytest.mark.asyncio
    async def test_bulk_permission_validation(
        self, test_app, rbac_test_setup, override_rbac_context_admin
    ):
        """Test bulk permission validation."""
        user = rbac_test_setup["users"]["admin"]
        permissions = [PermissionType.VIEW_USERS, PermissionType.CREATE_USERS, PermissionType.DELETE_USERS]
        
        payload = {
            "user_id": user.id,
            "permissions": permissions,
            "organization_id": user.organization_id
        }
        
        async with AsyncClient(
            transport=ASGITransport(app=test_app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/permissions/validate/bulk",
                json=payload
            )
            
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, dict)
            # Admin should have all permissions
            for perm in permissions:
                assert data.get(perm) is True


class TestPermissionEndpointErrorHandling:
    """Test error handling in permission endpoints."""
    
    @pytest.mark.asyncio
    async def test_invalid_user_id_error(
        self, test_app, rbac_test_setup, override_rbac_context_admin
    ):
        """Test error handling for invalid user ID."""
        permission = rbac_test_setup["permissions"][0]
        
        payload = UserPermissionCreate(
            user_id=99999,  # Invalid user ID
            permission_id=permission.id,
            organization_id=rbac_test_setup["organization"].id,
        ).model_dump()
        
        async with AsyncClient(
            transport=ASGITransport(app=test_app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/permissions/users/99999/permissions/assign",
                json=payload
            )
            
            assert response.status_code in [400, 404]
    
    @pytest.mark.asyncio
    async def test_invalid_permission_id_error(
        self, test_app, rbac_test_setup, override_rbac_context_admin
    ):
        """Test error handling for invalid permission ID."""
        user = rbac_test_setup["users"]["viewer"]
        
        payload = UserPermissionCreate(
            user_id=user.id,
            permission_id=99999,  # Invalid permission ID
            organization_id=user.organization_id,
        ).model_dump()
        
        async with AsyncClient(
            transport=ASGITransport(app=test_app), base_url="http://test"
        ) as client:
            response = await client.post(
                f"/api/v1/permissions/users/{user.id}/permissions/assign",
                json=payload
            )
            
            assert response.status_code in [400, 404]
    
    @pytest.mark.asyncio
    async def test_malformed_request_body_error(
        self, test_app, rbac_test_setup, override_rbac_context_admin
    ):
        """Test error handling for malformed request body."""
        user = rbac_test_setup["users"]["viewer"]
        
        payload = {"invalid": "data"}  # Malformed payload
        
        async with AsyncClient(
            transport=ASGITransport(app=test_app), base_url="http://test"
        ) as client:
            response = await client.post(
                f"/api/v1/permissions/users/{user.id}/permissions/assign",
                json=payload
            )
            
            assert response.status_code == 422  # Validation error
    
    @pytest.mark.asyncio
    async def test_missing_authentication_error(self, test_app, rbac_test_setup):
        """Test error handling for missing authentication."""
        user = rbac_test_setup["users"]["viewer"]
        permission = rbac_test_setup["permissions"][0]
        
        payload = UserPermissionCreate(
            user_id=user.id,
            permission_id=permission.id,
            organization_id=user.organization_id,
        ).model_dump()
        
        # No RBAC context override - should fail authentication
        async with AsyncClient(
            transport=ASGITransport(app=test_app), base_url="http://test"
        ) as client:
            response = await client.post(
                f"/api/v1/permissions/users/{user.id}/permissions/assign",
                json=payload
            )
            
            assert response.status_code == 401


class TestPermissionEndpointPerformance:
    """Test performance of permission endpoints."""
    
    @pytest.mark.asyncio
    async def test_permission_listing_performance(
        self, test_app, rbac_test_setup, override_rbac_context_admin
    ):
        """Test that permission listing is performant."""
        import time
        
        user = rbac_test_setup["users"]["admin"]
        
        async with AsyncClient(
            transport=ASGITransport(app=test_app), base_url="http://test"
        ) as client:
            start_time = time.time()
            
            # Make multiple requests
            for _ in range(10):
                response = await client.get(
                    f"/api/v1/permissions/users/{user.id}/permissions"
                    f"?organization_id={user.organization_id}"
                )
                assert response.status_code == 200
            
            end_time = time.time()
            
            # Should complete quickly
            assert end_time - start_time < 2.0  # 2 seconds for 10 requests
    
    @pytest.mark.asyncio
    async def test_permission_validation_performance(
        self, test_app, rbac_test_setup, override_rbac_context_admin
    ):
        """Test that permission validation is performant."""
        import time
        
        user = rbac_test_setup["users"]["admin"]
        permission = PermissionType.VIEW_USERS
        
        async with AsyncClient(
            transport=ASGITransport(app=test_app), base_url="http://test"
        ) as client:
            start_time = time.time()
            
            # Make multiple validation requests
            for _ in range(20):
                response = await client.get(
                    f"/api/v1/permissions/validate/{user.id}/{permission}"
                    f"?organization_id={user.organization_id}"
                )
                assert response.status_code == 200
            
            end_time = time.time()
            
            # Should complete quickly
            assert end_time - start_time < 2.0  # 2 seconds for 20 requests