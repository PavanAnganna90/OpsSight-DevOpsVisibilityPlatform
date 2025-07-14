"""
Database configuration and session management.
Handles SQLAlchemy setup, connection pooling, and session lifecycle with async support.
Enhanced with advanced connection management, retry logic, and failover mechanisms.
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine, text, pool
from typing import AsyncGenerator, Generator, Annotated, Optional, Dict, Any
from contextlib import asynccontextmanager
import logging
import asyncio
import time
from functools import wraps
import random
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database_monitoring import db_monitor
from app.core.exceptions import DatabaseConnectionError, DatabaseTimeoutError
from app.db.models import Base

# Configure logging
logger = logging.getLogger(__name__)

# Connection retry configuration
RETRY_CONFIG = {
    "max_retries": 3,
    "base_delay": 1.0,  # Base delay in seconds
    "max_delay": 30.0,  # Maximum delay in seconds
    "exponential_factor": 2.0,
    "jitter": True,  # Add random jitter to prevent thundering herd
}


def with_retry(
    max_retries: int = 3,
    base_delay: float = 1.0,
    exponential_factor: float = 2.0,
    max_delay: float = 30.0,
    jitter: bool = True,
):
    """
    Decorator for database operations with exponential backoff retry logic.

    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Base delay between retries in seconds
        exponential_factor: Factor for exponential backoff
    """

    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            last_exception = None

            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e

                    if attempt == max_retries:
                        logger.error(
                            f"Database operation failed after {max_retries} retries: {e}"
                        )
                        break

                    # Calculate delay with exponential backoff and optional jitter
                    delay = min(base_delay * (exponential_factor**attempt), max_delay)
                    if jitter:
                        delay *= (
                            0.5 + random.random() * 0.5
                        )  # Add jitter (50-100% of calculated delay)

                    logger.warning(
                        f"Database operation failed (attempt {attempt + 1}/{max_retries + 1}), retrying in {delay:.2f}s: {e}"
                    )
                    await asyncio.sleep(delay)

            raise DatabaseConnectionError(
                f"Database operation failed after {max_retries} retries"
            ) from last_exception

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            last_exception = None

            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e

                    if attempt == max_retries:
                        logger.error(
                            f"Database operation failed after {max_retries} retries: {e}"
                        )
                        break

                    delay = min(base_delay * (exponential_factor**attempt), max_delay)
                    if jitter:
                        delay *= 0.5 + random.random() * 0.5

                    logger.warning(
                        f"Database operation failed (attempt {attempt + 1}/{max_retries + 1}), retrying in {delay:.2f}s: {e}"
                    )
                    time.sleep(delay)

            raise DatabaseConnectionError(
                f"Database operation failed after {max_retries} retries"
            ) from last_exception

        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

    return decorator


# Enhanced connection pool configuration
POOL_CONFIG = {
    "pool_size": 20,  # Number of connections to maintain
    "max_overflow": 30,  # Additional connections when pool is full
    "pool_timeout": 30,  # Timeout when getting connection from pool
    "pool_recycle": 3600,  # Recycle connections every hour
    "pool_pre_ping": True,  # Verify connections before use
    "pool_reset_on_return": "commit",  # Reset connections on return
}

# Create async engine for modern async operations with enhanced configuration
async_engine = create_async_engine(
    str(settings.get_database_url()),
    echo=settings.DEBUG,
    future=True,
    **POOL_CONFIG,
    # Additional async-specific configuration
    connect_args=(
        {
            "command_timeout": 60,  # Query timeout
            "server_settings": {
                "application_name": "OpsSight_Backend",
                "jit": "off",  # Disable JIT for better query plan consistency
            },
        }
        if str(settings.get_database_url()).startswith("postgresql")
        else {}
    ),
)

# Create sync engine for migrations and legacy operations
sync_engine = create_engine(
    str(settings.get_database_url()),
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=10,
    max_overflow=20,
    isolation_level="READ COMMITTED",
)

# Create async session factory with enhanced configuration
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

# Set up database monitoring
db_monitor.setup_engine_monitoring(async_engine)

# Create sync session factory for backwards compatibility
from sqlalchemy.orm import sessionmaker

SessionLocal = sessionmaker(bind=sync_engine, autocommit=False, autoflush=False)

# Type alias for dependency injection
AsyncSessionDep = Annotated[AsyncSession, "Database session dependency"]


class DatabaseHealthChecker:
    """
    Advanced database health checking with multiple validation levels.
    """

    @staticmethod
    @with_retry(max_retries=2, base_delay=0.5)
    async def check_basic_connectivity() -> bool:
        """Check basic database connectivity."""
        try:
            async with async_engine.connect() as connection:
                await connection.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error(f"Basic connectivity check failed: {e}")
            return False

    @staticmethod
    @with_retry(max_retries=2, base_delay=0.5)
    async def check_transaction_capability() -> bool:
        """Check database transaction capability."""
        try:
            async with async_engine.begin() as connection:
                await connection.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error(f"Transaction capability check failed: {e}")
            return False

    @staticmethod
    async def check_pool_health() -> Dict[str, Any]:
        """Check connection pool health and return metrics."""
        try:
            pool = async_engine.pool
            return {
                "size": pool.size(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
                "checked_in": pool.checkedin(),
                "invalidated": pool.invalidated(),
                "healthy": pool.checkedout() < pool.size() + pool.overflow(),
            }
        except Exception as e:
            logger.error(f"Pool health check failed: {e}")
            return {"healthy": False, "error": str(e)}

    @staticmethod
    async def comprehensive_health_check() -> Dict[str, Any]:
        """Perform comprehensive database health check."""
        start_time = time.time()

        results = {"timestamp": time.time(), "overall_healthy": True, "checks": {}}

        # Basic connectivity
        basic_ok = await DatabaseHealthChecker.check_basic_connectivity()
        results["checks"]["basic_connectivity"] = basic_ok

        # Transaction capability
        transaction_ok = await DatabaseHealthChecker.check_transaction_capability()
        results["checks"]["transaction_capability"] = transaction_ok

        # Pool health
        pool_health = await DatabaseHealthChecker.check_pool_health()
        results["checks"]["pool_health"] = pool_health

        # Overall health
        results["overall_healthy"] = (
            basic_ok and transaction_ok and pool_health.get("healthy", False)
        )

        results["check_duration"] = time.time() - start_time

        return results


@with_retry(**RETRY_CONFIG)
async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Async dependency function to get database session with retry logic.

    Creates a new async database session for each request and ensures
    proper cleanup after the request is completed. Enhanced with
    automatic retry logic for connection failures.

    Yields:
        AsyncSession: SQLAlchemy async database session

    Example:
        @app.get("/users/")
        async def get_users(db: AsyncSession = Depends(get_async_db)):
            result = await db.execute(select(User))
            return result.scalars().all()
    """
    print("=== CANONICAL get_async_db CALLED ===")
    logger = logging.getLogger("get_async_db_debug")
    logger.warning(f"get_async_db CALLED: yielding AsyncSession from {__file__}")
    async with AsyncSessionLocal() as session:
        logger.warning(f"get_async_db YIELDING session: {session}")
        yield session
        logger.warning(f"get_async_db SESSION EXIT: {session}")


