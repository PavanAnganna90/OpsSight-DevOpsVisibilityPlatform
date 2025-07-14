"""
Database monitoring and performance tracking module.
Provides query performance metrics, connection pool monitoring, and slow query logging.
"""

import time
import logging
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict, deque
import asyncio

from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy.pool import Pool
from sqlalchemy import event
import prometheus_client
from app.core.monitoring import DB_QUERY_DURATION

logger = logging.getLogger(__name__)

# Prometheus metrics
db_connection_pool_size = None
db_connection_pool_checked_out = None
db_slow_queries_total = None
_db_metrics_initialized = False


def init_db_monitoring_metrics():
    global db_connection_pool_size, db_connection_pool_checked_out, db_slow_queries_total, _db_metrics_initialized
    if _db_metrics_initialized:
        return
    db_connection_pool_size = prometheus_client.Gauge(
        "db_connection_pool_size", "Current database connection pool size"
    )
    db_connection_pool_checked_out = prometheus_client.Gauge(
        "db_connection_pool_checked_out",
        "Number of connections currently checked out from the pool",
    )
    db_slow_queries_total = prometheus_client.Counter(
        "db_slow_queries_total", "Total number of slow database queries", ["query_type"]
    )
    _db_metrics_initialized = True


init_db_monitoring_metrics()


@dataclass
class QueryMetrics:
    """Metrics for a database query."""

    query: str
    duration: float
    timestamp: datetime
    table: Optional[str] = None
    query_type: Optional[str] = None
    error: Optional[str] = None


@dataclass
class ConnectionPoolMetrics:
    """Metrics for database connection pool."""

    size: int
    checked_out: int
    overflow: int
    checked_in: int
    timestamp: datetime = field(default_factory=datetime.now)


