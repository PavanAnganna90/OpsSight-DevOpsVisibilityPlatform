"""
Background task service for periodic data updates and real-time synchronization.
Handles GitHub Actions polling, pipeline status updates, and data freshness.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.db.database import get_db
from app.models.pipeline import Pipeline, PipelineRun, PipelineStatus
from app.models.project import Project
from app.models.user import User

logger = logging.getLogger(__name__)


class TaskStatus(Enum):
    """Background task status."""

    IDLE = "idle"
    RUNNING = "running"
    ERROR = "error"
    DISABLED = "disabled"


@dataclass
class TaskMetrics:
    """Background task execution metrics."""

    total_runs: int = 0
    successful_runs: int = 0
    failed_runs: int = 0
    last_run_at: Optional[datetime] = None
    last_success_at: Optional[datetime] = None
    last_error_at: Optional[datetime] = None
    last_error_message: Optional[str] = None
    average_duration_seconds: float = 0.0
    total_duration_seconds: float = 0.0


class BackgroundTaskManager:
    """
    Background task manager for periodic data updates.
    Manages multiple concurrent tasks with monitoring and error handling.
    """

    def __init__(self):
        """Initialize background task manager."""
        self.tasks: Dict[str, asyncio.Task] = {}
        self.task_status: Dict[str, TaskStatus] = {}
        self.task_metrics: Dict[str, TaskMetrics] = {}
        self.running = False

        # Configuration
        self.github_sync_interval = 300  # 5 minutes
        self.pipeline_check_interval = 60  # 1 minute
        self.cleanup_interval = 3600  # 1 hour
        self.stale_run_threshold = 7200  # 2 hours

    async def start(self):
        """Start all background tasks."""
        if self.running:
            logger.warning("Background tasks already running")
            return

        self.running = True
        logger.info("Starting background tasks...")

        # Initialize task metrics
        task_names = [
            "github_sync",
            "pipeline_status_check",
            "cleanup_stale_data",
            "connection_health_check",
        ]

        for task_name in task_names:
            self.task_metrics[task_name] = TaskMetrics()

        # Start tasks
        self.tasks["github_sync"] = asyncio.create_task(self._github_sync_task())
        self.tasks["pipeline_status_check"] = asyncio.create_task(
            self._pipeline_status_check_task()
        )
        self.tasks["cleanup_stale_data"] = asyncio.create_task(
            self._cleanup_stale_data_task()
        )
        self.tasks["connection_health_check"] = asyncio.create_task(
            self._connection_health_check_task()
        )

        # Set initial status
        for task_name in self.tasks:
            self.task_status[task_name] = TaskStatus.IDLE

        logger.info(f"Started {len(self.tasks)} background tasks")

    async def stop(self):
        """Stop all background tasks."""
        if not self.running:
            return

        self.running = False
        logger.info("Stopping background tasks...")

        # Cancel all tasks
        for task_name, task in self.tasks.items():
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                logger.info(f"Stopped task: {task_name}")

        self.tasks.clear()
        self.task_status.clear()
        logger.info("All background tasks stopped")

    async def _github_sync_task(self):
        """Periodic GitHub Actions data synchronization."""
        task_name = "github_sync"

        while self.running:
            try:
                self.task_status[task_name] = TaskStatus.RUNNING
                start_time = datetime.now()

                # Import here to avoid circular imports
                from app.services.github.github_actions_service import (
                    github_actions_service,
                )
                from app.services.websocket_service import pipeline_notifier

                # Get database session
                db = next(get_db())

                try:
                    # Find projects with GitHub pipelines
                    projects_with_github = (
                        db.query(Project)
                        .join(Pipeline)
                        .filter(Pipeline.provider == "github_actions")
                        .distinct()
                        .all()
                    )

                    sync_results = []

                    for project in projects_with_github:
                        # Get project owner's GitHub token
                        project_owner = (
                            db.query(User).filter(User.id == project.created_by).first()
                        )

                        if not project_owner or not project_owner.github_access_token:
                            continue

                        # Sync all GitHub pipelines for this project
                        github_pipelines = (
                            db.query(Pipeline)
                            .filter(
                                and_(
                                    Pipeline.project_id == project.id,
                                    Pipeline.provider == "github_actions",
                                )
                            )
                            .all()
                        )

                        for pipeline in github_pipelines:
                            try:
                                # Use enhanced sync method
                                result = await github_actions_service.sync_pipeline_data_enhanced(
                                    db=db,
                                    project_id=project.id,
                                    access_token=project_owner.github_access_token,
                                    repository_url=pipeline.repository_url,
                                    days_back=1,  # Only sync recent data
                                    use_data_processor=True,
                                )

                                sync_results.append(result)

                                # Notify WebSocket connections if new runs were synced
                                if result.get("runs_synced", 0) > 0:
                                    await pipeline_notifier.notify_pipeline_update(
                                        project_id=project.id,
                                        pipeline_data={
                                            "pipeline_id": pipeline.id,
                                            "repository": result.get("repository"),
                                            "new_runs": result.get("runs_synced"),
                                            "sync_type": "background",
                                        },
                                    )

                            except Exception as e:
                                logger.error(
                                    f"Error syncing pipeline {pipeline.id}: {e}"
                                )
                                continue

                    # Update metrics
                    duration = (datetime.now() - start_time).total_seconds()
                    self._update_task_metrics(task_name, True, duration)

                    logger.info(
                        f"GitHub sync completed: {len(sync_results)} pipelines processed"
                    )

                finally:
                    db.close()

                self.task_status[task_name] = TaskStatus.IDLE

            except Exception as e:
                self.task_status[task_name] = TaskStatus.ERROR
                duration = (datetime.now() - start_time).total_seconds()
                self._update_task_metrics(task_name, False, duration, str(e))
                logger.error(f"Error in GitHub sync task: {e}")

            # Wait before next iteration
            await asyncio.sleep(self.github_sync_interval)

    async def _pipeline_status_check_task(self):
        """Check for pipeline status changes and send notifications."""
        task_name = "pipeline_status_check"

        while self.running:
            try:
                self.task_status[task_name] = TaskStatus.RUNNING
                start_time = datetime.now()

                # Import here to avoid circular imports
                from app.services.websocket_service import pipeline_notifier

                db = next(get_db())

                try:
                    # Find recently completed pipeline runs
                    recent_threshold = datetime.now(timezone.utc) - timedelta(
                        seconds=self.pipeline_check_interval
                    )

                    recently_completed_runs = (
                        db.query(PipelineRun)
                        .filter(
                            and_(
                                PipelineRun.completed_at.isnot(None),
                                PipelineRun.completed_at >= recent_threshold,
                                or_(
                                    PipelineRun.status == PipelineStatus.SUCCESS,
                                    PipelineRun.status == PipelineStatus.FAILED,
                                    PipelineRun.status == PipelineStatus.CANCELLED,
                                ),
                            )
                        )
                        .all()
                    )

                    for run in recently_completed_runs:
                        pipeline = (
                            db.query(Pipeline)
                            .filter(Pipeline.id == run.pipeline_id)
                            .first()
                        )

                        if pipeline:
                            # Send completion notification
                            await pipeline_notifier.notify_pipeline_run_completed(
                                project_id=pipeline.project_id,
                                pipeline_id=pipeline.id,
                                run_data={
                                    "id": run.id,
                                    "name": run.name,
                                    "status": run.status.value,
                                    "branch": run.branch,
                                    "commit_sha": run.commit_sha,
                                    "completed_at": (
                                        run.completed_at.isoformat()
                                        if run.completed_at
                                        else None
                                    ),
                                    "duration_seconds": run.duration_seconds,
                                    "external_url": run.external_url,
                                },
                            )

                    # Update metrics
                    duration = (datetime.now() - start_time).total_seconds()
                    self._update_task_metrics(task_name, True, duration)

                    if recently_completed_runs:
                        logger.debug(
                            f"Notified {len(recently_completed_runs)} completed pipeline runs"
                        )

                finally:
                    db.close()

                self.task_status[task_name] = TaskStatus.IDLE

            except Exception as e:
                self.task_status[task_name] = TaskStatus.ERROR
                duration = (datetime.now() - start_time).total_seconds()
                self._update_task_metrics(task_name, False, duration, str(e))
                logger.error(f"Error in pipeline status check task: {e}")

            await asyncio.sleep(self.pipeline_check_interval)

    async def _cleanup_stale_data_task(self):
        """Clean up stale data and optimize database."""
        task_name = "cleanup_stale_data"

        while self.running:
            try:
                self.task_status[task_name] = TaskStatus.RUNNING
                start_time = datetime.now()

                db = next(get_db())

                try:
                    # Clean up stale pipeline runs (older than threshold)
                    stale_threshold = datetime.now(timezone.utc) - timedelta(
                        seconds=self.stale_run_threshold
                    )

                    stale_runs = (
                        db.query(PipelineRun)
                        .filter(
                            and_(
                                PipelineRun.status.in_(
                                    [PipelineStatus.RUNNING, PipelineStatus.PENDING]
                                ),
                                PipelineRun.started_at < stale_threshold,
                            )
                        )
                        .all()
                    )

                    # Mark stale runs as failed
                    for run in stale_runs:
                        run.status = PipelineStatus.FAILED
                        run.completed_at = datetime.now(timezone.utc)
                        if not run.duration_seconds:
                            run.duration_seconds = int(
                                (run.completed_at - run.started_at).total_seconds()
                            )

                    if stale_runs:
                        db.commit()
                        logger.info(f"Cleaned up {len(stale_runs)} stale pipeline runs")

                    # Update metrics
                    duration = (datetime.now() - start_time).total_seconds()
                    self._update_task_metrics(task_name, True, duration)

                finally:
                    db.close()

                self.task_status[task_name] = TaskStatus.IDLE

            except Exception as e:
                self.task_status[task_name] = TaskStatus.ERROR
                duration = (datetime.now() - start_time).total_seconds()
                self._update_task_metrics(task_name, False, duration, str(e))
                logger.error(f"Error in cleanup task: {e}")

            await asyncio.sleep(self.cleanup_interval)

    async def _connection_health_check_task(self):
        """Monitor WebSocket connection health and send system notifications."""
        task_name = "connection_health_check"

        while self.running:
            try:
                self.task_status[task_name] = TaskStatus.RUNNING
                start_time = datetime.now()

                # Import here to avoid circular imports
                from app.services.websocket_service import websocket_manager

                # Get connection statistics
                stats = websocket_manager.get_connection_stats()

                # Log connection health
                logger.debug(
                    f"WebSocket health: {stats['total_connections']} connections, "
                    f"{stats['total_users']} users, "
                    f"{stats['total_project_subscriptions']} project subscriptions"
                )

                # Send periodic system health update
                if stats["total_connections"] > 0:
                    await websocket_manager.broadcast_system_notification(
                        f"System healthy: {stats['total_connections']} active connections",
                        level="info",
                    )

                # Update metrics
                duration = (datetime.now() - start_time).total_seconds()
                self._update_task_metrics(task_name, True, duration)

                self.task_status[task_name] = TaskStatus.IDLE

            except Exception as e:
                self.task_status[task_name] = TaskStatus.ERROR
                duration = (datetime.now() - start_time).total_seconds()
                self._update_task_metrics(task_name, False, duration, str(e))
                logger.error(f"Error in connection health check task: {e}")

            await asyncio.sleep(300)  # Check every 5 minutes

    def _update_task_metrics(
        self,
        task_name: str,
        success: bool,
        duration: float,
        error_message: Optional[str] = None,
    ):
        """Update task execution metrics."""
        if task_name not in self.task_metrics:
            self.task_metrics[task_name] = TaskMetrics()

        metrics = self.task_metrics[task_name]
        metrics.total_runs += 1
        metrics.last_run_at = datetime.now(timezone.utc)
        metrics.total_duration_seconds += duration
        metrics.average_duration_seconds = (
            metrics.total_duration_seconds / metrics.total_runs
        )

        if success:
            metrics.successful_runs += 1
            metrics.last_success_at = datetime.now(timezone.utc)
        else:
            metrics.failed_runs += 1
            metrics.last_error_at = datetime.now(timezone.utc)
            metrics.last_error_message = error_message

    def get_task_status(self) -> Dict[str, Any]:
        """
        Get current status of all background tasks.

        Returns:
            Dict[str, Any]: Task status and metrics
        """
        return {
            "running": self.running,
            "tasks": {
                task_name: {
                    "status": self.task_status.get(task_name, TaskStatus.IDLE).value,
                    "metrics": (
                        {
                            "total_runs": self.task_metrics[task_name].total_runs,
                            "successful_runs": self.task_metrics[
                                task_name
                            ].successful_runs,
                            "failed_runs": self.task_metrics[task_name].failed_runs,
                            "success_rate": (
                                self.task_metrics[task_name].successful_runs
                                / max(self.task_metrics[task_name].total_runs, 1)
                            )
                            * 100,
                            "last_run_at": (
                                self.task_metrics[task_name].last_run_at.isoformat()
                                if self.task_metrics[task_name].last_run_at
                                else None
                            ),
                            "last_success_at": (
                                self.task_metrics[task_name].last_success_at.isoformat()
                                if self.task_metrics[task_name].last_success_at
                                else None
                            ),
                            "average_duration_seconds": self.task_metrics[
                                task_name
                            ].average_duration_seconds,
                            "last_error_message": self.task_metrics[
                                task_name
                            ].last_error_message,
                        }
                        if task_name in self.task_metrics
                        else {}
                    ),
                }
                for task_name in self.tasks
            },
            "configuration": {
                "github_sync_interval": self.github_sync_interval,
                "pipeline_check_interval": self.pipeline_check_interval,
                "cleanup_interval": self.cleanup_interval,
            },
        }


# Create singleton instance
background_task_manager = BackgroundTaskManager()
