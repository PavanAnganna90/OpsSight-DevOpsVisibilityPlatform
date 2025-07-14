/**
 * Automation Coverage Panel Component
 * 
 * Main dashboard component for Ansible automation coverage and visibility.
 * Features:
 * - Comprehensive automation statistics and metrics
 * - Host coverage map and playbook execution charts
 * - Real-time updates and filtering capabilities
 * - Integration with multiple chart components
 * - Responsive design with mobile optimization
 * - Error handling and loading states
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useDebounce, useStableCallback } from '../../utils/performance';
import { HostCoverageMap } from '../charts/HostCoverageMap';
import { PlaybookExecutionChart } from '../charts/PlaybookExecutionChart';
import { MetricCard } from '../ui/MetricCard';
import { StatusIndicator } from '../ui/StatusIndicator';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { useResponsive } from '../../hooks/useResponsive';
import { formatRelativeTime, formatDuration } from '../../utils/time';
import { automationApi } from '../../services/automationApi';
import {
  AutomationCoverageData,
  AutomationRun,
  AutomationFilter,
  AutomationStatus,
  Environment,
  HostCoverage,
  PlaybookMetrics
} from '../../types/automation';

interface AutomationCoveragePanelProps {
  /** Project ID for filtering data */
  projectId?: number;
  /** Whether to enable real-time updates */
  enableRealTime?: boolean;
  /** Refresh interval in seconds */
  refreshInterval?: number;
  /** Custom className for styling */
  className?: string;
  /** Callback when an automation run is clicked */
  onRunClick?: (run: AutomationRun) => void;
  /** Callback when a host is clicked */
  onHostClick?: (host: HostCoverage) => void;
  /** Callback when sync is requested */
  onSync?: () => Promise<void>;
}

/**
 * AutomationCoveragePanel Component
 */
