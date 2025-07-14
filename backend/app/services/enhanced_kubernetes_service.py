"""
Enhanced Kubernetes monitoring service with advanced Prometheus integration.
Provides real-time data transformation, caching, and comprehensive cluster monitoring.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union
import json
import time
from dataclasses import dataclass, asdict
from enum import Enum

import httpx
from kubernetes import client, config
from kubernetes.client.rest import ApiException
from sqlalchemy.orm import Session

from app.models.cluster import Cluster, ClusterStatus, NodeStatus
from app.schemas.cluster import ClusterMetricsUpdate, KubernetesMetrics
from app.services.cluster_service import ClusterService
from app.core.config import settings
from app.utils.prometheus_client import get_prometheus_client, EnhancedPrometheusClient
from app.utils.prometheus_queries import (
    create_query_builder,
    AdvancedQueryBuilder,
    MetricType,
)

# Configure logging
logger = logging.getLogger(__name__)


class CacheLevel(Enum):
    """Cache levels for different types of data."""

    REAL_TIME = "real_time"  # 30 seconds
    SHORT_TERM = "short_term"  # 5 minutes
    MEDIUM_TERM = "medium_term"  # 30 minutes
    LONG_TERM = "long_term"  # 2 hours


@dataclass
class CachedMetric:
    """
    Represents a cached metric with metadata.
    """

    value: Any
    timestamp: float
    cache_level: CacheLevel
    metric_type: MetricType
    cluster_name: str

    def is_expired(self) -> bool:
        """Check if the cached metric has expired."""
        current_time = time.time()
        ttl_map = {
            CacheLevel.REAL_TIME: 30,
            CacheLevel.SHORT_TERM: 300,
            CacheLevel.MEDIUM_TERM: 1800,
            CacheLevel.LONG_TERM: 7200,
        }
        ttl = ttl_map.get(self.cache_level, 300)
        return (current_time - self.timestamp) > ttl


class MetricTransformer:
    """
    Transforms raw Prometheus metrics into structured data for the application.
    """

    @staticmethod
    def transform_node_metrics(
        raw_data: Dict[str, Any], cluster_name: str
    ) -> Dict[str, Any]:
        """
        Transform raw node metrics into structured format.

        Args:
            raw_data (Dict[str, Any]): Raw Prometheus query results
            cluster_name (str): Name of the cluster

        Returns:
            Dict[str, Any]: Transformed node metrics
        """
        transformed = {
            "cluster_name": cluster_name,
            "timestamp": datetime.utcnow().isoformat(),
            "nodes": [],
            "summary": {
                "total_nodes": 0,
                "ready_nodes": 0,
                "not_ready_nodes": 0,
                "avg_cpu_usage": 0.0,
                "avg_memory_usage": 0.0,
                "avg_disk_usage": 0.0,
            },
        }

        # Process node data if available
        if raw_data and "result" in raw_data:
            for result in raw_data["result"]:
                metric = result.get("metric", {})
                value = result.get("value", [0, "0"])

                node_name = metric.get("instance", "unknown")
                node_data = {
                    "name": node_name,
                    "status": "ready" if float(value[1]) > 0 else "not_ready",
                    "labels": metric,
                    "value": float(value[1]),
                    "timestamp": float(value[0]),
                }
                transformed["nodes"].append(node_data)

        # Calculate summary statistics
        if transformed["nodes"]:
            transformed["summary"]["total_nodes"] = len(transformed["nodes"])
            transformed["summary"]["ready_nodes"] = sum(
                1 for node in transformed["nodes"] if node["status"] == "ready"
            )
            transformed["summary"]["not_ready_nodes"] = (
                transformed["summary"]["total_nodes"]
                - transformed["summary"]["ready_nodes"]
            )

        return transformed


class EnhancedKubernetesMonitoringService:
    """
    Enhanced Kubernetes monitoring service with advanced Prometheus integration.

    Features:
    - Enhanced Prometheus client with authentication and connection pooling
    - Advanced PromQL query templates
    - Real-time data transformation and caching
    - Comprehensive cluster monitoring
    - Performance optimization with multi-level caching
    """

    def __init__(self, prometheus_url: str = "http://prometheus:9090"):
        """
        Initialize the enhanced Kubernetes monitoring service.

        Args:
            prometheus_url (str): Prometheus server URL for metrics queries
        """
        self.prometheus_url = prometheus_url.rstrip("/")
        self.prometheus_client: Optional[EnhancedPrometheusClient] = None
        self.query_builders: Dict[str, AdvancedQueryBuilder] = {}
        self.transformer = MetricTransformer()

        # Multi-level cache for different types of metrics
        self.cache: Dict[str, CachedMetric] = {}
        self.cache_stats = {"hits": 0, "misses": 0, "evictions": 0}

        # Kubernetes client configuration
        try:
            # Try to load in-cluster config first, then local config
            try:
                config.load_incluster_config()
                logger.info("Loaded in-cluster Kubernetes configuration")
            except:
                config.load_kube_config()
                logger.info("Loaded local Kubernetes configuration")

            self.k8s_core_api = client.CoreV1Api()
            self.k8s_apps_api = client.AppsV1Api()
            self.k8s_metrics_api = client.CustomObjectsApi()

        except Exception as e:
            logger.warning(f"Failed to load Kubernetes config: {e}")
            self.k8s_core_api = None
            self.k8s_apps_api = None
            self.k8s_metrics_api = None

    async def _initialize_prometheus_client(self):
        """Initialize the enhanced Prometheus client."""
        if not self.prometheus_client:
            self.prometheus_client = await get_prometheus_client()

    def _get_query_builder(self, cluster_name: str) -> AdvancedQueryBuilder:
        """
        Get or create a query builder for the specified cluster.

        Args:
            cluster_name (str): Name of the cluster

        Returns:
            AdvancedQueryBuilder: Query builder for the cluster
        """
        if cluster_name not in self.query_builders:
            self.query_builders[cluster_name] = create_query_builder(cluster_name)
        return self.query_builders[cluster_name]

    def _get_cache_key(
        self, cluster_name: str, metric_type: str, query_name: str
    ) -> str:
        """Generate cache key for metrics."""
        return f"{cluster_name}:{metric_type}:{query_name}"

    def _get_cached_metric(self, cache_key: str) -> Optional[Any]:
        """Get metric from cache if still valid."""
        if cache_key in self.cache:
            cached_metric = self.cache[cache_key]
            if not cached_metric.is_expired():
                self.cache_stats["hits"] += 1
                return cached_metric.value
            else:
                del self.cache[cache_key]
                self.cache_stats["evictions"] += 1

        self.cache_stats["misses"] += 1
        return None

    def _cache_metric(
        self,
        cache_key: str,
        value: Any,
        cache_level: CacheLevel,
        metric_type: MetricType,
        cluster_name: str,
    ):
        """Cache metric with appropriate TTL."""
        cached_metric = CachedMetric(
            value=value,
            timestamp=time.time(),
            cache_level=cache_level,
            metric_type=metric_type,
            cluster_name=cluster_name,
        )
        self.cache[cache_key] = cached_metric

        # Clean expired entries periodically
        if len(self.cache) > 1000:  # Arbitrary limit
            self._cleanup_cache()

    def _cleanup_cache(self):
        """Remove expired entries from cache."""
        expired_keys = [
            key
            for key, cached_metric in self.cache.items()
            if cached_metric.is_expired()
        ]
        for key in expired_keys:
            del self.cache[key]
            self.cache_stats["evictions"] += 1

    async def get_cluster_overview(
        self,
        cluster_name: str,
        use_cache: bool = True,
        cache_level: CacheLevel = CacheLevel.SHORT_TERM,
    ) -> Dict[str, Any]:
        """
        Get comprehensive cluster overview with all metrics.

        Args:
            cluster_name (str): Name of the cluster to monitor
            use_cache (bool): Whether to use cached results
            cache_level (CacheLevel): Cache level for the results

        Returns:
            Dict[str, Any]: Complete cluster overview
        """
        cache_key = self._get_cache_key(cluster_name, "cluster", "overview")

        # Check cache first
        if use_cache:
            cached_result = self._get_cached_metric(cache_key)
            if cached_result:
                return cached_result

        try:
            await self._initialize_prometheus_client()
            query_builder = self._get_query_builder(cluster_name)

            # Get cluster overview queries
            cluster_queries = query_builder.get_cluster_overview_queries()

            # Execute all queries concurrently
            tasks = []
            for query_name, query in cluster_queries.items():
                task = self.prometheus_client.query(query, use_cache=use_cache)
                tasks.append((query_name, task))

            # Wait for all queries to complete
            results = {}
            for query_name, task in tasks:
                try:
                    result = await task
                    if result:
                        results[query_name] = {
                            "resultType": result.resultType,
                            "result": [asdict(metric) for metric in result.result],
                        }
                except Exception as e:
                    logger.error(f"Error executing query {query_name}: {e}")
                    results[query_name] = {"error": str(e)}

            # Build comprehensive overview
            overview = {
                "cluster_name": cluster_name,
                "timestamp": datetime.utcnow().isoformat(),
                "capacity": {},
                "utilization": {},
                "health": {},
                "raw_metrics": results,
            }

            # Extract capacity information
            if "cluster_cpu_capacity" in results:
                cpu_data = results["cluster_cpu_capacity"]
                if cpu_data.get("result"):
                    overview["capacity"]["cpu_cores"] = float(
                        cpu_data["result"][0]["value"][1]
                    )

            if "cluster_memory_capacity" in results:
                memory_data = results["cluster_memory_capacity"]
                if memory_data.get("result"):
                    overview["capacity"]["memory_bytes"] = float(
                        memory_data["result"][0]["value"][1]
                    )

            # Cache the result
            if use_cache:
                self._cache_metric(
                    cache_key, overview, cache_level, MetricType.CLUSTER, cluster_name
                )

            return overview

        except Exception as e:
            logger.error(f"Error fetching cluster overview for {cluster_name}: {e}")
            return {
                "cluster_name": cluster_name,
                "timestamp": datetime.utcnow().isoformat(),
                "capacity": {},
                "utilization": {},
                "health": {},
                "error": str(e),
            }

    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get cache performance statistics.

        Returns:
            Dict[str, Any]: Cache statistics
        """
        total_requests = self.cache_stats["hits"] + self.cache_stats["misses"]
        hit_rate = (
            (self.cache_stats["hits"] / total_requests * 100)
            if total_requests > 0
            else 0
        )

        return {
            "cache_size": len(self.cache),
            "hits": self.cache_stats["hits"],
            "misses": self.cache_stats["misses"],
            "evictions": self.cache_stats["evictions"],
            "hit_rate_percent": round(hit_rate, 2),
            "total_requests": total_requests,
        }

    async def health_check(self) -> Dict[str, Any]:
        """
        Perform comprehensive health check of the monitoring service.

        Returns:
            Dict[str, Any]: Health check results
        """
        health_status = {
            "service": "enhanced_kubernetes_monitoring",
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "components": {},
        }

        try:
            # Check Prometheus client
            await self._initialize_prometheus_client()
            if self.prometheus_client:
                prometheus_health = await self.prometheus_client.test_connection()
                health_status["components"]["prometheus"] = prometheus_health
            else:
                health_status["components"]["prometheus"] = {
                    "connected": False,
                    "error": "Prometheus client not initialized",
                }

            # Add cache statistics
            health_status["components"]["cache"] = self.get_cache_stats()

        except Exception as e:
            health_status["status"] = "unhealthy"
            health_status["error"] = str(e)

        return health_status

    async def __aenter__(self):
        """Async context manager entry."""
        await self._initialize_prometheus_client()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.prometheus_client:
            await self.prometheus_client.close()


# Global service instance
enhanced_monitoring_service = EnhancedKubernetesMonitoringService()
