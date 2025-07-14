"""
Role and Permission models for system-wide RBAC.
Provides system-level role-based access control complementing team-level roles.
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
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from typing import Optional, Dict, Any, List
import json

from app.db.models import Base
from app.models.user_permission import UserPermission


class SystemRole(str, Enum):
    """Enumeration for system-wide user roles."""

    SUPER_ADMIN = "super_admin"  # Full system access (platform-wide)
    ORGANIZATION_OWNER = "org_owner"  # Full access to organization resources
    DEVOPS_ADMIN = "devops_admin"  # Operational access to infrastructure
    MANAGER = "manager"  # Management-level access
    ENGINEER = "engineer"  # Engineering access
    VIEWER = "viewer"  # Read-only access
    API_ONLY = "api_only"  # Programmatic access for integrations


class PermissionType(str, Enum):
    """Enumeration for permission types."""

    # Organization management (super admin only)
    CREATE_ORGANIZATIONS = "create_organizations"
    UPDATE_ORGANIZATIONS = "update_organizations"
    DELETE_ORGANIZATIONS = "delete_organizations"
    VIEW_ALL_ORGANIZATIONS = "view_all_organizations"

    # User management
    CREATE_USERS = "create_users"
    UPDATE_USERS = "update_users"
    DELETE_USERS = "delete_users"
    VIEW_USERS = "view_users"
    INVITE_USERS = "invite_users"
    MANAGE_USERS = "manage_users"  # Comprehensive user management

    # Team management
    CREATE_TEAMS = "create_teams"
    UPDATE_TEAMS = "update_teams"
    DELETE_TEAMS = "delete_teams"
    VIEW_TEAMS = "view_teams"
    MANAGE_TEAM_MEMBERS = "manage_team_members"
    MANAGE_TEAMS = "manage_teams"  # Comprehensive team management

    # Project management
    CREATE_PROJECTS = "create_projects"
    UPDATE_PROJECTS = "update_projects"
    DELETE_PROJECTS = "delete_projects"
    VIEW_PROJECTS = "view_projects"
    MANAGE_PROJECTS = "manage_projects"  # Comprehensive project management

    # Infrastructure management
    VIEW_INFRASTRUCTURE = "view_infrastructure"
    MANAGE_INFRASTRUCTURE = "manage_infrastructure"
    DEPLOY_INFRASTRUCTURE = "deploy_infrastructure"

    # Pipeline management
    VIEW_PIPELINES = "view_pipelines"
    TRIGGER_PIPELINES = "trigger_pipelines"
    MANAGE_PIPELINES = "manage_pipelines"

    # Automation management
    VIEW_AUTOMATION = "view_automation"
    TRIGGER_AUTOMATION = "trigger_automation"
    MANAGE_AUTOMATION = "manage_automation"

    # Alert management
    VIEW_ALERTS = "view_alerts"
    ACKNOWLEDGE_ALERTS = "acknowledge_alerts"
    RESOLVE_ALERTS = "resolve_alerts"
    MANAGE_ALERTS = "manage_alerts"

    # Cost management
    VIEW_COSTS = "view_costs"
    MANAGE_COST_BUDGETS = "manage_cost_budgets"

    # Role management
    VIEW_ROLES = "view_roles"
    MANAGE_ROLES = "manage_roles"

    # System administration
    VIEW_SYSTEM_LOGS = "view_system_logs"
    MANAGE_SYSTEM_SETTINGS = "manage_system_settings"
    
    # Audit management
    VIEW_AUDIT_LOGS = "view_audit_logs"
    EXPORT_AUDIT_LOGS = "export_audit_logs"
    MANAGE_AUDIT_LOGS = "manage_audit_logs"
    DELETE_AUDIT_LOGS = "delete_audit_logs"

    # Organization-specific settings
    MANAGE_ORG_SETTINGS = "manage_org_settings"
    VIEW_ORG_SETTINGS = "view_org_settings"
    MANAGE_ORG_BILLING = "manage_org_billing"
    VIEW_ORG_BILLING = "view_org_billing"

    # API access permissions for programmatic access
    API_READ_ACCESS = "api_read_access"
    API_WRITE_ACCESS = "api_write_access"
    API_ADMIN_ACCESS = "api_admin_access"
    WEBHOOK_MANAGEMENT = "webhook_management"
    TOKEN_MANAGEMENT = "token_management"

    # DevOps specific permissions
    CLUSTER_MANAGEMENT = "cluster_management"
    DEPLOYMENT_MANAGEMENT = "deployment_management"
    MONITORING_MANAGEMENT = "monitoring_management"
    MANAGE_MONITORING = "monitoring_management"  # Alias for MONITORING_MANAGEMENT
    VIEW_MONITORING = "view_monitoring"  # View monitoring data
    LOG_ACCESS = "log_access"
    SECURITY_SCANNING = "security_scanning"
    
    # Administrative permissions
    ADMIN_READ = "admin_read"  # Administrative read access
    ADMIN_WRITE = "admin_write"  # Administrative write access


# Association table for role-permission relationships
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id"), primary_key=True),
    Column(
        "created_at", DateTime(timezone=True), server_default=func.now(), nullable=False
    ),
)


class Role(Base):
    """
    Role model for system-wide role-based access control.

    Defines system-level roles (admin, manager, engineer) that apply
    across the entire application or within specific organizations.
    """

    __tablename__ = "roles"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy support
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=True, index=True
    )

    # Role identification
    name = Column(SQLEnum(SystemRole), index=True, nullable=False)
    display_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Role configuration
    is_active = Column(Boolean, default=True, nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)
    priority = Column(
        Integer, default=0, nullable=False
    )  # Higher numbers = higher priority

    # System vs organization level roles
    is_system_role = Column(
        Boolean, default=False, nullable=False
    )  # True for global roles like super_admin

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

    # Unique constraints
    __table_args__ = (
        # System roles are unique globally, org roles are unique per org
        UniqueConstraint("name", "organization_id", name="_role_name_org_uc"),
    )

    # Relationships
    organization = relationship("Organization", back_populates="roles")
    permissions = relationship(
        "Permission", secondary=role_permissions, back_populates="roles"
    )
    user_roles = relationship(
        "UserRole", back_populates="role", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        """String representation of Role model."""
        org_suffix = (
            f" (org:{self.organization_id})" if self.organization_id else " (system)"
        )
        return f"<Role(id={self.id}, name='{self.name}', display_name='{self.display_name}'{org_suffix})>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert role model to dictionary for API responses."""
        return {
            "id": self.id,
            "organization_id": self.organization_id,
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "is_active": self.is_active,
            "is_default": self.is_default,
            "is_system_role": self.is_system_role,
            "priority": self.priority,
            "permissions": [perm.to_dict() for perm in self.permissions],
            "user_count": len([ur for ur in self.user_roles if ur.is_valid()]),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def has_permission(self, permission_name: str) -> bool:
        """Check if role has a specific permission."""
        return any(perm.name == permission_name for perm in self.permissions)

    def add_permission(self, permission: "Permission") -> bool:
        """Add a permission to this role."""
        if permission not in self.permissions:
            self.permissions.append(permission)
            return True
        return False

    def remove_permission(self, permission: "Permission") -> bool:
        """Remove a permission from this role."""
        if permission in self.permissions:
            self.permissions.remove(permission)
            return True
        return False

    @classmethod
    def get_default_permissions(cls, role_name: SystemRole) -> List[PermissionType]:
        """Get default permissions for a role according to PRD specifications."""
        permission_sets = {
            # SUPER_ADMIN: Platform-wide access across all organizations
            SystemRole.SUPER_ADMIN: list(PermissionType),  # All permissions
            # ORGANIZATION_OWNER: Full access within their organization (replaces ORG_ADMIN)
            SystemRole.ORGANIZATION_OWNER: [
                # Full user management within org
                PermissionType.CREATE_USERS,
                PermissionType.UPDATE_USERS,
                PermissionType.DELETE_USERS,
                PermissionType.VIEW_USERS,
                PermissionType.INVITE_USERS,
                # Full team management
                PermissionType.CREATE_TEAMS,
                PermissionType.UPDATE_TEAMS,
                PermissionType.DELETE_TEAMS,
                PermissionType.VIEW_TEAMS,
                PermissionType.MANAGE_TEAM_MEMBERS,
                # Full project management
                PermissionType.CREATE_PROJECTS,
                PermissionType.UPDATE_PROJECTS,
                PermissionType.DELETE_PROJECTS,
                PermissionType.VIEW_PROJECTS,
                # Full infrastructure access
                PermissionType.VIEW_INFRASTRUCTURE,
                PermissionType.MANAGE_INFRASTRUCTURE,
                PermissionType.DEPLOY_INFRASTRUCTURE,
                # Full pipeline access
                PermissionType.VIEW_PIPELINES,
                PermissionType.TRIGGER_PIPELINES,
                PermissionType.MANAGE_PIPELINES,
                # Full automation access
                PermissionType.VIEW_AUTOMATION,
                PermissionType.TRIGGER_AUTOMATION,
                PermissionType.MANAGE_AUTOMATION,
                # Full alert management
                PermissionType.VIEW_ALERTS,
                PermissionType.ACKNOWLEDGE_ALERTS,
                PermissionType.RESOLVE_ALERTS,
                PermissionType.MANAGE_ALERTS,
                # Full cost management
                PermissionType.VIEW_COSTS,
                PermissionType.MANAGE_COST_BUDGETS,
                # Full role management within org
                PermissionType.VIEW_ROLES,
                PermissionType.MANAGE_ROLES,
                # Full organization settings
                PermissionType.MANAGE_ORG_SETTINGS,
                PermissionType.VIEW_ORG_SETTINGS,
                PermissionType.MANAGE_ORG_BILLING,
                PermissionType.VIEW_ORG_BILLING,
                # DevOps permissions
                PermissionType.CLUSTER_MANAGEMENT,
                PermissionType.DEPLOYMENT_MANAGEMENT,
                PermissionType.MONITORING_MANAGEMENT,
                PermissionType.LOG_ACCESS,
                PermissionType.SECURITY_SCANNING,
                # API access
                PermissionType.API_READ_ACCESS,
                PermissionType.API_WRITE_ACCESS,
                PermissionType.API_ADMIN_ACCESS,
                PermissionType.WEBHOOK_MANAGEMENT,
                PermissionType.TOKEN_MANAGEMENT,
            ],
            # DEVOPS_ADMIN: Operational access to infrastructure and deployments
            SystemRole.DEVOPS_ADMIN: [
                # Limited user viewing
                PermissionType.VIEW_USERS,
                # Team viewing and limited management
                PermissionType.VIEW_TEAMS,
                PermissionType.MANAGE_TEAM_MEMBERS,
                # Project viewing and management
                PermissionType.VIEW_PROJECTS,
                PermissionType.UPDATE_PROJECTS,
                # Full infrastructure access (core DevOps function)
                PermissionType.VIEW_INFRASTRUCTURE,
                PermissionType.MANAGE_INFRASTRUCTURE,
                PermissionType.DEPLOY_INFRASTRUCTURE,
                # Full pipeline management
                PermissionType.VIEW_PIPELINES,
                PermissionType.TRIGGER_PIPELINES,
                PermissionType.MANAGE_PIPELINES,
                # Full automation access
                PermissionType.VIEW_AUTOMATION,
                PermissionType.TRIGGER_AUTOMATION,
                PermissionType.MANAGE_AUTOMATION,
                # Full alert management (operational responsibility)
                PermissionType.VIEW_ALERTS,
                PermissionType.ACKNOWLEDGE_ALERTS,
                PermissionType.RESOLVE_ALERTS,
                PermissionType.MANAGE_ALERTS,
                # Cost viewing and limited budget management
                PermissionType.VIEW_COSTS,
                PermissionType.MANAGE_COST_BUDGETS,
                # Role viewing
                PermissionType.VIEW_ROLES,
                # Organization settings viewing
                PermissionType.VIEW_ORG_SETTINGS,
                # Full DevOps-specific permissions
                PermissionType.CLUSTER_MANAGEMENT,
                PermissionType.DEPLOYMENT_MANAGEMENT,
                PermissionType.MONITORING_MANAGEMENT,
                PermissionType.LOG_ACCESS,
                PermissionType.SECURITY_SCANNING,
                # Limited API access for operational tasks
                PermissionType.API_READ_ACCESS,
                PermissionType.API_WRITE_ACCESS,
            ],
            # MANAGER: Management-level access with team and project oversight
            SystemRole.MANAGER: [
                PermissionType.VIEW_USERS,
                PermissionType.INVITE_USERS,
                PermissionType.CREATE_TEAMS,
                PermissionType.UPDATE_TEAMS,
                PermissionType.VIEW_TEAMS,
                PermissionType.MANAGE_TEAM_MEMBERS,
                PermissionType.CREATE_PROJECTS,
                PermissionType.UPDATE_PROJECTS,
                PermissionType.VIEW_PROJECTS,
                PermissionType.VIEW_INFRASTRUCTURE,
                PermissionType.VIEW_PIPELINES,
                PermissionType.TRIGGER_PIPELINES,
                PermissionType.VIEW_AUTOMATION,
                PermissionType.TRIGGER_AUTOMATION,
                PermissionType.VIEW_ALERTS,
                PermissionType.ACKNOWLEDGE_ALERTS,
                PermissionType.RESOLVE_ALERTS,
                PermissionType.VIEW_COSTS,
                PermissionType.MANAGE_COST_BUDGETS,
                PermissionType.VIEW_ROLES,
                PermissionType.VIEW_ORG_SETTINGS,
                # Limited DevOps access
                PermissionType.LOG_ACCESS,
                # API read access for reporting
                PermissionType.API_READ_ACCESS,
            ],
            # ENGINEER: Engineering access with operational capabilities
            SystemRole.ENGINEER: [
                PermissionType.VIEW_USERS,
                PermissionType.VIEW_TEAMS,
                PermissionType.VIEW_PROJECTS,
                PermissionType.VIEW_INFRASTRUCTURE,
                PermissionType.VIEW_PIPELINES,
                PermissionType.TRIGGER_PIPELINES,
                PermissionType.VIEW_AUTOMATION,
                PermissionType.TRIGGER_AUTOMATION,
                PermissionType.VIEW_ALERTS,
                PermissionType.ACKNOWLEDGE_ALERTS,
                PermissionType.VIEW_COSTS,
                # Engineering-specific DevOps access
                PermissionType.DEPLOYMENT_MANAGEMENT,
                PermissionType.LOG_ACCESS,
                # API read access
                PermissionType.API_READ_ACCESS,
            ],
            # VIEWER: Read-only access across the platform
            SystemRole.VIEWER: [
                PermissionType.VIEW_USERS,
                PermissionType.VIEW_TEAMS,
                PermissionType.VIEW_PROJECTS,
                PermissionType.VIEW_INFRASTRUCTURE,
                PermissionType.VIEW_PIPELINES,
                PermissionType.VIEW_AUTOMATION,
                PermissionType.VIEW_ALERTS,
                PermissionType.VIEW_COSTS,
                PermissionType.VIEW_ROLES,
                PermissionType.VIEW_ORG_SETTINGS,
                # Read-only API access
                PermissionType.API_READ_ACCESS,
            ],
            # API_ONLY: Programmatic access for integrations and automation
            SystemRole.API_ONLY: [
                # Core API permissions for programmatic access
                PermissionType.API_READ_ACCESS,
                PermissionType.API_WRITE_ACCESS,
                PermissionType.WEBHOOK_MANAGEMENT,
                PermissionType.TOKEN_MANAGEMENT,
                # Limited viewing permissions for API data retrieval
                PermissionType.VIEW_PROJECTS,
                PermissionType.VIEW_INFRASTRUCTURE,
                PermissionType.VIEW_PIPELINES,
                PermissionType.VIEW_AUTOMATION,
                PermissionType.VIEW_ALERTS,
                PermissionType.VIEW_COSTS,
                # Operational permissions for automation
                PermissionType.TRIGGER_PIPELINES,
                PermissionType.TRIGGER_AUTOMATION,
                PermissionType.ACKNOWLEDGE_ALERTS,
                # DevOps operations for CI/CD integration
                PermissionType.DEPLOYMENT_MANAGEMENT,
                PermissionType.LOG_ACCESS,
            ],
        }

        return permission_sets.get(role_name, [])


class Permission(Base):
    """
    Permission model for granular access control.

    Defines specific permissions that can be assigned to roles
    to control access to system functionality. Permissions can be
    organization-scoped or system-wide.
    """

    __tablename__ = "permissions"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy support
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=True, index=True
    )

    # Permission identification
    name = Column(SQLEnum(PermissionType), index=True, nullable=False)
    display_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=False)  # Group permissions by category

    # Permission configuration
    is_active = Column(Boolean, default=True, nullable=False)
    is_system_permission = Column(
        Boolean, default=False, nullable=False
    )  # True for global permissions

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

    # Unique constraints
    __table_args__ = (
        # System permissions are unique globally, org permissions are unique per org
        UniqueConstraint("name", "organization_id", name="_permission_name_org_uc"),
    )

    # Relationships
    organization = relationship("Organization", back_populates="permissions")
    roles = relationship(
        "Role", secondary=role_permissions, back_populates="permissions"
    )
    user_permissions = relationship(
        "UserPermission", back_populates="permission", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        """String representation of Permission model."""
        org_suffix = (
            f" (org:{self.organization_id})" if self.organization_id else " (system)"
        )
        return f"<Permission(id={self.id}, name='{self.name}', display_name='{self.display_name}'{org_suffix})>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert permission model to dictionary for API responses."""
        return {
            "id": self.id,
            "organization_id": self.organization_id,
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "category": self.category,
            "is_active": self.is_active,
            "is_system_permission": self.is_system_permission,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @classmethod
    def get_permission_categories(cls) -> Dict[str, List[PermissionType]]:
        """Return permissions grouped by category for organization setup."""
        return {
            "Organization Management": [
                PermissionType.CREATE_ORGANIZATIONS,
                PermissionType.UPDATE_ORGANIZATIONS,
                PermissionType.DELETE_ORGANIZATIONS,
                PermissionType.VIEW_ALL_ORGANIZATIONS,
                PermissionType.MANAGE_ORG_SETTINGS,
                PermissionType.VIEW_ORG_SETTINGS,
                PermissionType.MANAGE_ORG_BILLING,
                PermissionType.VIEW_ORG_BILLING,
            ],
            "User Management": [
                PermissionType.CREATE_USERS,
                PermissionType.UPDATE_USERS,
                PermissionType.DELETE_USERS,
                PermissionType.VIEW_USERS,
                PermissionType.INVITE_USERS,
            ],
            "Team Management": [
                PermissionType.CREATE_TEAMS,
                PermissionType.UPDATE_TEAMS,
                PermissionType.DELETE_TEAMS,
                PermissionType.VIEW_TEAMS,
                PermissionType.MANAGE_TEAM_MEMBERS,
            ],
            "Project Management": [
                PermissionType.CREATE_PROJECTS,
                PermissionType.UPDATE_PROJECTS,
                PermissionType.DELETE_PROJECTS,
                PermissionType.VIEW_PROJECTS,
            ],
            "Infrastructure Management": [
                PermissionType.VIEW_INFRASTRUCTURE,
                PermissionType.MANAGE_INFRASTRUCTURE,
                PermissionType.DEPLOY_INFRASTRUCTURE,
            ],
            "Pipeline Management": [
                PermissionType.VIEW_PIPELINES,
                PermissionType.TRIGGER_PIPELINES,
                PermissionType.MANAGE_PIPELINES,
            ],
            "Automation Management": [
                PermissionType.VIEW_AUTOMATION,
                PermissionType.TRIGGER_AUTOMATION,
                PermissionType.MANAGE_AUTOMATION,
            ],
            "Alert Management": [
                PermissionType.VIEW_ALERTS,
                PermissionType.ACKNOWLEDGE_ALERTS,
                PermissionType.RESOLVE_ALERTS,
                PermissionType.MANAGE_ALERTS,
            ],
            "Cost Management": [
                PermissionType.VIEW_COSTS,
                PermissionType.MANAGE_COST_BUDGETS,
            ],
            "Role Management": [
                PermissionType.VIEW_ROLES,
                PermissionType.MANAGE_ROLES,
            ],
            "System Administration": [
                PermissionType.VIEW_SYSTEM_LOGS,
                PermissionType.MANAGE_SYSTEM_SETTINGS,
            ],
            "API Access Management": [
                PermissionType.API_READ_ACCESS,
                PermissionType.API_WRITE_ACCESS,
                PermissionType.API_ADMIN_ACCESS,
                PermissionType.WEBHOOK_MANAGEMENT,
                PermissionType.TOKEN_MANAGEMENT,
            ],
            "DevOps Operations": [
                PermissionType.CLUSTER_MANAGEMENT,
                PermissionType.DEPLOYMENT_MANAGEMENT,
                PermissionType.MONITORING_MANAGEMENT,
                PermissionType.LOG_ACCESS,
                PermissionType.SECURITY_SCANNING,
            ],
        }
