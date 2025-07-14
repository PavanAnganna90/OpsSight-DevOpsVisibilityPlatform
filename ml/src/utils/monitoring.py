"""
Monitoring and metrics collection for ML infrastructure.

Provides comprehensive monitoring capabilities including performance metrics,
error tracking, and system health monitoring.
"""

import time
import logging
import threading
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime, timedelta
from collections import defaultdict, deque
from dataclasses import dataclass, field
import psutil
import json


@dataclass
class MetricPoint:
    """Individual metric data point."""
    name: str
    value: float
    timestamp: datetime
    tags: Dict[str, str] = field(default_factory=dict)


@dataclass
class HealthCheck:
    """Health check result."""
    name: str
    status: str  # healthy, unhealthy, degraded
    message: str
    timestamp: datetime
    response_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


class MetricsCollector:
    """
    High-performance metrics collector for ML infrastructure.
    
    Features:
    - Thread-safe metric collection
    - Automatic aggregation
    - Memory-efficient storage
    - Performance monitoring
    """
    
    def __init__(self, service_name: str, max_history: int = 10000):
        self.service_name = service_name
        self.max_history = max_history
        self.logger = logging.getLogger(__name__)
        
        # Thread-safe storage
        self._lock = threading.Lock()
        self._metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=max_history))
        self._counters: Dict[str, int] = defaultdict(int)
        self._gauges: Dict[str, float] = defaultdict(float)
        self._histograms: Dict[str, List[float]] = defaultdict(list)
        self._timers: Dict[str, List[float]] = defaultdict(list)
        
        # System metrics
        self._start_time = time.time()
        self._collect_system_metrics = True
        self._system_metrics_thread = None
        
        # Health checks
        self._health_checks: Dict[str, HealthCheck] = {}
        self._health_check_functions: Dict[str, Callable] = {}
        
        self._start_system_monitoring()
    
    def increment(self, metric_name: str, value: int = 1, tags: Optional[Dict[str, str]] = None):
        """Increment a counter metric."""
        with self._lock:
            full_name = self._build_metric_name(metric_name, tags)
            self._counters[full_name] += value
            
            # Store historical data
            metric_point = MetricPoint(
                name=metric_name,
                value=self._counters[full_name],
                timestamp=datetime.utcnow(),
                tags=tags or {}
            )
            self._metrics[full_name].append(metric_point)
    
    def gauge(self, metric_name: str, value: float, tags: Optional[Dict[str, str]] = None):
        """Set a gauge metric value."""
        with self._lock:
            full_name = self._build_metric_name(metric_name, tags)
            self._gauges[full_name] = value
            
            # Store historical data
            metric_point = MetricPoint(
                name=metric_name,
                value=value,
                timestamp=datetime.utcnow(),
                tags=tags or {}
            )
            self._metrics[full_name].append(metric_point)
    
    def histogram(self, metric_name: str, value: float, tags: Optional[Dict[str, str]] = None):
        """Record a histogram value."""
        with self._lock:
            full_name = self._build_metric_name(metric_name, tags)
            self._histograms[full_name].append(value)
            
            # Maintain bounded history
            if len(self._histograms[full_name]) > self.max_history:
                self._histograms[full_name] = self._histograms[full_name][-self.max_history:]
    
    def timer(self, metric_name: str, tags: Optional[Dict[str, str]] = None):
        """Context manager for timing operations."""
        return TimerContext(self, metric_name, tags)
    
    def record_timer(self, metric_name: str, duration: float, tags: Optional[Dict[str, str]] = None):
        """Record a timer value in seconds."""
        with self._lock:
            full_name = self._build_metric_name(metric_name, tags)
            self._timers[full_name].append(duration)
            
            # Maintain bounded history
            if len(self._timers[full_name]) > self.max_history:
                self._timers[full_name] = self._timers[full_name][-self.max_history:]
    
    def get_counter(self, metric_name: str, tags: Optional[Dict[str, str]] = None) -> int:
        """Get counter value."""
        full_name = self._build_metric_name(metric_name, tags)
        with self._lock:
            return self._counters.get(full_name, 0)
    
    def get_gauge(self, metric_name: str, tags: Optional[Dict[str, str]] = None) -> float:
        """Get gauge value."""
        full_name = self._build_metric_name(metric_name, tags)
        with self._lock:
            return self._gauges.get(full_name, 0.0)
    
    def get_histogram_stats(self, metric_name: str, tags: Optional[Dict[str, str]] = None) -> Dict[str, float]:
        """Get histogram statistics."""
        full_name = self._build_metric_name(metric_name, tags)
        with self._lock:
            values = self._histograms.get(full_name, [])
            if not values:
                return {}
            
            sorted_values = sorted(values)
            count = len(sorted_values)
            
            return {
                'count': count,
                'min': min(sorted_values),
                'max': max(sorted_values),
                'mean': sum(sorted_values) / count,
                'p50': sorted_values[int(count * 0.5)],
                'p90': sorted_values[int(count * 0.9)],
                'p95': sorted_values[int(count * 0.95)],
                'p99': sorted_values[int(count * 0.99)]
            }
    
    def get_timer_stats(self, metric_name: str, tags: Optional[Dict[str, str]] = None) -> Dict[str, float]:
        """Get timer statistics."""
        full_name = self._build_metric_name(metric_name, tags)
        with self._lock:
            values = self._timers.get(full_name, [])
            if not values:
                return {}
            
            sorted_values = sorted(values)
            count = len(sorted_values)
            
            return {
                'count': count,
                'min_ms': min(sorted_values) * 1000,
                'max_ms': max(sorted_values) * 1000,
                'mean_ms': (sum(sorted_values) / count) * 1000,
                'p50_ms': sorted_values[int(count * 0.5)] * 1000,
                'p90_ms': sorted_values[int(count * 0.9)] * 1000,
                'p95_ms': sorted_values[int(count * 0.95)] * 1000,
                'p99_ms': sorted_values[int(count * 0.99)] * 1000
            }
    
    def get_all_metrics(self) -> Dict[str, Any]:
        """Get all collected metrics."""
        with self._lock:
            return {
                'service': self.service_name,
                'uptime_seconds': time.time() - self._start_time,
                'timestamp': datetime.utcnow().isoformat(),
                'counters': dict(self._counters),
                'gauges': dict(self._gauges),
                'histograms': {k: self.get_histogram_stats(k.split('|')[0], self._parse_tags(k)) 
                              for k in self._histograms.keys()},
                'timers': {k: self.get_timer_stats(k.split('|')[0], self._parse_tags(k)) 
                          for k in self._timers.keys()},
                'system': self._get_system_metrics(),
                'health_checks': {k: {
                    'status': v.status,
                    'message': v.message,
                    'response_time_ms': v.response_time_ms,
                    'timestamp': v.timestamp.isoformat(),
                    'metadata': v.metadata
                } for k, v in self._health_checks.items()}
            }
    
    def register_health_check(self, name: str, check_function: Callable[[], bool], 
                            message: str = "Health check"):
        """Register a health check function."""
        self._health_check_functions[name] = check_function
        self.logger.info(f"Registered health check: {name}")
    
    def run_health_checks(self) -> Dict[str, HealthCheck]:
        """Run all registered health checks."""
        results = {}
        
        for name, check_function in self._health_check_functions.items():
            start_time = time.time()
            try:
                is_healthy = check_function()
                response_time = (time.time() - start_time) * 1000
                
                health_check = HealthCheck(
                    name=name,
                    status="healthy" if is_healthy else "unhealthy",
                    message="Health check passed" if is_healthy else "Health check failed",
                    timestamp=datetime.utcnow(),
                    response_time_ms=response_time
                )
                
            except Exception as e:
                response_time = (time.time() - start_time) * 1000
                health_check = HealthCheck(
                    name=name,
                    status="unhealthy",
                    message=f"Health check error: {str(e)}",
                    timestamp=datetime.utcnow(),
                    response_time_ms=response_time,
                    metadata={'error': str(e)}
                )
            
            results[name] = health_check
            self._health_checks[name] = health_check
        
        return results
    
    def _build_metric_name(self, name: str, tags: Optional[Dict[str, str]]) -> str:
        """Build full metric name with tags."""
        if not tags:
            return name
        
        tag_string = '|'.join([f"{k}:{v}" for k, v in sorted(tags.items())])
        return f"{name}|{tag_string}"
    
    def _parse_tags(self, full_name: str) -> Dict[str, str]:
        """Parse tags from full metric name."""
        parts = full_name.split('|')
        if len(parts) < 2:
            return {}
        
        tags = {}
        for tag_part in parts[1:]:
            if ':' in tag_part:
                key, value = tag_part.split(':', 1)
                tags[key] = value
        
        return tags
    
    def _start_system_monitoring(self):
        """Start system metrics collection in background thread."""
        def collect_system_metrics():
            while self._collect_system_metrics:
                try:
                    self._collect_current_system_metrics()
                    time.sleep(30)  # Collect every 30 seconds
                except Exception as e:
                    self.logger.error(f"Error collecting system metrics: {e}")
                    time.sleep(60)  # Back off on errors
        
        self._system_metrics_thread = threading.Thread(
            target=collect_system_metrics,
            daemon=True
        )
        self._system_metrics_thread.start()
    
    def _collect_current_system_metrics(self):
        """Collect current system metrics."""
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        self.gauge('system.cpu.percent', cpu_percent)
        
        # Memory metrics
        memory = psutil.virtual_memory()
        self.gauge('system.memory.percent', memory.percent)
        self.gauge('system.memory.available_gb', memory.available / (1024**3))
        self.gauge('system.memory.used_gb', memory.used / (1024**3))
        
        # Disk metrics
        disk = psutil.disk_usage('/')
        self.gauge('system.disk.percent', disk.percent)
        self.gauge('system.disk.free_gb', disk.free / (1024**3))
        
        # Network metrics
        network = psutil.net_io_counters()
        self.gauge('system.network.bytes_sent', network.bytes_sent)
        self.gauge('system.network.bytes_recv', network.bytes_recv)
        
        # Process metrics
        process = psutil.Process()
        self.gauge('process.cpu.percent', process.cpu_percent())
        self.gauge('process.memory.percent', process.memory_percent())
        self.gauge('process.memory.rss_mb', process.memory_info().rss / (1024**2))
        self.gauge('process.threads.count', process.num_threads())
    
    def _get_system_metrics(self) -> Dict[str, float]:
        """Get current system metrics."""
        try:
            return {
                'cpu_percent': psutil.cpu_percent(),
                'memory_percent': psutil.virtual_memory().percent,
                'disk_percent': psutil.disk_usage('/').percent,
                'uptime_seconds': time.time() - self._start_time
            }
        except Exception as e:
            self.logger.error(f"Error getting system metrics: {e}")
            return {}
    
    def export_prometheus_format(self) -> str:
        """Export metrics in Prometheus format."""
        lines = []
        
        # Counters
        for metric_name, value in self._counters.items():
            name, tags = self._split_metric_name(metric_name)
            lines.append(f"# TYPE {name} counter")
            lines.append(f"{name}{tags} {value}")
        
        # Gauges
        for metric_name, value in self._gauges.items():
            name, tags = self._split_metric_name(metric_name)
            lines.append(f"# TYPE {name} gauge")
            lines.append(f"{name}{tags} {value}")
        
        return '\n'.join(lines)
    
    def _split_metric_name(self, full_name: str) -> tuple:
        """Split metric name and format tags for Prometheus."""
        parts = full_name.split('|')
        name = parts[0]
        
        if len(parts) > 1:
            tag_parts = []
            for tag_part in parts[1:]:
                if ':' in tag_part:
                    key, value = tag_part.split(':', 1)
                    tag_parts.append(f'{key}="{value}"')
            
            tags = '{' + ','.join(tag_parts) + '}' if tag_parts else ''
        else:
            tags = ''
        
        return name, tags
    
    def stop(self):
        """Stop metrics collection."""
        self._collect_system_metrics = False
        if self._system_metrics_thread:
            self._system_metrics_thread.join(timeout=5)
        self.logger.info("Metrics collector stopped")


