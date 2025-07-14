/**
 * Git Activity Dashboard Component
 * 
 * Comprehensive dashboard combining the Git Activity Heatmap with filtering,
 * view options, metrics display, and export functionality.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChartBarIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

import GitActivityHeatmap from './GitActivityHeatmap';
import GitActivityFilters from './GitActivityFilters';
import GitActivityDetailView from './GitActivityDetailView';
import { useGitActivityHeatmap, useGitActivityFilters } from '../../hooks/useGitActivity';
import { useGitActivityDetails } from '../../hooks/useGitActivityDetails';
import {
  ActivityHeatmapData,
  GitActivityMetrics,
  GitActivityViewOptions,
  GitActivityExportOptions
} from '../../types/git-activity';

export interface GitActivityDashboardProps {
  owner: string;
  repo: string;
  provider?: 'github' | 'gitlab';
  className?: string;
  showMetrics?: boolean;
  showExport?: boolean;
  onExport?: (options: GitActivityExportOptions) => Promise<void>;
  onCellClick?: (date: string, data: ActivityHeatmapData) => void;
}

/**
 * Metrics Summary Component
 */
const MetricsSummary: React.FC<{
  metrics: GitActivityMetrics | null;
  loading: boolean;
}> = ({ metrics, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const metricItems = [
    {
      label: 'Total Commits',
      value: metrics.total_commits.toLocaleString(),
      icon: '📝',
      color: 'blue'
    },
    {
      label: 'Pull Requests',
      value: metrics.total_prs.toLocaleString(),
      icon: '🔀',
      color: 'green'
    },
    {
      label: 'Contributors',
      value: metrics.total_contributors.toLocaleString(),
      icon: '👥',
      color: 'purple'
    },
    {
      label: 'Avg Commits/Day',
      value: metrics.avg_commits_per_day.toFixed(1),
      icon: '📊',
      color: 'orange'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metricItems.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={clsx(
            'bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700',
            'hover:shadow-md transition-shadow duration-200'
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {item.label}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {item.value}
              </p>
            </div>
            <div className="text-2xl">{item.icon}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

/**
 * Export Options Component
 */
const ExportOptions: React.FC<{
  onExport: (options: GitActivityExportOptions) => Promise<void>;
  dateRange: { startDate: Date; endDate: Date };
  disabled?: boolean;
}> = ({ onExport, dateRange, disabled = false }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'pdf' | 'png'>('csv');

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await onExport({
        format: exportFormat,
        dateRange,
        includeMetrics: true,
        includeHeatmap: true,
        includeDetails: true
      });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [onExport, exportFormat, dateRange]);

  return (
    <div className="flex items-center space-x-3">
      <select
        value={exportFormat}
        onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
        disabled={disabled || isExporting}
        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
      >
        <option value="csv">CSV</option>
        <option value="json">JSON</option>
        <option value="pdf">PDF</option>
        <option value="png">PNG</option>
      </select>

      <button
        onClick={handleExport}
        disabled={disabled || isExporting}
        className={clsx(
          'flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
          'bg-blue-600 hover:bg-blue-700 text-white',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isExporting ? (
          <ArrowPathIcon className="w-4 h-4 animate-spin" />
        ) : (
          <ArrowDownTrayIcon className="w-4 h-4" />
        )}
        <span>{isExporting ? 'Exporting...' : 'Export'}</span>
      </button>
    </div>
  );
};

/**
 * View Mode Toggle Component
 */
const ViewModeToggle: React.FC<{
  viewOptions: GitActivityViewOptions;
  onViewOptionsChange: (partialOptions: Partial<GitActivityViewOptions>) => void;
}> = ({ viewOptions, onViewOptionsChange }) => {
  const viewModes = [
    { value: 'daily', label: 'Daily', icon: CalendarDaysIcon },
    { value: 'weekly', label: 'Weekly', icon: ChartBarIcon },
    { value: 'monthly', label: 'Monthly', icon: ChartBarIcon }
  ] as const;

  return (
    <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
      {viewModes.map(mode => {
        const Icon = mode.icon;
        return (
          <button
            key={mode.value}
            onClick={() => onViewOptionsChange({ viewType: mode.value })}
            className={clsx(
              'flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
              viewOptions.viewType === mode.value
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
};

/**
 * Main Git Activity Dashboard Component
 */
export const GitActivityDashboard: React.FC<GitActivityDashboardProps> = ({
  owner,
  repo,
  provider = 'github',
  className = '',
  showMetrics = true,
  showExport = true,
  onExport,
  onCellClick
}) => {
  const [colorScheme, setColorScheme] = useState<'green' | 'blue' | 'purple' | 'red'>('green');
  const [refreshKey, setRefreshKey] = useState(0);

  // Hooks for data and filters
  const {
    data: heatmapData,
    metrics,
    loading,
    error,
    refetch,
    invalidateCache
  } = useGitActivityHeatmap(owner, repo, {
    provider,
    daysBack: 365,
    useCache: true,
    enabled: !!owner && !!repo
  });

  const {
    filters,
    updateFilters,
    resetFilters,
    applyFilters
  } = useGitActivityFilters();

  // Hook for detailed view
  const {
    selectedDate,
    isDetailViewOpen,
    detailedData,
    isLoading: isLoadingDetails,
    error: detailsError,
    openDetailView,
    closeDetailView,
    loadDetails
  } = useGitActivityDetails(owner, repo, provider);

  // View options state
  const [viewOptions, setViewOptions] = useState<GitActivityViewOptions>({
    viewType: 'daily',
    groupBy: 'day',
    sortBy: 'date',
    sortOrder: 'asc'
  });

  // Process and filter data
  const processedData = useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) return [];
    return applyFilters(heatmapData);
  }, [heatmapData, applyFilters]);

  // Extract available contributors and repositories for filters
  const availableContributors = useMemo(() => {
    if (!metrics?.top_contributors) return [];
    return metrics.top_contributors.map(contributor => contributor.login);
  }, [metrics]);

  const availableRepositories = useMemo(() => {
    return [`${owner}/${repo}`];
  }, [owner, repo]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshKey(prev => prev + 1);
    await refetch();
  }, [refetch]);

  const handleInvalidateCache = useCallback(async () => {
    await invalidateCache();
    setRefreshKey(prev => prev + 1);
  }, [invalidateCache]);

  const handleExport = useCallback(async (options: GitActivityExportOptions) => {
    if (onExport) {
      await onExport(options);
    } else {
      // Default export implementation
      const dataToExport = {
        repository: `${owner}/${repo}`,
        dateRange: options.dateRange,
        data: processedData,
        metrics: options.includeMetrics ? metrics : null,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `git-activity-${owner}-${repo}-${new Date().toISOString().split('T')[0]}.${options.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [onExport, owner, repo, processedData, metrics]);


  const handleCellClickInternal = useCallback((date: string, data: ActivityHeatmapData) => {
    openDetailView(date);
    onCellClick?.(date, data);
  }, [onCellClick, openDetailView]);

  if (error) {
    return (
      <div className={clsx('bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6', className)}>
        <div className="flex items-center space-x-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="text-lg font-medium text-red-800 dark:text-red-200">
              Failed to Load Git Activity
            </h3>
            <p className="text-red-600 dark:text-red-400 mt-1">
              {error}
            </p>
            <div className="mt-4 flex space-x-3">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={handleInvalidateCache}
                className="px-4 py-2 border border-red-600 text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Clear Cache & Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Git Activity Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {owner}/{repo} • {provider}
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Color Scheme Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Color:</span>
            <div className="flex space-x-1">
              {(['green', 'blue', 'purple', 'red'] as const).map(color => (
                <button
                  key={color}
                  onClick={() => setColorScheme(color)}
                  className={clsx(
                    'w-6 h-6 rounded-full border-2 transition-all',
                    colorScheme === color ? 'border-gray-900 dark:border-gray-100 scale-110' : 'border-gray-300 dark:border-gray-600',
                    color === 'green' && 'bg-green-500',
                    color === 'blue' && 'bg-blue-500',
                    color === 'purple' && 'bg-purple-500',
                    color === 'red' && 'bg-red-500'
                  )}
                />
              ))}
            </div>
          </div>

          {/* View Mode Toggle */}
          <ViewModeToggle
            viewOptions={viewOptions}
            onViewOptionsChange={(partialOptions) => 
              setViewOptions(prev => ({ ...prev, ...partialOptions }))
            }
          />

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <ArrowPathIcon className={clsx('w-4 h-4', loading && 'animate-spin')} />
            <span>Refresh</span>
          </button>

          {/* Export Options */}
          {showExport && (
            <ExportOptions
              onExport={handleExport}
              dateRange={filters.dateRange}
              disabled={loading || !processedData.length}
            />
          )}
        </div>
      </div>

      {/* Metrics Summary */}
      {showMetrics && (
        <MetricsSummary metrics={metrics} loading={loading} />
      )}

      {/* Filters */}
      <GitActivityFilters
        filters={{ ...filters, branches: [] }}
        viewOptions={viewOptions}
        onFiltersChange={updateFilters}
        onViewOptionsChange={(partialOptions) => 
          setViewOptions(prev => ({ ...prev, ...partialOptions }))
        }
        onReset={resetFilters}
        availableContributors={availableContributors}
        availableRepositories={availableRepositories}
      />

      {/* Info Banner */}
      {processedData.length !== heatmapData.length && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Showing {processedData.length} of {heatmapData.length} days based on current filters.
            </p>
          </div>
        </div>
      )}

      {/* Main Heatmap */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <GitActivityHeatmap
          key={refreshKey}
          data={processedData}
          repository={`${owner}/${repo}`}
          dateRange={filters.dateRange}
          colorScheme={colorScheme}
          showWeekdays={true}
          showMonthLabels={true}
          cellSize={12}
          cellGap={2}
          loading={loading}
          error={error}
          onCellClick={handleCellClickInternal}
        />
      </div>

      {/* Detailed View Modal */}
      <GitActivityDetailView
        isOpen={isDetailViewOpen}
        onClose={closeDetailView}
        date={selectedDate || ''}
        activityData={selectedDate ? processedData.find(d => d.date === selectedDate) || {
          date: selectedDate,
          activity_count: 0,
          commit_count: 0,
          pr_count: 0,
          contributor_count: 0,
          lines_added: 0,
          lines_deleted: 0,
          files_changed: 0,
          activity_types: []
        } : {
          date: '',
          activity_count: 0,
          commit_count: 0,
          pr_count: 0,
          contributor_count: 0,
          lines_added: 0,
          lines_deleted: 0,
          files_changed: 0,
          activity_types: []
        }}
        detailedData={detailedData}
        loading={isLoadingDetails}
        error={detailsError}
        onLoadDetails={loadDetails}
      />
    </div>
  );
};

export default GitActivityDashboard; 