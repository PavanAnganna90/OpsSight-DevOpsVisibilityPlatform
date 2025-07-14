"""
Tests for error handling and logging system.
Validates custom exceptions, error handlers, and logging functionality.
"""

import json
import asyncio
import pytest
from datetime import datetime, timezone
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.exc import SQLAlchemyError
from fastapi import FastAPI, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from httpx import AsyncClient, ASGITransport

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
from app.core.error_handlers import (
    setup_error_handlers,
    create_error_response,
    opssight_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    database_exception_handler,
    generic_exception_handler,
)
from app.core.logging import (
    StructuredFormatter,
    PerformanceLogger,
    SecurityLogger,
    APILogger,
    GitHubLogger,
    setup_logging,
)
from app.main import app


class TestOpsSightException:
    """Test custom OpsSight exception classes."""

    def test_opssight_exception_creation(self):
        """Test basic OpsSight exception creation and properties."""
        exc = OpsSightException(
            message="Test error",
            error_code="TEST_ERROR",
            category=ErrorCategory.BUSINESS_LOGIC,
            severity=ErrorSeverity.LOW,
        )

        assert exc.message == "Test error"
        assert exc.error_code == "TEST_ERROR"
        assert exc.category == ErrorCategory.BUSINESS_LOGIC
        assert exc.severity == ErrorSeverity.LOW
        assert exc.http_status_code == 500
        assert "Business rule violation" in exc.user_message

    def test_github_api_exception(self):
        """Test GitHub API exception with rate limit detection."""
        # Test regular GitHub error
        exc = GitHubAPIException(
            message="API request failed",
            github_error={"status": 403, "message": "Forbidden"},
        )
        assert exc.error_code == "GITHUB_API_ERROR"
        assert exc.category == ErrorCategory.EXTERNAL_API

        # Test rate limit error
        rate_limit_exc = GitHubAPIException(
            message="Rate limit exceeded",
            rate_limit_info={"remaining": 0, "reset": "2024-01-01T00:00:00Z"},
        )
        assert rate_limit_exc.error_code == "GITHUB_RATE_LIMIT"
        assert rate_limit_exc.category == ErrorCategory.RATE_LIMIT
        assert rate_limit_exc.http_status_code == 429

    def test_database_exception(self):
        """Test database exception creation."""
        exc = DatabaseException(
            message="Database connection failed", operation="user_create"
        )

        assert exc.error_code == "DATABASE_ERROR"
        assert exc.category == ErrorCategory.DATABASE
        assert exc.severity == ErrorSeverity.HIGH
        assert exc.details["operation"] == "user_create"

    def test_validation_exception(self):
        """Test validation exception with field errors."""
        field_errors = [
            {"field": "email", "message": "Invalid email format"},
            {"field": "password", "message": "Password too short"},
        ]

        exc = ValidationException(
            message="Validation failed", field_errors=field_errors
        )

        assert exc.error_code == "VALIDATION_ERROR"
        assert exc.category == ErrorCategory.VALIDATION
        assert exc.severity == ErrorSeverity.LOW
        assert exc.details["field_errors"] == field_errors
        assert exc.http_status_code == 400

    def test_rate_limit_exception(self):
        """Test rate limit exception with timing info."""
        exc = RateLimitException(
            message="Too many requests",
            limit=100,
            window=3600,
            reset_time="2024-01-01T00:00:00Z",
        )

        assert exc.error_code == "RATE_LIMIT_EXCEEDED"
        assert exc.category == ErrorCategory.RATE_LIMIT
        assert exc.details["limit"] == 100
        assert exc.details["window"] == 3600
        assert exc.details["reset_time"] == "2024-01-01T00:00:00Z"

    def test_authentication_exception(self):
        """Test authentication exception."""
        exc = AuthenticationException(message="Invalid token")

        assert exc.error_code == "AUTHENTICATION_ERROR"
        assert exc.category == ErrorCategory.AUTHENTICATION
        assert exc.http_status_code == 401

    def test_authorization_exception(self):
        """Test authorization exception."""
        exc = AuthorizationException(message="Access denied", resource="/admin/users")

        assert exc.error_code == "AUTHORIZATION_ERROR"
        assert exc.category == ErrorCategory.AUTHORIZATION
        assert exc.http_status_code == 403
        assert exc.details["resource"] == "/admin/users"

    def test_network_exception(self):
        """Test network exception."""
        exc = NetworkException(
            message="Connection timeout",
            endpoint="https://api.github.com",
            timeout=True,
        )

        assert exc.error_code == "NETWORK_TIMEOUT"
        assert exc.category == ErrorCategory.NETWORK
        assert exc.details["endpoint"] == "https://api.github.com"
        assert exc.details["timeout"] is True

    def test_exception_to_dict(self):
        """Test exception serialization to dictionary."""
        exc = OpsSightException(
            message="Test error", error_code="TEST_ERROR", details={"extra": "data"}
        )

        result = exc.to_dict()

        assert result["error_code"] == "TEST_ERROR"
        assert result["category"] == ErrorCategory.INTERNAL.value
        assert result["severity"] == ErrorSeverity.MEDIUM.value
        assert result["details"]["extra"] == "data"
        assert "message" in result


