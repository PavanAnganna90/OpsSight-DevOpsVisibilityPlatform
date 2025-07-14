"""
Audit Log Models for comprehensive security and activity tracking.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from enum import Enum

from app.db.models import Base


class AuditEventType(str, Enum):
    """Audit event types for categorization."""
    # Authentication Events
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    SSO_LOGIN_SUCCESS = "sso_login_success"
    SSO_LOGIN_FAILED = "sso_login_failed"
    TOKEN_REFRESH = "token_refresh"
    PASSWORD_CHANGE = "password_change"
    
    # Authorization Events
    PERMISSION_GRANTED = "permission_granted"
    PERMISSION_DENIED = "permission_denied"
    ROLE_ASSIGNED = "role_assigned"
    ROLE_REVOKED = "role_revoked"
    
    # User Management Events
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DELETED = "user_deleted"
    USER_ACTIVATED = "user_activated"
    USER_DEACTIVATED = "user_deactivated"
    
    # Role Management Events
    ROLE_CREATED = "role_created"
    ROLE_UPDATED = "role_updated"
    ROLE_DELETED = "role_deleted"
    PERMISSION_CREATED = "permission_created"
    PERMISSION_UPDATED = "permission_updated"
    PERMISSION_DELETED = "permission_deleted"
    
    # Team Management Events
    TEAM_CREATED = "team_created"
    TEAM_UPDATED = "team_updated"
    TEAM_DELETED = "team_deleted"
    TEAM_MEMBER_ADDED = "team_member_added"
    TEAM_MEMBER_REMOVED = "team_member_removed"
    
    # Infrastructure Events
    CLUSTER_CREATED = "cluster_created"
    CLUSTER_UPDATED = "cluster_updated"
    CLUSTER_DELETED = "cluster_deleted"
    DEPLOYMENT_CREATED = "deployment_created"
    DEPLOYMENT_UPDATED = "deployment_updated"
    DEPLOYMENT_DELETED = "deployment_deleted"
    
    # Pipeline Events
    PIPELINE_CREATED = "pipeline_created"
    PIPELINE_UPDATED = "pipeline_updated"
    PIPELINE_DELETED = "pipeline_deleted"
    PIPELINE_EXECUTED = "pipeline_executed"
    PIPELINE_FAILED = "pipeline_failed"
    
    # System Events
    SYSTEM_CONFIG_CHANGED = "system_config_changed"
    BACKUP_CREATED = "backup_created"
    BACKUP_RESTORED = "backup_restored"
    SYSTEM_MAINTENANCE = "system_maintenance"
    
    # Security Events
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    SECURITY_VIOLATION = "security_violation"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    IP_BLOCKED = "ip_blocked"
    
    # Data Events
    DATA_EXPORT = "data_export"
    DATA_IMPORT = "data_import"
    DATA_DELETED = "data_deleted"
    SENSITIVE_DATA_ACCESS = "sensitive_data_access"


class AuditLogLevel(str, Enum):
    """Audit log severity levels."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AuditLog(Base):
    """Comprehensive audit log model."""
    
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Event Information
    event_type = Column(String(50), nullable=False, index=True)
    event_category = Column(String(30), nullable=False, index=True)
    level = Column(String(20), nullable=False, default=AuditLogLevel.INFO, index=True)
    message = Column(Text, nullable=False)
    
    # User Information
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    user_email = Column(String(255), nullable=True, index=True)
    user_name = Column(String(255), nullable=True)
    
    # Session Information
    session_id = Column(String(255), nullable=True, index=True)
    sso_provider = Column(String(50), nullable=True)
    
    # Request Information
    ip_address = Column(String(45), nullable=True, index=True)  # IPv6 support
    user_agent = Column(Text, nullable=True)
    request_id = Column(String(36), nullable=True, index=True)
    
    # Resource Information
    resource_type = Column(String(50), nullable=True, index=True)
    resource_id = Column(String(255), nullable=True, index=True)
    resource_name = Column(String(255), nullable=True)
    
    # Organization Context
    organization_id = Column(String(36), nullable=True, index=True)
    team_id = Column(String(36), nullable=True, index=True)
    
    # Additional Context
    event_metadata = Column(JSON, nullable=True)
    tags = Column(JSON, nullable=True)
    
    # Outcome Information
    success = Column(Boolean, nullable=False, default=True)
    error_code = Column(String(50), nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Timing Information
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    duration_ms = Column(Integer, nullable=True)
    
    # Compliance Fields
    compliance_tags = Column(JSON, nullable=True)
    retention_policy = Column(String(50), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_audit_user_timestamp', 'user_id', 'timestamp'),
        Index('idx_audit_event_timestamp', 'event_type', 'timestamp'),
        Index('idx_audit_org_timestamp', 'organization_id', 'timestamp'),
        Index('idx_audit_resource_timestamp', 'resource_type', 'resource_id', 'timestamp'),
        Index('idx_audit_ip_timestamp', 'ip_address', 'timestamp'),
        Index('idx_audit_level_timestamp', 'level', 'timestamp'),
        Index('idx_audit_success_timestamp', 'success', 'timestamp'),
    )
    
    def __repr__(self):
        return f"<AuditLog(id={self.id}, event_type={self.event_type}, user_id={self.user_id}, timestamp={self.timestamp})>"


class AuditLogRetentionPolicy(Base):
    """Audit log retention policies for different event types."""
    
    __tablename__ = "audit_log_retention_policies"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Policy Information
    policy_name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    
    # Event Matching
    event_types = Column(JSON, nullable=False)  # List of event types
    event_categories = Column(JSON, nullable=True)  # List of categories
    levels = Column(JSON, nullable=True)  # List of levels
    
    # Retention Settings
    retention_days = Column(Integer, nullable=False, default=2555)  # 7 years default
    archive_after_days = Column(Integer, nullable=True)
    compression_enabled = Column(Boolean, nullable=False, default=True)
    
    # Compliance Settings
    compliance_framework = Column(String(50), nullable=True)  # SOX, GDPR, etc.
    immutable = Column(Boolean, nullable=False, default=False)
    encryption_required = Column(Boolean, nullable=False, default=True)
    
    # Management
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<AuditLogRetentionPolicy(id={self.id}, policy_name={self.policy_name}, retention_days={self.retention_days})>"


class AuditLogAlert(Base):
    """Audit log alerts for security monitoring."""
    
    __tablename__ = "audit_log_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Alert Information
    alert_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), nullable=False, default="medium")
    
    # Trigger Conditions
    event_types = Column(JSON, nullable=True)
    event_pattern = Column(Text, nullable=True)  # SQL-like pattern
    threshold_count = Column(Integer, nullable=True)
    threshold_window_minutes = Column(Integer, nullable=True)
    
    # Filtering
    user_filter = Column(JSON, nullable=True)
    ip_filter = Column(JSON, nullable=True)
    resource_filter = Column(JSON, nullable=True)
    
    # Notification Settings
    notification_channels = Column(JSON, nullable=False)  # email, slack, webhook
    notification_template = Column(Text, nullable=True)
    
    # Management
    is_active = Column(Boolean, nullable=False, default=True)
    last_triggered = Column(DateTime, nullable=True)
    trigger_count = Column(Integer, nullable=False, default=0)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<AuditLogAlert(id={self.id}, alert_name={self.alert_name}, severity={self.severity})>"


