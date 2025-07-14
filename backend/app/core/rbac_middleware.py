from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.status import HTTP_403_FORBIDDEN
from app.core.auth.rbac import RBACContext, PermissionDeniedError
from app.core.auth import get_current_user
import asyncio
import os


class RBACMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware to enforce Role-Based Access Control (RBAC) on every request.
    Checks user permissions before allowing access to protected endpoints.
    """

    def __init__(self, app, default_permission=None):
        super().__init__(app)
        self.default_permission = default_permission

    async def dispatch(self, request: Request, call_next):
        # Test bypass: if RBAC_TEST_BYPASS=1, skip all RBAC checks
        if os.environ.get("RBAC_TEST_BYPASS") == "1":
            return await call_next(request)
        # Example: Only enforce RBAC on /api/v1 endpoints
        if request.url.path.startswith("/api/v1/"):
            try:
                # Extract user (assumes get_current_user is a dependency that returns User or raises)
                user = await get_current_user(request)
                # If db is needed, use dependency injection in the route or dependency signature instead
                context = RBACContext(user, db)
                # Optionally, extract required permission from route metadata
                required_permission = getattr(
                    request.scope.get("endpoint"),
                    "required_permission",
                    self.default_permission,
                )
                if required_permission:
                    has_perm = await context.has_system_permission(required_permission)
                    if not has_perm:
                        raise PermissionDeniedError(
                            f"Missing permission: {required_permission}"
                        )
            except PermissionDeniedError as e:
                return JSONResponse(
                    status_code=HTTP_403_FORBIDDEN, content={"detail": str(e.detail)}
                )
            except Exception as e:
                return JSONResponse(
                    status_code=HTTP_403_FORBIDDEN,
                    content={"detail": "RBAC check failed"},
                )
        # Proceed to next middleware or route handler
        response = await call_next(request)
        return response


# Usage example (in main.py):
# from app.core.rbac_middleware import RBACMiddleware
# app.add_middleware(RBACMiddleware, default_permission=None)
