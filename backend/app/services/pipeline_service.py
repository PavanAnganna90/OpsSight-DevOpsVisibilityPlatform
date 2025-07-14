"""
Pipeline service for database operations.
Handles pipeline and pipeline run creation, updates, and retrieval operations.
"""

from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_, desc, func
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.pipeline import Pipeline, PipelineRun, PipelineStatus, PipelineType
from app.models.project import Project
from app.schemas.pipeline import (
    PipelineCreate,
    PipelineUpdate,
    PipelineRunCreate,
    PipelineRunUpdate,
    PipelineStats,
    GitHubActionsData,
)

# Configure logging
logger = logging.getLogger(__name__)


class PipelineService:
    """
    Service class for pipeline-related database operations.

    Provides methods for creating, updating, retrieving pipelines and runs
    with proper error handling, logging, and GitHub Actions integration.
    """

    @staticmethod
    async def get_pipeline_by_id(
        db: AsyncSession, pipeline_id: int, user_id: Optional[int] = None
    ) -> Optional[Pipeline]:
        """
        Retrieve a pipeline by its ID with access control.

        Args:
            db (AsyncSession): Database session
            pipeline_id (int): Pipeline ID to search for
            user_id (Optional[int]): User ID for access control check

        Returns:
            Optional[Pipeline]: Pipeline object if found and accessible, None otherwise
        """
        try:
            pipeline = await db.execute(
                select(Pipeline)
                .options(selectinload(Pipeline.project), selectinload(Pipeline.runs))
                .filter(Pipeline.id == pipeline_id)
            )

            pipeline = pipeline.scalars().first()

            # Access control check
            if pipeline and user_id:
                if not pipeline.project.is_accessible_by_user(user_id):
                    logger.warning(
                        f"User {user_id} denied access to pipeline {pipeline_id}"
                    )
                    return None

            if pipeline:
                logger.info(f"Retrieved pipeline by ID: {pipeline_id}")
            return pipeline
        except Exception as e:
            logger.error(f"Error retrieving pipeline by ID {pipeline_id}: {e}")
            return None

    @staticmethod
    async def get_pipelines_by_project(
        db: AsyncSession,
        project_id: int,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        pipeline_type: Optional[PipelineType] = None,
    ) -> List[Pipeline]:
        """
        Retrieve pipelines for a project.

        Args:
            db (AsyncSession): Database session
            project_id (int): Project ID
            user_id (int): User ID for access control
            skip (int): Number of records to skip
            limit (int): Maximum number of records to return
            is_active (Optional[bool]): Filter by active status
            pipeline_type (Optional[PipelineType]): Filter by pipeline type

        Returns:
            List[Pipeline]: List of pipelines
        """
        try:
            # Check project access
            project = await db.execute(select(Project).filter(Project.id == project_id))
            project = project.scalars().first()
            if not project or not project.is_accessible_by_user(user_id):
                logger.warning(f"User {user_id} denied access to project {project_id}")
                return []

            query = select(Pipeline).filter(Pipeline.project_id == project_id)

            if is_active is not None:
                query = query.filter(Pipeline.is_active == is_active)
            if pipeline_type:
                query = query.filter(Pipeline.pipeline_type == pipeline_type)

            pipelines = await db.execute(query.offset(skip).limit(limit))
            pipelines = pipelines.scalars().all()
            logger.info(
                f"Retrieved {len(pipelines)} pipelines for project {project_id}"
            )
            return pipelines
        except Exception as e:
            logger.error(f"Error retrieving pipelines for project {project_id}: {e}")
            return []

    @staticmethod
    async def create_pipeline(
        db: AsyncSession, pipeline_data: PipelineCreate, user_id: int
    ) -> Optional[Pipeline]:
        """
        Create a new pipeline.

        Args:
            db (AsyncSession): Database session
            pipeline_data (PipelineCreate): Pipeline creation data
            user_id (int): User ID for access control

        Returns:
            Optional[Pipeline]: Created pipeline object or None if creation failed
        """
        try:
            # Check project access
            project = await db.execute(
                select(Project).filter(Project.id == pipeline_data.project_id)
            )
            project = project.scalars().first()
            if not project or not project.is_accessible_by_user(user_id):
                logger.warning(
                    f"User {user_id} denied access to project {pipeline_data.project_id}"
                )
                return None

            # Create pipeline instance
            pipeline = Pipeline(
                name=pipeline_data.name,
                description=pipeline_data.description,
                repository_url=pipeline_data.repository_url,
                branch=pipeline_data.branch,
                pipeline_type=pipeline_data.pipeline_type,
                config=pipeline_data.config or {},
                is_active=pipeline_data.is_active,
                project_id=pipeline_data.project_id,
            )

            # Add to database
            db.add(pipeline)
            await db.commit()
            await db.refresh(pipeline)

            logger.info(f"Created new pipeline: {pipeline.name} (ID: {pipeline.id})")
            return pipeline

        except IntegrityError as e:
            await db.rollback()
            logger.error(f"Pipeline creation failed - integrity error: {e}")
            return None
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating pipeline: {e}")
            return None

    @staticmethod
    async def update_pipeline(
        db: AsyncSession, pipeline_id: int, pipeline_data: PipelineUpdate, user_id: int
    ) -> Optional[Pipeline]:
        """
        Update an existing pipeline.

        Args:
            db (AsyncSession): Database session
            pipeline_id (int): Pipeline ID to update
            pipeline_data (PipelineUpdate): Update data
            user_id (int): User ID for access control

        Returns:
            Optional[Pipeline]: Updated pipeline object or None if update failed
        """
        try:
            pipeline = await PipelineService.get_pipeline_by_id(
                db, pipeline_id, user_id
            )
            if not pipeline:
                return None

            # Update fields if provided
            if pipeline_data.name is not None:
                pipeline.name = pipeline_data.name
            if pipeline_data.description is not None:
                pipeline.description = pipeline_data.description
            if pipeline_data.branch is not None:
                pipeline.branch = pipeline_data.branch
            if pipeline_data.pipeline_type is not None:
                pipeline.pipeline_type = pipeline_data.pipeline_type
            if pipeline_data.config is not None:
                pipeline.config = pipeline_data.config
            if pipeline_data.is_active is not None:
                pipeline.is_active = pipeline_data.is_active

            # Save changes
            await db.commit()
            await db.refresh(pipeline)

            logger.info(f"Updated pipeline: {pipeline.name} (ID: {pipeline.id})")
            return pipeline

        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating pipeline {pipeline_id}: {e}")
            return None

    @staticmethod
    async def create_pipeline_run(
        db: AsyncSession, run_data: PipelineRunCreate, user_id: int
    ) -> Optional[PipelineRun]:
        """
        Create a new pipeline run.

        Args:
            db (AsyncSession): Database session
            run_data (PipelineRunCreate): Pipeline run creation data
            user_id (int): User ID for access control

        Returns:
            Optional[PipelineRun]: Created pipeline run object or None if creation failed
        """
        try:
            # Check pipeline access
            pipeline = await PipelineService.get_pipeline_by_id(
                db, run_data.pipeline_id, user_id
            )
            if not pipeline:
                return None

            # Create pipeline run instance
            run = PipelineRun(
                pipeline_id=run_data.pipeline_id,
                run_number=run_data.run_number,
                commit_sha=run_data.commit_sha,
                commit_message=run_data.commit_message,
                triggered_by=run_data.triggered_by,
                trigger_event=run_data.trigger_event,
                status=PipelineStatus.PENDING,
            )

            # Add to database
            db.add(run)
            await db.commit()
            await db.refresh(run)

            logger.info(
                f"Created new pipeline run: {run.id} for pipeline {pipeline.name}"
            )
            return run

        except IntegrityError as e:
            await db.rollback()
            logger.error(f"Pipeline run creation failed - integrity error: {e}")
            return None
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating pipeline run: {e}")
            return None

    @staticmethod
    async def update_pipeline_run(
        db: AsyncSession, run_id: int, run_data: PipelineRunUpdate, user_id: int
    ) -> Optional[PipelineRun]:
        """
        Update an existing pipeline run.

        Args:
            db (AsyncSession): Database session
            run_id (int): Pipeline run ID to update
            run_data (PipelineRunUpdate): Update data
            user_id (int): User ID for access control

        Returns:
            Optional[PipelineRun]: Updated pipeline run object or None if update failed
        """
        try:
            run = await db.execute(
                select(PipelineRun)
                .options(
                    selectinload(PipelineRun.pipeline).selectinload(Pipeline.project)
                )
                .filter(PipelineRun.id == run_id)
            )
            run = run.scalars().first()

            if not run or not run.pipeline.project.is_accessible_by_user(user_id):
                return None

            # Update fields if provided
            if run_data.status is not None:
                run.status = run_data.status
            if run_data.started_at is not None:
                run.started_at = run_data.started_at
            if run_data.finished_at is not None:
                run.finished_at = run_data.finished_at
            if run_data.logs_url is not None:
                run.logs_url = run_data.logs_url
            if run_data.artifacts_url is not None:
                run.artifacts_url = run_data.artifacts_url
            if run_data.test_results is not None:
                run.test_results = run_data.test_results
            if run_data.deployment_info is not None:
                run.deployment_info = run_data.deployment_info
            if run_data.resource_usage is not None:
                run.resource_usage = run_data.resource_usage
            if run_data.error_message is not None:
                run.error_message = run_data.error_message

            # Calculate duration if both timestamps are set
            if run.started_at and run.finished_at:
                run.duration_seconds = int(
                    (run.finished_at - run.started_at).total_seconds()
                )

            # Save changes
            await db.commit()
            await db.refresh(run)

            logger.info(f"Updated pipeline run: {run.id}")
            return run

        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating pipeline run {run_id}: {e}")
            return None

    @staticmethod
    async def get_pipeline_stats(
        db: AsyncSession, pipeline_id: int, user_id: int
    ) -> Optional[PipelineStats]:
        """
        Get pipeline statistics.

        Args:
            db (AsyncSession): Database session
            pipeline_id (int): Pipeline ID
            user_id (int): User ID for access control

        Returns:
            Optional[PipelineStats]: Pipeline statistics or None if not accessible
        """
        try:
            pipeline = await PipelineService.get_pipeline_by_id(
                db, pipeline_id, user_id
            )
            if not pipeline:
                return None

            # Get stats for last 30 days
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)

            # Total runs
            total_runs = await db.execute(
                select(func.count(PipelineRun.id)).filter(
                    PipelineRun.pipeline_id == pipeline_id
                )
            )
            total_runs = total_runs.scalars().first() or 0

            # Success/failure counts
            success_count = await db.execute(
                select(func.count(PipelineRun.id)).filter(
                    PipelineRun.pipeline_id == pipeline_id,
                    PipelineRun.status == PipelineStatus.SUCCESS,
                )
            )
            success_count = success_count.scalars().first() or 0

            failure_count = await db.execute(
                select(func.count(PipelineRun.id)).filter(
                    PipelineRun.pipeline_id == pipeline_id,
                    PipelineRun.status == PipelineStatus.FAILURE,
                )
            )
            failure_count = failure_count.scalars().first() or 0

            # Last 30 days stats
            runs_last_30_days = await db.execute(
                select(func.count(PipelineRun.id)).filter(
                    PipelineRun.pipeline_id == pipeline_id,
                    PipelineRun.created_at >= thirty_days_ago,
                )
            )
            runs_last_30_days = runs_last_30_days.scalars().first() or 0

            success_last_30_days = await db.execute(
                select(func.count(PipelineRun.id)).filter(
                    PipelineRun.pipeline_id == pipeline_id,
                    PipelineRun.status == PipelineStatus.SUCCESS,
                    PipelineRun.created_at >= thirty_days_ago,
                )
            )
            success_last_30_days = success_last_30_days.scalars().first() or 0

            # Average duration
            avg_duration = await db.execute(
                select(func.avg(PipelineRun.duration_seconds)).filter(
                    PipelineRun.pipeline_id == pipeline_id,
                    PipelineRun.duration_seconds.isnot(None),
                )
            )
            avg_duration = avg_duration.scalars().first()

            # Calculate rates
            success_rate = (success_count / total_runs * 100) if total_runs > 0 else 0
            failure_rate = (failure_count / total_runs * 100) if total_runs > 0 else 0
            success_rate_last_30_days = (
                (success_last_30_days / runs_last_30_days * 100)
                if runs_last_30_days > 0
                else 0
            )

            return PipelineStats(
                total_runs=total_runs,
                success_rate=success_rate,
                failure_rate=failure_rate,
                average_duration=float(avg_duration) if avg_duration else None,
                runs_last_30_days=runs_last_30_days,
                success_rate_last_30_days=success_rate_last_30_days,
            )

        except Exception as e:
            logger.error(f"Error getting pipeline stats for {pipeline_id}: {e}")
            return None

    @staticmethod
    async def create_from_github_actions(
        db: AsyncSession, github_data: GitHubActionsData, project_id: int, user_id: int
    ) -> Optional[PipelineRun]:
        """
        Create or update pipeline run from GitHub Actions webhook data.

        Args:
            db (AsyncSession): Database session
            github_data (GitHubActionsData): GitHub Actions webhook data
            project_id (int): Project ID
            user_id (int): User ID for access control

        Returns:
            Optional[PipelineRun]: Created or updated pipeline run
        """
        try:
            workflow_run = github_data.workflow_run
            repository = github_data.repository

            # Find or create pipeline
            pipeline = await db.execute(
                select(Pipeline).filter(
                    Pipeline.project_id == project_id,
                    Pipeline.repository_url == repository["html_url"],
                    Pipeline.name == workflow_run["name"],
                )
            )
            pipeline = pipeline.scalars().first()

            if not pipeline:
                # Create new pipeline
                pipeline_data = PipelineCreate(
                    name=workflow_run["name"],
                    repository_url=repository["html_url"],
                    branch=workflow_run["head_branch"],
                    pipeline_type=PipelineType.GITHUB_ACTIONS,
                    project_id=project_id,
                )
                pipeline = await PipelineService.create_pipeline(
                    db, pipeline_data, user_id
                )
                if not pipeline:
                    return None

            # Use factory method from model
            run = PipelineRun.from_github_actions_data(workflow_run, pipeline.id)

            # Add to database
            db.add(run)
            await db.commit()
            await db.refresh(run)

            logger.info(f"Created pipeline run from GitHub Actions: {run.id}")
            return run

        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating pipeline run from GitHub Actions: {e}")
            return None
