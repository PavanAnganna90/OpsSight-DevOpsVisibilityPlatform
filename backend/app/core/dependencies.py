"""
FastAPI dependency injection functions for OpsSight DevOps Platform.

This module provides reusable dependency functions for:
- Authentication and authorization
- Database session management
- Cache management
- Redis connection handling
- Health checks and monitoring
- Common query parameters
"""

# WARNING: Only import get_db/get_async_db from app.db.database in this file.
# All other code should import from app.core.dependencies to ensure a single source of truth for DB dependencies.

from typing import Annotated, AsyncGenerator, Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as redis
import logging
from datetime import datetime

from app.core.config import settings
from app.core.auth.jwt import verify_token
from app.core.cache import UniversalCacheManager
from app.core.database_adapter import DatabaseAdapter
from app.core.database_factory import get_database_adapter
from app.repositories.user import UserRepository
from app.repositories.metrics import MetricsRepository
from app.services.user_service import UserService
from app.services.metrics import MetricsService
from app.db.database import get_async_db, get_db, SessionLocal

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer()

# Type aliases for common dependencies
AsyncSessionDep = Annotated[AsyncSession, Depends(get_async_db)]
SessionDep = Annotated[Generator, Depends(get_db)]
SecurityDep = Annotated[HTTPAuthorizationCredentials, Depends(security)]
DatabaseAdapterDep = Annotated[DatabaseAdapter, Depends(get_database_adapter)]

# Cache manager singleton
_cache_manager: Optional[UniversalCacheManager] = None


async def get_universal_cache() -> UniversalCacheManager:
    """
    Get or create the universal cache manager instance.

    Returns:
        UniversalCacheManager: The cache manager instance
    """
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = UniversalCacheManager()
        await _cache_manager.initialize()
    return _cache_manager


# Type alias for Cache Manager dependency
CacheManagerDep = UniversalCacheManager


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    adapter: DatabaseAdapterDep = Depends(get_database_adapter),
):
    """
    Get the current authenticated user from JWT token.

    Args:
        credentials: HTTP Bearer token credentials
        adapter: Database adapter instance

    Returns:
        User: The authenticated user object

    Raises:
        HTTPException: If token is invalid or user not found
    """
    # Import here to avoid circular imports
    from app.models.user import User
    from app.repositories.user import UserRepository

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Verify JWT token and extract payload
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception

        # Look up user in database
        user_repository = UserRepository(adapter)
        user = await user_repository.get_by_id(int(user_id))
        
        if user is None:
            raise credentials_exception
            
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is disabled",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return user

    except ValueError as e:
        # JWT verification errors
        logger.error(f"JWT verification failed: {e}")
        raise credentials_exception
    except Exception as e:
        # Other errors (database, etc.)
        logger.error(f"Authentication error: {e}")
        raise credentials_exception


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    adapter: DatabaseAdapterDep = Depends(get_database_adapter),
):
    """
    Get the current authenticated user from JWT token (optional).
    
    Returns None if no token is provided or token is invalid.
    Useful for endpoints that work both with and without authentication.

    Args:
        credentials: HTTP Bearer token credentials (optional)
        adapter: Database adapter instance

    Returns:
        User or None: The authenticated user object or None
    """
    if credentials is None:
        return None
        
    try:
        # Import here to avoid circular imports
        from app.models.user import User
        from app.repositories.user import UserRepository

        # Verify JWT token and extract payload
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub")
        
        if user_id is None:
            return None

        # Look up user in database
        user_repository = UserRepository(adapter)
        user = await user_repository.get_by_id(int(user_id))
        
        if user is None or not user.is_active:
            return None

        return user

    except Exception as e:
        # Log but don't raise exception for optional auth
        logger.debug(f"Optional authentication failed: {e}")
        return None


# Type alias for current user dependency
CurrentUserDep = Annotated[object, Depends(get_current_user)]


async def get_current_active_user(current_user: CurrentUserDep):
    """
    Get current active user (must be enabled).

    Args:
        current_user: Current authenticated user

    Returns:
        User: Active user object

    Raises:
        HTTPException: If user is disabled
    """
    if getattr(current_user, "disabled", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )
    return current_user


# Type alias for active user dependency
ActiveUserDep = Annotated[object, Depends(get_current_active_user)]


