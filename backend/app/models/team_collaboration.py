"""
Team Collaboration Models for cross-team resource sharing and collaboration.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum

from app.db.models import Base


class CollaborationType(str, Enum):
    """Types of team collaboration."""
    RESOURCE_SHARING = "resource_sharing"
    PROJECT_COLLABORATION = "project_collaboration"
    KNOWLEDGE_SHARING = "knowledge_sharing"
    MENTORING = "mentoring"
    CROSS_TRAINING = "cross_training"


class CollaborationStatus(str, Enum):
    """Status of collaboration requests."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TeamCollaboration(Base):
    """Model for tracking cross-team collaborations."""
    
    __tablename__ = "team_collaborations"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Teams involved
    requesting_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    target_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    
    # Collaboration details
    collaboration_type = Column(SQLEnum(CollaborationType), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Status and approval
    status = Column(SQLEnum(CollaborationStatus), nullable=False, default=CollaborationStatus.PENDING)
    requested_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timeline
    requested_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    
    # Collaboration metadata
    metadata = Column(JSON, nullable=True)
    shared_resources = Column(JSON, nullable=True)  # List of resource IDs/types being shared
    collaboration_goals = Column(JSON, nullable=True)  # Goals and objectives
    success_metrics = Column(JSON, nullable=True)  # How to measure success
    
    # Relationships
    requesting_team = relationship("Team", foreign_keys=[requesting_team_id])
    target_team = relationship("Team", foreign_keys=[target_team_id])
    requested_by = relationship("User", foreign_keys=[requested_by_user_id])
    approved_by = relationship("User", foreign_keys=[approved_by_user_id])
    
    def __repr__(self):
        return f"<TeamCollaboration(id={self.id}, type={self.collaboration_type}, status={self.status})>"


class SharedResource(Base):
    """Model for tracking resources shared between teams."""
    
    __tablename__ = "shared_resources"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Collaboration reference
    collaboration_id = Column(Integer, ForeignKey("team_collaborations.id"), nullable=False, index=True)
    
    # Resource details
    resource_type = Column(String(50), nullable=False)  # project, cluster, service, knowledge_base, etc.
    resource_id = Column(String(100), nullable=False)
    resource_name = Column(String(200), nullable=False)
    
    # Sharing permissions
    permissions = Column(JSON, nullable=False)  # read, write, admin, etc.
    access_level = Column(String(20), nullable=False, default="read")  # read, write, admin
    
    # Timeline
    shared_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Status
    is_active = Column(Boolean, nullable=False, default=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoked_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Usage tracking
    access_count = Column(Integer, nullable=False, default=0)
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)
    last_accessed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    collaboration = relationship("TeamCollaboration", back_populates="shared_resources_list")
    revoked_by = relationship("User", foreign_keys=[revoked_by_user_id])
    last_accessed_by = relationship("User", foreign_keys=[last_accessed_by_user_id])
    
    def __repr__(self):
        return f"<SharedResource(id={self.id}, type={self.resource_type}, active={self.is_active})>"


class CollaborationActivity(Base):
    """Model for tracking collaboration activities and communications."""
    
    __tablename__ = "collaboration_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Collaboration reference
    collaboration_id = Column(Integer, ForeignKey("team_collaborations.id"), nullable=False, index=True)
    
    # Activity details
    activity_type = Column(String(50), nullable=False)  # message, file_share, meeting, milestone, etc.
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # User and team context
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    
    # Metadata
    metadata = Column(JSON, nullable=True)
    attachments = Column(JSON, nullable=True)  # File attachments or links
    
    # Timeline
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Visibility
    is_public = Column(Boolean, nullable=False, default=True)  # Visible to both teams
    is_milestone = Column(Boolean, nullable=False, default=False)
    
    # Relationships
    collaboration = relationship("TeamCollaboration")
    user = relationship("User")
    team = relationship("Team")
    
    def __repr__(self):
        return f"<CollaborationActivity(id={self.id}, type={self.activity_type}, collaboration_id={self.collaboration_id})>"


class TeamCollaborationTemplate(Base):
    """Templates for common collaboration types."""
    
    __tablename__ = "team_collaboration_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Template details
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    collaboration_type = Column(SQLEnum(CollaborationType), nullable=False)
    
    # Template configuration
    template_config = Column(JSON, nullable=False)  # Default settings, required fields, etc.
    default_duration_days = Column(Integer, nullable=True)
    required_permissions = Column(JSON, nullable=True)
    
    # Usage and management
    is_active = Column(Boolean, nullable=False, default=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Usage statistics
    usage_count = Column(Integer, nullable=False, default=0)
    success_rate = Column(Integer, nullable=False, default=0)  # Percentage of successful collaborations
    
    # Relationships
    created_by = relationship("User")
    
    def __repr__(self):
        return f"<TeamCollaborationTemplate(id={self.id}, name={self.name}, type={self.collaboration_type})>"


# Update the TeamCollaboration model to include the relationship
TeamCollaboration.shared_resources_list = relationship("SharedResource", back_populates="collaboration", cascade="all, delete-orphan")