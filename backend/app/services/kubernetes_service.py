"""
Kubernetes monitoring service for cluster health and metrics integration.
Fetches metrics from Prometheus and updates cluster health status.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
import json

import httpx
from kubernetes import client, config
from kubernetes.client.rest import ApiException
from sqlalchemy.orm import Session

from app.models.cluster import Cluster, ClusterStatus, NodeStatus
from app.schemas.cluster import ClusterMetricsUpdate, KubernetesMetrics
from app.services.cluster_service import ClusterService
from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)


class KubernetesMonitoringService:
    """
    Service for Kubernetes cluster monitoring and Prometheus metrics integration.

    Provides methods for:
    - Fetching cluster metrics from Prometheus
    - Updating cluster health status
    - Monitoring node and pod status
    - Calculating resource utilization
    """

    def __init__(self, prometheus_url: str = "http://prometheus:9090"):
        """
        Initialize the Kubernetes monitoring service.

        Args:
            prometheus_url (str): Prometheus server URL for metrics queries
        """
        self.prometheus_url = prometheus_url.rstrip("/")
        self.http_client = httpx.AsyncClient(timeout=30.0)

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

    async def query_prometheus(
        self, query: str, params: Optional[Dict] = None
    ) -> Optional[Dict]:
        """
        Execute a Prometheus query and return results.

        Args:
            query (str): PromQL query string
            params (Optional[Dict]): Additional query parameters

        Returns:
            Optional[Dict]: Query results or None if failed
        """
        try:
            query_params = {"query": query}
            if params:
                query_params.update(params)

            url = f"{self.prometheus_url}/api/v1/query"

            response = await self.http_client.get(url, params=query_params)
            response.raise_for_status()

            data = response.json()
            if data.get("status") == "success":
                return data.get("data", {})
            else:
                logger.error(
                    f"Prometheus query failed: {data.get('error', 'Unknown error')}"
                )
                return None

        except httpx.RequestError as e:
            logger.error(f"Failed to query Prometheus: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error querying Prometheus: {e}")
            return None

    async def get_cluster_node_metrics(self, cluster_name: str) -> Dict[str, Any]:
        """
        Fetch cluster node metrics from Prometheus.

        Args:
            cluster_name (str): Name of the cluster to monitor

        Returns:
            Dict[str, Any]: Node metrics data
        """
        node_metrics = {
            "total_nodes": 0,
            "ready_nodes": 0,
            "not_ready_nodes": 0,
            "node_details": [],
            "cpu_metrics": {},
            "memory_metrics": {},
            "disk_metrics": {},
        }

        try:
            # Query node status
            node_ready_query = f'kube_node_status_condition{{cluster="{cluster_name}", condition="Ready", status="true"}}'
            node_ready_data = await self.query_prometheus(node_ready_query)

            if node_ready_data and node_ready_data.get("result"):
                ready_nodes = len(node_ready_data["result"])
                node_metrics["ready_nodes"] = ready_nodes

                # Get node details
                for result in node_ready_data["result"]:
                    node_name = result["metric"].get("node", "unknown")
                    node_metrics["node_details"].append(
                        {
                            "name": node_name,
                            "status": NodeStatus.READY,
                            "last_heartbeat": datetime.utcnow().isoformat(),
                        }
                    )

            # Query total nodes
            total_nodes_query = f'kube_node_info{{cluster="{cluster_name}"}}'
            total_nodes_data = await self.query_prometheus(total_nodes_query)

            if total_nodes_data and total_nodes_data.get("result"):
                total_nodes = len(total_nodes_data["result"])
                node_metrics["total_nodes"] = total_nodes
                node_metrics["not_ready_nodes"] = max(
                    0, total_nodes - node_metrics["ready_nodes"]
                )

            # Query CPU metrics
            cpu_usage_query = f'100 - (avg(irate(node_cpu_seconds_total{{mode="idle",cluster="{cluster_name}"}}[5m])) * 100)'
            cpu_data = await self.query_prometheus(cpu_usage_query)

            if cpu_data and cpu_data.get("result"):
                cpu_usage = (
                    float(cpu_data["result"][0]["value"][1])
                    if cpu_data["result"]
                    else 0
                )
                node_metrics["cpu_metrics"] = {"usage_percent": round(cpu_usage, 2)}

            # Query Memory metrics
            memory_usage_query = f'(1 - (node_memory_MemAvailable_bytes{{cluster="{cluster_name}"}} / node_memory_MemTotal_bytes{{cluster="{cluster_name}"}})) * 100'
            memory_data = await self.query_prometheus(memory_usage_query)

            if memory_data and memory_data.get("result"):
                memory_usage = (
                    float(memory_data["result"][0]["value"][1])
                    if memory_data["result"]
                    else 0
                )
                node_metrics["memory_metrics"] = {
                    "usage_percent": round(memory_usage, 2)
                }

            # Query Disk metrics
            disk_usage_query = f'100 - (node_filesystem_avail_bytes{{cluster="{cluster_name}", mountpoint="/"}} / node_filesystem_size_bytes{{cluster="{cluster_name}", mountpoint="/"}}) * 100'
            disk_data = await self.query_prometheus(disk_usage_query)

            if disk_data and disk_data.get("result"):
                disk_usage = (
                    float(disk_data["result"][0]["value"][1])
                    if disk_data["result"]
                    else 0
                )
                node_metrics["disk_metrics"] = {"usage_percent": round(disk_usage, 2)}

        except Exception as e:
            logger.error(f"Error fetching node metrics for cluster {cluster_name}: {e}")

        return node_metrics

    async def get_cluster_pod_metrics(self, cluster_name: str) -> Dict[str, Any]:
        """
        Fetch cluster pod metrics from Prometheus.

        Args:
            cluster_name (str): Name of the cluster to monitor

        Returns:
            Dict[str, Any]: Pod metrics data
        """
        pod_metrics = {
            "total_pods": 0,
            "running_pods": 0,
            "pending_pods": 0,
            "failed_pods": 0,
            "succeeded_pods": 0,
        }

        try:
            # Query pod statuses
            pod_statuses = ["Running", "Pending", "Failed", "Succeeded"]

            for status in pod_statuses:
                query = f'kube_pod_status_phase{{cluster="{cluster_name}", phase="{status}"}}'
                data = await self.query_prometheus(query)

                if data and data.get("result"):
                    count = len(data["result"])
                    pod_metrics[f"{status.lower()}_pods"] = count
                    pod_metrics["total_pods"] += count

        except Exception as e:
            logger.error(f"Error fetching pod metrics for cluster {cluster_name}: {e}")

        return pod_metrics

    async def get_cluster_resource_metrics(self, cluster_name: str) -> Dict[str, Any]:
        """
        Fetch cluster resource allocation and usage metrics.

        Args:
            cluster_name (str): Name of the cluster to monitor

        Returns:
            Dict[str, Any]: Resource metrics data
        """
        resource_metrics = {
            "cpu": {"total": 0, "allocatable": 0, "used": 0, "utilization_percent": 0},
            "memory": {
                "total_gb": 0,
                "allocatable_gb": 0,
                "used_gb": 0,
                "utilization_percent": 0,
            },
            "storage": {"total_gb": 0, "used_gb": 0, "utilization_percent": 0},
        }

        try:
            # CPU metrics
            cpu_allocatable_query = f'sum(kube_node_status_allocatable{{cluster="{cluster_name}", resource="cpu"}})'
            cpu_allocatable_data = await self.query_prometheus(cpu_allocatable_query)

            if cpu_allocatable_data and cpu_allocatable_data.get("result"):
                cpu_allocatable = float(cpu_allocatable_data["result"][0]["value"][1])
                resource_metrics["cpu"]["allocatable"] = cpu_allocatable
                resource_metrics["cpu"][
                    "total"
                ] = cpu_allocatable  # Assuming allocatable equals total for now

            cpu_usage_query = f'sum(rate(container_cpu_usage_seconds_total{{cluster="{cluster_name}", container!="POD", container!=""}}[5m]))'
            cpu_usage_data = await self.query_prometheus(cpu_usage_query)

            if cpu_usage_data and cpu_usage_data.get("result"):
                cpu_used = float(cpu_usage_data["result"][0]["value"][1])
                resource_metrics["cpu"]["used"] = cpu_used

                if resource_metrics["cpu"]["allocatable"] > 0:
                    resource_metrics["cpu"]["utilization_percent"] = round(
                        (cpu_used / resource_metrics["cpu"]["allocatable"]) * 100, 2
                    )

            # Memory metrics
            memory_allocatable_query = f'sum(kube_node_status_allocatable{{cluster="{cluster_name}", resource="memory"}})'
            memory_allocatable_data = await self.query_prometheus(
                memory_allocatable_query
            )

            if memory_allocatable_data and memory_allocatable_data.get("result"):
                memory_allocatable_bytes = float(
                    memory_allocatable_data["result"][0]["value"][1]
                )
                memory_allocatable_gb = memory_allocatable_bytes / (1024**3)
                resource_metrics["memory"]["allocatable_gb"] = round(
                    memory_allocatable_gb, 2
                )
                resource_metrics["memory"]["total_gb"] = round(memory_allocatable_gb, 2)

            memory_usage_query = f'sum(container_memory_working_set_bytes{{cluster="{cluster_name}", container!="POD", container!=""}})'
            memory_usage_data = await self.query_prometheus(memory_usage_query)

            if memory_usage_data and memory_usage_data.get("result"):
                memory_used_bytes = float(memory_usage_data["result"][0]["value"][1])
                memory_used_gb = memory_used_bytes / (1024**3)
                resource_metrics["memory"]["used_gb"] = round(memory_used_gb, 2)

                if resource_metrics["memory"]["allocatable_gb"] > 0:
                    resource_metrics["memory"]["utilization_percent"] = round(
                        (memory_used_gb / resource_metrics["memory"]["allocatable_gb"])
                        * 100,
                        2,
                    )

            # Storage metrics (filesystem usage)
            storage_total_query = f'sum(node_filesystem_size_bytes{{cluster="{cluster_name}", mountpoint="/"}})'
            storage_total_data = await self.query_prometheus(storage_total_query)

            if storage_total_data and storage_total_data.get("result"):
                storage_total_bytes = float(storage_total_data["result"][0]["value"][1])
                storage_total_gb = storage_total_bytes / (1024**3)
                resource_metrics["storage"]["total_gb"] = round(storage_total_gb, 2)

            storage_used_query = f'sum(node_filesystem_size_bytes{{cluster="{cluster_name}", mountpoint="/"}} - node_filesystem_avail_bytes{{cluster="{cluster_name}", mountpoint="/"}})'
            storage_used_data = await self.query_prometheus(storage_used_query)

            if storage_used_data and storage_used_data.get("result"):
                storage_used_bytes = float(storage_used_data["result"][0]["value"][1])
                storage_used_gb = storage_used_bytes / (1024**3)
                resource_metrics["storage"]["used_gb"] = round(storage_used_gb, 2)

                if resource_metrics["storage"]["total_gb"] > 0:
                    resource_metrics["storage"]["utilization_percent"] = round(
                        (storage_used_gb / resource_metrics["storage"]["total_gb"])
                        * 100,
                        2,
                    )

        except Exception as e:
            logger.error(
                f"Error fetching resource metrics for cluster {cluster_name}: {e}"
            )

        return resource_metrics

    async def get_cluster_workload_metrics(self, cluster_name: str) -> Dict[str, Any]:
        """
        Fetch cluster workload metrics (deployments, services, etc.).

        Args:
            cluster_name (str): Name of the cluster to monitor

        Returns:
            Dict[str, Any]: Workload metrics data
        """
        workload_metrics = {
            "namespaces": 0,
            "services": 0,
            "ingresses": 0,
            "deployments": 0,
            "statefulsets": 0,
            "daemonsets": 0,
        }

        try:
            # Query various Kubernetes resources
            resources = {
                "namespaces": f'kube_namespace_created{{cluster="{cluster_name}"}}',
                "services": f'kube_service_info{{cluster="{cluster_name}"}}',
                "ingresses": f'kube_ingress_info{{cluster="{cluster_name}"}}',
                "deployments": f'kube_deployment_created{{cluster="{cluster_name}"}}',
                "statefulsets": f'kube_statefulset_created{{cluster="{cluster_name}"}}',
                "daemonsets": f'kube_daemonset_created{{cluster="{cluster_name}"}}',
            }

            for resource_type, query in resources.items():
                data = await self.query_prometheus(query)
                if data and data.get("result"):
                    workload_metrics[resource_type] = len(data["result"])

        except Exception as e:
            logger.error(
                f"Error fetching workload metrics for cluster {cluster_name}: {e}"
            )

        return workload_metrics

    async def update_cluster_status(
        self, db: Session, cluster_id: int, user_id: int
    ) -> Optional[Cluster]:
        """
        Update cluster status with latest metrics from Prometheus.

        Args:
            db (Session): Database session
            cluster_id (int): Cluster ID to update
            user_id (int): User ID for access control

        Returns:
            Optional[Cluster]: Updated cluster object or None if failed
        """
        try:
            # Get cluster from database
            cluster = ClusterService.get_cluster_by_id(db, cluster_id, user_id)
            if not cluster:
                logger.warning(f"Cluster {cluster_id} not found or access denied")
                return None

            cluster_name = cluster.name
            logger.info(f"Updating status for cluster: {cluster_name}")

            # Fetch all metrics
            node_metrics = await self.get_cluster_node_metrics(cluster_name)
            pod_metrics = await self.get_cluster_pod_metrics(cluster_name)
            resource_metrics = await self.get_cluster_resource_metrics(cluster_name)
            workload_metrics = await self.get_cluster_workload_metrics(cluster_name)

            # Update cluster with metrics
            cluster.total_nodes = node_metrics.get("total_nodes", 0)
            cluster.ready_nodes = node_metrics.get("ready_nodes", 0)
            cluster.not_ready_nodes = node_metrics.get("not_ready_nodes", 0)
            cluster.set_node_details(node_metrics.get("node_details", []))

            # Pod metrics
            cluster.total_pods = pod_metrics.get("total_pods", 0)
            cluster.running_pods = pod_metrics.get("running_pods", 0)
            cluster.pending_pods = pod_metrics.get("pending_pods", 0)
            cluster.failed_pods = pod_metrics.get("failed_pods", 0)

            # CPU metrics
            cpu_data = resource_metrics.get("cpu", {})
            cluster.total_cpu_cores = cpu_data.get("total", 0)
            cluster.allocatable_cpu_cores = cpu_data.get("allocatable", 0)
            cluster.used_cpu_cores = cpu_data.get("used", 0)
            cluster.cpu_utilization_percent = cpu_data.get("utilization_percent", 0)

            # Memory metrics
            memory_data = resource_metrics.get("memory", {})
            cluster.total_memory_gb = memory_data.get("total_gb", 0)
            cluster.allocatable_memory_gb = memory_data.get("allocatable_gb", 0)
            cluster.used_memory_gb = memory_data.get("used_gb", 0)
            cluster.memory_utilization_percent = memory_data.get(
                "utilization_percent", 0
            )

            # Storage metrics
            storage_data = resource_metrics.get("storage", {})
            cluster.total_storage_gb = storage_data.get("total_gb", 0)
            cluster.used_storage_gb = storage_data.get("used_gb", 0)
            cluster.storage_utilization_percent = storage_data.get(
                "utilization_percent", 0
            )

            # Workload metrics
            cluster.total_namespaces = workload_metrics.get("namespaces", 0)
            cluster.total_services = workload_metrics.get("services", 0)
            cluster.total_ingresses = workload_metrics.get("ingresses", 0)
            cluster.total_deployments = workload_metrics.get("deployments", 0)
            cluster.total_statefulsets = workload_metrics.get("statefulsets", 0)
            cluster.total_daemonsets = workload_metrics.get("daemonsets", 0)

            # Update health status based on metrics
            cluster.update_health_score()
            cluster.last_health_check = datetime.utcnow()
            cluster.last_sync = datetime.utcnow()

            # Determine overall status
            if cluster.ready_nodes == 0:
                cluster.status = ClusterStatus.CRITICAL
            elif cluster.not_ready_nodes > 0:
                cluster.status = ClusterStatus.WARNING
            elif (
                cluster.cpu_utilization_percent > cluster.cpu_alert_threshold
                or cluster.memory_utilization_percent > cluster.memory_alert_threshold
                or cluster.storage_utilization_percent > cluster.storage_alert_threshold
            ):
                cluster.status = ClusterStatus.WARNING
            else:
                cluster.status = ClusterStatus.HEALTHY

            # Save to database
            db.commit()
            db.refresh(cluster)

            logger.info(
                f"Successfully updated cluster {cluster_name} status: {cluster.status}"
            )
            return cluster

        except Exception as e:
            db.rollback()
            logger.error(f"Error updating cluster {cluster_id} status: {e}")
            return None

    async def monitor_all_clusters(
        self, db: Session, project_id: int, user_id: int
    ) -> List[Cluster]:
        """
        Monitor all clusters in a project and update their status.

        Args:
            db (Session): Database session
            project_id (int): Project ID to monitor clusters for
            user_id (int): User ID for access control

        Returns:
            List[Cluster]: List of updated clusters
        """
        try:
            # Get all active clusters for the project
            clusters = ClusterService.get_clusters_by_project(
                db=db, project_id=project_id, user_id=user_id, is_active=True
            )

            updated_clusters = []

            for cluster in clusters:
                if cluster.monitoring_enabled:
                    updated_cluster = await self.update_cluster_status(
                        db, cluster.id, user_id
                    )
                    if updated_cluster:
                        updated_clusters.append(updated_cluster)
                else:
                    logger.info(f"Monitoring disabled for cluster {cluster.name}")

            logger.info(
                f"Updated {len(updated_clusters)} clusters for project {project_id}"
            )
            return updated_clusters

        except Exception as e:
            logger.error(f"Error monitoring clusters for project {project_id}: {e}")
            return []

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.http_client.aclose()


# Singleton instance for the monitoring service
monitoring_service = KubernetesMonitoringService()
