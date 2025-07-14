"""
FastAPI error handlers for consistent error responses and logging.
Provides global exception handling with proper HTTP status codes.
"""

import traceback
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import (
    OpsSightException,
    GitHubAPIException,
    DatabaseException,
    ValidationException,
    AuthenticationException,
    AuthorizationException,
    RateLimitException,
    NetworkException,
    ErrorCategory,
    ErrorSeverity,
)
from app.core.app_logging import security_logger, api_logger
import logging

logger = logging.getLogger(__name__)


def create_error_response(
    error_code: str,
    message: str,
    details: Dict[str, Any] = None,
    status_code: int = 500,
) -> JSONResponse:
    """
    Create standardized error response.

    Args:
        error_code (str): Error code for tracking
        message (str): User-friendly error message
        details (Dict): Additional error details
        status_code (int): HTTP status code

    Returns:
        JSONResponse: Standardized error response
    """
    error_response = {
        "error": {
            "code": error_code,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": details or {},
        }
    }

    return JSONResponse(status_code=status_code, content=error_response)


async def opssight_exception_handler(
    request: Request, exc: OpsSightException
) -> JSONResponse:
    """
    Handle OpsSight custom exceptions.

    Args:
        request (Request): FastAPI request object
        exc (OpsSightException): OpsSight exception

    Returns:
        JSONResponse: Error response
    """
    # Log the exception details
    logger.error(
        f"OpsSight exception: {exc.error_code}",
        extra={
            "error_code": exc.error_code,
            "category": exc.category.value,
            "severity": exc.severity.value,
            "message": exc.message,
            "details": exc.details,
            "endpoint": str(request.url.path),
            "method": request.method,
        },
    )

    # Log security-related exceptions
    if exc.category in [ErrorCategory.AUTHENTICATION, ErrorCategory.AUTHORIZATION]:
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")

        if exc.category == ErrorCategory.AUTHENTICATION:
            security_logger.log_authentication_attempt(
                user_identifier="unknown",
                success=False,
                method="token",
                ip_address=client_ip,
                user_agent=user_agent,
                failure_reason=exc.message,
            )
        else:
            security_logger.log_authorization_failure(
                user_id=exc.details.get("user_id"),
                resource=exc.details.get("resource", str(request.url.path)),
                action=request.method,
                ip_address=client_ip,
                reason=exc.message,
            )

    return create_error_response(
        error_code=exc.error_code,
        message=exc.user_message,
        details=exc.details,
        status_code=exc.http_status_code,
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Handle FastAPI HTTP exceptions.

    Args:
        request (Request): FastAPI request object
        exc (HTTPException): HTTP exception

    Returns:
        JSONResponse: Error response
    """
    error_code = f"HTTP_{exc.status_code}"

    # Map common HTTP status codes to user-friendly messages
    status_messages = {
        400: "Bad request. Please check your input.",
        401: "Authentication required. Please provide valid credentials.",
        403: "Access denied. You don't have permission for this action.",
        404: "Resource not found.",
        405: "Method not allowed.",
        409: "Conflict. Resource already exists or operation not allowed.",
        422: "Validation error. Please check your input.",
        429: "Rate limit exceeded. Please try again later.",
        500: "Internal server error. Please contact support.",
        502: "Bad gateway. External service error.",
        503: "Service unavailable. Please try again later.",
        504: "Gateway timeout. Request took too long to process.",
    }

    user_message = status_messages.get(exc.status_code, str(exc.detail))

    logger.warning(
        f"HTTP exception: {exc.status_code}",
        extra={
            "status_code": exc.status_code,
            "detail": str(exc.detail),
            "endpoint": str(request.url.path),
            "method": request.method,
        },
    )

    return create_error_response(
        error_code=error_code,
        message=user_message,
        details={"original_detail": str(exc.detail)},
        status_code=exc.status_code,
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Handle Pydantic validation errors.

    Args:
        request (Request): FastAPI request object
        exc (RequestValidationError): Validation exception

    Returns:
        JSONResponse: Error response
    """
    # Format validation errors
    validation_errors = []
    for error in exc.errors():
        field_path = " -> ".join(str(loc) for loc in error["loc"])
        validation_errors.append(
            {
                "field": field_path,
                "message": error["msg"],
                "type": error["type"],
                "input": error.get("input"),
            }
        )

    logger.warning(
        "Validation error",
        extra={
            "validation_errors": validation_errors,
            "endpoint": str(request.url.path),
            "method": request.method,
        },
    )

    return create_error_response(
        error_code="VALIDATION_ERROR",
        message="Input validation failed. Please check your data.",
        details={"validation_errors": validation_errors},
        status_code=422,
    )


async def database_exception_handler(
    request: Request, exc: SQLAlchemyError
) -> JSONResponse:
    """
    Handle SQLAlchemy database errors.

    Args:
        request (Request): FastAPI request object
        exc (SQLAlchemyError): Database exception

    Returns:
        JSONResponse: Error response
    """
    logger.error(
        "Database error",
        extra={
            "error_type": type(exc).__name__,
            "error_message": str(exc),
            "endpoint": str(request.url.path),
            "method": request.method,
        },
    )

    # Don't expose database details to users
    return create_error_response(
        error_code="DATABASE_ERROR",
        message="Database operation failed. Please try again later.",
        details={"error_type": type(exc).__name__},
        status_code=500,
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle unexpected exceptions.

    Args:
        request (Request): FastAPI request object
        exc (Exception): Generic exception

    Returns:
        JSONResponse: Error response
    """
    # Get stack trace for logging
    stack_trace = traceback.format_exc()

    logger.critical(
        "Unexpected error",
        extra={
            "error_type": type(exc).__name__,
            "error_message": str(exc),
            "stack_trace": stack_trace,
            "endpoint": str(request.url.path),
            "method": request.method,
        },
    )

    # Don't expose internal error details to users
    return create_error_response(
        error_code="INTERNAL_ERROR",
        message="An unexpected error occurred. Please contact support.",
        details={"error_id": f"{type(exc).__name__}_{datetime.now().timestamp()}"},
        status_code=500,
    )


def setup_error_handlers(app: FastAPI) -> None:
    """
    Set up error handlers for the FastAPI application.

    Args:
        app (FastAPI): FastAPI application instance
    """
    # Custom OpsSight exceptions
    app.add_exception_handler(OpsSightException, opssight_exception_handler)
    app.add_exception_handler(GitHubAPIException, opssight_exception_handler)
    app.add_exception_handler(DatabaseException, opssight_exception_handler)
    app.add_exception_handler(ValidationException, opssight_exception_handler)
    app.add_exception_handler(AuthenticationException, opssight_exception_handler)
    app.add_exception_handler(AuthorizationException, opssight_exception_handler)
    app.add_exception_handler(RateLimitException, opssight_exception_handler)
    app.add_exception_handler(NetworkException, opssight_exception_handler)

    # FastAPI/Starlette exceptions
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)

    # Database exceptions
    app.add_exception_handler(SQLAlchemyError, database_exception_handler)

    # Generic exception handler (catch-all)
    app.add_exception_handler(Exception, generic_exception_handler)

    logger.info("Error handlers configured successfully")