class DatabaseMonitor:
    """
    Database monitoring and performance tracking.

    Tracks query performance, connection pool metrics, and provides
    slow query logging and alerting capabilities.
    """

    def __init__(self, slow_query_threshold: float = 1.0):
        """
        Initialize database monitor.

        Args:
            slow_query_threshold: Threshold in seconds for slow query detection
        """
        self.slow_query_threshold = slow_query_threshold
        self.query_metrics: deque = deque(maxlen=1000)  # Keep last 1000 queries
        self.pool_metrics: deque = deque(maxlen=100)  # Keep last 100 pool snapshots
        self.query_stats: Dict[str, List[float]] = defaultdict(list)
        self._monitoring_active = False

    def setup_engine_monitoring(self, engine: AsyncEngine) -> None:
        """
        Set up monitoring for an async SQLAlchemy engine.

        Args:
            engine: SQLAlchemy async engine to monitor
        """

        # Monitor connection pool events
        @event.listens_for(engine.sync_engine.pool, "connect")
        def on_connect(dbapi_conn, connection_record):
            logger.debug("Database connection established")
            self._update_pool_metrics(engine.sync_engine.pool)

        @event.listens_for(engine.sync_engine.pool, "checkout")
        def on_checkout(dbapi_conn, connection_record, connection_proxy):
            logger.debug("Database connection checked out from pool")
            self._update_pool_metrics(engine.sync_engine.pool)

        @event.listens_for(engine.sync_engine.pool, "checkin")
        def on_checkin(dbapi_conn, connection_record):
            logger.debug("Database connection checked in to pool")
            self._update_pool_metrics(engine.sync_engine.pool)

        # Monitor query execution
        @event.listens_for(engine.sync_engine, "before_cursor_execute")
        def before_cursor_execute(
            conn, cursor, statement, parameters, context, executemany
        ):
            context._query_start_time = time.time()
            context._query_statement = statement

        @event.listens_for(engine.sync_engine, "after_cursor_execute")
        def after_cursor_execute(
            conn, cursor, statement, parameters, context, executemany
        ):
            duration = time.time() - context._query_start_time
            self._record_query_metrics(statement, duration)

        self._monitoring_active = True
        logger.info("Database monitoring enabled")

    def _update_pool_metrics(self, pool: Pool) -> None:
        """Update connection pool metrics."""
        try:
            metrics = ConnectionPoolMetrics(
                size=pool.size(),
                checked_out=pool.checkedout(),
                overflow=pool.overflow(),
                checked_in=pool.checkedin(),
            )

            self.pool_metrics.append(metrics)

            # Update Prometheus metrics
            db_connection_pool_size.set(metrics.size)
            db_connection_pool_checked_out.set(metrics.checked_out)

        except Exception as e:
            logger.error(f"Error updating pool metrics: {e}")

    def _record_query_metrics(self, statement: str, duration: float) -> None:
        """Record metrics for a database query."""
        try:
            # Extract query type and table name
            query_type = self._extract_query_type(statement)
            table = self._extract_table_name(statement)

            metrics = QueryMetrics(
                query=statement[:500],  # Truncate long queries
                duration=duration,
                timestamp=datetime.now(),
                table=table,
                query_type=query_type,
            )

            self.query_metrics.append(metrics)
            self.query_stats[query_type].append(duration)

            # Update Prometheus metrics
            if DB_QUERY_DURATION is not None:
                DB_QUERY_DURATION.labels(
                    query_type=query_type or "unknown", table=table or "unknown"
                ).observe(duration)

            # Log slow queries
            if duration > self.slow_query_threshold:
                logger.warning(
                    f"Slow query detected: {duration:.3f}s - {statement[:100]}"
                )
                if db_slow_queries_total is not None:
                    db_slow_queries_total.labels(
                        query_type=query_type or "unknown"
                    ).inc()

        except Exception as e:
            logger.error(f"Error recording query metrics: {e}")

    def _extract_query_type(self, statement: str) -> Optional[str]:
        """Extract query type from SQL statement."""
        statement = statement.strip().upper()
        if statement.startswith("SELECT"):
            return "SELECT"
        elif statement.startswith("INSERT"):
            return "INSERT"
        elif statement.startswith("UPDATE"):
            return "UPDATE"
        elif statement.startswith("DELETE"):
            return "DELETE"
        elif statement.startswith("CREATE"):
            return "CREATE"
        elif statement.startswith("DROP"):
            return "DROP"
        elif statement.startswith("ALTER"):
            return "ALTER"
        return None

    def _extract_table_name(self, statement: str) -> Optional[str]:
        """Extract table name from SQL statement."""
        try:
            statement = statement.strip().upper()
            words = statement.split()

            if statement.startswith("SELECT") and "FROM" in words:
                from_index = words.index("FROM")
                if from_index + 1 < len(words):
                    return words[from_index + 1].strip('`"[]').lower()

        except Exception:
            pass

        return None

    @asynccontextmanager
    async def query_timer(self, query_name: str):
        """
        Context manager for timing database operations.

        Args:
            query_name: Name/description of the query being timed
        """
        start_time = time.time()
        try:
            yield
        finally:
            duration = time.time() - start_time
            logger.debug(f"Query '{query_name}' took {duration:.3f}s")

            if duration > self.slow_query_threshold:
                logger.warning(f"Slow query '{query_name}': {duration:.3f}s")

    def get_query_statistics(self, minutes: int = 60) -> Dict[str, Any]:
        """
        Get query statistics for the last N minutes.

        Args:
            minutes: Number of minutes to look back

        Returns:
            Dictionary containing query statistics
        """
        cutoff_time = datetime.now() - timedelta(minutes=minutes)
        recent_queries = [q for q in self.query_metrics if q.timestamp >= cutoff_time]

        if not recent_queries:
            return {}

        stats = {
            "total_queries": len(recent_queries),
            "avg_duration": sum(q.duration for q in recent_queries)
            / len(recent_queries),
            "max_duration": max(q.duration for q in recent_queries),
            "min_duration": min(q.duration for q in recent_queries),
            "slow_queries": len(
                [q for q in recent_queries if q.duration > self.slow_query_threshold]
            ),
            "by_type": {},
            "by_table": {},
        }

        # Group by query type
        type_groups = defaultdict(list)
        table_groups = defaultdict(list)

        for query in recent_queries:
            if query.query_type:
                type_groups[query.query_type].append(query.duration)
            if query.table:
                table_groups[query.table].append(query.duration)

        # Calculate stats by type
        for query_type, durations in type_groups.items():
            stats["by_type"][query_type] = {
                "count": len(durations),
                "avg_duration": sum(durations) / len(durations),
                "max_duration": max(durations),
                "slow_count": len(
                    [d for d in durations if d > self.slow_query_threshold]
                ),
            }

        # Calculate stats by table
        for table, durations in table_groups.items():
            stats["by_table"][table] = {
                "count": len(durations),
                "avg_duration": sum(durations) / len(durations),
                "max_duration": max(durations),
                "slow_count": len(
                    [d for d in durations if d > self.slow_query_threshold]
                ),
            }

        return stats

    def get_pool_statistics(self) -> Dict[str, Any]:
        """Get connection pool statistics."""
        if not self.pool_metrics:
            return {}

        latest = self.pool_metrics[-1]
        return {
            "current_size": latest.size,
            "checked_out": latest.checked_out,
            "checked_in": latest.checked_in,
            "overflow": latest.overflow,
            "utilization": latest.checked_out / latest.size if latest.size > 0 else 0,
            "timestamp": latest.timestamp.isoformat(),
        }

    def get_slow_queries(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get the slowest queries from recent history.

        Args:
            limit: Maximum number of queries to return

        Returns:
            List of slow query information
        """
        slow_queries = [
            q for q in self.query_metrics if q.duration > self.slow_query_threshold
        ]

        # Sort by duration (slowest first)
        slow_queries.sort(key=lambda x: x.duration, reverse=True)

        return [
            {
                "query": q.query,
                "duration": q.duration,
                "timestamp": q.timestamp.isoformat(),
                "table": q.table,
                "query_type": q.query_type,
            }
            for q in slow_queries[:limit]
        ]


# Global monitor instance
db_monitor = DatabaseMonitor()


async def test():
    conn = await asyncpg.connect(
        user="postgres", password="postgres", database="opsight", host="localhost"
    )
    print("Connected!")
    await conn.close()
