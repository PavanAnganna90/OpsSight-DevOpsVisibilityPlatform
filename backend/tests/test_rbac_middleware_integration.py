"""
Tests for RBAC Middleware Integration

Tests the comprehensive access control middleware system including:
- Permission checking across endpoints
- Organization-scoped permissions
- Audit logging
- Error handling
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

from app.main import app
from app.models.user import User
from app.models.role import PermissionType
from app.services.permission_service import PermissionService


class TestRBACMiddlewareIntegration:
    """Test RBAC middleware integration with API endpoints."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)
    
    @pytest.fixture
    def mock_user(self):
        """Create mock user for testing."""
        return User(
            id=1,
            github_username="test_user",
            email="test@example.com",
            full_name="Test User",
            is_active=True,
            is_superuser=False,
        )
    
    @pytest.fixture
    def admin_user(self):
        """Create mock admin user for testing."""
        return User(
            id=2,
            github_username="admin_user",
            email="admin@example.com",
            full_name="Admin User",
            is_active=True,
            is_superuser=True,
        )
    
    def test_public_endpoint_access(self, client):
        """Test that public endpoints bypass RBAC."""
        # Health endpoint should be accessible without authentication
        response = client.get("/health")
        assert response.status_code == 200
        
        # Docs endpoint should be accessible
        response = client.get("/docs")
        assert response.status_code == 200
    
    def test_unauthenticated_access_denied(self, client):
        """Test that unauthenticated requests are denied."""
        # Try to access protected endpoint without auth
        response = client.get("/api/v1/users/")
        assert response.status_code == 401
        assert "Authentication required" in response.json()["detail"]
    
    @patch('app.middleware.rbac_middleware.RBACMiddleware._get_current_user')
    @patch('app.middleware.rbac_middleware.PermissionService.check_user_permission')
    def test_authorized_access_granted(self, mock_check_permission, mock_get_user, client, mock_user):
        """Test that users with proper permissions are granted access."""
        # Mock user authentication
        mock_get_user.return_value = mock_user
        
        # Mock permission check - user has required permission
        mock_check_permission.return_value = {
            "user_id": mock_user.id,
            "permission": "view_users",
            "has_permission": True,
            "sources": [{"type": "role", "source": "admin", "inherited": True}],
            "checked_at": datetime.utcnow().isoformat()
        }
        
        # Mock auth header
        headers = {"Authorization": "Bearer mock_token"}
        
        # Request should succeed
        response = client.get("/api/v1/users/", headers=headers)
        
        # Should call permission check
        mock_check_permission.assert_called_once()
        
        # Note: This will still fail because the endpoint implementation
        # isn't mocked, but the middleware should pass the request through
        assert response.status_code != 403  # Not forbidden
    
    @patch('app.middleware.rbac_middleware.RBACMiddleware._get_current_user')
    @patch('app.middleware.rbac_middleware.PermissionService.check_user_permission')
    def test_unauthorized_access_denied(self, mock_check_permission, mock_get_user, client, mock_user):
        """Test that users without proper permissions are denied access."""
        # Mock user authentication
        mock_get_user.return_value = mock_user
        
        # Mock permission check - user lacks required permission
        mock_check_permission.return_value = {
            "user_id": mock_user.id,
            "permission": "view_users",
            "has_permission": False,
            "sources": [],
            "checked_at": datetime.utcnow().isoformat()
        }
        
        # Mock auth header
        headers = {"Authorization": "Bearer mock_token"}
        
        # Request should be denied
        response = client.get("/api/v1/users/", headers=headers)
        assert response.status_code == 403
        assert "Required permission" in response.json()["detail"]
    
    @patch('app.middleware.rbac_middleware.RBACMiddleware._get_current_user')
    @patch('app.middleware.rbac_middleware.PermissionService.check_user_permission')
    def test_organization_scoped_permissions(self, mock_check_permission, mock_get_user, client, mock_user):
        """Test organization-scoped permission checking."""
        # Mock user authentication
        mock_get_user.return_value = mock_user
        
        # Mock permission check - user has permission for specific organization
        mock_check_permission.return_value = {
            "user_id": mock_user.id,
            "permission": "view_users",
            "has_permission": True,
            "sources": [{"type": "role", "source": "org_admin", "inherited": True}],
            "organization_id": 123,
            "checked_at": datetime.utcnow().isoformat()
        }
        
        # Mock auth header
        headers = {"Authorization": "Bearer mock_token"}
        
        # Request with organization context
        response = client.get("/api/v1/users/?organization_id=123", headers=headers)
        
        # Should call permission check with organization context
        mock_check_permission.assert_called_once()
        call_args = mock_check_permission.call_args[0]
        assert call_args[3] == 123  # organization_id parameter
    
    @patch('app.middleware.rbac_middleware.RBACMiddleware._log_access_attempt')
    @patch('app.middleware.rbac_middleware.RBACMiddleware._get_current_user')
    @patch('app.middleware.rbac_middleware.PermissionService.check_user_permission')
    def test_audit_logging(self, mock_check_permission, mock_get_user, mock_log_access, client, mock_user):
        """Test that access attempts are properly audited."""
        # Mock user authentication
        mock_get_user.return_value = mock_user
        
        # Mock permission check - access denied
        mock_check_permission.return_value = {
            "user_id": mock_user.id,
            "permission": "view_users",
            "has_permission": False,
            "sources": [],
            "checked_at": datetime.utcnow().isoformat()
        }
        
        # Mock auth header
        headers = {"Authorization": "Bearer mock_token"}
        
        # Make request
        response = client.get("/api/v1/users/", headers=headers)
        
        # Should log the access attempt
        mock_log_access.assert_called_once()
        call_args = mock_log_access.call_args[1]  # kwargs
        assert call_args["user"] == mock_user
        assert call_args["granted"] == False
        assert "Missing permissions" in call_args["reason"]
    
    def test_options_request_bypass(self, client):
        """Test that OPTIONS requests bypass RBAC for CORS."""
        # OPTIONS request should not require authentication
        response = client.options("/api/v1/users/")
        # Should not return 401 or 403
        assert response.status_code not in [401, 403]
    
    @patch('app.middleware.rbac_middleware.RBACMiddleware._get_current_user')
    def test_middleware_error_handling(self, mock_get_user, client):
        """Test middleware error handling when services fail."""
        # Mock authentication failure
        mock_get_user.side_effect = Exception("Auth service unavailable")
        
        # Mock auth header
        headers = {"Authorization": "Bearer mock_token"}
        
        # Request should return 500 internal server error
        response = client.get("/api/v1/users/", headers=headers)
        assert response.status_code == 500
        assert "Internal server error" in response.json()["detail"]
    
    @patch('app.middleware.rbac_middleware.RBACMiddleware._get_current_user')
    @patch('app.middleware.rbac_middleware.PermissionService.check_user_permission')
    def test_permission_check_failure_handling(self, mock_check_permission, mock_get_user, client, mock_user):
        """Test handling of permission service failures."""
        # Mock user authentication
        mock_get_user.return_value = mock_user
        
        # Mock permission check failure
        mock_check_permission.side_effect = Exception("Permission service unavailable")
        
        # Mock auth header
        headers = {"Authorization": "Bearer mock_token"}
        
        # Request should be denied due to permission check failure
        response = client.get("/api/v1/users/", headers=headers)
        assert response.status_code == 403
        assert "Permission check failed" in response.json()["detail"]


