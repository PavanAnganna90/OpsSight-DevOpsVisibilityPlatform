/**
 * Kubernetes Cluster Type Definitions
 * 
 * TypeScript interfaces for cluster health monitoring data
 * matching the backend API schemas.
 */

export type ClusterStatus = 'healthy' | 'warning' | 'critical' | 'unknown' | 'offline';
export type NodeStatus = 'ready' | 'not_ready' | 'scheduling_disabled' | 'unknown';

export interface NodeDetail {
  name: string;
  status: NodeStatus;
  last_heartbeat: string;
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
}

export interface ClusterMetrics {
  // Node metrics
  total_nodes: number;
  ready_nodes: number;
  not_ready_nodes: number;
  node_details: NodeDetail[];
  
  // Pod metrics
  total_pods: number;
  running_pods: number;
  pending_pods: number;
  failed_pods: number;
  
  // Resource metrics
  total_cpu_cores?: number;
  allocatable_cpu_cores?: number;
  used_cpu_cores?: number;
  cpu_utilization_percent?: number;
  
  total_memory_gb?: number;
  allocatable_memory_gb?: number;
  used_memory_gb?: number;
  memory_utilization_percent?: number;
  
  total_storage_gb?: number;
  used_storage_gb?: number;
  storage_utilization_percent?: number;
  
  // Network metrics
  network_in_bytes?: number;
  network_out_bytes?: number;
  network_errors?: number;
  
  // Workload metrics
  total_namespaces?: number;
  total_services?: number;
  total_ingresses?: number;
  total_deployments?: number;
  total_statefulsets?: number;
  total_daemonsets?: number;
}

export interface Cluster extends ClusterMetrics {
  id: number;
  cluster_id: string;
  name: string;
  display_name?: string;
  version?: string;
  status: ClusterStatus;
  health_score?: number;
  last_health_check?: string;
  
  // Provider information
  provider?: string;
  region?: string;
  zone?: string;
  endpoint_url?: string;
  
  // Configuration
  monitoring_enabled: boolean;
  prometheus_endpoint?: string;
  grafana_dashboard_url?: string;
  log_aggregation_url?: string;
  
  // Alert thresholds
  cpu_alert_threshold: number;
  memory_alert_threshold: number;
  storage_alert_threshold: number;
  
  // Project relationship
  project_id?: number;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  last_sync?: string;
}

export interface ClusterHealth {
  cluster_id: number;
  health_score: number;
  status: ClusterStatus;
  issues: string[];
  recommendations: string[];
  last_checked: string;
}

export interface ClusterStats {
  total_clusters: number;
  healthy_clusters: number;
  warning_clusters: number;
  critical_clusters: number;
  offline_clusters: number;
  total_nodes: number;
  total_pods: number;
  average_cpu_utilization: number;
  average_memory_utilization: number;
  clusters_needing_attention: number;
}

export interface KubernetesMetrics {
  cluster_id: number;
  cluster_name: string;
  timestamp: string;
  node_metrics: {
    total_nodes: number;
    ready_nodes: number;
    not_ready_nodes: number;
    node_details: NodeDetail[];
    cpu_metrics: {
      usage_percent: number;
    };
    memory_metrics: {
      usage_percent: number;
    };
    disk_metrics: {
      usage_percent: number;
    };
  };
  pod_metrics: {
    total_pods: number;
    running_pods: number;
    pending_pods: number;
    failed_pods: number;
    succeeded_pods: number;
  };
  resource_metrics: {
    cpu: {
      total: number;
      allocatable: number;
      used: number;
      utilization_percent: number;
    };
    memory: {
      total_gb: number;
      allocatable_gb: number;
      used_gb: number;
      utilization_percent: number;
    };
    storage: {
      total_gb: number;
      used_gb: number;
      utilization_percent: number;
    };
  };
  workload_metrics: {
    namespaces: number;
    services: number;
    ingresses: number;
    deployments: number;
    statefulsets: number;
    daemonsets: number;
  };
}

// Enhanced types for the new monitoring features
export interface CacheStats {
  cache_size: number;
  total_requests: number;
  cache_hits: number;
  cache_misses: number;
  hit_rate_percent: number;
  miss_rate_percent: number;
  evictions: number;
  last_eviction?: string;
}

export interface MetricTransformation {
  original_value: number;
  transformed_value: number;
  transformation_type: string;
  timestamp: string;
}

export interface CapacityInfo {
  cpu_cores?: number;
  memory_bytes?: number;
  storage_bytes?: number;
  pods?: number;
}

export interface UtilizationInfo {
  cpu_percent: number;
  memory_percent: number;
  storage_percent?: number;
  pods_percent?: number;
}

export interface HealthInfo {
  nodes_ready: boolean;
  api_server_healthy: boolean;
  scheduler_healthy: boolean;
  controller_manager_healthy: boolean;
  etcd_healthy: boolean;
  dns_healthy: boolean;
}

export interface EnhancedClusterOverview {
  cluster_name: string;
  capacity: CapacityInfo;
  utilization: UtilizationInfo;
  health: HealthInfo;
  prometheus_connected: boolean;
  last_updated: string;
}