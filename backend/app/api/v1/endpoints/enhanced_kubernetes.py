"""
Enhanced Kubernetes API Endpoints

Provides additional API endpoints for the enhanced Kubernetes monitoring service
that integrates with the Prometheus client and query templates.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional, List
import logging

from app.core.dependencies import get_db, get_async_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.enhanced_kubernetes_service import EnhancedKubernetesMonitoringService
from app.utils.prometheus_client import EnhancedPrometheusClient as PrometheusClient

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/enhanced", tags=["enhanced-kubernetes"])

# Initialize enhanced service
enhanced_k8s_service = EnhancedKubernetesMonitoringService()


@router.get("/health")
async def get_enhanced_service_health(
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Get health status of the enhanced monitoring service.

    Returns:
        Service health information including cache status and Prometheus connectivity
    """
    try:
        health_status = await enhanced_k8s_service.health_check()
        return {
            "status": "healthy" if health_status.get("healthy", False) else "degraded",
            "details": health_status,
            "timestamp": health_status.get("timestamp"),
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "unhealthy", "details": {"error": str(e)}, "timestamp": None}


@router.get("/cache/stats")
async def get_cache_statistics(
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Get cache performance statistics.

    Returns:
        Cache hit/miss rates, size, and performance metrics
    """
    try:
        cache_stats = enhanced_k8s_service.get_cache_stats()
        return {
            "cache_size": cache_stats.get("total_cached_metrics", 0),
            "total_requests": cache_stats.get("total_requests", 0),
            "cache_hits": cache_stats.get("cache_hits", 0),
            "cache_misses": cache_stats.get("cache_misses", 0),
            "hit_rate_percent": cache_stats.get("hit_rate_percent", 0.0),
            "miss_rate_percent": cache_stats.get("miss_rate_percent", 0.0),
            "evictions": cache_stats.get("evictions", 0),
            "last_eviction": cache_stats.get("last_eviction"),
        }
    except Exception as e:
        logger.error(f"Failed to get cache stats: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve cache statistics: {str(e)}"
        )


@router.get("/clusters/{cluster_name}/overview")
async def get_enhanced_cluster_overview(
    cluster_name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get enhanced cluster overview with capacity, utilization, and health information.

    Args:
        cluster_name: Name of the Kubernetes cluster

    Returns:
        Enhanced cluster overview data
    """
    try:
        # Get enhanced overview from service
        overview_data = await enhanced_k8s_service.get_enhanced_cluster_overview(
            cluster_name
        )

        if not overview_data:
            raise HTTPException(
                status_code=404,
                detail=f"Cluster '{cluster_name}' not found or monitoring not available",
            )

        return {
            "cluster_name": cluster_name,
            "capacity": overview_data.get("capacity", {}),
            "utilization": overview_data.get("utilization", {}),
            "health": overview_data.get("health", {}),
            "prometheus_connected": overview_data.get("prometheus_connected", False),
            "last_updated": overview_data.get("last_updated"),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get enhanced cluster overview for {cluster_name}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve cluster overview: {str(e)}"
        )


@router.get("/clusters/{cluster_name}/metrics/detailed")
async def get_detailed_cluster_metrics(
    cluster_name: str,
    metric_types: Optional[List[str]] = Query(
        default=None, description="Specific metric types to retrieve"
    ),
    time_range: Optional[str] = Query(
        default="1h", description="Time range for metrics (e.g., '1h', '6h', '1d')"
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get detailed metrics for a specific cluster using enhanced query templates.

    Args:
        cluster_name: Name of the Kubernetes cluster
        metric_types: Optional list of specific metric types to retrieve
        time_range: Time range for historical metrics

    Returns:
        Detailed cluster metrics data
    """
    try:
        # Get detailed metrics using enhanced service
        metrics_data = await enhanced_k8s_service.get_detailed_cluster_metrics(
            cluster_name, metric_types=metric_types, time_range=time_range
        )

        if not metrics_data:
            raise HTTPException(
                status_code=404,
                detail=f"Metrics not available for cluster '{cluster_name}'",
            )

        return {
            "cluster_name": cluster_name,
            "time_range": time_range,
            "metrics": metrics_data.get("metrics", {}),
            "timestamp": metrics_data.get("timestamp"),
            "data_source": "enhanced_prometheus",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get detailed metrics for {cluster_name}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve detailed metrics: {str(e)}"
        )


@router.get("/prometheus/queries/templates")
async def get_available_query_templates(
    category: Optional[str] = Query(
        default=None, description="Filter templates by category"
    ),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Get available Prometheus query templates.

    Args:
        category: Optional category filter (e.g., 'node', 'pod', 'cluster')

    Returns:
        Available query templates with metadata
    """
    try:
        templates = enhanced_k8s_service.get_available_query_templates(
            category=category
        )
        return {
            "templates": templates,
            "total_count": len(templates),
            "categories": list(
                set(t.get("category", "uncategorized") for t in templates)
            ),
        }
    except Exception as e:
        logger.error(f"Failed to get query templates: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve query templates: {str(e)}"
        )


@router.post("/clusters/{cluster_name}/metrics/query")
async def execute_custom_prometheus_query(
    cluster_name: str,
    query_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Execute a custom Prometheus query against a specific cluster.

    Args:
        cluster_name: Name of the Kubernetes cluster
        query_data: Query parameters including PromQL query and options

    Returns:
        Query results with metadata
    """
    try:
        query = query_data.get("query")
        if not query:
            raise HTTPException(status_code=400, detail="Query parameter is required")

        # Execute query using enhanced service
        result = await enhanced_k8s_service.execute_custom_query(
            cluster_name, query, query_data
        )

        return {
            "cluster_name": cluster_name,
            "query": query,
            "result": result.get("data", []),
            "metadata": result.get("metadata", {}),
            "execution_time_ms": result.get("execution_time_ms"),
            "timestamp": result.get("timestamp"),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to execute custom query for {cluster_name}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to execute query: {str(e)}"
        )


@router.get("/clusters/{cluster_name}/recommendations")
async def get_cluster_recommendations(
    cluster_name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get optimization and health recommendations for a cluster.

    Args:
        cluster_name: Name of the Kubernetes cluster

    Returns:
        Recommendations for cluster optimization and health
    """
    try:
        recommendations = await enhanced_k8s_service.get_cluster_recommendations(
            cluster_name
        )

        return {
            "cluster_name": cluster_name,
            "recommendations": recommendations.get("recommendations", []),
            "priority_issues": recommendations.get("priority_issues", []),
            "optimization_opportunities": recommendations.get(
                "optimization_opportunities", []
            ),
            "health_score": recommendations.get("health_score"),
            "last_analyzed": recommendations.get("last_analyzed"),
        }

    except Exception as e:
        logger.error(f"Failed to get recommendations for {cluster_name}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to generate recommendations: {str(e)}"
        )


# WebSocket endpoint for real-time metrics (placeholder for future implementation)
@router.get("/clusters/{cluster_name}/metrics/stream")
async def get_metrics_stream_info(
    cluster_name: str, current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get information about available real-time metrics streams.

    Note: This is a placeholder for future WebSocket implementation.
    """
    return {
        "cluster_name": cluster_name,
        "stream_available": False,
        "message": "Real-time streaming will be available in a future release",
        "supported_protocols": ["WebSocket", "Server-Sent Events"],
        "recommended_polling_interval": "30s",
    }
