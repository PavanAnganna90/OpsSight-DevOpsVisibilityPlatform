"""
Database models for OpsSight Platform
Production-ready models with proper relationships and constraints
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid
from .database import Base

class BaseModel(Base):
    """Base model with common fields"""
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Organization(BaseModel):
    """Organization/Company model"""
    __tablename__ = "organizations"
    
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    users = relationship("User", back_populates="organization")
    projects = relationship("Project", back_populates="organization")

class User(BaseModel):
    """User model with RBAC support"""
    __tablename__ = "users"
    
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    full_name = Column(String(255))
    avatar_url = Column(String(500))
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    
    # OAuth fields
    github_id = Column(String(100), unique=True, index=True)
    github_username = Column(String(100))
    
    # Organization relationship
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    organization = relationship("Organization", back_populates="users")
    
    # Relationships
    deployments = relationship("Deployment", back_populates="created_by_user")
    metrics = relationship("MetricRecord", back_populates="user")

class Project(BaseModel):
    """Project/Repository model"""
    __tablename__ = "projects"
    
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False, index=True)
    description = Column(Text)
    repository_url = Column(String(500))
    branch = Column(String(100), default="main")
    is_active = Column(Boolean, default=True)
    
    # Project settings
    config = Column(JSON, default={})
    
    # Organization relationship
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    organization = relationship("Organization", back_populates="projects")
    
    # Relationships
    deployments = relationship("Deployment", back_populates="project")
    environments = relationship("Environment", back_populates="project")

class Environment(BaseModel):
    """Environment model (dev, staging, prod)"""
    __tablename__ = "environments"
    
    name = Column(String(100), nullable=False)  # dev, staging, production
    slug = Column(String(100), nullable=False, index=True)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    
    # Environment configuration
    config = Column(JSON, default={})
    
    # Project relationship
    project_id = Column(Integer, ForeignKey("projects.id"))
    project = relationship("Project", back_populates="environments")
    
    # Relationships
    deployments = relationship("Deployment", back_populates="environment")

class Deployment(BaseModel):
    """Deployment model with status tracking"""
    __tablename__ = "deployments"
    
    version = Column(String(100), nullable=False)
    commit_sha = Column(String(40))
    commit_message = Column(Text)
    status = Column(String(50), default="pending")  # pending, running, success, failed
    
    # Deployment metadata
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    duration_seconds = Column(Integer)
    
    # Logs and output
    build_logs = Column(Text)
    deploy_logs = Column(Text)
    error_message = Column(Text)
    
    # Relationships
    project_id = Column(Integer, ForeignKey("projects.id"))
    project = relationship("Project", back_populates="deployments")
    
    environment_id = Column(Integer, ForeignKey("environments.id"))
    environment = relationship("Environment", back_populates="deployments")
    
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_by_user = relationship("User", back_populates="deployments")

class MetricRecord(BaseModel):
    """System metrics storage"""
    __tablename__ = "metric_records"
    
    metric_type = Column(String(100), nullable=False, index=True)  # cpu, memory, disk, etc.
    value = Column(Float, nullable=False)
    unit = Column(String(20))  # %, GB, count, etc.
    
    # Metadata
    source = Column(String(100))  # hostname, service name, etc.
    tags = Column(JSON, default={})  # Additional metadata
    
    # Optional user association
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user = relationship("User", back_populates="metrics")

class Alert(BaseModel):
    """Alert model for system notifications"""
    __tablename__ = "alerts"
    
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(50), default="info")  # info, warning, error, critical
    status = Column(String(50), default="active")  # active, acknowledged, resolved
    
    # Alert metadata
    source = Column(String(100))
    alert_type = Column(String(100))
    tags = Column(JSON, default={})
    
    # Timestamps
    triggered_at = Column(DateTime(timezone=True), default=func.now())
    acknowledged_at = Column(DateTime(timezone=True))
    resolved_at = Column(DateTime(timezone=True))

class PipelineRun(BaseModel):
    """CI/CD Pipeline execution tracking"""
    __tablename__ = "pipeline_runs"
    
    run_id = Column(String(100), unique=True, nullable=False, index=True)
    pipeline_name = Column(String(255), nullable=False)
    status = Column(String(50), default="running")  # running, success, failed, cancelled
    
    # Pipeline metadata
    trigger = Column(String(100))  # manual, webhook, schedule
    branch = Column(String(100))
    commit_sha = Column(String(40))
    
    # Execution details
    started_at = Column(DateTime(timezone=True), default=func.now())
    completed_at = Column(DateTime(timezone=True))
    duration_seconds = Column(Integer)
    
    # Results
    logs = Column(Text)
    artifacts = Column(JSON, default={})
    
    # Project relationship
    project_id = Column(Integer, ForeignKey("projects.id"))
    project = relationship("Project")

class SystemHealth(BaseModel):
    """System health check results"""
    __tablename__ = "system_health"
    
    service_name = Column(String(100), nullable=False, index=True)
    status = Column(String(50), nullable=False)  # healthy, degraded, unhealthy
    response_time_ms = Column(Float)
    
    # Health check details
    check_type = Column(String(100))  # http, database, redis, etc.
    endpoint = Column(String(500))
    error_message = Column(Text)
    
    # Health check metadata
    health_metadata = Column(JSON, default={})
    
    # Timestamp
    checked_at = Column(DateTime(timezone=True), default=func.now())