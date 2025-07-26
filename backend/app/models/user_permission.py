"""
UserPermission model for direct user-permission assignments.
Supports organization-scoped and system-wide permissions.
"""

from sqlalchemy import (
    Column,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship
from app.db.database import Base


class UserPermission(Base):
    """
    Association table for direct user-permission assignments.
    Supports organization-scoped and system-wide permissions.
    """

    __tablename__ = "user_permissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    permission_id = Column(
        Integer, ForeignKey("permissions.id"), nullable=False, index=True
    )
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=True, index=True
    )
    granted_by = Column(
        Integer, ForeignKey("users.id"), nullable=True, index=True
    )
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Unique constraint: a user can have a given permission only once per org (or globally)
    __table_args__ = (
        UniqueConstraint(
            "user_id", "permission_id", "organization_id", name="_user_permission_uc"
        ),
    )

    # Relationships
    user = relationship("User", back_populates="user_permissions", foreign_keys=[user_id])
    permission = relationship("Permission", back_populates="user_permissions")
    organization = relationship("Organization")
    granted_by_user = relationship("User", foreign_keys=[granted_by])

    def __repr__(self) -> str:
        org = f", org_id={self.organization_id}" if self.organization_id else ""
        return f"<UserPermission(id={self.id}, user_id={self.user_id}, permission_id={self.permission_id}{org}, is_active={self.is_active})>"
