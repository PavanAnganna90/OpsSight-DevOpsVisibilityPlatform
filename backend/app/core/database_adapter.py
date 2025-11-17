"""
Database Adapter Abstract Interface

Defines the common interface for database operations that both SQLAlchemy
and Supabase implementations must follow. This allows runtime switching
between database backends via feature flag.
"""

from abc import ABC, abstractmethod
from typing import Any, Optional, List, Dict, TypeVar, Type
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

# Type variables
T = TypeVar("T")
ModelType = TypeVar("ModelType")


class DatabaseAdapter(ABC):
    """
    Abstract base class for database adapters.

    Provides a unified interface for database operations that can be
    implemented by different backends (SQLAlchemy, Supabase, etc.).
    """

    @property
    @abstractmethod
    def backend_name(self) -> str:
        """Return the name of the backend (e.g., 'sqlalchemy', 'supabase')."""
        ...

    @abstractmethod
    async def get_by_id(
        self, model: Type[ModelType], id: Any, options: Optional[List[Any]] = None
    ) -> Optional[ModelType]:
        """
        Get entity by ID.

        Args:
            model: Model class
            id: Entity identifier
            options: Query options (e.g., selectinload for SQLAlchemy)

        Returns:
            Entity if found, None otherwise
        """
        ...

    @abstractmethod
    async def get_all(
        self,
        model: Type[ModelType],
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[Any] = None,
        options: Optional[List[Any]] = None,
    ) -> List[ModelType]:
        """
        Get all entities with filtering and pagination.

        Args:
            model: Model class
            skip: Number of records to skip
            limit: Maximum number of records to return
            filters: Dictionary of filter conditions
            order_by: Order by expression
            options: Query options

        Returns:
            List of entities
        """
        pass

    @abstractmethod
    async def create(
        self, model: Type[ModelType], obj_data: Dict[str, Any]
    ) -> ModelType:
        """
        Create new entity.

        Args:
            model: Model class
            obj_data: Dictionary with entity data

        Returns:
            Created entity
        """
        pass

    @abstractmethod
    async def update(
        self, model: Type[ModelType], id: Any, obj_data: Dict[str, Any]
    ) -> Optional[ModelType]:
        """
        Update existing entity.

        Args:
            model: Model class
            id: Entity identifier
            obj_data: Dictionary with update data

        Returns:
            Updated entity if found, None otherwise
        """
        pass

    @abstractmethod
    async def delete(self, model: Type[ModelType], id: Any) -> bool:
        """
        Delete entity by ID.

        Args:
            model: Model class
            id: Entity identifier

        Returns:
            True if entity was deleted, False if not found
        """
        pass

    @abstractmethod
    async def execute_query(self, query: Any) -> Any:
        """
        Execute a database query.

        Args:
            query: Query object (SQLAlchemy statement or Supabase query)

        Returns:
            Query result
        """
        pass

    @abstractmethod
    async def commit(self) -> None:
        """Commit the current transaction."""
        pass

    @abstractmethod
    async def rollback(self) -> None:
        """Rollback the current transaction."""
        pass

    @abstractmethod
    async def flush(self) -> None:
        """Flush pending changes to the database."""
        pass

    @abstractmethod
    async def refresh(self, obj: ModelType) -> None:
        """
        Refresh entity from database.

        Args:
            obj: Entity to refresh
        """
        pass

    @abstractmethod
    async def get_count(
        self, model: Type[ModelType], filters: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Get total count of entities matching filters.

        Args:
            model: Model class
            filters: Dictionary of filter conditions

        Returns:
            Total count
        """
        pass

    @abstractmethod
    async def exists(self, model: Type[ModelType], id: Any) -> bool:
        """
        Check if entity exists by ID.

        Args:
            model: Model class
            id: Entity identifier

        Returns:
            True if entity exists, False otherwise
        """
        pass

    @abstractmethod
    async def bulk_create(
        self, model: Type[ModelType], objs_data: List[Dict[str, Any]]
    ) -> List[ModelType]:
        """
        Create multiple entities in bulk.

        Args:
            model: Model class
            objs_data: List of dictionaries with entity data

        Returns:
            List of created entities
        """
        pass

    def get_session(self) -> Optional[Session]:
        """
        Get synchronous SQLAlchemy session (if available).

        Returns:
            Session if SQLAlchemy backend, None otherwise
        """
        return None

    def get_async_session(self) -> Optional[AsyncSession]:
        """
        Get async SQLAlchemy session (if available).

        Returns:
            AsyncSession if SQLAlchemy backend, None otherwise
        """
        return None

    def get_client(self) -> Optional[Any]:
        """
        Get Supabase client (if available).

        Returns:
            Supabase client if Supabase backend, None otherwise
        """
        return None
