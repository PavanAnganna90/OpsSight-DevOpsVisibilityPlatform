"""
OpsSight Database Layer - v2.0.0
Comprehensive data persistence with PostgreSQL

Features:
- SQLAlchemy ORM with async support
- Database migrations with Alembic
- Connection pooling and monitoring
- Multi-tenancy support
- Audit logging
- Data encryption for sensitive fields
- Performance monitoring and query optimization
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
import json
import uuid
from dataclasses import dataclass
from enum import Enum
import hashlib
import os

# Database imports
from sqlalchemy import (
    create_engine, Column, Integer, String, DateTime, Boolean, Text, 
    Float, JSON, ForeignKey, Index, UniqueConstraint, CheckConstraint,
    func, text, event
)
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker, selectinload
from sqlalchemy.dialects.postgresql import UUID, JSONB, ENUM
from sqlalchemy.sql import select, insert, update, delete
import asyncpg

# Encryption for sensitive data
from cryptography.fernet import Fernet
import bcrypt

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration - use DATABASE_URL from environment if available
if 'DATABASE_URL' in os.environ:
    DATABASE_URL = os.getenv('DATABASE_URL').replace('postgresql://', 'postgresql+asyncpg://')
else:
    # Fallback to individual environment variables
    DATABASE_CONFIG = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', '5432')),
        'database': os.getenv('DB_NAME', 'opssight'),
        'username': os.getenv('DB_USER', 'opssight'),
        'password': os.getenv('DB_PASSWORD', 'opssight123'),
    }
    DATABASE_URL = f"postgresql+asyncpg://{DATABASE_CONFIG['username']}:{DATABASE_CONFIG['password']}@{DATABASE_CONFIG['host']}:{DATABASE_CONFIG['port']}/{DATABASE_CONFIG['database']}"

# Connection pool configuration
DATABASE_POOL_CONFIG = {
    'pool_size': int(os.getenv('DB_POOL_SIZE', '20')),
    'max_overflow': int(os.getenv('DB_MAX_OVERFLOW', '30')),
    'pool_timeout': int(os.getenv('DB_POOL_TIMEOUT', '30')),
    'pool_recycle': int(os.getenv('DB_POOL_RECYCLE', '3600')),
}

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    pool_size=DATABASE_POOL_CONFIG['pool_size'],
    max_overflow=DATABASE_POOL_CONFIG['max_overflow'],
    pool_timeout=DATABASE_POOL_CONFIG['pool_timeout'],
    pool_recycle=DATABASE_POOL_CONFIG['pool_recycle'],
    echo=bool(os.getenv('DB_ECHO', False)),  # Set to True for SQL logging
    future=True
)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

# Base model
Base = declarative_base()

# Enums
class AlertSeverity(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class AlertStatus(Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"

class UserRole(Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    OPERATOR = "operator"
    VIEWER = "viewer"
    GUEST = "guest"

class ServiceStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"

class DeploymentStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"

# Database Models

class Organization(Base):
    """Multi-tenancy organization model"""
    __tablename__ = 'organizations'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    settings = Column(JSONB, default={})
    subscription_tier = Column(String(50), default='free')
    subscription_limits = Column(JSONB, default={})
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    is_active = Column(Boolean, default=True)
    
    # Relationships
    users = relationship("User", back_populates="organization")
    services = relationship("Service", back_populates="organization")
    alerts = relationship("Alert", back_populates="organization")
    deployments = relationship("Deployment", back_populates="organization")
    
    __table_args__ = (
        Index('idx_org_slug', 'slug'),
        Index('idx_org_active', 'is_active'),
    )

class User(Base):
    """User model with RBAC support"""
    __tablename__ = 'users'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    
    # Authentication
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255))  # For local auth
    
    # Profile
    first_name = Column(String(100))
    last_name = Column(String(100))
    avatar_url = Column(String(500))
    
    # Authorization
    role = Column(ENUM(UserRole), nullable=False, default=UserRole.VIEWER)
    permissions = Column(JSONB, default=[])
    
    # SSO Integration
    sso_provider = Column(String(50))
    sso_id = Column(String(255))
    
    # Session management
    last_login_at = Column(DateTime)
    last_active_at = Column(DateTime)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime)
    
    # Preferences
    preferences = Column(JSONB, default={})
    timezone = Column(String(50), default='UTC')
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    organization = relationship("Organization", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")
    
    __table_args__ = (
        Index('idx_user_org', 'organization_id'),
        Index('idx_user_email', 'email'),
        Index('idx_user_username', 'username'),
        Index('idx_user_sso', 'sso_provider', 'sso_id'),
        UniqueConstraint('organization_id', 'username', name='uq_org_username'),
    )

class Service(Base):
    """Service/component monitoring model"""
    __tablename__ = 'services'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    
    # Service identity
    name = Column(String(255), nullable=False)
    description = Column(Text)
    service_type = Column(String(100))  # web, database, cache, etc.
    environment = Column(String(50))  # production, staging, development
    
    # Configuration
    endpoints = Column(JSONB, default=[])
    health_check_url = Column(String(500))
    documentation_url = Column(String(500))
    repository_url = Column(String(500))
    
    # Status
    status = Column(ENUM(ServiceStatus), default=ServiceStatus.UNKNOWN)
    last_health_check = Column(DateTime)
    
    # Metadata
    tags = Column(JSONB, default={})
    labels = Column(JSONB, default={})
    dependencies = Column(JSONB, default=[])
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    organization = relationship("Organization", back_populates="services")
    metrics = relationship("Metric", back_populates="service")
    alerts = relationship("Alert", back_populates="service")
    deployments = relationship("Deployment", back_populates="service")
    
    __table_args__ = (
        Index('idx_service_org', 'organization_id'),
        Index('idx_service_status', 'status'),
        Index('idx_service_env', 'environment'),
        UniqueConstraint('organization_id', 'name', 'environment', name='uq_service_name_env'),
    )

class Metric(Base):
    """Time-series metrics storage"""
    __tablename__ = 'metrics'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    service_id = Column(UUID(as_uuid=True), ForeignKey('services.id'))
    
    # Metric identity
    name = Column(String(255), nullable=False)
    metric_type = Column(String(50))  # gauge, counter, histogram
    
    # Values
    value = Column(Float, nullable=False)
    unit = Column(String(50))
    
    # Dimensions/Labels
    dimensions = Column(JSONB, default={})
    
    # Timing
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    service = relationship("Service", back_populates="metrics")
    
    __table_args__ = (
        Index('idx_metric_org_time', 'organization_id', 'timestamp'),
        Index('idx_metric_service_time', 'service_id', 'timestamp'),
        Index('idx_metric_name_time', 'name', 'timestamp'),
        Index('idx_metric_timestamp', 'timestamp'),  # For time-based queries
    )

class Alert(Base):
    """Alert and incident management"""
    __tablename__ = 'alerts'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    service_id = Column(UUID(as_uuid=True), ForeignKey('services.id'))
    
    # Alert identity
    alert_id = Column(String(255), nullable=False)  # External alert ID
    title = Column(String(500), nullable=False)
    description = Column(Text)
    
    # Classification
    severity = Column(ENUM(AlertSeverity), nullable=False)
    status = Column(ENUM(AlertStatus), default=AlertStatus.ACTIVE)
    category = Column(String(100))  # security, performance, availability, etc.
    
    # Context
    source = Column(String(100))  # monitoring system that generated alert
    metric_name = Column(String(255))
    current_value = Column(Float)
    threshold_value = Column(Float)
    threshold_operator = Column(String(10))  # >, <, >=, <=, ==, !=
    
    # Timing
    first_seen = Column(DateTime, nullable=False, default=datetime.utcnow)
    last_seen = Column(DateTime, nullable=False, default=datetime.utcnow)
    acknowledged_at = Column(DateTime)
    resolved_at = Column(DateTime)
    
    # Assignment
    acknowledged_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    assigned_to = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Additional data
    alert_metadata = Column(JSONB, default={})
    runbook_url = Column(String(500))
    
    # Relationships
    organization = relationship("Organization", back_populates="alerts")
    service = relationship("Service", back_populates="alerts")
    
    __table_args__ = (
        Index('idx_alert_org_status', 'organization_id', 'status'),
        Index('idx_alert_service_status', 'service_id', 'status'),
        Index('idx_alert_severity', 'severity'),
        Index('idx_alert_first_seen', 'first_seen'),
        UniqueConstraint('organization_id', 'alert_id', name='uq_org_alert_id'),
    )

class Deployment(Base):
    """Deployment and release tracking"""
    __tablename__ = 'deployments'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    service_id = Column(UUID(as_uuid=True), ForeignKey('services.id'), nullable=False)
    
    # Deployment identity
    deployment_id = Column(String(255), nullable=False)
    version = Column(String(100), nullable=False)
    environment = Column(String(50), nullable=False)
    
    # Status
    status = Column(ENUM(DeploymentStatus), default=DeploymentStatus.PENDING)
    
    # Metadata
    source_commit = Column(String(255))
    source_branch = Column(String(255))
    source_repository = Column(String(500))
    release_notes = Column(Text)
    
    # Timing
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime)
    duration_seconds = Column(Integer)
    
    # User
    deployed_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Configuration
    configuration = Column(JSONB, default={})
    
    # Relationships
    organization = relationship("Organization", back_populates="deployments")
    service = relationship("Service", back_populates="deployments")
    
    __table_args__ = (
        Index('idx_deployment_org_service', 'organization_id', 'service_id'),
        Index('idx_deployment_status', 'status'),
        Index('idx_deployment_started', 'started_at'),
        UniqueConstraint('organization_id', 'deployment_id', name='uq_org_deployment_id'),
    )

class AuditLog(Base):
    """Comprehensive audit logging"""
    __tablename__ = 'audit_logs'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Event details
    event_type = Column(String(100), nullable=False)  # login, logout, create, update, delete
    resource_type = Column(String(100))  # user, service, alert, etc.
    resource_id = Column(String(255))
    
    # Action details
    action = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Context
    ip_address = Column(String(45))  # IPv6 compatible
    user_agent = Column(Text)
    session_id = Column(String(255))
    
    # Changes (for update operations)
    old_values = Column(JSONB)
    new_values = Column(JSONB)
    
    # Metadata
    audit_metadata = Column(JSONB, default={})
    
    # Timing
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    
    __table_args__ = (
        Index('idx_audit_org_time', 'organization_id', 'timestamp'),
        Index('idx_audit_user_time', 'user_id', 'timestamp'),
        Index('idx_audit_event_type', 'event_type'),
        Index('idx_audit_resource', 'resource_type', 'resource_id'),
    )

class Configuration(Base):
    """System configuration and feature flags"""
    __tablename__ = 'configurations'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'))
    
    # Configuration identity
    key = Column(String(255), nullable=False)
    value = Column(JSONB, nullable=False)
    description = Column(Text)
    
    # Type and validation
    config_type = Column(String(50))  # feature_flag, setting, secret
    is_encrypted = Column(Boolean, default=False)
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    __table_args__ = (
        Index('idx_config_org_key', 'organization_id', 'key'),
        Index('idx_config_key', 'key'),
        UniqueConstraint('organization_id', 'key', name='uq_org_config_key'),
    )

# Database Management Class
class DatabaseManager:
    """Database connection and session management"""
    
    def __init__(self):
        self.engine = engine
        self.session_factory = AsyncSessionLocal
        self._encryption_key = self._get_encryption_key()
        
    def _get_encryption_key(self) -> bytes:
        """Get or generate encryption key for sensitive data"""
        key_file = os.getenv('ENCRYPTION_KEY_FILE', '.encryption_key')
        
        if os.path.exists(key_file):
            with open(key_file, 'rb') as f:
                return f.read()
        else:
            # Generate new key
            key = Fernet.generate_key()
            with open(key_file, 'wb') as f:
                f.write(key)
            logger.info("Generated new encryption key")
            return key
    
    async def get_session(self) -> AsyncSession:
        """Get database session"""
        session = self.session_factory()
        try:
            yield session
        finally:
            await session.close()
    
    async def create_all_tables(self):
        """Create all database tables"""
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Created all database tables")
    
    async def drop_all_tables(self):
        """Drop all database tables (use with caution!)"""
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        logger.warning("Dropped all database tables")
    
    async def health_check(self) -> Dict[str, Any]:
        """Check database connectivity and performance"""
        try:
            start_time = datetime.utcnow()
            
            async with self.session_factory() as session:
                # Simple query to test connectivity
                result = await session.execute(text("SELECT 1"))
                await result.fetchone()
                
                # Get connection pool stats
                pool = self.engine.pool
                pool_stats = {
                    'size': pool.size(),
                    'checked_in': pool.checkedin(),
                    'checked_out': pool.checkedout(),
                    'overflow': pool.overflow(),
                    'invalid': pool.invalid()
                }
                
                response_time = (datetime.utcnow() - start_time).total_seconds()
                
                return {
                    'status': 'healthy',
                    'response_time_seconds': response_time,
                    'pool_stats': pool_stats,
                    'timestamp': datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def encrypt_sensitive_data(self, data: str) -> str:
        """Encrypt sensitive data like passwords"""
        fernet = Fernet(self._encryption_key)
        return fernet.encrypt(data.encode()).decode()
    
    def decrypt_sensitive_data(self, encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        fernet = Fernet(self._encryption_key)
        return fernet.decrypt(encrypted_data.encode()).decode()
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# Create global database manager instance
db_manager = DatabaseManager()

# Dependency function for FastAPI
async def get_db_session():
    """FastAPI dependency for database sessions"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Database initialization
