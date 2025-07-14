"""
Infrastructure change service for database operations.
Handles Terraform deployment creation, updates, retrieval, and cost analysis operations.
"""

from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_, desc, func
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.infrastructure_change import (
    InfrastructureChange,
    ChangeStatus,
    ChangeType,
    ResourceType,
)
from app.models.project import Project
from app.schemas.infrastructure_change import (
    InfrastructureChangeCreate,
    InfrastructureChangeUpdate,
    InfrastructureStats,
    TerraformPlan,
    CostEstimate,
)

# Configure logging
logger = logging.getLogger(__name__)


class InfrastructureChangeService:
    """
    Service class for infrastructure change-related database operations.

    Provides methods for creating, updating, retrieving infrastructure changes
    with proper error handling, logging, and Terraform integration.
    """

    @staticmethod
    async def get_infrastructure_change_by_id(
        db: AsyncSession, change_id: int, user_id: Optional[int] = None
    ) -> Optional[InfrastructureChange]:
        """
        Retrieve an infrastructure change by its ID with access control.

        Args:
            db (AsyncSession): Database session
            change_id (int): Infrastructure change ID to search for
            user_id (Optional[int]): User ID for access control check

        Returns:
            Optional[InfrastructureChange]: Infrastructure change object if found and accessible, None otherwise
        """
        try:
            change = await db.execute(
                select(InfrastructureChange)
                .options(selectinload(InfrastructureChange.project))
                .filter(InfrastructureChange.id == change_id)
            )

            change = change.scalars().first()

            # Access control check
            if change and user_id:
                if not change.project.is_accessible_by_user(user_id):
                    logger.warning(
                        f"User {user_id} denied access to infrastructure change {change_id}"
                    )
                    return None

            if change:
                logger.info(f"Retrieved infrastructure change by ID: {change_id}")
            return change
        except Exception as e:
            logger.error(
                f"Error retrieving infrastructure change by ID {change_id}: {e}"
            )
            return None

    @staticmethod
    async def get_infrastructure_changes_by_project(
        db: AsyncSession,
        project_id: int,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[ChangeStatus] = None,
        change_type: Optional[ChangeType] = None,
        environment: Optional[str] = None,
    ) -> List[InfrastructureChange]:
        """
        Retrieve infrastructure changes for a project.

        Args:
            db (AsyncSession): Database session
            project_id (int): Project ID
            user_id (int): User ID for access control
            skip (int): Number of records to skip
            limit (int): Maximum number of records to return
            status (Optional[ChangeStatus]): Filter by change status
            change_type (Optional[ChangeType]): Filter by change type
            environment (Optional[str]): Filter by target environment

        Returns:
            List[InfrastructureChange]: List of infrastructure changes
        """
        try:
            # Check project access
            project = await db.execute(select(Project).filter(Project.id == project_id))
            project = project.scalars().first()
            if not project or not project.is_accessible_by_user(user_id):
                logger.warning(f"User {user_id} denied access to project {project_id}")
                return []

            query = select(InfrastructureChange).filter(
                InfrastructureChange.project_id == project_id
            )

            if status:
                query = query.filter(InfrastructureChange.status == status)
            if change_type:
                query = query.filter(InfrastructureChange.change_type == change_type)
            if environment:
                query = query.filter(
                    InfrastructureChange.target_environment.ilike(f"%{environment}%")
                )

            changes = await db.execute(
                query.order_by(desc(InfrastructureChange.created_at))
                .offset(skip)
                .limit(limit)
            )
            changes = changes.scalars().all()
            logger.info(
                f"Retrieved {len(changes)} infrastructure changes for project {project_id}"
            )
            return changes
        except Exception as e:
            logger.error(
                f"Error retrieving infrastructure changes for project {project_id}: {e}"
            )
            return []

    @staticmethod
    async def create_infrastructure_change(
        db: AsyncSession, change_data: InfrastructureChangeCreate, user_id: int
    ) -> Optional[InfrastructureChange]:
        """
        Create a new infrastructure change.

        Args:
            db (AsyncSession): Database session
            change_data (InfrastructureChangeCreate): Infrastructure change creation data
            user_id (int): User ID for access control

        Returns:
            Optional[InfrastructureChange]: Created infrastructure change object or None if creation failed
        """
        try:
            # Check project access
            project = await db.execute(
                select(Project).filter(Project.id == change_data.project_id)
            )
            project = project.scalars().first()
            if not project or not project.is_accessible_by_user(user_id):
                logger.warning(
                    f"User {user_id} denied access to project {change_data.project_id}"
                )
                return None

            # Create infrastructure change instance
            change = InfrastructureChange(
                name=change_data.name,
                description=change_data.description,
                change_type=change_data.change_type,
                terraform_version=change_data.terraform_version,
                workspace=change_data.workspace,
                target_environment=change_data.target_environment,
                config_path=change_data.config_path,
                variables=change_data.variables or {},
                auto_approve=change_data.auto_approve,
                destroy_mode=change_data.destroy_mode,
                status=ChangeStatus.PENDING,
                project_id=change_data.project_id,
            )

            # Add to database
            db.add(change)
            await db.commit()
            await db.refresh(change)

            logger.info(
                f"Created new infrastructure change: {change.name} (ID: {change.id})"
            )
            return change

        except IntegrityError as e:
            await db.rollback()
            logger.error(
                f"Infrastructure change creation failed - integrity error: {e}"
            )
            return None
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating infrastructure change: {e}")
            return None

    @staticmethod
    async def update_infrastructure_change(
        db: AsyncSession,
        change_id: int,
        change_data: InfrastructureChangeUpdate,
        user_id: int,
    ) -> Optional[InfrastructureChange]:
        """
        Update an existing infrastructure change.

        Args:
            db (AsyncSession): Database session
            change_id (int): Infrastructure change ID to update
            change_data (InfrastructureChangeUpdate): Update data
            user_id (int): User ID for access control

        Returns:
            Optional[InfrastructureChange]: Updated infrastructure change object or None if update failed
        """
        try:
            change = await InfrastructureChangeService.get_infrastructure_change_by_id(
                db, change_id, user_id
            )
            if not change:
                return None

            # Update fields if provided
            if change_data.status is not None:
                change.status = change_data.status
            if change_data.started_at is not None:
                change.started_at = change_data.started_at
            if change_data.finished_at is not None:
                change.finished_at = change_data.finished_at
            if change_data.plan_output is not None:
                change.plan_output = change_data.plan_output
            if change_data.apply_output is not None:
                change.apply_output = change_data.apply_output
            if change_data.resource_changes is not None:
                change.resource_changes = change_data.resource_changes
            if change_data.cost_estimate is not None:
                change.cost_estimate = change_data.cost_estimate
            if change_data.approval_required is not None:
                change.approval_required = change_data.approval_required
            if change_data.approved_by is not None:
                change.approved_by = change_data.approved_by
            if change_data.approved_at is not None:
                change.approved_at = change_data.approved_at
            if change_data.error_message is not None:
                change.error_message = change_data.error_message

            # Calculate duration if both timestamps are set
            if change.started_at and change.finished_at:
                change.duration_seconds = int(
                    (change.finished_at - change.started_at).total_seconds()
                )

            # Save changes
            await db.commit()
            await db.refresh(change)

            logger.info(
                f"Updated infrastructure change: {change.name} (ID: {change.id})"
            )
            return change

        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating infrastructure change {change_id}: {e}")
            return None

    @staticmethod
    async def approve_infrastructure_change(
        db: AsyncSession,
        change_id: int,
        user_id: int,
        approval_note: Optional[str] = None,
    ) -> bool:
        """
        Approve an infrastructure change that requires approval.

        Args:
            db (AsyncSession): Database session
            change_id (int): Infrastructure change ID to approve
            user_id (int): User ID providing approval
            approval_note (Optional[str]): Optional approval note

        Returns:
            bool: True if approval successful, False otherwise
        """
        try:
            change = await InfrastructureChangeService.get_infrastructure_change_by_id(
                db, change_id, user_id
            )
            if not change:
                return False

            # Check if change requires approval and is in pending state
            if not change.approval_required or change.status != ChangeStatus.PENDING:
                logger.warning(
                    f"Infrastructure change {change_id} does not require approval or is not pending"
                )
                return False

            # Update approval fields
            change.approved_by = user_id
            change.approved_at = datetime.utcnow()
            change.status = ChangeStatus.APPROVED

            # Add approval note to metadata if provided
            if approval_note:
                if not change.metadata:
                    change.metadata = {}
                change.metadata["approval_note"] = approval_note

            await db.commit()
            logger.info(
                f"Approved infrastructure change: {change.name} (ID: {change.id}) by user {user_id}"
            )
            return True

        except Exception as e:
            await db.rollback()
            logger.error(f"Error approving infrastructure change {change_id}: {e}")
            return False

    @staticmethod
    async def get_infrastructure_stats(
        db: AsyncSession, project_id: int, user_id: int
    ) -> Optional[InfrastructureStats]:
        """
        Get infrastructure statistics for a project.

        Args:
            db (AsyncSession): Database session
            project_id (int): Project ID
            user_id (int): User ID for access control

        Returns:
            Optional[InfrastructureStats]: Infrastructure statistics or None if not accessible
        """
        try:
            # Check project access
            project = await db.execute(select(Project).filter(Project.id == project_id))
            project = project.scalars().first()
            if not project or not project.is_accessible_by_user(user_id):
                logger.warning(f"User {user_id} denied access to project {project_id}")
                return None

            # Get change counts by status
            total_changes = await db.execute(
                select(func.count(InfrastructureChange.id)).filter(
                    InfrastructureChange.project_id == project_id
                )
            )
            total_changes = total_changes.scalars().first() or 0

            successful_changes = await db.execute(
                select(func.count(InfrastructureChange.id)).filter(
                    InfrastructureChange.project_id == project_id,
                    InfrastructureChange.status == ChangeStatus.APPLIED,
                )
            )
            successful_changes = successful_changes.scalars().first() or 0

            failed_changes = await db.execute(
                select(func.count(InfrastructureChange.id)).filter(
                    InfrastructureChange.project_id == project_id,
                    InfrastructureChange.status == ChangeStatus.FAILED,
                )
            )
            failed_changes = failed_changes.scalars().first() or 0

            pending_approval = await db.execute(
                select(func.count(InfrastructureChange.id)).filter(
                    InfrastructureChange.project_id == project_id,
                    InfrastructureChange.status == ChangeStatus.PENDING,
                    InfrastructureChange.approval_required == True,
                )
            )
            pending_approval = pending_approval.scalars().first() or 0

            # Calculate total estimated cost
            changes_with_cost = await db.execute(
                select(InfrastructureChange).filter(
                    InfrastructureChange.project_id == project_id,
                    InfrastructureChange.cost_estimate.isnot(None),
                )
            )
            changes_with_cost = changes_with_cost.scalars().all()

            total_estimated_cost = sum(
                float(change.cost_estimate.get("monthly_cost", 0))
                for change in changes_with_cost
                if change.cost_estimate
            )

            # Get average duration
            avg_duration = await db.execute(
                select(func.avg(InfrastructureChange.duration_seconds)).filter(
                    InfrastructureChange.project_id == project_id,
                    InfrastructureChange.duration_seconds.isnot(None),
                )
            )
            avg_duration = avg_duration.scalars().first()

            return InfrastructureStats(
                total_changes=total_changes,
                successful_changes=successful_changes,
                failed_changes=failed_changes,
                pending_approval=pending_approval,
                success_rate=(
                    successful_changes / total_changes * 100 if total_changes > 0 else 0
                ),
                average_duration=float(avg_duration) if avg_duration else None,
                total_estimated_cost=total_estimated_cost,
            )

        except Exception as e:
            logger.error(
                f"Error getting infrastructure stats for project {project_id}: {e}"
            )
            return None

    @staticmethod
    async def create_from_terraform_plan(
        db: AsyncSession, plan_data: TerraformPlan, project_id: int, user_id: int
    ) -> Optional[InfrastructureChange]:
        """
        Create infrastructure change from Terraform plan data.

        Args:
            db (AsyncSession): Database session
            plan_data (TerraformPlan): Terraform plan webhook data
            project_id (int): Project ID
            user_id (int): User ID for access control

        Returns:
            Optional[InfrastructureChange]: Created infrastructure change
        """
        try:
            # Use factory method from model
            change = InfrastructureChange.from_terraform_plan(
                plan_data.dict(), project_id
            )

            # Add to database
            db.add(change)
            await db.commit()
            await db.refresh(change)

            logger.info(
                f"Created infrastructure change from Terraform plan: {change.id}"
            )
            return change

        except Exception as e:
            await db.rollback()
            logger.error(
                f"Error creating infrastructure change from Terraform plan: {e}"
            )
            return None