class TimerContext:
    """Context manager for timing operations."""
    
    def __init__(self, collector: MetricsCollector, metric_name: str, tags: Optional[Dict[str, str]] = None):
        self.collector = collector
        self.metric_name = metric_name
        self.tags = tags
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.start_time:
            duration = time.time() - self.start_time
            self.collector.record_timer(self.metric_name, duration, self.tags)


class PerformanceMonitor:
    """Performance monitoring for ML operations."""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics = metrics_collector
        self.logger = logging.getLogger(__name__)
    
    def monitor_function(self, function_name: str, tags: Optional[Dict[str, str]] = None):
        """Decorator to monitor function performance."""
        def decorator(func):
            def wrapper(*args, **kwargs):
                with self.metrics.timer(f"function.{function_name}.duration", tags):
                    try:
                        result = func(*args, **kwargs)
                        self.metrics.increment(f"function.{function_name}.success", tags=tags)
                        return result
                    except Exception as e:
                        self.metrics.increment(f"function.{function_name}.error", tags=tags)
                        self.logger.error(f"Function {function_name} failed: {e}")
                        raise
            return wrapper
        return decorator
    
    def track_ml_training(self, model_name: str, stage: str):
        """Track ML training performance."""
        tags = {'model': model_name, 'stage': stage}
        return self.metrics.timer('ml.training.duration', tags)
    
    def track_inference_request(self, model_name: str, model_version: str):
        """Track inference request performance."""
        tags = {'model': model_name, 'version': model_version}
        return self.metrics.timer('ml.inference.duration', tags)