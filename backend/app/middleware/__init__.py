"""
Middleware package for FastAPI application.

Provides centralized middleware configuration and management.
"""

from .rbac_middleware import RBACMiddleware, require_rbac_permissions
from .security_middleware import SecurityMiddleware
from .logging_middleware import LoggingMiddleware

__all__ = [
    "RBACMiddleware",
    "require_rbac_permissions", 
    "SecurityMiddleware",
    "LoggingMiddleware",
    "configure_middleware"
]


def configure_middleware(app, config=None):
    """
    Configure all middleware for the FastAPI application.
    
    Args:
        app: FastAPI application instance
        config: Optional configuration dict
    """
    # Security middleware (should be first)
    app.add_middleware(SecurityMiddleware)
    
    # RBAC middleware
    rbac_config = config.get("rbac", {}) if config else {}
    app.add_middleware(RBACMiddleware, permission_config=rbac_config.get("permissions"))
    
    # Logging middleware (should be last)
    app.add_middleware(LoggingMiddleware)