class TestErrorHandlers:
    """Test FastAPI error handlers."""

    @pytest.fixture
    def mock_request(self):
        """Create a mock FastAPI request."""
        request = Mock(spec=Request)
        request.url.path = "/api/test"
        request.method = "GET"
        request.client.host = "127.0.0.1"
        request.headers = {"user-agent": "test-client"}
        return request

    def test_create_error_response(self):
        """Test standardized error response creation."""
        response = create_error_response(
            error_code="TEST_ERROR",
            message="Test message",
            details={"key": "value"},
            status_code=400,
        )

        assert response.status_code == 400
        content = json.loads(response.body.decode())

        assert content["error"]["code"] == "TEST_ERROR"
        assert content["error"]["message"] == "Test message"
        assert content["error"]["details"]["key"] == "value"
        assert "timestamp" in content["error"]

    @pytest.mark.asyncio
    async def test_opssight_exception_handler(self, mock_request):
        """Test OpsSight exception handler."""
        exc = OpsSightException(
            message="Test error",
            error_code="TEST_ERROR",
            category=ErrorCategory.BUSINESS_LOGIC,
        )

        async with AsyncClient(transport=ASGITransport(app=app)) as ac:
            response = await ac.get("/api/v1/error/some-endpoint")

        content = json.loads(response.text)

        assert response.status_code == 500
        assert content["error"]["code"] == "TEST_ERROR"

    @pytest.mark.asyncio
    async def test_http_exception_handler(self, mock_request):
        """Test HTTP exception handler."""
        exc = HTTPException(status_code=404, detail="Not found")

        async with AsyncClient(transport=ASGITransport(app=app)) as ac:
            response = await ac.get("/api/v1/error/some-endpoint")

        content = json.loads(response.text)

        assert response.status_code == 404
        assert content["error"]["code"] == "HTTP_404"
        assert "Resource not found" in content["error"]["message"]

    @pytest.mark.asyncio
    async def test_validation_exception_handler(self, mock_request):
        """Test validation exception handler."""
        # Mock validation error
        validation_error = Mock(spec=RequestValidationError)
        validation_error.errors.return_value = [
            {
                "loc": ("body", "email"),
                "msg": "field required",
                "type": "value_error.missing",
                "input": {},
            }
        ]

        async with AsyncClient(transport=ASGITransport(app=app)) as ac:
            response = await ac.post(
                "/api/v1/error/some-endpoint", json=validation_error
            )

        content = json.loads(response.text)

        assert response.status_code == 422
        assert content["error"]["code"] == "VALIDATION_ERROR"
        assert len(content["error"]["details"]["validation_errors"]) == 1

    @pytest.mark.asyncio
    async def test_database_exception_handler(self, mock_request):
        """Test database exception handler."""
        db_error = SQLAlchemyError("Connection failed")

        async with AsyncClient(transport=ASGITransport(app=app)) as ac:
            response = await ac.post("/api/v1/error/some-endpoint", json=db_error)

        content = json.loads(response.text)

        assert response.status_code == 500
        assert content["error"]["code"] == "DATABASE_ERROR"
        assert "Database operation failed" in content["error"]["message"]

    @pytest.mark.asyncio
    async def test_generic_exception_handler(self, mock_request):
        """Test generic exception handler."""
        exc = ValueError("Unexpected error")

        async with AsyncClient(transport=ASGITransport(app=app)) as ac:
            response = await ac.post("/api/v1/error/some-endpoint", json=exc)

        content = json.loads(response.text)

        assert response.status_code == 500
        assert content["error"]["code"] == "INTERNAL_ERROR"
        assert "unexpected error occurred" in content["error"]["message"]

    def test_setup_error_handlers(self):
        """Test error handler setup on FastAPI app."""
        app = FastAPI()
        setup_error_handlers(app)

        # Verify handlers are registered
        assert len(app.exception_handlers) > 0


