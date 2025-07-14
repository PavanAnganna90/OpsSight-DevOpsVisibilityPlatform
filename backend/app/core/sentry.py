"""
Sentry error tracking configuration for OpsSight backend.

This module configures Sentry for error tracking, performance monitoring,
and release tracking across different environments.
"""

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.httpx import HttpxIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


def init_sentry() -> None:
    """
    Initialize Sentry error tracking with appropriate integrations.

    Configures Sentry with:
    - FastAPI integration for request tracking
    - SQLAlchemy integration for database query tracking
    - Redis integration for cache operation tracking
    - HTTPX integration for external API call tracking
    - Logging integration for log message capture
    """
    if not settings.SENTRY_DSN:
        logger.info("Sentry DSN not configured, skipping Sentry initialization")
        return

    # Reason: Configure logging integration to capture log messages
    logging_integration = LoggingIntegration(
        level=logging.INFO,  # Capture info and above as breadcrumbs
        event_level=logging.ERROR,  # Send errors as events
    )

    # Reason: Set up comprehensive integrations for full application monitoring
    integrations = [
        FastApiIntegration(auto_enabling_integrations=False),
        SqlalchemyIntegration(),
        RedisIntegration(),
        HttpxIntegration(),
        logging_integration,
    ]

    # Reason: Configure Sentry with environment-specific settings
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        release=f"opssight-backend@{settings.VERSION}",
        integrations=integrations,
        # Performance monitoring
        traces_sample_rate=_get_traces_sample_rate(),
        # Error sampling
        sample_rate=1.0,  # Capture all errors
        # Additional configuration
        attach_stacktrace=True,
        send_default_pii=False,  # Don't send personally identifiable information
        max_breadcrumbs=50,
        # Custom tags
        before_send=_before_send_filter,
    )

    # Reason: Set user context and tags for better error tracking
    sentry_sdk.set_tag("service", "opssight-backend")
    sentry_sdk.set_tag("component", "api")

    logger.info(
        f"Sentry initialized successfully",
        extra={
            "environment": settings.ENVIRONMENT,
            "release": f"opssight-backend@{settings.VERSION}",
            "traces_sample_rate": _get_traces_sample_rate(),
        },
    )


def _get_traces_sample_rate() -> float:
    """
    Get the appropriate traces sample rate based on environment.

    Returns:
        float: Sample rate for performance monitoring
    """
    if settings.ENVIRONMENT == "production":
        return 0.1  # 10% sampling in production
    elif settings.ENVIRONMENT == "staging":
        return 0.5  # 50% sampling in staging
    else:
        return 1.0  # 100% sampling in development


def _before_send_filter(event, hint):
    """
    Filter events before sending to Sentry.

    Args:
        event: Sentry event data
        hint: Additional context about the event

    Returns:
        Event data or None to drop the event
    """
    # Reason: Filter out health check errors to reduce noise
    if event.get("request", {}).get("url", "").endswith("/health"):
        return None

    # Reason: Filter out common non-critical errors
    if "exception" in event:
        exc_type = event["exception"]["values"][0].get("type", "")
        if exc_type in ["KeyboardInterrupt", "SystemExit"]:
            return None

    return event


def capture_exception(error: Exception, **kwargs) -> None:
    """
    Capture an exception with additional context.

    Args:
        error (Exception): The exception to capture
        **kwargs: Additional context to include
    """
    with sentry_sdk.push_scope() as scope:
        # Reason: Add additional context to the error
        for key, value in kwargs.items():
            scope.set_extra(key, value)

        sentry_sdk.capture_exception(error)


def capture_message(message: str, level: str = "info", **kwargs) -> None:
    """
    Capture a message with additional context.

    Args:
        message (str): The message to capture
        level (str): The severity level
        **kwargs: Additional context to include
    """
    with sentry_sdk.push_scope() as scope:
        # Reason: Add additional context to the message
        for key, value in kwargs.items():
            scope.set_extra(key, value)

        sentry_sdk.capture_message(message, level)


def set_user_context(
    user_id: Optional[str] = None, email: Optional[str] = None, **kwargs
) -> None:
    """
    Set user context for error tracking.

    Args:
        user_id (str, optional): User identifier
        email (str, optional): User email
        **kwargs: Additional user context
    """
    user_data = {}
    if user_id:
        user_data["id"] = user_id
    if email:
        user_data["email"] = email

    user_data.update(kwargs)
    sentry_sdk.set_user(user_data)


def set_request_context(request_id: str, endpoint: str, method: str) -> None:
    """
    Set request context for error tracking.

    Args:
        request_id (str): Unique request identifier
        endpoint (str): API endpoint being accessed
        method (str): HTTP method
    """
    sentry_sdk.set_tag("request_id", request_id)
    sentry_sdk.set_tag("endpoint", endpoint)
    sentry_sdk.set_tag("method", method)
