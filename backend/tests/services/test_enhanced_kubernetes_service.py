"""
Tests for Enhanced Kubernetes Monitoring Service

Comprehensive test suite covering the enhanced Kubernetes monitoring service,
including Prometheus integration, caching, query templates, and data transformation.
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime, timedelta
from typing import Dict, Any, List
import json

from app.services.enhanced_kubernetes_service import EnhancedKubernetesMonitoringService

try:
    from app.utils.prometheus_client import (
        PrometheusClient,
        PrometheusMetric,
        PrometheusQueryResult,
    )
except ImportError as e:
    pytest.skip(f"PrometheusClient import failed: {e}", allow_module_level=True)

from app.utils.prometheus_queries import KubernetesQueryTemplates


class TestEnhancedKubernetesMonitoringService:
    """Test suite for EnhancedKubernetesMonitoringService."""

    @pytest.fixture
    async def service(self):
        """Create service instance for testing."""
        return EnhancedKubernetesMonitoringService()

    @pytest.fixture
    def mock_prometheus_client(self):
        """Create mock Prometheus client."""
        client = Mock(spec=PrometheusClient)
        client.query_instant = AsyncMock()
        client.query_range = AsyncMock()
        client.is_healthy = AsyncMock(return_value=True)
        client.get_connection_info = Mock()
        return client

    @pytest.fixture
    def sample_metrics_data(self):
        """Sample metrics data for testing."""
        return {
            "cpu_usage": [
                PrometheusMetric(
                    metric_name="node_cpu_usage",
                    value=75.5,
                    timestamp=datetime.now(),
                    labels={"node": "node-1", "cluster": "test-cluster"},
                )
            ],
            "memory_usage": [
                PrometheusMetric(
                    metric_name="node_memory_usage",
                    value=60.2,
                    timestamp=datetime.now(),
                    labels={"node": "node-1", "cluster": "test-cluster"},
                )
            ],
        }

    @pytest.fixture
    def sample_cache_stats(self):
        """Sample cache statistics for testing."""
        return {
            "total_cached_metrics": 150,
            "total_requests": 1000,
            "cache_hits": 750,
            "cache_misses": 250,
            "hit_rate_percent": 75.0,
            "miss_rate_percent": 25.0,
            "evictions": 5,
            "last_eviction": "2024-01-15T10:30:00Z",
        }

    @pytest.mark.asyncio
    async def test_service_initialization(self, service):
        """Test service initialization."""
        assert service is not None
        assert hasattr(service, "cache_levels")
        assert hasattr(service, "prometheus_clients")
        assert hasattr(service, "query_builders")
        assert len(service.cache_levels) == 4  # Four cache levels

    @pytest.mark.asyncio
    async def test_cache_levels_configuration(self, service):
        """Test cache levels are configured correctly."""
        expected_ttls = [30, 300, 1800, 7200]  # 30s, 5m, 30m, 2h
        actual_ttls = [level["ttl"] for level in service.cache_levels.values()]
        assert sorted(actual_ttls) == sorted(expected_ttls)

    @pytest.mark.asyncio
    async def test_get_prometheus_client(self, service):
        """Test getting Prometheus client for cluster."""
        cluster_name = "test-cluster"

        # Mock cluster configuration
        mock_cluster_config = {
            "prometheus_endpoint": "http://prometheus.test.com:9090",
            "authentication": {"type": "basic", "username": "user", "password": "pass"},
        }

        with patch.object(
            service, "_get_cluster_config", return_value=mock_cluster_config
        ):
            client = await service.get_prometheus_client(cluster_name)
            assert client is not None
            assert cluster_name in service.prometheus_clients

    @pytest.mark.asyncio
    async def test_health_check_healthy(self, service, mock_prometheus_client):
        """Test health check when service is healthy."""
        service.prometheus_clients["test-cluster"] = mock_prometheus_client

        health_status = await service.health_check()

        assert health_status["healthy"] is True
        assert "prometheus_connections" in health_status
        assert "cache_status" in health_status
        assert "timestamp" in health_status

    @pytest.mark.asyncio
    async def test_health_check_unhealthy(self, service):
        """Test health check when service is unhealthy."""
        # No Prometheus clients configured
        health_status = await service.health_check()

        assert health_status["healthy"] is False
        assert "error" in health_status

    def test_get_cache_stats(self, service, sample_cache_stats):
        """Test getting cache statistics."""
        # Mock cache data
        service._cache_stats = sample_cache_stats

        stats = service.get_cache_stats()

        assert stats["total_cached_metrics"] == 150
        assert stats["hit_rate_percent"] == 75.0
        assert stats["cache_hits"] == 750
        assert stats["cache_misses"] == 250

    @pytest.mark.asyncio
    async def test_get_enhanced_cluster_overview(
        self, service, mock_prometheus_client, sample_metrics_data
    ):
        """Test getting enhanced cluster overview."""
        cluster_name = "test-cluster"
        service.prometheus_clients[cluster_name] = mock_prometheus_client

        # Mock query results
        mock_prometheus_client.query_instant.return_value = PrometheusQueryResult(
            data=sample_metrics_data["cpu_usage"], metadata={"query_time": 0.1}
        )

        with patch.object(service, "_transform_cluster_overview") as mock_transform:
            mock_transform.return_value = {
                "capacity": {"cpu_cores": 16, "memory_bytes": 64_000_000_000},
                "utilization": {"cpu_percent": 75.5, "memory_percent": 60.2},
                "health": {"nodes_ready": True, "api_server_healthy": True},
                "prometheus_connected": True,
                "last_updated": datetime.now().isoformat(),
            }

            overview = await service.get_enhanced_cluster_overview(cluster_name)

            assert overview is not None
            assert "capacity" in overview
            assert "utilization" in overview
            assert "health" in overview
            assert overview["prometheus_connected"] is True

    @pytest.mark.asyncio
    async def test_get_detailed_cluster_metrics(self, service, mock_prometheus_client):
        """Test getting detailed cluster metrics."""
        cluster_name = "test-cluster"
        service.prometheus_clients[cluster_name] = mock_prometheus_client

        # Mock concurrent queries
        mock_results = {
            "cpu_metrics": [PrometheusMetric("cpu", 75.0, datetime.now(), {})],
            "memory_metrics": [PrometheusMetric("memory", 60.0, datetime.now(), {})],
        }

        with patch.object(
            service, "_execute_concurrent_queries", return_value=mock_results
        ):
            metrics = await service.get_detailed_cluster_metrics(
                cluster_name, metric_types=["cpu", "memory"], time_range="1h"
            )

            assert metrics is not None
            assert "metrics" in metrics
            assert "timestamp" in metrics

    @pytest.mark.asyncio
    async def test_execute_concurrent_queries(self, service, mock_prometheus_client):
        """Test concurrent query execution."""
        queries = {"cpu_usage": "up", "memory_usage": "up", "disk_usage": "up"}

        # Mock query results
        mock_prometheus_client.query_instant.return_value = PrometheusQueryResult(
            data=[PrometheusMetric("test", 1.0, datetime.now(), {})],
            metadata={"query_time": 0.1},
        )

        results = await service._execute_concurrent_queries(
            mock_prometheus_client, queries
        )

        assert len(results) == 3
        assert "cpu_usage" in results
        assert "memory_usage" in results
        assert "disk_usage" in results

    def test_cache_metric(self, service):
        """Test caching a metric."""
        cache_key = "test_cluster:cpu_usage"
        metric_data = {"value": 75.5, "timestamp": datetime.now().isoformat()}
        cache_level = "short"

        service._cache_metric(cache_key, metric_data, cache_level)

        # Verify metric was cached
        cached_data = service._get_cached_metric(cache_key, cache_level)
        assert cached_data is not None
        assert cached_data["value"] == 75.5

    def test_get_cached_metric_hit(self, service):
        """Test cache hit scenario."""
        cache_key = "test_cluster:memory_usage"
        metric_data = {"value": 60.2, "timestamp": datetime.now().isoformat()}
        cache_level = "medium"

        # Cache the metric
        service._cache_metric(cache_key, metric_data, cache_level)

        # Retrieve from cache
        cached_data = service._get_cached_metric(cache_key, cache_level)

        assert cached_data is not None
        assert cached_data["value"] == 60.2

    def test_get_cached_metric_miss(self, service):
        """Test cache miss scenario."""
        cache_key = "nonexistent_key"
        cache_level = "short"

        cached_data = service._get_cached_metric(cache_key, cache_level)

        assert cached_data is None

    def test_cache_expiration(self, service):
        """Test cache expiration functionality."""
        cache_key = "expiring_metric"
        metric_data = {"value": 45.0, "timestamp": datetime.now().isoformat()}
        cache_level = "short"  # 30 seconds TTL

        # Cache the metric
        service._cache_metric(cache_key, metric_data, cache_level)

        # Manually expire the metric
        cached_metric = service.cache_levels[cache_level]["cache"].get(cache_key)
        if cached_metric:
            cached_metric.expires_at = datetime.now() - timedelta(seconds=1)

        # Try to retrieve expired metric
        cached_data = service._get_cached_metric(cache_key, cache_level)

        assert cached_data is None  # Should be None due to expiration

    def test_metric_transformation(self, service):
        """Test metric data transformation."""
        raw_metrics = [
            PrometheusMetric("cpu_usage", 0.755, datetime.now(), {"node": "node-1"}),
            PrometheusMetric("memory_usage", 0.602, datetime.now(), {"node": "node-1"}),
        ]

        transformed = service._transform_metrics(raw_metrics)

        assert len(transformed) == 2
        assert transformed[0]["value"] == 75.5  # 0.755 * 100
        assert transformed[1]["value"] == 60.2  # 0.602 * 100

    def test_query_template_integration(self, service):
        """Test integration with query templates."""
        templates = service.get_available_query_templates()

        assert len(templates) > 0
        assert any(t["category"] == "node" for t in templates)
        assert any(t["category"] == "pod" for t in templates)
        assert any(t["category"] == "cluster" for t in templates)

    def test_query_template_filtering(self, service):
        """Test filtering query templates by category."""
        node_templates = service.get_available_query_templates(category="node")

        assert len(node_templates) > 0
        assert all(t["category"] == "node" for t in node_templates)

    @pytest.mark.asyncio
    async def test_execute_custom_query(self, service, mock_prometheus_client):
        """Test executing custom Prometheus query."""
        cluster_name = "test-cluster"
        service.prometheus_clients[cluster_name] = mock_prometheus_client

        query = 'up{job="kubernetes-nodes"}'
        query_data = {"query": query, "time_range": "1h"}

        # Mock query result
        mock_prometheus_client.query_instant.return_value = PrometheusQueryResult(
            data=[
                PrometheusMetric("up", 1.0, datetime.now(), {"job": "kubernetes-nodes"})
            ],
            metadata={"query_time": 0.15},
        )

        result = await service.execute_custom_query(cluster_name, query, query_data)

        assert result is not None
        assert "data" in result
        assert "metadata" in result
        assert "execution_time_ms" in result

    @pytest.mark.asyncio
    async def test_get_cluster_recommendations(self, service, mock_prometheus_client):
        """Test getting cluster recommendations."""
        cluster_name = "test-cluster"
        service.prometheus_clients[cluster_name] = mock_prometheus_client

        # Mock metrics for analysis
        mock_metrics = {
            "cpu_utilization": 85.0,  # High CPU
            "memory_utilization": 45.0,  # Normal memory
            "node_count": 3,
            "pod_count": 50,
        }

        with patch.object(
            service, "_analyze_cluster_metrics", return_value=mock_metrics
        ):
            recommendations = await service.get_cluster_recommendations(cluster_name)

            assert recommendations is not None
            assert "recommendations" in recommendations
            assert "health_score" in recommendations
            assert "last_analyzed" in recommendations

    def test_error_handling_missing_cluster(self, service):
        """Test error handling for missing cluster configuration."""
        with pytest.raises(Exception):
            asyncio.run(service.get_enhanced_cluster_overview("nonexistent-cluster"))

    def test_error_handling_prometheus_connection_failure(self, service):
        """Test error handling for Prometheus connection failures."""
        mock_client = Mock(spec=PrometheusClient)
        mock_client.query_instant = AsyncMock(
            side_effect=Exception("Connection failed")
        )

        service.prometheus_clients["failing-cluster"] = mock_client

        with pytest.raises(Exception):
            asyncio.run(service.get_enhanced_cluster_overview("failing-cluster"))

    def test_cache_performance_tracking(self, service):
        """Test cache performance tracking."""
        # Simulate cache hits and misses
        service._update_cache_stats("hit")
        service._update_cache_stats("hit")
        service._update_cache_stats("miss")

        stats = service.get_cache_stats()

        assert stats["cache_hits"] >= 2
        assert stats["cache_misses"] >= 1
        assert stats["hit_rate_percent"] > 0

    @pytest.mark.asyncio
    async def test_cleanup_expired_cache_entries(self, service):
        """Test cleanup of expired cache entries."""
        # Add expired entries to cache
        expired_metric = service.CachedMetric(
            data={"value": 1.0},
            expires_at=datetime.now() - timedelta(seconds=1),
            created_at=datetime.now() - timedelta(minutes=1),
        )

        service.cache_levels["short"]["cache"]["expired_key"] = expired_metric

        # Run cleanup
        service._cleanup_expired_cache()

        # Verify expired entry was removed
        assert "expired_key" not in service.cache_levels["short"]["cache"]

    def test_connection_pooling_configuration(self, service):
        """Test connection pooling configuration."""
        # This would test the connection pool settings if implemented
        # For now, verify the service can handle multiple concurrent requests
        assert hasattr(service, "prometheus_clients")
        assert isinstance(service.prometheus_clients, dict)


class TestPrometheusClientIntegration:
    """Integration tests for Prometheus client with enhanced service."""

    @pytest.fixture
    def mock_responses(self):
        """Mock HTTP responses from Prometheus."""
        return {
            "query_response": {
                "status": "success",
                "data": {
                    "resultType": "vector",
                    "result": [
                        {
                            "metric": {"__name__": "up", "job": "kubernetes-nodes"},
                            "value": [1609459200, "1"],
                        }
                    ],
                },
            }
        }

    @pytest.mark.asyncio
    async def test_prometheus_client_creation(self):
        """Test creating Prometheus client with different configurations."""
        from app.utils.prometheus_client import create_prometheus_client

        config = {
            "endpoint": "http://prometheus.example.com:9090",
            "authentication": {"type": "basic", "username": "user", "password": "pass"},
            "timeout": 30,
            "max_retries": 3,
        }

        client = await create_prometheus_client(config)

        assert client is not None
        assert client.endpoint == "http://prometheus.example.com:9090"

    @pytest.mark.asyncio
    async def test_query_builder_integration(self):
        """Test integration with query builder."""
        from app.utils.prometheus_queries import create_query_builder

        cluster_name = "test-cluster"
        builder = create_query_builder(cluster_name)

        # Test building different types of queries
        cpu_query = builder.node_cpu_usage()
        memory_query = builder.node_memory_usage()

        assert cluster_name in cpu_query
        assert cluster_name in memory_query
        assert "cpu" in cpu_query.lower()
        assert "memory" in memory_query.lower()


if __name__ == "__main__":
    pytest.main([__file__])
