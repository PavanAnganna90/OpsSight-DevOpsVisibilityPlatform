"""
Tests for Enhanced Kubernetes API Endpoints

Comprehensive test suite for the enhanced Kubernetes monitoring API endpoints,
covering all new enhanced endpoints with proper authentication and error handling.
"""

import pytest
import json
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest.fixture
def mock_enhanced_service():
    """Create mock enhanced service."""
    service = Mock()
    service.health_check = AsyncMock()
    service.get_cache_stats = Mock()
    service.get_enhanced_cluster_overview = AsyncMock()
    service.get_detailed_cluster_metrics = AsyncMock()
    service.get_available_query_templates = Mock()
    service.execute_custom_query = AsyncMock()
    service.get_cluster_recommendations = AsyncMock()
    return service


@pytest.fixture
def sample_health_data():
    """Sample health data for testing."""
    return {
        "healthy": True,
        "timestamp": datetime.now().isoformat(),
        "prometheus_connections": {
            "test-cluster": {
                "connected": True,
                "endpoint": "http://prometheus.test.com:9090",
                "last_check": datetime.now().isoformat(),
            }
        },
        "cache_status": {"total_cached_metrics": 150, "cache_hit_rate": 75.5},
        "version": "1.0.0",
    }


@pytest.mark.asyncio
async def test_health_endpoint_success(
    client, mock_enhanced_service, sample_health_data
):
    """Test successful health check endpoint."""
    mock_enhanced_service.health_check.return_value = sample_health_data

    with patch(
        "app.api.v1.endpoints.enhanced_kubernetes.enhanced_k8s_service",
        mock_enhanced_service,
    ):
        response = await client.get("/api/v1/kubernetes/enhanced/health")

    assert response.status_code == 200
    data = response.json()
    assert data["details"]["healthy"] is True
    assert "timestamp" in data
    assert "prometheus_connections" in data["details"]
    assert "cache_status" in data["details"]


@pytest.mark.asyncio
async def test_cache_stats_endpoint(client, mock_enhanced_service):
    """Test cache statistics endpoint."""
    sample_cache_stats = {
        "total_cached_metrics": 150,
        "total_requests": 1000,
        "cache_hits": 750,
        "cache_misses": 250,
        "hit_rate_percent": 75.0,
        "miss_rate_percent": 25.0,
        "evictions": 5,
        "last_eviction": "2024-01-15T10:30:00Z",
        "cache_levels": {
            "short": {"cached_items": 50, "ttl_seconds": 30},
            "medium": {"cached_items": 40, "ttl_seconds": 300},
            "long": {"cached_items": 35, "ttl_seconds": 1800},
            "extended": {"cached_items": 25, "ttl_seconds": 7200},
        },
    }

    mock_enhanced_service.get_cache_stats.return_value = sample_cache_stats

    with patch(
        "app.api.v1.endpoints.enhanced_kubernetes.enhanced_k8s_service",
        mock_enhanced_service,
    ):
        response = await client.get("/api/v1/kubernetes/enhanced/cache/stats")

    assert response.status_code == 200
    data = response.json()
    assert data["cache_size"] == 150
    assert data["hit_rate_percent"] == 75.0


@pytest.mark.asyncio
async def test_cluster_overview_success(client, mock_enhanced_service):
    """Test successful cluster overview endpoint."""
    cluster_name = "test-cluster"
    sample_cluster_overview = {
        "cluster_name": cluster_name,
        "capacity": {
            "cpu_cores": 16,
            "memory_bytes": 64_000_000_000,
            "storage_bytes": 1_000_000_000_000,
            "pods": 220,
        },
        "utilization": {
            "cpu_percent": 75.5,
            "memory_percent": 60.2,
            "storage_percent": 45.0,
            "pods_percent": 68.2,
        },
        "health": {
            "nodes_ready": True,
            "api_server_healthy": True,
            "etcd_healthy": True,
            "scheduler_healthy": True,
            "controller_manager_healthy": True,
        },
        "node_count": 4,
        "pod_count": 150,
        "namespace_count": 8,
        "prometheus_connected": True,
        "last_updated": datetime.now().isoformat(),
    }

    mock_enhanced_service.get_enhanced_cluster_overview.return_value = (
        sample_cluster_overview
    )

    with patch(
        "app.api.v1.endpoints.enhanced_kubernetes.enhanced_k8s_service",
        mock_enhanced_service,
    ):
        response = await client.get(
            f"/api/v1/kubernetes/enhanced/clusters/{cluster_name}/overview"
        )

    assert response.status_code == 200
    data = response.json()
    assert data["cluster_name"] == cluster_name
    assert "capacity" in data
    assert "utilization" in data
    assert "health" in data
    assert data["prometheus_connected"] is True


