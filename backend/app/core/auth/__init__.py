"""
Authentication utilities and dependencies for OpsSight DevOps platform.
Exports commonly used authentication functions and dependencies.
"""

# Removed circular import: # from app.api.v1.endpoints.auth import get_current_user
from app.core.auth.jwt import verify_token
from app.services.user_service import UserService
from app.models.user import User
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Depends
import logging

# RBAC imports
from app.core.auth.rbac import (
    PermissionDeniedError,
    RBACContext,
    get_rbac_context,
    require_permission,
    require_team_access,
    require_resource_access,
    require_permissions,
    require_team_role,
    require_admin,
    require_superuser,
    check_multiple_permissions,
    get_user_effective_permissions,
    audit_access_attempt,
)

logger = logging.getLogger(__name__)


def get_current_user() -> User:
    """
    Demo function to get current user.
    In a real application, this would validate JWT tokens.

    Returns:
        User: Demo user for testing
    """
    # For demo purposes, return a mock user
    return User(
        id=1,
        github_username="demo_user",
        email="demo@opsight.local",
        full_name="Demo User",
        is_active=True,
        is_superuser=False,
    )


async def get_current_user_websocket(token: str, db: Session) -> User:
    """
    Get current authenticated user from JWT token for WebSocket connections.

    Args:
        token (str): JWT token
        db (Session): Database session

    Returns:
        User: Current authenticated user

    Raises:
        HTTPException: If token is invalid or user not found
    """
    # Verify token
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        )

    # Get user from database
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload"
        )

    user = UserService.get_user_by_id(db, int(user_id))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return user


__all__ = [
    # Basic authentication
    "get_current_user",
    "get_current_user_websocket",
    # RBAC components
    "PermissionDeniedError",
    "RBACContext",
    "get_rbac_context",
    "require_permission",
    "require_team_access",
    "require_resource_access",
    "require_permissions",
    "require_team_role",
    "require_admin",
    "require_superuser",
    "check_multiple_permissions",
    "get_user_effective_permissions",
    "audit_access_attempt",
]
