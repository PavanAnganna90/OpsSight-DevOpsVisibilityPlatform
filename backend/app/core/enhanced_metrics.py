"""
Enhanced Metrics Collection and Management

Extends the existing Prometheus metrics with business metrics, custom collectors,
and advanced monitoring capabilities.
"""

import time
import asyncio
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import psutil
import gc

from prometheus_client import (
    Counter, Histogram, Gauge, Summary, Info, Enum as PrometheusEnum,
    CollectorRegistry, multiprocess, generate_latest, CONTENT_TYPE_LATEST
)
from prometheus_client.core import REGISTRY

from app.core.enhanced_logging import get_logger, LogCategory
from app.core.telemetry import get_telemetry_manager, trace_operation


class MetricType(Enum):
    """Types of metrics for categorization."""
    SYSTEM = "system"
    APPLICATION = "application"
    BUSINESS = "business"
    SECURITY = "security"
    PERFORMANCE = "performance"
    EXTERNAL = "external"


@dataclass
class MetricDefinition:
    """Definition of a custom metric."""
    name: str
    description: str
    metric_type: MetricType
    labels: List[str]
    unit: Optional[str] = None


class EnhancedMetricsCollector:
    """Enhanced metrics collector with business and system metrics."""
    
    def __init__(self, registry: Optional[CollectorRegistry] = None):
        self.registry = registry or REGISTRY
        self.logger = get_logger(__name__)
        self.telemetry_manager = get_telemetry_manager()
        
        # Initialize enhanced metrics
        self._init_system_metrics()
        self._init_application_metrics()
        self._init_business_metrics()
        self._init_security_metrics()
        self._init_performance_metrics()
        
        # Custom metric collectors
        self.custom_collectors: Dict[str, Callable] = {}
        
        # Metric collection state
        self.collection_start_time = time.time()
        self.last_collection_time = None
        
    def _init_system_metrics(self):
        """Initialize system-level metrics."""
        # CPU metrics
        self.cpu_usage = Gauge(
            'system_cpu_usage_percent',
            'CPU usage percentage',
            registry=self.registry
        )
        
        self.cpu_load_1m = Gauge(
            'system_cpu_load_1m',
            '1-minute load average',
            registry=self.registry
        )
        
        self.cpu_load_5m = Gauge(
            'system_cpu_load_5m',
            '5-minute load average',
            registry=self.registry
        )
        
        self.cpu_load_15m = Gauge(
            'system_cpu_load_15m',
            '15-minute load average',
            registry=self.registry
        )
        
        # Memory metrics
        self.memory_usage = Gauge(
            'system_memory_usage_bytes',
            'Memory usage in bytes',
            ['type'],
            registry=self.registry
        )
        
        self.memory_usage_percent = Gauge(
            'system_memory_usage_percent',
            'Memory usage percentage',
            registry=self.registry
        )
        
        # Disk metrics
        self.disk_usage = Gauge(
            'system_disk_usage_bytes',
            'Disk usage in bytes',
            ['path', 'type'],
            registry=self.registry
        )
        
        self.disk_usage_percent = Gauge(
            'system_disk_usage_percent',
            'Disk usage percentage',
            ['path'],
            registry=self.registry
        )
        
        # Network metrics
        self.network_bytes = Counter(
            'system_network_bytes_total',
            'Network bytes transferred',
            ['interface', 'direction'],
            registry=self.registry
        )
        
        # Process metrics
        self.process_count = Gauge(
            'system_process_count',
            'Number of running processes',
            registry=self.registry
        )
        
        self.file_descriptors = Gauge(
            'system_file_descriptors_open',
            'Number of open file descriptors',
            registry=self.registry
        )
    
    def _init_application_metrics(self):
        """Initialize application-level metrics."""
        # HTTP metrics (enhanced)
        self.http_requests_total = Counter(
            'http_requests_total',
            'Total HTTP requests',
            ['method', 'endpoint', 'status_code', 'user_type'],
            registry=self.registry
        )
        
        self.http_request_duration = Histogram(
            'http_request_duration_seconds',
            'HTTP request duration',
            ['method', 'endpoint'],
            buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
            registry=self.registry
        )
        
        self.http_request_size = Histogram(
            'http_request_size_bytes',
            'HTTP request size in bytes',
            ['method', 'endpoint'],
            registry=self.registry
        )
        
        self.http_response_size = Histogram(
            'http_response_size_bytes',
            'HTTP response size in bytes',
            ['method', 'endpoint'],
            registry=self.registry
        )
        
        # Database metrics (enhanced)
        self.db_connections_active = Gauge(
            'db_connections_active',
            'Active database connections',
            ['database'],
            registry=self.registry
        )
        
        self.db_connections_idle = Gauge(
            'db_connections_idle',
            'Idle database connections',
            ['database'],
            registry=self.registry
        )
        
        self.db_query_duration = Histogram(
            'db_query_duration_seconds',
            'Database query duration',
            ['operation', 'table'],
            buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
            registry=self.registry
        )
        
        self.db_slow_queries = Counter(
            'db_slow_queries_total',
            'Total slow database queries',
            ['operation', 'table'],
            registry=self.registry
        )
        
        # Cache metrics (enhanced)
        self.cache_operations = Counter(
            'cache_operations_total',
            'Cache operations',
            ['operation', 'cache_type', 'result'],
            registry=self.registry
        )
        
        self.cache_hit_ratio = Gauge(
            'cache_hit_ratio',
            'Cache hit ratio',
            ['cache_type'],
            registry=self.registry
        )
        
        self.cache_memory_usage = Gauge(
            'cache_memory_usage_bytes',
            'Cache memory usage',
            ['cache_type'],
            registry=self.registry
        )
        
        # Background task metrics
        self.background_tasks_active = Gauge(
            'background_tasks_active',
            'Active background tasks',
            ['task_type'],
            registry=self.registry
        )
        
        self.background_task_duration = Histogram(
            'background_task_duration_seconds',
            'Background task duration',
            ['task_type'],
            registry=self.registry
        )
        
        self.background_task_errors = Counter(
            'background_task_errors_total',
            'Background task errors',
            ['task_type', 'error_type'],
            registry=self.registry
        )
    
    def _init_business_metrics(self):
        """Initialize business-specific metrics."""
        # User metrics
        self.active_users = Gauge(
            'business_active_users',
            'Number of active users',
            ['time_window'],
            registry=self.registry
        )
        
        self.user_sessions = Gauge(
            'business_user_sessions_active',
            'Active user sessions',
            registry=self.registry
        )
        
        self.user_actions = Counter(
            'business_user_actions_total',
            'User actions performed',
            ['action_type', 'user_role'],
            registry=self.registry
        )
        
        # Pipeline metrics
        self.pipeline_executions = Counter(
            'business_pipeline_executions_total',
            'Pipeline executions',
            ['pipeline_type', 'status', 'environment'],
            registry=self.registry
        )
        
        self.pipeline_duration = Histogram(
            'business_pipeline_duration_seconds',
            'Pipeline execution duration',
            ['pipeline_type', 'environment'],
            buckets=[10, 30, 60, 120, 300, 600, 1200, 1800, 3600],
            registry=self.registry
        )
        
        self.pipeline_queue_size = Gauge(
            'business_pipeline_queue_size',
            'Pipeline queue size',
            ['priority'],
            registry=self.registry
        )
        
        # Deployment metrics
        self.deployments = Counter(
            'business_deployments_total',
            'Application deployments',
            ['environment', 'status', 'deployment_type'],
            registry=self.registry
        )
        
        self.deployment_frequency = Gauge(
            'business_deployment_frequency_per_day',
            'Deployment frequency per day',
            ['environment'],
            registry=self.registry
        )
        
        # Integration metrics
        self.integration_calls = Counter(
            'business_integration_calls_total',
            'External integration calls',
            ['service', 'operation', 'status'],
            registry=self.registry
        )
        
        self.integration_latency = Histogram(
            'business_integration_latency_seconds',
            'External integration latency',
            ['service', 'operation'],
            registry=self.registry
        )
    
    def _init_security_metrics(self):
        """Initialize security-related metrics."""
        # Authentication metrics
        self.auth_attempts = Counter(
            'security_auth_attempts_total',
            'Authentication attempts',
            ['method', 'result', 'user_type'],
            registry=self.registry
        )
        
        self.failed_logins = Counter(
            'security_failed_logins_total',
            'Failed login attempts',
            ['reason', 'source_ip_class'],
            registry=self.registry
        )
        
        # Rate limiting metrics
        self.rate_limit_violations = Counter(
            'security_rate_limit_violations_total',
            'Rate limit violations',
            ['endpoint', 'limit_type'],
            registry=self.registry
        )
        
        self.blocked_ips = Gauge(
            'security_blocked_ips_count',
            'Number of blocked IP addresses',
            registry=self.registry
        )
        
        # Input validation metrics
        self.input_validation_failures = Counter(
            'security_input_validation_failures_total',
            'Input validation failures',
            ['validation_type', 'endpoint'],
            registry=self.registry
        )
        
        # File upload security
        self.file_upload_rejections = Counter(
            'security_file_upload_rejections_total',
            'File upload rejections',
            ['rejection_reason', 'file_type'],
            registry=self.registry
        )
        
        # Security events
        self.security_events = Counter(
            'security_events_total',
            'Security events detected',
            ['event_type', 'severity'],
            registry=self.registry
        )
    
    def _init_performance_metrics(self):
        """Initialize performance metrics."""
        # Garbage collection
        self.gc_collections = Counter(
            'performance_gc_collections_total',
            'Garbage collection runs',
            ['generation'],
            registry=self.registry
        )
        
        self.gc_duration = Histogram(
            'performance_gc_duration_seconds',
            'Garbage collection duration',
            ['generation'],
            registry=self.registry
        )
        
        # Thread metrics
        self.thread_count = Gauge(
            'performance_threads_active',
            'Active thread count',
            registry=self.registry
        )
        
        # Response time percentiles
        self.response_time_percentiles = Summary(
            'performance_response_time_percentiles',
            'Response time percentiles',
            ['endpoint'],
            registry=self.registry
        )
        
        # Resource utilization
        self.resource_utilization = Gauge(
            'performance_resource_utilization_percent',
            'Resource utilization percentage',
            ['resource_type'],
            registry=self.registry
        )
    
    def update_system_metrics(self):
        """Update system-level metrics."""
        with trace_operation("update_system_metrics"):
            try:
                # CPU metrics
                cpu_percent = psutil.cpu_percent(interval=0.1)
                self.cpu_usage.set(cpu_percent)
                
                load_avg = psutil.getloadavg()
                self.cpu_load_1m.set(load_avg[0])
                self.cpu_load_5m.set(load_avg[1])
                self.cpu_load_15m.set(load_avg[2])
                
                # Memory metrics
                memory = psutil.virtual_memory()
                self.memory_usage.labels(type='used').set(memory.used)
                self.memory_usage.labels(type='available').set(memory.available)
                self.memory_usage.labels(type='cached').set(memory.cached)
                self.memory_usage.labels(type='buffers').set(memory.buffers)
                self.memory_usage_percent.set(memory.percent)
                
                # Disk metrics
                disk_usage = psutil.disk_usage('/')
                self.disk_usage.labels(path='/', type='used').set(disk_usage.used)
                self.disk_usage.labels(path='/', type='free').set(disk_usage.free)
                self.disk_usage.labels(path='/', type='total').set(disk_usage.total)
                self.disk_usage_percent.labels(path='/').set((disk_usage.used / disk_usage.total) * 100)
                
                # Process metrics
                self.process_count.set(len(psutil.pids()))
                
                # File descriptors (Unix only)
                try:
                    process = psutil.Process()
                    self.file_descriptors.set(process.num_fds())
                except (AttributeError, NotImplementedError):
                    pass
                
            except Exception as e:
                self.logger.error(f"Error updating system metrics: {e}", category=LogCategory.MONITORING)
    
    def update_gc_metrics(self):
        """Update garbage collection metrics."""
        try:
            gc_stats = gc.get_stats()
            for generation, stats in enumerate(gc_stats):
                self.gc_collections.labels(generation=str(generation)).inc(stats.get('collections', 0))
        except Exception as e:
            self.logger.error(f"Error updating GC metrics: {e}", category=LogCategory.PERFORMANCE)
    
    def record_http_request(self, method: str, endpoint: str, status_code: int, 
                           duration: float, request_size: int, response_size: int,
                           user_type: str = "anonymous"):
        """Record HTTP request metrics."""
        self.http_requests_total.labels(
            method=method,
            endpoint=endpoint,
            status_code=str(status_code),
            user_type=user_type
        ).inc()
        
        self.http_request_duration.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)
        
        self.http_request_size.labels(
            method=method,
            endpoint=endpoint
        ).observe(request_size)
        
        self.http_response_size.labels(
            method=method,
            endpoint=endpoint
        ).observe(response_size)
        
        self.response_time_percentiles.labels(
            endpoint=endpoint
        ).observe(duration)
    
    def record_db_query(self, operation: str, table: str, duration: float, slow_threshold: float = 1.0):
        """Record database query metrics."""
        self.db_query_duration.labels(
            operation=operation,
            table=table
        ).observe(duration)
        
        if duration > slow_threshold:
            self.db_slow_queries.labels(
                operation=operation,
                table=table
            ).inc()
    
    def record_cache_operation(self, operation: str, cache_type: str, hit: bool):
        """Record cache operation metrics."""
        result = "hit" if hit else "miss"
        self.cache_operations.labels(
            operation=operation,
            cache_type=cache_type,
            result=result
        ).inc()
    
    def record_pipeline_execution(self, pipeline_type: str, status: str, 
                                 environment: str, duration: float):
        """Record pipeline execution metrics."""
        self.pipeline_executions.labels(
            pipeline_type=pipeline_type,
            status=status,
            environment=environment
        ).inc()
        
        self.pipeline_duration.labels(
            pipeline_type=pipeline_type,
            environment=environment
        ).observe(duration)
    
    def record_auth_attempt(self, method: str, result: str, user_type: str = "user"):
        """Record authentication attempt."""
        self.auth_attempts.labels(
            method=method,
            result=result,
            user_type=user_type
        ).inc()
        
        if result == "failed":
            # Classify IP for security analysis
            ip_class = "internal"  # This would be determined by IP analysis
            self.failed_logins.labels(
                reason="invalid_credentials",
                source_ip_class=ip_class
            ).inc()
    
    def record_security_event(self, event_type: str, severity: str):
        """Record security event."""
        self.security_events.labels(
            event_type=event_type,
            severity=severity
        ).inc()
    
    def record_rate_limit_violation(self, endpoint: str, limit_type: str):
        """Record rate limit violation."""
        self.rate_limit_violations.labels(
            endpoint=endpoint,
            limit_type=limit_type
        ).inc()
    
    def record_input_validation_failure(self, validation_type: str, endpoint: str):
        """Record input validation failure."""
        self.input_validation_failures.labels(
            validation_type=validation_type,
            endpoint=endpoint
        ).inc()
    
    def record_file_upload_rejection(self, reason: str, file_type: str):
        """Record file upload rejection."""
        self.file_upload_rejections.labels(
            rejection_reason=reason,
            file_type=file_type
        ).inc()
    
    def register_custom_collector(self, name: str, collector_func: Callable):
        """Register a custom metric collector function."""
        self.custom_collectors[name] = collector_func
    
    def collect_custom_metrics(self):
        """Run all custom metric collectors."""
        for name, collector in self.custom_collectors.items():
            try:
                collector()
            except Exception as e:
                self.logger.error(f"Error in custom collector {name}: {e}", category=LogCategory.MONITORING)
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of all metrics."""
        runtime = time.time() - self.collection_start_time
        
        try:
            # Get current metric values
            cpu_usage = psutil.cpu_percent()
            memory = psutil.virtual_memory()
            
            return {
                "runtime_seconds": runtime,
                "last_collection": self.last_collection_time.isoformat() if self.last_collection_time else None,
                "system": {
                    "cpu_percent": cpu_usage,
                    "memory_percent": memory.percent,
                    "memory_available_mb": memory.available / (1024 * 1024),
                },
                "collectors": {
                    "custom_collectors": len(self.custom_collectors),
                    "total_metrics": len(list(self.registry._collector_to_names.keys())),
                },
            }
        except Exception as e:
            self.logger.error(f"Error getting metrics summary: {e}", category=LogCategory.MONITORING)
            return {"error": str(e)}
    
    async def start_periodic_collection(self, interval: int = 30):
        """Start periodic metric collection."""
        self.logger.info(f"Starting periodic metrics collection (interval: {interval}s)", category=LogCategory.MONITORING)
        
        while True:
            try:
                self.update_system_metrics()
                self.update_gc_metrics()
                self.collect_custom_metrics()
                self.last_collection_time = datetime.utcnow()
                
            except Exception as e:
                self.logger.error(f"Error in periodic metrics collection: {e}", category=LogCategory.MONITORING)
            
            await asyncio.sleep(interval)


# Global enhanced metrics collector
enhanced_metrics = EnhancedMetricsCollector()


def get_enhanced_metrics() -> EnhancedMetricsCollector:
    """Get the global enhanced metrics collector."""
    return enhanced_metrics


def export_metrics() -> str:
    """Export all metrics in Prometheus format."""
    return generate_latest(enhanced_metrics.registry)


def get_content_type() -> str:
    """Get the content type for metrics export."""
    return CONTENT_TYPE_LATEST