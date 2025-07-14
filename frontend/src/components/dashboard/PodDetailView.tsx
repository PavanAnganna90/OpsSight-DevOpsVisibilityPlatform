/**
 * Pod Detail View Component
 * 
 * Comprehensive component for displaying detailed pod information including
 * status, resource usage, events, and container details with search/filter capabilities.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StatusIndicator, Button, LoadingSkeleton } from '../ui';
import { useResponsive } from '../../hooks/useResponsive';

// Enhanced Pod interfaces
interface PodDetail {
  id: string;
  name: string;
  namespace: string;
  status: 'Running' | 'Pending' | 'Failed' | 'Succeeded' | 'Unknown' | 'CrashLoopBackOff' | 'ImagePullBackOff';
  phase: string;
  created_at: string;
  started_at?: string;
  node_name?: string;
  restart_count: number;
  cpu_request?: string;
  cpu_limit?: string;
  memory_request?: string;
  memory_limit?: string;
  cpu_usage?: number;
  memory_usage?: number;
  ready: boolean;
  containers: ContainerDetail[];
  events: PodEvent[];
  labels: Record<string, string>;
  annotations: Record<string, string>;
}

interface ContainerDetail {
  name: string;
  image: string;
  status: 'Running' | 'Waiting' | 'Terminated';
  ready: boolean;
  restart_count: number;
  state_reason?: string;
  state_message?: string;
  cpu_usage?: number;
  memory_usage?: number;
  ports: ContainerPort[];
}

interface ContainerPort {
  name?: string;
  container_port: number;
  protocol: string;
}

interface PodEvent {
  type: 'Normal' | 'Warning';
  reason: string;
  message: string;
  timestamp: string;
  source: string;
}

interface PodDetailViewProps {
  clusterId: string;
  namespace?: string;
  onPodSelect?: (pod: PodDetail) => void;
  onContainerLogsRequest?: (podName: string, containerName: string) => void;
  className?: string;
}

// Filter and search interfaces
interface PodFilters {
  namespace: string;
  status: string;
  nodeName: string;
  search: string;
}

/**
 * PodDetailView Component
 * 
 * Displays comprehensive pod information with search, filtering, and drill-down capabilities.
 */
