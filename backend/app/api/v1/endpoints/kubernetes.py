"""
Kubernetes cluster monitoring API endpoints.
Provides cluster health monitoring, metrics retrieval, and status management.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any

from app.core.auth import get_current_user
from app.core.dependencies import get_db, get_async_db
from app.models.user import User
from app.models.cluster import Cluster, ClusterStatus
from app.schemas.cluster import (
    ClusterResponse,
    ClusterHealth,
    ClusterStats,
    ClusterMetricsUpdate,
    KubernetesMetrics,
)
from app.services.cluster_service import ClusterService
from app.services.kubernetes_service import monitoring_service

router = APIRouter()


@router.get("/status", response_model=Dict[str, Any])
async def get_kubernetes_status():
    """
    Get overall Kubernetes monitoring service status.

    Returns:
        Dict[str, Any]: Service status and health information
    """
    return {
        "service": "kubernetes_monitoring",
        "status": "active",
        "prometheus_url": monitoring_service.prometheus_url,
        "kubernetes_config": monitoring_service.k8s_core_api is not None,
        "message": "Kubernetes monitoring service is operational",
    }


@router.get("/clusters", response_model=List[ClusterResponse])
async def get_clusters(
    project_id: int = Query(..., description="Project ID to filter clusters"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(
        100, ge=1, le=1000, description="Maximum number of records to return"
    ),
    status: Optional[ClusterStatus] = Query(
        None, description="Filter by cluster status"
    ),
    provider: Optional[str] = Query(None, description="Filter by cloud provider"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get clusters for a project with optional filtering.

    Args:
        project_id (int): Project ID to filter clusters
        skip (int): Number of records to skip for pagination
        limit (int): Maximum number of records to return
        status (Optional[ClusterStatus]): Filter by cluster status
        provider (Optional[str]): Filter by cloud provider
        is_active (Optional[bool]): Filter by active status
        db (Session): Database session
        current_user (User): Current authenticated user

    Returns:
        List[ClusterResponse]: List of clusters matching the criteria
    """
    try:
        clusters = await ClusterService.get_clusters_by_project(
            db=db,
            project_id=project_id,
            user_id=current_user.id,
            skip=skip,
            limit=limit,
            is_active=is_active,
            status=status,
            provider=provider,
        )

        return [ClusterResponse(**cluster.to_dict()) for cluster in clusters]

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error retrieving clusters: {str(e)}"
        )


