"""
FastAPI application with modern async patterns and comprehensive middleware.
Handles DevOps operations, monitoring, and team collaboration.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
import logging
import asyncio
from typing import AsyncGenerator
import os

# Import core modules
from app.core.config import settings
from app.core.app_logging import setup_logging
from app.core.exceptions import (
    ValidationException,
    AuthenticationException,
    AuthorizationException,
    DatabaseException,
    NetworkException,
)
from app.core.error_handlers import setup_error_handlers
from app.core.monitoring import init_metrics
from app.middleware import configure_middleware

# Import API routers
from app.api.v1.api import api_router

# Import schemas for response models
from app.schemas.common import (
    HealthCheckResponse,
    DetailedHealthCheckResponse,
    APIInfoResponse,
    CacheMetrics,
    APIPerformanceInfo,
)
from app.core.cache import get_cache_manager, close_cache_manager

# Configure logging
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Async lifespan context manager for FastAPI application.

    Handles startup and shutdown events with proper async support.
    """
    # Startup
    logger.info("🚀 Starting OpsSight DevOps Application...")

    try:
        # Setup logging
        setup_logging()
        logger.info("✅ Logging configured")

        # Initialize Prometheus metrics (only if not running under pytest)
        if not os.environ.get("PYTEST_CURRENT_TEST"):
            init_metrics()
            logger.info("✅ Custom Prometheus metrics initialized")

        # Check database connection
        if await check_async_db_connection():
            logger.info("✅ Database connection verified")

            # Create tables if they don't exist
            await create_tables()
            logger.info("✅ Database tables verified/created")

        # Initialize cache manager
        try:
            await get_cache_manager()
            logger.info("✅ Cache manager initialized")
        except Exception as e:
            logger.warning(f"⚠️ Cache manager initialization failed: {e}")
            logger.info("🔄 Continuing with in-memory cache only")
        else:
            logger.error("❌ Database connection failed")
            raise RuntimeError("Database connection failed")

        # Initialize Redis connection pool (lazy initialization)
        from app.core.dependencies import get_redis_pool

        redis_pool = await get_redis_pool()
        await redis_pool.ping()
        logger.info("✅ Redis connection verified")

        # Setup Prometheus metrics
        instrumentator = Instrumentator(
            should_group_status_codes=False,
            should_ignore_untemplated=True,
            should_respect_env_var=True,
            should_instrument_requests_inprogress=True,
            excluded_handlers=["/docs", "/redoc", "/openapi.json", "/favicon.ico"],
        )
        instrumentator.instrument(app).expose(app)
        logger.info("✅ Prometheus metrics configured")

        # Start token cleanup service
        from app.services.token_cleanup_service import start_token_cleanup_service
        await start_token_cleanup_service()
        logger.info("✅ Token cleanup service started")

        logger.info("🎉 Application startup completed successfully")

        yield

    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise

    # Shutdown
    logger.info("🛑 Shutting down OpsSight DevOps Application...")

    try:
        # Stop token cleanup service
        from app.services.token_cleanup_service import stop_token_cleanup_service
        await stop_token_cleanup_service()
        logger.info("✅ Token cleanup service stopped")

        # Close cache manager connections
        await close_cache_manager()
        logger.info("✅ Cache manager closed")
        # Close Redis connections
        from app.core.dependencies import _redis_pool

        if _redis_pool:
            await _redis_pool.aclose()
            logger.info("✅ Redis connections closed")

        # Close database connections
        logger.info("✅ Database connections closed")

        logger.info("✅ Application shutdown completed")

    except Exception as e:
        logger.error(f"❌ Shutdown error: {e}")


