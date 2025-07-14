/**
 * Playbook Execution Chart Component
 * 
 * Comprehensive visualization of Ansible playbook execution data.
 * Features:
 * - Timeline chart showing execution trends
 * - Success/failure rate visualization
 * - Duration analysis with bar charts
 * - Interactive filtering and grouping
 * - Real-time updates and responsive design
 */

import React, { useMemo, useState } from 'react';
import { AutomationRun, AutomationTrend, AutomationStatus, PlaybookMetrics } from '../../types/automation';
import { formatDuration, formatRelativeTime } from '../../utils/time';
import { useResponsive } from '../../hooks/useResponsive';

interface PlaybookExecutionChartProps {
  /** Array of automation runs */
  automationRuns: AutomationRun[];
  /** Trend data for timeline visualization */
  trends?: AutomationTrend[];
  /** Playbook metrics for analysis */
  playbookMetrics?: PlaybookMetrics[];
  /** Chart type selection */
  chartType?: 'timeline' | 'success-rate' | 'duration' | 'recent';
  /** Time range filter */
  timeRange?: 'day' | 'week' | 'month' | 'quarter';
  /** Playbook filter */
  selectedPlaybook?: string;
  /** Status filter */
  statusFilter?: AutomationStatus[];
  /** Custom className for styling */
  className?: string;
  /** Callback when a run is clicked */
  onRunClick?: (run: AutomationRun) => void;
  /** Callback when chart type changes */
  onChartTypeChange?: (type: string) => void;
  /** Callback when filters change */
  onFiltersChange?: (filters: any) => void;
}

/**
 * Get status color for automation runs
 */
const getStatusColor = (status: AutomationStatus): {
  color: string;
  bgColor: string;
  borderColor: string;
} => {
  switch (status) {
    case 'success':
      return {
        color: '#10B981',
        bgColor: '#D1FAE5',
        borderColor: '#6EE7B7'
      };
    case 'failed':
      return {
        color: '#EF4444',
        bgColor: '#FEE2E2',
        borderColor: '#FCA5A5'
      };
    case 'running':
      return {
        color: '#3B82F6',
        bgColor: '#DBEAFE',
        borderColor: '#93C5FD'
      };
    case 'pending':
      return {
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        borderColor: '#FCD34D'
      };
    case 'partial_success':
      return {
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        borderColor: '#FCD34D'
      };
    case 'cancelled':
    case 'skipped':
    default:
      return {
        color: '#6B7280',
        bgColor: '#F9FAFB',
        borderColor: '#E5E7EB'
      };
  }
};

/**
 * Timeline Chart Component
 */
