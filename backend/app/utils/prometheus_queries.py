"""
Advanced PromQL query templates for Kubernetes cluster monitoring.
Provides pre-built queries for common metrics and monitoring scenarios.
"""

from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

from app.utils.prometheus_client import PromQLQueryBuilder


class MetricType(Enum):
    """Types of metrics available for querying."""

    NODE = "node"
    POD = "pod"
    CONTAINER = "container"
    DEPLOYMENT = "deployment"
    SERVICE = "service"
    INGRESS = "ingress"
    PERSISTENT_VOLUME = "pv"
    NAMESPACE = "namespace"
    CLUSTER = "cluster"


class AggregationType(Enum):
    """Types of aggregations for metrics."""

    SUM = "sum"
    AVG = "avg"
    MAX = "max"
    MIN = "min"
    COUNT = "count"
    RATE = "rate"
    IRATE = "irate"
    INCREASE = "increase"


@dataclass
class QueryTemplate:
    """
    Represents a PromQL query template with metadata.
    """

    name: str
    description: str
    query: str
    metric_type: MetricType
    aggregation: Optional[AggregationType] = None
    interval: str = "5m"
    labels: Optional[List[str]] = None
    unit: Optional[str] = None

    def build_query(self, **kwargs) -> str:
        """
        Build the final query by substituting template variables.

        Args:
            **kwargs: Template variables to substitute

        Returns:
            str: Final PromQL query
        """
        return self.query.format(**kwargs)


class KubernetesQueryTemplates:
    """
    Collection of advanced PromQL query templates for Kubernetes monitoring.
    """

    # Node Metrics Templates
    NODE_CPU_USAGE = QueryTemplate(
        name="node_cpu_usage",
        description="CPU usage percentage per node",
        query='100 - (avg by (instance) (irate(node_cpu_seconds_total{{mode="idle",cluster="{cluster}"}}[{interval}])) * 100)',
        metric_type=MetricType.NODE,
        aggregation=AggregationType.AVG,
        unit="percent",
    )

    NODE_MEMORY_USAGE = QueryTemplate(
        name="node_memory_usage",
        description="Memory usage percentage per node",
        query='(1 - (node_memory_MemAvailable_bytes{{cluster="{cluster}"}} / node_memory_MemTotal_bytes{{cluster="{cluster}"}})) * 100',
        metric_type=MetricType.NODE,
        unit="percent",
    )

    NODE_DISK_USAGE = QueryTemplate(
        name="node_disk_usage",
        description="Disk usage percentage per node",
        query='100 - (node_filesystem_avail_bytes{{cluster="{cluster}",mountpoint="/"}} / node_filesystem_size_bytes{{cluster="{cluster}",mountpoint="/"}}) * 100',
        metric_type=MetricType.NODE,
        unit="percent",
    )

    # Pod Metrics Templates
    POD_CPU_USAGE = QueryTemplate(
        name="pod_cpu_usage",
        description="CPU usage per pod",
        query='sum by (pod, namespace) (rate(container_cpu_usage_seconds_total{{cluster="{cluster}",container!="POD",container!=""}}[{interval}]))',
        metric_type=MetricType.POD,
        aggregation=AggregationType.SUM,
        unit="cores",
    )

    POD_MEMORY_USAGE = QueryTemplate(
        name="pod_memory_usage",
        description="Memory usage per pod",
        query='sum by (pod, namespace) (container_memory_working_set_bytes{{cluster="{cluster}",container!="POD",container!=""}})',
        metric_type=MetricType.POD,
        aggregation=AggregationType.SUM,
        unit="bytes",
    )

    # Cluster-wide Metrics Templates
    CLUSTER_CPU_CAPACITY = QueryTemplate(
        name="cluster_cpu_capacity",
        description="Total cluster CPU capacity",
        query='sum(kube_node_status_capacity{{cluster="{cluster}",resource="cpu"}})',
        metric_type=MetricType.CLUSTER,
        aggregation=AggregationType.SUM,
        unit="cores",
    )

    CLUSTER_MEMORY_CAPACITY = QueryTemplate(
        name="cluster_memory_capacity",
        description="Total cluster memory capacity",
        query='sum(kube_node_status_capacity{{cluster="{cluster}",resource="memory"}})',
        metric_type=MetricType.CLUSTER,
        aggregation=AggregationType.SUM,
        unit="bytes",
    )


class AdvancedQueryBuilder:
    """
    Advanced query builder for complex Kubernetes monitoring scenarios.
    """

    def __init__(self, cluster_name: str, interval: str = "5m"):
        """
        Initialize the advanced query builder.

        Args:
            cluster_name (str): Name of the cluster to query
            interval (str): Default interval for rate calculations
        """
        self.cluster_name = cluster_name
        self.interval = interval
        self.templates = KubernetesQueryTemplates()

    def get_template(self, template_name: str) -> Optional[QueryTemplate]:
        """
        Get a query template by name.

        Args:
            template_name (str): Name of the template

        Returns:
            Optional[QueryTemplate]: Template if found, None otherwise
        """
        return getattr(self.templates, template_name.upper(), None)

    def build_query(self, template_name: str, **kwargs) -> Optional[str]:
        """
        Build a query from a template with substitutions.

        Args:
            template_name (str): Name of the template
            **kwargs: Additional template variables

        Returns:
            Optional[str]: Built query or None if template not found
        """
        template = self.get_template(template_name)
        if not template:
            return None

        # Set default values
        query_vars = {
            "cluster": self.cluster_name,
            "interval": kwargs.get("interval", self.interval),
        }
        query_vars.update(kwargs)

        return template.build_query(**query_vars)

    def get_node_overview_queries(self) -> Dict[str, str]:
        """
        Get a set of queries for node overview dashboard.

        Returns:
            Dict[str, str]: Dictionary of query names to PromQL queries
        """
        queries = {}
        node_templates = ["node_cpu_usage", "node_memory_usage", "node_disk_usage"]

        for template_name in node_templates:
            query = self.build_query(template_name)
            if query:
                queries[template_name] = query

        return queries

    def get_cluster_overview_queries(self) -> Dict[str, str]:
        """
        Get a set of queries for cluster overview dashboard.

        Returns:
            Dict[str, str]: Dictionary of query names to PromQL queries
        """
        queries = {}
        cluster_templates = ["cluster_cpu_capacity", "cluster_memory_capacity"]

        for template_name in cluster_templates:
            query = self.build_query(template_name)
            if query:
                queries[template_name] = query

        return queries


def create_query_builder(
    cluster_name: str, interval: str = "5m"
) -> AdvancedQueryBuilder:
    """
    Factory function to create an advanced query builder.

    Args:
        cluster_name (str): Name of the cluster
        interval (str): Default interval for rate calculations

    Returns:
        AdvancedQueryBuilder: Configured query builder
    """
    return AdvancedQueryBuilder(cluster_name, interval)
