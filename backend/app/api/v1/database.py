"""
Database monitoring and health check endpoints.
Provides database performance metrics, connection status, and query statistics.
"""

from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_async_db
from app.core.database_monitoring import db_monitor

router = APIRouter(prefix="/database", tags=["database"])


@router.get("/health", response_model=Dict[str, Any])
async def get_database_health(
    db: AsyncSession = Depends(get_async_db),
) -> Dict[str, Any]:
    """
    Get database health status and connection information.

    Returns:
        Dictionary containing database health metrics
    """
    try:
        # Check database connection
        from app.db.database import check_async_db_connection

        is_connected = await check_async_db_connection()

        # Get pool statistics
        pool_stats = db_monitor.get_pool_statistics()

        return {
            "status": "healthy" if is_connected else "unhealthy",
            "connected": is_connected,
            "pool_statistics": pool_stats,
            "monitoring_active": db_monitor._monitoring_active,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Database health check failed: {str(e)}"
        )


@router.get("/metrics", response_model=Dict[str, Any])
async def get_database_metrics(
    minutes: int = 60, db: AsyncSession = Depends(get_async_db)
) -> Dict[str, Any]:
    """
    Get database performance metrics for the specified time period.

    Args:
        minutes: Number of minutes to look back (default: 60)

    Returns:
        Dictionary containing query performance statistics
    """
    try:
        stats = db_monitor.get_query_statistics(minutes=minutes)
        return {"time_period_minutes": minutes, "statistics": stats}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get database metrics: {str(e)}"
        )


@router.get("/slow-queries", response_model=List[Dict[str, Any]])
async def get_slow_queries(
    limit: int = 10, db: AsyncSession = Depends(get_async_db)
) -> List[Dict[str, Any]]:
    """
    Get the slowest database queries from recent history.

    Args:
        limit: Maximum number of queries to return (default: 10)

    Returns:
        List of slow query information
    """
    try:
        return db_monitor.get_slow_queries(limit=limit)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get slow queries: {str(e)}"
        )


@router.get("/connection-info", response_model=Dict[str, Any])
async def get_connection_info(
    db: AsyncSession = Depends(get_async_db),
) -> Dict[str, Any]:
    """
    Get detailed database connection information.

    Returns:
        Dictionary containing connection details
    """
    try:
        from app.core.config import settings

        return {
            "database_url": settings.get_database_url(hide_password=True),
            "driver": (
                "asyncpg" if "postgresql" in settings.database_url else "aiosqlite"
            ),
            "pool_size": 5,  # Default pool size
            "max_overflow": 10,  # Default overflow
            "pool_recycle": 300,  # 5 minutes
            "echo": settings.DEBUG,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get connection info: {str(e)}"
        )
