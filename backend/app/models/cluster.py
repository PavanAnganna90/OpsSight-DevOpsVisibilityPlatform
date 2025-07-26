"""
Cluster model for Kubernetes cluster monitoring.
Stores cluster health, resource usage, and node information.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    Float,
    ForeignKey,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from typing import Optional, Dict, Any, List
import json

from app.db.database import Base


class ClusterStatus(str, Enum):
    """Enumeration for cluster health status."""

    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"
    OFFLINE = "offline"


class NodeStatus(str, Enum):
    """Enumeration for node status."""

    READY = "ready"
    NOT_READY = "not_ready"
    SCHEDULING_DISABLED = "scheduling_disabled"
    UNKNOWN = "unknown"


class Cluster(Base):
    """
    Cluster model for tracking Kubernetes cluster health and metrics.

    Stores comprehensive information about cluster state, resource usage,
    and operational metrics for monitoring dashboards.
    """

    __tablename__ = "clusters"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy support
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False, index=True
    )

    # Cluster identification
    cluster_id = Column(
        String, index=True, nullable=False
    )  # Removed unique constraint for multi-tenancy
    name = Column(String, index=True, nullable=False)
    display_name = Column(String, nullable=True)
    version = Column(String, nullable=True)  # Kubernetes version

    # Status and health
    status = Column(
        SQLEnum(ClusterStatus), nullable=False, default=ClusterStatus.UNKNOWN
    )
    health_score = Column(Float, nullable=True)  # 0-100 health score
    last_health_check = Column(DateTime(timezone=True), nullable=True)

    # Cluster information
    provider = Column(String, nullable=True)  # EKS, GKE, AKS, self-managed, etc.
    region = Column(String, nullable=True)
    zone = Column(String, nullable=True)
    endpoint_url = Column(String, nullable=True)

    # Node information
    total_nodes = Column(Integer, nullable=True)
    ready_nodes = Column(Integer, nullable=True)
    not_ready_nodes = Column(Integer, nullable=True)
    node_details = Column(Text, nullable=True)  # JSON string with node information

    # Pod information
    total_pods = Column(Integer, nullable=True)
    running_pods = Column(Integer, nullable=True)
    pending_pods = Column(Integer, nullable=True)
    failed_pods = Column(Integer, nullable=True)

    # Resource allocation
    total_cpu_cores = Column(Float, nullable=True)
    allocatable_cpu_cores = Column(Float, nullable=True)
    used_cpu_cores = Column(Float, nullable=True)
    cpu_utilization_percent = Column(Float, nullable=True)

    total_memory_gb = Column(Float, nullable=True)
    allocatable_memory_gb = Column(Float, nullable=True)
    used_memory_gb = Column(Float, nullable=True)
    memory_utilization_percent = Column(Float, nullable=True)

    total_storage_gb = Column(Float, nullable=True)
    used_storage_gb = Column(Float, nullable=True)
    storage_utilization_percent = Column(Float, nullable=True)

    # Network metrics
    network_in_bytes = Column(Float, nullable=True)
    network_out_bytes = Column(Float, nullable=True)
    network_errors = Column(Integer, nullable=True)

    # Workload information
    total_namespaces = Column(Integer, nullable=True)
    total_services = Column(Integer, nullable=True)
    total_ingresses = Column(Integer, nullable=True)
    total_deployments = Column(Integer, nullable=True)
    total_statefulsets = Column(Integer, nullable=True)
    total_daemonsets = Column(Integer, nullable=True)

    # Configuration and metadata
    config_data = Column(Text, nullable=True)  # JSON string for additional config
    labels = Column(Text, nullable=True)  # JSON array of labels/tags
    annotations = Column(Text, nullable=True)  # JSON object for annotations

    # Monitoring configuration
    monitoring_enabled = Column(Boolean, default=True, nullable=False)
    prometheus_endpoint = Column(String, nullable=True)
    grafana_dashboard_url = Column(String, nullable=True)
    log_aggregation_url = Column(String, nullable=True)

    # Alert thresholds
    cpu_alert_threshold = Column(Float, default=80.0, nullable=False)
    memory_alert_threshold = Column(Float, default=85.0, nullable=False)
    storage_alert_threshold = Column(Float, default=90.0, nullable=False)

    # Relationships
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    last_sync = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="clusters")
    project = relationship(
        "Project", back_populates="clusters", foreign_keys=[project_id]
    )

    # Time-series data relationships
    metrics = relationship("Metric", back_populates="cluster")
    log_entries = relationship("LogEntry", back_populates="cluster")
    events = relationship("Event", back_populates="cluster")
    alerts = relationship(
        "Alert", back_populates="cluster", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        """String representation of Cluster model."""
        return f"<Cluster(id={self.id}, name='{self.name}', org_id={self.organization_id}, status='{self.status}', nodes={self.total_nodes})>"

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert cluster model to dictionary for API responses.

        Returns:
            dict: Cluster data with calculated fields
        """
        return {
            "id": self.id,
            "organization_id": self.organization_id,
            "cluster_id": self.cluster_id,
            "name": self.name,
            "display_name": self.display_name,
            "version": self.version,
            "status": self.status,
            "health_score": self.health_score,
            "last_health_check": (
                self.last_health_check.isoformat() if self.last_health_check else None
            ),
            "provider": self.provider,
            "region": self.region,
            "zone": self.zone,
            "endpoint_url": self.endpoint_url,
            "total_nodes": self.total_nodes,
            "ready_nodes": self.ready_nodes,
            "not_ready_nodes": self.not_ready_nodes,
            "node_details": self.get_node_details(),
            "total_pods": self.total_pods,
            "running_pods": self.running_pods,
            "pending_pods": self.pending_pods,
            "failed_pods": self.failed_pods,
            "total_cpu_cores": self.total_cpu_cores,
            "allocatable_cpu_cores": self.allocatable_cpu_cores,
            "used_cpu_cores": self.used_cpu_cores,
            "cpu_utilization_percent": self.cpu_utilization_percent,
            "total_memory_gb": self.total_memory_gb,
            "allocatable_memory_gb": self.allocatable_memory_gb,
            "used_memory_gb": self.used_memory_gb,
            "memory_utilization_percent": self.memory_utilization_percent,
            "total_storage_gb": self.total_storage_gb,
            "used_storage_gb": self.used_storage_gb,
            "storage_utilization_percent": self.storage_utilization_percent,
            "network_in_bytes": self.network_in_bytes,
            "network_out_bytes": self.network_out_bytes,
            "network_errors": self.network_errors,
            "total_namespaces": self.total_namespaces,
            "total_services": self.total_services,
            "total_ingresses": self.total_ingresses,
            "total_deployments": self.total_deployments,
            "total_statefulsets": self.total_statefulsets,
            "total_daemonsets": self.total_daemonsets,
            "config_data": self.get_config_data(),
            "labels": self.get_labels(),
            "annotations": self.get_annotations(),
            "monitoring_enabled": self.monitoring_enabled,
            "prometheus_endpoint": self.prometheus_endpoint,
            "grafana_dashboard_url": self.grafana_dashboard_url,
            "log_aggregation_url": self.log_aggregation_url,
            "cpu_alert_threshold": self.cpu_alert_threshold,
            "memory_alert_threshold": self.memory_alert_threshold,
            "storage_alert_threshold": self.storage_alert_threshold,
            "project_id": self.project_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_sync": self.last_sync.isoformat() if self.last_sync else None,
        }

    def get_node_details(self) -> Optional[List[Dict[str, Any]]]:
        """
        Parse node_details JSON string to list of dictionaries.

        Returns:
            list or None: Node information
        """
        if self.node_details:
            try:
                return json.loads(self.node_details)
            except json.JSONDecodeError:
                return None
        return None

    def set_node_details(self, nodes: List[Dict[str, Any]]) -> None:
        """
        Set node details as JSON string.

        Args:
            nodes: List of node information dictionaries
        """
        self.node_details = json.dumps(nodes) if nodes else None

    def get_config_data(self) -> Optional[Dict[str, Any]]:
        """
        Parse config_data JSON string to dictionary.

        Returns:
            dict or None: Configuration data
        """
        if self.config_data:
            try:
                return json.loads(self.config_data)
            except json.JSONDecodeError:
                return None
        return None

    def set_config_data(self, config: Dict[str, Any]) -> None:
        """
        Set configuration data as JSON string.

        Args:
            config: Configuration dictionary
        """
        self.config_data = json.dumps(config) if config else None

    def get_labels(self) -> Optional[List[str]]:
        """
        Parse labels JSON string to list.

        Returns:
            list or None: List of labels
        """
        if self.labels:
            try:
                return json.loads(self.labels)
            except json.JSONDecodeError:
                return None
        return None

    def set_labels(self, labels: List[str]) -> None:
        """
        Set labels as JSON string.

        Args:
            labels: List of label strings
        """
        self.labels = json.dumps(labels) if labels else None

    def get_annotations(self) -> Optional[Dict[str, str]]:
        """
        Parse annotations JSON string to dictionary.

        Returns:
            dict or None: Annotations dictionary
        """
        if self.annotations:
            try:
                return json.loads(self.annotations)
            except json.JSONDecodeError:
                return None
        return None

    def set_annotations(self, annotations: Dict[str, str]) -> None:
        """
        Set annotations as JSON string.

        Args:
            annotations: Annotations dictionary
        """
        self.annotations = json.dumps(annotations) if annotations else None

    def calculate_health_score(self) -> float:
        """
        Calculate cluster health score based on metrics.

        Returns:
            float: Health score from 0-100
        """
        if not all([self.total_nodes, self.ready_nodes]):
            return 0.0

        # Base score from node readiness
        node_score = (
            (self.ready_nodes / self.total_nodes) * 40 if self.total_nodes > 0 else 0
        )

        # Resource utilization scores (lower utilization = higher score)
        cpu_score = (
            max(0, 30 - (self.cpu_utilization_percent or 0) * 0.3)
            if self.cpu_utilization_percent
            else 30
        )
        memory_score = (
            max(0, 20 - (self.memory_utilization_percent or 0) * 0.2)
            if self.memory_utilization_percent
            else 20
        )
        storage_score = (
            max(0, 10 - (self.storage_utilization_percent or 0) * 0.1)
            if self.storage_utilization_percent
            else 10
        )

        total_score = node_score + cpu_score + memory_score + storage_score

        # Apply penalties for failed pods
        if self.failed_pods and self.total_pods:
            failure_penalty = (self.failed_pods / self.total_pods) * 20
            total_score = max(0, total_score - failure_penalty)

        return min(100.0, max(0.0, total_score))

    def update_health_score(self) -> None:
        """Update the health score based on current metrics."""
        self.health_score = self.calculate_health_score()

    def is_healthy(self) -> bool:
        """
        Check if cluster is in a healthy state.

        Returns:
            bool: True if cluster is healthy
        """
        return self.status == ClusterStatus.HEALTHY and (self.health_score or 0) >= 80

    def needs_attention(self) -> bool:
        """
        Check if cluster needs attention (warnings or critical issues).

        Returns:
            bool: True if cluster needs attention
        """
        if self.status in [ClusterStatus.WARNING, ClusterStatus.CRITICAL]:
            return True

        # Check resource thresholds
        if (
            self.cpu_utilization_percent
            and self.cpu_utilization_percent >= self.cpu_alert_threshold
        ):
            return True
        if (
            self.memory_utilization_percent
            and self.memory_utilization_percent >= self.memory_alert_threshold
        ):
            return True
        if (
            self.storage_utilization_percent
            and self.storage_utilization_percent >= self.storage_alert_threshold
        ):
            return True

        # Check for failed pods
        if self.failed_pods and self.failed_pods > 0:
            return True

        # Check for not ready nodes
        if self.not_ready_nodes and self.not_ready_nodes > 0:
            return True

        return False

    def get_resource_summary(self) -> Dict[str, Any]:
        """
        Get summary of cluster resource utilization.

        Returns:
            dict: Resource utilization summary
        """
        return {
            "cpu": {
                "total": self.total_cpu_cores,
                "allocatable": self.allocatable_cpu_cores,
                "used": self.used_cpu_cores,
                "utilization_percent": self.cpu_utilization_percent,
                "alert_threshold": self.cpu_alert_threshold,
                "needs_attention": (self.cpu_utilization_percent or 0)
                >= self.cpu_alert_threshold,
            },
            "memory": {
                "total_gb": self.total_memory_gb,
                "allocatable_gb": self.allocatable_memory_gb,
                "used_gb": self.used_memory_gb,
                "utilization_percent": self.memory_utilization_percent,
                "alert_threshold": self.memory_alert_threshold,
                "needs_attention": (self.memory_utilization_percent or 0)
                >= self.memory_alert_threshold,
            },
            "storage": {
                "total_gb": self.total_storage_gb,
                "used_gb": self.used_storage_gb,
                "utilization_percent": self.storage_utilization_percent,
                "alert_threshold": self.storage_alert_threshold,
                "needs_attention": (self.storage_utilization_percent or 0)
                >= self.storage_alert_threshold,
            },
            "nodes": {
                "total": self.total_nodes,
                "ready": self.ready_nodes,
                "not_ready": self.not_ready_nodes,
                "health_ratio": (
                    (self.ready_nodes / self.total_nodes) if self.total_nodes else 0
                ),
            },
            "pods": {
                "total": self.total_pods,
                "running": self.running_pods,
                "pending": self.pending_pods,
                "failed": self.failed_pods,
            },
        }

    @classmethod
    def from_kubernetes_data(
        cls, cluster_data: Dict[str, Any], metrics_data: Optional[Dict[str, Any]] = None
    ) -> "Cluster":
        """
        Create Cluster instance from Kubernetes cluster data.

        Args:
            cluster_data: Data from Kubernetes API
            metrics_data: Optional metrics data

        Returns:
            Cluster: New cluster instance
        """
        cluster = cls(
            cluster_id=cluster_data.get("cluster_id"),
            name=cluster_data.get("name"),
            display_name=cluster_data.get("display_name"),
            version=cluster_data.get("version"),
            provider=cluster_data.get("provider"),
            region=cluster_data.get("region"),
            zone=cluster_data.get("zone"),
            endpoint_url=cluster_data.get("endpoint_url"),
        )

        if metrics_data:
            cluster.update_from_metrics(metrics_data)

        return cluster

    def update_from_metrics(self, metrics_data: Dict[str, Any]) -> None:
        """
        Update cluster metrics from monitoring data.

        Args:
            metrics_data: Dictionary containing cluster metrics
        """
        # Update node information
        if "nodes" in metrics_data:
            self.total_nodes = metrics_data["nodes"].get("total")
            self.ready_nodes = metrics_data["nodes"].get("ready")
            self.not_ready_nodes = metrics_data["nodes"].get("not_ready")

        # Update pod information
        if "pods" in metrics_data:
            self.total_pods = metrics_data["pods"].get("total")
            self.running_pods = metrics_data["pods"].get("running")
            self.pending_pods = metrics_data["pods"].get("pending")
            self.failed_pods = metrics_data["pods"].get("failed")

        # Update resource metrics
        if "resources" in metrics_data:
            resources = metrics_data["resources"]

            if "cpu" in resources:
                self.total_cpu_cores = resources["cpu"].get("total")
                self.allocatable_cpu_cores = resources["cpu"].get("allocatable")
                self.used_cpu_cores = resources["cpu"].get("used")
                self.cpu_utilization_percent = resources["cpu"].get(
                    "utilization_percent"
                )

            if "memory" in resources:
                self.total_memory_gb = resources["memory"].get("total_gb")
                self.allocatable_memory_gb = resources["memory"].get("allocatable_gb")
                self.used_memory_gb = resources["memory"].get("used_gb")
                self.memory_utilization_percent = resources["memory"].get(
                    "utilization_percent"
                )

            if "storage" in resources:
                self.total_storage_gb = resources["storage"].get("total_gb")
                self.used_storage_gb = resources["storage"].get("used_gb")
                self.storage_utilization_percent = resources["storage"].get(
                    "utilization_percent"
                )

        # Update network metrics
        if "network" in metrics_data:
            self.network_in_bytes = metrics_data["network"].get("in_bytes")
            self.network_out_bytes = metrics_data["network"].get("out_bytes")
            self.network_errors = metrics_data["network"].get("errors")

        # Update workload counts
        if "workloads" in metrics_data:
            workloads = metrics_data["workloads"]
            self.total_namespaces = workloads.get("namespaces")
            self.total_services = workloads.get("services")
            self.total_ingresses = workloads.get("ingresses")
            self.total_deployments = workloads.get("deployments")
            self.total_statefulsets = workloads.get("statefulsets")
            self.total_daemonsets = workloads.get("daemonsets")

        # Update health metrics
        self.last_health_check = func.now()
        self.update_health_score()

        # Set status based on health score
        if self.health_score >= 80:
            self.status = ClusterStatus.HEALTHY
        elif self.health_score >= 60:
            self.status = ClusterStatus.WARNING
        else:
            self.status = ClusterStatus.CRITICAL

    def belongs_to_organization(self, organization_id: int) -> bool:
        """Check if cluster belongs to a specific organization."""
        return self.organization_id == organization_id
