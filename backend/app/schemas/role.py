"""
Pydantic schemas for Role and Permission models.
Provides data validation and serialization for RBAC functionality.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

from app.models.role import SystemRole, PermissionType


# Permission Schemas
class PermissionBase(BaseModel):
    """Base schema for Permission model."""

    name: PermissionType
    display_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category: str = Field(..., min_length=1, max_length=50)
    is_active: bool = True


class PermissionCreate(PermissionBase):
    """Schema for creating a new permission."""

    pass


class PermissionUpdate(BaseModel):
    """Schema for updating a permission."""

    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    is_active: Optional[bool] = None


class Permission(PermissionBase):
    """Schema for Permission model responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class PermissionSummary(BaseModel):
    """Simplified permission schema for nested responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: PermissionType
    display_name: str
    category: str


# Role Schemas
class RoleBase(BaseModel):
    """Base schema for Role model."""

    name: SystemRole
    display_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_active: bool = True
    is_default: bool = False
    priority: int = Field(default=0, ge=0, le=100)


class RoleCreate(RoleBase):
    """Schema for creating a new role."""

    permission_ids: Optional[List[int]] = Field(default_factory=list)


class RoleUpdate(BaseModel):
    """Schema for updating a role."""

    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    priority: Optional[int] = Field(None, ge=0, le=100)
    permission_ids: Optional[List[int]] = None


class Role(RoleBase):
    """Schema for Role model responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    permissions: List[PermissionSummary] = Field(default_factory=list)
    user_count: int = 0
    created_at: datetime
    updated_at: datetime


class RoleSummary(BaseModel):
    """Simplified role schema for nested responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: SystemRole
    display_name: str
    priority: int


# Role Assignment Schemas
class RoleAssignment(BaseModel):
    """Schema for role assignment operations."""

    user_id: int = Field(..., gt=0)
    role_id: int = Field(..., gt=0)


class RoleAssignmentResponse(BaseModel):
    """Schema for role assignment response."""

    user_id: int
    role_id: int
    role_name: SystemRole
    assigned_at: datetime
    success: bool = True
    message: str = "Role assigned successfully"


# Permission Check Schemas
class PermissionCheck(BaseModel):
    """Schema for permission checking requests."""

    user_id: int = Field(..., gt=0)
    permission: PermissionType
    resource_id: Optional[int] = None
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)


class PermissionCheckResponse(BaseModel):
    """Schema for permission checking responses."""

    user_id: int
    permission: PermissionType
    has_permission: bool
    reason: Optional[str] = None
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)


# Bulk Operations Schemas
class BulkRoleAssignment(BaseModel):
    """Schema for bulk role assignment operations."""

    user_ids: List[int] = Field(..., min_length=1)
    role_id: int = Field(..., gt=0)


class BulkRoleAssignmentResponse(BaseModel):
    """Schema for bulk role assignment responses."""

    successful_assignments: List[RoleAssignmentResponse] = Field(default_factory=list)
    failed_assignments: List[Dict[str, Any]] = Field(default_factory=list)
    total_processed: int
    success_count: int
    failure_count: int


class BulkPermissionUpdate(BaseModel):
    """Schema for bulk permission updates to roles."""

    role_id: int = Field(..., gt=0)
    add_permission_ids: Optional[List[int]] = Field(default_factory=list)
    remove_permission_ids: Optional[List[int]] = Field(default_factory=list)


# System Role Management Schemas
class SystemRoleInfo(BaseModel):
    """Schema for system role information."""

    role: SystemRole
    display_name: str
    description: str
    default_permissions: List[PermissionType]
    priority: int


class SystemRoleSetup(BaseModel):
    """Schema for setting up default system roles."""

    create_default_roles: bool = True
    create_default_permissions: bool = True
    assign_super_admin: Optional[int] = None  # User ID to assign super admin role


class RoleHierarchy(BaseModel):
    """Schema for role hierarchy information."""

    roles: List[Role]
    hierarchy: Dict[str, List[str]]  # Role name -> list of roles it can manage
    permission_matrix: Dict[str, List[str]]  # Role name -> list of permissions


# User Role Information Schemas
class UserRoleInfo(BaseModel):
    """Schema for user role information."""

    user_id: int
    role: Optional[RoleSummary] = None
    permissions: List[str] = Field(default_factory=list)
    is_superuser: bool = False
    effective_permissions: List[str] = Field(
        default_factory=list
    )  # Includes superuser permissions


class UserRoleUpdate(BaseModel):
    """Schema for updating user role information."""

    role_id: Optional[int] = None
    is_superuser: Optional[bool] = None


# Statistics and Analytics Schemas
class RoleStatistics(BaseModel):
    """Schema for role usage statistics."""

    role_id: int
    role_name: SystemRole
    user_count: int
    permission_count: int
    last_assigned: Optional[datetime] = None
    most_common_permissions: List[str] = Field(default_factory=list)


class PermissionStatistics(BaseModel):
    """Schema for permission usage statistics."""

    permission_id: int
    permission_name: PermissionType
    role_count: int
    user_count: int  # Users who have this permission through their role
    category: str


class RBACAnalytics(BaseModel):
    """Schema for RBAC analytics and insights."""

    total_roles: int
    total_permissions: int
    total_users_with_roles: int
    role_distribution: Dict[str, int]  # Role name -> user count
    permission_coverage: Dict[str, int]  # Permission -> user count
    unused_permissions: List[str]
    over_privileged_users: List[int]  # Users with too many permissions
    under_privileged_users: List[int]  # Users with minimal permissions


# Aliases for endpoint compatibility
RoleResponse = Role
UserRoleAssignmentRequest = RoleAssignment
UserRoleAssignmentResponse = RoleAssignmentResponse
RolePermissionsResponse = Role  # Role already includes permissions
