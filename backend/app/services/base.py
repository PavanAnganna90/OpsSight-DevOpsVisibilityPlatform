"""
Base service implementation providing common service layer patterns.
Implements service layer architecture with dependency injection support.
"""

from typing import TypeVar, Generic, Optional, List, Dict, Any, Type
from abc import ABC, abstractmethod
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
import logging

from app.core.interfaces import BaseService as IBaseService
from app.repositories.base import BaseRepository

# Type variables for generic service
ServiceType = TypeVar("ServiceType")
RepositoryType = TypeVar("RepositoryType", bound=BaseRepository)
ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

logger = logging.getLogger(__name__)


class BaseService(
    IBaseService, Generic[RepositoryType, ModelType, CreateSchemaType, UpdateSchemaType]
):
    """
    Base service with common business logic patterns.

    Provides a foundation for service layer implementation with
    repository pattern integration and dependency injection support.
    """

    def __init__(self, repository: RepositoryType):
        """
        Initialize service with repository dependency.

        Args:
            repository: Repository instance for data access
        """
        self.repository = repository
        self.logger = logging.getLogger(
            f"{self.__class__.__module__}.{self.__class__.__name__}"
        )

    async def get_by_id(self, id: Any, **kwargs) -> Optional[ModelType]:
        """
        Get entity by ID with optional parameters.

        Args:
            id: Entity identifier
            **kwargs: Additional repository-specific parameters

        Returns:
            Entity if found, None otherwise
        """
        try:
            self.logger.debug(f"Fetching entity by ID: {id}")
            return await self.repository.get_by_id(id, **kwargs)
        except Exception as e:
            self.logger.error(f"Error fetching entity by ID {id}: {str(e)}")
            raise

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        **kwargs,
    ) -> List[ModelType]:
        """
        Get all entities with filtering and pagination.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            filters: Dictionary of filter conditions
            **kwargs: Additional repository-specific parameters

        Returns:
            List of entities
        """
        try:
            self.logger.debug(
                f"Fetching entities: skip={skip}, limit={limit}, filters={filters}"
            )
            return await self.repository.get_all(
                skip=skip, limit=limit, filters=filters, **kwargs
            )
        except Exception as e:
            self.logger.error(f"Error fetching entities: {str(e)}")
            raise

    async def get_count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Get total count of entities matching filters.

        Args:
            filters: Dictionary of filter conditions

        Returns:
            Total count of matching entities
        """
        try:
            self.logger.debug(f"Counting entities with filters: {filters}")
            return await self.repository.get_count(filters)
        except Exception as e:
            self.logger.error(f"Error counting entities: {str(e)}")
            raise

    async def create(self, obj_in: CreateSchemaType, **kwargs) -> ModelType:
        """
        Create new entity with business logic validation.

        Args:
            obj_in: Pydantic schema with creation data
            **kwargs: Additional service-specific parameters

        Returns:
            Created entity

        Raises:
            ValidationError: If validation fails
            IntegrityError: If database constraints are violated
        """
        try:
            # Pre-creation validation
            await self._validate_create(obj_in, **kwargs)

            self.logger.info(f"Creating new entity: {obj_in}")

            # Create entity
            entity = await self.repository.create(obj_in)

            # Post-creation processing
            await self._post_create(entity, **kwargs)

            self.logger.info(f"Successfully created entity with ID: {entity.id}")
            return entity

        except Exception as e:
            self.logger.error(f"Error creating entity: {str(e)}")
            raise

    async def update(
        self, id: Any, obj_in: UpdateSchemaType, **kwargs
    ) -> Optional[ModelType]:
        """
        Update existing entity with business logic validation.

        Args:
            id: Entity identifier
            obj_in: Pydantic schema with update data
            **kwargs: Additional service-specific parameters

        Returns:
            Updated entity if found, None otherwise

        Raises:
            ValidationError: If validation fails
            NotFoundError: If entity not found
        """
        try:
            # Pre-update validation
            existing_entity = await self.repository.get_by_id(id)
            if not existing_entity:
                self.logger.warning(f"Entity not found for update: {id}")
                return None

            await self._validate_update(id, obj_in, existing_entity, **kwargs)

            self.logger.info(f"Updating entity {id}: {obj_in}")

            # Update entity
            updated_entity = await self.repository.update(id, obj_in)

            # Post-update processing
            if updated_entity:
                await self._post_update(updated_entity, **kwargs)
                self.logger.info(f"Successfully updated entity: {id}")

            return updated_entity

        except Exception as e:
            self.logger.error(f"Error updating entity {id}: {str(e)}")
            raise

    async def delete(self, id: Any, **kwargs) -> bool:
        """
        Delete entity with business logic validation.

        Args:
            id: Entity identifier
            **kwargs: Additional service-specific parameters

        Returns:
            True if entity was deleted, False if not found

        Raises:
            ValidationError: If deletion is not allowed
        """
        try:
            # Pre-deletion validation
            existing_entity = await self.repository.get_by_id(id)
            if not existing_entity:
                self.logger.warning(f"Entity not found for deletion: {id}")
                return False

            await self._validate_delete(id, existing_entity, **kwargs)

            self.logger.info(f"Deleting entity: {id}")

            # Delete entity
            deleted = await self.repository.delete(id)

            # Post-deletion processing
            if deleted:
                await self._post_delete(id, existing_entity, **kwargs)
                self.logger.info(f"Successfully deleted entity: {id}")

            return deleted

        except Exception as e:
            self.logger.error(f"Error deleting entity {id}: {str(e)}")
            raise

    async def exists(self, id: Any) -> bool:
        """
        Check if entity exists by ID.

        Args:
            id: Entity identifier

        Returns:
            True if entity exists, False otherwise
        """
        try:
            return await self.repository.exists(id)
        except Exception as e:
            self.logger.error(f"Error checking entity existence {id}: {str(e)}")
            raise

    # Template methods for subclasses to override

    async def _validate_create(self, obj_in: CreateSchemaType, **kwargs) -> None:
        """
        Template method for create validation logic.
        Override in subclasses to add specific validation.

        Args:
            obj_in: Creation data
            **kwargs: Additional context

        Raises:
            ValidationError: If validation fails
        """
        pass

    async def _validate_update(
        self, id: Any, obj_in: UpdateSchemaType, existing_entity: ModelType, **kwargs
    ) -> None:
        """
        Template method for update validation logic.
        Override in subclasses to add specific validation.

        Args:
            id: Entity identifier
            obj_in: Update data
            existing_entity: Current entity state
            **kwargs: Additional context

        Raises:
            ValidationError: If validation fails
        """
        pass

    async def _validate_delete(
        self, id: Any, existing_entity: ModelType, **kwargs
    ) -> None:
        """
        Template method for delete validation logic.
        Override in subclasses to add specific validation.

        Args:
            id: Entity identifier
            existing_entity: Current entity state
            **kwargs: Additional context

        Raises:
            ValidationError: If deletion is not allowed
        """
        pass

    async def _post_create(self, entity: ModelType, **kwargs) -> None:
        """
        Template method for post-creation processing.
        Override in subclasses to add specific logic.

        Args:
            entity: Created entity
            **kwargs: Additional context
        """
        pass

    async def _post_update(self, entity: ModelType, **kwargs) -> None:
        """
        Template method for post-update processing.
        Override in subclasses to add specific logic.

        Args:
            entity: Updated entity
            **kwargs: Additional context
        """
        pass

    async def _post_delete(self, id: Any, deleted_entity: ModelType, **kwargs) -> None:
        """
        Template method for post-deletion processing.
        Override in subclasses to add specific logic.

        Args:
            id: Deleted entity identifier
            deleted_entity: Entity that was deleted
            **kwargs: Additional context
        """
        pass