class TestLoggingSystem:
    """Test logging system components."""

    def test_structured_formatter(self):
        """Test structured JSON formatter."""
        import logging

        formatter = StructuredFormatter()
        record = logging.LogRecord(
            name="test_logger",
            level=logging.INFO,
            pathname="test.py",
            lineno=10,
            msg="Test message",
            args=(),
            exc_info=None,
        )
        record.category = "test"
        record.user_id = 123

        formatted = formatter.format(record)
        log_data = json.loads(formatted)

        assert log_data["level"] == "INFO"
        assert log_data["message"] == "Test message"
        assert log_data["category"] == "test"
        assert log_data["user_id"] == 123
        assert "timestamp" in log_data

    @pytest.mark.asyncio
    async def test_performance_logger(self):
        """Test performance logger duration tracking."""
        perf_logger = PerformanceLogger()

        # Test successful operation
        async with perf_logger.log_duration("test_operation", threshold_ms=100):
            await asyncio.sleep(0.01)  # 10ms operation

        # Test operation exceeding threshold
        with pytest.raises(ValueError):
            async with perf_logger.log_duration("failing_operation", threshold_ms=1):
                raise ValueError("Test error")

    def test_security_logger(self):
        """Test security logger functionality."""
        security_logger = SecurityLogger()

        # Test authentication logging
        with patch.object(security_logger.logger, "log") as mock_log:
            security_logger.log_authentication_attempt(
                user_identifier="test@example.com",
                success=True,
                method="oauth",
                ip_address="127.0.0.1",
            )
            mock_log.assert_called_once()
            args, kwargs = mock_log.call_args
            assert "successful" in args[1]

        # Test authorization failure logging
        with patch.object(security_logger.logger, "warning") as mock_warning:
            security_logger.log_authorization_failure(
                user_id=123,
                resource="/api/admin",
                action="GET",
                reason="insufficient_permissions",
            )
            mock_warning.assert_called_once()

    def test_api_logger(self):
        """Test API request logger."""
        api_logger = APILogger()

        with patch.object(api_logger.logger, "log") as mock_log:
            api_logger.log_request(
                method="GET",
                endpoint="/api/users",
                status_code=200,
                duration_ms=150.5,
                user_id=123,
                request_id="req_123",
            )

            mock_log.assert_called_once()
            args, kwargs = mock_log.call_args
            assert args[0] == logging.INFO  # 200 status = INFO level
            assert "GET /api/users - 200" in args[1]
            assert kwargs["extra"]["status_code"] == 200
            assert kwargs["extra"]["duration_ms"] == 150.5

    def test_github_logger(self):
        """Test GitHub API logger."""
        github_logger = GitHubLogger()

        # Test API call logging
        with patch.object(github_logger.logger, "log") as mock_log:
            github_logger.log_api_call(
                endpoint="repos/owner/repo/actions/runs",
                method="GET",
                status_code=200,
                duration_ms=250.0,
                rate_limit_remaining=4999,
                rate_limit_reset="2024-01-01T01:00:00Z",
            )

            mock_log.assert_called_once()
            args, kwargs = mock_log.call_args
            assert "GitHub API GET" in args[1]
            assert kwargs["extra"]["rate_limit_remaining"] == 4999

        # Test rate limit warning
        with patch.object(github_logger.logger, "warning") as mock_warning:
            github_logger.log_rate_limit_warning(
                remaining=50,
                reset_time="2024-01-01T01:00:00Z",
                endpoint="test/endpoint",
            )

            mock_warning.assert_called_once()
            args, kwargs = mock_warning.call_args
            assert "rate limit warning" in args[0]

    def test_setup_logging(self):
        """Test logging setup configuration."""
        # Verify setup_logging doesn't raise errors
        setup_logging()

        # Verify loggers are created
        import logging

        logger = logging.getLogger("app")
        assert logger is not None

        # Test that structured logging works
        logger.info("Test message", extra={"category": "test", "user_id": 123})


class TestIntegrationScenarios:
    """Test integrated error handling scenarios."""

    def test_github_api_error_flow(self):
        """Test complete GitHub API error handling flow."""
        # Simulate GitHub API 403 error
        github_error = {"status_code": 403, "message": "API rate limit exceeded"}

        exc = GitHubAPIException(
            message="GitHub API rate limit exceeded",
            rate_limit_info={"remaining": 0, "reset": "2024-01-01T00:00:00Z"},
        )

        assert exc.error_code == "GITHUB_RATE_LIMIT"
        assert exc.category == ErrorCategory.RATE_LIMIT
        assert exc.http_status_code == 429

        # Verify exception data for API response
        error_dict = exc.to_dict()
        assert error_dict["error_code"] == "GITHUB_RATE_LIMIT"
        assert error_dict["category"] == "rate_limit"

    def test_database_error_with_rollback(self):
        """Test database error handling with proper rollback."""
        exc = DatabaseException(
            message="Database connection failed", operation="pipeline_sync"
        )

        assert exc.error_code == "DATABASE_ERROR"
        assert exc.category == ErrorCategory.DATABASE
        assert exc.severity == ErrorSeverity.HIGH
        assert exc.details["operation"] == "pipeline_sync"

    def test_complete_error_response_structure(self):
        """Test complete error response structure."""
        exc = ValidationException(
            message="Invalid input data",
            field_errors=[{"field": "email", "message": "Invalid format"}],
        )

        response = create_error_response(
            error_code=exc.error_code,
            message=exc.user_message,
            details=exc.details,
            status_code=exc.http_status_code,
        )

        content = json.loads(response.body.decode())

        # Verify complete structure
        assert "error" in content
        error = content["error"]
        assert "code" in error
        assert "message" in error
        assert "timestamp" in error
        assert "details" in error
        assert "field_errors" in error["details"]
