"""
SQLAlchemy Database Adapter

Wraps existing SQLAlchemy code to implement the DatabaseAdapter interface.
This allows the existing SQLAlchemy-based code to work with the adapter pattern.
"""

from typing import Any, Optional, List, Dict, Type, TypeVar
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy import select, func, delete, update
from sqlalchemy.orm import selectinload

from app.core.database_adapter import DatabaseAdapter

ModelType = TypeVar("ModelType")


class SQLAlchemyAdapter(DatabaseAdapter):
    """
    SQLAlchemy implementation of DatabaseAdapter.
    
    Wraps existing SQLAlchemy async session and provides adapter interface.
    """

    def __init__(self, session: AsyncSession):
        """
        Initialize SQLAlchemy adapter.
        
        Args:
            session: SQLAlchemy async session
        """
        self._session = session

    @property
    def backend_name(self) -> str:
        """Return backend name."""
        return "sqlalchemy"

    async def get_by_id(
        self,
        model: Type[ModelType],
        id: Any,
        options: Optional[List[Any]] = None
    ) -> Optional[ModelType]:
        """Get entity by ID."""
        query = select(model).where(model.id == id)
        
        if options:
            query = query.options(*options)
        
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        model: Type[ModelType],
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[Any] = None,
        options: Optional[List[Any]] = None,
    ) -> List[ModelType]:
        """Get all entities with filtering and pagination."""
        query = select(model)
        
        # Apply filters
        if filters:
            for key, value in filters.items():
                if hasattr(model, key):
                    if isinstance(value, (list, tuple)):
                        query = query.where(getattr(model, key).in_(value))
                    else:
                        query = query.where(getattr(model, key) == value)
        
        # Apply ordering
        if order_by is not None:
            query = query.order_by(order_by)
        elif hasattr(model, "id"):
            query = query.order_by(model.id)
        
        # Apply options
        if options:
            query = query.options(*options)
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        result = await self._session.execute(query)
        return result.scalars().all()

    async def create(
        self,
        model: Type[ModelType],
        obj_data: Dict[str, Any]
    ) -> ModelType:
        """Create new entity."""
        db_obj = model(**obj_data)
        self._session.add(db_obj)
        await self._session.flush()
        await self._session.refresh(db_obj)
        return db_obj

    async def update(
        self,
        model: Type[ModelType],
        id: Any,
        obj_data: Dict[str, Any]
    ) -> Optional[ModelType]:
        """Update existing entity."""
        # Get existing entity
        db_obj = await self.get_by_id(model, id)
        if not db_obj:
            return None
        
        # Update entity attributes
        for field, value in obj_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        
        await self._session.flush()
        await self._session.refresh(db_obj)
        return db_obj

    async def delete(
        self,
        model: Type[ModelType],
        id: Any
    ) -> bool:
        """Delete entity by ID."""
        db_obj = await self.get_by_id(model, id)
        if not db_obj:
            return False
        
        await self._session.delete(db_obj)
        await self._session.flush()
        return True

    async def execute_query(
        self,
        query: Any
    ) -> Any:
        """Execute a database query."""
        return await self._session.execute(query)

    async def commit(self) -> None:
        """Commit the current transaction."""
        await self._session.commit()

    async def rollback(self) -> None:
        """Rollback the current transaction."""
        await self._session.rollback()

    async def flush(self) -> None:
        """Flush pending changes to the database."""
        await self._session.flush()

    async def refresh(self, obj: ModelType) -> None:
        """Refresh entity from database."""
        await self._session.refresh(obj)

    async def get_count(
        self,
        model: Type[ModelType],
        filters: Optional[Dict[str, Any]] = None
    ) -> int:
        """Get total count of entities matching filters."""
        query = select(func.count(model.id))
        
        if filters:
            for key, value in filters.items():
                if hasattr(model, key):
                    if isinstance(value, (list, tuple)):
                        query = query.where(getattr(model, key).in_(value))
                    else:
                        query = query.where(getattr(model, key) == value)
        
        result = await self._session.execute(query)
        return result.scalar()

    async def exists(
        self,
        model: Type[ModelType],
        id: Any
    ) -> bool:
        """Check if entity exists by ID."""
        query = select(func.count(model.id)).where(model.id == id)
        result = await self._session.execute(query)
        count = result.scalar()
        return count > 0

    async def bulk_create(
        self,
        model: Type[ModelType],
        objs_data: List[Dict[str, Any]]
    ) -> List[ModelType]:
        """Create multiple entities in bulk."""
        db_objs = [model(**obj_data) for obj_data in objs_data]
        self._session.add_all(db_objs)
        await self._session.flush()
        
        # Refresh all objects to get IDs
        for db_obj in db_objs:
            await self._session.refresh(db_obj)
        
        return db_objs

    def get_async_session(self) -> Optional[AsyncSession]:
        """Get async SQLAlchemy session."""
        return self._session