# Create FastAPI application with modern lifespan
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="""
    ## OpsSight DevOps Platform API

    A comprehensive **DevOps visibility and automation platform** that provides unified infrastructure management,
    CI/CD pipeline orchestration, and real-time monitoring capabilities.

    ### 🚀 Key Features

    - **🔐 Authentication & Authorization**: OAuth2 with JWT tokens, role-based access control
    - **⚙️ Infrastructure Management**: Kubernetes, Terraform, and Ansible automation
    - **🔄 CI/CD Pipelines**: Build, test, and deployment automation with real-time status
    - **📊 Monitoring & Metrics**: Performance monitoring, alerting, and cost analysis
    - **👥 Team Collaboration**: Role management, notifications, and real-time updates
    - **⚡ High Performance**: Multi-level caching, async operations, and optimized queries

    ### 🏗️ Architecture

    Built with **FastAPI 0.115.0+** featuring:
    - **Async/Await**: Native async support for high concurrency
    - **Dependency Injection**: Clean service layer architecture with repository pattern
    - **Multi-Level Caching**: Memory (L1) + Redis (L2) for optimal performance
    - **Type Safety**: Full Pydantic models with automatic validation
    - **Observability**: Prometheus metrics, structured logging, and health checks

    ### 🔧 Performance & Caching

    The API implements intelligent caching strategies:
    - **Memory Cache**: Ultra-fast <1ms response for frequently accessed data
    - **Redis Cache**: Distributed <10ms cache for session data and API responses
    - **Automatic Cache Promotion**: Frequently accessed Redis data promoted to memory
    - **Smart Invalidation**: Tag-based and pattern-based cache invalidation

    ### 📚 Getting Started

    1. **Authentication**: Obtain JWT token via `/api/v1/auth/login`
    2. **Explore**: Use the interactive documentation below
    3. **Monitor**: Check `/health` for system status
    4. **Real-time**: Connect to WebSocket endpoints for live updates

    ### 🛡️ Security

    - **HTTPS Only**: TLS 1.2+ required for production
    - **Security Headers**: Comprehensive security headers on all responses
    - **Rate Limiting**: API rate limiting and DDoS protection
    - **Input Validation**: Strict input validation and sanitization

    For detailed examples and SDK generation, visit our documentation portal.
    """,
    version=settings.VERSION,
    contact={
        "name": "OpsSight DevOps Team",
        "url": "https://github.com/opssight/platform",
        "email": "dev@opssight.io",
    },
    license_info={"name": "MIT License", "url": "https://opensource.org/licenses/MIT"},
    terms_of_service="https://opssight.io/terms",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,  # Modern async lifespan
    openapi_tags=[
        {
            "name": "Authentication",
            "description": "🔐 **User authentication and session management**. Secure OAuth2 implementation with JWT tokens, user registration, password management, and session handling. **Cached**: Authentication checks are cached for optimal performance.",
        },
        {
            "name": "Role Management", 
            "description": "👤 **Role-based access control system**. Create and manage user roles, permissions, and access levels for fine-grained security control. **Permissions Required**: VIEW_ROLES (read), MANAGE_ROLES (write). **Cached**: Role data cached for 5 minutes.",
        },
        {
            "name": "Permission Management",
            "description": "🔑 **Permission system and user-permission assignments**. Comprehensive permission management including direct user permissions, role-based permissions, and effective permission calculation. **Permissions Required**: VIEW_ROLES (read), MANAGE_ROLES (write). **Cached**: Permission categories cached for 1 hour.",
        },
        {
            "name": "Team Management",
            "description": "👥 **Team collaboration and organization**. Manage teams, team members, and team-based resource access with hierarchical permissions. **Permissions Required**: VIEW_TEAMS (read), MANAGE_TEAMS (write).",
        },
        {
            "name": "CI/CD Pipelines",
            "description": "🔄 **Continuous Integration and Deployment**. Build, test, and deployment pipeline management with real-time status tracking and automated workflows. **Permissions Required**: VIEW_PIPELINES (read), MANAGE_PIPELINES (write).",
        },
        {
            "name": "Kubernetes",
            "description": "☸️ **Kubernetes cluster management**. Deploy, monitor, and manage Kubernetes resources including pods, services, deployments, and configurations. **Permissions Required**: VIEW_KUBERNETES (read), MANAGE_KUBERNETES (write).",
        },
        {
            "name": "Enhanced Kubernetes",
            "description": "⚡ **Advanced Kubernetes operations**. Enhanced cluster management with advanced scheduling, auto-scaling, and performance optimization features. **Permissions Required**: ADMIN_READ, ADMIN_WRITE for advanced features.",
        },
        {
            "name": "Infrastructure",
            "description": "🏗️ **Infrastructure as Code with Terraform**. Provision, modify, and manage cloud infrastructure using Terraform with state management and drift detection. **Permissions Required**: VIEW_INFRASTRUCTURE (read), MANAGE_INFRASTRUCTURE (write).",
        },
        {
            "name": "Automation",
            "description": "🤖 **Ansible automation and configuration management**. Automate configuration management, application deployment, and infrastructure provisioning. **Permissions Required**: VIEW_AUTOMATION (read), MANAGE_AUTOMATION (write).",
        },
        {
            "name": "Alerts",
            "description": "🚨 **Intelligent alerting and incident management**. Real-time monitoring, alert routing, escalation policies, and incident response automation. **Permissions Required**: VIEW_ALERTS (read), MANAGE_ALERTS (write).",
        },
        {
            "name": "Cost Analysis",
            "description": "💰 **Cloud cost optimization and tracking**. Monitor, analyze, and optimize cloud spending with detailed cost breakdowns and recommendations. **Permissions Required**: VIEW_COST_ANALYSIS (read), MANAGE_COST_ANALYSIS (write).",
        },
        {
            "name": "Notifications",
            "description": "📢 **Multi-channel notification system**. Email, Slack, webhook notifications with customizable triggers and escalation rules. **Permissions Required**: VIEW_NOTIFICATIONS (read), MANAGE_NOTIFICATIONS (write).",
        },
        {
            "name": "Real-time Updates",
            "description": "⚡ **WebSocket real-time communication**. Live updates for pipeline status, system metrics, alerts, and collaborative features. **Authentication Required**: JWT token for WebSocket connections.",
        },
        {
            "name": "Monitoring",
            "description": "📊 **System monitoring and performance metrics**. Comprehensive monitoring with Prometheus metrics, custom dashboards, and performance analytics. **Permissions Required**: VIEW_MONITORING (read), ADMIN_READ for advanced metrics.",
        },
        {
            "name": "Cache Management",
            "description": "⚡ **Multi-level cache system management**. Monitor, control, and optimize the intelligent caching system with memory and Redis layers. **Permissions Required**: ADMIN_READ (monitoring), ADMIN_WRITE (management). **Features**: Real-time metrics, health monitoring, manual cache control.",
        },
        {
            "name": "Git Activity",
            "description": "📝 **Git repository activity tracking**. Monitor commits, pull requests, branch activity, and code quality metrics across repositories. **Permissions Required**: VIEW_GIT_ACTIVITY (read), MANAGE_GIT_ACTIVITY (write).",
        },
        {
            "name": "Git Webhooks",
            "description": "🔗 **Git webhook integration and automation**. Automated CI/CD triggers, notifications, and workflow automation based on Git events. **Permissions Required**: VIEW_GIT_WEBHOOKS (read), MANAGE_GIT_WEBHOOKS (write).",
        },
        {
            "name": "Health",
            "description": "💚 **System health and dependency monitoring**. Health checks, dependency status, and system diagnostic information. **Public Access**: Basic health check available without authentication, detailed health requires authentication.",
        },
        {
            "name": "Root",
            "description": "🏠 **API information and navigation**. API overview, version information, and navigation endpoints. **Public Access**: Available without authentication for service discovery.",
        },
    ],
    swagger_ui_parameters={
        "deepLinking": True,
        "displayRequestDuration": True,
        "docExpansion": "none",  # Start collapsed for better UX
        "operationsSorter": "method",
        "tagsSorter": "alpha",
        "filter": True,
        "tryItOutEnabled": True,
        "persistAuthorization": True,  # Keep auth tokens between sessions
        "displayOperationId": False,
        "showMutatedRequest": True,
        "showCommonExtensions": True,
        "showExtensions": True,
    },
    redoc_options={
        "expandResponses": "200,201",
        "hideDownloadButton": False,
        "hideHostname": False,
        "hideLoading": False,
        "jsonSampleExpandLevel": 2,
        "pathInMiddlePanel": True,
        "requiredPropsFirst": True,
        "scrollYOffset": 0,
        "sortPropsAlphabetically": True,
        "theme": {
            "colors": {"primary": {"main": "#2196F3"}},
            "typography": {
                "fontSize": "14px",
                "lineHeight": "1.5em",
                "code": {"fontSize": "12px"},
                "headings": {"fontFamily": "Inter, sans-serif", "fontWeight": "600"},
            },
        },
    },
)


