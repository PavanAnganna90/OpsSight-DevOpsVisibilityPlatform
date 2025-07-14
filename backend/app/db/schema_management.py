"""
Database Schema Management Module for OpsSight Platform.

Provides comprehensive database schema management including migrations,
backups, and maintenance operations with production-ready safety features.
"""

import asyncio
import logging
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
import json
import os

from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import AsyncSession
from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory

from app.core.exceptions import DatabaseException

logger = logging.getLogger(__name__)


class SchemaManager:
    """
    Advanced database schema management with migration control and safety features.
    """

    def __init__(self, alembic_cfg_path: Optional[str] = None):
        """
        Initialize schema manager.

        Args:
            alembic_cfg_path: Path to alembic.ini file. Defaults to backend/alembic.ini
        """
        self.alembic_cfg_path = alembic_cfg_path or os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "..", "alembic.ini"
        )
        self.alembic_cfg = Config(self.alembic_cfg_path)

    async def get_current_revision(self) -> Optional[str]:
        """
        Get the current database revision.

        Returns:
            str: Current revision ID or None if no migration has been applied
        """
        try:
            async with async_engine.connect() as connection:

                def _get_revision(conn):
                    context = MigrationContext.configure(conn)
                    return context.get_current_revision()

                revision = await connection.run_sync(_get_revision)
                return revision
        except Exception as e:
            logger.error(f"Error getting current revision: {e}")
            raise DatabaseException(
                f"Failed to get current revision: {e}", "get_revision"
            )

    async def get_migration_history(self) -> List[Dict[str, Any]]:
        """
        Get complete migration history.

        Returns:
            List[Dict]: Migration history with revision details
        """
        try:
            script_dir = ScriptDirectory.from_config(self.alembic_cfg)
            revisions = []

            for script in script_dir.walk_revisions():
                revisions.append(
                    {
                        "revision": script.revision,
                        "down_revision": script.down_revision,
                        "branch_labels": script.branch_labels,
                        "depends_on": script.depends_on,
                        "doc": script.doc,
                        "path": script.path,
                        "module": script.module,
                        "is_head": script.is_head,
                        "is_base": script.is_base,
                    }
                )

            return revisions
        except Exception as e:
            logger.error(f"Error getting migration history: {e}")
            raise DatabaseException(
                f"Failed to get migration history: {e}", "get_history"
            )

    async def validate_migration_safety(
        self, target_revision: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validate migration safety before applying.

        Args:
            target_revision: Target revision to validate. Defaults to head.

        Returns:
            Dict: Safety validation results
        """
        try:
            current_revision = await self.get_current_revision()
            script_dir = ScriptDirectory.from_config(self.alembic_cfg)

            if target_revision is None:
                target_revision = "head"

            # Get migration steps
            steps = []
            if current_revision:
                for script in script_dir.iterate_revisions(
                    target_revision, current_revision
                ):
                    if script.revision != current_revision:
                        steps.append(script)

            # Analyze migration safety
            warnings = []
            risks = []

            for script in steps:
                # Read migration file content
                with open(script.path, "r") as f:
                    content = f.read()

                # Check for potentially dangerous operations
                dangerous_ops = [
                    ("DROP TABLE", "high"),
                    ("DROP COLUMN", "high"),
                    ("ALTER TABLE", "medium"),
                    ("CREATE INDEX", "low"),
                    ("DROP INDEX", "medium"),
                ]

                for op, risk_level in dangerous_ops:
                    if op in content.upper():
                        risks.append(
                            {
                                "revision": script.revision,
                                "operation": op,
                                "risk_level": risk_level,
                                "message": f"Found {op} operation in {script.revision}",
                            }
                        )

                # Check for potential data loss operations
                if "DROP" in content.upper():
                    warnings.append(
                        {
                            "revision": script.revision,
                            "type": "data_loss_risk",
                            "message": "Migration contains DROP operations that may cause data loss",
                        }
                    )

            return {
                "current_revision": current_revision,
                "target_revision": target_revision,
                "steps_count": len(steps),
                "warnings": warnings,
                "risks": risks,
                "safe_to_proceed": len([r for r in risks if r["risk_level"] == "high"])
                == 0,
            }

        except Exception as e:
            logger.error(f"Error validating migration safety: {e}")
            raise DatabaseException(
                f"Failed to validate migration safety: {e}", "validate_safety"
            )

    async def apply_migrations(
        self, target_revision: Optional[str] = None, dry_run: bool = False
    ) -> Dict[str, Any]:
        """
        Apply database migrations with safety checks.

        Args:
            target_revision: Target revision. Defaults to head.
            dry_run: If True, only validate without applying

        Returns:
            Dict: Migration results
        """
        try:
            if target_revision is None:
                target_revision = "head"

            # Validate safety first
            safety_check = await self.validate_migration_safety(target_revision)

            if not safety_check["safe_to_proceed"] and not dry_run:
                raise DatabaseException(
                    "Migration contains high-risk operations. Use force=True to override.",
                    "migration_safety",
                )

            if dry_run:
                return {
                    "dry_run": True,
                    "safety_check": safety_check,
                    "would_apply": safety_check["steps_count"],
                }

            # Create backup before applying
            backup_result = await self.create_schema_backup()

            try:
                # Apply migrations
                current_revision = await self.get_current_revision()

                def _upgrade():
                    command.upgrade(self.alembic_cfg, target_revision)

                await asyncio.get_event_loop().run_in_executor(None, _upgrade)

                new_revision = await self.get_current_revision()

                return {
                    "success": True,
                    "previous_revision": current_revision,
                    "new_revision": new_revision,
                    "backup_file": backup_result["backup_file"],
                    "safety_check": safety_check,
                }

            except Exception as e:
                logger.error(
                    f"Migration failed, backup available at: {backup_result.get('backup_file')}"
                )
                raise

        except Exception as e:
            logger.error(f"Error applying migrations: {e}")
            raise DatabaseException(
                f"Failed to apply migrations: {e}", "apply_migrations"
            )

    async def rollback_migration(
        self, target_revision: str, confirm: bool = False
    ) -> Dict[str, Any]:
        """
        Rollback to a specific migration revision.

        Args:
            target_revision: Target revision to rollback to
            confirm: Confirmation flag for safety

        Returns:
            Dict: Rollback results
        """
        if not confirm:
            raise DatabaseException(
                "Rollback requires explicit confirmation. Set confirm=True",
                "rollback_safety",
            )

        try:
            current_revision = await self.get_current_revision()

            # Create backup before rollback
            backup_result = await self.create_schema_backup()

            def _downgrade():
                command.downgrade(self.alembic_cfg, target_revision)

            await asyncio.get_event_loop().run_in_executor(None, _downgrade)

            new_revision = await self.get_current_revision()

            return {
                "success": True,
                "previous_revision": current_revision,
                "new_revision": new_revision,
                "backup_file": backup_result["backup_file"],
            }

        except Exception as e:
            logger.error(f"Error rolling back migration: {e}")
            raise DatabaseException(
                f"Failed to rollback migration: {e}", "rollback_migration"
            )

    async def create_schema_backup(
        self, backup_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a database schema backup.

        Args:
            backup_name: Custom backup name. Defaults to timestamp-based name.

        Returns:
            Dict: Backup results with file path
        """
        try:
            if backup_name is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_name = f"schema_backup_{timestamp}"

            # Create backups directory
            backup_dir = Path("backups/schema")
            backup_dir.mkdir(parents=True, exist_ok=True)

            backup_file = backup_dir / f"{backup_name}.sql"

            # Get database URL from config
            database_url = self.alembic_cfg.get_main_option("sqlalchemy.url")

            # Use pg_dump for PostgreSQL databases
            if "postgresql" in database_url:
                # Parse database URL
                from urllib.parse import urlparse

                parsed = urlparse(database_url)

                env = os.environ.copy()
                if parsed.password:
                    env["PGPASSWORD"] = parsed.password

                cmd = [
                    "pg_dump",
                    "--schema-only",
                    "--no-owner",
                    "--no-privileges",
                    "-h",
                    parsed.hostname or "localhost",
                    "-p",
                    str(parsed.port or 5432),
                    "-U",
                    parsed.username or "postgres",
                    "-d",
                    parsed.path[1:],  # Remove leading slash
                    "-f",
                    str(backup_file),
                ]

                result = subprocess.run(cmd, env=env, capture_output=True, text=True)

                if result.returncode != 0:
                    raise DatabaseException(
                        f"pg_dump failed: {result.stderr}", "backup_failed"
                    )

            else:
                # Fallback to SQLAlchemy metadata dump
                async with async_engine.connect() as connection:

                    def _dump_schema(conn):
                        inspector = inspect(conn)
                        tables = inspector.get_table_names()

                        schema_sql = []
                        for table in tables:
                            # This is a simplified approach
                            # In production, you'd want more comprehensive schema extraction
                            schema_sql.append(f"-- Table: {table}")

                        return "\n".join(schema_sql)

                    schema_content = await connection.run_sync(_dump_schema)

                    with open(backup_file, "w") as f:
                        f.write(schema_content)

            return {
                "success": True,
                "backup_file": str(backup_file),
                "backup_name": backup_name,
                "created_at": datetime.now().isoformat(),
            }

        except Exception as e:
            logger.error(f"Error creating schema backup: {e}")
            raise DatabaseException(
                f"Failed to create schema backup: {e}", "create_backup"
            )

    async def get_table_statistics(self) -> Dict[str, Any]:
        """
        Get database table statistics.

        Returns:
            Dict: Table statistics including row counts and sizes
        """
        try:
            async with get_async_session() as session:
                # Get table information
                result = await session.execute(
                    text(
                        """
                    SELECT 
                        schemaname,
                        tablename,
                        attname,
                        n_distinct,
                        correlation
                    FROM pg_stats 
                    WHERE schemaname = 'public'
                    ORDER BY tablename, attname;
                """
                    )
                )

                stats = {}
                for row in result.fetchall():
                    table = row.tablename
                    if table not in stats:
                        stats[table] = {"columns": [], "schema": row.schemaname}

                    stats[table]["columns"].append(
                        {
                            "name": row.attname,
                            "n_distinct": row.n_distinct,
                            "correlation": row.correlation,
                        }
                    )

                # Get table sizes
                size_result = await session.execute(
                    text(
                        """
                    SELECT 
                        tablename,
                        pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size,
                        pg_total_relation_size('public.'||tablename) as size_bytes
                    FROM pg_tables 
                    WHERE schemaname = 'public'
                    ORDER BY pg_total_relation_size('public.'||tablename) DESC;
                """
                    )
                )

                for row in size_result.fetchall():
                    table = row.tablename
                    if table in stats:
                        stats[table]["size"] = row.size
                        stats[table]["size_bytes"] = row.size_bytes

                return stats

        except Exception as e:
            logger.error(f"Error getting table statistics: {e}")
            raise DatabaseException(
                f"Failed to get table statistics: {e}", "get_statistics"
            )


# Global schema manager instance
schema_manager = SchemaManager()
