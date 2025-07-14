"""
Audit Middleware for automatic tracking of API requests and responses.
"""

import time
import uuid
import json
from typing import Callable, Dict, Any, Optional
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import asyncio

from app.models.audit_log import AuditEventType, AuditLogLevel
from app.services.audit_service import get_audit_service


class AuditMiddleware(BaseHTTPMiddleware):
    """Middleware for automatic audit logging of API requests."""
    
    def __init__(
        self,
        app: ASGIApp,
        excluded_paths: Optional[set] = None,
        sensitive_headers: Optional[set] = None,
        log_request_body: bool = False,
        log_response_body: bool = False,
        max_body_size: int = 10000  # Max body size to log in bytes
    ):
        super().__init__(app)
        self.excluded_paths = excluded_paths or {
            "/health",
            "/metrics",
            "/docs",
            "/openapi.json",
            "/favicon.ico"
        }
        self.sensitive_headers = sensitive_headers or {
            "authorization",
            "x-api-key",
            "cookie",
            "x-auth-token"
        }
        self.log_request_body = log_request_body
        self.log_response_body = log_response_body
        self.max_body_size = max_body_size
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and response for audit logging."""
        
        # Skip excluded paths
        if request.url.path in self.excluded_paths:
            return await call_next(request)
        
        # Skip static files and health checks
        if any(request.url.path.startswith(prefix) for prefix in ["/static/", "/assets/", "/_"]):
            return await call_next(request)
        
        # Generate request ID for correlation
        request_id = str(uuid.uuid4())
        
        # Start timing
        start_time = time.time()
        
        # Extract request information
        request_info = await self._extract_request_info(request, request_id)
        
        # Process the request
        response = None
        error_occurred = False
        error_message = None
        
        try:
            response = await call_next(request)
        except Exception as e:
            error_occurred = True
            error_message = str(e)
            response = JSONResponse(
                status_code=500,
                content={"error": "Internal server error", "request_id": request_id}
            )
        
        # Calculate duration
        duration_ms = int((time.time() - start_time) * 1000)
        
        # Extract response information
        response_info = self._extract_response_info(response)
        
        # Determine if this was a successful operation
        success = not error_occurred and 200 <= response.status_code < 400
        
        # Log the audit event asynchronously
        asyncio.create_task(
            self._log_audit_event(
                request_info=request_info,
                response_info=response_info,
                duration_ms=duration_ms,
                success=success,
                error_message=error_message
            )
        )
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response
    
    async def _extract_request_info(self, request: Request, request_id: str) -> Dict[str, Any]:
        """Extract relevant information from the request."""
        
        # Get client information
        client_host = request.client.host if request.client else None
        
        # Get user agent
        user_agent = request.headers.get("user-agent", "")
        
        # Filter sensitive headers
        headers = {
            k: v for k, v in request.headers.items()
            if k.lower() not in self.sensitive_headers
        }
        
        # Get query parameters
        query_params = dict(request.query_params)
        
        # Get request body if enabled and method allows it
        request_body = None
        if (self.log_request_body and 
            request.method in ["POST", "PUT", "PATCH"] and
            request.headers.get("content-type", "").startswith("application/json")):
            try:
                body = await request.body()
                if len(body) <= self.max_body_size:
                    request_body = body.decode("utf-8")
            except Exception:
                request_body = "<unable to read body>"
        
        # Extract user information from token (if available)
        user_info = await self._extract_user_info(request)
        
        return {
            "request_id": request_id,
            "method": request.method,
            "url": str(request.url),
            "path": request.url.path,
            "query_params": query_params,
            "headers": headers,
            "client_host": client_host,
            "user_agent": user_agent,
            "request_body": request_body,
            "user_info": user_info
        }
    
    def _extract_response_info(self, response: Response) -> Dict[str, Any]:
        """Extract relevant information from the response."""
        
        # Get response headers (filter sensitive ones)
        headers = {
            k: v for k, v in response.headers.items()
            if k.lower() not in self.sensitive_headers
        }
        
        return {
            "status_code": response.status_code,
            "headers": headers,
            "media_type": getattr(response, "media_type", None)
        }
    
    async def _extract_user_info(self, request: Request) -> Dict[str, Any]:
        """Extract user information from request."""
        
        user_info = {}
        
        # Try to get user info from Authorization header
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            # This would normally decode the JWT token
            # For now, we'll just indicate that a token was present
            user_info["has_token"] = True
        
        # Try to get user info from request state (if set by auth middleware)
        if hasattr(request.state, "user"):
            user = request.state.user
            user_info.update({
                "user_id": getattr(user, "id", None),
                "user_email": getattr(user, "email", None),
                "user_name": getattr(user, "full_name", None)
            })
        
        return user_info
    
    async def _log_audit_event(
        self,
        request_info: Dict[str, Any],
        response_info: Dict[str, Any],
        duration_ms: int,
        success: bool,
        error_message: Optional[str] = None
    ):
        """Log the audit event."""
        
        try:
            # Determine event type based on HTTP method and endpoint
            event_type = self._determine_event_type(
                request_info["method"],
                request_info["path"],
                response_info["status_code"]
            )
            
            # Determine log level
            level = AuditLogLevel.INFO
            if not success:
                if response_info["status_code"] >= 500:
                    level = AuditLogLevel.ERROR
                elif response_info["status_code"] >= 400:
                    level = AuditLogLevel.WARNING
            
            # Create audit message
            message = f"{request_info['method']} {request_info['path']} - {response_info['status_code']}"
            if error_message:
                message += f" - {error_message}"
            
            # Prepare metadata
            metadata = {
                "request": {
                    "method": request_info["method"],
                    "url": request_info["url"],
                    "path": request_info["path"],
                    "query_params": request_info["query_params"],
                    "headers": request_info["headers"],
                    "body_logged": request_info.get("request_body") is not None
                },
                "response": {
                    "status_code": response_info["status_code"],
                    "headers": response_info["headers"],
                    "media_type": response_info["media_type"]
                },
                "performance": {
                    "duration_ms": duration_ms
                }
            }
            
            # Add request body if logged
            if request_info.get("request_body"):
                metadata["request"]["body"] = request_info["request_body"]
            
            # Get user information
            user_info = request_info["user_info"]
            
            async with get_audit_service() as audit_service:
                await audit_service.log_event(
                    event_type=event_type,
                    message=message,
                    user_id=user_info.get("user_id"),
                    user_email=user_info.get("user_email"),
                    user_name=user_info.get("user_name"),
                    ip_address=request_info["client_host"],
                    user_agent=request_info["user_agent"],
                    request_id=request_info["request_id"],
                    metadata=metadata,
                    success=success,
                    error_message=error_message,
                    duration_ms=duration_ms,
                    level=level
                )
        
        except Exception as e:
            # Don't let audit logging errors break the application
            print(f"Audit logging error: {e}")
    
    def _determine_event_type(self, method: str, path: str, status_code: int) -> AuditEventType:
        """Determine the appropriate audit event type."""
        
        # Authentication endpoints
        if "/auth/" in path:
            if "login" in path and status_code < 400:
                return AuditEventType.LOGIN_SUCCESS
            elif "login" in path and status_code >= 400:
                return AuditEventType.LOGIN_FAILED
            elif "logout" in path:
                return AuditEventType.LOGOUT
            elif "sso" in path and status_code < 400:
                return AuditEventType.SSO_LOGIN_SUCCESS
            elif "sso" in path and status_code >= 400:
                return AuditEventType.SSO_LOGIN_FAILED
            elif "token" in path or "refresh" in path:
                return AuditEventType.TOKEN_REFRESH
        
        # User management endpoints
        if "/users/" in path:
            if method == "POST":
                return AuditEventType.USER_CREATED
            elif method in ["PUT", "PATCH"]:
                return AuditEventType.USER_UPDATED
            elif method == "DELETE":
                return AuditEventType.USER_DELETED
        
        # Role management endpoints
        if "/roles/" in path:
            if method == "POST":
                return AuditEventType.ROLE_CREATED
            elif method in ["PUT", "PATCH"]:
                return AuditEventType.ROLE_UPDATED
            elif method == "DELETE":
                return AuditEventType.ROLE_DELETED
        
        # Permission endpoints
        if "/permissions/" in path:
            if method == "POST":
                return AuditEventType.PERMISSION_CREATED
            elif method in ["PUT", "PATCH"]:
                return AuditEventType.PERMISSION_UPDATED
            elif method == "DELETE":
                return AuditEventType.PERMISSION_DELETED
        
        # Team management endpoints
        if "/teams/" in path:
            if method == "POST":
                return AuditEventType.TEAM_CREATED
            elif method in ["PUT", "PATCH"]:
                return AuditEventType.TEAM_UPDATED
            elif method == "DELETE":
                return AuditEventType.TEAM_DELETED
        
        # Infrastructure endpoints
        if "/clusters/" in path:
            if method == "POST":
                return AuditEventType.CLUSTER_CREATED
            elif method in ["PUT", "PATCH"]:
                return AuditEventType.CLUSTER_UPDATED
            elif method == "DELETE":
                return AuditEventType.CLUSTER_DELETED
        
        if "/deployments/" in path:
            if method == "POST":
                return AuditEventType.DEPLOYMENT_CREATED
            elif method in ["PUT", "PATCH"]:
                return AuditEventType.DEPLOYMENT_UPDATED
            elif method == "DELETE":
                return AuditEventType.DEPLOYMENT_DELETED
        
        # Pipeline endpoints
        if "/pipelines/" in path:
            if method == "POST" and "execute" in path:
                return AuditEventType.PIPELINE_EXECUTED
            elif method == "POST":
                return AuditEventType.PIPELINE_CREATED
            elif method in ["PUT", "PATCH"]:
                return AuditEventType.PIPELINE_UPDATED
            elif method == "DELETE":
                return AuditEventType.PIPELINE_DELETED
        
        # Data operations
        if "/export" in path:
            return AuditEventType.DATA_EXPORT
        elif "/import" in path:
            return AuditEventType.DATA_IMPORT
        
        # Security events
        if status_code == 401:
            return AuditEventType.PERMISSION_DENIED
        elif status_code == 403:
            return AuditEventType.PERMISSION_DENIED
        elif status_code == 429:
            return AuditEventType.RATE_LIMIT_EXCEEDED
        
        # Default for other operations - this could be expanded
        return AuditEventType.SENSITIVE_DATA_ACCESS if method == "GET" else AuditEventType.USER_UPDATED


def create_audit_middleware(
    excluded_paths: Optional[set] = None,
    log_request_body: bool = False,
    log_response_body: bool = False
) -> AuditMiddleware:
    """Factory function to create audit middleware with custom configuration."""
    
    return lambda app: AuditMiddleware(
        app,
        excluded_paths=excluded_paths,
        log_request_body=log_request_body,
        log_response_body=log_response_body
    )