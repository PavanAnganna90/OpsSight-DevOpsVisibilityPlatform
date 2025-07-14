"""
Logging Middleware for FastAPI Application

Provides comprehensive request/response logging, correlation IDs, and performance monitoring.
"""

import time
import uuid
import json
from typing import Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Logging middleware providing:
    - Request/response logging
    - Correlation ID tracking
    - Performance monitoring
    - Error tracking
    """
    
    def __init__(self, app, config: Optional[dict] = None):
        super().__init__(app)
        self.config = config or {}
        
        # Logging configuration
        self.log_requests = self.config.get("log_requests", True)
        self.log_responses = self.config.get("log_responses", True)
        self.log_request_body = self.config.get("log_request_body", False)
        self.log_response_body = self.config.get("log_response_body", False)
        self.max_body_length = self.config.get("max_body_length", 1000)
        
        # Performance monitoring
        self.slow_request_threshold = self.config.get("slow_request_threshold", 1.0)  # seconds
        
        # Exclude paths from logging
        self.excluded_paths = self.config.get("excluded_paths", [
            "/health", "/metrics", "/docs", "/redoc", "/openapi.json"
        ])
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """
        Main logging middleware dispatch.
        
        Args:
            request: FastAPI request object
            call_next: Next middleware/handler in chain
            
        Returns:
            Response: HTTP response
        """
        # Skip logging for excluded paths
        if request.url.path in self.excluded_paths:
            return await call_next(request)
        
        # Generate correlation ID
        correlation_id = str(uuid.uuid4())
        request.state.correlation_id = correlation_id
        
        start_time = time.time()
        
        # Log request
        if self.log_requests:
            await self._log_request(request, correlation_id)
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Add correlation ID to response headers
            response.headers["X-Correlation-ID"] = correlation_id
            
            # Log response
            if self.log_responses:
                await self._log_response(request, response, duration, correlation_id)
            
            # Log slow requests
            if duration > self.slow_request_threshold:
                await self._log_slow_request(request, duration, correlation_id)
            
            return response
            
        except Exception as e:
            # Calculate duration
            duration = time.time() - start_time
            
            # Log error
            await self._log_error(request, e, duration, correlation_id)
            
            raise
    
    async def _log_request(self, request: Request, correlation_id: str):
        """Log incoming request details."""
        try:
            # Basic request info
            log_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "correlation_id": correlation_id,
                "type": "request",
                "method": request.method,
                "url": str(request.url),
                "path": request.url.path,
                "query_params": dict(request.query_params),
                "headers": dict(request.headers),
                "client_ip": self._get_client_ip(request),
            }
            
            # Add request body if configured
            if self.log_request_body and request.method in ["POST", "PUT", "PATCH"]:
                try:
                    body = await request.body()
                    if body:
                        body_str = body.decode("utf-8")
                        if len(body_str) > self.max_body_length:
                            body_str = body_str[:self.max_body_length] + "... [truncated]"
                        log_data["body"] = body_str
                except Exception as e:
                    log_data["body_error"] = str(e)
            
            logger.info(f"REQUEST: {json.dumps(log_data)}")
            
        except Exception as e:
            logger.error(f"Error logging request: {e}")
    
    async def _log_response(
        self, 
        request: Request, 
        response: Response, 
        duration: float, 
        correlation_id: str
    ):
        """Log outgoing response details."""
        try:
            log_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "correlation_id": correlation_id,
                "type": "response",
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_seconds": round(duration, 4),
                "response_headers": dict(response.headers),
            }
            
            # Add response body if configured and it's a small response
            if (self.log_response_body and 
                response.status_code >= 400 and
                hasattr(response, 'body')):
                try:
                    if response.body:
                        body_str = response.body.decode("utf-8")
                        if len(body_str) > self.max_body_length:
                            body_str = body_str[:self.max_body_length] + "... [truncated]"
                        log_data["response_body"] = body_str
                except Exception as e:
                    log_data["response_body_error"] = str(e)
            
            # Choose log level based on status code
            if response.status_code >= 500:
                logger.error(f"RESPONSE: {json.dumps(log_data)}")
            elif response.status_code >= 400:
                logger.warning(f"RESPONSE: {json.dumps(log_data)}")
            else:
                logger.info(f"RESPONSE: {json.dumps(log_data)}")
            
        except Exception as e:
            logger.error(f"Error logging response: {e}")
    
    async def _log_slow_request(
        self, 
        request: Request, 
        duration: float, 
        correlation_id: str
    ):
        """Log slow request for performance monitoring."""
        try:
            log_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "correlation_id": correlation_id,
                "type": "slow_request",
                "method": request.method,
                "path": request.url.path,
                "duration_seconds": round(duration, 4),
                "threshold_seconds": self.slow_request_threshold,
                "client_ip": self._get_client_ip(request),
            }
            
            logger.warning(f"SLOW_REQUEST: {json.dumps(log_data)}")
            
        except Exception as e:
            logger.error(f"Error logging slow request: {e}")
    
    async def _log_error(
        self, 
        request: Request, 
        error: Exception, 
        duration: float, 
        correlation_id: str
    ):
        """Log request error details."""
        try:
            log_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "correlation_id": correlation_id,
                "type": "error",
                "method": request.method,
                "path": request.url.path,
                "duration_seconds": round(duration, 4),
                "error_type": type(error).__name__,
                "error_message": str(error),
                "client_ip": self._get_client_ip(request),
            }
            
            logger.error(f"REQUEST_ERROR: {json.dumps(log_data)}")
            
        except Exception as e:
            logger.error(f"Error logging request error: {e}")
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address, considering proxies."""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"