async def init_database():
    """Initialize database with default data"""
    try:
        # Create tables
        await db_manager.create_all_tables()
        
        # Create default organization
        async with AsyncSessionLocal() as session:
            # Check if default org exists
            result = await session.execute(
                select(Organization).where(Organization.slug == 'default')
            )
            default_org = result.scalar_one_or_none()
            
            if not default_org:
                default_org = Organization(
                    name='Default Organization',
                    slug='default',
                    description='Default organization for OpsSight platform',
                    settings={
                        'max_users': 100,
                        'max_services': 50,
                        'retention_days': 90
                    }
                )
                session.add(default_org)
                await session.commit()
                await session.refresh(default_org)
                logger.info("Created default organization")
            
            # Create default admin user
            result = await session.execute(
                select(User).where(User.username == 'admin')
            )
            admin_user = result.scalar_one_or_none()
            
            if not admin_user:
                admin_user = User(
                    organization_id=default_org.id,
                    username='admin',
                    email='admin@opssight.local',
                    password_hash=db_manager.hash_password('admin123'),
                    first_name='Admin',
                    last_name='User',
                    role=UserRole.SUPER_ADMIN,
                    preferences={
                        'theme': 'dark',
                        'dashboard_refresh_interval': 30,
                        'notifications_enabled': True
                    }
                )
                session.add(admin_user)
                await session.commit()
                logger.info("Created default admin user")
        
        logger.info("Database initialization completed successfully")
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

if __name__ == "__main__":
    # Run database initialization
    asyncio.run(init_database())
    logger.info("Database setup complete!")