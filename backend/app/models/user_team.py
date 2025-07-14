"""
UserTeam model for team membership management.
Represents the many-to-many relationship between users and teams with roles.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from typing import Optional, Dict, Any
from datetime import datetime

from app.db.models import Base
from app.models.team import TeamRole


class UserTeam(Base):
    """
    UserTeam model for managing team memberships and roles.

    Represents the association between users and teams, including
    the user's role within the team and membership metadata.
    """

    __tablename__ = "user_teams"

    # Primary keys (composite)
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"), primary_key=True)

    # Role and membership information
    role = Column(SQLEnum(TeamRole), nullable=False, default=TeamRole.MEMBER)
    is_active = Column(Boolean, default=True, nullable=False)

    # Membership metadata
    joined_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    invited_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    invited_at = Column(DateTime(timezone=True), nullable=True)

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
    user = relationship(
        "User", foreign_keys=[user_id], back_populates="team_memberships"
    )
    team = relationship(
        "Team", foreign_keys=[team_id], back_populates="user_memberships"
    )
    invited_by = relationship("User", foreign_keys=[invited_by_user_id])
    team_memberships = relationship("User", back_populates="team_memberships")
    team_memberships = relationship("Team", back_populates="user_memberships")

    def __repr__(self) -> str:
        """String representation of UserTeam model."""
        return f"<UserTeam(user_id={self.user_id}, team_id={self.team_id}, role='{self.role}')>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert user team model to dictionary for API responses."""
        return {
            "user_id": self.user_id,
            "team_id": self.team_id,
            "role": self.role,
            "is_active": self.is_active,
            "joined_at": self.joined_at.isoformat() if self.joined_at else None,
            "invited_by_user_id": self.invited_by_user_id,
            "invited_at": self.invited_at.isoformat() if self.invited_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def can_manage_team(self) -> bool:
        """Check if user can manage team (owner or admin)."""
        return self.role in [TeamRole.OWNER, TeamRole.ADMIN]

    def can_invite_members(self) -> bool:
        """Check if user can invite new members."""
        return self.role in [TeamRole.OWNER, TeamRole.ADMIN]

    def can_remove_members(self) -> bool:
        """Check if user can remove members."""
        return self.role in [TeamRole.OWNER, TeamRole.ADMIN]

    def can_update_member_roles(self) -> bool:
        """Check if user can update member roles."""
        return self.role == TeamRole.OWNER

    def is_owner(self) -> bool:
        """Check if user is team owner."""
        return self.role == TeamRole.OWNER

    def is_admin(self) -> bool:
        """Check if user is team admin."""
        return self.role == TeamRole.ADMIN

    def has_write_access(self) -> bool:
        """Check if user has write access to team resources."""
        return self.role in [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.MEMBER]

    def has_read_access(self) -> bool:
        """Check if user has read access to team resources."""
        return self.role in [
            TeamRole.OWNER,
            TeamRole.ADMIN,
            TeamRole.MEMBER,
            TeamRole.VIEWER,
        ]

    @classmethod
    def create_membership(
        cls,
        user_id: int,
        team_id: int,
        role: TeamRole = TeamRole.MEMBER,
        invited_by_user_id: Optional[int] = None,
    ) -> "UserTeam":
        """
        Create a new team membership.

        Args:
            user_id (int): ID of the user
            team_id (int): ID of the team
            role (TeamRole): Role to assign to the user
            invited_by_user_id (Optional[int]): ID of the user who invited this member

        Returns:
            UserTeam: New membership instance
        """
        return cls(
            user_id=user_id,
            team_id=team_id,
            role=role,
            invited_by_user_id=invited_by_user_id,
            invited_at=datetime.utcnow() if invited_by_user_id else None,
            joined_at=datetime.utcnow(),
        )
