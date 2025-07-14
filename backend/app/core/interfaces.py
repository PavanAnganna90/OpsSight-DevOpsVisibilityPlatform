"""
Interface abstractions for dependency injection.
Defines protocols and abstract base classes for service layer architecture.
"""

from abc import ABC, abstractmethod
from typing import Protocol, TypeVar, Generic, Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

# Type variables for generic interfaces
T = TypeVar("T")
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")


class DatabaseSessionProtocol(Protocol):
    """Protocol for database session dependency."""

    async def execute(self, statement: Any) -> Any:
        """Execute a database statement."""
        ...

    async def commit(self) -> None:
        """Commit the current transaction."""
        ...

    async def rollback(self) -> None:
        """Rollback the current transaction."""
        ...


class CacheProtocol(Protocol):
    """Protocol for cache service dependency."""

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        ...

    async def set(self, key: str, value: Any, expire: Optional[int] = None) -> None:
        """Set value in cache."""
        ...

    async def delete(self, key: str) -> None:
        """Delete value from cache."""
        ...


class LoggerProtocol(Protocol):
    """Protocol for logger dependency."""

    def info(self, message: str, **kwargs: Any) -> None:
        """Log info message."""
        ...

    def error(self, message: str, **kwargs: Any) -> None:
        """Log error message."""
        ...

    def warning(self, message: str, **kwargs: Any) -> None:
        """Log warning message."""
        ...


class RepositoryProtocol(Protocol, Generic[T]):
    """Generic protocol for repository pattern."""

    async def get_by_id(self, id: Any) -> Optional[T]:
        """Get entity by ID."""
        ...

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        """Get all entities with pagination."""
        ...

    async def create(self, obj_in: CreateSchemaType) -> T:
        """Create new entity."""
        ...

    async def update(self, id: Any, obj_in: UpdateSchemaType) -> Optional[T]:
        """Update existing entity."""
        ...

    async def delete(self, id: Any) -> bool:
        """Delete entity by ID."""
        ...


class ServiceProtocol(Protocol, Generic[T]):
    """Generic protocol for service layer."""

    async def get(self, id: Any) -> Optional[T]:
        """Get entity by ID."""
        ...

    async def list(self, skip: int = 0, limit: int = 100, **filters: Any) -> List[T]:
        """List entities with filtering."""
        ...

    async def create(self, obj_in: CreateSchemaType) -> T:
        """Create new entity."""
        ...

    async def update(self, id: Any, obj_in: UpdateSchemaType) -> Optional[T]:
        """Update existing entity."""
        ...

    async def delete(self, id: Any) -> bool:
        """Delete entity."""
        ...


class UserServiceProtocol(ServiceProtocol[Any]):
    """Protocol for user service."""

    async def authenticate(self, email: str, password: str) -> Optional[Any]:
        """Authenticate user credentials."""
        ...

    async def get_by_email(self, email: str) -> Optional[Any]:
        """Get user by email."""
        ...

    async def create_user(self, user_data: CreateSchemaType) -> Any:
        """Create new user."""
        ...


class MetricsServiceProtocol(ServiceProtocol[Any]):
    """Protocol for metrics service."""

    async def record_metric(
        self, name: str, value: float, tags: Optional[Dict[str, str]] = None
    ) -> None:
        """Record a metric."""
        ...

    async def get_aggregated_metrics(
        self, name: str, start_time: Any, end_time: Any
    ) -> Dict[str, Any]:
        """Get aggregated metrics."""
        ...


class NotificationServiceProtocol(Protocol):
    """Protocol for notification service."""

    async def send_email(self, to: str, subject: str, body: str) -> bool:
        """Send email notification."""
        ...

    async def send_slack(self, channel: str, message: str) -> bool:
        """Send Slack notification."""
        ...


# Abstract base classes for concrete implementations


class BaseRepository(ABC, Generic[T]):
    """Abstract base repository class."""

    def __init__(self, db: AsyncSession):
        self.db = db

    @abstractmethod
    async def get_by_id(self, id: Any) -> Optional[T]:
        """Get entity by ID."""
        pass

    @abstractmethod
    async def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        """Get all entities with pagination."""
        pass

    @abstractmethod
    async def create(self, obj_in: CreateSchemaType) -> T:
        """Create new entity."""
        pass

    @abstractmethod
    async def update(self, id: Any, obj_in: UpdateSchemaType) -> Optional[T]:
        """Update existing entity."""
        pass

    @abstractmethod
    async def delete(self, id: Any) -> bool:
        """Delete entity by ID."""
        pass


class BaseService(ABC, Generic[T]):
    """Abstract base service class."""

    def __init__(self, repository: RepositoryProtocol[T]):
        self.repository = repository

    @abstractmethod
    async def get(self, id: Any) -> Optional[T]:
        """Get entity by ID."""
        pass

    @abstractmethod
    async def list(self, skip: int = 0, limit: int = 100, **filters: Any) -> List[T]:
        """List entities with filtering."""
        pass

    @abstractmethod
    async def create(self, obj_in: CreateSchemaType) -> T:
        """Create new entity."""
        pass

    @abstractmethod
    async def update(self, id: Any, obj_in: UpdateSchemaType) -> Optional[T]:
        """Update existing entity."""
        pass

    @abstractmethod
    async def delete(self, id: Any) -> bool:
        """Delete entity."""
        pass
