/**
 * Enhanced Kubernetes Monitoring Dashboard Component
 * 
 * Advanced monitoring dashboard that integrates with the enhanced backend monitoring service.
 * Features real-time metrics, multi-level caching visualization, and comprehensive cluster insights.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  StatusIndicator, 
  MetricCard, 
  MetricCardGrid, 
  LoadingSkeleton, 
  Button,
  ProgressBar
} from '../ui';
// import { LineChart, AreaChart, DonutChart, HeatmapChart } from '../charts';
import { useResponsive } from '../../hooks/useResponsive';
import { 
  Cluster, 
  ClusterStats, 
  ClusterStatus, 
  NodeDetail, 
  KubernetesMetrics,
  EnhancedClusterOverview,
  CacheStats,
  MetricTransformation
} from '../../types/cluster';

interface EnhancedKubernetesMonitorProps {
  /** Optional project ID to filter clusters */
  projectId?: number;
  /** Refresh interval in milliseconds */
  refreshInterval?: number;
  /** Enable advanced metrics */
  showAdvancedMetrics?: boolean;
  /** Enable cache visualization */
  showCacheStats?: boolean;
  /** Enable real-time updates */
  enableRealTimeUpdates?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Enhanced Kubernetes Monitoring Component
 * 
 * Advanced monitoring dashboard featuring:
 * - Real-time cluster health and performance metrics
 * - Multi-level caching visualization and statistics
 * - Enhanced Prometheus integration with query templates
 * - Interactive node and pod visualization
 * - Performance optimization insights
 * - Advanced alerting and trend analysis
 */
