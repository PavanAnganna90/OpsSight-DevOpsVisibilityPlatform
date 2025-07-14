"""
Enhanced Logging System with OpenTelemetry Integration

Provides structured logging with correlation IDs, distributed tracing context,
and comprehensive log aggregation capabilities.
"""

import json
import logging
import logging.config
import sys
import time
import uuid
import threading
from datetime import datetime, timezone
from typing import Any, Dict, Optional, List
from contextlib import contextmanager
from enum import Enum
from dataclasses import dataclass, asdict

from app.core.telemetry import get_telemetry_manager


class LogLevel(Enum):
    """Enhanced log levels with operational context."""
    TRACE = "TRACE"
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class LogCategory(Enum):
    """Enhanced log categories for operational monitoring."""
    AUTHENTICATION = "auth"
    AUTHORIZATION = "authz"
    API_REQUEST = "api_request"
    API_RESPONSE = "api_response"
    DATABASE_QUERY = "db_query"
    DATABASE_CONNECTION = "db_connection"
    CACHE_OPERATION = "cache_op"
    EXTERNAL_API = "external_api"
    PERFORMANCE = "performance"
    SECURITY = "security"
    BUSINESS_LOGIC = "business"
    SYSTEM = "system"
    GITHUB_INTEGRATION = "github"
    WEBSOCKET = "websocket"
    BACKGROUND_TASK = "background"
    FILE_OPERATION = "file_op"
    NETWORK = "network"
    DEPLOYMENT = "deployment"
    MONITORING = "monitoring"
    AUDIT = "audit"


@dataclass
class LogContext:
    """Structured log context with tracing information."""
    request_id: Optional[str] = None
    trace_id: Optional[str] = None
    span_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    operation: Optional[str] = None
    service: str = "opssight-backend"
    version: str = "1.0.0"
    environment: str = "development"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary, filtering None values."""
        return {k: v for k, v in asdict(self).items() if v is not None}


class CorrelationIDManager:
    """Manages correlation IDs across request lifecycle."""
    
    _context = threading.local()
    
    @classmethod
    def set_correlation_id(cls, correlation_id: str):
        """Set correlation ID for current thread."""
        cls._context.correlation_id = correlation_id
    
    @classmethod
    def get_correlation_id(cls) -> Optional[str]:
        """Get correlation ID for current thread."""
        return getattr(cls._context, 'correlation_id', None)
    
    @classmethod
    def generate_correlation_id(cls) -> str:
        """Generate new correlation ID."""
        return str(uuid.uuid4())
    
    @classmethod
    def ensure_correlation_id(cls) -> str:
        """Ensure correlation ID exists, generate if needed."""
        correlation_id = cls.get_correlation_id()
        if not correlation_id:
            correlation_id = cls.generate_correlation_id()
            cls.set_correlation_id(correlation_id)
        return correlation_id


class EnhancedStructuredFormatter(logging.Formatter):
    """Enhanced JSON formatter with tracing and correlation context."""
    
    def __init__(self, include_trace_context: bool = True):
        super().__init__()
        self.include_trace_context = include_trace_context
        self.telemetry_manager = get_telemetry_manager()
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record with enhanced structured data."""
        # Base log structure
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # Add correlation ID
        correlation_id = CorrelationIDManager.get_correlation_id()
        if correlation_id:
            log_data["correlation_id"] = correlation_id
        
        # Add tracing context if available
        if self.include_trace_context and self.telemetry_manager._initialized:
            trace_id = self.telemetry_manager.get_current_trace_id()
            span_id = self.telemetry_manager.get_current_span_id()
            
            if trace_id:
                log_data["trace_id"] = trace_id
            if span_id:
                log_data["span_id"] = span_id
        
        # Add custom log context if present
        if hasattr(record, 'log_context'):
            context_data = record.log_context.to_dict()
            log_data.update(context_data)
        
        # Add category if present
        if hasattr(record, 'category'):
            log_data["category"] = record.category.value if isinstance(record.category, LogCategory) else record.category
        
        # Add extra fields from record
        extra_fields = {}
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 'pathname',
                          'filename', 'module', 'lineno', 'funcName', 'created', 'msecs',
                          'relativeCreated', 'thread', 'threadName', 'processName', 'process',
                          'getMessage', 'exc_info', 'exc_text', 'stack_info', 'log_context', 'category']:
                extra_fields[key] = value
        
        if extra_fields:
            log_data["extra"] = extra_fields
        
        # Add source information
        log_data["source"] = {
            "file": record.filename,
            "line": record.lineno,
            "function": record.funcName,
            "module": record.module,
        }
        
        # Add exception information if present
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": self.formatException(record.exc_info) if record.exc_info else None,
            }
        
        # Add performance metrics if present
        if hasattr(record, 'duration'):
            log_data["performance"] = {
                "duration_ms": record.duration,
                "slow_operation": record.duration > 1000,  # Mark operations > 1s as slow
            }
        
        return json.dumps(log_data, default=str, ensure_ascii=False)


