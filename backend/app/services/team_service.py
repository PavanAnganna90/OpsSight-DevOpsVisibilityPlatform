"""
Team service for database operations.
Handles team management, user assignments, and role-based access control operations.
"""

from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_, desc, func
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.team import Team, TeamRole
from app.models.user import User
from app.models.user_team import UserTeam
from app.schemas.team import (
    TeamCreate,
    TeamUpdate,
    TeamMemberCreate,
    TeamMemberUpdate,
    Team,
    TeamStats,
)

# Configure logging
logger = logging.getLogger(__name__)


class TeamService:
    """
    Service class for team-related database operations.

    Provides methods for creating, updating, retrieving teams and managing
    team memberships with proper error handling and role-based access control.
    """

    @staticmethod
    async def get_team_by_id(
        db: AsyncSession, team_id: int, user_id: Optional[int] = None
    ) -> Optional[Team]:
        """
        Retrieve a team by its ID with access control.

        Args:
            db (AsyncSession): Database session
            team_id (int): Team ID to search for
            user_id (Optional[int]): User ID for access control check

        Returns:
            Optional[Team]: Team object if found and accessible, None otherwise
        """
        try:
            team = await db.execute(
                select(Team)
                .options(selectinload(Team.members), selectinload(Team.projects))
                .filter(Team.id == team_id)
            )

            team = team.scalars().first()

            # Access control check
            if team and user_id:
                if not team.is_member(user_id):
                    logger.warning(f"User {user_id} denied access to team {team_id}")
                    return None

            if team:
                logger.info(f"Retrieved team by ID: {team_id}")
            return team
        except Exception as e:
            logger.error(f"Error retrieving team by ID {team_id}: {e}")
            return None

    @staticmethod
    async def get_teams_for_user(
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        role_filter: Optional[TeamRole] = None,
    ) -> List[Team]:
        """
        Retrieve teams where the user is a member.

        Args:
            db (AsyncSession): Database session
            user_id (int): User ID
            skip (int): Number of records to skip
            limit (int): Maximum number of records to return
            role_filter (Optional[TeamRole]): Filter by user's role in team

        Returns:
            List[Team]: List of teams where user is a member
        """
        try:
            query = select(Team).join(UserTeam).filter(UserTeam.user_id == user_id)

            if role_filter:
                query = query.filter(UserTeam.role == role_filter)

            teams = await db.execute(
                query.order_by(Team.name).offset(skip).limit(limit)
            )
            teams = teams.scalars().all()
            logger.info(f"Retrieved {len(teams)} teams for user {user_id}")
            return teams
        except Exception as e:
            logger.error(f"Error retrieving teams for user {user_id}: {e}")
            return []

    @staticmethod
    async def create_team(
        db: AsyncSession, team_data: TeamCreate, user_id: int
    ) -> Optional[Team]:
        """
        Create a new team with the creator as owner.

        Args:
            db (AsyncSession): Database session
            team_data (TeamCreate): Team creation data
            user_id (int): User ID of the team creator

        Returns:
            Optional[Team]: Created team object or None if creation failed
        """
        try:
            # Create team instance
            team = Team(
                name=team_data.name,
                description=team_data.description,
                is_default=team_data.is_default or False,
                settings=team_data.settings or {},
            )

            # Add to database
            db.add(team)
            await db.flush()  # Flush to get team ID without committing

            # Add creator as team owner
            user_team = UserTeam(
                user_id=user_id,
                team_id=team.id,
                role=TeamRole.OWNER,
                joined_at=datetime.utcnow(),
            )
            db.add(user_team)

            await db.commit()
            await db.refresh(team)

            logger.info(
                f"Created new team: {team.name} (ID: {team.id}) by user {user_id}"
            )
            return team

        except IntegrityError as e:
            await db.rollback()
            logger.error(f"Team creation failed - integrity error: {e}")
            return None
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating team: {e}")
            return None

    @staticmethod
    async def update_team(
        db: AsyncSession, team_id: int, team_data: TeamUpdate, user_id: int
    ) -> Optional[Team]:
        """
        Update an existing team.

        Args:
            db (AsyncSession): Database session
            team_id (int): Team ID to update
            team_data (TeamUpdate): Update data
            user_id (int): User ID for access control

        Returns:
            Optional[Team]: Updated team object or None if update failed
        """
        try:
            team = await TeamService.get_team_by_id(db, team_id, user_id)
            if not team:
                return None

            # Check if user has permission to update team (owner or admin)
            user_role = team.get_member_role(user_id)
            if user_role not in [TeamRole.OWNER, TeamRole.ADMIN]:
                logger.warning(
                    f"User {user_id} lacks permission to update team {team_id}"
                )
                return None

            # Update fields if provided
            if team_data.name is not None:
                team.name = team_data.name
            if team_data.description is not None:
                team.description = team_data.description
            if team_data.is_default is not None:
                team.is_default = team_data.is_default
            if team_data.settings is not None:
                team.settings = team_data.settings

            # Save changes
            await db.commit()
            await db.refresh(team)

            logger.info(f"Updated team: {team.name} (ID: {team.id})")
            return team

        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating team {team_id}: {e}")
            return None

    @staticmethod
    async def add_team_member(
        db: AsyncSession,
        team_id: int,
        member_data: TeamMemberCreate,
        requesting_user_id: int,
    ) -> bool:
        """
        Add a user to a team with specified role.

        Args:
            db (AsyncSession): Database session
            team_id (int): Team ID
            member_data (TeamMemberAdd): Member addition data
            requesting_user_id (int): User ID making the request

        Returns:
            bool: True if member added successfully, False otherwise
        """
        try:
            team = await TeamService.get_team_by_id(db, team_id, requesting_user_id)
            if not team:
                return False

            # Check if requesting user has permission (owner or admin)
            requesting_user_role = team.get_member_role(requesting_user_id)
            if requesting_user_role not in [TeamRole.OWNER, TeamRole.ADMIN]:
                logger.warning(
                    f"User {requesting_user_id} lacks permission to add members to team {team_id}"
                )
                return False

            # Check if user to be added exists
            user_to_add = await db.execute(
                select(User).filter(User.id == member_data.user_id)
            )
            user_to_add = user_to_add.scalars().first()
            if not user_to_add:
                logger.warning(f"User {member_data.user_id} not found")
                return False

            # Check if user is already a team member
            existing_membership = await db.execute(
                select(UserTeam).filter(
                    UserTeam.user_id == member_data.user_id, UserTeam.team_id == team_id
                )
            )
            existing_membership = existing_membership.scalars().first()

            if existing_membership:
                logger.warning(
                    f"User {member_data.user_id} is already a member of team {team_id}"
                )
                return False

            # Add user to team
            user_team = UserTeam(
                user_id=member_data.user_id,
                team_id=team_id,
                role=member_data.role,
                joined_at=datetime.utcnow(),
            )
            db.add(user_team)
            await db.commit()

            logger.info(
                f"Added user {member_data.user_id} to team {team_id} with role {member_data.role}"
            )
            return True

        except Exception as e:
            await db.rollback()
            logger.error(f"Error adding member to team {team_id}: {e}")
            return False

    @staticmethod
    async def update_team_member(
        db: AsyncSession,
        team_id: int,
        member_data: TeamMemberUpdate,
        requesting_user_id: int,
    ) -> bool:
        """
        Update a team member's role.

        Args:
            db (AsyncSession): Database session
            team_id (int): Team ID
            member_data (TeamMemberUpdate): Member update data
            requesting_user_id (int): User ID making the request

        Returns:
            bool: True if member updated successfully, False otherwise
        """
        try:
            team = await TeamService.get_team_by_id(db, team_id, requesting_user_id)
            if not team:
                return False

            # Check if requesting user has permission (owner or admin)
            requesting_user_role = team.get_member_role(requesting_user_id)
            if requesting_user_role not in [TeamRole.OWNER, TeamRole.ADMIN]:
                logger.warning(
                    f"User {requesting_user_id} lacks permission to update members in team {team_id}"
                )
                return False

            # Find existing membership
            membership = await db.execute(
                select(UserTeam).filter(
                    UserTeam.user_id == member_data.user_id, UserTeam.team_id == team_id
                )
            )
            membership = membership.scalars().first()

            if not membership:
                logger.warning(
                    f"User {member_data.user_id} is not a member of team {team_id}"
                )
                return False

            # Prevent changing owner role unless requesting user is owner
            if (
                membership.role == TeamRole.OWNER
                and requesting_user_role != TeamRole.OWNER
            ):
                logger.warning(
                    f"Only team owner can change owner role in team {team_id}"
                )
                return False

            # Update role
            membership.role = member_data.role
            await db.commit()

            logger.info(
                f"Updated user {member_data.user_id} role to {member_data.role} in team {team_id}"
            )
            return True

        except Exception as e:
            await db.rollback()
            logger.error(
                f"Error updating team member {member_data.user_id} in team {team_id}: {e}"
            )
            return False

    @staticmethod
    async def remove_team_member(
        db: AsyncSession, team_id: int, user_id_to_remove: int, requesting_user_id: int
    ) -> bool:
        """
        Remove a user from a team.

        Args:
            db (AsyncSession): Database session
            team_id (int): Team ID
            user_id_to_remove (int): User ID to remove from team
            requesting_user_id (int): User ID making the request

        Returns:
            bool: True if member removed successfully, False otherwise
        """
        try:
            team = await TeamService.get_team_by_id(db, team_id, requesting_user_id)
            if not team:
                return False

            # Check if requesting user has permission (owner, admin, or removing self)
            requesting_user_role = team.get_member_role(requesting_user_id)
            is_self_removal = requesting_user_id == user_id_to_remove

            if not is_self_removal and requesting_user_role not in [
                TeamRole.OWNER,
                TeamRole.ADMIN,
            ]:
                logger.warning(
                    f"User {requesting_user_id} lacks permission to remove members from team {team_id}"
                )
                return False

            # Find existing membership
            membership = await db.execute(
                select(UserTeam).filter(
                    UserTeam.user_id == user_id_to_remove, UserTeam.team_id == team_id
                )
            )
            membership = membership.scalars().first()

            if not membership:
                logger.warning(
                    f"User {user_id_to_remove} is not a member of team {team_id}"
                )
                return False

            # Prevent removing owner unless requesting user is owner
            if (
                membership.role == TeamRole.OWNER
                and requesting_user_role != TeamRole.OWNER
            ):
                logger.warning(f"Only team owner can remove owner from team {team_id}")
                return False

            # Remove membership
            await db.delete(membership)
            await db.commit()

            logger.info(f"Removed user {user_id_to_remove} from team {team_id}")
            return True

        except Exception as e:
            await db.rollback()
            logger.error(
                f"Error removing user {user_id_to_remove} from team {team_id}: {e}"
            )
            return False

    @staticmethod
    async def get_team_summary(
        db: AsyncSession, team_id: int, user_id: int
    ) -> Optional[Team]:
        """
        Get team summary with member and project counts.

        Args:
            db (AsyncSession): Database session
            team_id (int): Team ID
            user_id (int): User ID for access control

        Returns:
            Optional[Team]: Team object or None if not accessible
        """
        try:
            team = await TeamService.get_team_by_id(db, team_id, user_id)
            if not team:
                return None

            # Return the team object directly
            return team

        except Exception as e:
            logger.error(f"Error getting team summary for {team_id}: {e}")
            return None
