"""
User model for GitHub OAuth authentication.
Stores user information and authentication data.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    and_,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from typing import Optional, List, Dict, Any

from app.db.models import Base
from app.models.user_permission import UserPermission


class User(Base):
    """
    User model for storing GitHub OAuth user information.

    Stores essential user data from GitHub OAuth along with
    application-specific user preferences and metadata.
    """

    __tablename__ = "users"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy support
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False, index=True
    )

    # GitHub OAuth data
    github_id = Column(
        String, index=True, nullable=False
    )  # Removed unique constraint for multi-tenancy
    github_username = Column(
        String, index=True, nullable=False
    )  # Removed unique constraint for multi-tenancy
    email = Column(
        String, index=True, nullable=True
    )  # Removed unique constraint for multi-tenancy

    # User profile information
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    company = Column(String, nullable=True)
    location = Column(String, nullable=True)
    blog = Column(String, nullable=True)

    # Application-specific fields
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)

    # Role-based access control
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)

    # GitHub access information
    github_access_token = Column(String, nullable=True)  # Encrypted in production
    github_scope = Column(String, nullable=True)
    
    # Password authentication (for non-OAuth users)
    password_hash = Column(String, nullable=True)

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
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="users")
    user_roles = relationship(
        "UserRole",
        foreign_keys="UserRole.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    teams = relationship(
        "Team",
        secondary=lambda: __import__(
            "app.models.team", fromlist=["team_memberships"]
        ).team_memberships,
        primaryjoin="User.id == team_memberships.c.user_id",
        secondaryjoin="Team.id == team_memberships.c.team_id",
        back_populates="members",
    )
    team_memberships = relationship(
        "UserTeam", back_populates="user", foreign_keys="UserTeam.user_id"
    )
    projects = relationship("Project", back_populates="created_by")
    created_teams = relationship(
        "Team", back_populates="created_by", foreign_keys="Team.created_by_user_id"
    )
    created_projects = relationship(
        "Project",
        back_populates="created_by",
        foreign_keys="Project.created_by_user_id",
    )
    triggered_pipelines = relationship(
        "Pipeline",
        back_populates="triggered_by",
        foreign_keys="Pipeline.triggered_by_user_id",
    )
    triggered_automation_runs = relationship(
        "AutomationRun",
        back_populates="triggered_by",
        foreign_keys="AutomationRun.triggered_by_user_id",
    )
    triggered_infrastructure_changes = relationship(
        "InfrastructureChange",
        back_populates="triggered_by",
        foreign_keys="InfrastructureChange.triggered_by_user_id",
    )
    approved_infrastructure_changes = relationship(
        "InfrastructureChange",
        back_populates="approved_by",
        foreign_keys="InfrastructureChange.approved_by_user_id",
    )
    acknowledged_alerts = relationship(
        "Alert",
        back_populates="acknowledged_by",
        foreign_keys="Alert.acknowledged_by_user_id",
    )
    resolved_alerts = relationship(
        "Alert", back_populates="resolved_by", foreign_keys="Alert.resolved_by_user_id"
    )
    notification_preferences = relationship(
        "NotificationPreference",
        back_populates="user",
        foreign_keys="NotificationPreference.user_id",
    )
    notification_logs = relationship(
        "NotificationLog", back_populates="user", foreign_keys="NotificationLog.user_id"
    )
    push_tokens = relationship(
        "PushToken", back_populates="user", foreign_keys="PushToken.user_id"
    )

    # Audit relationships
    audit_logs = relationship("AuditLog", back_populates="user")

    # New relationship for direct user-permissions
    user_permissions = relationship(
        "UserPermission", 
        back_populates="user", 
        cascade="all, delete-orphan",
        foreign_keys="[UserPermission.user_id]"
    )

    def __repr__(self) -> str:
        """String representation of User model."""
        return f"<User(id={self.id}, github_username='{self.github_username}', full_name='{self.full_name}')>"

    def to_dict(self, include_sensitive: bool = False) -> Dict[str, Any]:
        """Convert user model to dictionary for API responses."""
        data = {
            "id": self.id,
            "organization_id": self.organization_id,
            "github_id": self.github_id,
            "github_username": self.github_username,
            "full_name": self.full_name,
            "email": self.email,
            "avatar_url": self.avatar_url,
            "bio": self.bio,
            "location": self.location,
            "company": self.company,
            "blog": self.blog,
            "is_active": self.is_active,
            "is_superuser": self.is_superuser,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            # Include role information for the organization context
            "roles": [ur.to_dict() for ur in self.user_roles if ur.is_valid()],
        }

        if include_sensitive:
            data.update(
                {
                    "github_access_token": self.github_access_token,
                    "github_scope": self.github_scope,
                    "settings": self.get_settings(),
                    "preferences": self.get_preferences(),
                    "metadata": self.get_metadata(),
                }
            )

        return data

    @classmethod
    def from_github_data(
        cls, github_data: dict, access_token: str, scope: str, organization_id: int
    ) -> "User":
        """
        Create User instance from GitHub OAuth data.

        Args:
            github_data (dict): User data from GitHub API
            access_token (str): GitHub OAuth access token
            scope (str): OAuth scope granted
            organization_id (int): Organization ID for multi-tenancy

        Returns:
            User: New User instance with GitHub data
        """
        return cls(
            organization_id=organization_id,
            github_id=str(github_data.get("id")),
            github_username=github_data.get("login"),
            email=github_data.get("email"),
            full_name=github_data.get("name"),
            avatar_url=github_data.get("avatar_url"),
            bio=github_data.get("bio"),
            company=github_data.get("company"),
            location=github_data.get("location"),
            blog=github_data.get("blog"),
            github_access_token=access_token,
            github_scope=scope,
        )

    def has_permission(self, permission_name: str) -> bool:
        """
        Check if user has a specific permission through their role or direct assignment.
        """
        if self.is_superuser:
            return True
        # Check direct user-permissions (system-wide)
        for up in self.user_permissions:
            if (
                up.is_active
                and up.permission
                and up.permission.name == permission_name
                and up.organization_id is None
            ):
                return True
        if not self.role:
            return False
        return self.role.has_permission(permission_name)

    def get_permissions(self) -> List[str]:
        """
        Get all permissions for the user through their role and direct assignments.
        """
        if self.is_superuser:
            from app.models.role import PermissionType

            return [perm.value for perm in PermissionType]
        perms = set()
        # Direct user-permissions (system-wide)
        for up in self.user_permissions:
            if up.is_active and up.permission and up.organization_id is None:
                perms.add(up.permission.name)
        if self.role:
            perms.update([perm.name for perm in self.role.permissions])
        return list(perms)

    def assign_role(self, role_id: int) -> None:
        """
        Assign a role to the user.

        Args:
            role_id (int): ID of the role to assign
        """
        self.role_id = role_id

    def remove_role(self) -> None:
        """Remove the user's role."""
        self.role_id = None

    def get_role_name(self) -> Optional[str]:
        """
        Get the user's role name.

        Returns:
            Optional[str]: Role name if user has a role, None otherwise
        """
        if self.role:
            return self.role.name
        return None

    def is_admin(self) -> bool:
        """Check if user has admin role or is superuser."""
        return self.is_superuser or (
            self.role and self.role.name in ["admin", "super_admin"]
        )

    def can_manage_users(self) -> bool:
        """Check if user can manage other users."""
        return (
            self.has_permission("create_users")
            or self.has_permission("update_users")
            or self.has_permission("delete_users")
        )

    def can_manage_teams(self) -> bool:
        """Check if user can manage teams."""
        return self.has_permission("create_teams") or self.has_permission(
            "manage_team_members"
        )

    def belongs_to_organization(self, organization_id: int) -> bool:
        """Check if user belongs to a specific organization."""
        return self.organization_id == organization_id

    def get_organization_slug(self) -> Optional[str]:
        """Get the organization slug for the user."""
        return self.organization.slug if self.organization else None

    # Role and permission methods for multi-tenant RBAC
    def get_role_in_org(self, organization_id: int) -> Optional["UserRole"]:
        """Get the active role assignment for this user in a specific organization."""
        for user_role in self.user_roles:
            if user_role.organization_id == organization_id and user_role.is_valid():
                return user_role
        return None

    def get_permissions_in_org(self, organization_id: int) -> List[str]:
        """
        Get all permissions for this user in a specific organization (role and direct assignments).
        """
        perms = set()
        for up in self.user_permissions:
            if up.is_active and up.permission and up.organization_id == organization_id:
                perms.add(up.permission.name)
        user_role = self.get_role_in_org(organization_id)
        if user_role:
            perms.update(user_role.get_permissions())
        return list(perms)

    def has_permission_in_org(self, permission_name: str, organization_id: int) -> bool:
        """
        Check if user has a specific permission in an organization (role or direct assignment).
        """
        # Direct user-permissions (org-scoped)
        for up in self.user_permissions:
            if (
                up.is_active
                and up.permission
                and up.permission.name == permission_name
                and up.organization_id == organization_id
            ):
                return True
        return permission_name in self.get_permissions_in_org(organization_id)

    def is_org_admin(self, organization_id: int) -> bool:
        """Check if user is an organization administrator."""
        user_role = self.get_role_in_org(organization_id)
        if not user_role or not user_role.role:
            return False
        return user_role.role.name in ["super_admin", "org_admin"]

    def is_super_admin(self) -> bool:
        """Check if user has super admin privileges (system-wide)."""
        for user_role in self.user_roles:
            if (
                user_role.is_valid()
                and user_role.role
                and user_role.role.name == "super_admin"
            ):
                return True
        return False

    def get_accessible_organizations(self) -> List[int]:
        """Get list of organization IDs this user has access to."""
        return [ur.organization_id for ur in self.user_roles if ur.is_valid()]