class AuditLogArchive(Base):
    """Archived audit logs for long-term retention."""
    
    __tablename__ = "audit_log_archives"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Archive Information
    archive_name = Column(String(100), nullable=False)
    archive_path = Column(String(500), nullable=False)
    compression_type = Column(String(20), nullable=False, default="gzip")
    
    # Content Information
    start_date = Column(DateTime, nullable=False, index=True)
    end_date = Column(DateTime, nullable=False, index=True)
    record_count = Column(Integer, nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    
    # Metadata
    event_types = Column(JSON, nullable=True)
    checksum = Column(String(64), nullable=False)  # SHA-256
    encryption_key_id = Column(String(36), nullable=True)
    
    # Management
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    archived_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    def __repr__(self):
        return f"<AuditLogArchive(id={self.id}, archive_name={self.archive_name}, record_count={self.record_count})>"


class AuditLogQuery(Base):
    """Saved audit log queries for reporting and monitoring."""
    
    __tablename__ = "audit_log_queries"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Query Information
    query_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    query_sql = Column(Text, nullable=False)
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    shared = Column(Boolean, nullable=False, default=False)
    category = Column(String(50), nullable=True)
    
    # Usage Statistics
    execution_count = Column(Integer, nullable=False, default=0)
    last_executed = Column(DateTime, nullable=True)
    
    # Management
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships - Disabled due to missing back_populates property
    # creator = relationship("User", back_populates="audit_queries")
    
    def __repr__(self):
        return f"<AuditLogQuery(id={self.id}, query_name={self.query_name}, created_by={self.created_by})>"