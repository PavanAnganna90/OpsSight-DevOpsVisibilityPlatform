"""
Enhanced logging configuration for OpsSight DevOps platform.
Provides structured logging with performance metrics and security monitoring.
"""

import json
import logging
import logging.config
import sys
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from contextlib import contextmanager
from enum import Enum


class LogCategory(Enum):
    """Log categories for filtering and analysis."""

    AUTHENTICATION = "auth"
    AUTHORIZATION = "authz"
    API_REQUEST = "api"
    DATABASE = "db"
    EXTERNAL_API = "external"
    PERFORMANCE = "perf"
    SECURITY = "security"
    BUSINESS = "business"
    SYSTEM = "system"
    GITHUB = "github"
    WEBSOCKET = "websocket"
    BACKGROUND_TASK = "background"


class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured JSON logging."""

    def format(self, record: logging.LogRecord) -> str:
        """
        Format log record as structured JSON.

        Args:
            record (logging.LogRecord): Log record to format

        Returns:
            str: Formatted JSON log entry
        """
        # Base log data
        log_data = {
            "timestamp": datetime.fromtimestamp(
                record.created, tz=timezone.utc
            ).isoformat(),
            "level": record.levelname,
            "logger_name": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add exception information if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields from record
        extra_fields = [
            "category",
            "user_id",
            "request_id",
            "session_id",
            "ip_address",
            "user_agent",
            "endpoint",
            "method",
            "status_code",
            "duration_ms",
            "error_code",
            "stack_trace",
            "extra_data",
        ]

        for field in extra_fields:
            if hasattr(record, field):
                log_data[field] = getattr(record, field)

        return json.dumps(log_data, default=str, ensure_ascii=False)


class PerformanceLogger:
    """Logger for performance monitoring and metrics."""

    def __init__(self, logger_name: str = "performance"):
        """Initialize performance logger."""
        self.logger = logging.getLogger(logger_name)

    @contextmanager
    def log_duration(
        self,
        operation: str,
        category: LogCategory = LogCategory.PERFORMANCE,
        threshold_ms: float = 1000.0,
        **kwargs,
    ):
        """
        Context manager to log operation duration.

        Args:
            operation (str): Operation name
            category (LogCategory): Log category
            threshold_ms (float): Threshold for warning logs
            **kwargs: Additional context data
        """
        start_time = time.time()

        try:
            yield
            success = True
            error = None
        except Exception as e:
            success = False
            error = str(e)
            raise
        finally:
            duration_ms = (time.time() - start_time) * 1000

            log_level = logging.INFO
            if not success:
                log_level = logging.ERROR
            elif duration_ms > threshold_ms:
                log_level = logging.WARNING

            self.logger.log(
                log_level,
                f"Operation {operation} completed",
                extra={
                    "category": category.value,
                    "operation": operation,
                    "duration_ms": round(duration_ms, 2),
                    "success": success,
                    "error": error,
                    "threshold_ms": threshold_ms,
                    **kwargs,
                },
            )


class SecurityLogger:
    """Logger for security events and monitoring."""

    def __init__(self, logger_name: str = "security"):
        """Initialize security logger."""
        self.logger = logging.getLogger(logger_name)

    def log_authentication_attempt(
        self,
        user_identifier: str,
        success: bool,
        method: str = "unknown",
        ip_address: str = None,
        user_agent: str = None,
        failure_reason: str = None,
    ):
        """
        Log authentication attempt.

        Args:
            user_identifier (str): User identifier (email, username, etc.)
            success (bool): Whether authentication was successful
            method (str): Authentication method
            ip_address (str): Client IP address
            user_agent (str): Client user agent
            failure_reason (str): Reason for failure if applicable
        """
        level = logging.INFO if success else logging.WARNING
        message = f"Authentication {'successful' if success else 'failed'} for {user_identifier}"

        self.logger.log(
            level,
            message,
            extra={
                "category": LogCategory.AUTHENTICATION.value,
                "user_identifier": user_identifier,
                "success": success,
                "auth_method": method,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "failure_reason": failure_reason,
            },
        )

    def log_authorization_failure(
        self,
        user_id: int,
        resource: str,
        action: str,
        ip_address: str = None,
        reason: str = None,
    ):
        """
        Log authorization failure.

        Args:
            user_id (int): User ID
            resource (str): Resource being accessed
            action (str): Action being attempted
            ip_address (str): Client IP address
            reason (str): Reason for denial
        """
        self.logger.warning(
            f"Authorization denied for user {user_id} on {resource}",
            extra={
                "category": LogCategory.AUTHORIZATION.value,
                "user_id": user_id,
                "resource": resource,
                "action": action,
                "ip_address": ip_address,
                "reason": reason,
            },
        )


class APILogger:
    """Logger for API request monitoring."""

    def __init__(self, logger_name: str = "api"):
        """Initialize API logger."""
        self.logger = logging.getLogger(logger_name)

    def log_request(
        self,
        method: str,
        endpoint: str,
        status_code: int,
        duration_ms: float,
        user_id: int = None,
        request_id: str = None,
        ip_address: str = None,
        user_agent: str = None,
        request_size: int = None,
        response_size: int = None,
    ):
        """
        Log API request.

        Args:
            method (str): HTTP method
            endpoint (str): API endpoint
            status_code (int): HTTP status code
            duration_ms (float): Request duration in milliseconds
            user_id (int): User ID if authenticated
            request_id (str): Request ID for tracing
            ip_address (str): Client IP address
            user_agent (str): Client user agent
            request_size (int): Request body size in bytes
            response_size (int): Response body size in bytes
        """
        level = logging.INFO
        if status_code >= 400:
            level = logging.WARNING if status_code < 500 else logging.ERROR

        self.logger.log(
            level,
            f"{method} {endpoint} - {status_code}",
            extra={
                "category": LogCategory.API_REQUEST.value,
                "method": method,
                "endpoint": endpoint,
                "status_code": status_code,
                "duration_ms": round(duration_ms, 2),
                "user_id": user_id,
                "request_id": request_id,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "request_size": request_size,
                "response_size": response_size,
            },
        )


class GitHubLogger:
    """Logger for GitHub API interactions."""

    def __init__(self, logger_name: str = "github"):
        """Initialize GitHub logger."""
        self.logger = logging.getLogger(logger_name)

    def log_api_call(
        self,
        endpoint: str,
        method: str,
        status_code: int,
        duration_ms: float,
        rate_limit_remaining: int = None,
        rate_limit_reset: str = None,
        user_id: int = None,
    ):
        """
        Log GitHub API call.

        Args:
            endpoint (str): GitHub API endpoint
            method (str): HTTP method
            status_code (int): Response status code
            duration_ms (float): Request duration
            rate_limit_remaining (int): Remaining rate limit
            rate_limit_reset (str): Rate limit reset time
            user_id (int): User ID making the request
        """
        level = logging.INFO
        if status_code >= 400:
            level = logging.WARNING if status_code < 500 else logging.ERROR

        self.logger.log(
            level,
            f"GitHub API {method} {endpoint} - {status_code}",
            extra={
                "category": LogCategory.GITHUB.value,
                "endpoint": endpoint,
                "method": method,
                "status_code": status_code,
                "duration_ms": round(duration_ms, 2),
                "rate_limit_remaining": rate_limit_remaining,
                "rate_limit_reset": rate_limit_reset,
                "user_id": user_id,
            },
        )

    def log_rate_limit_warning(
        self, remaining: int, reset_time: str, endpoint: str, user_id: int = None
    ):
        """
        Log GitHub rate limit warning.

        Args:
            remaining (int): Remaining requests
            reset_time (str): Reset time
            endpoint (str): API endpoint
            user_id (int): User ID
        """
        self.logger.warning(
            f"GitHub rate limit warning: {remaining} requests remaining",
            extra={
                "category": LogCategory.GITHUB.value,
                "rate_limit_remaining": remaining,
                "rate_limit_reset": reset_time,
                "endpoint": endpoint,
                "user_id": user_id,
            },
        )


def setup_logging():
    """
    Configure logging for the application.
    Sets up structured JSON logging with appropriate handlers.
    """
    # Create logs directory if it doesn't exist
    import os

    os.makedirs("logs", exist_ok=True)

    # Logging configuration
    config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "structured": {
                "()": StructuredFormatter,
            },
            "simple": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": "INFO",
                "formatter": "simple",
                "stream": sys.stdout,
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "DEBUG",
                "formatter": "structured",
                "filename": "logs/app.log",
                "maxBytes": 50 * 1024 * 1024,  # 50MB
                "backupCount": 5,
            },
            "error_file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "ERROR",
                "formatter": "structured",
                "filename": "logs/error.log",
                "maxBytes": 50 * 1024 * 1024,  # 50MB
                "backupCount": 5,
            },
        },
        "loggers": {
            "": {  # Root logger
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False,
            },
            "app": {
                "level": "DEBUG",
                "handlers": ["console", "file"],
                "propagate": False,
            },
            "security": {
                "level": "INFO",
                "handlers": ["console", "file"],
                "propagate": False,
            },
            "performance": {
                "level": "INFO",
                "handlers": ["console", "file"],
                "propagate": False,
            },
            "api": {
                "level": "INFO",
                "handlers": ["console", "file"],
                "propagate": False,
            },
            "github": {
                "level": "INFO",
                "handlers": ["console", "file"],
                "propagate": False,
            },
            "uvicorn": {"level": "INFO", "handlers": ["console"], "propagate": False},
            "sqlalchemy": {
                "level": "WARNING",
                "handlers": ["console"],
                "propagate": False,
            },
        },
    }

    # Apply configuration
    logging.config.dictConfig(config)


# Initialize logging
setup_logging()

# Export logger instances
performance_logger = PerformanceLogger()
security_logger = SecurityLogger()
api_logger = APILogger()
github_logger = GitHubLogger()
