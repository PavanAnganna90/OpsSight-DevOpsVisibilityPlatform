"""
User service for database operations.
Handles user creation, updates, and retrieval operations.
"""

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional, Dict, Any
from datetime import datetime
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.user import User
from app.schemas.user import UserCreate

# Configure logging
logger = logging.getLogger(__name__)


class UserService:
    """
    Service class for user-related database operations.

    Provides methods for creating, updating, and retrieving users
    with proper error handling and logging.
    """

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
        """
        Retrieve a user by their ID.

        Args:
            db (AsyncSession): Database session
            user_id (int): User ID to search for

        Returns:
            Optional[User]: User object if found, None otherwise
        """
        try:
            result = await db.execute(select(User).filter(User.id == user_id))
            user = result.scalars().first()
            if user:
                logger.info(f"Retrieved user by ID: {user_id}")
            return user
        except Exception as e:
            logger.error(f"Error retrieving user by ID {user_id}: {e}")
            return None

    @staticmethod
    async def get_user_by_github_id(db: AsyncSession, github_id: str) -> Optional[User]:
        """
        Retrieve a user by their GitHub ID.

        Args:
            db (AsyncSession): Database session
            github_id (str): GitHub ID to search for

        Returns:
            Optional[User]: User object if found, None otherwise
        """
        try:
            result = await db.execute(select(User).filter(User.github_id == github_id))
            user = result.scalars().first()
            if user:
                logger.info(f"Retrieved user by GitHub ID: {github_id}")
            return user
        except Exception as e:
            logger.error(f"Error retrieving user by GitHub ID {github_id}: {e}")
            return None

    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        """
        Retrieve a user by their email address.

        Args:
            db (AsyncSession): Database session
            email (str): Email address to search for

        Returns:
            Optional[User]: User object if found, None otherwise
        """
        try:
            result = await db.execute(select(User).filter(User.email == email))
            user = result.scalars().first()
            if user:
                logger.info(f"Retrieved user by email: {email}")
            return user
        except Exception as e:
            logger.error(f"Error retrieving user by email {email}: {e}")
            return None

    @staticmethod
    async def create_user_from_github(
        db: AsyncSession, github_data: Dict[str, Any], access_token: str, scope: str
    ) -> Optional[User]:
        """
        Create a new user from GitHub OAuth data.

        Args:
            db (AsyncSession): Database session
            github_data (Dict[str, Any]): User data from GitHub API
            access_token (str): GitHub OAuth access token
            scope (str): OAuth scope granted

        Returns:
            Optional[User]: Created user object or None if creation failed
        """
        try:
            # Create user from GitHub data
            user = User.from_github_data(github_data, access_token, scope)

            # Add to database
            db.add(user)
            await db.commit()
            await db.refresh(user)

            logger.info(
                f"Created new user from GitHub: {user.github_username} (ID: {user.id})"
            )
            return user

        except IntegrityError as e:
            await db.rollback()
            logger.error(f"User creation failed - integrity error: {e}")
            return None
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating user from GitHub data: {e}")
            return None

    @staticmethod
    async def update_user_from_github(
        db: AsyncSession,
        user: User,
        github_data: Dict[str, Any],
        access_token: str,
        scope: str,
    ) -> Optional[User]:
        """
        Update an existing user with fresh GitHub data.

        Args:
            db (AsyncSession): Database session
            user (User): Existing user object to update
            github_data (Dict[str, Any]): Fresh user data from GitHub API
            access_token (str): New GitHub OAuth access token
            scope (str): OAuth scope granted

        Returns:
            Optional[User]: Updated user object or None if update failed
        """
        try:
            # Update user fields with fresh GitHub data
            user.github_username = github_data.get("login", user.github_username)
            user.email = github_data.get("email", user.email)
            user.full_name = github_data.get("name", user.full_name)
            user.avatar_url = github_data.get("avatar_url", user.avatar_url)
            user.bio = github_data.get("bio", user.bio)
            user.company = github_data.get("company", user.company)
            user.location = github_data.get("location", user.location)
            user.blog = github_data.get("blog", user.blog)

            # Update OAuth information
            user.github_access_token = access_token
            user.github_scope = scope
            user.last_login = datetime.utcnow()

            # Save changes
            await db.commit()
            await db.refresh(user)

            logger.info(
                f"Updated user from GitHub: {user.github_username} (ID: {user.id})"
            )
            return user

        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating user from GitHub data: {e}")
            return None

    @staticmethod
    async def update_last_login(db: AsyncSession, user: User) -> bool:
        """
        Update the user's last login timestamp.

        Args:
            db (AsyncSession): Database session
            user (User): User object to update

        Returns:
            bool: True if update successful, False otherwise
        """
        try:
            user.last_login = datetime.utcnow()
            await db.commit()
            logger.info(f"Updated last login for user: {user.id}")
            return True
        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating last login for user {user.id}: {e}")
            return False

    @staticmethod
    async def deactivate_user(db: AsyncSession, user: User) -> bool:
        """
        Deactivate a user account.

        Args:
            db (AsyncSession): Database session
            user (User): User object to deactivate

        Returns:
            bool: True if deactivation successful, False otherwise
        """
        try:
            user.is_active = False
            await db.commit()
            logger.info(f"Deactivated user: {user.id}")
            return True
        except Exception as e:
            await db.rollback()
            logger.error(f"Error deactivating user {user.id}: {e}")
            return False

    @staticmethod
    async def get_or_create_user_from_github(
        db: AsyncSession, github_data: Dict[str, Any], access_token: str, scope: str
    ) -> Optional[User]:
        """
        Get existing user or create new one from GitHub OAuth data.

        This is the main method used during OAuth callback to handle
        both new and returning users.

        Args:
            db (AsyncSession): Database session
            github_data (Dict[str, Any]): User data from GitHub API
            access_token (str): GitHub OAuth access token
            scope (str): OAuth scope granted

        Returns:
            Optional[User]: User object (existing or newly created) or None if failed
        """
        github_id = str(github_data.get("id"))

        # Try to find existing user
        existing_user = await UserService.get_user_by_github_id(db, github_id)

        if existing_user:
            # Update existing user with fresh data
            return await UserService.update_user_from_github(
                db, existing_user, github_data, access_token, scope
            )
        else:
            # Create new user
            return await UserService.create_user_from_github(
                db, github_data, access_token, scope
            )
