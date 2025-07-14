"""
Comprehensive Health Check and Readiness Endpoints

Provides detailed health monitoring for all system components including
database, cache, external services, and performance metrics.
"""

import time
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from enum import Enum

import psutil
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.enhanced_logging import get_logger, LogCategory
from app.core.telemetry import trace_operation
from app.core.cache import get_cache_manager
from app.db.database import get_database_manager
from app.core.config import settings

logger = get_logger(__name__)
router = APIRouter()


class HealthStatus(str, Enum):
    """Health check status values."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


class ComponentHealth(BaseModel):
    """Health status for individual component."""
    name: str
    status: HealthStatus
    response_time_ms: Optional[float] = None
    details: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    last_checked: datetime
    
    class Config:
        use_enum_values = True


class SystemMetrics(BaseModel):
    """System performance metrics."""
    cpu_percent: float
    memory_percent: float
    memory_available_mb: float
    disk_usage_percent: float
    disk_free_gb: float
    uptime_seconds: float
    process_count: int
    open_file_descriptors: int


class HealthCheckResponse(BaseModel):
    """Comprehensive health check response."""
    status: HealthStatus
    timestamp: datetime
    version: str
    environment: str
    uptime_seconds: float
    components: List[ComponentHealth]
    system_metrics: SystemMetrics
    summary: Dict[str, Any]
    
    class Config:
        use_enum_values = True


class ReadinessResponse(BaseModel):
    """Readiness check response."""
    ready: bool
    timestamp: datetime
    version: str
    critical_components: List[ComponentHealth]
    message: str
    
    class Config:
        use_enum_values = True


class HealthChecker:
    """Comprehensive health checking service."""
    
    def __init__(self):
        self.start_time = time.time()
        self.cache_manager = None
        self.db_manager = None
        self.last_health_check = None
        self.cached_health_result = None
        self.cache_duration = 30  # Cache health results for 30 seconds
    
    async def get_system_metrics(self) -> SystemMetrics:
        """Get current system performance metrics."""
        with trace_operation("get_system_metrics"):
            try:
                # CPU metrics
                cpu_percent = psutil.cpu_percent(interval=0.1)
                
                # Memory metrics
                memory = psutil.virtual_memory()
                memory_percent = memory.percent
                memory_available_mb = memory.available / (1024 * 1024)
                
                # Disk metrics
                disk = psutil.disk_usage('/')
                disk_usage_percent = (disk.used / disk.total) * 100
                disk_free_gb = disk.free / (1024 * 1024 * 1024)
                
                # Process metrics
                process = psutil.Process()
                uptime_seconds = time.time() - self.start_time
                
                # File descriptor count (Unix only)
                try:
                    open_fds = process.num_fds()
                except (AttributeError, NotImplementedError):
                    open_fds = 0
                
                return SystemMetrics(
                    cpu_percent=round(cpu_percent, 2),
                    memory_percent=round(memory_percent, 2),
                    memory_available_mb=round(memory_available_mb, 2),
                    disk_usage_percent=round(disk_usage_percent, 2),
                    disk_free_gb=round(disk_free_gb, 2),
                    uptime_seconds=round(uptime_seconds, 2),
                    process_count=len(psutil.pids()),
                    open_file_descriptors=open_fds,
                )
                
            except Exception as e:
                logger.error(f"Failed to get system metrics: {e}", category=LogCategory.MONITORING)
                # Return default metrics on error
                return SystemMetrics(
                    cpu_percent=0.0,
                    memory_percent=0.0,
                    memory_available_mb=0.0,
                    disk_usage_percent=0.0,
                    disk_free_gb=0.0,
                    uptime_seconds=time.time() - self.start_time,
                    process_count=0,
                    open_file_descriptors=0,
                )
    
    async def check_database_health(self) -> ComponentHealth:
        """Check database connectivity and performance."""
        start_time = time.time()
        component_name = "database"
        
        try:
            with trace_operation("check_database_health"):
                if not self.db_manager:
                    self.db_manager = get_database_manager()
                
                # Test database connection
                await self.db_manager.test_connection()
                
                # Get connection pool status
                pool_status = await self.db_manager.get_connection_pool_status()
                
                response_time = (time.time() - start_time) * 1000
                
                # Determine health status
                if response_time > 5000:  # 5 seconds
                    status = HealthStatus.UNHEALTHY
                elif response_time > 1000:  # 1 second
                    status = HealthStatus.DEGRADED
                else:
                    status = HealthStatus.HEALTHY
                
                return ComponentHealth(
                    name=component_name,
                    status=status,
                    response_time_ms=round(response_time, 2),
                    details=pool_status,
                    last_checked=datetime.utcnow(),
                )
                
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            logger.error(f"Database health check failed: {e}", category=LogCategory.DATABASE_CONNECTION)
            
            return ComponentHealth(
                name=component_name,
                status=HealthStatus.UNHEALTHY,
                response_time_ms=round(response_time, 2),
                error=str(e),
                last_checked=datetime.utcnow(),
            )
    
    async def check_cache_health(self) -> ComponentHealth:
        """Check cache system health."""
        start_time = time.time()
        component_name = "cache"
        
        try:
            with trace_operation("check_cache_health"):
                if not self.cache_manager:
                    self.cache_manager = get_cache_manager()
                
                # Test cache operations
                test_key = "health_check"
                test_value = f"test_{int(time.time())}"
                
                # Test set operation
                await self.cache_manager.set(test_key, test_value, ttl=60)
                
                # Test get operation
                retrieved_value = await self.cache_manager.get(test_key)
                
                # Test delete operation
                await self.cache_manager.delete(test_key)
                
                response_time = (time.time() - start_time) * 1000
                
                # Verify cache operations worked
                if retrieved_value != test_value:
                    raise Exception("Cache data integrity test failed")
                
                # Get cache statistics
                cache_stats = await self.cache_manager.get_cache_stats()
                
                # Determine health status
                if response_time > 1000:  # 1 second
                    status = HealthStatus.DEGRADED
                else:
                    status = HealthStatus.HEALTHY
                
                return ComponentHealth(
                    name=component_name,
                    status=status,
                    response_time_ms=round(response_time, 2),
                    details=cache_stats,
                    last_checked=datetime.utcnow(),
                )
                
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            logger.error(f"Cache health check failed: {e}", category=LogCategory.CACHE_OPERATION)
            
            return ComponentHealth(
                name=component_name,
                status=HealthStatus.UNHEALTHY,
                response_time_ms=round(response_time, 2),
                error=str(e),
                last_checked=datetime.utcnow(),
            )
    
    async def check_external_service_health(self, service_name: str, url: str, timeout: float = 5.0) -> ComponentHealth:
        """Check external service health."""
        start_time = time.time()
        
        try:
            with trace_operation(f"check_external_service_{service_name}"):
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.get(url)
                    
                response_time = (time.time() - start_time) * 1000
                
                # Determine health status
                if response.status_code >= 500:
                    status = HealthStatus.UNHEALTHY
                elif response.status_code >= 400:
                    status = HealthStatus.DEGRADED
                elif response_time > 2000:  # 2 seconds
                    status = HealthStatus.DEGRADED
                else:
                    status = HealthStatus.HEALTHY
                
                return ComponentHealth(
                    name=service_name,
                    status=status,
                    response_time_ms=round(response_time, 2),
                    details={
                        "status_code": response.status_code,
                        "url": url,
                    },
                    last_checked=datetime.utcnow(),
                )
                
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            logger.error(f"{service_name} health check failed: {e}", category=LogCategory.EXTERNAL_API)
            
            return ComponentHealth(
                name=service_name,
                status=HealthStatus.UNHEALTHY,
                response_time_ms=round(response_time, 2),
                error=str(e),
                last_checked=datetime.utcnow(),
            )
    
    async def check_github_api_health(self) -> ComponentHealth:
        """Check GitHub API connectivity and rate limits."""
        start_time = time.time()
        component_name = "github_api"
        
        try:
            with trace_operation("check_github_api_health"):
                github_token = getattr(settings, 'github_token', None)
                
                if not github_token:
                    return ComponentHealth(
                        name=component_name,
                        status=HealthStatus.UNKNOWN,
                        error="GitHub token not configured",
                        last_checked=datetime.utcnow(),
                    )
                
                headers = {"Authorization": f"token {github_token}"}
                
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get("https://api.github.com/rate_limit", headers=headers)
                    
                response_time = (time.time() - start_time) * 1000
                
                if response.status_code != 200:
                    raise Exception(f"GitHub API returned status {response.status_code}")
                
                rate_limit_data = response.json()
                core_limit = rate_limit_data.get("rate", {})
                remaining = core_limit.get("remaining", 0)
                limit = core_limit.get("limit", 5000)
                
                # Determine health status based on rate limit
                if remaining < limit * 0.1:  # Less than 10% remaining
                    status = HealthStatus.DEGRADED
                elif remaining == 0:
                    status = HealthStatus.UNHEALTHY
                else:
                    status = HealthStatus.HEALTHY
                
                return ComponentHealth(
                    name=component_name,
                    status=status,
                    response_time_ms=round(response_time, 2),
                    details={
                        "rate_limit_remaining": remaining,
                        "rate_limit_total": limit,
                        "rate_limit_reset": core_limit.get("reset"),
                    },
                    last_checked=datetime.utcnow(),
                )
                
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            logger.error(f"GitHub API health check failed: {e}", category=LogCategory.GITHUB_INTEGRATION)
            
            return ComponentHealth(
                name=component_name,
                status=HealthStatus.UNHEALTHY,
                response_time_ms=round(response_time, 2),
                error=str(e),
                last_checked=datetime.utcnow(),
            )
    
    async def perform_comprehensive_health_check(self) -> HealthCheckResponse:
        """Perform comprehensive health check of all components."""
        # Check if we have a recent cached result
        if (self.last_health_check and 
            datetime.utcnow() - self.last_health_check < timedelta(seconds=self.cache_duration) and
            self.cached_health_result):
            return self.cached_health_result
        
        start_time = time.time()
        
        with trace_operation("comprehensive_health_check"):
            # Run all health checks concurrently
            health_checks = await asyncio.gather(
                self.check_database_health(),
                self.check_cache_health(),
                self.check_github_api_health(),
                self.get_system_metrics(),
                return_exceptions=True
            )
            
            # Extract results
            components = []
            system_metrics = None
            
            for result in health_checks:
                if isinstance(result, ComponentHealth):
                    components.append(result)
                elif isinstance(result, SystemMetrics):
                    system_metrics = result
                elif isinstance(result, Exception):
                    logger.error(f"Health check failed: {result}", category=LogCategory.MONITORING)
            
            # If system metrics failed, create default
            if not system_metrics:
                system_metrics = SystemMetrics(
                    cpu_percent=0.0, memory_percent=0.0, memory_available_mb=0.0,
                    disk_usage_percent=0.0, disk_free_gb=0.0,
                    uptime_seconds=time.time() - self.start_time,
                    process_count=0, open_file_descriptors=0
                )
            
            # Determine overall health status
            component_statuses = [comp.status for comp in components]
            
            if HealthStatus.UNHEALTHY in component_statuses:
                overall_status = HealthStatus.UNHEALTHY
            elif HealthStatus.DEGRADED in component_statuses:
                overall_status = HealthStatus.DEGRADED
            else:
                overall_status = HealthStatus.HEALTHY
            
            # Create summary
            summary = {
                "total_components": len(components),
                "healthy_components": len([c for c in components if c.status == HealthStatus.HEALTHY]),
                "degraded_components": len([c for c in components if c.status == HealthStatus.DEGRADED]),
                "unhealthy_components": len([c for c in components if c.status == HealthStatus.UNHEALTHY]),
                "check_duration_ms": round((time.time() - start_time) * 1000, 2),
            }
            
            result = HealthCheckResponse(
                status=overall_status,
                timestamp=datetime.utcnow(),
                version=getattr(settings, 'version', '1.0.0'),
                environment=getattr(settings, 'environment', 'development'),
                uptime_seconds=round(time.time() - self.start_time, 2),
                components=components,
                system_metrics=system_metrics,
                summary=summary,
            )
            
            # Cache the result
            self.last_health_check = datetime.utcnow()
            self.cached_health_result = result
            
            logger.info(
                f"Health check completed",
                category=LogCategory.MONITORING,
                status=overall_status.value,
                duration=summary["check_duration_ms"],
                healthy_components=summary["healthy_components"],
                total_components=summary["total_components"],
            )
            
            return result
    
    async def check_readiness(self) -> ReadinessResponse:
        """Check if service is ready to handle requests."""
        with trace_operation("readiness_check"):
            # Critical components that must be healthy for readiness
            critical_checks = await asyncio.gather(
                self.check_database_health(),
                self.check_cache_health(),
                return_exceptions=True
            )
            
            critical_components = []
            for result in critical_checks:
                if isinstance(result, ComponentHealth):
                    critical_components.append(result)
                elif isinstance(result, Exception):
                    logger.error(f"Critical readiness check failed: {result}", category=LogCategory.MONITORING)
                    critical_components.append(ComponentHealth(
                        name="unknown",
                        status=HealthStatus.UNHEALTHY,
                        error=str(result),
                        last_checked=datetime.utcnow(),
                    ))
            
            # Service is ready if all critical components are healthy
            critical_statuses = [comp.status for comp in critical_components]
            ready = HealthStatus.UNHEALTHY not in critical_statuses
            
            if ready:
                message = "Service is ready to handle requests"
            else:
                unhealthy_components = [comp.name for comp in critical_components if comp.status == HealthStatus.UNHEALTHY]
                message = f"Service not ready. Unhealthy components: {', '.join(unhealthy_components)}"
            
            return ReadinessResponse(
                ready=ready,
                timestamp=datetime.utcnow(),
                version=getattr(settings, 'version', '1.0.0'),
                critical_components=critical_components,
                message=message,
            )


# Global health checker instance
health_checker = HealthChecker()


@router.get("/health", response_model=HealthCheckResponse, tags=["Health"])
async def get_health_status():
    """
    Comprehensive health check endpoint.
    
    Returns detailed health information for all system components including:
    - Database connectivity and performance
    - Cache system health
    - External service dependencies
    - System resource utilization
    - Performance metrics
    """
    try:
        return await health_checker.perform_comprehensive_health_check()
    except Exception as e:
        logger.error(f"Health check endpoint failed: {e}", category=LogCategory.MONITORING)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Health check service temporarily unavailable"
        )


@router.get("/health/readiness", response_model=ReadinessResponse, tags=["Health"])
async def get_readiness_status():
    """
    Readiness check endpoint for Kubernetes and load balancers.
    
    Returns readiness status based on critical components only.
    Use this endpoint for load balancer health checks.
    """
    try:
        readiness = await health_checker.check_readiness()
        
        # Return appropriate HTTP status code
        if not readiness.ready:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=readiness.dict()
            )
        
        return readiness
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Readiness check failed: {e}", category=LogCategory.MONITORING)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Readiness check service temporarily unavailable"
        )


@router.get("/health/liveness", tags=["Health"])
async def get_liveness_status():
    """
    Liveness check endpoint for Kubernetes.
    
    Simple endpoint that returns 200 if the service is running.
    Use this endpoint for Kubernetes liveness probes.
    """
    return {
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": round(time.time() - health_checker.start_time, 2),
    }


@router.get("/health/startup", tags=["Health"])
async def get_startup_status():
    """
    Startup check endpoint for Kubernetes.
    
    Checks if the service has completed initialization.
    Use this endpoint for Kubernetes startup probes.
    """
    # Check if critical components are available
    try:
        readiness = await health_checker.check_readiness()
        
        if readiness.ready:
            return {
                "status": "started",
                "timestamp": datetime.utcnow().isoformat(),
                "message": "Service startup completed successfully",
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "status": "starting",
                    "timestamp": datetime.utcnow().isoformat(),
                    "message": "Service still starting up",
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Startup check failed: {e}", category=LogCategory.MONITORING)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Startup check service temporarily unavailable"
        )