export const PodDetailView: React.FC<PodDetailViewProps> = ({
  clusterId,
  namespace,
  onPodSelect,
  onContainerLogsRequest,
  className = ''
}) => {
  // State management
  const [pods, setPods] = useState<PodDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPod, setSelectedPod] = useState<PodDetail | null>(null);
  const [expandedPods, setExpandedPods] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<PodFilters>({
    namespace: namespace || '',
    status: '',
    nodeName: '',
    search: ''
  });

  // Available filter options
  const [availableNamespaces, setAvailableNamespaces] = useState<string[]>([]);
  const [availableNodes, setAvailableNodes] = useState<string[]>([]);

  // Responsive design
  const { isMobile } = useResponsive();

  // Fetch pods data
  const fetchPods = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (filters.namespace) params.append('namespace', filters.namespace);
      if (filters.status) params.append('status', filters.status);
      if (filters.nodeName) params.append('node_name', filters.nodeName);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/v1/kubernetes/clusters/${clusterId}/pods?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pods: ${response.statusText}`);
      }

      const data = await response.json();
      setPods(data.pods || []);
      
      // Extract available options for filters
      const namespaces = [...new Set(data.pods?.map((p: PodDetail) => p.namespace) || [])] as string[];
      const nodes = [...new Set(data.pods?.map((p: PodDetail) => p.node_name).filter(Boolean) || [])] as string[];
      setAvailableNamespaces(namespaces.sort());
      setAvailableNodes(nodes.sort());
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pods');
    } finally {
      setLoading(false);
    }
  }, [clusterId, filters]);

  // Initial load and filter changes
  useEffect(() => {
    fetchPods();
  }, [fetchPods]);

  // Filter pods based on current filters
  const filteredPods = useMemo(() => {
    return pods.filter(pod => {
      const matchesNamespace = !filters.namespace || pod.namespace === filters.namespace;
      const matchesStatus = !filters.status || pod.status === filters.status;
      const matchesNode = !filters.nodeName || pod.node_name === filters.nodeName;
      const matchesSearch = !filters.search || 
        pod.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        pod.namespace.toLowerCase().includes(filters.search.toLowerCase());
      
      return matchesNamespace && matchesStatus && matchesNode && matchesSearch;
    });
  }, [pods, filters]);

  // Get status color for pod status
  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (status) {
      case 'Running': return 'success';
      case 'Pending': return 'warning';
      case 'Failed':
      case 'CrashLoopBackOff': return 'error';
      case 'Succeeded': return 'info';
      default: return 'neutral';
    }
  };

  // Format resource values
  const formatResource = (value?: string): string => {
    if (!value) return 'Not set';
    return value;
  };

  // Format duration
  const formatDuration = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  // Toggle pod expansion
  const togglePodExpansion = (podId: string) => {
    const newExpanded = new Set(expandedPods);
    if (newExpanded.has(podId)) {
      newExpanded.delete(podId);
    } else {
      newExpanded.add(podId);
    }
    setExpandedPods(newExpanded);
  };

  // Handle pod selection
  const handlePodSelect = (pod: PodDetail) => {
    setSelectedPod(pod);
    onPodSelect?.(pod);
  };

  // Handle container logs request
  const handleContainerLogs = (podName: string, containerName: string) => {
    onContainerLogsRequest?.(podName, containerName);
  };

  // Loading state
  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(5)].map((_, i) => (
          <LoadingSkeleton key={i} variant="card" />
        ))}
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
              Failed to load pod data
            </h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            <div className="mt-4">
              <Button
                onClick={() => {
                  setError(null);
                  fetchPods();
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
      {/* Header and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Pod Details ({filteredPods.length} pods)
        </h3>
        
        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search pods..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800"
            />
          </div>

          {/* Namespace Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Namespace
            </label>
            <select
              value={filters.namespace}
              onChange={(e) => setFilters(prev => ({ ...prev, namespace: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800"
            >
              <option value="">All Namespaces</option>
              {availableNamespaces.map(ns => (
                <option key={ns} value={ns}>{ns}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800"
            >
              <option value="">All Status</option>
              <option value="Running">Running</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
              <option value="Succeeded">Succeeded</option>
              <option value="CrashLoopBackOff">CrashLoopBackOff</option>
              <option value="ImagePullBackOff">ImagePullBackOff</option>
            </select>
          </div>

          {/* Node Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Node
            </label>
            <select
              value={filters.nodeName}
              onChange={(e) => setFilters(prev => ({ ...prev, nodeName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800"
            >
              <option value="">All Nodes</option>
              {availableNodes.map(node => (
                <option key={node} value={node}>{node}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-end">
          <Button
            onClick={fetchPods}
            size="sm"
            variant="outline"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Pod List */}
      <div className="space-y-4">
        {filteredPods.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="text-gray-400 dark:text-gray-600">
              <svg className="mx-auto h-16 w-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No pods found
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No pods match the current filters. Try adjusting your search criteria.
              </p>
            </div>
          </div>
        ) : (
          filteredPods.map((pod) => (
            <div
              key={pod.id}
              className={`
                bg-white dark:bg-gray-800 rounded-lg shadow border transition-all duration-200
                ${selectedPod?.id === pod.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}
              `}
            >
              {/* Pod Header */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => handlePodSelect(pod)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <StatusIndicator 
                      status={getStatusColor(pod.status)} 
                      size="sm"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {pod.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {pod.namespace} • {pod.node_name || 'Unscheduled'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {pod.status} • {formatDuration(pod.created_at)}
                    </div>
                    <Button
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        togglePodExpansion(pod.id);
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <svg 
                        className={`h-4 w-4 transition-transform ${expandedPods.has(pod.id) ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Restarts:</span>
                    <span className="ml-1 font-medium">{pod.restart_count}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Ready:</span>
                    <span className="ml-1 font-medium">{pod.ready ? 'Yes' : 'No'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Containers:</span>
                    <span className="ml-1 font-medium">{pod.containers.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Age:</span>
                    <span className="ml-1 font-medium">{formatDuration(pod.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedPods.has(pod.id) && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-6">
                  {/* Resource Usage */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Resource Usage
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 dark:text-gray-100">CPU</div>
                          <div className="text-gray-600 dark:text-gray-400">
                            Request: {formatResource(pod.cpu_request)}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            Limit: {formatResource(pod.cpu_limit)}
                          </div>
                          {pod.cpu_usage && (
                            <div className="text-gray-600 dark:text-gray-400">
                              Usage: {Math.round(pod.cpu_usage)}%
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 dark:text-gray-100">Memory</div>
                          <div className="text-gray-600 dark:text-gray-400">
                            Request: {formatResource(pod.memory_request)}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            Limit: {formatResource(pod.memory_limit)}
                          </div>
                          {pod.memory_usage && (
                            <div className="text-gray-600 dark:text-gray-400">
                              Usage: {Math.round(pod.memory_usage)}%
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Containers */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Containers ({pod.containers.length})
                    </h5>
                    <div className="space-y-3">
                      {pod.containers.map((container, index) => (
                        <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <StatusIndicator 
                                status={getStatusColor(container.status)} 
                                size="sm"
                              />
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {container.name}
                              </span>
                            </div>
                            <Button
                              onClick={() => handleContainerLogs(pod.name, container.name)}
                              size="sm"
                              variant="outline"
                            >
                              <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Logs
                            </Button>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <div>Image: {container.image}</div>
                            <div>Status: {container.status}</div>
                            <div>Restarts: {container.restart_count}</div>
                            {container.state_reason && (
                              <div>Reason: {container.state_reason}</div>
                            )}
                          </div>
                          {container.ports.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ports:</div>
                              <div className="flex flex-wrap gap-2">
                                {container.ports.map((port, portIndex) => (
                                  <span 
                                    key={portIndex}
                                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded"
                                  >
                                    {port.container_port}/{port.protocol}
                                    {port.name && ` (${port.name})`}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Events */}
                  {pod.events.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                        Recent Events
                      </h5>
                      <div className="space-y-2">
                        {pod.events.slice(0, 5).map((event, index) => (
                          <div key={index} className="flex items-start space-x-3 text-sm">
                            <div className={`w-2 h-2 rounded-full mt-1.5 ${
                              event.type === 'Warning' ? 'bg-yellow-500' : 'bg-green-500'
                            }`} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {event.reason}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
                                  {formatDuration(event.timestamp)}
                                </span>
                              </div>
                              <div className="text-gray-600 dark:text-gray-400">
                                {event.message}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PodDetailView; 