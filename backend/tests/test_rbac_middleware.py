"""
Unit tests for RBAC middleware system.
Tests permission checking, access control, and audit functionality.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from fastapi import HTTPException, Request
from sqlalchemy.orm import Session
import asyncio

from app.core.auth.rbac import (
    RBACContext,
    PermissionDeniedError,
    get_rbac_context,
    require_permission,
    require_team_access,
    require_resource_access,
    check_multiple_permissions,
    get_user_effective_permissions,
    audit_access_attempt,
)
from app.models.user import User
from app.models.role import PermissionType
from app.models.team import TeamRole
from app.models.user_team import UserTeam
from app.services.role_service import RoleService


class TestRBACContext:
    """Test cases for RBACContext class."""

    @pytest.fixture
    def mock_user(self):
        """Create a mock user."""
        user = Mock(spec=User)
        user.id = 1
        user.github_username = "testuser"
        return user

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        db = Mock()
        db.execute = AsyncMock()
        db.execute.return_value.scalars = Mock()
        db.execute.return_value.scalars.return_value.first = Mock()
        return db

    def test_rbac_context_initialization(self, mock_user, mock_db):
        """Test RBACContext initialization."""
        context = RBACContext(mock_user, mock_db, team_id=123)

        assert context.user == mock_user
        assert context.db == mock_db
        assert context.team_id == 123
        assert context._team_role is None

    @pytest.mark.asyncio
    @patch.object(RoleService, "check_user_permission", new_callable=AsyncMock)
    async def test_has_system_permission(self, mock_check, mock_user, mock_db):
        """Test system permission checking."""
        mock_check.return_value = True
        context = RBACContext(mock_user, mock_db)
        result = await context.has_system_permission(PermissionType.UPDATE_USERS)
        assert result is True
        mock_check.assert_awaited_once_with(
            mock_db, mock_user.id, PermissionType.UPDATE_USERS
        )

    @pytest.mark.asyncio
    async def test_team_role_property(self, mock_user, mock_db):
        """Test team role property retrieval."""
        mock_membership = Mock()
        mock_membership.role = TeamRole.ADMIN
        mock_db.execute.return_value.scalars.return_value.first.return_value = (
            mock_membership
        )
        context = RBACContext(mock_user, mock_db, team_id=123)
        role = await context.team_role()
        assert role == TeamRole.ADMIN

    @pytest.mark.asyncio
    async def test_has_team_permission_success(self, mock_user, mock_db):
        """Test successful team permission checking."""
        mock_membership = Mock()
        mock_membership.role = TeamRole.ADMIN
        mock_db.execute.return_value.scalars.return_value.first.return_value = (
            mock_membership
        )
        context = RBACContext(mock_user, mock_db, team_id=123)
        result = await context.has_team_permission(TeamRole.MEMBER)
        assert result is True

        result = await context.has_team_permission(TeamRole.ADMIN)
        assert result is True

        result = await context.has_team_permission(TeamRole.OWNER)
        assert result is False

    @pytest.mark.asyncio
    async def test_has_team_permission_no_team_context(self, mock_user, mock_db):
        """Test team permission checking without team context."""
        context = RBACContext(mock_user, mock_db)

        result = await context.has_team_permission(TeamRole.MEMBER)

        assert result is False

    @pytest.mark.asyncio
    async def test_is_resource_owner(self, mock_user, mock_db):
        """Test resource ownership checking."""
        context = RBACContext(mock_user, mock_db)

        # User owns their own resources
        assert context.is_resource_owner(1) is True

        # User doesn't own other users' resources
        assert context.is_resource_owner(2) is False

    @pytest.mark.asyncio
    @patch.object(RoleService, "check_user_permission", new_callable=AsyncMock)
    async def test_can_access_resource(self, mock_check, mock_user, mock_db):
        """Test resource access checking."""
        context = RBACContext(mock_user, mock_db)

        # User can access their own resources
        result = await context.can_access_resource(1, PermissionType.VIEW_USERS)
        assert result is True

        # User can access others' resources if they have permission
        mock_check.return_value = True
        result = await context.can_access_resource(2, PermissionType.VIEW_USERS)
        assert result is True

        # User cannot access others' resources without permission
        mock_check.return_value = False
        result = await context.can_access_resource(2, PermissionType.VIEW_USERS)
        assert result is False


class TestRBACDependencies:
    """Test cases for RBAC dependency functions."""

    @pytest.fixture
    def mock_request(self):
        """Create a mock FastAPI request."""
        request = Mock(spec=Request)
        request.path_params = {"team_id": "123", "user_id": "456"}
        return request

    @pytest.fixture
    def mock_user(self):
        """Create a mock user."""
        user = Mock(spec=User)
        user.id = 1
        user.github_username = "testuser"
        return user

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        return Mock(spec=Session)

    @pytest.mark.skip(reason="Requires real DB schema; integration test only")
    @pytest.mark.asyncio
    async def test_get_rbac_context(self, mock_request, mock_user, mock_db):
        """Test RBAC context creation from request."""
        mock_request.state = Mock()
        mock_request.state.user = Mock()
        context = await get_rbac_context(mock_request)

        assert isinstance(context, RBACContext)
        assert context.user == mock_user
        assert context.db == mock_db
        assert context.team_id == 123

    @pytest.mark.skip(reason="Requires real DB schema; integration test only")
    @pytest.mark.asyncio
    async def test_get_rbac_context_invalid_team_id(self, mock_user, mock_db):
        """Test RBAC context with invalid team ID."""
        request = Mock(spec=Request)
        request.path_params = {"team_id": "invalid"}
        request.state = Mock()
        request.state.user = Mock()

        context = await get_rbac_context(request)

        assert context.team_id is None

    @pytest.mark.asyncio
    @patch.object(RoleService, "check_user_permission", new_callable=AsyncMock)
    async def test_require_permission_success(self, mock_check, mock_user, mock_db):
        """Test successful permission requirement."""
        mock_check.return_value = True
        context = RBACContext(mock_user, mock_db)

        dependency_func = require_permission(PermissionType.VIEW_USERS)
        result = await dependency_func(context)

        assert result == context
        mock_check.assert_awaited_once_with(
            mock_db, mock_user.id, PermissionType.VIEW_USERS
        )

    @pytest.mark.asyncio
    @patch.object(RoleService, "check_user_permission", new_callable=AsyncMock)
    async def test_require_permission_denied(self, mock_check, mock_user, mock_db):
        """Test permission requirement denial."""
        mock_check.return_value = False
        context = RBACContext(mock_user, mock_db)

        dependency_func = require_permission(PermissionType.UPDATE_USERS)

        with pytest.raises(PermissionDeniedError) as exc_info:
            await dependency_func(context)

        assert "Required permission: update_users" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_require_team_access_success(self, mock_user, mock_db):
        """Test successful team access requirement."""
        mock_db.execute = AsyncMock()
        mock_db.execute.return_value.scalars = Mock()
        mock_db.execute.return_value.scalars.return_value.first = Mock()
        mock_membership = Mock()
        mock_membership.role = TeamRole.ADMIN
        mock_db.execute.return_value.scalars.return_value.first.return_value = (
            mock_membership
        )
        context = RBACContext(mock_user, mock_db, team_id=123)
        dependency_func = require_team_access(TeamRole.MEMBER)

        result = await dependency_func(context)

        assert result == context

    @pytest.mark.asyncio
    async def test_require_team_access_no_team_context(self, mock_user, mock_db):
        """Test team access requirement without team context."""
        context = RBACContext(mock_user, mock_db)  # No team_id
        dependency_func = require_team_access(TeamRole.MEMBER)

        with pytest.raises(PermissionDeniedError) as exc_info:
            await dependency_func(context)

        assert "Team context required" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_require_team_access_insufficient_role(self, mock_user, mock_db):
        """Test team access requirement with insufficient role."""
        mock_db.execute = AsyncMock()
        mock_db.execute.return_value.scalars = Mock()
        mock_db.execute.return_value.scalars.return_value.first = Mock()
        mock_membership = Mock()
        mock_membership.role = TeamRole.VIEWER
        mock_db.execute.return_value.scalars.return_value.first.return_value = (
            mock_membership
        )
        context = RBACContext(mock_user, mock_db, team_id=123)
        dependency_func = require_team_access(TeamRole.ADMIN)

        with pytest.raises(PermissionDeniedError) as exc_info:
            await dependency_func(context)

        assert "Required team role: admin" in str(exc_info.value.detail)


class TestUtilityFunctions:
    """Test cases for utility functions."""

    @pytest.fixture
    def mock_user(self):
        """Create a mock user."""
        user = Mock(spec=User)
        user.id = 1
        user.github_username = "testuser"
        return user

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        return Mock(spec=Session)

    @pytest.mark.asyncio
    @patch.object(RoleService, "check_user_permission", new_callable=AsyncMock)
    async def test_check_multiple_permissions_all_required(
        self, mock_check, mock_user, mock_db
    ):
        """Test checking multiple permissions (all required)."""
        mock_check.side_effect = [True, True]
        permissions = [PermissionType.VIEW_USERS, PermissionType.UPDATE_USERS]
        result = await check_multiple_permissions(
            mock_user, mock_db, permissions, all_required=True
        )
        assert result is True
        mock_check.reset_mock()
        mock_check.side_effect = [True, False]
        result = await check_multiple_permissions(
            mock_user, mock_db, permissions, all_required=True
        )
        assert result is False

    @pytest.mark.asyncio
    @patch.object(RoleService, "check_user_permission", new_callable=AsyncMock)
    async def test_check_multiple_permissions_any_required(
        self, mock_check, mock_user, mock_db
    ):
        """Test checking multiple permissions (any required)."""
        mock_check.side_effect = [False, True]
        permissions = [PermissionType.VIEW_USERS, PermissionType.UPDATE_USERS]
        result = await check_multiple_permissions(
            mock_user, mock_db, permissions, all_required=False
        )
        assert result is True
        mock_check.reset_mock()
        mock_check.side_effect = [False, False]
        result = await check_multiple_permissions(
            mock_user, mock_db, permissions, all_required=False
        )
        assert result is False

    @pytest.mark.asyncio
    @patch.object(RoleService, "get_user_permissions", new_callable=AsyncMock)
    async def test_get_user_effective_permissions(
        self, mock_get_perms, mock_user, mock_db
    ):
        """Test getting user's effective permissions."""
        expected_permissions = ["view_users", "update_users", "team_view"]
        mock_get_perms.return_value = expected_permissions

        result = await get_user_effective_permissions(mock_user, mock_db)

        assert result == expected_permissions
        mock_get_perms.assert_awaited_once_with(mock_db, mock_user.id)

    @patch("app.core.auth.rbac.logger")
    def test_audit_access_attempt_granted(self, mock_logger, mock_user):
        """Test audit logging for granted access."""
        audit_access_attempt(
            user=mock_user, resource="test_resource", action="test_action", granted=True
        )

        mock_logger.log.assert_called_once()
        call_args = mock_logger.log.call_args
        assert call_args[0][0] == 20  # logging.INFO
        assert "ACCESS GRANTED" in call_args[0][1]
        assert "testuser" in call_args[0][1]
        assert "test_resource:test_action" in call_args[0][1]

    @patch("app.core.auth.rbac.logger")
    def test_audit_access_attempt_denied(self, mock_logger, mock_user):
        """Test audit logging for denied access."""
        audit_access_attempt(
            user=mock_user,
            resource="test_resource",
            action="test_action",
            granted=False,
            reason="Insufficient permissions",
        )

        mock_logger.log.assert_called_once()
        call_args = mock_logger.log.call_args
        assert call_args[0][0] == 30  # logging.WARNING
        assert "ACCESS DENIED" in call_args[0][1]
        assert "testuser" in call_args[0][1]
        assert "test_resource:test_action" in call_args[0][1]
        assert "Insufficient permissions" in call_args[0][1]


class TestPermissionDeniedError:
    """Test cases for PermissionDeniedError."""

    def test_permission_denied_error_default(self):
        """Test PermissionDeniedError with default message."""
        error = PermissionDeniedError()

        assert error.status_code == 403
        assert error.detail == "Insufficient permissions"
        assert error.headers == {"WWW-Authenticate": "Bearer"}

    def test_permission_denied_error_custom_message(self):
        """Test PermissionDeniedError with custom message."""
        error = PermissionDeniedError("Custom permission error")

        assert error.status_code == 403
        assert error.detail == "Custom permission error"
        assert error.headers == {"WWW-Authenticate": "Bearer"}


if __name__ == "__main__":
    pytest.main([__file__])
