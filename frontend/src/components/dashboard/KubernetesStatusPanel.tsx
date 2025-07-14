/**
 * Kubernetes Cluster Status Panel Component
 * 
 * Comprehensive dashboard panel for monitoring Kubernetes cluster health,
 * including cluster overview, node status, resource utilization, and alerts.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StatusIndicator, MetricCard, MetricCardGrid, LoadingSkeleton, Button } from '../ui';
import { ClusterNodeMap } from '../charts';
import { useResponsive } from '../../hooks/useResponsive';
import { useKubernetesEvents, useWebSocketConnection } from '../../hooks/useKubernetesEvents';
import PodDetailView from './PodDetailView';
import ContainerLogsViewer from './ContainerLogsViewer';
import EventsTimeline from './EventsTimeline';
import ResourceUsagePanel from './ResourceUsagePanel';
import { 
  Cluster, 
  ClusterStats, 
  ClusterStatus, 
  NodeDetail, 
  KubernetesMetrics 
} from '../../types/cluster';

interface KubernetesStatusPanelProps {
  /** Optional project ID to filter clusters */
  projectId?: number;
  /** Refresh interval in milliseconds */
  refreshInterval?: number;
  /** Show detailed node view */
  showNodeDetails?: boolean;
  /** Enable real-time updates */
  enableRealTimeUpdates?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// Enhanced types for health scoring and alerts
interface ClusterAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  type: 'resource' | 'node' | 'pod' | 'security' | 'network';
}

interface ClusterHealthScore {
  overall: number;
  breakdown: {
    resources: number;
    nodes: number;
    pods: number;
    network: number;
  };
}

interface PodHealthBreakdown {
  running: number;
  pending: number;
  failed: number;
  succeeded: number;
  unknown: number;
  crashLoopBackOff: number;
  imagePullBackOff: number;
  total: number;
}

/**
 * AlertIndicator Component for displaying cluster alerts
 */