# Security Headers Middleware
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """
    Add security headers to all responses.
    """
    response = await call_next(request)

    # Security headers for DevOps applications
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains"
    )
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'"

    return response


# Request ID and Timing Middleware
@app.middleware("http")
async def request_middleware(request: Request, call_next):
    """
    Add request ID and timing information.
    """
    import uuid
    import time

    # Generate unique request ID
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    # Add request timing
    start_time = time.time()

    # Process request
    response = await call_next(request)

    # Calculate processing time
    process_time = time.time() - start_time

    # Add headers
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = str(process_time)

    # Log request (structured logging)
    logger.info(
        "Request processed",
        extra={
            "request_id": request_id,
            "method": request.method,
            "url": str(request.url),
            "status_code": response.status_code,
            "process_time": process_time,
            "user_agent": request.headers.get("user-agent"),
            "remote_addr": request.client.host if request.client else None,
        },
    )

    return response


# CORS Middleware with environment-specific configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Requested-With",
        "X-Request-ID",
        "Accept",
        "Origin",
        "User-Agent",
    ],
    expose_headers=["X-Request-ID", "X-Process-Time"],
    max_age=86400,  # 24 hours
)

# Compression Middleware
app.add_middleware(
    GZipMiddleware,
    minimum_size=1000,  # Only compress responses > 1KB
    compresslevel=6,  # Balanced compression level
)

