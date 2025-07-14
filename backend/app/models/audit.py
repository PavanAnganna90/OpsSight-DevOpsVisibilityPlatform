"""
Audit logging models for tracking database changes and user actions.

This module provides comprehensive audit trail functionality using SQLAlchemy
event listeners and database-level tracking for all CRUD operations.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    Index,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import TIMESTAMP, JSONB, UUID
from app.db.models import Base
from enum import Enum
import uuid
from typing import Optional, Dict, Any


class AuditOperation(str, Enum):
    """Enumeration of audit operations."""

    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    SELECT = "SELECT"  # For sensitive data access
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    PERMISSION_CHANGE = "PERMISSION_CHANGE"
    EXPORT = "EXPORT"  # Data export operations
    IMPORT = "IMPORT"  # Data import operations


class AuditSeverity(str, Enum):
    """Audit event severity levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AuditLogLegacy(Base):
    """
    Comprehensive audit log for tracking all database changes and user actions.

    This table captures detailed information about who made what changes when,
    providing complete audit trail for compliance and security monitoring.
    """

    __tablename__ = "audit_logs_legacy"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Unique audit event identifier
    audit_id = Column(
        UUID(as_uuid=True), default=uuid.uuid4, nullable=False, unique=True, index=True
    )

    # Multi-tenancy support
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=True, index=True
    )

    # Operation details
    operation = Column(SQLEnum(AuditOperation), nullable=False, index=True)
    table_name = Column(String(100), nullable=False, index=True)
    record_id = Column(
        String(50), nullable=True, index=True
    )  # ID of the affected record

    # Time tracking (using TimescaleDB partitioning)
    timestamp = Column(
        TIMESTAMP(timezone=True), default=func.now(), nullable=False, index=True
    )

    # User and session context
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    session_id = Column(String(128), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True)  # IPv6 compatible
    user_agent = Column(Text, nullable=True)

    # Change tracking
    old_values = Column(JSONB, nullable=True)  # Previous state
    new_values = Column(JSONB, nullable=True)  # New state
    changed_fields = Column(JSONB, nullable=True)  # List of changed field names

    # Metadata and context
    severity = Column(
        SQLEnum(AuditSeverity), default=AuditSeverity.LOW, nullable=False, index=True
    )
    category = Column(
        String(50), nullable=True, index=True
    )  # e.g., 'security', 'data', 'config'
    description = Column(Text, nullable=True)
    additional_context = Column(JSONB, nullable=True, default=lambda: {})

    # Request context
    request_id = Column(
        String(128), nullable=True, index=True
    )  # For request correlation
    correlation_id = Column(
        String(128), nullable=True, index=True
    )  # For process correlation
    api_endpoint = Column(String(200), nullable=True)
    http_method = Column(String(10), nullable=True)

    # Performance and debugging
    duration_ms = Column(Integer, nullable=True)  # Operation duration
    error_message = Column(Text, nullable=True)
    stack_trace = Column(Text, nullable=True)

    # Data classification and retention
    sensitivity_level = Column(
        String(20), nullable=True
    )  # public, internal, confidential, restricted
    retention_until = Column(
        TIMESTAMP(timezone=True), nullable=True
    )  # Data retention policy

    # Relationships
    # organization = relationship("Organization", back_populates="audit_logs_legacy")  # Disabled to avoid conflict
    # user = relationship("User", back_populates="audit_logs_legacy")  # Disabled to avoid conflict

    # Table arguments for optimization
    __table_args__ = (
        # Composite indexes for common query patterns
        Index("ix_audit_logs_org_time", "organization_id", "timestamp"),
        Index("ix_audit_logs_user_time", "user_id", "timestamp"),
        Index("ix_audit_logs_table_time", "table_name", "timestamp"),
        Index("ix_audit_logs_operation_time", "operation", "timestamp"),
        Index("ix_audit_logs_severity_time", "severity", "timestamp"),
        # Performance indexes for searching
        Index("ix_audit_logs_record_lookup", "table_name", "record_id"),
        Index("ix_audit_logs_session_tracking", "session_id", "timestamp"),
        Index("ix_audit_logs_correlation", "correlation_id", "timestamp"),
        # JSON field indexes for metadata searching
        Index(
            "ix_audit_logs_old_values_gin",
            "old_values",
            postgresql_using="gin",
            postgresql_ops={"old_values": "jsonb_path_ops"},
        ),
        Index(
            "ix_audit_logs_new_values_gin",
            "new_values",
            postgresql_using="gin",
            postgresql_ops={"new_values": "jsonb_path_ops"},
        ),
        Index(
            "ix_audit_logs_context_gin",
            "additional_context",
            postgresql_using="gin",
            postgresql_ops={"additional_context": "jsonb_path_ops"},
        ),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert audit log to dictionary representation."""
        return {
            "id": self.id,
            "audit_id": str(self.audit_id),
            "organization_id": self.organization_id,
            "operation": self.operation,
            "table_name": self.table_name,
            "record_id": self.record_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "ip_address": self.ip_address,
            "old_values": self.old_values or {},
            "new_values": self.new_values or {},
            "changed_fields": self.changed_fields or [],
            "severity": self.severity,
            "category": self.category,
            "description": self.description,
            "additional_context": self.additional_context or {},
            "request_id": self.request_id,
            "correlation_id": self.correlation_id,
            "api_endpoint": self.api_endpoint,
            "http_method": self.http_method,
            "duration_ms": self.duration_ms,
            "error_message": self.error_message,
            "sensitivity_level": self.sensitivity_level,
        }

    def __repr__(self) -> str:
        return (
            f"<AuditLogLegacy(id={self.id}, operation={self.operation}, "
            f"table={self.table_name}, user_id={self.user_id}, "
            f"timestamp={self.timestamp})>"
        )


class AuditConfiguration(Base):
    """
    Configuration for audit logging behavior per table/operation.

    Allows fine-grained control over what gets audited and how.
    """

    __tablename__ = "audit_configurations"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy support
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=True, index=True
    )

    # Configuration target
    table_name = Column(String(100), nullable=False, index=True)
    operation = Column(SQLEnum(AuditOperation), nullable=False, index=True)

    # Audit behavior settings
    is_enabled = Column(Boolean, default=True, nullable=False)
    include_old_values = Column(Boolean, default=True, nullable=False)
    include_new_values = Column(Boolean, default=True, nullable=False)

    # Field-level configuration
    excluded_fields = Column(
        JSONB, nullable=True, default=lambda: []
    )  # Fields to exclude
    sensitive_fields = Column(
        JSONB, nullable=True, default=lambda: []
    )  # Fields requiring masking
    required_fields = Column(
        JSONB, nullable=True, default=lambda: []
    )  # Fields that must be logged

    # Retention and storage settings
    retention_days = Column(Integer, nullable=True)  # Override default retention
    severity_override = Column(SQLEnum(AuditSeverity), nullable=True)
    category_override = Column(String(50), nullable=True)

    # Audit metadata
    created_at = Column(TIMESTAMP(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    organization = relationship("Organization")
    created_by_user = relationship("User")

    # Table arguments
    __table_args__ = (
        # Ensure unique configuration per org/table/operation
        Index(
            "ix_audit_config_unique",
            "organization_id",
            "table_name",
            "operation",
            unique=True,
        ),
        Index("ix_audit_config_lookup", "table_name", "operation"),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary representation."""
        return {
            "id": self.id,
            "organization_id": self.organization_id,
            "table_name": self.table_name,
            "operation": self.operation,
            "is_enabled": self.is_enabled,
            "include_old_values": self.include_old_values,
            "include_new_values": self.include_new_values,
            "excluded_fields": self.excluded_fields or [],
            "sensitive_fields": self.sensitive_fields or [],
            "required_fields": self.required_fields or [],
            "retention_days": self.retention_days,
            "severity_override": self.severity_override,
            "category_override": self.category_override,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return (
            f"<AuditConfiguration(id={self.id}, table={self.table_name}, "
            f"operation={self.operation}, enabled={self.is_enabled})>"
        )