@router.get("/clusters/{cluster_id}", response_model=ClusterResponse)
async def get_cluster(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed information for a specific cluster.

    Args:
        cluster_id (int): Cluster ID to retrieve
        db (Session): Database session
        current_user (User): Current authenticated user

    Returns:
        ClusterResponse: Detailed cluster information
    """
    cluster = await ClusterService.get_cluster_by_id(db, cluster_id, current_user.id)
    if not cluster:
        raise HTTPException(
            status_code=404, detail="Cluster not found or access denied"
        )

    return ClusterResponse(**cluster.to_dict())


@router.get("/clusters/{cluster_id}/health", response_model=ClusterHealth)
async def get_cluster_health(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get health information for a specific cluster.

    Args:
        cluster_id (int): Cluster ID to retrieve health for
        db (Session): Database session
        current_user (User): Current authenticated user

    Returns:
        ClusterHealth: Cluster health information
    """
    health = await ClusterService.get_cluster_health(db, cluster_id, current_user.id)
    if not health:
        raise HTTPException(
            status_code=404, detail="Cluster not found or access denied"
        )

    return health


@router.post("/clusters/{cluster_id}/sync")
async def sync_cluster_metrics(
    cluster_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Manually trigger cluster metrics synchronization from Prometheus.

    Args:
        cluster_id (int): Cluster ID to sync metrics for
        background_tasks (BackgroundTasks): FastAPI background tasks
        db (Session): Database session
        current_user (User): Current authenticated user

    Returns:
        Dict[str, Any]: Sync operation status
    """
    # Verify cluster exists and user has access
    cluster = await ClusterService.get_cluster_by_id(db, cluster_id, current_user.id)
    if not cluster:
        raise HTTPException(
            status_code=404, detail="Cluster not found or access denied"
        )

    if not cluster.monitoring_enabled:
        raise HTTPException(
            status_code=400, detail="Monitoring is disabled for this cluster"
        )

    # Add background task to sync metrics
    await background_tasks.add_task(
        monitoring_service.update_cluster_status, db, cluster_id, current_user.id
    )

    return {
        "message": f"Cluster {cluster.name} metrics sync initiated",
        "cluster_id": cluster_id,
        "status": "sync_started",
    }


@router.post("/projects/{project_id}/sync-all")
async def sync_all_cluster_metrics(
    project_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Manually trigger metrics synchronization for all clusters in a project.

    Args:
        project_id (int): Project ID to sync all clusters for
        background_tasks (BackgroundTasks): FastAPI background tasks
        db (Session): Database session
        current_user (User): Current authenticated user

    Returns:
        Dict[str, Any]: Sync operation status
    """
    # Get clusters for the project to verify access and count
    clusters = await ClusterService.get_clusters_by_project(
        db=db, project_id=project_id, user_id=current_user.id, is_active=True
    )

    if not clusters:
        raise HTTPException(
            status_code=404, detail="No active clusters found for this project"
        )

    # Count clusters with monitoring enabled
    monitoring_enabled_count = sum(
        1 for cluster in clusters if cluster.monitoring_enabled
    )

    if monitoring_enabled_count == 0:
        raise HTTPException(
            status_code=400, detail="No clusters have monitoring enabled"
        )

    # Add background task to sync all clusters
    await background_tasks.add_task(
        monitoring_service.monitor_all_clusters, db, project_id, current_user.id
    )

    return {
        "message": f"Metrics sync initiated for {monitoring_enabled_count} clusters",
        "project_id": project_id,
        "total_clusters": len(clusters),
        "monitoring_enabled": monitoring_enabled_count,
        "status": "sync_started",
    }


@router.get("/projects/{project_id}/stats", response_model=ClusterStats)
async def get_project_cluster_stats(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get aggregated cluster statistics for a project.

    Args:
        project_id (int): Project ID to get stats for
        db (Session): Database session
        current_user (User): Current authenticated user

    Returns:
        ClusterStats: Aggregated cluster statistics
    """
    stats = await ClusterService.get_cluster_stats(db, project_id, current_user.id)
    if not stats:
        raise HTTPException(
            status_code=404, detail="No cluster data found for this project"
        )

    return stats


@router.get("/clusters/needing-attention", response_model=List[ClusterResponse])
async def get_clusters_needing_attention(
    project_id: int = Query(..., description="Project ID to filter clusters"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get clusters that need attention (unhealthy, high resource usage, etc.).

    Args:
        project_id (int): Project ID to filter clusters
        db (Session): Database session
        current_user (User): Current authenticated user

    Returns:
        List[ClusterResponse]: List of clusters needing attention
    """
    clusters = await ClusterService.get_clusters_needing_attention(
        db=db, project_id=project_id, user_id=current_user.id
    )

    return [ClusterResponse(**cluster.to_dict()) for cluster in clusters]


@router.get("/clusters/{cluster_id}/metrics/live", response_model=KubernetesMetrics)
async def get_live_cluster_metrics(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get live cluster metrics directly from Prometheus (bypasses database cache).

    Args:
        cluster_id (int): Cluster ID to get live metrics for
        db (Session): Database session
        current_user (User): Current authenticated user

    Returns:
        KubernetesMetrics: Live cluster metrics from Prometheus
    """
    # Verify cluster exists and user has access
    cluster = await ClusterService.get_cluster_by_id(db, cluster_id, current_user.id)
    if not cluster:
        raise HTTPException(
            status_code=404, detail="Cluster not found or access denied"
        )

    if not cluster.monitoring_enabled:
        raise HTTPException(
            status_code=400, detail="Monitoring is disabled for this cluster"
        )

    try:
        # Fetch live metrics from Prometheus
        cluster_name = cluster.name

        node_metrics = await monitoring_service.get_cluster_node_metrics(cluster_name)
        pod_metrics = await monitoring_service.get_cluster_pod_metrics(cluster_name)
        resource_metrics = await monitoring_service.get_cluster_resource_metrics(
            cluster_name
        )
        workload_metrics = await monitoring_service.get_cluster_workload_metrics(
            cluster_name
        )

        # Combine metrics into response format
        live_metrics = KubernetesMetrics(
            cluster_id=cluster_id,
            cluster_name=cluster_name,
            timestamp=None,  # Will be set by schema
            node_metrics=node_metrics,
            pod_metrics=pod_metrics,
            resource_metrics=resource_metrics,
            workload_metrics=workload_metrics,
        )

        return live_metrics

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching live metrics: {str(e)}"
        )


@router.get("/prometheus/health")
async def check_prometheus_health():
    """
    Check if Prometheus is accessible and responsive.

    Returns:
        Dict[str, Any]: Prometheus health status
    """
    try:
        # Simple query to test Prometheus connectivity
        result = await monitoring_service.query_prometheus("up")

        if result is not None:
            return {
                "prometheus_url": monitoring_service.prometheus_url,
                "status": "healthy",
                "accessible": True,
                "message": "Prometheus is accessible and responsive",
            }
        else:
            return {
                "prometheus_url": monitoring_service.prometheus_url,
                "status": "unhealthy",
                "accessible": False,
                "message": "Prometheus query failed",
            }

    except Exception as e:
        return {
            "prometheus_url": monitoring_service.prometheus_url,
            "status": "error",
            "accessible": False,
            "message": f"Error connecting to Prometheus: {str(e)}",
        }