const AutomationCoveragePanelComponent: React.FC<AutomationCoveragePanelProps> = ({
  projectId,
  enableRealTime = true,
  refreshInterval = 30,
  className = '',
  onRunClick,
  onHostClick,
  onSync
}) => {
  // State management
  const [data, setData] = useState<AutomationCoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Filter state with debouncing for performance
  const [selectedEnvironment, setSelectedEnvironment] = useState<string | undefined>();
  const [selectedPlaybook, setSelectedPlaybook] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<AutomationStatus[]>([]);
  const [minSuccessRate, setMinSuccessRate] = useState<number | undefined>();
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'quarter'>('week');
  
  // Debounced filters for performance
  const debouncedSelectedEnvironment = useDebounce(selectedEnvironment, 300);
  const debouncedSelectedPlaybook = useDebounce(selectedPlaybook, 300);
  const debouncedMinSuccessRate = useDebounce(minSuccessRate, 500);

  // Responsive design
  const { isMobile, isTablet } = useResponsive();

  /**
   * Fetch automation coverage data from API
   */
  const fetchData = useStableCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      if (!projectId) {
        throw new Error('Project ID is required');
      }

      // Get basic stats
      const stats = await automationApi.getStats(projectId);
      
      // Get trend data for visualization
      const trendData = await automationApi.getCoverageTrends(
        projectId,
        timeRange === 'day' ? 'daily' : timeRange === 'week' ? 'weekly' : 'monthly',
        timeRange === 'day' ? 7 : timeRange === 'week' ? 30 : 90
      );

      // Get additional data using new endpoints
      const [playbookMetrics, hostCoverage, environments, recentRunsData] = await Promise.all([
        automationApi.getPlaybookMetrics(projectId),
        automationApi.getHostCoverage(projectId),
        automationApi.getEnvironments(projectId),
        automationApi.getRecentRuns(projectId, 10)
      ]);

      // Transform trend data into expected format
      const coverageData: AutomationCoverageData = {
        stats,
        playbook_metrics: playbookMetrics,
        host_coverage: hostCoverage,
        environments: environments,
        recent_runs: recentRunsData.automation_runs,
        trends: trendData.data_points.map(dp => ({
          date: dp.period,
          date_label: dp.period,
          total_runs: dp.total_runs,
          successful_runs: Math.round(dp.total_runs * (dp.success_rate / 100)),
          failed_runs: dp.failed_runs,
          success_rate: dp.success_rate,
          average_duration: dp.avg_execution_time,
          hosts_managed: dp.total_hosts,
          coverage_percentage: dp.coverage_percentage
        }))
      };

      setData(coverageData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch automation coverage data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load automation coverage data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [projectId, debouncedSelectedEnvironment, timeRange]);

  /**
   * Handle sync functionality
   */
  const handleSync = useCallback(async () => {
    if (!onSync) return;

    try {
      setIsSyncing(true);
      await onSync();
      await fetchData(false);
    } catch (err) {
      console.error('Sync failed:', err);
      setError('Sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  }, [onSync, fetchData]);

  /**
   * Handle retry functionality
   */
  const handleRetry = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Initial data loading
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Real-time updates
  useEffect(() => {
    if (!enableRealTime || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchData(false);
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [enableRealTime, refreshInterval, fetchData]);

  // Memoized statistics
  const statistics = useMemo(() => {
    if (!data) return null;

    const { stats, environments, recent_runs } = data;
    
    // Calculate aggregate environment health
    const healthyEnvironments = environments.filter(env => env.status === 'healthy').length;
    const environmentHealth = environments.length > 0 
      ? (healthyEnvironments / environments.length) * 100 
      : 0;

    // Recent activity stats
    const recentSuccessfulRuns = recent_runs.filter(run => run.status === 'success').length;
    const recentFailedRuns = recent_runs.filter(run => run.status === 'failed').length;
    const runningRuns = recent_runs.filter(run => run.status === 'running').length;

    return {
      totalRuns: stats.total_runs,
      successRate: stats.success_rate,
      totalHosts: stats.total_hosts_managed,
      healthyEnvironments,
      environmentHealth,
      recentSuccessfulRuns,
      recentFailedRuns,
      runningRuns,
      avgDuration: stats.average_duration
    };
  }, [data]);

  // Filter handlers
  const handleFiltersChange = useCallback((newFilters: any) => {
    if (newFilters.playbook !== undefined) setSelectedPlaybook(newFilters.playbook);
    if (newFilters.timeRange !== undefined) setTimeRange(newFilters.timeRange);
  }, []);

  // Loading state
  if (loading && !data) {
    return (
      <div className={`space-y-6 ${className}`}>
        <LoadingSkeleton height="120px" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingSkeleton height="400px" />
          <LoadingSkeleton height="400px" />
        </div>
        <LoadingSkeleton height="300px" />
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center ${className}`}>
        <div className="text-red-600 dark:text-red-400 mb-4">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">Failed to Load Automation Data</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        </div>
        <div className="space-x-3">
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
          {onSync && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {isSyncing ? 'Syncing...' : 'Sync Data'}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!data || !statistics) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Automation Coverage
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor Ansible automation execution and infrastructure coverage
          </p>
        </div>

        <div className="flex items-center space-x-3 mt-4 lg:mt-0">
          {/* Last updated */}
          {lastUpdated && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Updated {formatRelativeTime(lastUpdated.toISOString())}
            </span>
          )}

          {/* Refresh indicator */}
          {isRefreshing && (
            <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm">Refreshing...</span>
            </div>
          )}

          {/* Sync button */}
          {onSync && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isSyncing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Syncing</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Sync</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Total Runs"
          value={statistics.totalRuns.toLocaleString()}
          icon="🚀"
          trend={statistics.totalRuns > 0 ? { value: '', direction: 'up' } : { value: '', direction: 'neutral' }}
        />
        <MetricCard
          title="Success Rate"
          value={`${statistics.successRate.toFixed(1)}%`}
          icon="✅"
          trend={statistics.successRate >= 90 ? { value: '', direction: 'up' } : statistics.successRate >= 80 ? { value: '', direction: 'neutral' } : { value: '', direction: 'down' }}
        />
        <MetricCard
          title="Managed Hosts"
          value={statistics.totalHosts.toLocaleString()}
          icon="🖥️"
          trend={statistics.totalHosts > 0 ? { value: '', direction: 'up' } : { value: '', direction: 'neutral' }}
        />
        <MetricCard
          title="Environment Health"
          value={`${statistics.environmentHealth.toFixed(0)}%`}
          icon="🌍"
          trend={statistics.environmentHealth >= 90 ? { value: '', direction: 'up' } : statistics.environmentHealth >= 80 ? { value: '', direction: 'neutral' } : { value: '', direction: 'down' }}
        />
        <MetricCard
          title="Running Now"
          value={statistics.runningRuns.toString()}
          icon="⏳"
          trend={{ value: '', direction: 'neutral' }}
        />
        <MetricCard
          title="Avg Duration"
          value={statistics.avgDuration ? formatDuration(statistics.avgDuration * 1000) : 'N/A'}
          icon="⏱️"
          trend={{ value: '', direction: 'neutral' }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Host Coverage Map */}
        <HostCoverageMap
          hostCoverage={data.host_coverage}
          environments={data.environments}
          selectedEnvironment={selectedEnvironment}
          minSuccessRate={minSuccessRate}
          columns={isMobile ? 4 : isTablet ? 6 : 8}
          onHostClick={onHostClick}
          onEnvironmentChange={setSelectedEnvironment}
          onSuccessRateChange={setMinSuccessRate}
        />

        {/* Playbook Execution Chart */}
        <PlaybookExecutionChart
          automationRuns={data.recent_runs}
          trends={data.trends}
          playbookMetrics={data.playbook_metrics}
          chartType="timeline"
          timeRange={timeRange}
          selectedPlaybook={selectedPlaybook}
          statusFilter={statusFilter}
          onRunClick={onRunClick}
          onFiltersChange={handleFiltersChange}
        />
      </div>

      {/* Detailed Tables Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Environment Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Environment Status
          </h3>
          <div className="space-y-3">
            {data.environments.map((env) => (
              <div key={env.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <StatusIndicator status={
                   env.status === 'healthy' ? 'success' :
                   env.status === 'warning' ? 'warning' :
                   env.status === 'critical' ? 'error' : 'neutral'
                 } />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{env.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {env.host_count} hosts • {env.playbook_count} playbooks
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {env.success_rate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {env.coverage_percentage.toFixed(0)}% coverage
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Playbooks */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Performing Playbooks
          </h3>
          <div className="space-y-3">
            {data.playbook_metrics
              .sort((a, b) => b.success_rate - a.success_rate)
              .slice(0, 5)
              .map((playbook) => (
                <div key={playbook.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {playbook.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {playbook.total_runs} runs • {playbook.environments.length} environments
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {playbook.success_rate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {playbook.average_duration ? formatDuration(playbook.average_duration * 1000) : 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Update Error</h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Memoized component with performance optimizations
export const AutomationCoveragePanel = memo(AutomationCoveragePanelComponent, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.projectId === nextProps.projectId &&
    prevProps.enableRealTime === nextProps.enableRealTime &&
    prevProps.refreshInterval === nextProps.refreshInterval &&
    prevProps.className === nextProps.className
  );
}); 