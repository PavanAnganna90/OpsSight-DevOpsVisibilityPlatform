"""
Custom exceptions for OpsSight DevOps platform.
Provides structured error handling with proper HTTP status codes and logging.
"""

from typing import Any, Dict, Optional, List
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ErrorSeverity(Enum):
    """Error severity levels for monitoring and alerting."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorCategory(Enum):
    """Error categories for classification and handling."""

    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    VALIDATION = "validation"
    EXTERNAL_API = "external_api"
    DATABASE = "database"
    NETWORK = "network"
    RATE_LIMIT = "rate_limit"
    CONFIGURATION = "configuration"
    BUSINESS_LOGIC = "business_logic"
    INTERNAL = "internal"


class OpsSightException(Exception):
    """
    Base exception class for OpsSight platform.
    Provides structured error information for consistent handling.
    """

    def __init__(
        self,
        message: str,
        error_code: str,
        category: ErrorCategory = ErrorCategory.INTERNAL,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        details: Optional[Dict[str, Any]] = None,
        user_message: Optional[str] = None,
        http_status_code: int = 500,
    ):
        """
        Initialize OpsSight exception.

        Args:
            message (str): Technical error message for developers
            error_code (str): Unique error code for tracking
            category (ErrorCategory): Error category for classification
            severity (ErrorSeverity): Error severity level
            details (Optional[Dict]): Additional error context
            user_message (Optional[str]): User-friendly error message
            http_status_code (int): HTTP status code
        """
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.category = category
        self.severity = severity
        self.details = details or {}
        self.user_message = user_message or self._get_default_user_message()
        self.http_status_code = http_status_code

        # Log the exception
        self._log_exception()

    def _get_default_user_message(self) -> str:
        """Get default user-friendly message based on category."""
        user_messages = {
            ErrorCategory.AUTHENTICATION: "Authentication failed. Please check your credentials.",
            ErrorCategory.AUTHORIZATION: "You don't have permission to perform this action.",
            ErrorCategory.VALIDATION: "The provided data is invalid. Please check your input.",
            ErrorCategory.EXTERNAL_API: "External service is currently unavailable. Please try again later.",
            ErrorCategory.DATABASE: "Database error occurred. Please try again later.",
            ErrorCategory.NETWORK: "Network error occurred. Please check your connection.",
            ErrorCategory.RATE_LIMIT: "Rate limit exceeded. Please wait before trying again.",
            ErrorCategory.CONFIGURATION: "Configuration error. Please contact support.",
            ErrorCategory.BUSINESS_LOGIC: "Business rule violation. Please check your request.",
            ErrorCategory.INTERNAL: "Internal server error. Please contact support.",
        }
        return user_messages.get(self.category, "An unexpected error occurred.")

    def _log_exception(self):
        """Log the exception with appropriate level based on severity."""
        log_data = {
            "error_code": self.error_code,
            "category": self.category.value,
            "severity": self.severity.value,
            "message": self.message,
            "details": self.details,
        }

        if self.severity == ErrorSeverity.CRITICAL:
            logger.critical(f"Critical error: {self.error_code}", extra=log_data)
        elif self.severity == ErrorSeverity.HIGH:
            logger.error(f"High severity error: {self.error_code}", extra=log_data)
        elif self.severity == ErrorSeverity.MEDIUM:
            logger.warning(f"Medium severity error: {self.error_code}", extra=log_data)
        else:
            logger.info(f"Low severity error: {self.error_code}", extra=log_data)

    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses."""
        return {
            "error_code": self.error_code,
            "message": self.user_message,
            "category": self.category.value,
            "severity": self.severity.value,
            "details": self.details,
            "timestamp": self.details.get("timestamp"),
        }


class GitHubAPIException(OpsSightException):
    """Exception for GitHub API related errors."""

    def __init__(
        self,
        message: str,
        github_error: Optional[Dict[str, Any]] = None,
        rate_limit_info: Optional[Dict[str, Any]] = None,
        **kwargs,
    ):
        """
        Initialize GitHub API exception.

        Args:
            message (str): Error message
            github_error (Optional[Dict]): GitHub API error response
            rate_limit_info (Optional[Dict]): Rate limit information
        """
        error_code = "GITHUB_API_ERROR"
        category = ErrorCategory.EXTERNAL_API

        # Determine if this is a rate limit error
        if rate_limit_info or (
            github_error and "rate limit" in str(github_error).lower()
        ):
            error_code = "GITHUB_RATE_LIMIT"
            category = ErrorCategory.RATE_LIMIT

        details = {"github_error": github_error, "rate_limit_info": rate_limit_info}

        super().__init__(
            message=message,
            error_code=error_code,
            category=category,
            details=details,
            http_status_code=429 if category == ErrorCategory.RATE_LIMIT else 503,
            **kwargs,
        )


class DatabaseException(OpsSightException):
    """Exception for database related errors."""

    def __init__(self, message: str, operation: str, **kwargs):
        """
        Initialize database exception.

        Args:
            message (str): Error message
            operation (str): Database operation that failed
        """
        super().__init__(
            message=message,
            error_code="DATABASE_ERROR",
            category=ErrorCategory.DATABASE,
            severity=ErrorSeverity.HIGH,
            details={"operation": operation},
            http_status_code=500,
            **kwargs,
        )


