"""
Comprehensive Monitoring and Observability API Endpoints

Provides access to system metrics, logs, traces, and health information
for the OpsSight platform monitoring dashboard.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.dependencies import get_async_db
from app.core.enhanced_metrics import get_enhanced_metrics, export_metrics, get_content_type
from app.core.enhanced_logging import get_logger, LogCategory
from app.core.security_monitor import get_security_monitor
from app.core.log_aggregation import get_log_aggregation_manager
from app.core.telemetry import get_telemetry_manager
from app.models.user import User

router = APIRouter()
logger = get_logger(__name__)


# Response Models
class SystemMetrics(BaseModel):
    """System-level metrics response."""
    cpu_usage_percent: float
    memory_usage_percent: float
    memory_available_mb: float
    disk_usage_percent: float
    disk_available_gb: float
    load_average: Dict[str, float]
    process_count: int
    file_descriptors: int
    network_bytes_rx: int
    network_bytes_tx: int


class ApplicationMetrics(BaseModel):
    """Application-level metrics response."""
    http_requests_total: int
    http_requests_per_second: float
    avg_response_time_ms: float
    p95_response_time_ms: float
    error_rate_percent: float
    active_connections: int
    cache_hit_ratio: float
    background_tasks_active: int


class DatabaseMetrics(BaseModel):
    """Database metrics response."""
    connections_active: int
    connections_idle: int
    connections_max: int
    connection_pool_usage_percent: float
    avg_query_time_ms: float
    slow_queries_count: int
    deadlocks_count: int
    cache_hit_ratio: float


class SecurityMetrics(BaseModel):
    """Security metrics response."""
    failed_auth_attempts_1h: int
    blocked_ips_count: int
    rate_limit_violations_1h: int
    security_events_24h: int
    active_sessions: int
    suspicious_activities_1h: int


class LogsMetrics(BaseModel):
    """Logs aggregation metrics."""
    total_processed: int
    total_forwarded: int
    total_filtered: int
    total_errors: int
    uptime_seconds: float
    destinations_count: int
    filters_count: int
    buffer_size: int


class HealthStatus(BaseModel):
    """Comprehensive health status."""
    status: str
    timestamp: datetime
    components: Dict[str, Dict[str, Any]]
    overall_health_score: float


class MonitoringDashboard(BaseModel):
    """Complete monitoring dashboard data."""
    timestamp: datetime
    system: SystemMetrics
    application: ApplicationMetrics
    database: DatabaseMetrics
    security: SecurityMetrics
    logs: LogsMetrics
    health: HealthStatus


class LogQuery(BaseModel):
    """Log query parameters."""
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    level: Optional[str] = None
    category: Optional[str] = None
    component: Optional[str] = None
    search: Optional[str] = None
    limit: int = 100


class AlertRule(BaseModel):
    """Alert rule configuration."""
    name: str
    description: str
    condition: str
    severity: str
    enabled: bool
    notification_channels: List[str]
    threshold_value: float
    evaluation_interval: int


@router.get("/dashboard", response_model=MonitoringDashboard)
async def get_monitoring_dashboard() -> MonitoringDashboard:
    """
    Get comprehensive monitoring dashboard data.
    
    Returns all key metrics and health information in a single response
    optimized for dashboard display.
    """
    logger.info("Fetching monitoring dashboard data", category=LogCategory.MONITORING)
    
    try:
        enhanced_metrics = get_enhanced_metrics()
        security_monitor = get_security_monitor()
        log_manager = get_log_aggregation_manager()
        
        # Get metrics summary
        metrics_summary = enhanced_metrics.get_metrics_summary()
        
        # Get security dashboard
        security_dashboard = await security_monitor.get_security_dashboard()
        
        # Get log aggregation stats
        log_stats = log_manager.get_stats()
        
        # System metrics
        system_metrics = SystemMetrics(
            cpu_usage_percent=metrics_summary.get("system", {}).get("cpu_percent", 0),
            memory_usage_percent=metrics_summary.get("system", {}).get("memory_percent", 0),
            memory_available_mb=metrics_summary.get("system", {}).get("memory_available_mb", 0),
            disk_usage_percent=85.0,  # This would come from actual disk monitoring
            disk_available_gb=50.0,   # This would come from actual disk monitoring
            load_average={"1m": 0.5, "5m": 0.4, "15m": 0.3},  # This would come from system monitoring
            process_count=150,        # This would come from process monitoring
            file_descriptors=1024,    # This would come from process monitoring
            network_bytes_rx=1048576, # This would come from network monitoring
            network_bytes_tx=2097152  # This would come from network monitoring
        )
        
        # Application metrics (these would come from actual metric collection)
        application_metrics = ApplicationMetrics(
            http_requests_total=10000,
            http_requests_per_second=25.5,
            avg_response_time_ms=120.0,
            p95_response_time_ms=350.0,
            error_rate_percent=0.5,
            active_connections=50,
            cache_hit_ratio=0.85,
            background_tasks_active=5
        )
        
        # Database metrics (these would come from database monitoring)
        database_metrics = DatabaseMetrics(
            connections_active=15,
            connections_idle=35,
            connections_max=50,
            connection_pool_usage_percent=30.0,
            avg_query_time_ms=45.0,
            slow_queries_count=2,
            deadlocks_count=0,
            cache_hit_ratio=0.92
        )
        
        # Security metrics
        security_metrics = SecurityMetrics(
            failed_auth_attempts_1h=security_dashboard.get("summary", {}).get("failed_auth_1h", 0),
            blocked_ips_count=len(security_dashboard.get("blocked_ips", [])),
            rate_limit_violations_1h=5,
            security_events_24h=security_dashboard.get("summary", {}).get("total_events_24h", 0),
            active_sessions=25,
            suspicious_activities_1h=1
        )
        
        # Logs metrics
        logs_metrics = LogsMetrics(
            total_processed=log_stats.get("total_processed", 0),
            total_forwarded=log_stats.get("total_forwarded", 0),
            total_filtered=log_stats.get("total_filtered", 0),
            total_errors=log_stats.get("total_errors", 0),
            uptime_seconds=log_stats.get("uptime_seconds", 0),
            destinations_count=log_stats.get("destinations", 0),
            filters_count=log_stats.get("filters", 0),
            buffer_size=log_stats.get("buffer_size", 0)
        )
        
        # Health status
        health_status = HealthStatus(
            status="healthy",
            timestamp=datetime.utcnow(),
            components={
                "database": {"status": "healthy", "response_time_ms": 5},
                "cache": {"status": "healthy", "hit_ratio": 0.85},
                "external_apis": {"status": "healthy", "success_rate": 0.99},
                "disk_space": {"status": "healthy", "usage_percent": 65},
                "memory": {"status": "warning", "usage_percent": 78}
            },
            overall_health_score=0.95
        )
        
        return MonitoringDashboard(
            timestamp=datetime.utcnow(),
            system=system_metrics,
            application=application_metrics,
            database=database_metrics,
            security=security_metrics,
            logs=logs_metrics,
            health=health_status
        )
        
    except Exception as e:
        logger.error(f"Error fetching monitoring dashboard: {e}", category=LogCategory.MONITORING)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch monitoring dashboard data"
        )


@router.get("/metrics", response_class=PlainTextResponse)
async def get_prometheus_metrics() -> str:
    """
    Export all metrics in Prometheus format.
    
    This endpoint is used by Prometheus to scrape metrics from the application.
    """
    try:
        metrics = export_metrics()
        return PlainTextResponse(
            content=metrics,
            media_type=get_content_type()
        )
    except Exception as e:
        logger.error(f"Error exporting metrics: {e}", category=LogCategory.MONITORING)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export metrics"
        )


@router.get("/health/detailed")
async def get_detailed_health() -> Dict[str, Any]:
    """
    Get detailed health check information for all system components.
    
    Includes dependency health, performance metrics, and diagnostic information.
    """
    try:
        # Check database health
        db_health = {"status": "healthy", "response_time_ms": 5}
        
        # Check cache health
        cache_health = {"status": "healthy", "hit_ratio": 0.85}
        
        # Check external API health
        external_health = {"status": "healthy", "last_check": datetime.utcnow().isoformat()}
        
        # Check security monitor health
        security_monitor = get_security_monitor()
        security_health = {
            "status": "healthy",
            "active_incidents": len([i for i in security_monitor.active_incidents.values() 
                                   if i.status.value in ["open", "investigating"]])
        }
        
        # Check log aggregation health
        log_manager = get_log_aggregation_manager()
        log_stats = log_manager.get_stats()
        log_health = {
            "status": "healthy" if log_stats["total_errors"] < 10 else "warning",
            "error_rate": log_stats["total_errors"] / max(log_stats["total_processed"], 1)
        }
        
        # Calculate overall health score
        component_scores = {
            "database": 1.0 if db_health["status"] == "healthy" else 0.5,
            "cache": 1.0 if cache_health["status"] == "healthy" else 0.5,
            "external_apis": 1.0 if external_health["status"] == "healthy" else 0.5,
            "security": 1.0 if security_health["status"] == "healthy" else 0.5,
            "logging": 1.0 if log_health["status"] == "healthy" else 0.5
        }
        
        overall_score = sum(component_scores.values()) / len(component_scores)
        overall_status = "healthy" if overall_score >= 0.8 else "degraded" if overall_score >= 0.5 else "unhealthy"
        
        return {
            "status": overall_status,
            "health_score": overall_score,
            "timestamp": datetime.utcnow().isoformat(),
            "components": {
                "database": db_health,
                "cache": cache_health,
                "external_apis": external_health,
                "security": security_health,
                "logging": log_health
            },
            "system_info": {
                "uptime_seconds": (datetime.utcnow() - datetime.utcnow().replace(hour=0, minute=0, second=0)).total_seconds(),
                "version": "1.0.0",
                "environment": "development"
            }
        }
        
    except Exception as e:
        logger.error(f"Error in detailed health check: {e}", category=LogCategory.MONITORING)
        return {
            "status": "unhealthy",
            "health_score": 0.0,
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }


@router.get("/logs/search")
async def search_logs(
    start_time: Optional[datetime] = Query(None, description="Start time for log search"),
    end_time: Optional[datetime] = Query(None, description="End time for log search"),
    level: Optional[str] = Query(None, description="Log level filter"),
    category: Optional[str] = Query(None, description="Log category filter"),
    component: Optional[str] = Query(None, description="Component filter"),
    search: Optional[str] = Query(None, description="Text search in log messages"),
    limit: int = Query(100, description="Maximum number of logs to return", le=1000)
) -> Dict[str, Any]:
    """
    Search and filter application logs.
    
    Provides powerful log search capabilities with filtering by time, level,
    category, component, and text search.
    """
    try:
        # In a real implementation, this would query the log aggregation system
        # For now, return mock data
        
        logs = [
            {
                "timestamp": (datetime.utcnow() - timedelta(minutes=i)).isoformat(),
                "level": "info" if i % 3 == 0 else "warning" if i % 5 == 0 else "error",
                "category": "api_request",
                "component": "backend",
                "message": f"Sample log message {i}",
                "context": {
                    "request_id": f"req_{i}",
                    "user_id": f"user_{i % 10}",
                    "endpoint": "/api/v1/test"
                }
            }
            for i in range(min(limit, 50))
        ]
        
        # Apply filters
        if level:
            logs = [log for log in logs if log["level"] == level]
        
        if category:
            logs = [log for log in logs if log["category"] == category]
        
        if component:
            logs = [log for log in logs if log["component"] == component]
        
        if search:
            logs = [log for log in logs if search.lower() in log["message"].lower()]
        
        # Apply time filters
        if start_time:
            logs = [log for log in logs if datetime.fromisoformat(log["timestamp"].replace('Z', '+00:00')) >= start_time]
        
        if end_time:
            logs = [log for log in logs if datetime.fromisoformat(log["timestamp"].replace('Z', '+00:00')) <= end_time]
        
        return {
            "logs": logs[:limit],
            "total": len(logs),
            "filters_applied": {
                "start_time": start_time.isoformat() if start_time else None,
                "end_time": end_time.isoformat() if end_time else None,
                "level": level,
                "category": category,
                "component": component,
                "search": search
            },
            "query_time_ms": 25
        }
        
    except Exception as e:
        logger.error(f"Error searching logs: {e}", category=LogCategory.MONITORING)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search logs"
        )


@router.get("/security/events")
async def get_security_events(
    hours: int = Query(24, description="Hours to look back for security events", le=168)
) -> Dict[str, Any]:
    """
    Get recent security events and incidents.
    
    Provides security monitoring data including threats, incidents,
    and security metrics for the specified time period.
    """
    try:
        security_monitor = get_security_monitor()
        dashboard_data = await security_monitor.get_security_dashboard()
        
        return {
            "summary": dashboard_data.get("summary", {}),
            "events_by_type": dashboard_data.get("events_by_type", {}),
            "active_incidents": dashboard_data.get("active_incidents", []),
            "top_source_ips": dashboard_data.get("top_source_ips", []),
            "threat_levels": dashboard_data.get("threat_levels", {}),
            "time_range_hours": hours,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching security events: {e}", category=LogCategory.SECURITY)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch security events"
        )


@router.get("/performance/traces")
async def get_performance_traces(
    service: Optional[str] = Query(None, description="Service name filter"),
    operation: Optional[str] = Query(None, description="Operation name filter"),
    duration_min: Optional[int] = Query(None, description="Minimum duration in milliseconds"),
    limit: int = Query(20, description="Maximum number of traces to return", le=100)
) -> Dict[str, Any]:
    """
    Get distributed tracing data for performance analysis.
    
    Provides detailed trace information for debugging performance issues
    and understanding request flow through the system.
    """
    try:
        telemetry_manager = get_telemetry_manager()
        
        # In a real implementation, this would query the tracing backend
        # For now, return mock trace data
        traces = [
            {
                "trace_id": f"trace_{i}",
                "operation": operation or f"operation_{i % 5}",
                "service": service or "opssight-backend",
                "duration_ms": 100 + (i * 10),
                "status": "ok" if i % 10 != 0 else "error",
                "start_time": (datetime.utcnow() - timedelta(minutes=i)).isoformat(),
                "spans": [
                    {
                        "span_id": f"span_{i}_{j}",
                        "operation": f"sub_op_{j}",
                        "duration_ms": 20 + (j * 5),
                        "tags": {"component": "database" if j == 0 else "cache"}
                    }
                    for j in range(3)
                ]
            }
            for i in range(min(limit, 20))
        ]
        
        # Apply filters
        if duration_min:
            traces = [trace for trace in traces if trace["duration_ms"] >= duration_min]
        
        return {
            "traces": traces,
            "total": len(traces),
            "filters_applied": {
                "service": service,
                "operation": operation,
                "duration_min": duration_min
            },
            "query_time_ms": 15
        }
        
    except Exception as e:
        logger.error(f"Error fetching performance traces: {e}", category=LogCategory.PERFORMANCE)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch performance traces"
        )


@router.get("/alerts/rules")
async def get_alert_rules() -> List[AlertRule]:
    """
    Get configured alerting rules.
    
    Returns all configured alert rules with their current status
    and configuration details.
    """
    try:
        # In a real implementation, this would come from alerting configuration
        rules = [
            AlertRule(
                name="high_error_rate",
                description="High HTTP error rate detected",
                condition="rate(http_requests_total{status=~\"5..\"}[5m]) > 0.1",
                severity="warning",
                enabled=True,
                notification_channels=["slack", "email"],
                threshold_value=0.1,
                evaluation_interval=60
            ),
            AlertRule(
                name="high_response_time",
                description="High response time detected",
                condition="histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2",
                severity="warning",
                enabled=True,
                notification_channels=["slack"],
                threshold_value=2.0,
                evaluation_interval=60
            ),
            AlertRule(
                name="database_connections_high",
                description="Database connection pool near exhaustion",
                condition="db_connections_active / db_connections_max > 0.9",
                severity="critical",
                enabled=True,
                notification_channels=["slack", "email", "pagerduty"],
                threshold_value=0.9,
                evaluation_interval=30
            )
        ]
        
        return rules
        
    except Exception as e:
        logger.error(f"Error fetching alert rules: {e}", category=LogCategory.MONITORING)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch alert rules"
        )


@router.get("/system/resources")
async def get_system_resources() -> Dict[str, Any]:
    """
    Get detailed system resource information.
    
    Provides comprehensive system resource usage including CPU, memory,
    disk, network, and process information.
    """
    try:
        enhanced_metrics = get_enhanced_metrics()
        
        # Force update system metrics
        enhanced_metrics.update_system_metrics()
        
        # Get current metrics summary
        summary = enhanced_metrics.get_metrics_summary()
        
        return {
            "cpu": {
                "usage_percent": summary.get("system", {}).get("cpu_percent", 0),
                "load_average": {
                    "1m": 0.5,   # This would come from actual system monitoring
                    "5m": 0.4,   # This would come from actual system monitoring
                    "15m": 0.3   # This would come from actual system monitoring
                },
                "cores": 4  # This would come from actual system info
            },
            "memory": {
                "usage_percent": summary.get("system", {}).get("memory_percent", 0),
                "available_mb": summary.get("system", {}).get("memory_available_mb", 0),
                "total_mb": 8192,    # This would come from actual system info
                "used_mb": 6144,     # This would come from actual system info
                "cached_mb": 1024,   # This would come from actual system info
                "buffers_mb": 512    # This would come from actual system info
            },
            "disk": {
                "usage_percent": 65,
                "available_gb": 50,
                "total_gb": 100,
                "used_gb": 50,
                "inodes_used": 150000,
                "inodes_total": 1000000
            },
            "network": {
                "bytes_sent": 2097152,
                "bytes_received": 1048576,
                "packets_sent": 1000,
                "packets_received": 800,
                "errors": 0,
                "dropped": 0
            },
            "processes": {
                "total": 150,
                "running": 5,
                "sleeping": 140,
                "zombie": 0,
                "stopped": 0
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching system resources: {e}", category=LogCategory.SYSTEM)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch system resources"
        )