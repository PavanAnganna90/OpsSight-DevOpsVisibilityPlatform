/**
 * CI/CD Pipeline Health Dashboard Component
 * 
 * Displays comprehensive pipeline health metrics including:
 * - Pipeline status overview with color-coded indicators
 * - Success/failure rates and trends
 * - Deployment frequency visualization
 * - Real-time updates and filtering
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StatusIndicator, MetricCard, LoadingSkeleton, Button } from '../ui';
import { useResponsive } from '../../hooks/useResponsive';
import { BuildTimeTrendChart, DeploymentFrequencyChart, TestCoverageWidget, PipelineExecutionView } from '../charts';

// Types based on backend schemas
interface PipelineRun {
  id: number;
  pipeline_id: number;
  run_number: number;
  status: 'pending' | 'running' | 'success' | 'failure' | 'cancelled';
  commit_sha: string;
  commit_message?: string;
  triggered_by: string;
  trigger_event: string;
  started_at?: string;
  finished_at?: string;
  duration_seconds?: number;
  branch: string;
  logs_url?: string;
  artifacts_url?: string;
  error_message?: string;
}

interface Pipeline {
  id: number;
  name: string;
  description?: string;
  repository_url: string;
  branch: string;
  pipeline_type: 'ci' | 'cd' | 'ci_cd';
  last_run_status?: 'pending' | 'running' | 'success' | 'failure' | 'cancelled';
  last_run_at?: string;
  total_runs: number;
  success_rate: number;
  average_duration?: number;
  is_active: boolean;
  project_id: number;
  runs?: PipelineRun[];
}

interface PipelineStats {
  total_runs: number;
  success_rate: number;
  failure_rate: number;
  average_duration?: number;
  runs_last_30_days: number;
  success_rate_last_30_days: number;
}

interface PipelineHealthDashboardProps {
  projectId?: number;
  refreshInterval?: number;
  className?: string;
}

const PipelineHealthDashboard: React.FC<PipelineHealthDashboardProps> = ({
  projectId,
  refreshInterval = 30000, // 30 seconds default
  className = ''
}) => {
  // State management
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'last_run' | 'success_rate'>('last_run');

  // Responsive design
  const { isMobile, isTablet } = useResponsive();

  // Fetch pipelines data
  const fetchPipelines = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (projectId) params.append('project_id', projectId.toString());
      params.append('limit', '50');
      
      const response = await fetch(`/api/v1/pipelines?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pipelines: ${response.statusText}`);
      }

      const data = await response.json();
      setPipelines(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pipeline data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Initial load and refresh interval
  useEffect(() => {
    fetchPipelines();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchPipelines, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchPipelines, refreshInterval]);

  // Filter and sort pipelines
  const filteredAndSortedPipelines = useMemo(() => {
    let filtered = pipelines.filter(pipeline => {
      if (filterStatus === 'all') return true;
      return pipeline.last_run_status === filterStatus;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'last_run':
          if (!a.last_run_at && !b.last_run_at) return 0;
          if (!a.last_run_at) return 1;
          if (!b.last_run_at) return -1;
          return new Date(b.last_run_at).getTime() - new Date(a.last_run_at).getTime();
        case 'success_rate':
          return b.success_rate - a.success_rate;
        default:
          return 0;
      }
    });
  }, [pipelines, filterStatus, sortBy]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    if (pipelines.length === 0) {
      return {
        totalPipelines: 0,
        activePipelines: 0,
        averageSuccessRate: 0,
        runningPipelines: 0
      };
    }

    const activePipelines = pipelines.filter(p => p.is_active);
    const runningPipelines = pipelines.filter(p => p.last_run_status === 'running');
    const averageSuccessRate = activePipelines.reduce((sum, p) => sum + p.success_rate, 0) / activePipelines.length;

    return {
      totalPipelines: pipelines.length,
      activePipelines: activePipelines.length,
      averageSuccessRate: Math.round(averageSuccessRate * 100) / 100,
      runningPipelines: runningPipelines.length
    };
  }, [pipelines]);

  // Format duration helper
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Format relative time helper
  const formatRelativeTime = (dateString?: string): string => {
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

  // Get status color for indicators
  const getStatusColor = (status?: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (status) {
      case 'success': return 'success';
      case 'failure': return 'error';
      case 'running': return 'info';
      case 'pending': return 'warning';
      case 'cancelled': return 'neutral';
      default: return 'neutral';
    }
  };

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setLoading(true);
    fetchPipelines();
  }, [fetchPipelines]);

  // Render loading state
  if (loading && pipelines.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <LoadingSkeleton key={i} variant="rectangular" height="120px" />
          ))}
        </div>
        <LoadingSkeleton variant="rectangular" height="400px" />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
              Failed to load pipeline data
            </h3>
            <p className="text-red-600 dark:text-red-300 mt-1">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? 'Retrying...' : 'Retry'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with refresh and filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Pipeline Health Dashboard
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {formatRelativeTime(lastRefresh.toISOString())}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failure">Failed</option>
            <option value="running">Running</option>
            <option value="pending">Pending</option>
          </select>

          {/* Sort options */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'last_run' | 'success_rate')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="last_run">Last Run</option>
            <option value="name">Name</option>
            <option value="success_rate">Success Rate</option>
          </select>

          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Overview metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Pipelines"
          value={overallStats.totalPipelines.toString()}
          subtitle={`${overallStats.activePipelines} active`}
          trend={{
            value: overallStats.activePipelines > 0 ? '+' : '0',
            direction: overallStats.activePipelines > 0 ? 'up' : 'neutral'
          }}
        />
        <MetricCard
          title="Average Success Rate"
          value={`${overallStats.averageSuccessRate}%`}
          subtitle="Last 30 days"
          trend={{
            value: `${overallStats.averageSuccessRate}%`,
            direction: overallStats.averageSuccessRate >= 90 ? 'up' : overallStats.averageSuccessRate >= 70 ? 'neutral' : 'down'
          }}
        />
        <MetricCard
          title="Running Pipelines"
          value={overallStats.runningPipelines.toString()}
          subtitle="Currently executing"
          trend={{
            value: overallStats.runningPipelines.toString(),
            direction: overallStats.runningPipelines > 0 ? 'up' : 'neutral'
          }}
        />
        <MetricCard
          title="Total Runs Today"
          value="--"
          subtitle="Across all pipelines"
          trend={{
            value: '--',
            direction: 'neutral'
          }}
        />
      </div>

      {/* Build Time Trend Chart */}
      <BuildTimeTrendChart 
        pipelines={pipelines}
        timeRange={30}
        className="mb-6"
      />

      {/* Deployment Frequency Chart */}
      <DeploymentFrequencyChart 
        pipelines={pipelines}
        timeRange={30}
        className="mb-6"
      />

      {/* Test Coverage Widget */}
      <TestCoverageWidget 
        pipelines={pipelines}
        timeRange={30}
        className="mb-6"
      />

      {/* Real-time Pipeline Execution View */}
      <PipelineExecutionView 
        pipelineRun={selectedPipeline?.runs?.[0] ? {
          id: selectedPipeline.runs[0].id,
          pipeline_id: selectedPipeline.runs[0].pipeline_id,
          run_number: selectedPipeline.runs[0].run_number,
          status: selectedPipeline.runs[0].status as any,
          started_at: selectedPipeline.runs[0].started_at || new Date().toISOString(),
          finished_at: selectedPipeline.runs[0].finished_at,
          duration_seconds: selectedPipeline.runs[0].duration_seconds,
          branch: selectedPipeline.runs[0].branch,
          commit_sha: selectedPipeline.runs[0].commit_sha,
          commit_message: selectedPipeline.runs[0].commit_message
        } : undefined}
        autoRefresh={true}
        showSteps={!isMobile}
        className="mb-6"
        onExecutionComplete={(run) => {
          console.log('Pipeline execution completed:', run);
          // Refresh pipelines data when execution completes
          fetchPipelines();
        }}
        onError={(error) => {
          console.error('Pipeline execution error:', error);
          setError(error.message);
        }}
      />

      {/* Pipeline list */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Pipelines ({filteredAndSortedPipelines.length})
          </h3>
        </div>

        {filteredAndSortedPipelines.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No pipelines found matching the current filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAndSortedPipelines.map((pipeline) => (
              <div
                key={pipeline.id}
                className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                onClick={() => setSelectedPipeline(pipeline)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 min-w-0 flex-1">
                    <StatusIndicator
                      status={getStatusColor(pipeline.last_run_status)}
                      size="md"
                      pulse={pipeline.last_run_status === 'running'}
                    />
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {pipeline.name}
                        </h4>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          {pipeline.pipeline_type.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>Branch: {pipeline.branch}</span>
                        <span>•</span>
                        <span>Success Rate: {Math.round(pipeline.success_rate * 100)}%</span>
                        <span>•</span>
                        <span>Runs: {pipeline.total_runs}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="text-right">
                      <div>Last run: {formatRelativeTime(pipeline.last_run_at)}</div>
                      {pipeline.average_duration && (
                        <div className="text-xs">
                          Avg: {formatDuration(pipeline.average_duration)}
                        </div>
                      )}
                    </div>
                    
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(PipelineHealthDashboard); 