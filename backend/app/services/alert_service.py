"""
Alert service for database operations.
Handles alert creation, updates, retrieval, and notification operations.
"""

from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_, desc, func
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.alert import Alert, AlertSeverity, AlertStatus, AlertChannel
from app.models.project import Project
from app.schemas.alert import (
    AlertCreate,
    AlertUpdate,
    AlertNotificationCreate,
    AlertRuleCreate,
    AlertRuleUpdate,
    AlertStats,
    AlertSummary,
)

# Configure logging
logger = logging.getLogger(__name__)


class AlertService:
    """
    Service class for alert-related database operations.

    Provides methods for creating, updating, retrieving alerts
    with proper error handling, logging, and notification support.
    """

    @staticmethod
    async def get_alert_by_id(
        db: AsyncSession, alert_id: int, user_id: Optional[int] = None
    ) -> Optional[Alert]:
        """
        Retrieve an alert by its ID with access control.

        Args:
            db (AsyncSession): Database session
            alert_id (int): Alert ID to search for
            user_id (Optional[int]): User ID for access control check

        Returns:
            Optional[Alert]: Alert object if found and accessible, None otherwise
        """
        try:
            alert = await db.execute(
                select(Alert)
                .options(
                    selectinload(Alert.project),
                    selectinload(Alert.notifications),
                    selectinload(Alert.rules),
                )
                .filter(Alert.id == alert_id)
            )

            alert = alert.scalars().first()

            # Access control check
            if alert and user_id:
                if not alert.project.is_accessible_by_user(user_id):
                    logger.warning(f"User {user_id} denied access to alert {alert_id}")
                    return None

            if alert:
                logger.info(f"Retrieved alert by ID: {alert_id}")
            return alert
        except Exception as e:
            logger.error(f"Error retrieving alert by ID {alert_id}: {e}")
            return None

    @staticmethod
    async def get_alerts_by_project(
        db: AsyncSession,
        project_id: int,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[AlertStatus] = None,
        severity: Optional[AlertSeverity] = None,
        source: Optional[str] = None,
    ) -> List[Alert]:
        """
        Retrieve alerts for a project.

        Args:
            db (AsyncSession): Database session
            project_id (int): Project ID
            user_id (int): User ID for access control
            skip (int): Number of records to skip
            limit (int): Maximum number of records to return
            status (Optional[AlertStatus]): Filter by alert status
            severity (Optional[AlertSeverity]): Filter by severity
            source (Optional[str]): Filter by source system

        Returns:
            List[Alert]: List of alerts
        """
        try:
            # Check project access
            project = await db.execute(select(Project).filter(Project.id == project_id))
            project = project.scalars().first()
            if not project or not project.is_accessible_by_user(user_id):
                logger.warning(f"User {user_id} denied access to project {project_id}")
                return []

            query = select(Alert).filter(Alert.project_id == project_id)

            if status:
                query = query.filter(Alert.status == status)
            if severity:
                query = query.filter(Alert.severity == severity)
            if source:
                query = query.filter(Alert.source.ilike(f"%{source}%"))

            alerts = await db.execute(
                query.order_by(desc(Alert.created_at)).offset(skip).limit(limit)
            )
            alerts = alerts.scalars().all()
            logger.info(f"Retrieved {len(alerts)} alerts for project {project_id}")
            return alerts
        except Exception as e:
            logger.error(f"Error retrieving alerts for project {project_id}: {e}")
            return []

    @staticmethod
    async def create_alert(
        db: AsyncSession, alert_data: AlertCreate, user_id: int
    ) -> Optional[Alert]:
        """
        Create a new alert.

        Args:
            db (AsyncSession): Database session
            alert_data (AlertCreate): Alert creation data
            user_id (int): User ID for access control

        Returns:
            Optional[Alert]: Created alert object or None if creation failed
        """
        try:
            # Check project access
            project = await db.execute(
                select(Project).filter(Project.id == alert_data.project_id)
            )
            project = project.scalars().first()
            if not project or not project.is_accessible_by_user(user_id):
                logger.warning(
                    f"User {user_id} denied access to project {alert_data.project_id}"
                )
                return None

            # Create alert instance
            alert = Alert(
                title=alert_data.title,
                description=alert_data.description,
                severity=alert_data.severity,
                status=AlertStatus.ACTIVE,
                source=alert_data.source,
                source_id=alert_data.source_id,
                tags=alert_data.tags or [],
                metadata=alert_data.metadata or {},
                auto_resolve=alert_data.auto_resolve,
                suppress_notifications=alert_data.suppress_notifications,
                project_id=alert_data.project_id,
            )

            # Add to database
            db.add(alert)
            await db.commit()
            await db.refresh(alert)

            logger.info(f"Created new alert: {alert.title} (ID: {alert.id})")
            return alert

        except IntegrityError as e:
            await db.rollback()
            logger.error(f"Alert creation failed - integrity error: {e}")
            return None
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating alert: {e}")
            return None

    @staticmethod
    async def update_alert(
        db: AsyncSession, alert_id: int, alert_data: AlertUpdate, user_id: int
    ) -> Optional[Alert]:
        """
        Update an existing alert.

        Args:
            db (AsyncSession): Database session
            alert_id (int): Alert ID to update
            alert_data (AlertUpdate): Update data
            user_id (int): User ID for access control

        Returns:
            Optional[Alert]: Updated alert object or None if update failed
        """
        try:
            alert = await AlertService.get_alert_by_id(db, alert_id, user_id)
            if not alert:
                return None

            # Update fields if provided
            if alert_data.title is not None:
                alert.title = alert_data.title
            if alert_data.description is not None:
                alert.description = alert_data.description
            if alert_data.severity is not None:
                alert.severity = alert_data.severity
            if alert_data.status is not None:
                alert.status = alert_data.status
            if alert_data.tags is not None:
                alert.tags = alert_data.tags
            if alert_data.metadata is not None:
                alert.metadata = alert_data.metadata
            if alert_data.auto_resolve is not None:
                alert.auto_resolve = alert_data.auto_resolve
            if alert_data.suppress_notifications is not None:
                alert.suppress_notifications = alert_data.suppress_notifications

            # Save changes
            await db.commit()
            await db.refresh(alert)

            logger.info(f"Updated alert: {alert.title} (ID: {alert.id})")
            return alert

        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating alert {alert_id}: {e}")
            return None

    @staticmethod
    async def acknowledge_alert(db: AsyncSession, alert_id: int, user_id: int) -> bool:
        """
        Acknowledge an alert using the model method.

        Args:
            db (AsyncSession): Database session
            alert_id (int): Alert ID to acknowledge
            user_id (int): User ID for access control

        Returns:
            bool: True if acknowledgment successful, False otherwise
        """
        try:
            alert = await AlertService.get_alert_by_id(db, alert_id, user_id)
            if not alert:
                return False

            # Use model method
            success = alert.acknowledge()
            if success:
                await db.commit()
                logger.info(f"Acknowledged alert: {alert.title} (ID: {alert.id})")
            else:
                logger.warning(
                    f"Alert {alert_id} cannot be acknowledged in current state"
                )

            return success

        except Exception as e:
            await db.rollback()
            logger.error(f"Error acknowledging alert {alert_id}: {e}")
            return False

    @staticmethod
    async def resolve_alert(
        db: AsyncSession,
        alert_id: int,
        user_id: int,
        resolution_note: Optional[str] = None,
    ) -> bool:
        """
        Resolve an alert using the model method.

        Args:
            db (AsyncSession): Database session
            alert_id (int): Alert ID to resolve
            user_id (int): User ID for access control
            resolution_note (Optional[str]): Optional resolution note

        Returns:
            bool: True if resolution successful, False otherwise
        """
        try:
            alert = await AlertService.get_alert_by_id(db, alert_id, user_id)
            if not alert:
                return False

            # Use model method
            success = alert.resolve(resolution_note)
            if success:
                await db.commit()
                logger.info(f"Resolved alert: {alert.title} (ID: {alert.id})")
            else:
                logger.warning(f"Alert {alert_id} cannot be resolved in current state")

            return success

        except Exception as e:
            await db.rollback()
            logger.error(f"Error resolving alert {alert_id}: {e}")
            return False

    @staticmethod
    async def suppress_alert(
        db: AsyncSession,
        alert_id: int,
        user_id: int,
        duration_minutes: int,
        reason: Optional[str] = None,
    ) -> bool:
        """
        Suppress an alert using the model method.

        Args:
            db (AsyncSession): Database session
            alert_id (int): Alert ID to suppress
            user_id (int): User ID for access control
            duration_minutes (int): Suppression duration in minutes
            reason (Optional[str]): Optional suppression reason

        Returns:
            bool: True if suppression successful, False otherwise
        """
        try:
            alert = await AlertService.get_alert_by_id(db, alert_id, user_id)
            if not alert:
                return False

            # Use model method
            success = alert.suppress(duration_minutes, reason)
            if success:
                await db.commit()
                logger.info(
                    f"Suppressed alert: {alert.title} (ID: {alert.id}) for {duration_minutes} minutes"
                )
            else:
                logger.warning(
                    f"Alert {alert_id} cannot be suppressed in current state"
                )

            return success

        except Exception as e:
            await db.rollback()
            logger.error(f"Error suppressing alert {alert_id}: {e}")
            return False

    @staticmethod
    async def get_active_alerts(
        db: AsyncSession,
        project_id: int,
        user_id: int,
        severity_filter: Optional[List[AlertSeverity]] = None,
    ) -> List[Alert]:
        """
        Get active alerts for a project.

        Args:
            db (AsyncSession): Database session
            project_id (int): Project ID
            user_id (int): User ID for access control
            severity_filter (Optional[List[AlertSeverity]]): Filter by severities

        Returns:
            List[Alert]: List of active alerts
        """
        try:
            # Check project access
            project = await db.execute(select(Project).filter(Project.id == project_id))
            project = project.scalars().first()
            if not project or not project.is_accessible_by_user(user_id):
                logger.warning(f"User {user_id} denied access to project {project_id}")
                return []

            query = select(Alert).filter(
                Alert.project_id == project_id, Alert.status == AlertStatus.ACTIVE
            )

            if severity_filter:
                query = query.filter(Alert.severity.in_(severity_filter))

            alerts = await db.execute(
                query.order_by(desc(Alert.severity), desc(Alert.created_at))
            )
            alerts = alerts.scalars().all()
            logger.info(
                f"Retrieved {len(alerts)} active alerts for project {project_id}"
            )
            return alerts

        except Exception as e:
            logger.error(
                f"Error retrieving active alerts for project {project_id}: {e}"
            )
            return []

    @staticmethod
    async def get_alert_summary(
        db: AsyncSession, project_id: int, user_id: int
    ) -> Optional[AlertSummary]:
        """
        Get alert summary statistics for a project.

        Args:
            db (AsyncSession): Database session
            project_id (int): Project ID
            user_id (int): User ID for access control

        Returns:
            Optional[AlertSummary]: Alert summary or None if not accessible
        """
        try:
            # Check project access
            project = await db.execute(select(Project).filter(Project.id == project_id))
            project = project.scalars().first()
            if not project or not project.is_accessible_by_user(user_id):
                logger.warning(f"User {user_id} denied access to project {project_id}")
                return None

            # Get counts by status
            total_alerts = await db.execute(
                select(func.count(Alert.id)).filter(Alert.project_id == project_id)
            )
            total_alerts = total_alerts.scalars().first() or 0

            active_count = await db.execute(
                select(func.count(Alert.id)).filter(
                    Alert.project_id == project_id, Alert.status == AlertStatus.ACTIVE
                )
            )
            active_count = active_count.scalars().first() or 0

            acknowledged_count = await db.execute(
                select(func.count(Alert.id)).filter(
                    Alert.project_id == project_id,
                    Alert.status == AlertStatus.ACKNOWLEDGED,
                )
            )
            acknowledged_count = acknowledged_count.scalars().first() or 0

            resolved_count = await db.execute(
                select(func.count(Alert.id)).filter(
                    Alert.project_id == project_id, Alert.status == AlertStatus.RESOLVED
                )
            )
            resolved_count = resolved_count.scalars().first() or 0

            suppressed_count = await db.execute(
                select(func.count(Alert.id)).filter(
                    Alert.project_id == project_id,
                    Alert.status == AlertStatus.SUPPRESSED,
                )
            )
            suppressed_count = suppressed_count.scalars().first() or 0

            # Get counts by severity (active only)
            critical_count = await db.execute(
                select(func.count(Alert.id)).filter(
                    Alert.project_id == project_id,
                    Alert.status == AlertStatus.ACTIVE,
                    Alert.severity == AlertSeverity.CRITICAL,
                )
            )
            critical_count = critical_count.scalars().first() or 0

            high_count = await db.execute(
                select(func.count(Alert.id)).filter(
                    Alert.project_id == project_id,
                    Alert.status == AlertStatus.ACTIVE,
                    Alert.severity == AlertSeverity.HIGH,
                )
            )
            high_count = high_count.scalars().first() or 0

            medium_count = await db.execute(
                select(func.count(Alert.id)).filter(
                    Alert.project_id == project_id,
                    Alert.status == AlertStatus.ACTIVE,
                    Alert.severity == AlertSeverity.MEDIUM,
                )
            )
            medium_count = medium_count.scalars().first() or 0

            low_count = await db.execute(
                select(func.count(Alert.id)).filter(
                    Alert.project_id == project_id,
                    Alert.status == AlertStatus.ACTIVE,
                    Alert.severity == AlertSeverity.LOW,
                )
            )
            low_count = low_count.scalars().first() or 0

            # Get latest alert
            latest_alert = await db.execute(
                select(Alert)
                .filter(Alert.project_id == project_id)
                .order_by(desc(Alert.created_at))
            )
            latest_alert = latest_alert.scalars().first()

            return AlertSummary(
                total_alerts=total_alerts,
                active_count=active_count,
                acknowledged_count=acknowledged_count,
                resolved_count=resolved_count,
                suppressed_count=suppressed_count,
                critical_count=critical_count,
                high_count=high_count,
                medium_count=medium_count,
                low_count=low_count,
                latest_alert_time=latest_alert.created_at if latest_alert else None,
                latest_alert_title=latest_alert.title if latest_alert else None,
            )

        except Exception as e:
            logger.error(f"Error getting alert summary for project {project_id}: {e}")
            return None
