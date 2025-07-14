/**
 * Playbook Detail View Component
 * 
 * Detailed view for individual Ansible playbook executions.
 * Features:
 * - Task-by-task execution details and status
 * - Host-specific results and error messages
 * - Log output and debugging information
 * - Retry and re-run capabilities
 * - Performance metrics and timing analysis
 * - Export functionality for reports
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AutomationRun, TaskResult, HostResult } from '../../types/automation';
import { automationApi } from '../../services/automationApi';
import { formatDuration, formatRelativeTime } from '../../utils/time';
import { StatusIndicator } from '../ui/StatusIndicator';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { useResponsive } from '../../hooks/useResponsive';

interface PlaybookDetailViewProps {
  /** Automation run ID to display */
  runId: number;
  /** Whether to show logs by default */
  showLogs?: boolean;
  /** Whether to enable retry functionality */
  enableRetry?: boolean;
  /** Custom className for styling */
  className?: string;
  /** Callback when retry is requested */
  onRetry?: (runId: number) => Promise<void>;
  /** Callback when export is requested */
  onExport?: (runId: number, format: 'json' | 'csv' | 'pdf') => void;
  /** Callback when view is closed */
  onClose?: () => void;
}

type TabType = 'overview' | 'tasks' | 'hosts' | 'logs' | 'performance';

/**
 * Get status styling for different result types
 */
const getStatusStyling = (status: string): {
  color: string;
  bgColor: string;
  borderColor: string;
} => {
  switch (status.toLowerCase()) {
    case 'ok':
    case 'success':
    case 'successful':
      return {
        color: '#10B981',
        bgColor: '#D1FAE5',
        borderColor: '#6EE7B7'
      };
    case 'failed':
    case 'error':
      return {
        color: '#EF4444',
        bgColor: '#FEE2E2',
        borderColor: '#FCA5A5'
      };
    case 'changed':
      return {
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        borderColor: '#FCD34D'
      };
    case 'skipped':
      return {
        color: '#6B7280',
        bgColor: '#F9FAFB',
        borderColor: '#E5E7EB'
      };
    case 'unreachable':
      return {
        color: '#8B5CF6',
        bgColor: '#EDE9FE',
        borderColor: '#C4B5FD'
      };
    default:
      return {
        color: '#6B7280',
        bgColor: '#F9FAFB',
        borderColor: '#E5E7EB'
      };
  }
};

/**
 * Task Results Component
 */
