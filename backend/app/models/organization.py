"""
Organization model for multi-tenancy support.
Provides organization-level isolation and management for the platform.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from typing import Optional, Dict, Any, List
import json

from app.db.models import Base


class Organization(Base):
    """
    Organization model for multi-tenant architecture.

    Organizations provide the top-level boundary for data isolation
    and resource management in a multi-tenant environment.
    """

    __tablename__ = "organizations"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Organization identification
    name = Column(String(255), unique=True, index=True, nullable=False)
    slug = Column(
        String(100), unique=True, index=True, nullable=False
    )  # URL-friendly identifier
    display_name = Column(String(255), nullable=True)

    # Organization details
    description = Column(Text, nullable=True)
    website = Column(String(500), nullable=True)
    contact_email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)

    # Address information
    address_line1 = Column(String(255), nullable=True)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    country = Column(String(100), nullable=True)

    # Organization settings
    timezone = Column(String(50), default="UTC", nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    date_format = Column(String(20), default="YYYY-MM-DD", nullable=False)

    # Status and configuration
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    subscription_tier = Column(
        String(50), default="free", nullable=False
    )  # free, pro, enterprise

    # Limits and quotas
    max_users = Column(Integer, default=10, nullable=False)
    max_projects = Column(Integer, default=5, nullable=False)
    max_clusters = Column(Integer, default=3, nullable=False)
    storage_limit_gb = Column(Integer, default=10, nullable=False)

    # Billing information
    billing_email = Column(String(255), nullable=True)
    tax_id = Column(String(100), nullable=True)

    # Features and settings (JSON)
    features = Column(JSON, nullable=True, default=lambda: {})  # Feature flags
    settings = Column(
        JSON, nullable=True, default=lambda: {}
    )  # Organization-specific settings
    org_metadata = Column(
        JSON, nullable=True, default=lambda: {}
    )  # Additional metadata

    # Audit information
    created_by = Column(Integer, nullable=True)  # User ID who created the organization
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships - All tenant resources belong to an organization
    users = relationship(
        "User", back_populates="organization", cascade="all, delete-orphan"
    )
    teams = relationship(
        "Team", back_populates="organization", cascade="all, delete-orphan"
    )
    projects = relationship(
        "Project", back_populates="organization", cascade="all, delete-orphan"
    )
    clusters = relationship(
        "Cluster", back_populates="organization", cascade="all, delete-orphan"
    )
    aws_accounts = relationship(
        "AwsAccount", back_populates="organization", cascade="all, delete-orphan"
    )

    # RBAC relationships
    roles = relationship("Role", back_populates="organization")
    permissions = relationship("Permission", back_populates="organization")
    user_roles = relationship(
        "UserRole", back_populates="organization", cascade="all, delete-orphan"
    )

    # Time-series data relationships
    metrics = relationship(
        "Metric", back_populates="organization", cascade="all, delete-orphan"
    )
    log_entries = relationship(
        "LogEntry", back_populates="organization", cascade="all, delete-orphan"
    )
    events = relationship(
        "Event", back_populates="organization", cascade="all, delete-orphan"
    )

    # Audit relationships - Temporarily disabled due to AuditLog class naming conflict
    # audit_logs = relationship(
    #     "AuditLog", back_populates="organization", cascade="all, delete-orphan"
    # )

    def __repr__(self) -> str:
        """String representation of Organization model."""
        return f"<Organization(id={self.id}, name='{self.name}', slug='{self.slug}', active={self.is_active})>"

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert organization model to dictionary for API responses.

        Returns:
            dict: Organization data
        """
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "display_name": self.display_name,
            "description": self.description,
            "website": self.website,
            "contact_email": self.contact_email,
            "phone": self.phone,
            "address": {
                "line1": self.address_line1,
                "line2": self.address_line2,
                "city": self.city,
                "state": self.state,
                "postal_code": self.postal_code,
                "country": self.country,
            },
            "timezone": self.timezone,
            "currency": self.currency,
            "date_format": self.date_format,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "subscription_tier": self.subscription_tier,
            "limits": {
                "max_users": self.max_users,
                "max_projects": self.max_projects,
                "max_clusters": self.max_clusters,
                "storage_limit_gb": self.storage_limit_gb,
            },
            "billing_email": self.billing_email,
            "tax_id": self.tax_id,
            "features": self.get_features(),
            "settings": self.get_settings(),
            "metadata": self.get_metadata(),
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def get_features(self) -> Dict[str, Any]:
        """
        Get organization features as dictionary.

        Returns:
            dict: Feature flags and settings
        """
        if self.features:
            return (
                self.features
                if isinstance(self.features, dict)
                else json.loads(self.features)
            )
        return {}

    def set_features(self, features: Dict[str, Any]) -> None:
        """
        Set organization features from dictionary.

        Args:
            features: Feature flags and settings
        """
        self.features = features

    def get_settings(self) -> Dict[str, Any]:
        """
        Get organization settings as dictionary.

        Returns:
            dict: Organization-specific settings
        """
        if self.settings:
            return (
                self.settings
                if isinstance(self.settings, dict)
                else json.loads(self.settings)
            )
        return {}

    def set_settings(self, settings: Dict[str, Any]) -> None:
        """
        Set organization settings from dictionary.

        Args:
            settings: Organization-specific settings
        """
        self.settings = settings

    def get_metadata(self) -> Dict[str, Any]:
        """
        Get organization metadata as dictionary.

        Returns:
            dict: Additional metadata
        """
        if self.org_metadata:
            return (
                self.org_metadata
                if isinstance(self.org_metadata, dict)
                else json.loads(self.org_metadata)
            )
        return {}

    def set_metadata(self, metadata: Dict[str, Any]) -> None:
        """
        Set organization metadata from dictionary.

        Args:
            metadata: Additional metadata
        """
        self.org_metadata = metadata

    def is_feature_enabled(self, feature_name: str) -> bool:
        """
        Check if a feature is enabled for this organization.

        Args:
            feature_name: Name of the feature to check

        Returns:
            bool: True if feature is enabled
        """
        features = self.get_features()
        return features.get(feature_name, False)

    def enable_feature(self, feature_name: str) -> None:
        """
        Enable a feature for this organization.

        Args:
            feature_name: Name of the feature to enable
        """
        features = self.get_features()
        features[feature_name] = True
        self.set_features(features)

    def disable_feature(self, feature_name: str) -> None:
        """
        Disable a feature for this organization.

        Args:
            feature_name: Name of the feature to disable
        """
        features = self.get_features()
        features[feature_name] = False
        self.set_features(features)

    def check_user_limit(self) -> bool:
        """
        Check if organization can add more users.

        Returns:
            bool: True if under user limit
        """
        current_user_count = len(self.users) if self.users else 0
        return current_user_count < self.max_users

    def check_project_limit(self) -> bool:
        """
        Check if organization can add more projects.

        Returns:
            bool: True if under project limit
        """
        current_project_count = len(self.projects) if self.projects else 0
        return current_project_count < self.max_projects

    def check_cluster_limit(self) -> bool:
        """
        Check if organization can add more clusters.

        Returns:
            bool: True if under cluster limit
        """
        current_cluster_count = len(self.clusters) if self.clusters else 0
        return current_cluster_count < self.max_clusters

    def get_resource_usage(self) -> Dict[str, Any]:
        """
        Get current resource usage statistics.

        Returns:
            dict: Resource usage information
        """
        return {
            "users": {
                "current": len(self.users) if self.users else 0,
                "limit": self.max_users,
                "percentage": (
                    (len(self.users) / self.max_users * 100)
                    if self.users and self.max_users > 0
                    else 0
                ),
            },
            "projects": {
                "current": len(self.projects) if self.projects else 0,
                "limit": self.max_projects,
                "percentage": (
                    (len(self.projects) / self.max_projects * 100)
                    if self.projects and self.max_projects > 0
                    else 0
                ),
            },
            "clusters": {
                "current": len(self.clusters) if self.clusters else 0,
                "limit": self.max_clusters,
                "percentage": (
                    (len(self.clusters) / self.max_clusters * 100)
                    if self.clusters and self.max_clusters > 0
                    else 0
                ),
            },
        }

    @classmethod
    def generate_slug(cls, name: str) -> str:
        """
        Generate a URL-friendly slug from organization name.

        Args:
            name: Organization name

        Returns:
            str: URL-friendly slug
        """
        import re

        # Convert to lowercase and replace spaces/special chars with hyphens
        slug = re.sub(r"[^\w\s-]", "", name.lower())
        slug = re.sub(r"[-\s]+", "-", slug).strip("-")
        return slug[:100]  # Limit to 100 characters