@with_retry(max_retries=2, base_delay=0.5)
def get_db() -> Generator[Session, None, None]:
    """
    Sync dependency function to get database session with retry logic.

    Maintained for backwards compatibility with existing sync endpoints.
    New endpoints should use get_async_db() instead.

    Yields:
        Session: SQLAlchemy database session

    Example:
        @app.get("/legacy/")
        def get_legacy_data(db: Session = Depends(get_db)):
            return db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


@asynccontextmanager
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager for async database sessions with enhanced error handling.

    Use this for service layer operations that need explicit session control.
    Includes automatic retry logic and proper error handling.

    Example:
        async with get_async_session() as session:
            result = await session.execute(select(User))
            users = result.scalars().all()
    """
    session = None
    try:
        session = AsyncSessionLocal()
        yield session
        await session.commit()
    except Exception as e:
        logger.error(f"Database session error: {e}")
        if session:
            await session.rollback()
        raise
    finally:
        if session:
            await session.close()


@asynccontextmanager
async def get_async_transaction() -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager for explicit database transactions.

    Provides explicit transaction control with automatic rollback on errors.
    Useful for operations that require multiple database operations to be atomic.

    Example:
        async with get_async_transaction() as session:
            # Multiple operations that must all succeed or all fail
            await session.execute(insert(User).values(...))
            await session.execute(update(Profile).where(...))
            # Automatic commit on success, rollback on exception
    """
    session = None
    try:
        session = AsyncSessionLocal()
        async with session.begin():
            yield session
    except Exception as e:
        logger.error(f"Database transaction error: {e}")
        raise
    finally:
        if session:
            await session.close()


@with_retry(**RETRY_CONFIG)
async def create_tables() -> None:
    """
    Create all database tables asynchronously with retry logic.

    This function creates all tables defined in the models.
    Should be called during application startup.
    """
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise


@with_retry(**RETRY_CONFIG)
async def drop_tables() -> None:
    """
    Drop all database tables asynchronously with retry logic.

    WARNING: This will delete all data in the database.
    Should only be used in development or testing environments.
    """
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        logger.info("Database tables dropped successfully")
    except Exception as e:
        logger.error(f"Error dropping database tables: {e}")
        raise


@with_retry(**RETRY_CONFIG)
async def check_async_db_connection() -> bool:
    """
    Check if async database connection is working with retry logic.

    Returns:
        bool: True if connection is successful, False otherwise
    """
    try:
        async with async_engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        logger.info("Async database connection successful")
        return True
    except Exception as e:
        logger.error(f"Async database connection failed: {e}")
        return False


@with_retry(max_retries=2, base_delay=0.5)
def check_db_connection() -> bool:
    """
    Check if sync database connection is working with retry logic.

    Maintained for backwards compatibility.

    Returns:
        bool: True if connection is successful, False otherwise
    """
    try:
        with sync_engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        logger.info("Database connection successful")
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False


async def execute_with_retry(
    query: str, params: Optional[Dict] = None, timeout: float = 30.0
) -> Any:
    """
    Execute a database query with retry logic and timeout.

    Args:
        query: SQL query to execute
        params: Query parameters
        timeout: Query timeout in seconds

    Returns:
        Query result

    Raises:
        DatabaseTimeoutError: If query times out
        DatabaseConnectionError: If connection fails after retries
    """

    @with_retry(**RETRY_CONFIG)
    async def _execute():
        try:
            async with asyncio.wait_for(
                get_async_session(), timeout=timeout
            ) as session:
                result = await session.execute(text(query), params or {})
                return result
        except asyncio.TimeoutError:
            raise DatabaseTimeoutError(f"Query timeout after {timeout}s: {query[:100]}")

    return await _execute()


# Connection pool monitoring and alerting
class PoolMonitor:
    """Monitor connection pool health and trigger alerts."""

    @staticmethod
    async def monitor_pool_health():
        """Monitor pool health and log warnings if thresholds are exceeded."""
        try:
            health = await DatabaseHealthChecker.check_pool_health()

            if not health.get("healthy", False):
                logger.warning(f"Connection pool unhealthy: {health}")

            # Alert if pool utilization is high
            total_connections = health.get("size", 0) + health.get("overflow", 0)
            checked_out = health.get("checked_out", 0)

            if total_connections > 0:
                utilization = checked_out / total_connections
                if utilization > 0.8:  # 80% threshold
                    logger.warning(
                        f"High connection pool utilization: {utilization:.2%}"
                    )

        except Exception as e:
            logger.error(f"Pool monitoring error: {e}")


# Export commonly used items
__all__ = [
    "Base",
    "async_engine",
    "sync_engine",
    "AsyncSessionLocal",
    "SessionLocal",
    "AsyncSessionDep",
    "get_async_db",
    "get_db",
    "get_async_session",
    "get_async_transaction",
    "create_tables",
    "drop_tables",
    "check_async_db_connection",
    "check_db_connection",
    "execute_with_retry",
    "DatabaseHealthChecker",
    "PoolMonitor",
    "with_retry",
]
