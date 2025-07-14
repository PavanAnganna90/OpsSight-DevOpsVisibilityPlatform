#!/usr/bin/env python3
"""
OpsSight Database Migration Script

This script handles data migration for the enhanced database schema including:
- Multi-tenancy migration
- RBAC data migration  
- Time-series data migration
- Audit logging setup

Usage:
    python scripts/migration/data_migration.py --environment [staging|production]
    python scripts/migration/data_migration.py --dry-run
    python scripts/migration/data_migration.py --rollback
"""

import argparse
import sys
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from pathlib import Path

# Add the backend app to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import text, create_engine, MetaData, Table
from sqlalchemy.orm import sessionmaker
from app.core.database import get_engine, SessionLocal
from app.models import *
from app.services.audit_service import AuditService
from app.core.audit import setup_audit_context


logger = logging.getLogger(__name__)


class DataMigrationManager:
    """
    Manages data migration for OpsSight database schema enhancements.
    
    Handles:
    - Organization data migration
    - User account migration with RBAC
    - Time-series data structure setup
    - Audit logging initialization
    """
    
    def __init__(self, environment: str = "staging", dry_run: bool = False):
        """
        Initialize migration manager.
        
        Args:
            environment: Target environment (staging/production)
            dry_run: If True, simulate migration without making changes
        """
        self.environment = environment
        self.dry_run = dry_run
        self.engine = get_engine()
        self.SessionLocal = SessionLocal
        self.audit_service = AuditService()
        
        # Setup logging
        self._setup_logging()
        
        # Migration state tracking
        self.migration_log = []
        self.errors = []
        
    def _setup_logging(self):
        """Configure logging for migration process."""
        log_level = logging.DEBUG if self.dry_run else logging.INFO
        
        logging.basicConfig(
            level=log_level,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(f'migration_{self.environment}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
                logging.StreamHandler(sys.stdout)
            ]
        )
        
    def execute_migration(self) -> bool:
        """
        Execute the complete data migration process.
        
        Returns:
            bool: True if migration successful, False otherwise
        """
        logger.info(f"Starting data migration for {self.environment} environment")
        logger.info(f"Dry run mode: {self.dry_run}")
        
        try:
            # Pre-migration validation
            if not self._validate_pre_migration():
                logger.error("Pre-migration validation failed")
                return False
                
            # Migration steps
            migration_steps = [
                ("Migrate organization data", self._migrate_organizations),
                ("Migrate user accounts with RBAC", self._migrate_users_rbac),
                ("Setup time-series data structures", self._setup_time_series),
                ("Initialize audit logging", self._initialize_audit_logging),
                ("Validate data integrity", self._validate_post_migration),
            ]
            
            for step_name, step_func in migration_steps:
                logger.info(f"Executing: {step_name}")
                if not step_func():
                    logger.error(f"Migration step failed: {step_name}")
                    return False
                logger.info(f"Completed: {step_name}")
                
            logger.info("Data migration completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Migration failed with error: {str(e)}")
            self.errors.append(str(e))
            return False
            
    def _validate_pre_migration(self) -> bool:
        """
        Validate database state before migration.
        
        Returns:
            bool: True if validation passes
        """
        logger.info("Validating pre-migration state")
        
        with self.SessionLocal() as session:
            try:
                # Check if schema migrations are applied
                result = session.execute(text("SELECT version_num FROM alembic_version"))
                current_version = result.scalar()
                
                if current_version != "80bd6a3c3fa1":
                    logger.error(f"Schema not at expected version. Current: {current_version}")
                    return False
                    
                # Check for existing data
                org_count = session.execute(text("SELECT COUNT(*) FROM organizations")).scalar()
                user_count = session.execute(text("SELECT COUNT(*) FROM users")).scalar()
                
                logger.info(f"Found {org_count} organizations, {user_count} users")
                
                # Validate table structure
                tables_to_check = [
                    'organizations', 'users', 'roles', 'permissions', 
                    'metrics', 'log_entries', 'audit_logs'
                ]
                
                for table_name in tables_to_check:
                    result = session.execute(text(f"""
                        SELECT COUNT(*) FROM information_schema.tables 
                        WHERE table_name = '{table_name}'
                    """))
                    if result.scalar() == 0:
                        logger.error(f"Required table missing: {table_name}")
                        return False
                        
                return True
                
            except Exception as e:
                logger.error(f"Pre-migration validation error: {str(e)}")
                return False
                
    def _migrate_organizations(self) -> bool:
        """
        Migrate organization data for multi-tenancy.
        
        Returns:
            bool: True if successful
        """
        logger.info("Migrating organization data")
        
        if self.dry_run:
            logger.info("DRY RUN: Would migrate organization data")
            return True
            
        with self.SessionLocal() as session:
            try:
                # Check for default organization
                default_org = session.query(Organization).filter_by(name="Default Organization").first()
                
                if not default_org:
                    # Create default organization for existing data
                    default_org = Organization(
                        name="Default Organization",
                        description="Default organization for migrated data",
                        settings={
                            "timezone": "UTC",
                            "default_retention_days": 90,
                            "audit_enabled": True
                        },
                        created_by_id=1,  # Assume admin user exists
                        updated_by_id=1
                    )
                    session.add(default_org)
                    session.commit()
                    logger.info(f"Created default organization with ID: {default_org.id}")
                
                # Update any orphaned data to belong to default organization
                orphaned_users = session.execute(text("""
                    UPDATE users SET organization_id = :org_id 
                    WHERE organization_id IS NULL
                """), {"org_id": default_org.id})
                
                logger.info(f"Updated {orphaned_users.rowcount} orphaned users")
                
                session.commit()
                return True
                
            except Exception as e:
                session.rollback()
                logger.error(f"Organization migration error: {str(e)}")
                return False
                
    def _migrate_users_rbac(self) -> bool:
        """
        Migrate user accounts with RBAC setup.
        
        Returns:
            bool: True if successful
        """
        logger.info("Migrating users with RBAC")
        
        if self.dry_run:
            logger.info("DRY RUN: Would migrate user RBAC data")
            return True
            
        with self.SessionLocal() as session:
            try:
                # Ensure default roles exist
                default_roles = [
                    ("Admin", "Full system access", ["*"]),
                    ("DevOps Engineer", "DevOps operations", ["cluster:*", "deployment:*", "monitor:read"]),
                    ("Developer", "Development access", ["project:read", "deployment:read", "logs:read"]),
                    ("Viewer", "Read-only access", ["*:read"])
                ]
                
                role_map = {}
                for role_name, description, permissions in default_roles:
                    role = session.query(Role).filter_by(name=role_name).first()
                    if not role:
                        role = Role(
                            name=role_name,
                            description=description,
                            permissions=permissions
                        )
                        session.add(role)
                        session.flush()
                        
                    role_map[role_name] = role.id
                    
                # Assign default roles to existing users
                users_without_roles = session.execute(text("""
                    SELECT u.id, u.email FROM users u 
                    LEFT JOIN user_roles ur ON u.id = ur.user_id 
                    WHERE ur.user_id IS NULL
                """)).fetchall()
                
                for user_id, email in users_without_roles:
                    # Assign Viewer role by default, Admin for first user
                    default_role = "Admin" if user_id == 1 else "Viewer"
                    
                    session.execute(text("""
                        INSERT INTO user_roles (user_id, role_id) 
                        VALUES (:user_id, :role_id)
                    """), {"user_id": user_id, "role_id": role_map[default_role]})
                    
                logger.info(f"Assigned roles to {len(users_without_roles)} users")
                
                session.commit()
                return True
                
            except Exception as e:
                session.rollback()
                logger.error(f"User RBAC migration error: {str(e)}")
                return False
                
    def _setup_time_series(self) -> bool:
        """
        Setup time-series data structures and hypertables.
        
        Returns:
            bool: True if successful
        """
        logger.info("Setting up time-series data structures")
        
        if self.dry_run:
            logger.info("DRY RUN: Would setup time-series structures")
            return True
            
        with self.SessionLocal() as session:
            try:
                # Enable TimescaleDB extension if not already enabled
                session.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE"))
                
                # Convert metrics table to hypertable if not already
                try:
                    session.execute(text("""
                        SELECT create_hypertable('metrics', 'timestamp', 
                                                if_not_exists => TRUE)
                    """))
                    logger.info("Created hypertable for metrics")
                except Exception as e:
                    logger.warning(f"Hypertable creation skipped (may already exist): {str(e)}")
                
                # Convert log_entries table to hypertable if not already  
                try:
                    session.execute(text("""
                        SELECT create_hypertable('log_entries', 'timestamp', 
                                                if_not_exists => TRUE)
                    """))
                    logger.info("Created hypertable for log_entries")
                except Exception as e:
                    logger.warning(f"Hypertable creation skipped (may already exist): {str(e)}")
                
                # Setup compression policies
                compression_policies = [
                    ("metrics", "7 days"),
                    ("log_entries", "3 days")
                ]
                
                for table, interval in compression_policies:
                    try:
                        session.execute(text(f"""
                            SELECT add_compression_policy('{table}', INTERVAL '{interval}')
                        """))
                        logger.info(f"Added compression policy for {table}")
                    except Exception as e:
                        logger.warning(f"Compression policy skipped for {table}: {str(e)}")
                
                session.commit()
                return True
                
            except Exception as e:
                session.rollback()
                logger.error(f"Time-series setup error: {str(e)}")
                return False
                
    def _initialize_audit_logging(self) -> bool:
        """
        Initialize audit logging system.
        
        Returns:
            bool: True if successful
        """
        logger.info("Initializing audit logging system")
        
        if self.dry_run:
            logger.info("DRY RUN: Would initialize audit logging")
            return True
            
        with self.SessionLocal() as session:
            try:
                # Setup audit context for migration
                setup_audit_context(system_operation="data_migration")
                
                # Create default audit configuration
                default_org = session.query(Organization).first()
                if default_org:
                    audit_config = AuditConfiguration(
                        organization_id=default_org.id,
                        table_name="*",  # All tables
                        operations=["INSERT", "UPDATE", "DELETE"],
                        enabled=True,
                        retention_days=365
                    )
                    session.add(audit_config)
                
                # Log migration completion
                migration_log = AuditLog(
                    table_name="system",
                    operation="MIGRATION",
                    user_id=1,  # System user
                    organization_id=default_org.id if default_org else None,
                    old_values={},
                    new_values={"migration_type": "data_migration", "status": "completed"},
                    context_data={"environment": self.environment},
                    severity="INFO"
                )
                session.add(migration_log)
                
                session.commit()
                logger.info("Audit logging system initialized")
                return True
                
            except Exception as e:
                session.rollback()
                logger.error(f"Audit logging initialization error: {str(e)}")
                return False
                
    def _validate_post_migration(self) -> bool:
        """
        Validate data integrity after migration.
        
        Returns:
            bool: True if validation passes
        """
        logger.info("Validating post-migration data integrity")
        
        with self.SessionLocal() as session:
            try:
                # Check organization integrity
                org_count = session.query(Organization).count()
                user_count = session.query(User).count()
                role_count = session.query(Role).count()
                
                logger.info(f"Post-migration counts: {org_count} orgs, {user_count} users, {role_count} roles")
                
                # Validate foreign key relationships
                orphaned_users = session.execute(text("""
                    SELECT COUNT(*) FROM users u 
                    LEFT JOIN organizations o ON u.organization_id = o.id 
                    WHERE u.organization_id IS NOT NULL AND o.id IS NULL
                """)).scalar()
                
                if orphaned_users > 0:
                    logger.error(f"Found {orphaned_users} orphaned users")
                    return False
                
                # Validate RBAC assignments
                users_without_roles = session.execute(text("""
                    SELECT COUNT(*) FROM users u 
                    LEFT JOIN user_roles ur ON u.id = ur.user_id 
                    WHERE ur.user_id IS NULL
                """)).scalar()
                
                if users_without_roles > 0:
                    logger.warning(f"Found {users_without_roles} users without roles")
                
                # Validate time-series tables
                for table in ['metrics', 'log_entries']:
                    try:
                        hypertable_check = session.execute(text(f"""
                            SELECT * FROM timescaledb_information.hypertables 
                            WHERE hypertable_name = '{table}'
                        """)).fetchone()
                        
                        if hypertable_check:
                            logger.info(f"Confirmed {table} is a hypertable")
                        else:
                            logger.warning(f"Table {table} is not a hypertable")
                    except Exception as e:
                        logger.warning(f"Could not verify hypertable status for {table}: {str(e)}")
                
                logger.info("Post-migration validation completed")
                return True
                
            except Exception as e:
                logger.error(f"Post-migration validation error: {str(e)}")
                return False


def main():
    """Main migration script entry point."""
    parser = argparse.ArgumentParser(description="OpsSight Database Migration")
    parser.add_argument(
        "--environment", 
        choices=["staging", "production"], 
        default="staging",
        help="Target environment"
    )
    parser.add_argument(
        "--dry-run", 
        action="store_true", 
        help="Simulate migration without making changes"
    )
    parser.add_argument(
        "--rollback", 
        action="store_true", 
        help="Execute rollback procedures"
    )
    
    args = parser.parse_args()
    
    if args.rollback:
        logger.info("Rollback procedures not implemented in this script")
        logger.info("Please use scripts/rollback/rollback_procedures.py")
        return 1
    
    # Initialize migration manager
    migration_manager = DataMigrationManager(
        environment=args.environment,
        dry_run=args.dry_run
    )
    
    # Execute migration
    success = migration_manager.execute_migration()
    
    if success:
        logger.info("Migration completed successfully")
        return 0
    else:
        logger.error("Migration failed")
        return 1


if __name__ == "__main__":
    sys.exit(main()) 