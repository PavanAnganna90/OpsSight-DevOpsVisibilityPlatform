"""
Automation run service for database operations.
Handles Ansible automation run creation, updates, retrieval, and coverage analysis operations.
"""

from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_, desc, func
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.automation_run import AutomationRun, AutomationStatus, AutomationType
from app.models.project import Project
from app.schemas.automation_run import (
    AutomationRunCreate,
    AutomationRunUpdate,
    HostResult,
    TaskResult,
    AutomationRunSummary,
    AutomationStats,
    AnsibleCallbackData,
)

# Configure logging
logger = logging.getLogger(__name__)


class AutomationRunService:
    """
    Service class for automation run-related database operations.

    Provides methods for creating, updating, retrieving automation runs
    with proper error handling, logging, and Ansible integration.
    """

    @staticmethod
    async def get_automation_run_by_id(
        db: AsyncSession, run_id: int, user_id: Optional[int] = None
    ) -> Optional[AutomationRun]:
        """
        Retrieve an automation run by its ID with access control.

        Args:
            db (AsyncSession): Database session
            run_id (int): Automation run ID to search for
            user_id (Optional[int]): User ID for access control check

        Returns:
            Optional[AutomationRun]: Automation run object if found and accessible, None otherwise
        """
        try:
            run = await db.execute(
                select(AutomationRun)
                .options(selectinload(AutomationRun.project))
                .filter(AutomationRun.id == run_id)
            )

            run = run.scalars().first()

            # Access control check
            if run and user_id:
                if not run.project.is_accessible_by_user(user_id):
                    logger.warning(
                        f"User {user_id} denied access to automation run {run_id}"
                    )
                    return None

            if run:
                logger.info(f"Retrieved automation run by ID: {run_id}")
            return run
        except Exception as e:
            logger.error(f"Error retrieving automation run by ID {run_id}: {e}")
            return None

    @staticmethod
    async def get_automation_runs_by_project(
        db: AsyncSession,
        project_id: int,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[AutomationStatus] = None,
        automation_type: Optional[AutomationType] = None,
        host_filter: Optional[str] = None,
    ) -> List[AutomationRun]:
        """
        Retrieve automation runs for a project.

        Args:
            db (AsyncSession): Database session
            project_id (int): Project ID
            user_id (int): User ID for access control
            skip (int): Number of records to skip
            limit (int): Maximum number of records to return
            status (Optional[AutomationStatus]): Filter by run status
            automation_type (Optional[AutomationType]): Filter by automation type
            host_filter (Optional[str]): Filter by host name

        Returns:
            List[AutomationRun]: List of automation runs
        """
        try:
            # Check project access
            project = await db.execute(select(Project).filter(Project.id == project_id))
            project = project.scalars().first()
            if not project or not project.is_accessible_by_user(user_id):
                logger.warning(f"User {user_id} denied access to project {project_id}")
                return []

            query = select(AutomationRun).filter(AutomationRun.project_id == project_id)

            if status:
                query = query.filter(AutomationRun.status == status)
            if automation_type:
                query = query.filter(AutomationRun.automation_type == automation_type)
            if host_filter:
                # Filter runs that targeted specific hosts
                query = query.filter(
                    AutomationRun.limit_hosts.ilike(f"%{host_filter}%")
                )

            runs = await db.execute(
                query.order_by(desc(AutomationRun.created_at)).offset(skip).limit(limit)
            )
            runs = runs.scalars().all()
            logger.info(
                f"Retrieved {len(runs)} automation runs for project {project_id}"
            )
            return runs
        except Exception as e:
            logger.error(
                f"Error retrieving automation runs for project {project_id}: {e}"
            )
            return []

    @staticmethod
    async def create_automation_run(
        db: AsyncSession, run_data: AutomationRunCreate, user_id: int
    ) -> Optional[AutomationRun]:
        """
        Create a new automation run.

        Args:
            db (AsyncSession): Database session
            run_data (AutomationRunCreate): Automation run creation data
            user_id (int): User ID for access control

        Returns:
            Optional[AutomationRun]: Created automation run object or None if creation failed
        """
        try:
            # Check project access
            project = await db.execute(
                select(Project).filter(Project.id == run_data.project_id)
            )
            project = project.scalars().first()
            if not project or not project.is_accessible_by_user(user_id):
                logger.warning(
                    f"User {user_id} denied access to project {run_data.project_id}"
                )
                return None

            # Create automation run instance
            run = AutomationRun(
                name=run_data.name,
                description=run_data.description,
                automation_type=run_data.automation_type,
                playbook_path=run_data.playbook_path,
                inventory_path=run_data.inventory_path,
                extra_vars=run_data.extra_vars or {},
                tags=run_data.tags or [],
                limit_hosts=run_data.limit_hosts,
                check_mode=run_data.check_mode,
                diff_mode=run_data.diff_mode,
                verbose_level=run_data.verbose_level,
                status=AutomationStatus.PENDING,
                project_id=run_data.project_id,
            )

            # Add to database
            db.add(run)
            await db.commit()
            await db.refresh(run)

            logger.info(f"Created new automation run: {run.name} (ID: {run.id})")
            return run

        except IntegrityError as e:
            await db.rollback()
            logger.error(f"Automation run creation failed - integrity error: {e}")
            return None
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating automation run: {e}")
            return None

    @staticmethod
    async def update_automation_run(
        db: AsyncSession, run_id: int, run_data: AutomationRunUpdate, user_id: int
    ) -> Optional[AutomationRun]:
        """
        Update an existing automation run.

        Args:
            db (AsyncSession): Database session
            run_id (int): Automation run ID to update
            run_data (AutomationRunUpdate): Update data
            user_id (int): User ID for access control

        Returns:
            Optional[AutomationRun]: Updated automation run object or None if update failed
        """
        try:
            run = await AutomationRunService.get_automation_run_by_id(
                db, run_id, user_id
            )
            if not run:
                return None

            # Update fields if provided
            if run_data.status is not None:
                run.status = run_data.status
            if run_data.started_at is not None:
                run.started_at = run_data.started_at
            if run_data.finished_at is not None:
                run.finished_at = run_data.finished_at
            if run_data.host_results is not None:
                run.host_results = run_data.host_results
            if run_data.task_results is not None:
                run.task_results = run_data.task_results
            if run_data.coverage_report is not None:
                run.coverage_report = run_data.coverage_report
            if run_data.error_message is not None:
                run.error_message = run_data.error_message

            # Calculate duration and statistics if finished
            if run.started_at and run.finished_at:
                run.duration_seconds = int(
                    (run.finished_at - run.started_at).total_seconds()
                )

                # Update statistics from results
                if run.host_results:
                    run.total_hosts = len(run.host_results)
                    run.successful_hosts = len(
                        [h for h in run.host_results if h.get("status") == "ok"]
                    )
                    run.failed_hosts = len(
                        [h for h in run.host_results if h.get("status") == "failed"]
                    )

                if run.task_results:
                    run.total_tasks = len(run.task_results)
                    run.successful_tasks = len(
                        [t for t in run.task_results if t.get("status") == "ok"]
                    )
                    run.failed_tasks = len(
                        [t for t in run.task_results if t.get("status") == "failed"]
                    )
                    run.changed_tasks = len(
                        [t for t in run.task_results if t.get("changed") == True]
                    )

            # Save changes
            await db.commit()
            await db.refresh(run)

            logger.info(f"Updated automation run: {run.name} (ID: {run.id})")
            return run

        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating automation run {run_id}: {e}")
            return None

    @staticmethod
    async def get_automation_run_summary(
        db: AsyncSession, run_id: int, user_id: int
    ) -> Optional[AutomationRunSummary]:
        """
        Get automation run summary with execution details.

        Args:
            db (AsyncSession): Database session
            run_id (int): Automation run ID
            user_id (int): User ID for access control

        Returns:
            Optional[AutomationRunSummary]: Automation run summary or None if not accessible
        """
        try:
            run = await AutomationRunService.get_automation_run_by_id(
                db, run_id, user_id
            )
            if not run:
                return None

            # Use model method to get execution summary
            execution_summary = run.get_execution_summary()
            success_rate = run.calculate_success_rate()

            return AutomationRunSummary(
                id=run.id,
                name=run.name,
                automation_type=run.automation_type,
                status=run.status,
                duration_seconds=run.duration_seconds,
                success_rate=success_rate,
                total_hosts=run.total_hosts or 0,
                successful_hosts=run.successful_hosts or 0,
                failed_hosts=run.failed_hosts or 0,
                total_tasks=run.total_tasks or 0,
                successful_tasks=run.successful_tasks or 0,
                failed_tasks=run.failed_tasks or 0,
                changed_tasks=run.changed_tasks or 0,
                execution_summary=execution_summary,
                started_at=run.started_at,
                finished_at=run.finished_at,
            )

        except Exception as e:
            logger.error(f"Error getting automation run summary for {run_id}: {e}")
            return None

    @staticmethod
    async def get_automation_stats(
        db: AsyncSession, project_id: int, user_id: int
    ) -> Optional[AutomationStats]:
        """
        Get automation statistics for a project.

        Args:
            db (AsyncSession): Database session
            project_id (int): Project ID
            user_id (int): User ID for access control

        Returns:
            Optional[AutomationStats]: Automation statistics or None if not accessible
        """
        try:
            # Check project access
            project = await db.execute(select(Project).filter(Project.id == project_id))
            project = project.scalars().first()
            if not project or not project.is_accessible_by_user(user_id):
                logger.warning(f"User {user_id} denied access to project {project_id}")
                return None

            # Get run counts by status
            total_runs = await db.execute(
                select(func.count(AutomationRun.id)).filter(
                    AutomationRun.project_id == project_id
                )
            )
            total_runs = total_runs.scalars().first() or 0

            successful_runs = await db.execute(
                select(func.count(AutomationRun.id)).filter(
                    AutomationRun.project_id == project_id,
                    AutomationRun.status == AutomationStatus.SUCCESS,
                )
            )
            successful_runs = successful_runs.scalars().first() or 0

            failed_runs = await db.execute(
                select(func.count(AutomationRun.id)).filter(
                    AutomationRun.project_id == project_id,
                    AutomationRun.status == AutomationStatus.FAILED,
                )
            )
            failed_runs = failed_runs.scalars().first() or 0

            running_runs = await db.execute(
                select(func.count(AutomationRun.id)).filter(
                    AutomationRun.project_id == project_id,
                    AutomationRun.status == AutomationStatus.RUNNING,
                )
            )
            running_runs = running_runs.scalars().first() or 0

            # Get average success rate
            runs_with_rates = await db.execute(
                select(AutomationRun).filter(
                    AutomationRun.project_id == project_id,
                    AutomationRun.status == AutomationStatus.SUCCESS,
                    AutomationRun.total_hosts.isnot(None),
                    AutomationRun.successful_hosts.isnot(None),
                )
            )
            runs_with_rates = runs_with_rates.scalars().all()

            success_rates = [
                (run.successful_hosts / run.total_hosts * 100)
                for run in runs_with_rates
                if run.total_hosts > 0
            ]
            avg_success_rate = (
                sum(success_rates) / len(success_rates) if success_rates else 0
            )

            # Get average duration
            avg_duration = await db.execute(
                select(func.avg(AutomationRun.duration_seconds)).filter(
                    AutomationRun.project_id == project_id,
                    AutomationRun.duration_seconds.isnot(None),
                )
            )
            avg_duration = avg_duration.scalars().first()

            # Get coverage stats
            runs_with_coverage = await db.execute(
                select(AutomationRun).filter(
                    AutomationRun.project_id == project_id,
                    AutomationRun.coverage_report.isnot(None),
                )
            )
            runs_with_coverage = runs_with_coverage.scalars().all()

            total_hosts_managed = (
                sum(run.total_hosts or 0 for run in runs_with_coverage)
                if runs_with_coverage
                else 0
            )

            return AutomationStats(
                total_runs=total_runs,
                successful_runs=successful_runs,
                failed_runs=failed_runs,
                running_runs=running_runs,
                success_rate=(
                    successful_runs / total_runs * 100 if total_runs > 0 else 0
                ),
                average_success_rate=avg_success_rate,
                average_duration=float(avg_duration) if avg_duration else None,
                total_hosts_managed=total_hosts_managed,
            )

        except Exception as e:
            logger.error(
                f"Error getting automation stats for project {project_id}: {e}"
            )
            return None

    @staticmethod
    async def create_from_ansible_callback(
        db: AsyncSession,
        callback_data: AnsibleCallbackData,
        project_id: int,
        user_id: int,
    ) -> Optional[AutomationRun]:
        """
        Create or update automation run from Ansible callback data.

        Args:
            db (AsyncSession): Database session
            callback_data (AnsibleCallbackData): Ansible callback webhook data
            project_id (int): Project ID
            user_id (int): User ID for access control

        Returns:
            Optional[AutomationRun]: Created or updated automation run
        """
        try:
            # Use factory method from model
            run = AutomationRun.from_ansible_callback_data(
                callback_data.dict(), project_id
            )

            # Add to database
            db.add(run)
            await db.commit()
            await db.refresh(run)

            logger.info(f"Created automation run from Ansible callback: {run.id}")
            return run

        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating automation run from Ansible callback: {e}")
            return None

    @staticmethod
    async def get_automation_runs_cursor(
        db: AsyncSession,
        project_id: int,
        user_id: int,
        cursor: Optional[str] = None,
        limit: int = 100,
        status: Optional[AutomationStatus] = None,
    ) -> Dict[str, Any]:
        """
        Get automation runs using cursor-based pagination for better performance.
        
        Cursor-based pagination is more efficient than offset-based pagination
        for large datasets as it doesn't require counting all previous records.
        
        Args:
            db (AsyncSession): Database session
            project_id (int): Project ID to filter by
            user_id (int): User ID for access control
            cursor (Optional[str]): Base64 encoded cursor for pagination
            limit (int): Maximum number of items to return (max 1000)
            status (Optional[AutomationStatus]): Filter by status
            
        Returns:
            Dict containing:
            - automation_runs: List of automation runs
            - next_cursor: Cursor for next page (None if no more data)
            - has_more: Boolean indicating if more data exists
            - total_returned: Number of items in this page
        """
        try:
            # Validate limit
            limit = min(max(limit, 1), 1000)  # Between 1 and 1000
            
            # Parse cursor (base64 encoded ID and timestamp)
            cursor_id = None
            cursor_timestamp = None
            
            if cursor:
                try:
                    import base64
                    import json
                    decoded = json.loads(base64.b64decode(cursor).decode())
                    cursor_id = decoded.get('id')
                    cursor_timestamp = decoded.get('timestamp')
                except Exception:
                    logger.warning(f"Invalid cursor format: {cursor}")
                    cursor = None
            
            # Build query with efficient filtering using indexes
            query = select(AutomationRun).filter(AutomationRun.project_id == project_id)
            
            # Add status filter if provided
            if status:
                query = query.filter(AutomationRun.status == status)
            
            # Apply cursor-based filtering
            if cursor_id and cursor_timestamp:
                # Use indexed timestamp column for efficient cursor navigation
                from datetime import datetime
                cursor_dt = datetime.fromisoformat(cursor_timestamp)
                query = query.filter(
                    or_(
                        AutomationRun.start_time < cursor_dt,
                        and_(
                            AutomationRun.start_time == cursor_dt,
                            AutomationRun.id < cursor_id
                        )
                    )
                )
            
            # Order by indexed column (start_time DESC, id DESC for stable sorting)
            query = query.order_by(
                desc(AutomationRun.start_time),
                desc(AutomationRun.id)
            )
            
            # Fetch limit + 1 to check if there are more records
            query = query.limit(limit + 1)
            
            result = await db.execute(query)
            runs = result.scalars().all()
            
            # Determine if there are more records
            has_more = len(runs) > limit
            if has_more:
                runs = runs[:limit]  # Remove the extra record
            
            # Generate next cursor if there are more records
            next_cursor = None
            if has_more and runs:
                last_run = runs[-1]
                cursor_data = {
                    'id': last_run.id,
                    'timestamp': last_run.start_time.isoformat() if last_run.start_time else None
                }
                import base64
                import json
                next_cursor = base64.b64encode(
                    json.dumps(cursor_data).encode()
                ).decode()
            
            logger.info(
                f"Retrieved {len(runs)} automation runs for project {project_id} "
                f"(cursor: {cursor is not None}, has_more: {has_more})"
            )
            
            return {
                'automation_runs': runs,
                'next_cursor': next_cursor,
                'has_more': has_more,
                'total_returned': len(runs),
                'limit': limit
            }
            
        except Exception as e:
            logger.error(f"Error getting automation runs with cursor: {e}")
            raise