const TaskResultsView: React.FC<{
  tasks: TaskResult[];
  onTaskClick?: (task: TaskResult) => void;
}> = ({ tasks, onTaskClick }) => {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredTasks = useMemo(() => {
    if (filterStatus === 'all') return tasks;
    return tasks.filter(task => task.status === filterStatus);
  }, [tasks, filterStatus]);

  const toggleTaskExpansion = (taskName: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskName)) {
      newExpanded.delete(taskName);
    } else {
      newExpanded.add(taskName);
    }
    setExpandedTasks(newExpanded);
  };

  const statusCounts = useMemo(() => {
    return tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [tasks]);

  return (
    <div className="space-y-4">
      {/* Filter controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Task Results ({filteredTasks.length})
          </h3>
          
          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Tasks</option>
            <option value="ok">Successful ({statusCounts.ok || 0})</option>
            <option value="failed">Failed ({statusCounts.failed || 0})</option>
            <option value="changed">Changed ({statusCounts.changed || 0})</option>
            <option value="skipped">Skipped ({statusCounts.skipped || 0})</option>
          </select>
        </div>

        {/* Summary stats */}
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-gray-600 dark:text-gray-400">{statusCounts.ok || 0} OK</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-gray-600 dark:text-gray-400">{statusCounts.failed || 0} Failed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span className="text-gray-600 dark:text-gray-400">{statusCounts.changed || 0} Changed</span>
          </div>
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filteredTasks.map((task, index) => {
          const styling = getStatusStyling(task.status);
          const isExpanded = expandedTasks.has(task.task_name);

          return (
            <div
              key={`${task.task_name}-${task.host}-${index}`}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              {/* Task header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => toggleTaskExpansion(task.task_name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: styling.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {task.task_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {task.action} on {task.host}
                        {task.duration && ` • ${formatDuration(task.duration * 1000)}`}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: styling.bgColor, 
                        color: styling.color 
                      }}
                    >
                      {task.status.toUpperCase()}
                    </div>
                    
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Expanded task details */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Task details */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Task Details
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Action:</span>
                          <span className="text-gray-900 dark:text-white font-mono">{task.action}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Host:</span>
                          <span className="text-gray-900 dark:text-white">{task.host}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Changed:</span>
                          <span className={task.changed ? 'text-yellow-600' : 'text-gray-500'}>
                            {task.changed ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Failed:</span>
                          <span className={task.failed ? 'text-red-600' : 'text-gray-500'}>
                            {task.failed ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Skipped:</span>
                          <span className={task.skipped ? 'text-gray-600' : 'text-gray-500'}>
                            {task.skipped ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Task output */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Output
                      </h4>
                      {task.message && (
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded p-3 text-sm font-mono text-gray-800 dark:text-gray-200">
                          {task.message}
                        </div>
                      )}
                      {task.result && (
                        <details className="mt-2">
                          <summary className="text-sm text-blue-600 dark:text-blue-400 cursor-pointer">
                            View Raw Result
                          </summary>
                          <pre className="mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded p-3 text-xs font-mono text-gray-800 dark:text-gray-200 overflow-auto max-h-40">
                            {JSON.stringify(task.result, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No tasks found for the selected filter
        </div>
      )}
    </div>
  );
};

/**
 * Host Results Component
 */
const HostResultsView: React.FC<{
  hosts: HostResult[];
}> = ({ hosts }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Host Results ({hosts.length})
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hosts.map((host) => {
          const styling = getStatusStyling(host.status);
          const totalTasks = host.task_count;
          const successRate = totalTasks > 0 ? ((totalTasks - host.failed_count - host.unreachable_count) / totalTasks) * 100 : 0;

          return (
            <div
              key={host.hostname}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              {/* Host header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: styling.color }}
                  />
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">
                    {host.hostname}
                  </h4>
                </div>
                <div
                  className="px-2 py-1 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: styling.bgColor, 
                    color: styling.color 
                  }}
                >
                  {host.status.toUpperCase()}
                </div>
              </div>

              {/* Host metrics */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Total Tasks:</span>
                  <span className="text-gray-900 dark:text-white">{host.task_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Changed:</span>
                  <span className="text-yellow-600">{host.changed_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Failed:</span>
                  <span className="text-red-600">{host.failed_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Skipped:</span>
                  <span className="text-gray-500">{host.skipped_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Unreachable:</span>
                  <span className="text-purple-600">{host.unreachable_count}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-gray-500 dark:text-gray-400">Success Rate:</span>
                  <span className={`font-medium ${successRate >= 90 ? 'text-green-600' : successRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {successRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Errors */}
              {host.errors && host.errors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <details>
                    <summary className="text-sm text-red-600 dark:text-red-400 cursor-pointer">
                      View Errors ({host.errors.length})
                    </summary>
                    <div className="mt-2 space-y-1">
                      {host.errors.slice(0, 3).map((error, index) => (
                        <div key={index} className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                          {error}
                        </div>
                      ))}
                      {host.errors.length > 3 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ... and {host.errors.length - 3} more errors
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Main PlaybookDetailView Component
 */
export const PlaybookDetailView: React.FC<PlaybookDetailViewProps> = ({
  runId,
  showLogs = false,
  enableRetry = true,
  className = '',
  onRetry,
  onExport,
  onClose
}) => {
  const [data, setData] = useState<AutomationRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(showLogs ? 'logs' : 'overview');
  const [isRetrying, setIsRetrying] = useState(false);

  const { isMobile } = useResponsive();

  // Fetch automation run details
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const runData = await automationApi.getAutomationRun(runId, true, true);
      setData(runData);
    } catch (err) {
      console.error('Failed to fetch automation run details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load automation run details');
    } finally {
      setLoading(false);
    }
  }, [runId]);

  // Handle retry
  const handleRetry = useCallback(async () => {
    if (!onRetry) return;

    try {
      setIsRetrying(true);
      await onRetry(runId);
      await fetchData(); // Refresh data after retry
    } catch (err) {
      console.error('Retry failed:', err);
      setError('Retry failed. Please try again.');
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, runId, fetchData]);

  // Handle export
  const handleExport = useCallback((format: 'json' | 'csv' | 'pdf') => {
    onExport?.(runId, format);
  }, [onExport, runId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Tab configuration
  const tabs = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'tasks', label: 'Tasks', icon: '📋', count: data?.task_results?.length },
    { key: 'hosts', label: 'Hosts', icon: '🖥️', count: data?.host_results?.length },
    { key: 'logs', label: 'Logs', icon: '📄' },
    { key: 'performance', label: 'Performance', icon: '⏱️' }
  ];

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <LoadingSkeleton height="400px" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center ${className}`}>
        <div className="text-red-600 dark:text-red-400 mb-4">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">Failed to Load Playbook Details</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'Automation run not found'}</p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Basic info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Execution Status</h4>
                <div className="flex items-center space-x-2">
                  <StatusIndicator status={
                    data.status === 'success' ? 'success' :
                    data.status === 'failed' ? 'error' :
                    data.status === 'running' ? 'warning' : 'neutral'
                  } />
                  <span className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                    {data.status}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Duration</h4>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {data.duration_seconds ? formatDuration(data.duration_seconds * 1000) : 'N/A'}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Success Rate</h4>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {data.total_hosts > 0 ? ((data.successful_hosts / data.total_hosts) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>

            {/* Detailed metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{data.successful_hosts}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Successful Hosts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{data.failed_hosts}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Failed Hosts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{data.changed_tasks}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Changed Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{data.total_tasks}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</div>
              </div>
            </div>
          </div>
        );

      case 'tasks':
        return data.task_results ? (
          <TaskResultsView tasks={data.task_results} />
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No task results available
          </div>
        );

      case 'hosts':
        return data.host_results ? (
          <HostResultsView hosts={data.host_results} />
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No host results available
          </div>
        );

      case 'logs':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Execution Logs
            </h3>
            {data.log_output ? (
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto max-h-96">
                <pre>{data.log_output}</pre>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No logs available for this execution
              </div>
            )}
          </div>
        );

      case 'performance':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Performance Analysis
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Setup Time</h4>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {data.setup_time_seconds ? formatDuration(data.setup_time_seconds * 1000) : 'N/A'}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Execution Time</h4>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {data.execution_time_seconds ? formatDuration(data.execution_time_seconds * 1000) : 'N/A'}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Teardown Time</h4>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {data.teardown_time_seconds ? formatDuration(data.teardown_time_seconds * 1000) : 'N/A'}
                </div>
              </div>
            </div>

            {/* Coverage and automation score */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Coverage Percentage</h4>
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {data.coverage_percentage?.toFixed(1) || 'N/A'}%
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Automation Score</h4>
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {data.automation_score?.toFixed(1) || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
            {data.name || data.playbook_name || `Run #${data.id}`}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {data.started_at && `Started ${formatRelativeTime(data.started_at)}`}
            {data.environment && ` • Environment: ${data.environment}`}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Export dropdown */}
          <div className="relative">
            <button className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              Export ▼
            </button>
            {/* Export menu would go here */}
          </div>

          {/* Retry button */}
          {enableRetry && onRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying || data.status === 'running'}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isRetrying ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Retrying</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Retry</span>
                </>
              )}
            </button>
          )}

          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`
                flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {renderTabContent()}
      </div>
    </div>
  );
}; 