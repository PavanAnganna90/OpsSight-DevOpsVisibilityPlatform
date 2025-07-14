"""
Audit system initialization for OpsSight platform.

This module provides functions to initialize and configure the audit logging system
when the application starts up.
"""

from sqlalchemy.orm import sessionmaker
from app.services.audit_service import audit_service, AuditContext
import logging

logger = logging.getLogger(__name__)


def initialize_audit_system(session_factory: sessionmaker):
    """
    Initialize the audit logging system.

    Args:
        session_factory: SQLAlchemy session factory
    """
    try:
        logger.info("Initializing audit logging system...")

        # Register audit event listeners
        audit_service.register_listeners(session_factory)

        logger.info("Audit logging system initialized successfully")

    except Exception as e:
        logger.error(f"Failed to initialize audit system: {e}")
        raise


def get_audit_service():
    """Get the global audit service instance."""
    return audit_service


def create_audit_context(**context_data):
    """
    Create an audit context for tracking operations.

    Args:
        **context_data: Context data to include in audit logs

    Returns:
        AuditContext: Context manager for audit operations
    """
    return AuditContext(**context_data)


# Audit context utilities for common use cases
def create_request_audit_context(
    user_id: int = None,
    organization_id: int = None,
    session_id: str = None,
    ip_address: str = None,
    user_agent: str = None,
    request_id: str = None,
    correlation_id: str = None,
    api_endpoint: str = None,
    http_method: str = None,
    **additional_context,
):
    """
    Create an audit context for web requests.

    Args:
        user_id: ID of the user making the request
        organization_id: ID of the organization context
        session_id: Session identifier
        ip_address: Client IP address
        user_agent: Client user agent
        request_id: Unique request identifier
        correlation_id: Correlation identifier for related operations
        api_endpoint: API endpoint being called
        http_method: HTTP method (GET, POST, etc.)
        **additional_context: Additional context data

    Returns:
        AuditContext: Context manager for audit operations
    """
    context_data = {
        "user_id": user_id,
        "organization_id": organization_id,
        "session_id": session_id,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "request_id": request_id,
        "correlation_id": correlation_id,
        "api_endpoint": api_endpoint,
        "http_method": http_method,
        "additional_context": additional_context,
    }

    # Remove None values
    context_data = {k: v for k, v in context_data.items() if v is not None}

    return AuditContext(**context_data)


def create_system_audit_context(
    process_name: str, correlation_id: str = None, **additional_context
):
    """
    Create an audit context for system operations.

    Args:
        process_name: Name of the system process
        correlation_id: Correlation identifier
        **additional_context: Additional context data

    Returns:
        AuditContext: Context manager for audit operations
    """
    context_data = {
        "process_name": process_name,
        "correlation_id": correlation_id,
        "additional_context": {"operation_type": "system", **additional_context},
    }

    # Remove None values
    context_data = {k: v for k, v in context_data.items() if v is not None}

    return AuditContext(**context_data)
