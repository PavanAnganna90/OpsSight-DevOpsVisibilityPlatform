"""
Team Resource model for managing team-specific resource access and isolation.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, Enum as SQLEnum, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from typing import Optional, Dict, Any, List

from app.db.database import Base


class ResourceType(str, Enum):
    """Types of resources that can be shared with teams."""
    CLUSTER = "cluster"
    NAMESPACE = "namespace"
    DEPLOYMENT = "deployment"
    SERVICE = "service"
    PIPELINE = "pipeline"
    REPOSITORY = "repository"
    DATABASE = "database"
    BUCKET = "bucket"
    SECRET = "secret"
    CONFIG = "config"
    ALERT = "alert"
    DASHBOARD = "dashboard"
    CUSTOM = "custom"


class AccessLevel(str, Enum):
    """Access levels for team resources."""
    VIEWER = "viewer"
    USER = "user"
    EDITOR = "editor"
    ADMIN = "admin"
    OWNER = "owner"


class TeamResource(Base):
    """
    Model for team-specific resource access control.
    Implements multi-tenant resource isolation at the database level.
    """
    
    __tablename__ = "team_resources"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Team association
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Resource identification
    resource_type = Column(SQLEnum(ResourceType), nullable=False, index=True)
    resource_id = Column(String(255), nullable=False, index=True)
    resource_name = Column(String(255), nullable=False)
    resource_namespace = Column(String(255), nullable=True)  # For K8s resources
    
    # Access control
    access_level = Column(SQLEnum(AccessLevel), nullable=False, default=AccessLevel.VIEWER)
    permissions = Column(JSON, nullable=True)  # Fine-grained permissions
    
    # Resource metadata
    metadata = Column(JSON, nullable=True)  # Resource-specific metadata
    labels = Column(JSON, nullable=True)  # Key-value labels for filtering
    annotations = Column(JSON, nullable=True)  # Additional annotations
    
    # Sharing and collaboration
    shared_from_team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    shared_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    share_expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_shared = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    team = relationship("Team", foreign_keys=[team_id], backref="resources")
    shared_from_team = relationship("Team", foreign_keys=[shared_from_team_id])
    shared_by_user = relationship("User", backref="shared_resources")
    
    # Unique constraint to prevent duplicate resources per team
    __table_args__ = (
        UniqueConstraint('team_id', 'resource_type', 'resource_id', name='uq_team_resource'),
        Index('idx_team_resource_type', 'team_id', 'resource_type'),
        Index('idx_resource_active', 'is_active', 'team_id'),
        Index('idx_shared_resources', 'is_shared', 'shared_from_team_id'),
    )
    
    def __repr__(self) -> str:
        return f"<TeamResource(team_id={self.team_id}, type={self.resource_type}, id={self.resource_id})>"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "team_id": self.team_id,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "resource_name": self.resource_name,
            "resource_namespace": self.resource_namespace,
            "access_level": self.access_level,
            "permissions": self.permissions,
            "metadata": self.metadata,
            "labels": self.labels,
            "annotations": self.annotations,
            "is_shared": self.is_shared,
            "shared_from_team_id": self.shared_from_team_id,
            "share_expires_at": self.share_expires_at.isoformat() if self.share_expires_at else None,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_accessed_at": self.last_accessed_at.isoformat() if self.last_accessed_at else None,
        }
    
    def has_permission(self, permission: str) -> bool:
        """Check if resource has specific permission."""
        if not self.permissions:
            return False
        return permission in self.permissions.get("allowed", [])
    
    def can_access(self, user_role: str, action: str) -> bool:
        """Check if user with given role can perform action."""
        # Define access matrix
        access_matrix = {
            AccessLevel.VIEWER: ["read", "list"],
            AccessLevel.USER: ["read", "list", "use"],
            AccessLevel.EDITOR: ["read", "list", "use", "create", "update"],
            AccessLevel.ADMIN: ["read", "list", "use", "create", "update", "delete", "share"],
            AccessLevel.OWNER: ["read", "list", "use", "create", "update", "delete", "share", "transfer"]
        }
        
        allowed_actions = access_matrix.get(self.access_level, [])
        return action in allowed_actions
    
    def is_expired(self) -> bool:
        """Check if shared resource has expired."""
        if not self.share_expires_at:
            return False
        from datetime import datetime
        return datetime.utcnow() > self.share_expires_at.replace(tzinfo=None)


class TeamResourceActivity(Base):
    """
    Track activities on team resources for audit and analytics.
    """
    
    __tablename__ = "team_resource_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Resource reference
    team_resource_id = Column(Integer, ForeignKey("team_resources.id", ondelete="CASCADE"), nullable=False, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    
    # Activity details
    action = Column(String(50), nullable=False)  # create, read, update, delete, share, etc.
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_email = Column(String(255), nullable=True)
    
    # Activity metadata
    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Timestamp
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    team_resource = relationship("TeamResource", backref="activities")
    team = relationship("Team")
    user = relationship("User")
    
    __table_args__ = (
        Index('idx_team_activity_timestamp', 'team_id', 'timestamp'),
        Index('idx_resource_activity', 'team_resource_id', 'action'),
    )


class TeamDashboardConfig(Base):
    """
    Store team-specific dashboard configurations.
    """
    
    __tablename__ = "team_dashboard_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Team association
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Dashboard configuration
    layout = Column(JSON, nullable=True)  # Widget layout configuration
    widgets = Column(JSON, nullable=True)  # Enabled widgets and their settings
    theme = Column(JSON, nullable=True)  # Theme customization
    preferences = Column(JSON, nullable=True)  # User preferences
    
    # Default views
    default_view = Column(String(50), nullable=True)
    landing_page = Column(String(255), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    team = relationship("Team", backref="dashboard_config")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "team_id": self.team_id,
            "layout": self.layout,
            "widgets": self.widgets,
            "theme": self.theme,
            "preferences": self.preferences,
            "default_view": self.default_view,
            "landing_page": self.landing_page,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class TeamCollaboration(Base):
    """
    Manage cross-team collaboration and resource sharing requests.
    """
    
    __tablename__ = "team_collaborations"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Teams involved
    requesting_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    target_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    
    # Collaboration details
    collaboration_type = Column(String(50), nullable=False)  # resource_share, project_access, etc.
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(255), nullable=True)
    
    # Request details
    requested_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Status
    status = Column(String(20), nullable=False, default="pending")  # pending, approved, rejected, expired
    access_level = Column(SQLEnum(AccessLevel), nullable=True)
    
    # Validity
    valid_from = Column(DateTime(timezone=True), nullable=True)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    
    # Additional details
    request_message = Column(Text, nullable=True)
    approval_message = Column(Text, nullable=True)
    conditions = Column(JSON, nullable=True)  # Any conditions or restrictions
    
    # Timestamps
    requested_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    requesting_team = relationship("Team", foreign_keys=[requesting_team_id])
    target_team = relationship("Team", foreign_keys=[target_team_id])
    requested_by = relationship("User", foreign_keys=[requested_by_user_id])
    approved_by = relationship("User", foreign_keys=[approved_by_user_id])
    
    __table_args__ = (
        Index('idx_collaboration_status', 'status', 'requesting_team_id'),
        Index('idx_collaboration_teams', 'requesting_team_id', 'target_team_id'),
    )