class EnhancedLogger:
    """Enhanced logger with category support and structured logging."""
    
    def __init__(self, name: str, context: Optional[LogContext] = None):
        self.logger = logging.getLogger(name)
        self.context = context or LogContext()
        self.telemetry_manager = get_telemetry_manager()
    
    def _log(self, level: LogLevel, message: str, category: LogCategory, 
             extra: Optional[Dict[str, Any]] = None, **kwargs):
        """Internal logging method with enhanced context."""
        # Ensure correlation ID
        CorrelationIDManager.ensure_correlation_id()
        
        # Create log record with enhanced data
        extra_data = extra or {}
        extra_data.update(kwargs)
        
        # Add timing information if provided
        if 'start_time' in extra_data:
            duration = (time.time() - extra_data['start_time']) * 1000
            extra_data['duration'] = round(duration, 2)
        
        # Log with category and context
        self.logger.log(
            getattr(logging, level.value),
            message,
            extra={
                'log_context': self.context,
                'category': category,
                **extra_data
            }
        )
    
    def trace(self, message: str, category: LogCategory = LogCategory.SYSTEM, **kwargs):
        """Log trace level message."""
        self._log(LogLevel.DEBUG, message, category, **kwargs)  # Map to DEBUG since TRACE doesn't exist
    
    def debug(self, message: str, category: LogCategory = LogCategory.SYSTEM, **kwargs):
        """Log debug level message."""
        self._log(LogLevel.DEBUG, message, category, **kwargs)
    
    def info(self, message: str, category: LogCategory = LogCategory.SYSTEM, **kwargs):
        """Log info level message."""
        self._log(LogLevel.INFO, message, category, **kwargs)
    
    def warning(self, message: str, category: LogCategory = LogCategory.SYSTEM, **kwargs):
        """Log warning level message."""
        self._log(LogLevel.WARNING, message, category, **kwargs)
    
    def error(self, message: str, category: LogCategory = LogCategory.SYSTEM, **kwargs):
        """Log error level message."""
        self._log(LogLevel.ERROR, message, category, **kwargs)
    
    def critical(self, message: str, category: LogCategory = LogCategory.SYSTEM, **kwargs):
        """Log critical level message."""
        self._log(LogLevel.CRITICAL, message, category, **kwargs)
    
    def log_api_request(self, method: str, path: str, status_code: int, 
                       duration: float, client_ip: str, user_id: Optional[str] = None):
        """Log API request with structured data."""
        self.info(
            f"{method} {path} - {status_code}",
            category=LogCategory.API_REQUEST,
            http_method=method,
            http_path=path,
            http_status_code=status_code,
            duration=duration,
            client_ip=client_ip,
            user_id=user_id,
        )
    
    def log_database_query(self, query_type: str, table: str, duration: float, 
                          rows_affected: Optional[int] = None):
        """Log database query with performance metrics."""
        self.info(
            f"Database {query_type} on {table}",
            category=LogCategory.DATABASE_QUERY,
            query_type=query_type,
            table=table,
            duration=duration,
            rows_affected=rows_affected,
            slow_query=duration > 1000,
        )
    
    def log_external_api_call(self, service: str, endpoint: str, method: str,
                             status_code: int, duration: float):
        """Log external API call with timing."""
        self.info(
            f"External API call to {service}",
            category=LogCategory.EXTERNAL_API,
            service=service,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            duration=duration,
        )
    
    def log_security_event(self, event_type: str, details: str, severity: str = "medium",
                          client_ip: Optional[str] = None, user_id: Optional[str] = None):
        """Log security event with context."""
        level = LogLevel.WARNING if severity == "medium" else LogLevel.ERROR
        self._log(
            level,
            f"Security event: {event_type}",
            LogCategory.SECURITY,
            event_type=event_type,
            details=details,
            severity=severity,
            client_ip=client_ip,
            user_id=user_id,
        )
    
    def log_performance_metric(self, operation: str, duration: float, 
                              additional_metrics: Optional[Dict[str, Any]] = None):
        """Log performance metrics."""
        metrics = additional_metrics or {}
        self.info(
            f"Performance: {operation}",
            category=LogCategory.PERFORMANCE,
            operation=operation,
            duration=duration,
            **metrics,
        )
    
    @contextmanager
    def operation_context(self, operation: str, category: LogCategory = LogCategory.SYSTEM):
        """Context manager for tracking operation duration."""
        start_time = time.time()
        correlation_id = CorrelationIDManager.ensure_correlation_id()
        
        # Update context
        old_operation = self.context.operation
        self.context.operation = operation
        
        self.info(f"Starting operation: {operation}", category=category, operation=operation)
        
        try:
            yield self
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            self.error(
                f"Operation failed: {operation}",
                category=category,
                operation=operation,
                duration=round(duration, 2),
                error=str(e),
                exc_info=True,
            )
            raise
        else:
            duration = (time.time() - start_time) * 1000
            self.info(
                f"Operation completed: {operation}",
                category=category,
                operation=operation,
                duration=round(duration, 2),
            )
        finally:
            # Restore context
            self.context.operation = old_operation


