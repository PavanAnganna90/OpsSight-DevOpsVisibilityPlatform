"""
Base repository implementation providing common CRUD operations.
Implements the repository pattern with SQLAlchemy async support.
Supports both direct SQLAlchemy sessions and database adapters.
"""

from typing import TypeVar, Generic, Type, Optional, List, Dict, Any, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.core.interfaces import BaseRepository as IBaseRepository
from app.core.database_adapter import DatabaseAdapter
from app.core.database_monitoring import db_monitor

# Type variables for generic repository
ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseRepository(
    IBaseRepository[ModelType], Generic[ModelType, CreateSchemaType, UpdateSchemaType]
):
    """
    Base repository with common CRUD operations.

    Generic repository that can be inherited by specific entity repositories.
    Supports both SQLAlchemy sessions and database adapters for dual backend support.
    """

    def __init__(
        self, db: Union[AsyncSession, DatabaseAdapter], model: Type[ModelType]
    ):
        """
        Initialize repository with database session/adapter and model.

        Args:
            db: Async database session or DatabaseAdapter instance
            model: SQLAlchemy model class
        """
        self.db = db
        self.model = model
        # Determine if we're using an adapter or direct session
        self._is_adapter = isinstance(db, DatabaseAdapter)

    async def get_by_id(
        self, id: Any, options: Optional[List[Any]] = None
    ) -> Optional[ModelType]:
        """
        Get entity by ID.

        Args:
            id: Entity identifier
            options: SQLAlchemy query options (e.g., selectinload)

        Returns:
            Entity if found, None otherwise
        """
        if self._is_adapter:
            return await self.db.get_by_id(self.model, id, options)

        query = select(self.model).where(self.model.id == id)

        if options:
            query = query.options(*options)

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[Any] = None,
        options: Optional[List[Any]] = None,
    ) -> List[ModelType]:
        """
        Get all entities with filtering and pagination.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            filters: Dictionary of filter conditions
            order_by: SQLAlchemy order by expression
            options: SQLAlchemy query options

        Returns:
            List of entities
        """
        if self._is_adapter:
            return await self.db.get_all(
                self.model, skip, limit, filters, order_by, options
            )

        query = select(self.model)

        # Apply filters
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key):
                    if isinstance(value, (list, tuple)):
                        query = query.where(getattr(self.model, key).in_(value))
                    else:
                        query = query.where(getattr(self.model, key) == value)

        # Apply ordering
        if order_by is not None:
            query = query.order_by(order_by)
        else:
            # Default ordering by id if available
            if hasattr(self.model, "id"):
                query = query.order_by(self.model.id)

        # Apply options (like eager loading)
        if options:
            query = query.options(*options)

        # Apply pagination
        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Get total count of entities matching filters.

        Args:
            filters: Dictionary of filter conditions

        Returns:
            Total count of matching entities
        """
        if self._is_adapter:
            return await self.db.get_count(self.model, filters)

        query = select(func.count(self.model.id))

        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key):
                    if isinstance(value, (list, tuple)):
                        query = query.where(getattr(self.model, key).in_(value))
                    else:
                        query = query.where(getattr(self.model, key) == value)

        result = await self.db.execute(query)
        return result.scalar()

    async def create(self, obj_in: CreateSchemaType) -> ModelType:
        """
        Create new entity.

        Args:
            obj_in: Pydantic schema with creation data

        Returns:
            Created entity
        """
        # Convert Pydantic model to dict, excluding unset values
        obj_data = obj_in.model_dump(exclude_unset=True)

        if self._is_adapter:
            return await self.db.create(self.model, obj_data)

        # Create model instance
        db_obj = self.model(**obj_data)

        # Add to session and flush to get ID
        self.db.add(db_obj)
        await self.db.flush()
        await self.db.refresh(db_obj)

        return db_obj

    async def update(
        self, id: Any, obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> Optional[ModelType]:
        """
        Update existing entity.

        Args:
            id: Entity identifier
            obj_in: Pydantic schema or dict with update data

        Returns:
            Updated entity if found, None otherwise
        """
        # Convert update data to dict
        if isinstance(obj_in, BaseModel):
            update_data = obj_in.model_dump(exclude_unset=True)
        else:
            update_data = obj_in

        if self._is_adapter:
            return await self.db.update(self.model, id, update_data)

        # Get existing entity
        db_obj = await self.get_by_id(id)
        if not db_obj:
            return None

        # Update entity attributes
        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)

        # Flush changes and refresh
        await self.db.flush()
        await self.db.refresh(db_obj)

        return db_obj

    async def delete(self, id: Any) -> bool:
        """
        Delete entity by ID.

        Args:
            id: Entity identifier

        Returns:
            True if entity was deleted, False if not found
        """
        if self._is_adapter:
            return await self.db.delete(self.model, id)

        # Check if entity exists
        db_obj = await self.get_by_id(id)
        if not db_obj:
            return False

        # Delete entity
        await self.db.delete(db_obj)
        await self.db.flush()

        return True

    async def bulk_create(self, objs_in: List[CreateSchemaType]) -> List[ModelType]:
        """
        Create multiple entities in bulk.

        Args:
            objs_in: List of Pydantic schemas with creation data

        Returns:
            List of created entities
        """
        objs_data = [obj_in.model_dump(exclude_unset=True) for obj_in in objs_in]

        if self._is_adapter:
            return await self.db.bulk_create(self.model, objs_data)

        db_objs = [self.model(**obj_data) for obj_data in objs_data]

        # Add all objects to session
        self.db.add_all(db_objs)
        await self.db.flush()

        # Refresh all objects to get IDs
        for db_obj in db_objs:
            await self.db.refresh(db_obj)

        return db_objs

    async def bulk_update(
        self, updates: List[Dict[str, Any]], id_field: str = "id"
    ) -> int:
        """
        Update multiple entities in bulk.

        Args:
            updates: List of update dictionaries, each must contain id_field
            id_field: Name of the ID field

        Returns:
            Number of updated entities
        """
        if not updates:
            return 0

        # Perform bulk update
        stmt = update(self.model)
        result = await self.db.execute(stmt, updates)
        await self.db.flush()

        return result.rowcount

    async def exists(self, id: Any) -> bool:
        """
        Check if entity exists by ID.

        Args:
            id: Entity identifier

        Returns:
            True if entity exists, False otherwise
        """
        if self._is_adapter:
            return await self.db.exists(self.model, id)

        query = select(func.count(self.model.id)).where(self.model.id == id)
        result = await self.db.execute(query)
        count = result.scalar()
        return count > 0

    async def execute_with_monitoring(self, query_name: str, stmt):
        """
        Execute a query with performance monitoring.

        Args:
            query_name: Name/description of the query for monitoring
            stmt: SQLAlchemy statement to execute

        Returns:
            Query result
        """
        if self._is_adapter:
            # For adapters, execute query directly
            return await self.db.execute_query(stmt)

        async with db_monitor.query_timer(query_name):
            return await self.db.execute(stmt)

    @property
    def adapter(self) -> Optional[DatabaseAdapter]:
        """Get database adapter if using adapter pattern."""
        return self.db if self._is_adapter else None

    @property
    def session(self) -> Optional[AsyncSession]:
        """Get SQLAlchemy session if using direct session."""
        return self.db if not self._is_adapter else None
