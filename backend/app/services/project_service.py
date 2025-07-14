"""
Project service for database operations.
Handles project creation, updates, retrieval, and access control operations.
"""

from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_, desc
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.project import Project
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectAccessCreate
from app.schemas.project import ProjectSummary, ProjectStats, ProjectResourceSummary

# Configure logging
logger = logging.getLogger(__name__)


class ProjectService:
    """
    Service class for project-related database operations.

    Provides methods for creating, updating, retrieving projects
    with proper error handling, logging, and access control.
    """

    @staticmethod
    async def get_project_by_id(
        db: AsyncSession, project_id: int, user_id: Optional[int] = None
    ) -> Optional[Project]:
        """
        Retrieve a project by its ID with access control.

        Args:
            db (AsyncSession): Database session
            project_id (int): Project ID to search for
            user_id (Optional[int]): User ID for access control check

        Returns:
            Optional[Project]: Project object if found and accessible, None otherwise
        """
        try:
            query = select(Project).filter(Project.id == project_id)

            # Add access control if user_id provided
            if user_id:
                project = await db.execute(query)
                project = project.scalars().first()
                if project and not project.is_accessible_by_user(user_id):
                    logger.warning(
                        f"User {user_id} denied access to project {project_id}"
                    )
                    return None
            else:
                project = await db.execute(query)
                project = project.scalars().first()

            if project:
                logger.info(f"Retrieved project by ID: {project_id}")
            return project
        except Exception as e:
            logger.error(f"Error retrieving project by ID {project_id}: {e}")
            return None

    @staticmethod
    async def get_projects_by_user(
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
    ) -> List[Project]:
        """
        Retrieve projects accessible by a user.

        Args:
            db (AsyncSession): Database session
            user_id (int): User ID
            skip (int): Number of records to skip
            limit (int): Maximum number of records to return
            is_active (Optional[bool]): Filter by active status

        Returns:
            List[Project]: List of accessible projects
        """
        try:
            query = select(Project).filter(
                or_(
                    Project.owner_user_id == user_id,
                    # Add team access check here when teams are implemented
                )
            )

            if is_active is not None:
                query = query.filter(Project.is_active == is_active)

            projects = await db.execute(query.offset(skip).limit(limit))
            projects = projects.scalars().all()
            logger.info(f"Retrieved {len(projects)} projects for user {user_id}")
            return projects
        except Exception as e:
            logger.error(f"Error retrieving projects for user {user_id}: {e}")
            return []

    @staticmethod
    async def create_project(
        db: AsyncSession, project_data: ProjectCreate
    ) -> Optional[Project]:
        """
        Create a new project.

        Args:
            db (AsyncSession): Database session
            project_data (ProjectCreate): Project creation data

        Returns:
            Optional[Project]: Created project object or None if creation failed
        """
        try:
            # Create project instance
            project = Project(
                name=project_data.name,
                description=project_data.description,
                repository_url=project_data.repository_url,
                default_branch=project_data.default_branch,
                environments=project_data.environments
                or ["development", "staging", "production"],
                tags=project_data.tags,
                settings=project_data.settings or {},
                is_active=project_data.is_active,
                owner_user_id=project_data.owner_user_id,
            )

            # Add to database
            db.add(project)
            await db.commit()
            await db.refresh(project)

            logger.info(f"Created new project: {project.name} (ID: {project.id})")
            return project

        except IntegrityError as e:
            await db.rollback()
            logger.error(f"Project creation failed - integrity error: {e}")
            return None
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating project: {e}")
            return None

    @staticmethod
    async def update_project(
        db: AsyncSession, project_id: int, project_data: ProjectUpdate, user_id: int
    ) -> Optional[Project]:
        """
        Update an existing project.

        Args:
            db (AsyncSession): Database session
            project_id (int): Project ID to update
            project_data (ProjectUpdate): Update data
            user_id (int): User ID for access control

        Returns:
            Optional[Project]: Updated project object or None if update failed
        """
        try:
            project = await ProjectService.get_project_by_id(db, project_id, user_id)
            if not project:
                return None

            # Update fields if provided
            if project_data.name is not None:
                project.name = project_data.name
            if project_data.description is not None:
                project.description = project_data.description
            if project_data.repository_url is not None:
                project.repository_url = project_data.repository_url
            if project_data.default_branch is not None:
                project.default_branch = project_data.default_branch
            if project_data.environments is not None:
                project.environments = project_data.environments
            if project_data.tags is not None:
                project.tags = project_data.tags
            if project_data.settings is not None:
                project.settings = project_data.settings
            if project_data.is_active is not None:
                project.is_active = project_data.is_active

            # Save changes
            await db.commit()
            await db.refresh(project)

            logger.info(f"Updated project: {project.name} (ID: {project.id})")
            return project

        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating project {project_id}: {e}")
            return None

    @staticmethod
    async def delete_project(db: AsyncSession, project_id: int, user_id: int) -> bool:
        """
        Delete a project (soft delete by setting is_active=False).

        Args:
            db (AsyncSession): Database session
            project_id (int): Project ID to delete
            user_id (int): User ID for access control

        Returns:
            bool: True if deletion successful, False otherwise
        """
        try:
            project = await ProjectService.get_project_by_id(db, project_id, user_id)
            if not project:
                return False

            # Check if user is owner
            if project.owner_user_id != user_id:
                logger.warning(
                    f"User {user_id} denied delete access to project {project_id}"
                )
                return False

            # Soft delete
            project.is_active = False
            await db.commit()

            logger.info(f"Deleted project: {project.name} (ID: {project.id})")
            return True

        except Exception as e:
            await db.rollback()
            logger.error(f"Error deleting project {project_id}: {e}")
            return False

    @staticmethod
    async def get_project_summary(
        db: AsyncSession, project_id: int, user_id: int
    ) -> Optional[ProjectSummary]:
        """
        Get project summary with key metrics.

        Args:
            db (AsyncSession): Database session
            project_id (int): Project ID
            user_id (int): User ID for access control

        Returns:
            Optional[ProjectSummary]: Project summary or None if not accessible
        """
        try:
            project = await ProjectService.get_project_by_id(db, project_id, user_id)
            if not project:
                return None

            # Get resource summary using model method
            resource_summary = project.get_resource_summary()

            # Build summary
            summary = ProjectSummary(
                id=project.id,
                name=project.name,
                description=project.description,
                is_active=project.is_active,
                total_pipelines=resource_summary.get("pipelines", {}).get("total", 0),
                active_pipelines=resource_summary.get("pipelines", {}).get("active", 0),
                total_clusters=resource_summary.get("clusters", {}).get("total", 0),
                healthy_clusters=resource_summary.get("clusters", {}).get("healthy", 0),
                active_alerts=resource_summary.get("alerts", {}).get("active", 0),
                critical_alerts=resource_summary.get("alerts", {}).get("critical", 0),
                last_pipeline_run=resource_summary.get("pipelines", {}).get("last_run"),
                last_deployment=resource_summary.get("infrastructure", {}).get(
                    "last_deployment"
                ),
                last_alert=resource_summary.get("alerts", {}).get("last_alert"),
            )

            return summary

        except Exception as e:
            logger.error(f"Error getting project summary for {project_id}: {e}")
            return None

    @staticmethod
    async def search_projects(
        db: AsyncSession, query: str, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[Project]:
        """
        Search projects by name or description.

        Args:
            db (AsyncSession): Database session
            query (str): Search query
            user_id (int): User ID for access control
            skip (int): Number of records to skip
            limit (int): Maximum number of records to return

        Returns:
            List[Project]: List of matching projects
        """
        try:
            search_filter = or_(
                Project.name.ilike(f"%{query}%"),
                Project.description.ilike(f"%{query}%"),
            )

            access_filter = or_(
                Project.owner_user_id == user_id,
                # Add team access check here when teams are implemented
            )

            projects = await db.execute(
                select(Project)
                .filter(and_(search_filter, access_filter, Project.is_active == True))
                .offset(skip)
                .limit(limit)
            )
            projects = projects.scalars().all()

            logger.info(
                f"Found {len(projects)} projects matching '{query}' for user {user_id}"
            )
            return projects

        except Exception as e:
            logger.error(f"Error searching projects for '{query}': {e}")
            return []
