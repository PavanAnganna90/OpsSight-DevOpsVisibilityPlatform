"""
User service implementation.
Handles user-specific business logic and operations.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.services.base import BaseService
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserUpdate
from app.models.user import User

logger = logging.getLogger(__name__)


class UserService(BaseService):
    """
    Service for User entity with user-specific business logic.

    Extends BaseService with user-related operations and validation.
    """

    def __init__(self, user_repository: UserRepository):
        """
        Initialize user service.

        Args:
            user_repository: User repository instance
        """
        super().__init__(user_repository)
        self.user_repo = user_repository

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email address.

        Args:
            email: User email address

        Returns:
            User if found, None otherwise
        """
        try:
            self.logger.debug(f"Fetching user by email: {email}")
            return await self.user_repo.get_by_email(email)
        except Exception as e:
            self.logger.error(f"Error fetching user by email {email}: {str(e)}")
            raise

    async def get_user_by_github_id(self, github_id: str) -> Optional[User]:
        """
        Get user by GitHub ID.

        Args:
            github_id: GitHub user ID

        Returns:
            User if found, None otherwise
        """
        try:
            self.logger.debug(f"Fetching user by GitHub ID: {github_id}")
            return await self.user_repo.get_by_github_id(github_id)
        except Exception as e:
            self.logger.error(f"Error fetching user by GitHub ID {github_id}: {str(e)}")
            raise

    async def get_active_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        """
        Get all active users.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of active users
        """
        try:
            self.logger.debug(f"Fetching active users: skip={skip}, limit={limit}")
            return await self.user_repo.get_active_users(skip=skip, limit=limit)
        except Exception as e:
            self.logger.error(f"Error fetching active users: {str(e)}")
            raise

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
        try:
            self.logger.debug(
                f"Searching users: term='{search_term}', skip={skip}, limit={limit}"
            )
            return await self.user_repo.search_users(
                search_term=search_term, skip=skip, limit=limit
            )
        except Exception as e:
            self.logger.error(f"Error searching users: {str(e)}")
            raise

    async def create_user(self, user_data: UserCreate) -> User:
        """
        Create a new user with business logic validation.

        Args:
            user_data: User creation data

        Returns:
            Created user

        Raises:
            ValueError: If email already exists or validation fails
        """
        try:
            # Check if email already exists
            existing_user = await self.user_repo.get_by_email(user_data.email)
            if existing_user:
                raise ValueError(f"User with email {user_data.email} already exists")

            # Check if GitHub ID already exists (if provided)
            if user_data.github_id:
                existing_github_user = await self.user_repo.get_by_github_id(
                    user_data.github_id
                )
                if existing_github_user:
                    raise ValueError(
                        f"User with GitHub ID {user_data.github_id} already exists"
                    )

            self.logger.info(f"Creating new user: {user_data.email}")

            # Create user
            user = await self.user_repo.create(user_data)

            self.logger.info(f"Successfully created user: {user.id}")
            return user

        except Exception as e:
            self.logger.error(f"Error creating user: {str(e)}")
            raise

    async def update_user(self, user_id: int, user_data: UserUpdate) -> Optional[User]:
        """
        Update user with business logic validation.

        Args:
            user_id: User identifier
            user_data: User update data

        Returns:
            Updated user if found, None otherwise

        Raises:
            ValueError: If email conflict or validation fails
        """
        try:
            # Check if user exists
            existing_user = await self.user_repo.get_by_id(user_id)
            if not existing_user:
                self.logger.warning(f"User not found for update: {user_id}")
                return None

            # Check for email conflicts (if email is being updated)
            if user_data.email and user_data.email != existing_user.email:
                email_conflict = await self.user_repo.get_by_email(user_data.email)
                if email_conflict and email_conflict.id != user_id:
                    raise ValueError(
                        f"Email {user_data.email} already in use by another user"
                    )

            self.logger.info(f"Updating user: {user_id}")

            # Update user
            updated_user = await self.user_repo.update(user_id, user_data)

            if updated_user:
                self.logger.info(f"Successfully updated user: {user_id}")

            return updated_user

        except Exception as e:
            self.logger.error(f"Error updating user {user_id}: {str(e)}")
            raise

    async def deactivate_user(self, user_id: int) -> Optional[User]:
        """
        Deactivate a user account.

        Args:
            user_id: User identifier

        Returns:
            Updated user if found, None otherwise
        """
        try:
            self.logger.info(f"Deactivating user: {user_id}")
            return await self.user_repo.deactivate_user(user_id)
        except Exception as e:
            self.logger.error(f"Error deactivating user {user_id}: {str(e)}")
            raise

    async def activate_user(self, user_id: int) -> Optional[User]:
        """
        Activate a user account.

        Args:
            user_id: User identifier

        Returns:
            Updated user if found, None otherwise
        """
        try:
            self.logger.info(f"Activating user: {user_id}")
            return await self.user_repo.activate_user(user_id)
        except Exception as e:
            self.logger.error(f"Error activating user {user_id}: {str(e)}")
            raise

    async def update_last_login(self, user_id: int) -> Optional[User]:
        """
        Update user's last login timestamp.

        Args:
            user_id: User identifier

        Returns:
            Updated user if found, None otherwise
        """
        try:
            self.logger.debug(f"Updating last login for user: {user_id}")
            return await self.user_repo.update_last_login(user_id)
        except Exception as e:
            self.logger.error(f"Error updating last login for user {user_id}: {str(e)}")
            raise

    async def get_user_statistics(self) -> Dict[str, Any]:
        """
        Get comprehensive user statistics.

        Returns:
            Dictionary with user counts and statistics
        """
        try:
            self.logger.debug("Fetching user statistics")
            return await self.user_repo.get_user_statistics()
        except Exception as e:
            self.logger.error(f"Error fetching user statistics: {str(e)}")
            raise

    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """
        Authenticate user with email and password.

        Args:
            email: User email
            password: User password

        Returns:
            User if authentication successful, None otherwise
        """
        try:
            self.logger.debug(f"Authenticating user: {email}")

            # Get user by email
            user = await self.user_repo.get_by_email(email)
            if not user:
                self.logger.warning(f"User not found for authentication: {email}")
                return None

            # Check if user is active
            if not user.is_active:
                self.logger.warning(f"Inactive user attempted login: {email}")
                return None

            # Verify password
            if not user.password_hash:
                self.logger.warning(f"User {email} has no password set")
                return None
            
            from app.core.auth.jwt import verify_password
            if not verify_password(password, user.password_hash):
                self.logger.warning(f"Invalid password for user: {email}")
                return None

            self.logger.info(f"Authentication successful for user: {email}")

            # Update last login
            await self.update_last_login(user.id)

            return user

        except Exception as e:
            self.logger.error(f"Error authenticating user {email}: {str(e)}")
            raise

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
        try:
            self.logger.debug(f"Fetching users by role: {role_id}")
            return await self.user_repo.get_users_by_role(
                role_id=role_id, skip=skip, limit=limit
            )
        except Exception as e:
            self.logger.error(f"Error fetching users by role {role_id}: {str(e)}")
            raise

    async def get_superusers(self) -> List[User]:
        """
        Get all superusers.

        Returns:
            List of superuser accounts
        """
        try:
            self.logger.debug("Fetching superusers")
            return await self.user_repo.get_superusers()
        except Exception as e:
            self.logger.error(f"Error fetching superusers: {str(e)}")
            raise