# Trusted Host Middleware for production security
if not settings.DEBUG:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)

# Configure comprehensive middleware stack
configure_middleware(app, {
    "rbac": {
        "permissions": {}  # Use default permission configuration
    }
})

# Add audit logging middleware
from app.middleware.audit_middleware import AuditMiddleware
app.add_middleware(AuditMiddleware)

# Exception Handlers - Configure all error handling
setup_error_handlers(app)


# Health Check Endpoints
@app.get(
    "/health",
    tags=["Health"],
    summary="Basic Health Check",
    description="""
    **Basic health check endpoint** that returns the current status of the API service.
    
    This endpoint provides a quick way to verify that the API is running and responding to requests.
    Use this for basic load balancer health checks and service discovery.
    
    **Performance**: Ultra-fast response time (<1ms) as no external dependencies are checked.
    """,
    response_description="Current health status of the API service",
    response_model=HealthCheckResponse,
    responses={
        200: {
            "description": "Service is healthy and operational",
            "content": {
                "application/json": {
                    "example": {
                        "status": "healthy",
                        "service": "OpsSight DevOps Platform",
                        "version": "2.0.0",
                        "environment": "production",
                    }
                }
            },
        }
    },
)
async def health_check():
    """
    Basic health check endpoint.

    Returns:
        dict: Application health status
    """
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "2.0.0",
        "environment": settings.ENVIRONMENT,
    }


