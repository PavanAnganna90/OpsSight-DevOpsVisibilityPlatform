"""
Enhanced Security Middleware for FastAPI Application

Provides comprehensive security features including headers, rate limiting, 
input validation, threat detection, and security monitoring.
"""

import time
import asyncio
from typing import Dict, Optional
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import logging
from collections import defaultdict, deque
from datetime import datetime, timedelta

from app.core.security_config import get_security_config
from app.utils.rate_limiter import get_rate_limiter
from app.utils.input_validator import input_validator

logger = logging.getLogger(__name__)


class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Enhanced security middleware providing:
    - Dynamic security headers with CSP
    - Advanced rate limiting with Redis
    - Input validation and sanitization
    - Threat detection and blocking
    - Security event monitoring
    - Request/response security validation
    """
    
    def __init__(self, app, config: Optional[Dict] = None):
        super().__init__(app)
        self.config = config or {}
        self.security_config = get_security_config()
        self.rate_limiter = None  # Will be initialized asynchronously
        
        # Request size limits from security config
        self.max_request_size = self.config.get(
            "max_request_size", 
            self.security_config.input_validation.max_file_size_mb * 1024 * 1024
        )
        
        # Security monitoring
        self.security_events = []
        self.blocked_ips = set()
        
        logger.info(f"Security middleware initialized with level: {self.security_config.settings.security_level.value}")
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """
        Enhanced security middleware dispatch with comprehensive protection.
        
        Args:
            request: FastAPI request object
            call_next: Next middleware/handler in chain
            
        Returns:
            Response: HTTP response with security headers and validation
        """
        start_time = time.time()
        client_ip = self._get_client_ip(request)
        
        # Initialize rate limiter if not already done
        if self.rate_limiter is None:
            self.rate_limiter = await get_rate_limiter()
        
        try:
            # Check if IP is blocked
            if await self._is_ip_blocked(client_ip):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: IP address blocked due to security violations"
                )
            
            # Validate request size
            await self._check_request_size(request)
            
            # Validate request for security threats
            await self._validate_request_security(request)
            
            # Validate input data if present
            await self._validate_request_input(request)
            
            # Apply rate limiting
            await self._apply_rate_limiting(client_ip, request)
            
            # Process request
            response = await call_next(request)
            
            # Add security headers
            self._add_security_headers(request, response)
            
            # Validate response if needed
            await self._validate_response_security(request, response)
            
            # Track successful request
            await self._track_request_metrics(request, response, time.time() - start_time, client_ip)
            
            # Detect potential threats
            await self._detect_threats(client_ip, request, response)
            
            return response
            
        except HTTPException as e:
            # Handle security violations
            await self._handle_security_violation(client_ip, request, e)
            
            response = JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail, "error_code": "SECURITY_VIOLATION"}
            )
            self._add_security_headers(request, response)
            return response
            
        except Exception as e:
            # Handle unexpected errors securely
            logger.error(f"Security middleware error: {e}", exc_info=True)
            
            await self._log_security_event(
                client_ip, request, "middleware_error", f"Unexpected error: {str(e)[:100]}"
            )
            
            response = JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Internal server error", "error_code": "SYSTEM_ERROR"}
            )
            self._add_security_headers(request, response)
            return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address, considering proxies."""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    async def _check_request_size(self, request: Request):
        """Check if request size is within limits."""
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_request_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Request size exceeds limit of {self.max_request_size} bytes"
            )
    
    async def _check_rate_limit(self, client_ip: str, request: Request):
        """Apply rate limiting based on client IP."""
        now = datetime.utcnow()
        
        # Get rate limit buckets for this IP
        buckets = self.rate_limit_storage[client_ip]
        
        # Clean old entries
        self._clean_rate_limit_buckets(buckets, now)
        
        # Check rate limits
        minute_limit = self.rate_limit_config["requests_per_minute"]
        hour_limit = self.rate_limit_config["requests_per_hour"]
        burst_limit = self.rate_limit_config["burst_size"]
        
        # Check burst limit (last 10 seconds)
        burst_window = now - timedelta(seconds=10)
        recent_requests = len([t for t in buckets["burst"] if t > burst_window])
        
        if recent_requests >= burst_limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Burst rate limit exceeded"
            )
        
        # Check minute limit
        if len(buckets["minute"]) >= minute_limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded: too many requests per minute"
            )
        
        # Check hour limit
        if len(buckets["hour"]) >= hour_limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded: too many requests per hour"
            )
        
        # Add current request to buckets
        buckets["burst"].append(now)
        buckets["minute"].append(now)
        buckets["hour"].append(now)
    
    def _clean_rate_limit_buckets(self, buckets: Dict, now: datetime):
        """Remove old entries from rate limit buckets."""
        minute_ago = now - timedelta(minutes=1)
        hour_ago = now - timedelta(hours=1)
        burst_window = now - timedelta(seconds=10)
        
        # Clean buckets
        buckets["minute"] = deque([t for t in buckets["minute"] if t > minute_ago])
        buckets["hour"] = deque([t for t in buckets["hour"] if t > hour_ago])
        buckets["burst"] = deque([t for t in buckets["burst"] if t > burst_window])
    
    def _add_security_headers(self, request: Request, response: Response):
        """Add dynamic security headers to response."""
        headers = self.security_config.get_security_headers(request.url.path)
        
        for header, value in headers.items():
            if value:  # Only add non-empty headers
                response.headers[header] = value
        
        # Add rate limit headers if available
        if hasattr(request.state, 'rate_limit_result'):
            rate_limit_headers = request.state.rate_limit_result.to_headers()
            for header, value in rate_limit_headers.items():
                response.headers[header] = value
    
    async def _log_request_metrics(
        self, 
        request: Request, 
        response: Response, 
        duration: float, 
        client_ip: str
    ):
        """Log request metrics for monitoring."""
        try:
            metrics = {
                "timestamp": datetime.utcnow().isoformat(),
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_seconds": duration,
                "client_ip": client_ip,
                "user_agent": request.headers.get("user-agent", ""),
                "content_length": response.headers.get("content-length", 0),
            }
            
            logger.info(f"REQUEST_METRICS: {metrics}")
            
        except Exception as e:
            logger.error(f"Error logging request metrics: {e}")
    
    async def _log_security_event(
        self, 
        client_ip: str, 
        request: Request, 
        event_type: str, 
        details: str
    ):
        """Log security events for monitoring."""
        try:
            event = {
                "timestamp": datetime.utcnow().isoformat(),
                "event_type": event_type,
                "client_ip": client_ip,
                "method": request.method,
                "path": request.url.path,
                "user_agent": request.headers.get("user-agent", ""),
                "details": details,
            }
            
            logger.warning(f"SECURITY_EVENT: {event}")
            
        except Exception as e:
            logger.error(f"Error logging security event: {e}")
    
    def _build_csp_header(self) -> str:
        """Build Content Security Policy header based on environment."""
        # Get environment-specific configuration
        is_development = self.config.get("environment", "production") == "development"
        
        # Base CSP directives
        csp_directives = {
            "default-src": ["'self'"],
            "script-src": ["'self'"],
            "style-src": ["'self'"],
            "img-src": ["'self'", "data:", "https:"],
            "font-src": ["'self'", "https://fonts.gstatic.com"],
            "connect-src": ["'self'"],
            "media-src": ["'self'"],
            "object-src": ["'none'"],
            "frame-src": ["'none'"],
            "worker-src": ["'self'"],
            "manifest-src": ["'self'"],
            "base-uri": ["'self'"],
            "form-action": ["'self'"],
            "frame-ancestors": ["'none'"],
            "upgrade-insecure-requests": [],
        }
        
        # Allow unsafe-inline and unsafe-eval in development only
        if is_development:
            csp_directives["script-src"].extend(["'unsafe-inline'", "'unsafe-eval'"])
            csp_directives["style-src"].extend(["'unsafe-inline'"])
        else:
            # Production: Use nonces/hashes for inline scripts/styles
            csp_directives["script-src"].append("'strict-dynamic'")
        
        # Allow specific domains for external services
        trusted_domains = self.config.get("trusted_domains", [])
        if trusted_domains:
            for domain in trusted_domains:
                csp_directives["connect-src"].append(domain)
        
        # Build CSP string
        csp_parts = []
        for directive, values in csp_directives.items():
            if values:
                csp_parts.append(f"{directive} {' '.join(values)}")
            else:
                csp_parts.append(directive)
        
        return "; ".join(csp_parts)
    
    def _add_conditional_headers(self, request: Request, response: Response):
        """Add conditional security headers based on request path."""
        path = request.url.path
        
        # Different cache policies for different endpoints
        if path.startswith("/api/auth") or path.startswith("/api/admin"):
            # Stricter caching for auth endpoints
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
        elif path.startswith("/api/public"):
            # Allow caching for public endpoints
            response.headers["Cache-Control"] = "public, max-age=3600"
        elif path.startswith("/health") or path.startswith("/metrics"):
            # Short-term caching for health/metrics endpoints
            response.headers["Cache-Control"] = "public, max-age=60"
        
        # Add API-specific headers
        if path.startswith("/api"):
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-API-Version"] = "1.0"
        
        # Add CORS headers if needed (for API endpoints)
        if path.startswith("/api") and request.method in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
            allowed_origins = self.config.get("allowed_origins", ["http://localhost:3000"])
            origin = request.headers.get("origin")
            
            if origin in allowed_origins:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS"
                response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
                response.headers["Access-Control-Max-Age"] = "86400"  # 24 hours
    
    async def _validate_request_security(self, request: Request):
        """Perform additional security validation on requests."""
        # Check for suspicious patterns in URL
        suspicious_patterns = [
            "../", "..\\", "..", 
            "<script", "javascript:", "vbscript:",
            "union select", "drop table", "insert into",
            "eval(", "setTimeout(", "setInterval(",
        ]
        
        url_path = request.url.path.lower()
        query_string = str(request.url.query).lower()
        
        for pattern in suspicious_patterns:
            if pattern in url_path or pattern in query_string:
                await self._log_security_event(
                    self._get_client_ip(request),
                    request,
                    "suspicious_pattern",
                    f"Suspicious pattern detected: {pattern}"
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid request pattern detected"
                )
        
        # Validate request headers
        user_agent = request.headers.get("user-agent", "")
        if not user_agent or len(user_agent) < 10:
            await self._log_security_event(
                self._get_client_ip(request),
                request,
                "suspicious_user_agent",
                f"Suspicious or missing user agent: {user_agent}"
            )
        
        # Check for common attack headers
        dangerous_headers = [
            "x-forwarded-host", "x-host", "x-forwarded-server",
            "x-real-ip", "x-cluster-client-ip"
        ]
        
        for header in dangerous_headers:
            if header in request.headers:
                header_value = request.headers[header]
                # Log but don't block - these might be legitimate in some setups
                await self._log_security_event(
                    self._get_client_ip(request),
                    request,
                    "forwarded_header",
                    f"Forwarded header detected: {header}={header_value}"
                )
    
    async def _is_ip_blocked(self, client_ip: str) -> bool:
        """Check if IP is blocked."""
        if self.rate_limiter:
            return await self.rate_limiter.is_ip_blocked(client_ip)
        else:
            return client_ip in self.blocked_ips
    
    async def _validate_request_input(self, request: Request):
        """Validate request input data."""
        # Skip validation for certain paths
        if request.url.path.startswith(("/health", "/metrics", "/docs", "/openapi.json")):
            return
        
        # Get request body if present
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                content_type = request.headers.get("content-type", "")
                
                if "application/json" in content_type:
                    # Read and validate JSON body
                    body = await request.body()
                    if body:
                        json_str = body.decode('utf-8')
                        result = input_validator.validate_json(json_str, "request_body")
                        if not result.is_valid:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Invalid JSON input: {'; '.join(result.errors)}"
                            )
                
                elif "multipart/form-data" in content_type:
                    # File upload validation will be handled by specific endpoints
                    pass
                    
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid character encoding in request body"
                )
        
        # Validate query parameters
        for param_name, param_value in request.query_params.items():
            result = input_validator.validate_string(str(param_value), f"query.{param_name}")
            if not result.is_valid and input_validator.strict_mode:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid query parameter: {'; '.join(result.errors)}"
                )
    
    async def _apply_rate_limiting(self, client_ip: str, request: Request):
        """Apply rate limiting based on endpoint type."""
        if not self.rate_limiter:
            return  # Fallback: no rate limiting
        
        # Determine limit type based on path
        path = request.url.path
        if path.startswith("/api/auth"):
            limit_type = "auth"
        elif path.startswith("/api/admin"):
            limit_type = "admin"
        elif "upload" in path:
            limit_type = "upload"
        else:
            limit_type = "api"
        
        # Check rate limits
        result = await self.rate_limiter.check_rate_limit(client_ip, limit_type)
        
        if not result.allowed:
            # Store result for headers
            request.state.rate_limit_result = result
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded"
            )
        
        # Store successful result for headers
        request.state.rate_limit_result = result
    
    async def _validate_response_security(self, request: Request, response: Response):
        """Validate response for security issues."""
        # Check for sensitive data in response
        if hasattr(response, 'body') and response.body:
            try:
                # Convert bytes to string for analysis
                if isinstance(response.body, bytes):
                    body_str = response.body.decode('utf-8', errors='ignore')
                else:
                    body_str = str(response.body)
                
                # Check for potential sensitive data patterns (basic check)
                sensitive_patterns = [
                    r'password["\s]*[:=]["\s]*[\w]+',
                    r'secret["\s]*[:=]["\s]*[\w]+',
                    r'token["\s]*[:=]["\s]*[\w]{20,}',
                    r'key["\s]*[:=]["\s]*[\w]{20,}',
                ]
                
                import re
                for pattern in sensitive_patterns:
                    if re.search(pattern, body_str, re.IGNORECASE):
                        await self._log_security_event(
                            self._get_client_ip(request),
                            request,
                            "sensitive_data_leak",
                            f"Potential sensitive data in response: {pattern}"
                        )
                        break
                        
            except Exception as e:
                logger.warning(f"Response validation error: {e}")
    
    async def _track_request_metrics(self, request: Request, response: Response, 
                                   duration: float, client_ip: str):
        """Track request metrics and performance."""
        try:
            metrics = {
                "timestamp": datetime.utcnow().isoformat(),
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_seconds": duration,
                "client_ip": client_ip,
                "user_agent": request.headers.get("user-agent", "")[:200],
                "content_length": response.headers.get("content-length", 0),
                "security_level": self.security_config.settings.security_level.value,
            }
            
            logger.info(f"REQUEST_METRICS: {metrics}")
            
        except Exception as e:
            logger.error(f"Error tracking request metrics: {e}")
    
    async def _detect_threats(self, client_ip: str, request: Request, response: Response):
        """Detect potential security threats."""
        if not self.rate_limiter:
            return
        
        # Use the rate limiter's threat detection
        await self.rate_limiter.detect_threats(
            client_ip, 
            request.url.path, 
            response.status_code
        )
    
    async def _handle_security_violation(self, client_ip: str, request: Request, 
                                       exception: HTTPException):
        """Handle security violations and potential blocking."""
        violation_type = "unknown"
        
        if exception.status_code == 429:
            violation_type = "rate_limit"
        elif exception.status_code == 400:
            violation_type = "input_validation"
        elif exception.status_code == 403:
            violation_type = "access_denied"
        
        # Log the violation
        await self._log_security_event(
            client_ip, request, violation_type, str(exception.detail)
        )
        
        # Consider blocking for repeated violations
        if violation_type in ["input_validation", "access_denied"]:
            # This is a simplified blocking logic - in production, use more sophisticated rules
            if self.rate_limiter:
                # Check if this IP has had many violations recently
                pass  # Implementation would check violation history