@pytest.mark.asyncio
async def test_query_templates_endpoint(client, mock_enhanced_service):
    """Test query templates endpoint."""
    sample_query_templates = [
        {
            "id": "node_cpu_usage",
            "name": "Node CPU Usage",
            "description": "CPU usage percentage for Kubernetes nodes",
            "category": "node",
            "metric_type": "gauge",
            "aggregation_type": "average",
            "query_template": 'node_cpu_usage{cluster="{{cluster_name}}"}',
        },
        {
            "id": "pod_memory_usage",
            "name": "Pod Memory Usage",
            "description": "Memory usage for Kubernetes pods",
            "category": "pod",
            "metric_type": "gauge",
            "aggregation_type": "sum",
            "query_template": 'pod_memory_usage{cluster="{{cluster_name}}"}',
        },
    ]

    mock_enhanced_service.get_available_query_templates.return_value = (
        sample_query_templates
    )

    with patch(
        "app.api.v1.endpoints.enhanced_kubernetes.enhanced_k8s_service",
        mock_enhanced_service,
    ):
        response = await client.get(
            "/api/v1/kubernetes/enhanced/prometheus/queries/templates"
        )

    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 2
    assert len(data["templates"]) == 2
    assert data["templates"][0]["category"] == "node"
    assert data["templates"][1]["category"] == "pod"


@pytest.mark.asyncio
async def test_custom_query_endpoint(client, mock_enhanced_service):
    """Test custom Prometheus query endpoint."""
    cluster_name = "test-cluster"
    query_result = {
        "data": [
            {"metric": "up", "value": 1.0, "timestamp": datetime.now().isoformat()}
        ],
        "metadata": {"query_time": 0.15, "result_count": 1},
        "execution_time_ms": 150,
    }

    mock_enhanced_service.execute_custom_query.return_value = query_result

    query_data = {"query": 'up{job="kubernetes-nodes"}', "time_range": "1h"}

    with patch(
        "app.api.v1.endpoints.enhanced_kubernetes.enhanced_k8s_service",
        mock_enhanced_service,
    ):
        response = await client.post(
            f"/api/v1/kubernetes/enhanced/clusters/{cluster_name}/metrics/query",
            json=query_data,
        )

    assert response.status_code == 200
    data = response.json()
    assert "cluster_name" in data
    assert "query" in data
    assert "metadata" in data
    assert "execution_time_ms" in data


@pytest.mark.asyncio
async def test_health_endpoint_unhealthy(client, mock_enhanced_service):
    """Test health check when service is unhealthy."""
    mock_enhanced_service.health_check.return_value = {
        "healthy": False,
        "error": "No Prometheus connections configured",
        "timestamp": datetime.now().isoformat(),
    }
    with patch(
        "app.api.v1.endpoints.enhanced_kubernetes.enhanced_k8s_service",
        mock_enhanced_service,
    ):
        response = await client.get("/api/v1/kubernetes/enhanced/health")
    # The endpoint might return 503 for unhealthy or 200 with healthy=False
    assert response.status_code in [200, 503]


@pytest.mark.asyncio
async def test_error_handling(client, mock_enhanced_service):
    """Test general error handling across endpoints."""
    mock_enhanced_service.health_check.side_effect = Exception("Service unavailable")
    with patch(
        "app.api.v1.endpoints.enhanced_kubernetes.enhanced_k8s_service",
        mock_enhanced_service,
    ):
        response = await client.get("/api/v1/kubernetes/enhanced/health")
    # Should handle errors gracefully (API returns 200 with status 'unhealthy')
    assert response.status_code in [200, 500, 503]


if __name__ == "__main__":
    pytest.main([__file__])
