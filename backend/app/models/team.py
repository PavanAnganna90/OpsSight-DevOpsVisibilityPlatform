"""
Team model for user teams and role-based access control.
Stores team information, member roles, and permissions.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    Enum as SQLEnum,
    ForeignKey,
    Table,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from typing import Optional, Dict, Any, List
import json

from app.db.database import Base
from sqlalchemy import and_


class TeamRole(str, Enum):
    """Enumeration for team member roles."""

    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


# Association table for team memberships
team_memberships = Table(
    "team_memberships",
    Base.metadata,
    Column("team_id", Integer, ForeignKey("teams.id"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("role", SQLEnum(TeamRole), nullable=False, default=TeamRole.MEMBER),
    Column(
        "joined_at", DateTime(timezone=True), server_default=func.now(), nullable=False
    ),
    Column("invited_by_user_id", Integer, ForeignKey("users.id"), nullable=True),
)


class Team(Base):
    """
    Team model for organizing users and managing access control.

    Stores team information, member roles, and permissions for
    project-based collaboration and resource access.
    """

    __tablename__ = "teams"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy support
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False, index=True
    )

    # Team identification
    name = Column(
        String, index=True, nullable=False
    )  # Removed unique constraint for multi-tenancy
    display_name = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    slug = Column(
        String, index=True, nullable=False
    )  # Removed unique constraint for multi-tenancy

    # Team settings
    is_active = Column(Boolean, default=True, nullable=False)
    max_members = Column(Integer, default=50, nullable=False)
    default_role = Column(SQLEnum(TeamRole), default=TeamRole.MEMBER, nullable=False)

    # Team configuration
    settings = Column(Text, nullable=True)  # JSON object for team settings
    permissions = Column(Text, nullable=True)  # JSON object for team permissions

    # Relationships
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

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

    # Relationships
    organization = relationship("Organization", back_populates="teams")
    created_by = relationship(
        "User", back_populates="created_teams", foreign_keys=[created_by_user_id]
    )
    user_memberships = relationship(
        "UserTeam", back_populates="team_memberships", foreign_keys="UserTeam.team_id"
    )
    members = relationship(
        "User",
        secondary=team_memberships,
        primaryjoin="Team.id == team_memberships.c.team_id",
        secondaryjoin="User.id == team_memberships.c.user_id",
        back_populates="teams",
    )
    projects = relationship("Project", back_populates="team")
    notification_preferences = relationship(
        "NotificationPreference", back_populates="team", cascade="all, delete-orphan"
    )
    notification_logs = relationship(
        "NotificationLog", back_populates="team", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        """String representation of Team model."""
        return f"<Team(id={self.id}, name='{self.name}', org_id={self.organization_id}, members={len(self.members)})>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert team model to dictionary for API responses."""
        return {
            "id": self.id,
            "organization_id": self.organization_id,
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "slug": self.slug,
            "is_active": self.is_active,
            "max_members": self.max_members,
            "default_role": self.default_role,
            "settings": self.get_settings(),
            "permissions": self.get_permissions(),
            "created_by_user_id": self.created_by_user_id,
            "member_count": len(self.members),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def get_settings(self) -> Optional[Dict[str, Any]]:
        """Parse settings JSON string to dictionary."""
        if self.settings:
            try:
                return json.loads(self.settings)
            except json.JSONDecodeError:
                return None
        return None

    def set_settings(self, settings_dict: Dict[str, Any]) -> None:
        """Set team settings as JSON string."""
        self.settings = json.dumps(settings_dict) if settings_dict else None

    def get_permissions(self) -> Optional[Dict[str, Any]]:
        """Parse permissions JSON string to dictionary."""
        if self.permissions:
            try:
                return json.loads(self.permissions)
            except json.JSONDecodeError:
                return None
        return None

    def set_permissions(self, permissions_dict: Dict[str, Any]) -> None:
        """Set team permissions as JSON string."""
        self.permissions = json.dumps(permissions_dict) if permissions_dict else None

    def add_member(
        self, user_id: int, role: TeamRole = None, invited_by: int = None
    ) -> bool:
        """Add a member to the team."""
        if len(self.members) >= self.max_members:
            return False

        # Check if user is already a member
        if any(member.id == user_id for member in self.members):
            return False

        # Add the relationship (this would typically be done through a service layer)
        # For now, we'll just return True indicating the operation should succeed
        return True

    def remove_member(self, user_id: int) -> bool:
        """Remove a member from the team."""
        # This would typically be done through a service layer
        return True

    def get_member_role(self, user_id: int) -> Optional[TeamRole]:
        """Get the role of a team member."""
        membership = next(
            (m for m in self.user_memberships if m.user_id == user_id and m.is_active),
            None,
        )
        return membership.role if membership else None

    def update_member_role(self, user_id: int, new_role: TeamRole) -> bool:
        """Update the role of a team member."""
        # This would update the association table
        return True

    def is_member(self, user_id: int) -> bool:
        """Check if a user is a member of the team."""
        return any(m.user_id == user_id and m.is_active for m in self.user_memberships)

    def can_add_members(self) -> bool:
        """Check if the team can add more members."""
        return len(self.members) < self.max_members and self.is_active

    def get_member_count(self) -> int:
        """Get the number of active members in the team."""
        return len([m for m in self.user_memberships if m.is_active])

    def belongs_to_organization(self, organization_id: int) -> bool:
        """Check if team belongs to a specific organization."""
        return self.organization_id == organization_id

    @classmethod
    def create_slug(cls, name: str, organization_id: int) -> str:
        """Create a URL-safe slug from team name within organization context."""
        import re

        slug = name.lower().strip()
        slug = re.sub(r"[^a-z0-9\-_]", "-", slug)
        slug = re.sub(r"-+", "-", slug)
        slug = slug.strip("-")
        return slug[:100]  # Limit to 100 characters
