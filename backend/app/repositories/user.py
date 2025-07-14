"""
User repository implementation.
Handles user-specific database operations and queries.
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User, UserCreate, UserUpdate]):
    """
    Repository for User entity with user-specific operations.

    Extends BaseRepository with user-related query methods.
    """

    def __init__(self, db: AsyncSession):
        """
        Initialize user repository.

        Args:
            db: Async database session
        """
        super().__init__(db, User)

    async def get_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email address.

        Args:
            email: User email address

        Returns:
            User if found, None otherwise
        """
        query = select(User).where(User.email == email)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_github_id(self, github_id: str) -> Optional[User]:
        """
        Get user by GitHub ID.

        Args:
            github_id: GitHub user ID

        Returns:
            User if found, None otherwise
        """
        query = select(User).where(User.github_id == github_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_active_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        """
        Get all active users.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of active users
        """
        return await self.get_all(
            skip=skip,
            limit=limit,
            filters={"is_active": True},
            order_by=User.created_at.desc(),
        )

    async def get_superusers(self) -> List[User]:
        """
        Get all superusers.

        Returns:
            List of superuser accounts
        """
        return await self.get_all(
            filters={"is_superuser": True, "is_active": True},
            order_by=User.created_at.desc(),
        )

    async def get_users_by_role(
        self, role_id: int, skip: int = 0, limit: int = 100
    ) -> List[User]:
        """
        Get users by role ID.

        Args:
            role_id: Role identifier
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of users with the specified role
        """
        query = (
            select(User)
            .where(User.role_id == role_id)
            .options(selectinload(User.role))
            .order_by(User.created_at.desc())
            .offset(skip)
            .limit(limit)
        )

        result = await self.db.execute(query)
        return result.scalars().all()

    async def search_users(
        self, search_term: str, skip: int = 0, limit: int = 100
    ) -> List[User]:
        """
        Search users by name, email, or username.

        Args:
            search_term: Search term to match against user fields
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of matching users
        """
        search_pattern = f"%{search_term}%"

        query = (
            select(User)
            .where(
                (User.full_name.ilike(search_pattern))
                | (User.email.ilike(search_pattern))
                | (User.github_username.ilike(search_pattern))
            )
            .where(User.is_active == True)
            .order_by(User.full_name, User.email)
            .offset(skip)
            .limit(limit)
        )

        result = await self.db.execute(query)
        return result.scalars().all()

    async def update_last_login(self, user_id: int) -> Optional[User]:
        """
        Update user's last login timestamp.

        Args:
            user_id: User identifier

        Returns:
            Updated user if found, None otherwise
        """
        from datetime import datetime

        return await self.update(user_id, {"last_login": datetime.utcnow()})

    async def deactivate_user(self, user_id: int) -> Optional[User]:
        """
        Deactivate a user account.

        Args:
            user_id: User identifier

        Returns:
            Updated user if found, None otherwise
        """
        return await self.update(user_id, {"is_active": False})

    async def activate_user(self, user_id: int) -> Optional[User]:
        """
        Activate a user account.

        Args:
            user_id: User identifier

        Returns:
            Updated user if found, None otherwise
        """
        return await self.update(user_id, {"is_active": True})

    async def get_user_statistics(self) -> dict:
        """
        Get user statistics.

        Returns:
            Dictionary with user counts and statistics
        """
        from sqlalchemy import func

        # Total users
        total_query = select(func.count(User.id))
        total_result = await self.db.execute(total_query)
        total_users = total_result.scalar()

        # Active users
        active_query = select(func.count(User.id)).where(User.is_active == True)
        active_result = await self.db.execute(active_query)
        active_users = active_result.scalar()

        # Superusers
        super_query = select(func.count(User.id)).where(
            User.is_superuser == True, User.is_active == True
        )
        super_result = await self.db.execute(super_query)
        superusers = super_result.scalar()

        return {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": total_users - active_users,
            "superusers": superusers,
            "regular_users": active_users - superusers,
        }
