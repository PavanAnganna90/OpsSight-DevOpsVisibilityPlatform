#!/usr/bin/env python3
"""
OpsSight Database Rollback Procedures

This script provides rollback capabilities for the database migration, including:
- Schema rollback using Alembic
- Data rollback with backup restoration
- Point-in-time recovery procedures
- Transaction-based rollback

Usage:
    python scripts/rollback/rollback_procedures.py --type [schema|data|full]
    python scripts/rollback/rollback_procedures.py --to-revision [revision_id]
    python scripts/rollback/rollback_procedures.py --backup-file [backup_path]
"""

import argparse
import sys
import logging
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional, List

# Add the backend app to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from app.core.database import SessionLocal


logger = logging.getLogger(__name__)


class RollbackManager:
    """
    Manages rollback procedures for OpsSight database.
    
    Provides:
    - Schema-level rollback via Alembic
    - Data-level rollback via backup restoration
    - Point-in-time recovery
    - Transaction rollback utilities
    """
    
    def __init__(self, environment: str = "staging", dry_run: bool = False):
        """
        Initialize rollback manager.
        
        Args:
            environment: Target environment (staging/production)
            dry_run: If True, simulate rollback without making changes
        """
        self.environment = environment
        self.dry_run = dry_run
        self.SessionLocal = SessionLocal
        self._setup_logging()
        
    def _setup_logging(self):
        """Configure logging for rollback process."""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(f'rollback_{self.environment}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
                logging.StreamHandler(sys.stdout)
            ]
        )
        
    def schema_rollback(self, target_revision: str) -> bool:
        """
        Rollback database schema to a specific revision.
        
        Args:
            target_revision: Alembic revision ID to rollback to
            
        Returns:
            bool: True if rollback successful
        """
        logger.info(f"Starting schema rollback to revision: {target_revision}")
        
        if self.dry_run:
            logger.info("DRY RUN: Would execute schema rollback")
            return True
            
        try:
            # Validate target revision exists
            if not self._validate_revision(target_revision):
                logger.error(f"Invalid revision: {target_revision}")
                return False
                
            # Create backup before rollback
            backup_file = self._create_backup()
            if not backup_file:
                logger.error("Failed to create backup before rollback")
                return False
                
            logger.info(f"Created backup: {backup_file}")
            
            # Execute Alembic downgrade
            cmd = ["alembic", "downgrade", target_revision]
            
            logger.info(f"Executing: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error(f"Schema rollback failed: {result.stderr}")
                return False
                
            logger.info("Schema rollback completed successfully")
            logger.info(f"Backup available at: {backup_file}")
            return True
            
        except Exception as e:
            logger.error(f"Schema rollback error: {str(e)}")
            return False
            
    def data_rollback(self, backup_file: str) -> bool:
        """
        Rollback data from a backup file.
        
        Args:
            backup_file: Path to backup file for restoration
            
        Returns:
            bool: True if rollback successful
        """
        logger.info(f"Starting data rollback from backup: {backup_file}")
        
        if self.dry_run:
            logger.info("DRY RUN: Would execute data rollback")
            return True
            
        try:
            # Validate backup file exists
            if not Path(backup_file).exists():
                logger.error(f"Backup file not found: {backup_file}")
                return False
                
            # Create current backup before rollback
            current_backup = self._create_backup()
            logger.info(f"Created current state backup: {current_backup}")
            
            # Execute database restoration
            success = self._restore_from_backup(backup_file)
            
            if success:
                logger.info("Data rollback completed successfully")
                logger.info(f"Previous state backup available at: {current_backup}")
            else:
                logger.error("Data rollback failed")
                
            return success
            
        except Exception as e:
            logger.error(f"Data rollback error: {str(e)}")
            return False
            
    def full_rollback(self, target_revision: str, backup_file: Optional[str] = None) -> bool:
        """
        Execute complete rollback including schema and data.
        
        Args:
            target_revision: Alembic revision to rollback to
            backup_file: Optional backup file for data restoration
            
        Returns:
            bool: True if rollback successful
        """
        logger.info("Starting full database rollback")
        
        try:
            # Step 1: Data rollback (if backup provided)
            if backup_file:
                if not self.data_rollback(backup_file):
                    logger.error("Data rollback failed, aborting full rollback")
                    return False
                    
            # Step 2: Schema rollback
            if not self.schema_rollback(target_revision):
                logger.error("Schema rollback failed")
                return False
                
            logger.info("Full rollback completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Full rollback error: {str(e)}")
            return False
            
    def _validate_revision(self, revision: str) -> bool:
        """
        Validate that a revision exists in Alembic history.
        
        Args:
            revision: Revision ID to validate
            
        Returns:
            bool: True if revision exists
        """
        try:
            cmd = ["alembic", "history"]
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                return False
                
            return revision in result.stdout
            
        except Exception:
            return False
            
    def _create_backup(self) -> Optional[str]:
        """
        Create a database backup using pg_dump.
        
        Returns:
            str: Path to backup file, None if failed
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = Path("backups")
        backup_dir.mkdir(exist_ok=True)
        backup_file = backup_dir / f"backup_{self.environment}_{timestamp}.sql"
        
        try:
            # Get database connection info from environment or config
            import os
            from app.core.config import settings
            
            # Use database URL from settings or environment
            db_url = os.getenv("DATABASE_URL", str(settings.DATABASE_URL))
            
            # Parse database URL to extract components
            from urllib.parse import urlparse
            parsed = urlparse(db_url)
            
            host = parsed.hostname or "localhost"
            port = parsed.port or 5432
            database = parsed.path.lstrip("/") if parsed.path else "opssight"
            username = parsed.username or "postgres"
            password = parsed.password
            
            logger.info(f"Creating backup: {backup_file}")
            logger.info(f"Database: {database} on {host}:{port}")
            
            # Prepare pg_dump command
            cmd = [
                "pg_dump",
                "-h", host,
                "-p", str(port),
                "-U", username,
                "-d", database,
                "-f", str(backup_file),
                "--verbose",
                "--no-password"  # Use PGPASSWORD environment variable
            ]
            
            # Set environment for pg_dump
            env = os.environ.copy()
            if password:
                env["PGPASSWORD"] = password
            
            logger.info(f"Executing: {' '.join(cmd[:-1])} [password hidden]")
            
            if self.dry_run:
                logger.info("DRY RUN: Would create backup")
                return str(backup_file)
            
            result = subprocess.run(cmd, capture_output=True, text=True, env=env)
            
            if result.returncode != 0:
                logger.error(f"pg_dump failed: {result.stderr}")
                return None
                
            # Verify backup file was created and has content
            if not backup_file.exists():
                logger.error(f"Backup file not created: {backup_file}")
                return None
                
            file_size = backup_file.stat().st_size
            logger.info(f"Backup created successfully: {backup_file} ({file_size} bytes)")
            
            return str(backup_file)
                
        except Exception as e:
            logger.error(f"Backup creation failed: {str(e)}")
            return None
            
    def _restore_from_backup(self, backup_file: str) -> bool:
        """
        Restore database from backup file using psql.
        
        Args:
            backup_file: Path to backup file
            
        Returns:
            bool: True if restoration successful
        """
        try:
            logger.info(f"Restoring from backup: {backup_file}")
            
            # Get database connection info from environment or config
            import os
            from app.core.config import settings
            
            # Use database URL from settings or environment
            db_url = os.getenv("DATABASE_URL", str(settings.DATABASE_URL))
            
            # Parse database URL to extract components
            from urllib.parse import urlparse
            parsed = urlparse(db_url)
            
            host = parsed.hostname or "localhost"
            port = parsed.port or 5432
            database = parsed.path.lstrip("/") if parsed.path else "opssight"
            username = parsed.username or "postgres"
            password = parsed.password
            
            logger.info(f"Restoring to database: {database} on {host}:{port}")
            
            if self.dry_run:
                logger.info("DRY RUN: Would restore from backup")
                return True
            
            # Verify backup file exists
            if not Path(backup_file).exists():
                logger.error(f"Backup file not found: {backup_file}")
                return False
            
            # First, terminate existing connections to allow restoration
            logger.info("Terminating existing database connections...")
            terminate_cmd = [
                "psql",
                "-h", host,
                "-p", str(port),
                "-U", username,
                "-d", "postgres",  # Connect to postgres DB to terminate connections
                "-c", f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{database}' AND pid <> pg_backend_pid();"
            ]
            
            # Set environment for psql
            env = os.environ.copy()
            if password:
                env["PGPASSWORD"] = password
            
            # Execute connection termination
            terminate_result = subprocess.run(terminate_cmd, capture_output=True, text=True, env=env)
            if terminate_result.returncode != 0:
                logger.warning(f"Could not terminate connections: {terminate_result.stderr}")
            
            # Drop existing database and recreate it
            logger.info(f"Dropping and recreating database: {database}")
            
            drop_cmd = [
                "psql",
                "-h", host,
                "-p", str(port),
                "-U", username,
                "-d", "postgres",
                "-c", f"DROP DATABASE IF EXISTS {database};"
            ]
            
            create_cmd = [
                "psql",
                "-h", host,
                "-p", str(port),
                "-U", username,
                "-d", "postgres",
                "-c", f"CREATE DATABASE {database};"
            ]
            
            # Execute drop and create
            drop_result = subprocess.run(drop_cmd, capture_output=True, text=True, env=env)
            if drop_result.returncode != 0:
                logger.error(f"Database drop failed: {drop_result.stderr}")
                return False
                
            create_result = subprocess.run(create_cmd, capture_output=True, text=True, env=env)
            if create_result.returncode != 0:
                logger.error(f"Database creation failed: {create_result.stderr}")
                return False
            
            # Restore from backup
            logger.info(f"Restoring data from backup file: {backup_file}")
            restore_cmd = [
                "psql",
                "-h", host,
                "-p", str(port),
                "-U", username,
                "-d", database,
                "-f", backup_file,
                "--quiet"
            ]
            
            logger.info(f"Executing: {' '.join(restore_cmd[:-1])} [password hidden]")
            
            restore_result = subprocess.run(restore_cmd, capture_output=True, text=True, env=env)
            
            if restore_result.returncode != 0:
                logger.error(f"Database restoration failed: {restore_result.stderr}")
                return False
                
            logger.info("Database restoration completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Backup restoration failed: {str(e)}")
            return False
    
    def list_backups(self) -> List[Dict[str, Any]]:
        """
        List available backup files.
        
        Returns:
            List of backup file information
        """
        backups = []
        backup_dir = Path("backups")
        
        if not backup_dir.exists():
            return backups
            
        for backup_file in backup_dir.glob("backup_*.sql"):
            try:
                stat = backup_file.stat()
                backups.append({
                    "filename": backup_file.name,
                    "path": str(backup_file),
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_ctime),
                    "modified": datetime.fromtimestamp(stat.st_mtime),
                    "environment": backup_file.name.split("_")[1] if "_" in backup_file.name else "unknown"
                })
            except Exception as e:
                logger.warning(f"Could not read backup file {backup_file}: {str(e)}")
                
        return sorted(backups, key=lambda x: x["created"], reverse=True)
    
    def cleanup_old_backups(self, days_to_keep: int = 30) -> int:
        """
        Clean up backup files older than specified days.
        
        Args:
            days_to_keep: Number of days of backups to retain
            
        Returns:
            Number of backups cleaned up
        """
        cleanup_count = 0
        backup_dir = Path("backups")
        
        if not backup_dir.exists():
            return cleanup_count
            
        cutoff_time = datetime.now() - timedelta(days=days_to_keep)
        
        for backup_file in backup_dir.glob("backup_*.sql"):
            try:
                if datetime.fromtimestamp(backup_file.stat().st_ctime) < cutoff_time:
                    if not self.dry_run:
                        backup_file.unlink()
                    logger.info(f"Cleaned up old backup: {backup_file.name}")
                    cleanup_count += 1
            except Exception as e:
                logger.warning(f"Could not clean up backup {backup_file}: {str(e)}")
                
        return cleanup_count
    
    def verify_backup_integrity(self, backup_file: str) -> bool:
        """
        Verify backup file integrity without full restoration.
        
        Args:
            backup_file: Path to backup file to verify
            
        Returns:
            bool: True if backup appears valid
        """
        try:
            backup_path = Path(backup_file)
            
            # Check file exists and has content
            if not backup_path.exists():
                logger.error(f"Backup file not found: {backup_file}")
                return False
                
            if backup_path.stat().st_size == 0:
                logger.error(f"Backup file is empty: {backup_file}")
                return False
            
            # Check for SQL dump header
            with open(backup_path, 'r') as f:
                first_lines = f.read(1024)
                if "-- PostgreSQL database dump" not in first_lines:
                    logger.error(f"Backup file does not appear to be a PostgreSQL dump: {backup_file}")
                    return False
            
            logger.info(f"Backup file appears valid: {backup_file}")
            return True
            
        except Exception as e:
            logger.error(f"Backup verification failed: {str(e)}")
            return False
            
    def cleanup_migration_artifacts(self) -> bool:
        """
        Clean up migration artifacts and temporary data.
        
        Returns:
            bool: True if cleanup successful
        """
        logger.info("Cleaning up migration artifacts")
        
        if self.dry_run:
            logger.info("DRY RUN: Would clean up migration artifacts")
            return True
            
        with self.SessionLocal() as session:
            try:
                # Remove migration-specific audit logs
                session.execute(text("""
                    DELETE FROM audit_logs 
                    WHERE table_name = 'system' 
                    AND operation = 'MIGRATION'
                    AND context_data->>'migration_type' = 'data_migration'
                """))
                
                # Clean up temporary migration tables if any exist
                tables_to_check = [
                    'migration_temp_organizations',
                    'migration_temp_users', 
                    'migration_temp_roles'
                ]
                
                for table in tables_to_check:
                    try:
                        session.execute(text(f"DROP TABLE IF EXISTS {table}"))
                        logger.info(f"Dropped temporary table: {table}")
                    except Exception as e:
                        logger.warning(f"Could not drop table {table}: {str(e)}")
                
                session.commit()
                logger.info("Migration artifacts cleanup completed")
                return True
                
            except Exception as e:
                session.rollback()
                logger.error(f"Cleanup failed: {str(e)}")
                return False
                
    def validate_rollback_state(self) -> bool:
        """
        Validate database state after rollback.
        
        Returns:
            bool: True if validation passes
        """
        logger.info("Validating post-rollback state")
        
        with self.SessionLocal() as session:
            try:
                # Check current Alembic revision
                result = session.execute(text("SELECT version_num FROM alembic_version"))
                current_version = result.scalar()
                logger.info(f"Current schema version: {current_version}")
                
                # Check table existence and basic integrity
                essential_tables = ['organizations', 'users', 'roles']
                
                for table in essential_tables:
                    count = session.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
                    logger.info(f"Table {table}: {count} records")
                
                # Check for orphaned records
                orphaned_users = session.execute(text("""
                    SELECT COUNT(*) FROM users u 
                    LEFT JOIN organizations o ON u.organization_id = o.id 
                    WHERE u.organization_id IS NOT NULL AND o.id IS NULL
                """)).scalar()
                
                if orphaned_users > 0:
                    logger.warning(f"Found {orphaned_users} orphaned users after rollback")
                
                logger.info("Post-rollback validation completed")
                return True
                
            except Exception as e:
                logger.error(f"Post-rollback validation error: {str(e)}")
                return False


def main():
    """Main rollback script entry point."""
    parser = argparse.ArgumentParser(description="OpsSight Database Rollback")
    parser.add_argument(
        "--type",
        choices=["schema", "data", "full"],
        default="schema",
        help="Type of rollback to perform"
    )
    parser.add_argument(
        "--to-revision",
        help="Target revision for schema rollback"
    )
    parser.add_argument(
        "--backup-file",
        help="Backup file for data rollback"
    )
    parser.add_argument(
        "--environment",
        choices=["staging", "production"],
        default="staging",
        help="Target environment"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate rollback without making changes"
    )
    parser.add_argument(
        "--cleanup",
        action="store_true",
        help="Clean up migration artifacts"
    )
    parser.add_argument(
        "--list-backups",
        action="store_true",
        help="List available backup files"
    )
    parser.add_argument(
        "--cleanup-backups",
        type=int,
        metavar="DAYS",
        help="Clean up backups older than specified days"
    )
    parser.add_argument(
        "--verify-backup",
        metavar="BACKUP_FILE",
        help="Verify backup file integrity"
    )
    parser.add_argument(
        "--create-backup",
        action="store_true",
        help="Create a new backup without rollback"
    )
    
    args = parser.parse_args()
    
    # Initialize rollback manager
    rollback_manager = RollbackManager(
        environment=args.environment,
        dry_run=args.dry_run
    )
    
    success = False
    
    try:
        if args.cleanup:
            success = rollback_manager.cleanup_migration_artifacts()
            
        elif args.list_backups:
            backups = rollback_manager.list_backups()
            if backups:
                logger.info(f"Found {len(backups)} backup files:")
                for backup in backups:
                    size_mb = backup["size"] / (1024 * 1024)
                    logger.info(f"  {backup['filename']} ({size_mb:.1f} MB) - {backup['created']}")
            else:
                logger.info("No backup files found")
            success = True
            
        elif args.cleanup_backups:
            cleanup_count = rollback_manager.cleanup_old_backups(args.cleanup_backups)
            logger.info(f"Cleaned up {cleanup_count} old backup files")
            success = True
            
        elif args.verify_backup:
            success = rollback_manager.verify_backup_integrity(args.verify_backup)
            
        elif args.create_backup:
            backup_file = rollback_manager._create_backup()
            if backup_file:
                logger.info(f"Backup created: {backup_file}")
                success = True
            else:
                logger.error("Backup creation failed")
                success = False
            
        elif args.type == "schema":
            if not args.to_revision:
                logger.error("--to-revision required for schema rollback")
                return 1
            success = rollback_manager.schema_rollback(args.to_revision)
            
        elif args.type == "data":
            if not args.backup_file:
                logger.error("--backup-file required for data rollback")
                return 1
            success = rollback_manager.data_rollback(args.backup_file)
            
        elif args.type == "full":
            if not args.to_revision:
                logger.error("--to-revision required for full rollback")
                return 1
            success = rollback_manager.full_rollback(args.to_revision, args.backup_file)
            
        # Validate rollback state (only for actual rollback operations)
        if success and args.type in ["schema", "data", "full"]:
            rollback_manager.validate_rollback_state()
            
    except KeyboardInterrupt:
        logger.warning("Rollback interrupted by user")
        return 1
    except Exception as e:
        logger.error(f"Rollback failed: {str(e)}")
        return 1
    
    if success:
        logger.info("Rollback completed successfully")
        return 0
    else:
        logger.error("Rollback failed")
        return 1


if __name__ == "__main__":
    sys.exit(main()) 