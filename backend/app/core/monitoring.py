"""
Monitoring module for collecting and exposing application metrics.

This module sets up Prometheus metrics collectors and provides
utilities for tracking various application metrics.
"""

from prometheus_client import Counter, Histogram, Gauge, Info
from typing import Callable
from functools import wraps
import time
import os

# Metric variables (initialized to None)
APP_INFO = None
REQUEST_COUNT = None
REQUEST_LATENCY = None
DB_CONNECTION_POOL = None
DB_QUERY_DURATION = None
CACHE_HITS = None
CACHE_MISSES = None
ACTIVE_USERS = None
PIPELINE_EXECUTIONS = None

_metrics_initialized = False


def init_metrics():
    """
    Initialize Prometheus metrics. Call this once at app startup.
    """
    global APP_INFO, REQUEST_COUNT, REQUEST_LATENCY, DB_CONNECTION_POOL, DB_QUERY_DURATION
    global CACHE_HITS, CACHE_MISSES, ACTIVE_USERS, PIPELINE_EXECUTIONS, _metrics_initialized
    if _metrics_initialized:
        return
    from prometheus_client import Counter, Histogram, Gauge, Info

    # Application info
    APP_INFO = Info("application", "Application information")
    APP_INFO.info({"version": "1.0.0", "environment": "development"})
    # Request metrics
    REQUEST_COUNT = Counter(
        "http_requests_total",
        "Total number of HTTP requests",
        ["method", "endpoint", "status"],
    )
    REQUEST_LATENCY = Histogram(
        "http_request_duration_seconds",
        "HTTP request duration in seconds",
        ["method", "endpoint"],
        buckets=[0.1, 0.5, 1.0, 2.0, 5.0],
    )
    # Database metrics
    DB_CONNECTION_POOL = Gauge(
        "db_connections_pool_size",
        "Database connection pool size",
        ["status"],  # active, idle, total
    )
    DB_QUERY_DURATION = Histogram(
        "db_query_duration_seconds",
        "Database query duration in seconds",
        ["operation", "table"],
        buckets=[0.01, 0.05, 0.1, 0.5, 1.0],
    )
    # Cache metrics
    CACHE_HITS = Counter(
        "cache_hits_total", "Total number of cache hits", ["cache_type"]
    )
    CACHE_MISSES = Counter(
        "cache_misses_total", "Total number of cache misses", ["cache_type"]
    )
    # Business metrics
    ACTIVE_USERS = Gauge("active_users", "Number of currently active users")
    PIPELINE_EXECUTIONS = Counter(
        "pipeline_executions_total",
        "Total number of pipeline executions",
        ["status", "pipeline_type"],
    )
    _metrics_initialized = True


def track_request_metrics(endpoint: str) -> Callable:
    """
    Decorator to track request metrics.

    Args:
        endpoint (str): The endpoint being monitored

    Returns:
        Callable: Decorated function
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                response = await func(*args, **kwargs)
                if REQUEST_COUNT is not None:
                    REQUEST_COUNT.labels(
                        method=kwargs.get("method", "UNKNOWN"),
                        endpoint=endpoint,
                        status=getattr(response, "status_code", "UNKNOWN"),
                    ).inc()
                return response
            finally:
                duration = time.time() - start_time
                if REQUEST_LATENCY is not None:
                    REQUEST_LATENCY.labels(
                        method=kwargs.get("method", "UNKNOWN"), endpoint=endpoint
                    ).observe(duration)

        return wrapper

    return decorator


def track_db_metrics(operation: str, table: str) -> Callable:
    """
    Decorator to track database operation metrics.

    Args:
        operation (str): Type of database operation
        table (str): Table being operated on

    Returns:
        Callable: Decorated function
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                return await func(*args, **kwargs)
            finally:
                duration = time.time() - start_time
                if DB_QUERY_DURATION is not None:
                    DB_QUERY_DURATION.labels(operation=operation, table=table).observe(
                        duration
                    )

        return wrapper

    return decorator


def update_db_pool_metrics(active: int, idle: int, total: int) -> None:
    """
    Update database connection pool metrics.

    Args:
        active (int): Number of active connections
        idle (int): Number of idle connections
        total (int): Total number of connections
    """
    if DB_CONNECTION_POOL is not None:
        DB_CONNECTION_POOL.labels(status="active").set(active)
        DB_CONNECTION_POOL.labels(status="idle").set(idle)
        DB_CONNECTION_POOL.labels(status="total").set(total)


def track_cache_metrics(cache_type: str, hit: bool) -> None:
    """
    Track cache hit/miss metrics.

    Args:
        cache_type (str): Type of cache being accessed
        hit (bool): Whether the cache access was a hit
    """
    if hit and CACHE_HITS is not None:
        CACHE_HITS.labels(cache_type=cache_type).inc()
    elif not hit and CACHE_MISSES is not None:
        CACHE_MISSES.labels(cache_type=cache_type).inc()


def track_pipeline_execution(pipeline_type: str, status: str) -> None:
    """
    Track pipeline execution metrics.

    Args:
        pipeline_type (str): Type of pipeline
        status (str): Execution status
    """
    if PIPELINE_EXECUTIONS is not None:
        PIPELINE_EXECUTIONS.labels(status=status, pipeline_type=pipeline_type).inc()