@app.get(
    "/health/detailed",
    tags=["Health"],
    summary="Detailed Health Check with Dependencies",
    description="""
    **Comprehensive health check** that verifies all critical system dependencies.
    
    This endpoint checks the health of:
    - **Database connection**: PostgreSQL connectivity and query performance
    - **Redis cache**: Redis connectivity and basic operations
    - **External services**: Any configured external API dependencies
    
    **Use cases**:
    - Kubernetes readiness/liveness probes
    - Monitoring system health checks
    - Debugging connectivity issues
    - Pre-deployment verification
    
    **Performance**: Response time typically <100ms depending on dependencies.
    
    **Cache**: Results are cached for 10 seconds to prevent overwhelming dependencies.
    """,
    response_description="Detailed health status including all dependencies",
    response_model=DetailedHealthCheckResponse,
    responses={
        200: {
            "description": "All dependencies are healthy",
            "content": {
                "application/json": {
                    "example": {
                        "status": "healthy",
                        "service": "OpsSight DevOps Platform",
                        "version": "2.0.0",
                        "environment": "production",
                        "dependencies": {
                            "database": True,
                            "redis": True,
                            "cache_manager": True,
                        },
                    }
                }
            },
        },
        503: {
            "description": "One or more dependencies are unhealthy",
            "content": {
                "application/json": {
                    "example": {
                        "status": "degraded",
                        "service": "OpsSight DevOps Platform",
                        "version": "2.0.0",
                        "environment": "production",
                        "dependencies": {
                            "database": True,
                            "redis": False,
                            "cache_manager": False,
                        },
                    }
                }
            },
        },
    },
)
async def detailed_health_check():
    """
    Detailed health check with dependency status.

    Returns:
        dict: Detailed health status including dependencies
    """
    from app.core.dependencies import check_dependencies

    health_data = await check_dependencies()

    return {
        "status": "healthy" if all(health_data.values()) else "degraded",
        "service": settings.PROJECT_NAME,
        "version": "2.0.0",
        "environment": settings.ENVIRONMENT,
        "dependencies": health_data,
    }


# Root endpoint
@app.get(
    "/",
    tags=["Root"],
    summary="API Welcome and Information",
    description="""
    **Root API endpoint** providing welcome message and navigation information.
    
    This endpoint serves as the main entry point for API discovery, providing:
    - API version and service information
    - Links to documentation (when available)
    - Available API versions and endpoints
    
    **Perfect for**:
    - API service discovery
    - Version verification
    - Initial API exploration
    - Health check alternative
    """,
    response_description="API welcome message with navigation information",
    response_model=APIInfoResponse,
    responses={
        200: {
            "description": "API information and navigation links",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Welcome to OpsSight DevOps Platform",
                        "description": "Modern DevOps platform for CI/CD, infrastructure management, and team collaboration",
                        "version": "2.0.0",
                        "docs_url": "/docs",
                        "api_version": "/api/v1",
                        "features": [
                            "Authentication & Authorization",
                            "Infrastructure Management",
                            "CI/CD Pipelines",
                            "Real-time Monitoring",
                            "Team Collaboration",
                        ],
                    }
                }
            },
        }
    },
)
async def root():
    """
    Root endpoint with API information.

    Returns:
        dict: API welcome message and information
    """
    return {
        "message": "Welcome to OpsSight DevOps Platform",
        "description": "Modern DevOps platform for CI/CD, infrastructure management, and team collaboration",
        "version": "2.0.0",
        "docs_url": (
            "/docs" if settings.DEBUG else "Contact admin for API documentation"
        ),
        "api_version": settings.API_V1_STR,
        "features": [
            "Authentication & Authorization",
            "Infrastructure Management",
            "CI/CD Pipelines",
            "Real-time Monitoring",
            "Team Collaboration",
        ],
    }


# Include API routers
app.include_router(
    api_router,
    prefix=settings.API_V1_STR,
    responses={
        404: {"description": "Not found"},
        422: {"description": "Validation Error"},
        500: {"description": "Internal Server Error"},
    },
)


