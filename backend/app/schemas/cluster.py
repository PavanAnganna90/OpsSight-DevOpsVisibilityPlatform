from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime

from ..models.cluster import ClusterStatus, NodeStatus


class ClusterBase(BaseModel):
    """Base cluster schema with common fields"""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    provider: str = Field(..., min_length=1)  # aws, gcp, azure, on-premise
    region: Optional[str] = None
    version: Optional[str] = None
    endpoint: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_active: bool = True


class ClusterCreate(ClusterBase):
    """Schema for creating a new cluster"""

    project_id: int = Field(..., gt=0)


class ClusterUpdate(BaseModel):
    """Schema for updating an existing cluster"""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    provider: Optional[str] = Field(None, min_length=1)
    region: Optional[str] = None
    version: Optional[str] = None
    endpoint: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class NodeMetrics(BaseModel):
    """Schema for node metrics data"""

    cpu_usage_percent: float = Field(..., ge=0, le=100)
    memory_usage_percent: float = Field(..., ge=0, le=100)
    disk_usage_percent: float = Field(..., ge=0, le=100)
    network_in_bytes: int = Field(..., ge=0)
    network_out_bytes: int = Field(..., ge=0)
    pod_count: int = Field(..., ge=0)
    pod_capacity: int = Field(..., ge=0)


class ClusterMetricsUpdate(BaseModel):
    """Schema for updating cluster metrics"""

    status: Optional[ClusterStatus] = None
    node_count: Optional[int] = Field(None, ge=0)
    node_ready_count: Optional[int] = Field(None, ge=0)
    pod_count: Optional[int] = Field(None, ge=0)
    pod_running_count: Optional[int] = Field(None, ge=0)
    pod_pending_count: Optional[int] = Field(None, ge=0)
    pod_failed_count: Optional[int] = Field(None, ge=0)
    namespace_count: Optional[int] = Field(None, ge=0)
    service_count: Optional[int] = Field(None, ge=0)
    ingress_count: Optional[int] = Field(None, ge=0)
    pv_count: Optional[int] = Field(None, ge=0)
    pvc_count: Optional[int] = Field(None, ge=0)
    cpu_usage_percent: Optional[float] = Field(None, ge=0, le=100)
    memory_usage_percent: Optional[float] = Field(None, ge=0, le=100)
    storage_usage_percent: Optional[float] = Field(None, ge=0, le=100)
    network_in_bytes: Optional[int] = Field(None, ge=0)
    network_out_bytes: Optional[int] = Field(None, ge=0)
    last_metrics_update: Optional[datetime] = None


class ClusterNode(BaseModel):
    """Schema for cluster node information"""

    name: str
    status: NodeStatus
    version: Optional[str] = None
    os_image: Optional[str] = None
    kernel_version: Optional[str] = None
    container_runtime: Optional[str] = None
    cpu_capacity: Optional[str] = None
    memory_capacity: Optional[str] = None
    pod_capacity: Optional[int] = None
    pod_count: Optional[int] = None
    conditions: Optional[List[Dict[str, Any]]] = None
    metrics: Optional[NodeMetrics] = None
    created_at: Optional[datetime] = None


class Cluster(ClusterBase):
    """Complete cluster schema for responses"""

    id: int
    project_id: int
    external_id: Optional[str] = None
    status: ClusterStatus

    # Node metrics
    node_count: int = 0
    node_ready_count: int = 0

    # Pod metrics
    pod_count: int = 0
    pod_running_count: int = 0
    pod_pending_count: int = 0
    pod_failed_count: int = 0

    # Resource metrics
    namespace_count: int = 0
    service_count: int = 0
    ingress_count: int = 0
    pv_count: int = 0
    pvc_count: int = 0

    # Usage metrics
    cpu_usage_percent: Optional[float] = None
    memory_usage_percent: Optional[float] = None
    storage_usage_percent: Optional[float] = None
    network_in_bytes: Optional[int] = None
    network_out_bytes: Optional[int] = None

    # Timestamps
    last_metrics_update: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Related data
    nodes: Optional[List[ClusterNode]] = None

    class Config:
        from_attributes = True


class ClusterHealth(BaseModel):
    """Cluster health assessment schema"""

    health_score: float = Field(..., ge=0, le=100)
    status: ClusterStatus
    issues: List[str] = []
    recommendations: List[str] = []
    node_health: Dict[str, float] = {}
    resource_utilization: Dict[str, float] = {}


class ClusterWithHealth(Cluster):
    """Cluster with health assessment"""

    health: ClusterHealth


class ClusterStats(BaseModel):
    """Cluster statistics schema"""

    uptime_percentage: float = Field(..., ge=0, le=100)
    average_cpu_usage: float = Field(..., ge=0, le=100)
    average_memory_usage: float = Field(..., ge=0, le=100)
    total_deployments: int = Field(..., ge=0)
    failed_deployments: int = Field(..., ge=0)
    success_rate: float = Field(..., ge=0, le=100)
    cost_per_day: Optional[float] = None


class ClusterWithStats(Cluster):
    """Cluster with computed statistics"""

    stats: ClusterStats


class KubernetesMetrics(BaseModel):
    """Schema for raw Kubernetes metrics data"""

    nodes: List[Dict[str, Any]]
    pods: List[Dict[str, Any]]
    services: List[Dict[str, Any]]
    deployments: List[Dict[str, Any]]
    namespaces: List[Dict[str, Any]]
    events: List[Dict[str, Any]]
    metrics_timestamp: datetime


# Aliases for endpoint compatibility
ClusterResponse = Cluster
