"""
Log Storage and Indexing Service for Ansible automation logs.

Provides efficient storage, retrieval, and search capabilities for Ansible logs
with PostgreSQL optimization and full-text search support.
"""

import json
import gzip
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text, and_, or_
from sqlalchemy.dialects.postgresql import JSONB

from app.models.automation_run import AutomationRun, AutomationStatus, AutomationType
from app.schemas.automation_run import AutomationRunSummary

logger = logging.getLogger(__name__)


class LogStorageService:
    """
    Service for managing Ansible log storage, indexing, and retrieval.

    Optimized for PostgreSQL with JSONB and full-text search capabilities.
    """

    # Database optimization settings
    MAX_LOG_SIZE = 10 * 1024 * 1024  # 10MB max log size before compression
    COMPRESSION_THRESHOLD = 1024 * 1024  # 1MB threshold for compression
    RETENTION_DAYS = 365  # Default log retention period

    @staticmethod
    def store_log_data(
        db: Session,
        automation_run_id: int,
        log_content: str,
        parsed_data: Dict[str, Any],
        compress: bool = True,
    ) -> bool:
        """
        Store log data with optimized indexing and optional compression.

        Args:
            db: Database session
            automation_run_id: ID of the automation run
            log_content: Raw log content
            parsed_data: Structured parsed log data
            compress: Whether to compress large logs

        Returns:
            bool: Success status
        """
        try:
            automation_run = (
                db.query(AutomationRun)
                .filter(AutomationRun.id == automation_run_id)
                .first()
            )

            if not automation_run:
                logger.error(f"Automation run {automation_run_id} not found")
                return False

            # Compress log content if it's large
            stored_log = log_content
            is_compressed = False

            if compress and len(log_content) > LogStorageService.COMPRESSION_THRESHOLD:
                try:
                    compressed = gzip.compress(log_content.encode("utf-8"))
                    if len(compressed) < len(log_content):
                        stored_log = compressed.hex()  # Store as hex string
                        is_compressed = True
                        logger.info(
                            f"Compressed log from {len(log_content)} to {len(compressed)} bytes"
                        )
                except Exception as e:
                    logger.warning(f"Failed to compress log: {e}")

            # Update automation run with log data
            automation_run.logs = stored_log
            automation_run.log_output = (
                stored_log[:10000] if not is_compressed else log_content[:10000]
            )

            # Store structured data for indexing
            if parsed_data:
                automation_run.output = parsed_data

            # Add compression metadata
            if not automation_run.metadata:
                automation_run.metadata = {}
            automation_run.metadata["log_compressed"] = is_compressed
            automation_run.metadata["log_original_size"] = len(log_content)
            automation_run.metadata["log_stored_size"] = len(stored_log)

            db.commit()
            logger.info(f"Stored log data for automation run {automation_run_id}")
            return True

        except Exception as e:
            logger.error(f"Error storing log data: {e}")
            db.rollback()
            return False

    @staticmethod
    def retrieve_log_content(
        db: Session, automation_run_id: int, decompress: bool = True
    ) -> Optional[str]:
        """
        Retrieve log content with automatic decompression.

        Args:
            db: Database session
            automation_run_id: ID of the automation run
            decompress: Whether to decompress if compressed

        Returns:
            Optional[str]: Log content or None if not found
        """
        try:
            automation_run = (
                db.query(AutomationRun)
                .filter(AutomationRun.id == automation_run_id)
                .first()
            )

            if not automation_run or not automation_run.logs:
                return None

            log_content = automation_run.logs

            # Check if log is compressed
            is_compressed = False
            if automation_run.metadata:
                is_compressed = automation_run.metadata.get("log_compressed", False)

            # Decompress if needed
            if is_compressed and decompress:
                try:
                    compressed_bytes = bytes.fromhex(log_content)
                    decompressed = gzip.decompress(compressed_bytes)
                    return decompressed.decode("utf-8")
                except Exception as e:
                    logger.error(f"Failed to decompress log: {e}")
                    return log_content

            return log_content

        except Exception as e:
            logger.error(f"Error retrieving log content: {e}")
            return None

    @staticmethod
    def search_logs(
        db: Session,
        project_id: Optional[int] = None,
        search_text: Optional[str] = None,
        host_filter: Optional[str] = None,
        module_filter: Optional[str] = None,
        status_filter: Optional[AutomationStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[AutomationRun]:
        """
        Search automation runs with advanced filtering and text search.

        Args:
            db: Database session
            project_id: Filter by project ID
            search_text: Text to search in logs and metadata
            host_filter: Filter by host name patterns
            module_filter: Filter by Ansible module
            status_filter: Filter by automation status
            start_date: Start date for filtering
            end_date: End date for filtering
            limit: Maximum results to return
            offset: Offset for pagination

        Returns:
            List[AutomationRun]: Matching automation runs
        """
        try:
            query = db.query(AutomationRun)

            # Base filters
            if project_id:
                query = query.filter(AutomationRun.project_id == project_id)

            if status_filter:
                query = query.filter(AutomationRun.status == status_filter)

            # Date range filtering
            if start_date:
                query = query.filter(AutomationRun.created_at >= start_date)
            if end_date:
                query = query.filter(AutomationRun.created_at <= end_date)

            # Text search in logs and metadata using PostgreSQL full-text search
            if search_text:
                search_conditions = []

                # Search in log output
                search_conditions.append(
                    AutomationRun.log_output.ilike(f"%{search_text}%")
                )

                # Search in playbook name
                search_conditions.append(
                    AutomationRun.playbook_name.ilike(f"%{search_text}%")
                )

                query = query.filter(or_(*search_conditions))

            # Order by most recent first
            query = query.order_by(AutomationRun.created_at.desc())

            # Apply pagination
            query = query.offset(offset).limit(limit)

            return query.all()

        except Exception as e:
            logger.error(f"Error searching logs: {e}")
            return []

    @staticmethod
    def get_log_statistics(
        db: Session, project_id: Optional[int] = None, days: int = 30
    ) -> Dict[str, Any]:
        """
        Get comprehensive log storage statistics.

        Args:
            db: Database session
            project_id: Optional project filter
            days: Number of days to analyze

        Returns:
            Dict[str, Any]: Statistics including storage usage, compression ratios
        """
        try:
            # Date range for analysis
            start_date = datetime.utcnow() - timedelta(days=days)

            query = db.query(AutomationRun).filter(
                AutomationRun.created_at >= start_date
            )

            if project_id:
                query = query.filter(AutomationRun.project_id == project_id)

            runs = query.all()

            # Calculate statistics
            total_runs = len(runs)
            total_original_size = 0
            total_stored_size = 0
            compressed_runs = 0

            status_counts = {}

            for run in runs:
                # Storage statistics
                if run.metadata:
                    original_size = run.metadata.get("log_original_size", 0)
                    stored_size = run.metadata.get("log_stored_size", 0)
                    is_compressed = run.metadata.get("log_compressed", False)

                    total_original_size += original_size
                    total_stored_size += stored_size

                    if is_compressed:
                        compressed_runs += 1

                # Status distribution
                status = run.status.value if run.status else "unknown"
                status_counts[status] = status_counts.get(status, 0) + 1

            # Calculate compression ratio
            compression_ratio = 0
            if total_original_size > 0:
                compression_ratio = (1 - total_stored_size / total_original_size) * 100

            return {
                "period_days": days,
                "total_runs": total_runs,
                "storage": {
                    "total_original_size_mb": round(
                        total_original_size / 1024 / 1024, 2
                    ),
                    "total_stored_size_mb": round(total_stored_size / 1024 / 1024, 2),
                    "compression_ratio_percent": round(compression_ratio, 2),
                    "compressed_runs": compressed_runs,
                    "compression_rate_percent": (
                        round((compressed_runs / total_runs) * 100, 2)
                        if total_runs > 0
                        else 0
                    ),
                },
                "status_distribution": status_counts,
            }

        except Exception as e:
            logger.error(f"Error calculating log statistics: {e}")
            return {}

    @staticmethod
    def cleanup_old_logs(
        db: Session, retention_days: Optional[int] = None, dry_run: bool = True
    ) -> Dict[str, Any]:
        """
        Clean up old logs based on retention policy.

        Args:
            db: Database session
            retention_days: Days to retain logs (default: class setting)
            dry_run: If True, only count what would be deleted

        Returns:
            Dict[str, Any]: Cleanup results
        """
        try:
            retention_days = retention_days or LogStorageService.RETENTION_DAYS
            cutoff_date = datetime.utcnow() - timedelta(days=retention_days)

            # Find old automation runs
            old_runs_query = db.query(AutomationRun).filter(
                AutomationRun.created_at < cutoff_date
            )

            old_runs = old_runs_query.all()

            # Calculate what would be cleaned up
            total_runs = len(old_runs)
            total_size_saved = 0

            for run in old_runs:
                if run.metadata and "log_stored_size" in run.metadata:
                    total_size_saved += run.metadata["log_stored_size"]

            result = {
                "cutoff_date": cutoff_date.isoformat(),
                "retention_days": retention_days,
                "total_runs_affected": total_runs,
                "estimated_size_saved_mb": round(total_size_saved / 1024 / 1024, 2),
                "dry_run": dry_run,
            }

            if not dry_run and total_runs > 0:
                # Actually perform cleanup - only clear log data, keep run records
                for run in old_runs:
                    run.logs = None
                    run.log_output = None
                    if run.metadata:
                        run.metadata["logs_cleaned"] = True
                        run.metadata["cleaned_at"] = datetime.utcnow().isoformat()

                db.commit()
                result["runs_cleaned"] = total_runs
                logger.info(f"Cleaned up logs for {total_runs} old automation runs")

            return result

        except Exception as e:
            logger.error(f"Error during log cleanup: {e}")
            if not dry_run:
                db.rollback()
            return {"error": str(e)}

    @staticmethod
    def create_database_indexes(db: Session) -> bool:
        """
        Create optimized database indexes for log storage and search.

        Args:
            db: Database session

        Returns:
            bool: Success status
        """
        try:
            # Index for project and date filtering
            db.execute(
                text(
                    """
                CREATE INDEX IF NOT EXISTS idx_automation_run_project_date 
                ON automation_runs(project_id, created_at DESC)
                """
                )
            )

            # Index for status and type filtering
            db.execute(
                text(
                    """
                CREATE INDEX IF NOT EXISTS idx_automation_run_status_type 
                ON automation_runs(status, automation_type)
                """
                )
            )

            db.commit()
            logger.info("Database indexes created successfully for log storage")
            return True

        except Exception as e:
            logger.error(f"Error creating database indexes: {e}")
            db.rollback()
            return False