class LoggerFactory:
    """Factory for creating enhanced loggers."""
    
    _initialized = False
    _loggers: Dict[str, EnhancedLogger] = {}
    
    @classmethod
    def initialize(cls, log_level: str = "INFO", environment: str = "development"):
        """Initialize logging configuration."""
        if cls._initialized:
            return
        
        # Configure logging
        logging_config = {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "structured": {
                    "()": EnhancedStructuredFormatter,
                    "include_trace_context": True,
                },
                "simple": {
                    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                },
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "structured" if environment != "development" else "simple",
                    "stream": sys.stdout,
                },
                "file": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "formatter": "structured",
                    "filename": "logs/application.log",
                    "maxBytes": 100 * 1024 * 1024,  # 100MB
                    "backupCount": 5,
                },
                "security": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "formatter": "structured",
                    "filename": "logs/security.log",
                    "maxBytes": 50 * 1024 * 1024,  # 50MB
                    "backupCount": 10,
                },
                "performance": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "formatter": "structured",
                    "filename": "logs/performance.log",
                    "maxBytes": 50 * 1024 * 1024,  # 50MB
                    "backupCount": 5,
                },
            },
            "loggers": {
                "": {  # Root logger
                    "level": log_level,
                    "handlers": ["console", "file"],
                },
                "security": {
                    "level": "INFO",
                    "handlers": ["console", "security"],
                    "propagate": False,
                },
                "performance": {
                    "level": "INFO",
                    "handlers": ["console", "performance"],
                    "propagate": False,
                },
                "uvicorn": {
                    "level": "INFO",
                    "handlers": ["console"],
                    "propagate": False,
                },
            },
        }
        
        # Ensure log directory exists
        import os
        os.makedirs("logs", exist_ok=True)
        
        logging.config.dictConfig(logging_config)
        cls._initialized = True
    
    @classmethod
    def get_logger(cls, name: str, context: Optional[LogContext] = None) -> EnhancedLogger:
        """Get or create enhanced logger."""
        if not cls._initialized:
            cls.initialize()
        
        if name not in cls._loggers:
            cls._loggers[name] = EnhancedLogger(name, context)
        
        return cls._loggers[name]
    
    @classmethod
    def get_security_logger(cls) -> EnhancedLogger:
        """Get security-specific logger."""
        return cls.get_logger("security")
    
    @classmethod
    def get_performance_logger(cls) -> EnhancedLogger:
        """Get performance-specific logger."""
        return cls.get_logger("performance")
    
    @classmethod
    def get_api_logger(cls) -> EnhancedLogger:
        """Get API-specific logger."""
        return cls.get_logger("api")


# Convenience functions
def get_logger(name: str, context: Optional[LogContext] = None) -> EnhancedLogger:
    """Get enhanced logger instance."""
    return LoggerFactory.get_logger(name, context)


def get_security_logger() -> EnhancedLogger:
    """Get security logger instance."""
    return LoggerFactory.get_security_logger()


def get_performance_logger() -> EnhancedLogger:
    """Get performance logger instance."""
    return LoggerFactory.get_performance_logger()


def get_api_logger() -> EnhancedLogger:
    """Get API logger instance."""
    return LoggerFactory.get_api_logger()


@contextmanager
def correlation_context(correlation_id: Optional[str] = None):
    """Context manager for correlation ID scope."""
    old_correlation_id = CorrelationIDManager.get_correlation_id()
    
    if correlation_id is None:
        correlation_id = CorrelationIDManager.generate_correlation_id()
    
    CorrelationIDManager.set_correlation_id(correlation_id)
    
    try:
        yield correlation_id
    finally:
        if old_correlation_id:
            CorrelationIDManager.set_correlation_id(old_correlation_id)
        else:
            # Clear correlation ID if none existed before
            CorrelationIDManager._context.correlation_id = None


def log_operation(operation_name: str, category: LogCategory = LogCategory.SYSTEM):
    """Decorator for automatic operation logging."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            logger = get_logger(func.__module__)
            
            with logger.operation_context(operation_name, category):
                return func(*args, **kwargs)
        
        return wrapper
    return decorator


async def log_async_operation(operation_name: str, category: LogCategory = LogCategory.SYSTEM):
    """Decorator for automatic async operation logging."""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            logger = get_logger(func.__module__)
            
            with logger.operation_context(operation_name, category):
                return await func(*args, **kwargs)
        
        return wrapper
    return decorator