class TestEndpointProtectionDecorators:
    """Test the endpoint protection decorators."""
    
    def test_protect_resource_access_decorator(self):
        """Test the protect_resource_access decorator."""
        from app.middleware.endpoint_protection import protect_resource_access
        
        # Create a mock function
        @protect_resource_access("user", "read", audit_resource="test_endpoint")
        async def test_endpoint(current_user, db, organization_id=None):
            return {"message": "success"}
        
        # Function should be wrapped
        assert hasattr(test_endpoint, '__wrapped__')
        assert test_endpoint.__name__ == "test_endpoint"
    
    def test_protect_admin_endpoint_decorator(self):
        """Test the protect_admin_endpoint decorator."""
        from app.middleware.endpoint_protection import protect_admin_endpoint
        
        # Create a mock function
        @protect_admin_endpoint(audit_resource="admin_test")
        async def admin_endpoint(current_user, db):
            return {"message": "admin success"}
        
        # Function should be wrapped
        assert hasattr(admin_endpoint, '__wrapped__')
    
    def test_require_permission_dependency_factory(self):
        """Test the permission dependency factory."""
        from app.middleware.endpoint_protection import require_permission_dependency
        
        # Create permission dependency
        permission_dep = require_permission_dependency(
            PermissionType.VIEW_USERS,
            organization_scoped=True
        )
        
        # Should return an async function
        assert callable(permission_dep)


class TestPermissionConfiguration:
    """Test permission configuration and mapping."""
    
    def test_default_permission_config(self):
        """Test that default permission configuration is comprehensive."""
        from app.middleware.rbac_middleware import RBACMiddleware
        
        middleware = RBACMiddleware(app=None)
        config = middleware.permission_config
        
        # Should have configurations for all major endpoint patterns
        assert any("users" in pattern for pattern in config.keys())
        assert any("roles" in pattern for pattern in config.keys())
        assert any("teams" in pattern for pattern in config.keys())
        assert any("projects" in pattern for pattern in config.keys())
        assert any("permissions" in pattern for pattern in config.keys())
    
    def test_permission_pattern_matching(self):
        """Test that URL patterns correctly match endpoints."""
        from app.middleware.rbac_middleware import RBACMiddleware
        import re
        
        middleware = RBACMiddleware(app=None)
        
        # Test user endpoint pattern matching
        user_patterns = [p for p in middleware.permission_config.keys() if "users" in p]
        assert len(user_patterns) > 0
        
        # Test that patterns match expected URLs
        for pattern in user_patterns:
            if "users/?$" in pattern:
                assert re.match(pattern, "/api/v1/users/")
                assert re.match(pattern, "/api/v1/users")
            elif "users/[0-9]+/?$" in pattern:
                assert re.match(pattern, "/api/v1/users/123/")
                assert re.match(pattern, "/api/v1/users/456")


# Mock current_user function for testing
async def mock_get_current_user():
    """Mock get_current_user function."""
    return User(
        id=1,
        github_username="test_user",
        email="test@example.com",
        full_name="Test User",
        is_active=True,
        is_superuser=False,
    )