class DatabaseConnectionError(DatabaseException):
    """Exception for database connection failures."""

    def __init__(self, message: str = "Database connection failed", **kwargs):
        """Initialize database connection exception."""
        super().__init__(
            message=message,
            operation="connection",
            error_code="DATABASE_CONNECTION_ERROR",
            severity=ErrorSeverity.CRITICAL,
            **kwargs,
        )


class DatabaseTimeoutError(DatabaseException):
    """Exception for database operation timeouts."""

    def __init__(
        self,
        message: str = "Database operation timed out",
        timeout_duration: float = None,
        **kwargs,
    ):
        """
        Initialize database timeout exception.

        Args:
            message (str): Error message
            timeout_duration (float): Timeout duration in seconds
        """
        details = {"timeout_duration": timeout_duration} if timeout_duration else {}
        super().__init__(
            message=message,
            operation="timeout",
            error_code="DATABASE_TIMEOUT_ERROR",
            severity=ErrorSeverity.HIGH,
            details=details,
            **kwargs,
        )


class ValidationException(OpsSightException):
    """Exception for data validation errors."""

    def __init__(
        self,
        message: str,
        field_errors: Optional[List[Dict[str, str]]] = None,
        **kwargs,
    ):
        """
        Initialize validation exception.

        Args:
            message (str): Error message
            field_errors (Optional[List]): Field-specific validation errors
        """
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            category=ErrorCategory.VALIDATION,
            severity=ErrorSeverity.LOW,
            details={"field_errors": field_errors or []},
            http_status_code=400,
            **kwargs,
        )


class AuthenticationException(OpsSightException):
    """Exception for authentication failures."""

    def __init__(self, message: str = "Authentication failed", **kwargs):
        """Initialize authentication exception."""
        super().__init__(
            message=message,
            error_code="AUTHENTICATION_ERROR",
            category=ErrorCategory.AUTHENTICATION,
            severity=ErrorSeverity.MEDIUM,
            http_status_code=401,
            **kwargs,
        )


class AuthorizationException(OpsSightException):
    """Exception for authorization failures."""

    def __init__(self, message: str = "Access denied", resource: str = None, **kwargs):
        """
        Initialize authorization exception.

        Args:
            message (str): Error message
            resource (str): Resource being accessed
        """
        super().__init__(
            message=message,
            error_code="AUTHORIZATION_ERROR",
            category=ErrorCategory.AUTHORIZATION,
            severity=ErrorSeverity.MEDIUM,
            details={"resource": resource} if resource else {},
            http_status_code=403,
            **kwargs,
        )


class RateLimitException(OpsSightException):
    """Exception for rate limit violations."""

    def __init__(
        self,
        message: str,
        limit: int,
        window: int,
        reset_time: Optional[str] = None,
        **kwargs,
    ):
        """
        Initialize rate limit exception.

        Args:
            message (str): Error message
            limit (int): Rate limit threshold
            window (int): Time window in seconds
            reset_time (Optional[str]): When rate limit resets
        """
        super().__init__(
            message=message,
            error_code="RATE_LIMIT_EXCEEDED",
            category=ErrorCategory.RATE_LIMIT,
            severity=ErrorSeverity.MEDIUM,
            details={"limit": limit, "window": window, "reset_time": reset_time},
            http_status_code=429,
            **kwargs,
        )


class ConfigurationException(OpsSightException):
    """Exception for configuration related errors."""

    def __init__(self, message: str, config_key: str = None, **kwargs):
        """
        Initialize configuration exception.

        Args:
            message (str): Error message
            config_key (str): Configuration key that caused the error
        """
        super().__init__(
            message=message,
            error_code="CONFIGURATION_ERROR",
            category=ErrorCategory.CONFIGURATION,
            severity=ErrorSeverity.HIGH,
            details={"config_key": config_key} if config_key else {},
            http_status_code=500,
            **kwargs,
        )


class BusinessLogicException(OpsSightException):
    """Exception for business logic violations."""

    def __init__(self, message: str, rule: str = None, **kwargs):
        """
        Initialize business logic exception.

        Args:
            message (str): Error message
            rule (str): Business rule that was violated
        """
        super().__init__(
            message=message,
            error_code="BUSINESS_LOGIC_ERROR",
            category=ErrorCategory.BUSINESS_LOGIC,
            severity=ErrorSeverity.LOW,
            details={"rule": rule} if rule else {},
            http_status_code=422,
            **kwargs,
        )


class NetworkException(OpsSightException):
    """Exception for network related errors."""

    def __init__(
        self, message: str, endpoint: str = None, timeout: bool = False, **kwargs
    ):
        """
        Initialize network exception.

        Args:
            message (str): Error message
            endpoint (str): Network endpoint that failed
            timeout (bool): Whether this was a timeout error
        """
        error_code = "NETWORK_TIMEOUT" if timeout else "NETWORK_ERROR"

        super().__init__(
            message=message,
            error_code=error_code,
            category=ErrorCategory.NETWORK,
            severity=ErrorSeverity.MEDIUM,
            details={"endpoint": endpoint, "timeout": timeout},
            http_status_code=503,
            **kwargs,
        )