const TimelineChart: React.FC<{
  trends: AutomationTrend[];
  runs: AutomationRun[];
  onRunClick?: (run: AutomationRun) => void;
}> = ({ trends, runs, onRunClick }) => {
  const maxValue = Math.max(...trends.map(t => t.total_runs));
  const maxSuccessRate = 100;

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Execution Timeline
      </h4>
      
      {/* Chart area */}
      <div className="relative h-64">
        <svg className="w-full h-full" viewBox="0 0 800 200">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((value) => (
            <g key={value}>
              <line
                x1="60"
                y1={40 + (value / 100) * 120}
                x2="780"
                y2={40 + (value / 100) * 120}
                stroke="#E5E7EB"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <text
                x="50"
                y={45 + (value / 100) * 120}
                fontSize="10"
                fill="#6B7280"
                textAnchor="end"
              >
                {100 - value}%
              </text>
            </g>
          ))}

          {/* Success rate line */}
          <polyline
            points={trends.map((trend, index) => 
              `${80 + (index * 650 / (trends.length - 1))},${40 + (100 - trend.success_rate) * 1.2}`
            ).join(' ')}
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
          />

          {/* Data points */}
          {trends.map((trend, index) => (
            <g key={trend.date}>
              <circle
                cx={80 + (index * 650 / (trends.length - 1))}
                cy={40 + (100 - trend.success_rate) * 1.2}
                r="4"
                fill="#10B981"
                className="hover:r-6 cursor-pointer transition-all"
              />
              
              {/* Bars for total runs */}
              <rect
                x={75 + (index * 650 / (trends.length - 1))}
                y={180 - (trend.total_runs / maxValue) * 20}
                width="10"
                height={(trend.total_runs / maxValue) * 20}
                fill="#3B82F6"
                opacity="0.6"
                className="hover:opacity-100 cursor-pointer transition-all"
              />
              
              {/* Date labels */}
              <text
                x={80 + (index * 650 / (trends.length - 1))}
                y="195"
                fontSize="10"
                fill="#6B7280"
                textAnchor="middle"
              >
                {trend.date_label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center space-x-6 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-1 bg-green-500 rounded" />
          <span className="text-gray-600 dark:text-gray-400">Success Rate</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 opacity-60 rounded" />
          <span className="text-gray-600 dark:text-gray-400">Total Runs</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Success Rate Chart Component
 */
const SuccessRateChart: React.FC<{
  playbookMetrics: PlaybookMetrics[];
}> = ({ playbookMetrics }) => {
  const sortedMetrics = [...playbookMetrics]
    .sort((a, b) => b.success_rate - a.success_rate)
    .slice(0, 10); // Top 10 playbooks

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Playbook Success Rates
      </h4>
      
      <div className="space-y-3">
        {sortedMetrics.map((metric, index) => (
          <div key={metric.name} className="flex items-center space-x-3">
            <div className="w-32 text-xs text-gray-600 dark:text-gray-400 truncate">
              {metric.name}
            </div>
            
            <div className="flex-1 relative">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                  style={{ width: `${metric.success_rate}%` }}
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300">
                {metric.success_rate.toFixed(1)}%
              </div>
            </div>
            
            <div className="w-16 text-xs text-gray-500 dark:text-gray-400 text-right">
              {metric.total_runs} runs
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Duration Analysis Component
 */
const DurationChart: React.FC<{
  playbookMetrics: PlaybookMetrics[];
}> = ({ playbookMetrics }) => {
  const validMetrics = playbookMetrics.filter(m => m.average_duration);
  const maxDuration = Math.max(...validMetrics.map(m => m.average_duration || 0));

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Average Execution Duration
      </h4>
      
      <div className="space-y-3">
        {validMetrics.slice(0, 10).map((metric) => (
          <div key={metric.name} className="flex items-center space-x-3">
            <div className="w-32 text-xs text-gray-600 dark:text-gray-400 truncate">
              {metric.name}
            </div>
            
            <div className="flex-1 relative">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                  style={{ width: `${((metric.average_duration || 0) / maxDuration) * 100}%` }}
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300">
                {formatDuration((metric.average_duration || 0) * 1000)}
              </div>
            </div>
            
            <div className="w-16 text-xs text-gray-500 dark:text-gray-400 text-right">
              {metric.total_runs} runs
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Recent Runs List Component
 */
const RecentRunsList: React.FC<{
  runs: AutomationRun[];
  onRunClick?: (run: AutomationRun) => void;
}> = ({ runs, onRunClick }) => {
  const recentRuns = runs
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Recent Executions
      </h4>
      
      <div className="space-y-2">
        {recentRuns.map((run) => {
          const statusColors = getStatusColor(run.status);
          
          return (
            <div
              key={run.id}
              className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
              onClick={() => onRunClick?.(run)}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: statusColors.color }}
              />
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {run.playbook_name || run.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatRelativeTime(run.created_at)} • {run.total_hosts} hosts
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm font-medium" style={{ color: statusColors.color }}>
                  {run.status}
                </div>
                {run.duration_seconds && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDuration(run.duration_seconds * 1000)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * PlaybookExecutionChart Component
 */
export const PlaybookExecutionChart: React.FC<PlaybookExecutionChartProps> = ({
  automationRuns,
  trends = [],
  playbookMetrics = [],
  chartType = 'timeline',
  timeRange = 'week',
  selectedPlaybook,
  statusFilter,
  className = '',
  onRunClick,
  onChartTypeChange,
  onFiltersChange
}) => {
  const { isMobile } = useResponsive();
  const [activeTab, setActiveTab] = useState<'timeline' | 'success-rate' | 'duration' | 'recent'>(chartType);

  // Filter runs based on current filters
  const filteredRuns = useMemo(() => {
    let filtered = [...automationRuns];

    if (selectedPlaybook) {
      filtered = filtered.filter(run => 
        run.playbook_name === selectedPlaybook || run.name === selectedPlaybook
      );
    }

    if (statusFilter && statusFilter.length > 0) {
      filtered = filtered.filter(run => statusFilter.includes(run.status));
    }

    return filtered;
  }, [automationRuns, selectedPlaybook, statusFilter]);

  // Get unique playbooks for filter
  const playbooks = useMemo(() => {
    const playbookSet = new Set<string>();
    automationRuns.forEach(run => {
      if (run.playbook_name) playbookSet.add(run.playbook_name);
      if (run.name && !run.playbook_name) playbookSet.add(run.name);
    });
    return Array.from(playbookSet).sort();
  }, [automationRuns]);

  const chartTabs = [
    { id: 'timeline', label: 'Timeline', icon: '📈' },
    { id: 'success-rate', label: 'Success Rate', icon: '✅' },
    { id: 'duration', label: 'Duration', icon: '⏱️' },
    { id: 'recent', label: 'Recent Runs', icon: '🕒' }
  ];

  const renderChart = () => {
    switch (activeTab) {
      case 'timeline':
        return <TimelineChart trends={trends} runs={filteredRuns} onRunClick={onRunClick} />;
      case 'success-rate':
        return <SuccessRateChart playbookMetrics={playbookMetrics} />;
      case 'duration':
        return <DurationChart playbookMetrics={playbookMetrics} />;
      case 'recent':
        return <RecentRunsList runs={filteredRuns} onRunClick={onRunClick} />;
      default:
        return <TimelineChart trends={trends} runs={filteredRuns} onRunClick={onRunClick} />;
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Playbook Execution Analysis
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredRuns.length} executions • {trends.length > 0 ? `${trends[trends.length - 1]?.success_rate.toFixed(1)}%` : 'N/A'} avg success rate
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4 lg:mt-0">
          {/* Playbook filter */}
          <select
            value={selectedPlaybook || ''}
            onChange={(e) => onFiltersChange?.({ playbook: e.target.value || undefined })}
            className="px-3 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Playbooks</option>
            {playbooks.map((playbook) => (
              <option key={playbook} value={playbook}>
                {playbook}
              </option>
            ))}
          </select>

          {/* Time range filter */}
          <select
            value={timeRange}
            onChange={(e) => onFiltersChange?.({ timeRange: e.target.value })}
            className="px-3 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        {chartTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as 'timeline' | 'success-rate' | 'duration' | 'recent');
              onChartTypeChange?.(tab.id);
            }}
            className={`
              flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors
              ${activeTab === tab.id
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
            `}
          >
            {!isMobile && <span>{tab.icon}</span>}
            <span>{isMobile ? tab.icon : tab.label}</span>
          </button>
        ))}
      </div>

      {/* Chart Content */}
      <div className="min-h-64">
        {renderChart()}
      </div>

      {/* Summary Stats */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {filteredRuns.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total Runs</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-green-600 dark:text-green-400">
              {filteredRuns.filter(r => r.status === 'success').length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Successful</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-red-600 dark:text-red-400">
              {filteredRuns.filter(r => r.status === 'failed').length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Failed</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {filteredRuns.filter(r => r.status === 'running').length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Running</div>
          </div>
        </div>
      </div>
    </div>
  );
}; 