async def get_current_superuser(current_user: CurrentUserDep):
    """
    Get current superuser (must have admin privileges).

    Args:
        current_user: Current authenticated user

    Returns:
        User: Superuser object

    Raises:
        HTTPException: If user is not a superuser
    """
    if not getattr(current_user, "is_superuser", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
    return current_user


# Type alias for superuser dependency
SuperUserDep = Annotated[object, Depends(get_current_superuser)]


class CommonQueryParams:
    """
    Common query parameters for pagination and filtering.

    Attributes:
        skip: Number of records to skip
        limit: Maximum number of records to return
        search: Search term for filtering
    """

    def __init__(self, skip: int = 0, limit: int = 100, search: str = None):
        self.skip = skip
        self.limit = limit
        self.search = search


async def get_redis_pool():
    """
    Get Redis connection pool.

    Returns:
        Redis: Redis connection pool
    """
    return redis.from_url(str(settings.REDIS_URL))


RedisDep = Annotated[redis.Redis, Depends(get_redis_pool)]


async def check_dependencies() -> dict:
    """
    Check the health of external dependencies.

    Returns:
        dict: Dictionary with dependency health status
    """
    health = {"database": False, "redis": False, "cache_manager": False}

    try:
        # Check database - this is a simple approach, we'll improve later
        health["database"] = True  # Assume healthy for now
    except Exception:
        pass

    try:
        # Check Redis
        redis_client = redis.from_url(str(settings.REDIS_URL))
        await redis_client.ping()
        await redis_client.close()
        health["redis"] = True
    except Exception:
        pass

    try:
        # Check cache manager
        cache_manager = await get_universal_cache()
        # If we can get stats, the cache manager is working
        cache_manager.get_stats()
        health["cache_manager"] = True
    except Exception:
        pass

    return health


# ========================================
# Repository Dependencies
# ========================================


async def get_user_repository(
    adapter: DatabaseAdapterDep = Depends(get_database_adapter)
) -> UserRepository:
    """
    Factory function for UserRepository.

    Args:
        adapter: Database adapter instance

    Returns:
        UserRepository: Configured user repository instance
    """
    return UserRepository(adapter)


async def get_metrics_repository(
    adapter: DatabaseAdapterDep = Depends(get_database_adapter)
) -> MetricsRepository:
    """
    Factory function for MetricsRepository.

    Args:
        adapter: Database adapter instance

    Returns:
        MetricsRepository: Configured metrics repository instance
    """
    return MetricsRepository(adapter)


# Type aliases for repository dependencies
UserRepositoryDep = Annotated[UserRepository, Depends(get_user_repository)]
MetricsRepositoryDep = Annotated[MetricsRepository, Depends(get_metrics_repository)]

# ========================================
# Service Dependencies
# ========================================


async def get_user_service(user_repo: UserRepositoryDep) -> UserService:
    """
    Factory function for UserService.

    Args:
        user_repo: User repository instance

    Returns:
        UserService: Configured user service instance
    """
    return UserService(user_repo)


async def get_metrics_service(metrics_repo: MetricsRepositoryDep) -> MetricsService:
    """
    Factory function for MetricsService.

    Args:
        metrics_repo: Metrics repository instance

    Returns:
        MetricsService: Configured metrics service instance
    """
    return MetricsService(metrics_repo)


# Type aliases for service dependencies
UserServiceDep = Annotated[UserService, Depends(get_user_service)]
MetricsServiceDep = Annotated[MetricsService, Depends(get_metrics_service)]

# ========================================
# Advanced Dependency Patterns
# ========================================


class ServiceLocator:
    """
    Service locator pattern for managing service dependencies.

    Provides centralized access to all application services with
    proper dependency injection and lifecycle management.
    """

    def __init__(self, db: AsyncSession):
        """
        Initialize service locator with database session.

        Args:
            db: Async database session
        """
        self.db = db
        self._repositories = {}
        self._services = {}

    def get_user_repository(self) -> UserRepository:
        """Get or create UserRepository instance."""
        if "user" not in self._repositories:
            self._repositories["user"] = UserRepository(self.db)
        return self._repositories["user"]

    def get_metrics_repository(self) -> MetricsRepository:
        """Get or create MetricsRepository instance."""
        if "metrics" not in self._repositories:
            self._repositories["metrics"] = MetricsRepository(self.db)
        return self._repositories["metrics"]

    def get_user_service(self) -> UserService:
        """Get or create UserService instance."""
        if "user" not in self._services:
            self._services["user"] = UserService(self.get_user_repository())
        return self._services["user"]

    def get_metrics_service(self) -> MetricsService:
        """Get or create MetricsService instance."""
        if "metrics" not in self._services:
            self._services["metrics"] = MetricsService(self.get_metrics_repository())
        return self._services["metrics"]


async def get_service_locator(db: AsyncSessionDep) -> ServiceLocator:
    """
    Factory function for ServiceLocator.

    Args:
        db: Async database session

    Returns:
        ServiceLocator: Configured service locator instance

    Example:
        @app.get("/complex-operation/")
        async def complex_operation(
            services: Annotated[ServiceLocator, Depends(get_service_locator)]
        ):
            user_service = services.get_user_service()
            metrics_service = services.get_metrics_service()
            # Use multiple services in coordination
    """
    return ServiceLocator(db)


# Type alias for service locator dependency
ServiceLocatorDep = Annotated[ServiceLocator, Depends(get_service_locator)]

# ========================================
# Dependency Override Support (for testing)
# ========================================

# Global dictionary for dependency overrides
_dependency_overrides = {}


def override_dependency(dependency_func, override_func):
    """
    Override a dependency function (useful for testing).

    Args:
        dependency_func: Original dependency function
        override_func: Override function to use instead

    Example:
        # In tests
        override_dependency(get_user_service, lambda: MockUserService())
    """
    _dependency_overrides[dependency_func] = override_func


def reset_dependency_overrides():
    """Reset all dependency overrides."""
    global _dependency_overrides
    _dependency_overrides = {}


def get_dependency_override(dependency_func):
    """
    Get override for dependency function if exists.

    Args:
        dependency_func: Dependency function to check

    Returns:
        Override function if exists, None otherwise
    """
    return _dependency_overrides.get(dependency_func)


# ========================================
# Health Check Dependencies
# ========================================


async def check_database_health(db: AsyncSessionDep) -> dict:
    """
    Check database connectivity and health.

    Args:
        db: Database session

    Returns:
        dict: Database health status
    """
    try:
        from sqlalchemy import text

        result = await db.execute(text("SELECT 1"))
        result.scalar()
        return {
            "status": "healthy",
            "message": "Database connection successful",
            "type": "database",
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "status": "unhealthy",
            "message": f"Database connection failed: {str(e)}",
            "type": "database",
        }


async def check_redis_health(redis_conn: RedisDep) -> dict:
    """
    Check Redis connectivity and health.

    Args:
        redis_conn: Redis connection

    Returns:
        dict: Redis health status
    """
    try:
        await redis_conn.ping()
        return {
            "status": "healthy",
            "message": "Redis connection successful",
            "type": "cache",
        }
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return {
            "status": "unhealthy",
            "message": f"Redis connection failed: {str(e)}",
            "type": "cache",
        }


async def check_all_dependencies() -> dict:
    """
    Comprehensive dependency health check.

    Returns:
        dict: Overall system health status
    """
    checks = {}
    overall_healthy = True

    try:
        # Check database
        async with get_async_db() as db:
            db_health = await check_database_health(db)
            checks["database"] = db_health
            if db_health["status"] != "healthy":
                overall_healthy = False

        # Check Redis
        redis_conn = await get_redis_pool()
        redis_health = await check_redis_health(redis_conn)
        checks["redis"] = redis_health
        if redis_health["status"] != "healthy":
            overall_healthy = False

    except Exception as e:
        logger.error(f"Dependency health check error: {e}")
        overall_healthy = False
        checks["error"] = str(e)

    return {
        "status": "healthy" if overall_healthy else "unhealthy",
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat(),
    }


# ========================================
# Performance Monitoring Dependencies
# ========================================

import time
from contextlib import asynccontextmanager


@asynccontextmanager
async def performance_monitor(operation_name: str):
    """
    Context manager for monitoring operation performance.

    Args:
        operation_name: Name of the operation being monitored

    Yields:
        dict: Performance metrics

    Example:
        async with performance_monitor("user_creation") as perf:
            # Perform operation
            result = await user_service.create(user_data)
            perf["result_count"] = 1
    """
    start_time = time.time()
    metrics = {"operation": operation_name}

    try:
        yield metrics
        metrics["status"] = "success"
    except Exception as e:
        metrics["status"] = "error"
        metrics["error"] = str(e)
        raise
    finally:
        end_time = time.time()
        metrics["duration"] = end_time - start_time
        metrics["timestamp"] = time.time()

        # Log performance metrics
        logger.info(f"Performance: {metrics}")


# Type alias for performance monitoring
PerformanceMonitorDep = Annotated[dict, Depends(performance_monitor)]


def get_test_db():
    """
    Return a real Session object for use in tests (not a generator).
    Use this ONLY in test code, not in production endpoints.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        raise
    finally:
        db.close()


# Export commonly used dependencies
__all__ = [
    "AsyncSessionDep",
    "SessionDep",
    "RedisDep",
    "CurrentUserDep",
    "ActiveUserDep",
    "SuperUserDep",
    "CommonQueryDep",
    "HealthCheckDep",
    "get_current_user",
    "get_current_active_user",
    "get_current_superuser",
    "get_redis",
    "get_service_dependencies",
    "check_dependencies",
    "CommonQueryParams",
    "UserRepositoryDep",
    "MetricsRepositoryDep",
    "UserServiceDep",
    "MetricsServiceDep",
    "ServiceLocatorDep",
    "check_database_health",
    "check_redis_health",
    "check_all_dependencies",
    "performance_monitor",
    "PerformanceMonitorDep",
    "get_test_db",
]

# Database functions are imported from app.db.database
# No need to re-assign