export const EnhancedKubernetesMonitor: React.FC<EnhancedKubernetesMonitorProps> = ({
  projectId,
  refreshInterval = 30000,
  showAdvancedMetrics = true,
  showCacheStats = true,
  enableRealTimeUpdates = true,
  className = ''
}) => {
  // State management
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [clusterOverview, setClusterOverview] = useState<EnhancedClusterOverview | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [healthCheck, setHealthCheck] = useState<any>(null);
  const [metrics, setMetrics] = useState<KubernetesMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'degraded'>('disconnected');

  // Responsive design
  const { isMobile, isTablet } = useResponsive();

  // Enhanced API client with error handling and retry logic
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`/api/v1/kubernetes${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }, []);

  // Fetch enhanced cluster overview
  const fetchClusterOverview = useCallback(async (clusterName: string) => {
    try {
      const data = await apiCall(`/enhanced/clusters/${clusterName}/overview`);
      setClusterOverview(data);
      setConnectionStatus('connected');
    } catch (err) {
      console.error('Failed to fetch cluster overview:', err);
      setConnectionStatus('degraded');
      throw err;
    }
  }, [apiCall]);

  // Fetch cache statistics
  const fetchCacheStats = useCallback(async () => {
    try {
      const data = await apiCall('/enhanced/cache/stats');
      setCacheStats(data);
    } catch (err) {
      console.warn('Failed to fetch cache stats:', err);
    }
  }, [apiCall]);

  // Fetch service health check
  const fetchHealthCheck = useCallback(async () => {
    try {
      const data = await apiCall('/enhanced/health');
      setHealthCheck(data);
      
      // Update connection status based on health
      if (data.status === 'healthy') {
        setConnectionStatus('connected');
      } else if (data.status === 'degraded') {
        setConnectionStatus('degraded');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (err) {
      console.warn('Failed to fetch health check:', err);
      setConnectionStatus('disconnected');
    }
  }, [apiCall]);

  // Fetch clusters
  const fetchClusters = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (projectId) params.append('project_id', projectId.toString());
      
      const data = await apiCall(`/clusters?${params}`);
      setClusters(data);
      
      // Select first cluster if none selected
      if (!selectedCluster && data.length > 0) {
        setSelectedCluster(data[0]);
      }
      
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cluster data');
      setConnectionStatus('disconnected');
    }
  }, [projectId, selectedCluster, apiCall]);

  // Fetch enhanced metrics for selected cluster
  const fetchEnhancedMetrics = useCallback(async () => {
    if (!selectedCluster) return;
    
    try {
      // Fetch both standard metrics and enhanced overview
      const [metricsData, overviewData] = await Promise.all([
        apiCall(`/clusters/${selectedCluster.id}/metrics`),
        fetchClusterOverview(selectedCluster.name)
      ]);
      
      setMetrics(metricsData);
    } catch (err) {
      console.warn('Failed to fetch enhanced metrics:', err);
    }
  }, [selectedCluster, apiCall, fetchClusterOverview]);

  // Initialize data loading
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchClusters(),
          fetchHealthCheck(),
          ...(showCacheStats ? [fetchCacheStats()] : [])
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchClusters, fetchHealthCheck, fetchCacheStats, showCacheStats]);

  // Setup refresh intervals
  useEffect(() => {
    if (!enableRealTimeUpdates || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchClusters();
      fetchHealthCheck();
      if (showCacheStats) fetchCacheStats();
      if (selectedCluster) fetchEnhancedMetrics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [
    enableRealTimeUpdates,
    refreshInterval,
    fetchClusters,
    fetchHealthCheck,
    fetchCacheStats,
    fetchEnhancedMetrics,
    showCacheStats,
    selectedCluster
  ]);

  // Fetch enhanced metrics when cluster selection changes
  useEffect(() => {
    if (selectedCluster) {
      fetchEnhancedMetrics();
    }
  }, [selectedCluster, fetchEnhancedMetrics]);

  // Format utilities
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }, []);

  const formatDuration = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }, []);

  // Get connection status indicator
  const getConnectionStatusColor = useCallback((status: typeof connectionStatus) => {
    switch (status) {
      case 'connected': return 'success';
      case 'degraded': return 'warning';
      case 'disconnected': return 'error';
      default: return 'neutral';
    }
  }, []);

  // Memoized cache performance metrics
  const cachePerformanceMetrics = useMemo(() => {
    if (!cacheStats) return null;

    return [
      {
        name: 'Cache Hit Rate',
        value: `${cacheStats.hit_rate_percent}%`,
        description: 'Percentage of requests served from cache',
        trend: cacheStats.hit_rate_percent > 70 ? 'up' : 'down'
      },
      {
        name: 'Cache Size',
        value: cacheStats.cache_size.toString(),
        description: 'Number of cached metrics',
        trend: 'neutral'
      },
      {
        name: 'Total Requests',
        value: cacheStats.total_requests.toString(),
        description: 'Total cache requests made',
        trend: 'neutral'
      }
    ];
  }, [cacheStats]);

  // Memoized cluster capacity metrics
  const clusterCapacityMetrics = useMemo(() => {
    if (!clusterOverview?.capacity) return null;

    return [
      {
        name: 'CPU Cores',
        value: clusterOverview.capacity.cpu_cores?.toString() || '0',
        unit: 'cores',
        utilization: clusterOverview.utilization?.cpu_percent || 0
      },
      {
        name: 'Memory',
        value: formatBytes(clusterOverview.capacity.memory_bytes || 0),
        unit: '',
        utilization: clusterOverview.utilization?.memory_percent || 0
      }
    ];
  }, [clusterOverview, formatBytes]);

  // Loading state
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Failed to load monitoring data
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
            </div>
            <div className="ml-4">
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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Connection Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Enhanced Kubernetes Monitoring
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Advanced cluster monitoring with real-time metrics and caching insights
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <StatusIndicator
              status={getConnectionStatusColor(connectionStatus)}
              size="sm"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {connectionStatus === 'connected' ? 'Connected' : 
               connectionStatus === 'degraded' ? 'Degraded' : 'Disconnected'}
            </span>
          </div>

          {/* Health Check Status */}
          {healthCheck && (
            <div title={`Service status: ${healthCheck.status}`}>
              <StatusIndicator
                status={healthCheck.status === 'healthy' ? 'success' : 
                        healthCheck.status === 'degraded' ? 'warning' : 'error'}
                size="sm"
              />
            </div>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Last updated: {formatDuration(lastRefresh.toISOString())}
          </div>
        </div>
      </div>

      {/* Cache Performance Section */}
      {showCacheStats && cacheStats && cachePerformanceMetrics && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Cache Performance
          </h3>
          <MetricCardGrid columns={{ sm: 1, md: 2, lg: 3 }} gap="md">
            {cachePerformanceMetrics.map((metric, index) => (
              <MetricCard
                key={index}
                title={metric.name}
                value={metric.value}
                subtitle={metric.description}
                trend={metric.trend ? { direction: (metric.trend as 'up' | 'down' | 'neutral'), value: '' } : undefined}
                size="sm"
              />
            ))}
          </MetricCardGrid>
        </div>
      )}

      {/* Cluster Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Cluster Selection
          </h3>
          {clusters.length > 1 && (
            <select
              value={selectedCluster?.id || ''}
              onChange={(e) => {
                const cluster = clusters.find(c => c.id === parseInt(e.target.value));
                setSelectedCluster(cluster || null);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800"
            >
              {clusters.map((cluster) => (
                <option key={cluster.id} value={cluster.id}>
                  {cluster.display_name || cluster.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedCluster && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                {selectedCluster.display_name || selectedCluster.name}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedCluster.display_name ? `${selectedCluster.display_name} (${selectedCluster.name})` : selectedCluster.name}
              </p>
              <div className="mt-2 flex items-center space-x-4">
                <StatusIndicator
                  status={selectedCluster.status === 'healthy' ? 'success' : 
                          selectedCluster.status === 'warning' ? 'warning' : 'error'}
                  size="sm"
                />
                <span className="text-sm capitalize">{selectedCluster.status}</span>
              </div>
            </div>
            
            {selectedCluster.monitoring_enabled && (
              <div className="text-right">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Monitoring: Enabled
                </div>
                {selectedCluster.prometheus_endpoint && (
                  <div className="text-xs text-gray-400">
                    Prometheus: {selectedCluster.prometheus_endpoint}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enhanced Cluster Overview */}
      {selectedCluster && clusterOverview && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Enhanced Cluster Overview
          </h3>
          
          {/* Capacity and Utilization */}
          {clusterCapacityMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {clusterCapacityMetrics.map((metric, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {metric.name}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {metric.value} {metric.unit}
                    </span>
                  </div>
                  <ProgressBar
                    progress={metric.utilization}
                    className={`${
                      metric.utilization > 80 ? 'text-red-500' : 
                      metric.utilization > 60 ? 'text-yellow-500' : 'text-green-500'
                    }`}
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {metric.utilization.toFixed(1)}% utilized
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Health Status */}
          {clusterOverview.health && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Health Status
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {Object.entries(clusterOverview.health).map(([key, value]) => (
                  <div key={key}>
                    <div className="text-gray-500 dark:text-gray-400 capitalize">
                      {key.replace('_', ' ')}
                    </div>
                    <div className="font-medium">
                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No clusters state */}
      {clusters.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-600">
            <svg className="mx-auto h-16 w-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Clusters Available
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              No Kubernetes clusters are configured for enhanced monitoring.
            </p>
            <Button onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedKubernetesMonitor; 