const AlertIndicator: React.FC<{ alerts: ClusterAlert[] }> = ({ alerts }) => {
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');
  
  if (alerts.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {criticalAlerts.length > 0 ? (
            <svg className="h-6 w-6 text-red-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ) : (
            <svg className="h-6 w-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
            {criticalAlerts.length > 0 ? 'Critical Issues Detected' : 'Warnings Detected'}
          </h4>
          <div className="mt-2 text-sm text-red-700 dark:text-red-300">
            {criticalAlerts.length > 0 && (
              <div className="mb-2">
                <span className="font-medium">{criticalAlerts.length} Critical:</span>
                <ul className="ml-4 list-disc">
                  {criticalAlerts.slice(0, 3).map(alert => (
                    <li key={alert.id}>{alert.message}</li>
                  ))}
                </ul>
              </div>
            )}
            {warningAlerts.length > 0 && (
              <div>
                <span className="font-medium">{warningAlerts.length} Warning{warningAlerts.length > 1 ? 's' : ''}</span>
                {warningAlerts.length <= 3 && (
                  <ul className="ml-4 list-disc">
                    {warningAlerts.map(alert => (
                      <li key={alert.id}>{alert.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * HealthScoreIndicator Component for displaying cluster health score
 */
const HealthScoreIndicator: React.FC<{ healthScore: ClusterHealthScore }> = ({ healthScore }) => {
  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 70) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 90) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 80) return 'bg-yellow-100 dark:bg-yellow-900/30';
    if (score >= 70) return 'bg-orange-100 dark:bg-orange-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  return (
    <div className={`${getScoreBgColor(healthScore.overall)} rounded-lg p-4 border`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Cluster Health Score</h4>
        <div className={`text-2xl font-bold ${getScoreColor(healthScore.overall)}`}>
          {Math.round(healthScore.overall)}%
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Resources:</span>
          <span className={getScoreColor(healthScore.breakdown.resources)}>
            {Math.round(healthScore.breakdown.resources)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Nodes:</span>
          <span className={getScoreColor(healthScore.breakdown.nodes)}>
            {Math.round(healthScore.breakdown.nodes)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Pods:</span>
          <span className={getScoreColor(healthScore.breakdown.pods)}>
            {Math.round(healthScore.breakdown.pods)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Network:</span>
          <span className={getScoreColor(healthScore.breakdown.network)}>
            {Math.round(healthScore.breakdown.network)}%
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * PodHealthVisualization Component for detailed pod status breakdown
 */
const PodHealthVisualization: React.FC<{ podHealth: PodHealthBreakdown }> = ({ podHealth }) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      case 'succeeded': return 'bg-blue-500';
      case 'crashLoopBackOff': return 'bg-red-600';
      case 'imagePullBackOff': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusPercentage = (count: number): number => {
    return podHealth.total > 0 ? (count / podHealth.total) * 100 : 0;
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Pod Health Breakdown</h4>
      
      {/* Visual Bar Chart */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
        <div className="h-full flex">
          {podHealth.running > 0 && (
            <div 
              className="bg-green-500 h-full" 
              style={{ width: `${getStatusPercentage(podHealth.running)}%` }}
              title={`Running: ${podHealth.running} pods`}
            />
          )}
          {podHealth.pending > 0 && (
            <div 
              className="bg-yellow-500 h-full" 
              style={{ width: `${getStatusPercentage(podHealth.pending)}%` }}
              title={`Pending: ${podHealth.pending} pods`}
            />
          )}
          {podHealth.failed > 0 && (
            <div 
              className="bg-red-500 h-full" 
              style={{ width: `${getStatusPercentage(podHealth.failed)}%` }}
              title={`Failed: ${podHealth.failed} pods`}
            />
          )}
          {podHealth.crashLoopBackOff > 0 && (
            <div 
              className="bg-red-600 h-full" 
              style={{ width: `${getStatusPercentage(podHealth.crashLoopBackOff)}%` }}
              title={`CrashLoop: ${podHealth.crashLoopBackOff} pods`}
            />
          )}
          {podHealth.imagePullBackOff > 0 && (
            <div 
              className="bg-orange-500 h-full" 
              style={{ width: `${getStatusPercentage(podHealth.imagePullBackOff)}%` }}
              title={`ImagePull: ${podHealth.imagePullBackOff} pods`}
            />
          )}
          {podHealth.unknown > 0 && (
            <div 
              className="bg-gray-500 h-full" 
              style={{ width: `${getStatusPercentage(podHealth.unknown)}%` }}
              title={`Unknown: ${podHealth.unknown} pods`}
            />
          )}
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {podHealth.running > 0 && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">Running: {podHealth.running}</span>
          </div>
        )}
        {podHealth.pending > 0 && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">Pending: {podHealth.pending}</span>
          </div>
        )}
        {podHealth.failed > 0 && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">Failed: {podHealth.failed}</span>
          </div>
        )}
        {podHealth.crashLoopBackOff > 0 && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
            <span className="text-gray-600 dark:text-gray-400">CrashLoop: {podHealth.crashLoopBackOff}</span>
          </div>
        )}
        {podHealth.imagePullBackOff > 0 && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">ImagePull: {podHealth.imagePullBackOff}</span>
          </div>
        )}
        {podHealth.unknown > 0 && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">Unknown: {podHealth.unknown}</span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * KubernetesStatusPanel Component
 * 
 * Displays comprehensive Kubernetes cluster monitoring information including:
 * - Cluster health overview with status indicators
 * - Resource utilization metrics and trends
 * - Node status visualization and details
 * - Real-time updates and filtering
 * - Interactive cluster management
 * - Enhanced alerting and health scoring
 */
export const KubernetesStatusPanel: React.FC<KubernetesStatusPanelProps> = ({
  projectId,
  refreshInterval = 30000, // 30 seconds default
  showNodeDetails = true,
  enableRealTimeUpdates = true,
  className = ''
}) => {
  // State management
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeDetail | undefined>(undefined);
  const [clusterStats, setClusterStats] = useState<ClusterStats | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<KubernetesMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [filterStatus, setFilterStatus] = useState<ClusterStatus | 'all'>('all');

  // Enhanced state for alerts and health
  const [clusterAlerts, setClusterAlerts] = useState<ClusterAlert[]>([]);
  const [healthScore, setHealthScore] = useState<ClusterHealthScore | null>(null);
  const [podHealthBreakdown, setPodHealthBreakdown] = useState<PodHealthBreakdown | null>(null);

  // Detailed view states
  const [showPodDetails, setShowPodDetails] = useState(false);
  const [showContainerLogs, setShowContainerLogs] = useState(false);
  const [selectedPodForLogs, setSelectedPodForLogs] = useState<{ podName: string; containerName: string } | null>(null);
  const [showEventsTimeline, setShowEventsTimeline] = useState(false);
  const [showResourceUsage, setShowResourceUsage] = useState(false);

  // Real-time updates
  const [eventsState, eventsActions] = useKubernetesEvents({
    clusterId: selectedCluster?.id.toString(),
    enabled: enableRealTimeUpdates,
    autoConnect: enableRealTimeUpdates,
    maxEvents: 50
  });

  const { isConnected: wsConnected, isConnecting: wsConnecting, error: wsError } = useWebSocketConnection();

  // Responsive design
  const { isMobile, isTablet } = useResponsive();

  // Calculate cluster health score based on metrics
  const calculateHealthScore = useCallback((cluster: Cluster): ClusterHealthScore => {
    // Resource health (CPU, Memory, Storage)
    const cpuHealth = 100 - Math.max(0, (cluster.cpu_utilization_percent || 0) - 70) * 3; // Penalty after 70%
    const memoryHealth = 100 - Math.max(0, (cluster.memory_utilization_percent || 0) - 80) * 2.5; // Penalty after 80%
    const storageHealth = 100 - Math.max(0, (cluster.storage_utilization_percent || 0) - 85) * 2; // Penalty after 85%
    const resourcesScore = Math.max(0, (cpuHealth + memoryHealth + storageHealth) / 3);

    // Node health
    const nodeReadyRatio = cluster.total_nodes > 0 ? (cluster.ready_nodes / cluster.total_nodes) * 100 : 100;
    const nodesScore = Math.max(0, nodeReadyRatio);

    // Pod health
    const podRunningRatio = cluster.total_pods > 0 ? ((cluster.running_pods || 0) / cluster.total_pods) * 100 : 100;
    const podsScore = Math.max(0, podRunningRatio);

    // Network health (simplified - based on overall cluster status)
    const networkScore = cluster.status === 'healthy' ? 100 : 
                        cluster.status === 'warning' ? 75 : 
                        cluster.status === 'critical' ? 40 : 20;

    // Overall score (weighted average)
    const overallScore = (resourcesScore * 0.3) + (nodesScore * 0.25) + (podsScore * 0.25) + (networkScore * 0.2);

    return {
      overall: Math.max(0, Math.min(100, overallScore)),
      breakdown: {
        resources: Math.max(0, Math.min(100, resourcesScore)),
        nodes: Math.max(0, Math.min(100, nodesScore)),
        pods: Math.max(0, Math.min(100, podsScore)),
        network: Math.max(0, Math.min(100, networkScore))
      }
    };
  }, []);

  // Generate cluster alerts based on current metrics
  const generateClusterAlerts = useCallback((cluster: Cluster): ClusterAlert[] => {
    const alerts: ClusterAlert[] = [];
    const timestamp = new Date().toISOString();

    // Resource alerts
    if ((cluster.cpu_utilization_percent || 0) > 90) {
      alerts.push({
        id: `cpu-critical-${cluster.id}`,
        severity: 'critical',
        message: `CPU utilization is critically high at ${Math.round(cluster.cpu_utilization_percent || 0)}%`,
        timestamp,
        type: 'resource'
      });
    } else if ((cluster.cpu_utilization_percent || 0) > 80) {
      alerts.push({
        id: `cpu-warning-${cluster.id}`,
        severity: 'warning',
        message: `CPU utilization is high at ${Math.round(cluster.cpu_utilization_percent || 0)}%`,
        timestamp,
        type: 'resource'
      });
    }

    if ((cluster.memory_utilization_percent || 0) > 95) {
      alerts.push({
        id: `memory-critical-${cluster.id}`,
        severity: 'critical',
        message: `Memory utilization is critically high at ${Math.round(cluster.memory_utilization_percent || 0)}%`,
        timestamp,
        type: 'resource'
      });
    } else if ((cluster.memory_utilization_percent || 0) > 85) {
      alerts.push({
        id: `memory-warning-${cluster.id}`,
        severity: 'warning',
        message: `Memory utilization is high at ${Math.round(cluster.memory_utilization_percent || 0)}%`,
        timestamp,
        type: 'resource'
      });
    }

    // Node alerts
    const nodeReadyRatio = cluster.total_nodes > 0 ? cluster.ready_nodes / cluster.total_nodes : 1;
    if (nodeReadyRatio < 0.8) {
      alerts.push({
        id: `nodes-critical-${cluster.id}`,
        severity: 'critical',
        message: `Only ${cluster.ready_nodes}/${cluster.total_nodes} nodes are ready`,
        timestamp,
        type: 'node'
      });
    } else if (nodeReadyRatio < 0.9) {
      alerts.push({
        id: `nodes-warning-${cluster.id}`,
        severity: 'warning',
        message: `${cluster.ready_nodes}/${cluster.total_nodes} nodes are ready`,
        timestamp,
        type: 'node'
      });
    }

    // Pod alerts
    if ((cluster.failed_pods || 0) > 0) {
      alerts.push({
        id: `pods-failed-${cluster.id}`,
        severity: cluster.failed_pods > 5 ? 'critical' : 'warning',
        message: `${cluster.failed_pods} pod${cluster.failed_pods > 1 ? 's' : ''} in failed state`,
        timestamp,
        type: 'pod'
      });
    }

    if ((cluster.pending_pods || 0) > 10) {
      alerts.push({
        id: `pods-pending-${cluster.id}`,
        severity: 'warning',
        message: `${cluster.pending_pods} pods are pending scheduling`,
        timestamp,
        type: 'pod'
      });
    }

    return alerts;
  }, []);

  // Generate pod health breakdown
  const generatePodHealthBreakdown = useCallback((cluster: Cluster): PodHealthBreakdown => {
    return {
      running: cluster.running_pods || 0,
      pending: cluster.pending_pods || 0,
      failed: cluster.failed_pods || 0,
      succeeded: 0, // Would need additional API data
      unknown: 0, // Would need additional API data
      crashLoopBackOff: 0, // Would need additional API data
      imagePullBackOff: 0, // Would need additional API data
      total: cluster.total_pods || 0
    };
  }, []);

  // Fetch clusters data
  const fetchClusters = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (projectId) params.append('project_id', projectId.toString());
      
      const response = await fetch(`/api/v1/kubernetes/clusters?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch clusters: ${response.statusText}`);
      }

      const data = await response.json();
      setClusters(data);
      
      // Select first cluster if none selected
      if (!selectedCluster && data.length > 0) {
        setSelectedCluster(data[0]);
      }
      
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cluster data');
    }
  }, [projectId, selectedCluster]);

  // Fetch cluster statistics
  const fetchClusterStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (projectId) params.append('project_id', projectId.toString());
      
      const response = await fetch(`/api/v1/kubernetes/stats?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cluster statistics: ${response.statusText}`);
      }

      const data = await response.json();
      setClusterStats(data);
    } catch (err) {
      console.warn('Failed to fetch cluster statistics:', err);
    }
  }, [projectId]);

  // Fetch live metrics for selected cluster
  const fetchLiveMetrics = useCallback(async () => {
    if (!selectedCluster) return;
    
    try {
      const response = await fetch(`/api/v1/kubernetes/clusters/${selectedCluster.id}/metrics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch live metrics: ${response.statusText}`);
      }

      const data = await response.json();
      setLiveMetrics(data);
    } catch (err) {
      console.warn('Failed to fetch live metrics:', err);
    }
  }, [selectedCluster]);

  // Sync cluster health (trigger background sync)
  const syncClusterHealth = useCallback(async () => {
    if (!selectedCluster) return;
    
    try {
      await fetch(`/api/v1/kubernetes/clusters/${selectedCluster.id}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      // Refresh data after sync
      setTimeout(() => {
        fetchClusters();
        fetchLiveMetrics();
      }, 2000);
    } catch (err) {
      console.warn('Failed to sync cluster health:', err);
    }
  }, [selectedCluster, fetchClusters, fetchLiveMetrics]);

  // Initial load and setup refresh intervals
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchClusters(),
        fetchClusterStats()
      ]);
      setLoading(false);
    };

    loadData();
    
    if (enableRealTimeUpdates && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchClusters();
        fetchClusterStats();
        if (selectedCluster) {
          fetchLiveMetrics();
        }
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [fetchClusters, fetchClusterStats, refreshInterval, enableRealTimeUpdates, selectedCluster]);

  // Fetch live metrics when cluster selection changes
  useEffect(() => {
    if (selectedCluster) {
      fetchLiveMetrics();
      
      // Update health score and alerts for selected cluster
      const health = calculateHealthScore(selectedCluster);
      const alerts = generateClusterAlerts(selectedCluster);
      const podHealth = generatePodHealthBreakdown(selectedCluster);
      
      setHealthScore(health);
      setClusterAlerts(alerts);
      setPodHealthBreakdown(podHealth);
    } else {
      setHealthScore(null);
      setClusterAlerts([]);
      setPodHealthBreakdown(null);
    }
  }, [selectedCluster, fetchLiveMetrics, calculateHealthScore, generateClusterAlerts, generatePodHealthBreakdown]);

  // Handle real-time events for optimized updates
  useEffect(() => {
    if (!enableRealTimeUpdates || !eventsState.events.length) return;

    // Process recent events to trigger selective updates
    const recentEvents = eventsState.events.filter(event => {
      const eventTime = new Date(event.timestamp);
      const now = new Date();
      return (now.getTime() - eventTime.getTime()) < 30000; // Last 30 seconds
    });

    if (recentEvents.length === 0) return;

    // Check if any events affect the current cluster
    const clusterEvents = selectedCluster 
      ? recentEvents.filter(event => event.clusterId === selectedCluster.id.toString())
      : recentEvents;

    if (clusterEvents.length === 0) return;

    // Trigger selective updates based on event types
    const hasClusterEvents = clusterEvents.some(e => e.type === 'cluster');
    const hasNodeEvents = clusterEvents.some(e => e.type === 'node');
    const hasPodEvents = clusterEvents.some(e => e.type === 'pod');
    const hasResourceEvents = clusterEvents.some(e => e.type === 'resource');

    // Debounced updates to prevent too frequent refreshes
    const updateTimer = setTimeout(() => {
      if (hasClusterEvents || hasNodeEvents) {
        fetchClusters();
      }
      if (hasResourceEvents || hasPodEvents) {
        fetchLiveMetrics();
      }
      if (selectedCluster && (hasClusterEvents || hasNodeEvents || hasPodEvents || hasResourceEvents)) {
        // Recalculate health metrics
        const health = calculateHealthScore(selectedCluster);
        const alerts = generateClusterAlerts(selectedCluster);
        const podHealth = generatePodHealthBreakdown(selectedCluster);
        
        setHealthScore(health);
        setClusterAlerts(alerts);
        setPodHealthBreakdown(podHealth);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(updateTimer);
  }, [eventsState.events, enableRealTimeUpdates, selectedCluster, fetchClusters, fetchLiveMetrics, calculateHealthScore, generateClusterAlerts, generatePodHealthBreakdown]);

  // Filter clusters by status
  const filteredClusters = useMemo(() => {
    if (filterStatus === 'all') return clusters;
    return clusters.filter(cluster => cluster.status === filterStatus);
  }, [clusters, filterStatus]);

  // Get status color for cluster status
  const getStatusColor = (status: ClusterStatus): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      case 'offline': return 'error';
      case 'unknown': return 'neutral';
      default: return 'neutral';
    }
  };

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num < 1000) return num.toString();
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
    return `${(num / 1000000).toFixed(1)}M`;
  };

  // Format bytes to readable units
  const formatBytes = (bytes?: number): string => {
    if (!bytes) return 'N/A';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Format duration
  const formatDuration = (dateString?: string): string => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Handle node selection
  const handleNodeClick = useCallback((node: NodeDetail) => {
    setSelectedNode(selectedNode?.name === node.name ? undefined : node);
  }, [selectedNode]);

  // Handle detailed view actions
  const handleShowPodDetails = () => {
    setShowPodDetails(true);
  };

  const handleClosePodDetails = () => {
    setShowPodDetails(false);
  };

  const handleContainerLogsRequest = (podName: string, containerName: string) => {
    setSelectedPodForLogs({ podName, containerName });
    setShowContainerLogs(true);
  };

  const handleCloseContainerLogs = () => {
    setShowContainerLogs(false);
    setSelectedPodForLogs(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-6 ${className}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Failed to load cluster data
            </h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            <div className="mt-4">
              <Button
                onClick={() => {
                  setError(null);
                  fetchClusters();
                }}
                size="sm"
                variant="outline"
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No clusters state
  if (clusters.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-400 dark:text-gray-600">
          <svg className="mx-auto h-16 w-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Kubernetes Clusters
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            No clusters are configured for monitoring. Add a cluster to get started.
          </p>
          <Button onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Kubernetes Clusters
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor cluster health, resource utilization, and node status
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ClusterStatus | 'all')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800"
          >
            <option value="all">All Status</option>
            <option value="healthy">Healthy</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
            <option value="offline">Offline</option>
          </select>

          {/* Events Timeline Toggle */}
          <Button
            onClick={() => setShowEventsTimeline(!showEventsTimeline)}
            size="sm"
            variant={showEventsTimeline ? "primary" : "outline"}
            className="relative"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Events
            {enableRealTimeUpdates && (
              <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                wsConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
            )}
          </Button>

          {/* Resource Usage Toggle */}
          <Button
            onClick={() => setShowResourceUsage(!showResourceUsage)}
            size="sm"
            variant={showResourceUsage ? "primary" : "outline"}
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Resources
          </Button>

          {/* Sync Button */}
          <Button
            onClick={syncClusterHealth}
            disabled={!selectedCluster}
            size="sm"
            variant="outline"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync Health
          </Button>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Last updated: {formatDuration(lastRefresh.toISOString())}
          </div>
        </div>
      </div>

      {/* Overall Statistics */}
      {clusterStats && (
        <MetricCardGrid columns={{ sm: 2, md: 3, lg: 5 }} gap="md">
          <MetricCard
            title="Total Clusters"
            value={clusterStats.total_clusters}
            icon={
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
            size="sm"
          />
          
          <MetricCard
            title="Healthy Clusters"
            value={clusterStats.healthy_clusters}
            subtitle={`${Math.round((clusterStats.healthy_clusters / clusterStats.total_clusters) * 100)}% healthy`}
            icon={
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            size="sm"
          />
          
          <MetricCard
            title="Total Nodes"
            value={formatNumber(clusterStats.total_nodes)}
            icon={
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
            }
            size="sm"
          />
          
          <MetricCard
            title="Total Pods"
            value={formatNumber(clusterStats.total_pods)}
            icon={
              <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            size="sm"
          />
          
          <MetricCard
            title="Avg CPU Usage"
            value={`${Math.round(clusterStats.average_cpu_utilization)}%`}
            trend={{
              value: clusterStats.average_cpu_utilization < 70 ? 'Good' : 'High',
              direction: clusterStats.average_cpu_utilization < 70 ? 'neutral' : 'up'
            }}
            icon={
              <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            size="sm"
          />
        </MetricCardGrid>
      )}

      {/* Cluster Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Cluster Overview
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          {filteredClusters.map((cluster) => (
            <div
              key={cluster.id}
              className={`
                p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
                ${selectedCluster?.id === cluster.id 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
              onClick={() => setSelectedCluster(cluster)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {cluster.display_name || cluster.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {cluster.provider} • {cluster.region}
                  </p>
                </div>
                <StatusIndicator 
                  status={getStatusColor(cluster.status)} 
                  size="sm"
                  label={cluster.status}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Nodes:</span>
                  <span className="ml-1 font-medium">{cluster.ready_nodes}/{cluster.total_nodes}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Pods:</span>
                  <span className="ml-1 font-medium">{cluster.running_pods}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">CPU:</span>
                  <span className="ml-1 font-medium">{Math.round(cluster.cpu_utilization_percent || 0)}%</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Memory:</span>
                  <span className="ml-1 font-medium">{Math.round(cluster.memory_utilization_percent || 0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cluster Health and Alerts */}
      {selectedCluster && clusterAlerts.length > 0 && (
        <AlertIndicator alerts={clusterAlerts} />
      )}

      {/* Selected Cluster Details */}
      {selectedCluster && (
        <div className="space-y-6">
          {/* Health Score and Pod Health Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {healthScore && (
              <HealthScoreIndicator healthScore={healthScore} />
            )}
            {podHealthBreakdown && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <PodHealthVisualization podHealth={podHealthBreakdown} />
              </div>
            )}
          </div>

          {/* Resource Metrics Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Cluster Resource Metrics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Resource Utilization
            </h3>
            
            <MetricCardGrid columns={{ sm: 1, md: 2 }} gap="md">
              <MetricCard
                title="CPU Usage"
                value={`${Math.round(selectedCluster.cpu_utilization_percent || 0)}%`}
                subtitle={`${selectedCluster.used_cpu_cores || 0} of ${selectedCluster.allocatable_cpu_cores || 0} cores`}
                trend={{
                  value: `${Math.round(selectedCluster.cpu_utilization_percent || 0)}%`,
                  direction: (selectedCluster.cpu_utilization_percent || 0) > 90 ? 'up' : 
                           (selectedCluster.cpu_utilization_percent || 0) > 80 ? 'neutral' : 'down'
                }}
                icon={
                  <svg className={`h-6 w-6 ${
                    (selectedCluster.cpu_utilization_percent || 0) > 90 ? 'text-red-600' :
                    (selectedCluster.cpu_utilization_percent || 0) > 80 ? 'text-orange-600' :
                    'text-green-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
                size="md"
                className={
                  (selectedCluster.cpu_utilization_percent || 0) > 90 ? 'border-red-300 bg-red-50 dark:bg-red-900/20' :
                  (selectedCluster.cpu_utilization_percent || 0) > 80 ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/20' :
                  ''
                }
              />
              
              <MetricCard
                title="Memory Usage"
                value={`${Math.round(selectedCluster.memory_utilization_percent || 0)}%`}
                subtitle={`${formatBytes((selectedCluster.used_memory_gb || 0) * 1024 * 1024 * 1024)} of ${formatBytes((selectedCluster.allocatable_memory_gb || 0) * 1024 * 1024 * 1024)}`}
                trend={{
                  value: `${Math.round(selectedCluster.memory_utilization_percent || 0)}%`,
                  direction: (selectedCluster.memory_utilization_percent || 0) > 95 ? 'up' : 
                           (selectedCluster.memory_utilization_percent || 0) > 85 ? 'neutral' : 'down'
                }}
                icon={
                  <svg className={`h-6 w-6 ${
                    (selectedCluster.memory_utilization_percent || 0) > 95 ? 'text-red-600' :
                    (selectedCluster.memory_utilization_percent || 0) > 85 ? 'text-orange-600' :
                    'text-green-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                }
                size="md"
                className={
                  (selectedCluster.memory_utilization_percent || 0) > 95 ? 'border-red-300 bg-red-50 dark:bg-red-900/20' :
                  (selectedCluster.memory_utilization_percent || 0) > 85 ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/20' :
                  ''
                }
              />
              
              <MetricCard
                title="Storage Usage"
                value={`${Math.round(selectedCluster.storage_utilization_percent || 0)}%`}
                subtitle={`${formatBytes((selectedCluster.used_storage_gb || 0) * 1024 * 1024 * 1024)} of ${formatBytes((selectedCluster.total_storage_gb || 0) * 1024 * 1024 * 1024)}`}
                trend={{
                  value: `${Math.round(selectedCluster.storage_utilization_percent || 0)}%`,
                  direction: (selectedCluster.storage_utilization_percent || 0) > 90 ? 'up' : 
                           (selectedCluster.storage_utilization_percent || 0) > 80 ? 'neutral' : 'down'
                }}
                icon={
                  <svg className={`h-6 w-6 ${
                    (selectedCluster.storage_utilization_percent || 0) > 90 ? 'text-red-600' :
                    (selectedCluster.storage_utilization_percent || 0) > 80 ? 'text-orange-600' :
                    'text-blue-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                }
                size="md"
                className={
                  (selectedCluster.storage_utilization_percent || 0) > 90 ? 'border-red-300 bg-red-50 dark:bg-red-900/20' :
                  (selectedCluster.storage_utilization_percent || 0) > 80 ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/20' :
                  ''
                }
              />
              
              <MetricCard
                title="Pod Count"
                value={selectedCluster.running_pods}
                subtitle={`${selectedCluster.pending_pods} pending, ${selectedCluster.failed_pods} failed`}
                icon={
                  <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                }
                size="md"
              />
            </MetricCardGrid>
          </div>

          {/* Node Status Visualization */}
          {showNodeDetails && selectedCluster.node_details && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Node Status Map
              </h3>
              
              <ClusterNodeMap
                nodes={selectedCluster.node_details}
                onNodeClick={handleNodeClick}
                selectedNode={selectedNode}
                showTooltip={true}
                gridConfig={{ columns: 'auto', maxWidth: '100%' }}
                size={isMobile ? 'sm' : 'md'}
              />
              
              {/* Selected Node Details */}
              {selectedNode && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Node Details: {selectedNode.name}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Status:</span>
                      <StatusIndicator 
                        status={getStatusColor(selectedNode.status as ClusterStatus)} 
                        size="sm"
                        label={selectedNode.status}
                        className="ml-2"
                      />
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Last Heartbeat:</span>
                      <span className="ml-2">{formatDuration(selectedNode.last_heartbeat)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">CPU Usage:</span>
                      <span className="ml-2">{Math.round(selectedNode.cpu_usage || 0)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Memory Usage:</span>
                      <span className="ml-2">{Math.round(selectedNode.memory_usage || 0)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Disk Usage:</span>
                      <span className="ml-2">{Math.round(selectedNode.disk_usage || 0)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Workload Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Workload Summary
            </h3>
            <div className="flex space-x-2">
              <Button
                onClick={handleShowPodDetails}
                size="sm"
                variant="outline"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Pod Details
              </Button>
            </div>
          </div>
          
          <MetricCardGrid columns={{ sm: 2, md: 3, lg: 6 }} gap="sm">
            <MetricCard
              title="Namespaces"
              value={selectedCluster?.total_namespaces || 0}
              size="sm"
            />
            <MetricCard
              title="Services"
              value={selectedCluster?.total_services || 0}
              size="sm"
            />
            <MetricCard
              title="Ingresses"
              value={selectedCluster?.total_ingresses || 0}
              size="sm"
            />
            <MetricCard
              title="Deployments"
              value={selectedCluster?.total_deployments || 0}
              size="sm"
            />
            <MetricCard
              title="StatefulSets"
              value={selectedCluster?.total_statefulsets || 0}
              size="sm"
            />
            <MetricCard
              title="DaemonSets"
              value={selectedCluster?.total_daemonsets || 0}
              size="sm"
            />
          </MetricCardGrid>
        </div>
      </div>
      )}

      {/* Events Timeline */}
      {showEventsTimeline && (
        <div className="mt-6">
          <EventsTimeline
            clusterId={selectedCluster?.id.toString()}
            maxEvents={100}
            showConnectionStatus={true}
            autoRefresh={enableRealTimeUpdates}
            className="max-h-96"
          />
        </div>
      )}

      {/* Resource Usage Panel */}
      {showResourceUsage && selectedCluster && (
        <div className="mt-6">
                     <ResourceUsagePanel
             currentMetrics={liveMetrics ? {
               cpu: {
                 usage: liveMetrics.resource_metrics.cpu.used || 0,
                 limit: liveMetrics.resource_metrics.cpu.allocatable || 1,
                 requests: liveMetrics.resource_metrics.cpu.used || 0
               },
               memory: {
                 usage: (liveMetrics.resource_metrics.memory.used_gb || 0) * 1024,
                 limit: (liveMetrics.resource_metrics.memory.allocatable_gb || 1) * 1024,
                 requests: (liveMetrics.resource_metrics.memory.used_gb || 0) * 1024
               },
               storage: {
                 usage: liveMetrics.resource_metrics.storage.used_gb || 0,
                 limit: liveMetrics.resource_metrics.storage.total_gb || 100
               },
               network: {
                 inbound: selectedCluster.network_in_bytes || 0,
                 outbound: selectedCluster.network_out_bytes || 0
               }
             } : {
               cpu: {
                 usage: selectedCluster.used_cpu_cores || 0,
                 limit: selectedCluster.allocatable_cpu_cores || 1,
                 requests: selectedCluster.used_cpu_cores || 0
               },
               memory: {
                 usage: (selectedCluster.used_memory_gb || 0) * 1024,
                 limit: (selectedCluster.allocatable_memory_gb || 1) * 1024,
                 requests: (selectedCluster.used_memory_gb || 0) * 1024
               },
               storage: {
                 usage: selectedCluster.used_storage_gb || 0,
                 limit: selectedCluster.total_storage_gb || 100
               },
               network: {
                 inbound: selectedCluster.network_in_bytes || 0,
                 outbound: selectedCluster.network_out_bytes || 0
               }
             }}
            clusterId={selectedCluster.id.toString()}
            realTimeEnabled={enableRealTimeUpdates}
            title={`${selectedCluster.name} Resource Monitoring`}
            showTrends={true}
            defaultTimeRange="24h"
            className="max-h-[600px]"
          />
        </div>
      )}

      {/* Real-time Connection Status */}
      {enableRealTimeUpdates && wsError && (
        <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Real-time Connection Issue
              </h3>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                {wsError} - Falling back to polling updates every {Math.round(refreshInterval / 1000)} seconds.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pod Detail View Modal */}
      {showPodDetails && selectedCluster && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Pod Details - {selectedCluster.name}
              </h3>
              <Button
                onClick={handleClosePodDetails}
                size="sm"
                variant="ghost"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <PodDetailView
                clusterId={selectedCluster.id.toString()}
                onContainerLogsRequest={handleContainerLogsRequest}
              />
            </div>
          </div>
        </div>
      )}

      {/* Container Logs Modal */}
      {showContainerLogs && selectedPodForLogs && selectedCluster && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="overflow-y-auto max-h-[90vh]">
              <ContainerLogsViewer
                clusterId={selectedCluster.id.toString()}
                podName={selectedPodForLogs.podName}
                containerName={selectedPodForLogs.containerName}
                onClose={handleCloseContainerLogs}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KubernetesStatusPanel;