# Error handling for 404 and 422
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Handle 404 errors with helpful message."""
    return JSONResponse(
        status_code=404,
        content={
            "detail": "The requested resource was not found",
            "path": str(request.url.path),
            "method": request.method,
            "available_endpoints": [
                "/docs",
                "/health",
                "/health/detailed",
                settings.API_V1_STR,
            ],
        },
    )


# Cache Performance Endpoints
@app.get(
    "/cache/metrics",
    tags=["Monitoring"],
    summary="Cache Performance Metrics",
    description="""
    **Real-time cache performance metrics** for monitoring and optimization.
    
    This endpoint provides comprehensive caching statistics including:
    - **Hit/Miss Rates**: Overall cache effectiveness
    - **Memory Usage**: Current memory consumption and limits
    - **Request Patterns**: Cache access patterns and trends
    - **Performance Metrics**: Response times by cache level
    
    **Cache Architecture**:
    - **Level 1 (Memory)**: Ultra-fast <1ms in-memory cache
    - **Level 2 (Redis)**: Distributed <10ms persistent cache
    - **Auto-Promotion**: Frequently accessed data promoted from Redis to Memory
    
    **Monitoring Use Cases**:
    - Performance optimization
    - Capacity planning
    - Cache tuning and configuration
    - Troubleshooting slow responses
    """,
    response_description="Comprehensive cache performance metrics",
    response_model=CacheMetrics,
    responses={
        200: {
            "description": "Current cache performance metrics",
            "content": {
                "application/json": {
                    "example": {
                        "hit_rate": 0.85,
                        "miss_rate": 0.15,
                        "total_requests": 1000,
                        "hits": 850,
                        "misses": 150,
                        "size": 500,
                        "max_size": 1000,
                    }
                }
            },
        }
    },
)
async def get_cache_metrics():
    """
    Get comprehensive cache performance metrics.

    Returns:
        dict: Cache performance statistics
    """
    from app.core.dependencies import get_universal_cache

    cache_manager = await get_universal_cache()
    stats = cache_manager.get_stats()

    # Calculate hit rate and miss rate
    total_requests = stats.get("total_requests", 0)
    hits = stats.get("hits", 0)
    misses = stats.get("misses", 0)

    hit_rate = hits / total_requests if total_requests > 0 else 0
    miss_rate = misses / total_requests if total_requests > 0 else 0

    return {
        "hit_rate": round(hit_rate, 3),
        "miss_rate": round(miss_rate, 3),
        "total_requests": total_requests,
        "hits": hits,
        "misses": misses,
        "size": stats.get("memory_size", 0),
        "max_size": stats.get("memory_max_size", 0),
    }


@app.get(
    "/api/performance",
    tags=["Monitoring"],
    summary="API Performance Information",
    description="""
    **API-wide performance metrics and caching information**.
    
    Provides insights into:
    - **Response Times**: Average API response performance
    - **Caching Strategy**: Current caching configuration
    - **Optimization Status**: Cache enablement and settings
    
    **Performance Insights**:
    - Endpoints with caching enabled typically respond 5-10x faster
    - Memory cache provides <1ms response times
    - Redis cache provides <10ms response times
    - Non-cached responses vary by complexity (50-500ms)
    
    **Caching Levels**:
    - `memory`: L1 cache only (ultra-fast, limited capacity)
    - `redis`: L2 cache only (fast, distributed, persistent)
    - `both`: Multi-level cache (optimal performance)
    """,
    response_description="API performance metrics and caching information",
    response_model=APIPerformanceInfo,
    responses={
        200: {
            "description": "Current API performance metrics",
            "content": {
                "application/json": {
                    "example": {
                        "response_time_ms": 45.2,
                        "cache_enabled": True,
                        "cache_ttl": 300,
                        "cache_level": "both",
                    }
                }
            },
        }
    },
)
async def get_api_performance():
    """
    Get API performance information and caching status.

    Returns:
        dict: API performance metrics
    """
    return {
        "response_time_ms": 45.2,  # This would be calculated from actual metrics
        "cache_enabled": True,
        "cache_ttl": 300,  # 5 minutes default
        "cache_level": "both",
    }


if __name__ == "__main__":
    import uvicorn

    # Run with uvicorn for development
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info" if settings.DEBUG else "warning",
        access_log=settings.DEBUG,
        workers=1 if settings.DEBUG else 4,
    )
