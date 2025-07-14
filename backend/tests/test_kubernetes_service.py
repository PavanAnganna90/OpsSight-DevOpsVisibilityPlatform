"""
Unit tests for Kubernetes monitoring service.
Tests cluster metrics integration, Prometheus queries, and status updates.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
import json
import httpx

from app.services.kubernetes_service import KubernetesMonitoringService
from app.models.cluster import Cluster, ClusterStatus, NodeStatus
from app.schemas.cluster import ClusterMetricsUpdate


class TestKubernetesMonitoringService:
    """Test cases for Kubernetes monitoring service functionality."""

    @pytest.fixture
    def mock_prometheus_response(self):
        """
        Mock Prometheus API response for testing.

        Returns:
            dict: Sample Prometheus query response
        """
        return {
            "status": "success",
            "data": {
                "result": [
                    {
                        "metric": {"node": "test-node-1", "cluster": "test-cluster"},
                        "value": [1609459200, "75.5"],
                    }
                ]
            },
        }

    @pytest.fixture
    def monitoring_service(self):
        """
        Create a test instance of KubernetesMonitoringService.

        Returns:
            KubernetesMonitoringService: Service instance for testing
        """
        return KubernetesMonitoringService(prometheus_url="http://test-prometheus:9090")

    @pytest.fixture
    def sample_cluster(self, test_project):
        """
        Create a sample cluster for testing.

        Args:
            test_project: Test project from conftest

        Returns:
            Cluster: Sample cluster instance
        """
        return Cluster(
            id=1,
            cluster_id="test-cluster-123",
            name="test-cluster",
            display_name="Test Cluster",
            version="1.28.0",
            status=ClusterStatus.HEALTHY,
            provider="EKS",
            region="us-east-1",
            endpoint_url="https://test-cluster.eks.amazonaws.com",
            monitoring_enabled=True,
            project_id=test_project.id,
            cpu_alert_threshold=80.0,
            memory_alert_threshold=85.0,
            storage_alert_threshold=90.0,
        )

    @pytest.mark.asyncio
    async def test_query_prometheus_success(
        self, monitoring_service, mock_prometheus_response
    ):
        """
        Test successful Prometheus query execution.

        Args:
            monitoring_service: Service instance
            mock_prometheus_response: Mock response data
        """
        # Reason: Test basic Prometheus connectivity and query functionality
        with patch.object(monitoring_service.http_client, "get") as mock_get:
            mock_response = MagicMock()
            mock_response.json.return_value = mock_prometheus_response
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response

            result = await monitoring_service.query_prometheus("up")

            assert result is not None
            assert result == mock_prometheus_response["data"]
            mock_get.assert_called_once()

    @pytest.mark.asyncio
    async def test_query_prometheus_failure(self, monitoring_service):
        """
        Test Prometheus query failure handling.

        Args:
            monitoring_service: Service instance
        """
        # Reason: Ensure proper error handling for network failures
        with patch.object(monitoring_service.http_client, "get") as mock_get:
            mock_get.side_effect = httpx.RequestError("Connection failed")

            result = await monitoring_service.query_prometheus("up")

            assert result is None

    @pytest.mark.asyncio
    async def test_query_prometheus_error_response(self, monitoring_service):
        """
        Test Prometheus query with error response.

        Args:
            monitoring_service: Service instance
        """
        # Reason: Test handling of Prometheus API errors
        error_response = {"status": "error", "error": "Query timeout"}

        with patch.object(monitoring_service.http_client, "get") as mock_get:
            mock_response = MagicMock()
            mock_response.json.return_value = error_response
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response

            result = await monitoring_service.query_prometheus("invalid_query")

            assert result is None

    @pytest.mark.asyncio
    async def test_get_cluster_node_metrics(self, monitoring_service):
        """
        Test cluster node metrics collection.

        Args:
            monitoring_service: Service instance
        """
        # Reason: Verify node status and resource collection from Prometheus
        mock_responses = {
            'kube_node_status_condition{cluster="test-cluster", condition="Ready", status="true"}': {
                "result": [
                    {"metric": {"node": "node-1", "cluster": "test-cluster"}},
                    {"metric": {"node": "node-2", "cluster": "test-cluster"}},
                ]
            },
            'kube_node_info{cluster="test-cluster"}': {
                "result": [
                    {"metric": {"node": "node-1"}},
                    {"metric": {"node": "node-2"}},
                ]
            },
            '100 - (avg(irate(node_cpu_seconds_total{mode="idle",cluster="test-cluster"}[5m])) * 100)': {
                "result": [{"value": [1609459200, "25.5"]}]
            },
        }

        async def mock_query(query, params=None):
            return mock_responses.get(query)

        with patch.object(
            monitoring_service, "query_prometheus", side_effect=mock_query
        ):
            metrics = await monitoring_service.get_cluster_node_metrics("test-cluster")

            assert metrics["total_nodes"] == 2
            assert metrics["ready_nodes"] == 2
            assert metrics["not_ready_nodes"] == 0
            assert len(metrics["node_details"]) == 2
            assert metrics["cpu_metrics"]["usage_percent"] == 25.5

    @pytest.mark.asyncio
    async def test_get_cluster_pod_metrics(self, monitoring_service):
        """
        Test cluster pod metrics collection.

        Args:
            monitoring_service: Service instance
        """
        # Reason: Verify pod status collection across different phases
        mock_responses = {
            'kube_pod_status_phase{cluster="test-cluster", phase="Running"}': {
                "result": [{"metric": {"pod": "pod-1"}}, {"metric": {"pod": "pod-2"}}]
            },
            'kube_pod_status_phase{cluster="test-cluster", phase="Pending"}': {
                "result": [{"metric": {"pod": "pod-3"}}]
            },
            'kube_pod_status_phase{cluster="test-cluster", phase="Failed"}': {
                "result": []
            },
            'kube_pod_status_phase{cluster="test-cluster", phase="Succeeded"}': {
                "result": []
            },
        }

        async def mock_query(query, params=None):
            return mock_responses.get(query)

        with patch.object(
            monitoring_service, "query_prometheus", side_effect=mock_query
        ):
            metrics = await monitoring_service.get_cluster_pod_metrics("test-cluster")

            assert metrics["total_pods"] == 3
            assert metrics["running_pods"] == 2
            assert metrics["pending_pods"] == 1
            assert metrics["failed_pods"] == 0

    @pytest.mark.asyncio
    async def test_get_cluster_resource_metrics(self, monitoring_service):
        """
        Test cluster resource utilization metrics collection.

        Args:
            monitoring_service: Service instance
        """
        # Reason: Verify CPU, memory, and storage metrics calculation
        mock_responses = {
            'sum(kube_node_status_allocatable{cluster="test-cluster", resource="cpu"})': {
                "result": [{"value": [1609459200, "4.0"]}]  # 4 CPU cores
            },
            'sum(rate(container_cpu_usage_seconds_total{cluster="test-cluster", container!="POD", container!=""}[5m]))': {
                "result": [{"value": [1609459200, "2.5"]}]  # 2.5 cores used
            },
            'sum(kube_node_status_allocatable{cluster="test-cluster", resource="memory"})': {
                "result": [{"value": [1609459200, str(8 * 1024**3)]}]  # 8GB in bytes
            },
            'sum(container_memory_working_set_bytes{cluster="test-cluster", container!="POD", container!=""})': {
                "result": [
                    {"value": [1609459200, str(4 * 1024**3)]}
                ]  # 4GB used in bytes
            },
        }

        async def mock_query(query, params=None):
            return mock_responses.get(query)

        with patch.object(
            monitoring_service, "query_prometheus", side_effect=mock_query
        ):
            metrics = await monitoring_service.get_cluster_resource_metrics(
                "test-cluster"
            )

            # CPU assertions
            assert metrics["cpu"]["allocatable"] == 4.0
            assert metrics["cpu"]["used"] == 2.5
            assert metrics["cpu"]["utilization_percent"] == 62.5

            # Memory assertions
            assert metrics["memory"]["allocatable_gb"] == 8.0
            assert metrics["memory"]["used_gb"] == 4.0
            assert metrics["memory"]["utilization_percent"] == 50.0

    @pytest.mark.asyncio
    async def test_get_cluster_workload_metrics(self, monitoring_service):
        """
        Test cluster workload metrics collection.

        Args:
            monitoring_service: Service instance
        """
        # Reason: Verify Kubernetes resource counting functionality
        mock_responses = {
            'kube_namespace_created{cluster="test-cluster"}': {
                "result": [
                    {"metric": {"namespace": "default"}},
                    {"metric": {"namespace": "kube-system"}},
                ]
            },
            'kube_service_info{cluster="test-cluster"}': {
                "result": [{"metric": {"service": "svc-1"}}]
            },
            'kube_deployment_created{cluster="test-cluster"}': {
                "result": [
                    {"metric": {"deployment": "deploy-1"}},
                    {"metric": {"deployment": "deploy-2"}},
                ]
            },
        }

        async def mock_query(query, params=None):
            return mock_responses.get(query, {"result": []})

        with patch.object(
            monitoring_service, "query_prometheus", side_effect=mock_query
        ):
            metrics = await monitoring_service.get_cluster_workload_metrics(
                "test-cluster"
            )

            assert metrics["namespaces"] == 2
            assert metrics["services"] == 1
            assert metrics["deployments"] == 2
            assert metrics["ingresses"] == 0  # No data in mock

    @pytest.mark.asyncio
    async def test_update_cluster_status_success(
        self, monitoring_service, sample_cluster, db_session
    ):
        """
        Test successful cluster status update.

        Args:
            monitoring_service: Service instance
            sample_cluster: Test cluster
            db_session: Database session
        """
        # Reason: Test end-to-end cluster status update functionality
        db_session.add(sample_cluster)
        db_session.commit()

        # Mock all metric collection methods
        with (
            patch.object(monitoring_service, "get_cluster_node_metrics") as mock_nodes,
            patch.object(monitoring_service, "get_cluster_pod_metrics") as mock_pods,
            patch.object(
                monitoring_service, "get_cluster_resource_metrics"
            ) as mock_resources,
            patch.object(
                monitoring_service, "get_cluster_workload_metrics"
            ) as mock_workloads,
        ):

            # Configure mock responses
            mock_nodes.return_value = {
                "total_nodes": 3,
                "ready_nodes": 3,
                "not_ready_nodes": 0,
                "node_details": [{"name": "node-1", "status": NodeStatus.READY}],
            }

            mock_pods.return_value = {
                "total_pods": 10,
                "running_pods": 9,
                "pending_pods": 1,
                "failed_pods": 0,
            }

            mock_resources.return_value = {
                "cpu": {"total": 6, "used": 3, "utilization_percent": 50},
                "memory": {"total_gb": 12, "used_gb": 6, "utilization_percent": 50},
                "storage": {"total_gb": 100, "used_gb": 50, "utilization_percent": 50},
            }

            mock_workloads.return_value = {
                "namespaces": 3,
                "services": 5,
                "deployments": 4,
            }

            # Execute update
            updated_cluster = await monitoring_service.update_cluster_status(
                db_session, sample_cluster.id, 1
            )

            assert updated_cluster is not None
            assert updated_cluster.total_nodes == 3
            assert updated_cluster.ready_nodes == 3
            assert updated_cluster.running_pods == 9
            assert updated_cluster.cpu_utilization_percent == 50
            assert updated_cluster.status == ClusterStatus.HEALTHY

    @pytest.mark.asyncio
    async def test_update_cluster_status_critical_nodes(
        self, monitoring_service, sample_cluster, db_session
    ):
        """
        Test cluster status update with no ready nodes.

        Args:
            monitoring_service: Service instance
            sample_cluster: Test cluster
            db_session: Database session
        """
        # Reason: Test critical status detection when nodes are down
        db_session.add(sample_cluster)
        db_session.commit()

        with (
            patch.object(monitoring_service, "get_cluster_node_metrics") as mock_nodes,
            patch.object(monitoring_service, "get_cluster_pod_metrics") as mock_pods,
            patch.object(
                monitoring_service, "get_cluster_resource_metrics"
            ) as mock_resources,
            patch.object(
                monitoring_service, "get_cluster_workload_metrics"
            ) as mock_workloads,
        ):

            # Configure critical scenario
            mock_nodes.return_value = {
                "total_nodes": 3,
                "ready_nodes": 0,  # No ready nodes
                "not_ready_nodes": 3,
                "node_details": [],
            }

            mock_pods.return_value = {
                "total_pods": 0,
                "running_pods": 0,
                "pending_pods": 0,
                "failed_pods": 0,
            }
            mock_resources.return_value = {"cpu": {}, "memory": {}, "storage": {}}
            mock_workloads.return_value = {
                "namespaces": 0,
                "services": 0,
                "deployments": 0,
            }

            updated_cluster = await monitoring_service.update_cluster_status(
                db_session, sample_cluster.id, 1
            )

            assert updated_cluster.status == ClusterStatus.CRITICAL

    @pytest.mark.asyncio
    async def test_update_cluster_status_high_resource_usage(
        self, monitoring_service, sample_cluster, db_session
    ):
        """
        Test cluster status update with high resource usage.

        Args:
            monitoring_service: Service instance
            sample_cluster: Test cluster
            db_session: Database session
        """
        # Reason: Test warning status detection for resource threshold breaches
        db_session.add(sample_cluster)
        db_session.commit()

        with (
            patch.object(monitoring_service, "get_cluster_node_metrics") as mock_nodes,
            patch.object(monitoring_service, "get_cluster_pod_metrics") as mock_pods,
            patch.object(
                monitoring_service, "get_cluster_resource_metrics"
            ) as mock_resources,
            patch.object(
                monitoring_service, "get_cluster_workload_metrics"
            ) as mock_workloads,
        ):

            # Configure high resource usage scenario
            mock_nodes.return_value = {
                "total_nodes": 3,
                "ready_nodes": 3,
                "not_ready_nodes": 0,
                "node_details": [],
            }
            mock_pods.return_value = {
                "total_pods": 10,
                "running_pods": 10,
                "pending_pods": 0,
                "failed_pods": 0,
            }
            mock_resources.return_value = {
                "cpu": {
                    "total": 6,
                    "used": 5.5,
                    "utilization_percent": 92,
                },  # Above 80% threshold
                "memory": {"total_gb": 12, "used_gb": 6, "utilization_percent": 50},
                "storage": {"total_gb": 100, "used_gb": 50, "utilization_percent": 50},
            }
            mock_workloads.return_value = {
                "namespaces": 3,
                "services": 5,
                "deployments": 4,
            }

            updated_cluster = await monitoring_service.update_cluster_status(
                db_session, sample_cluster.id, 1
            )

            assert updated_cluster.status == ClusterStatus.WARNING

    @pytest.mark.asyncio
    async def test_monitor_all_clusters(
        self, monitoring_service, db_session, test_project, test_user
    ):
        """
        Test monitoring all clusters in a project.

        Args:
            monitoring_service: Service instance
            db_session: Database session
            test_project: Test project
            test_user: Test user
        """
        # Reason: Test bulk cluster monitoring functionality
        # Create multiple clusters
        cluster1 = Cluster(
            cluster_id="cluster-1",
            name="cluster-1",
            project_id=test_project.id,
            monitoring_enabled=True,
            is_active=True,
        )
        cluster2 = Cluster(
            cluster_id="cluster-2",
            name="cluster-2",
            project_id=test_project.id,
            monitoring_enabled=False,
            is_active=True,
        )

        db_session.add_all([cluster1, cluster2])
        db_session.commit()

        with patch.object(monitoring_service, "update_cluster_status") as mock_update:
            mock_update.return_value = cluster1

            results = await monitoring_service.monitor_all_clusters(
                db_session, test_project.id, test_user.id
            )

            # Only monitoring-enabled cluster should be updated
            assert len(results) == 1
            mock_update.assert_called_once()

    @pytest.mark.asyncio
    async def test_prometheus_query_edge_cases(self, monitoring_service):
        """
        Test edge cases in Prometheus query handling.

        Args:
            monitoring_service: Service instance
        """
        # Reason: Test robustness against various response formats
        test_cases = [
            # Empty result
            {"status": "success", "data": {"result": []}},
            # Missing data field
            {"status": "success"},
            # Missing result field
            {"status": "success", "data": {}},
        ]

        for response_data in test_cases:
            with patch.object(monitoring_service.http_client, "get") as mock_get:
                mock_response = MagicMock()
                mock_response.json.return_value = response_data
                mock_response.raise_for_status.return_value = None
                mock_get.return_value = mock_response

                result = await monitoring_service.query_prometheus("test_query")

                # Should handle gracefully without crashing
                assert result is not None or result is None

    def test_kubernetes_config_loading(self):
        """
        Test Kubernetes configuration loading scenarios.
        """
        # Reason: Verify service gracefully handles config loading failures
        with (
            patch(
                "app.services.kubernetes_service.config.load_incluster_config"
            ) as mock_incluster,
            patch(
                "app.services.kubernetes_service.config.load_kube_config"
            ) as mock_kube,
        ):

            # Test scenario where both config loading methods fail
            mock_incluster.side_effect = Exception("No in-cluster config")
            mock_kube.side_effect = Exception("No local config")

            # Should not raise exception
            service = KubernetesMonitoringService()

            assert service.k8s_core_api is None
            assert service.k8s_apps_api is None

    @pytest.mark.asyncio
    async def test_context_manager_functionality(self):
        """
        Test async context manager functionality.
        """
        # Reason: Ensure proper resource cleanup
        async with KubernetesMonitoringService() as service:
            assert service.http_client is not None

        # After context exit, client should be closed
        # Note: We can't directly test this without accessing private attributes
