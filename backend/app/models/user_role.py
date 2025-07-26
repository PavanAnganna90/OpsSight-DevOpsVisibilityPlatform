"""
User Role Assignment model for multi-tenant RBAC.
Manages the assignment of roles to users within organizational context.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from typing import Optional, Dict, Any
from datetime import datetime

from app.db.database import Base


class UserRole(Base):
    """
    User Role Assignment model for multi-tenant RBAC.

    This model manages the assignment of roles to users within specific
    organizations, providing fine-grained access control in a multi-tenant
    environment.
    """

    __tablename__ = "user_roles"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False, index=True)
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False, index=True
    )

    # Assignment metadata
    assigned_by = Column(
        Integer, ForeignKey("users.id"), nullable=True
    )  # Who assigned this role
    notes = Column(String(500), nullable=True)  # Optional notes about the assignment

    # Assignment status
    is_active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Optional expiration

    # Timestamps
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Unique constraints - user can have only one role per organization
    __table_args__ = (
        UniqueConstraint("user_id", "organization_id", name="_user_org_role_uc"),
    )

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="user_roles")
    role = relationship("Role", back_populates="user_roles")
    organization = relationship("Organization", back_populates="user_roles")
    assigned_by_user = relationship("User", foreign_keys=[assigned_by])

    def __repr__(self) -> str:
        """String representation of UserRole model."""
        return f"<UserRole(user_id={self.user_id}, role_id={self.role_id}, org_id={self.organization_id})>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert user role assignment to dictionary for API responses."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "role_id": self.role_id,
            "organization_id": self.organization_id,
            "assigned_by": self.assigned_by,
            "notes": self.notes,
            "is_active": self.is_active,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            # Include related data for convenience
            "user": (
                {
                    "id": self.user.id,
                    "login": self.user.login,
                    "name": self.user.name,
                    "email": self.user.email,
                }
                if self.user
                else None
            ),
            "role": (
                {
                    "id": self.role.id,
                    "name": self.role.name,
                    "display_name": self.role.display_name,
                }
                if self.role
                else None
            ),
            "organization": (
                {
                    "id": self.organization.id,
                    "name": self.organization.name,
                }
                if self.organization
                else None
            ),
        }

    def is_expired(self) -> bool:
        """Check if the role assignment has expired."""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at.replace(tzinfo=None)

    def is_valid(self) -> bool:
        """Check if the role assignment is currently valid."""
        return self.is_active and not self.is_expired()

    def get_permissions(self) -> list:
        """Get all permissions associated with this role assignment."""
        if not self.is_valid() or not self.role:
            return []
        return [perm.name for perm in self.role.permissions if perm.is_active]

    def has_permission(self, permission_name: str) -> bool:
        """Check if this role assignment grants a specific permission."""
        return permission_name in self.get_permissions()

    @classmethod
    def get_user_role_in_org(
        cls, session, user_id: int, organization_id: int
    ) -> Optional["UserRole"]:
        """Get the active role assignment for a user in a specific organization."""
        return (
            session.query(cls)
            .filter(
                cls.user_id == user_id,
                cls.organization_id == organization_id,
                cls.is_active == True,
            )
            .first()
        )

    @classmethod
    def get_user_permissions_in_org(
        cls, session, user_id: int, organization_id: int
    ) -> list:
        """Get all permissions for a user in a specific organization."""
        user_role = cls.get_user_role_in_org(session, user_id, organization_id)
        if not user_role:
            return []
        return user_role.get_permissions()
