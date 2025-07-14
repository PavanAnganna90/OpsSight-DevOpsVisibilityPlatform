"""
Project model for project organization and settings.
Stores project information, configurations, and relationships.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from typing import Optional, Dict, Any
import json

from app.db.models import Base


class Project(Base):
    """
    Project model for organizing DevOps resources and teams.

    Stores project information, settings, and serves as the central
    organizing entity for pipelines, clusters, and other resources.
    """

    __tablename__ = "projects"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy support
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False, index=True
    )

    # Project identification
    name = Column(
        String, index=True, nullable=False
    )  # Removed unique constraint for multi-tenancy
    display_name = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    slug = Column(
        String, index=True, nullable=False
    )  # Removed unique constraint for multi-tenancy

    # Project settings
    is_active = Column(Boolean, default=True, nullable=False)
    is_public = Column(Boolean, default=False, nullable=False)

    # Repository information
    repository_url = Column(String, nullable=True)
    repository_provider = Column(String, nullable=True)  # github, gitlab, bitbucket
    default_branch = Column(String, default="main", nullable=False)

    # Configuration
    settings = Column(Text, nullable=True)  # JSON object for project settings
    environment_config = Column(
        Text, nullable=True
    )  # JSON object for environment configuration
    notification_config = Column(
        Text, nullable=True
    )  # JSON object for notification settings

    # Relationships
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
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
    organization = relationship("Organization", back_populates="projects")
    team = relationship("Team", back_populates="projects", foreign_keys=[team_id])
    created_by = relationship(
        "User", back_populates="created_projects", foreign_keys=[created_by_user_id]
    )

    # Related resources
    pipelines = relationship("Pipeline", back_populates="project")
    clusters = relationship("Cluster", back_populates="project")
    automation_runs = relationship("AutomationRun", back_populates="project")
    infrastructure_changes = relationship(
        "InfrastructureChange", back_populates="project"
    )
    alerts = relationship("Alert", back_populates="project")

    # Time-series data relationships
    metrics = relationship("Metric", back_populates="project")
    log_entries = relationship("LogEntry", back_populates="project")
    events = relationship("Event", back_populates="project")
    notification_preferences = relationship(
        "NotificationPreference", back_populates="project", cascade="all, delete-orphan"
    )
    notification_logs = relationship(
        "NotificationLog", back_populates="project", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        """String representation of Project model."""
        return f"<Project(id={self.id}, name='{self.name}', org_id={self.organization_id}, team='{self.team.name if self.team else None}')>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert project model to dictionary for API responses."""
        return {
            "id": self.id,
            "organization_id": self.organization_id,
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "slug": self.slug,
            "is_active": self.is_active,
            "is_public": self.is_public,
            "repository_url": self.repository_url,
            "repository_provider": self.repository_provider,
            "default_branch": self.default_branch,
            "settings": self.get_settings(),
            "environment_config": self.get_environment_config(),
            "notification_config": self.get_notification_config(),
            "team_id": self.team_id,
            "created_by_user_id": self.created_by_user_id,
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
        """Set project settings as JSON string."""
        self.settings = json.dumps(settings_dict) if settings_dict else None

    def get_environment_config(self) -> Optional[Dict[str, Any]]:
        """Parse environment_config JSON string to dictionary."""
        if self.environment_config:
            try:
                return json.loads(self.environment_config)
            except json.JSONDecodeError:
                return None
        return None

    def set_environment_config(self, config_dict: Dict[str, Any]) -> None:
        """Set environment configuration as JSON string."""
        self.environment_config = json.dumps(config_dict) if config_dict else None

    def get_notification_config(self) -> Optional[Dict[str, Any]]:
        """Parse notification_config JSON string to dictionary."""
        if self.notification_config:
            try:
                return json.loads(self.notification_config)
            except json.JSONDecodeError:
                return None
        return None

    def set_notification_config(self, config_dict: Dict[str, Any]) -> None:
        """Set notification configuration as JSON string."""
        self.notification_config = json.dumps(config_dict) if config_dict else None

    def get_resource_summary(self) -> Dict[str, Any]:
        """Get summary of project resources."""
        return {
            "pipelines": len(self.pipelines),
            "clusters": len(self.clusters),
            "automation_runs": len(self.automation_runs),
            "infrastructure_changes": len(self.infrastructure_changes),
            "active_alerts": len([alert for alert in self.alerts if alert.is_active()]),
        }

    def is_accessible_by_user(self, user_id: int) -> bool:
        """Check if a user has access to this project."""
        if self.is_public:
            return True

        # Check if user is a team member
        return self.team.is_member(user_id) if self.team else False

    def belongs_to_organization(self, organization_id: int) -> bool:
        """Check if project belongs to a specific organization."""
        return self.organization_id == organization_id

    @classmethod
    def create_slug(cls, name: str, organization_id: int) -> str:
        """Create a URL-safe slug from project name within organization context."""
        import re

        slug = name.lower().strip()
        slug = re.sub(r"[^a-z0-9\-_]", "-", slug)
        slug = re.sub(r"-+", "-", slug)
        slug = slug.strip("-")
        return slug[:100]  # Limit to 100 characters
