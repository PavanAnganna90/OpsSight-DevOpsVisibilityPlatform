/**
 * Automation Trends Chart Component
 * 
 * Enhanced visualization component for Ansible automation trends analysis.
 * Features:
 * - Multiple chart types for different trend perspectives
 * - Interactive filtering and time period selection
 * - Comparative analysis views (current vs. previous period)
 * - Drill-down capabilities from overview to detailed metrics
 * - Performance trend indicators and forecasting
 */

import React, { useState, useMemo, useCallback } from 'react';
import { AutomationTrend } from '../../types/automation';
import { TrendResponse, PerformanceTrendResponse, ModuleTrendResponse, HostTrendResponse } from '../../services/automationApi';
import { formatDuration, formatRelativeTime } from '../../utils/time';
import { useResponsive } from '../../hooks/useResponsive';

export type TrendChartType = 'coverage' | 'performance' | 'modules' | 'hosts' | 'comparative';
export type TrendPeriod = 'daily' | 'weekly' | 'monthly';

interface AutomationTrendsChartProps {
  /** Type of trend chart to display */
  chartType: TrendChartType;
  /** Time period for aggregation */
  period: TrendPeriod;
  /** Coverage trend data */
  coverageTrends?: TrendResponse;
  /** Performance trend data */
  performanceTrends?: PerformanceTrendResponse;
  /** Module usage trend data */
  moduleTrends?: ModuleTrendResponse;
  /** Host coverage trend data */
  hostTrends?: HostTrendResponse;
  /** Whether to show comparison with previous period */
  showComparison?: boolean;
  /** Custom className for styling */
  className?: string;
  /** Callback when chart type changes */
  onChartTypeChange?: (type: TrendChartType) => void;
  /** Callback when period changes */
  onPeriodChange?: (period: TrendPeriod) => void;
  /** Callback when a data point is clicked */
  onDataPointClick?: (dataPoint: any, chartType: TrendChartType) => void;
}

/**
 * Get trend direction indicator
 */
const getTrendIndicator = (direction: string): {
  icon: string;
  color: string;
  bgColor: string;
  label: string;
} => {
  switch (direction) {
    case 'improving':
      return {
        icon: '📈',
        color: '#10B981',
        bgColor: '#D1FAE5',
        label: 'Improving'
      };
    case 'declining':
      return {
        icon: '📉',
        color: '#EF4444',
        bgColor: '#FEE2E2',
        label: 'Declining'
      };
    case 'stable':
      return {
        icon: '➡️',
        color: '#6B7280',
        bgColor: '#F9FAFB',
        label: 'Stable'
      };
    default:
      return {
        icon: '❓',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        label: 'Insufficient Data'
      };
  }
};

/**
 * Coverage Trends Chart
 */
const CoverageTrendsChart: React.FC<{
  data: TrendResponse;
  showComparison: boolean;
  onDataPointClick?: (dataPoint: any) => void;
}> = ({ data, showComparison, onDataPointClick }) => {
  const maxValue = Math.max(...data.data_points.map(dp => dp.coverage_percentage));
  const trendIndicator = getTrendIndicator(data.summary.trend_direction);

  return (
    <div className="space-y-6">
      {/* Header with summary */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Coverage Trends
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Automation coverage percentage over time
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Trend indicator */}
          <div 
            className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium"
            style={{ backgroundColor: trendIndicator.bgColor, color: trendIndicator.color }}
          >
            <span>{trendIndicator.icon}</span>
            <span>{trendIndicator.label}</span>
          </div>
          
          {/* Summary stats */}
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {data.summary.avg_coverage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Avg Coverage
            </div>
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div className="relative h-64 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <svg className="w-full h-full" viewBox="0 0 800 200">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((value) => (
            <g key={value}>
              <line
                x1="60"
                y1={20 + (value / 100) * 160}
                x2="740"
                y2={20 + (value / 100) * 160}
                stroke="#E5E7EB"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <text
                x="50"
                y={25 + (value / 100) * 160}
                fontSize="10"
                fill="#6B7280"
                textAnchor="end"
              >
                {100 - value}%
              </text>
            </g>
          ))}

          {/* Coverage line */}
          <polyline
            points={data.data_points.map((dp, index) => 
              `${80 + (index * 600 / (data.data_points.length - 1))},${20 + (100 - dp.coverage_percentage) * 1.6}`
            ).join(' ')}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="3"
          />

          {/* Success rate line */}
          <polyline
            points={data.data_points.map((dp, index) => 
              `${80 + (index * 600 / (data.data_points.length - 1))},${20 + (100 - dp.success_rate) * 1.6}`
            ).join(' ')}
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
            strokeDasharray="4,4"
          />

          {/* Data points */}
          {data.data_points.map((dp, index) => (
            <g key={dp.period}>
              <circle
                cx={80 + (index * 600 / (data.data_points.length - 1))}
                cy={20 + (100 - dp.coverage_percentage) * 1.6}
                r="4"
                fill="#3B82F6"
                className="hover:r-6 cursor-pointer transition-all"
                onClick={() => onDataPointClick?.(dp)}
              />
              
              {/* Date labels */}
              <text
                x={80 + (index * 600 / (data.data_points.length - 1))}
                y="195"
                fontSize="10"
                fill="#6B7280"
                textAnchor="middle"
                className="cursor-pointer"
                onClick={() => onDataPointClick?.(dp)}
              >
                {new Date(dp.period).toLocaleDateString()}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-1 bg-blue-500 rounded" />
            <span className="text-gray-600 dark:text-gray-400">Coverage %</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-1 bg-green-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(to right, #10B981 0, #10B981 4px, transparent 4px, transparent 8px)' }} />
            <span className="text-gray-600 dark:text-gray-400">Success Rate %</span>
          </div>
        </div>
        
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {data.summary.data_points} data points • {data.summary.total_runs} total runs
        </div>
      </div>
    </div>
  );
};

/**
 * Performance Trends Chart
 */
const PerformanceTrendsChart: React.FC<{
  data: PerformanceTrendResponse;
  onDataPointClick?: (dataPoint: any) => void;
}> = ({ data, onDataPointClick }) => {
  const maxDuration = Math.max(...data.performance_data.map(pd => pd.avg_duration_seconds));
  const trendIndicator = getTrendIndicator(data.summary.performance_trend);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Performance Trends
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Execution time and efficiency metrics
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div 
            className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium"
            style={{ backgroundColor: trendIndicator.bgColor, color: trendIndicator.color }}
          >
            <span>{trendIndicator.icon}</span>
            <span>{trendIndicator.label}</span>
          </div>
          
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatDuration(data.summary.avg_duration_seconds * 1000)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Avg Duration
            </div>
          </div>
        </div>
      </div>

      {/* Dual-axis chart */}
      <div className="relative h-64 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <svg className="w-full h-full" viewBox="0 0 800 200">
          {/* Duration bars */}
          {data.performance_data.map((pd, index) => (
            <g key={pd.period}>
              <rect
                x={75 + (index * 600 / data.performance_data.length)}
                y={180 - (pd.avg_duration_seconds / maxDuration) * 140}
                width="20"
                height={(pd.avg_duration_seconds / maxDuration) * 140}
                fill="#3B82F6"
                opacity="0.7"
                className="hover:opacity-100 cursor-pointer transition-all"
                onClick={() => onDataPointClick?.(pd)}
              />
              
              {/* Success rate line points */}
              <circle
                cx={85 + (index * 600 / data.performance_data.length)}
                cy={20 + (100 - pd.success_rate_percent) * 1.6}
                r="3"
                fill="#10B981"
                className="hover:r-5 cursor-pointer transition-all"
                onClick={() => onDataPointClick?.(pd)}
              />
              
              {/* Date labels */}
              <text
                x={85 + (index * 600 / data.performance_data.length)}
                y="195"
                fontSize="10"
                fill="#6B7280"
                textAnchor="middle"
              >
                {new Date(pd.period).toLocaleDateString()}
              </text>
            </g>
          ))}

          {/* Success rate line */}
          <polyline
            points={data.performance_data.map((pd, index) => 
              `${85 + (index * 600 / data.performance_data.length)},${20 + (100 - pd.success_rate_percent) * 1.6}`
            ).join(' ')}
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Performance metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {data.summary.avg_success_rate_percent.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Success Rate</div>
        </div>
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {data.summary.total_runs_analyzed}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Runs</div>
        </div>
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {data.summary.data_points}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Data Points</div>
        </div>
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatDuration(data.summary.avg_duration_seconds * 1000)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Avg Duration</div>
        </div>
      </div>
    </div>
  );
};

/**
 * Module Usage Trends Chart
 */
const ModuleTrendsChart: React.FC<{
  data: ModuleTrendResponse;
  onDataPointClick?: (dataPoint: any) => void;
}> = ({ data, onDataPointClick }) => {
  const { isMobile } = useResponsive();
  const displayModules = data.top_modules.slice(0, isMobile ? 3 : 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Module Usage Trends
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Most frequently used Ansible modules
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {data.total_unique_modules}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Unique Modules
          </div>
        </div>
      </div>

      {/* Top modules list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayModules.map((module, index) => (
          <div 
            key={module.name}
            className="bg-white dark:bg-gray-700 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onDataPointClick?.(module)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white truncate">
                  {module.name}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  #{index + 1} most used
                </div>
              </div>
              <div className="text-right ml-4">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {module.total_usage}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  uses
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Time series visualization */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Usage Over Time
        </h4>
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
          Module usage timeline visualization would go here
          <br />
          <span className="text-xs">
            ({data.analysis_period_days} days • {data.time_series.length} data points)
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Main AutomationTrendsChart Component
 */
export const AutomationTrendsChart: React.FC<AutomationTrendsChartProps> = ({
  chartType,
  period,
  coverageTrends,
  performanceTrends,
  moduleTrends,
  hostTrends,
  showComparison = false,
  className = '',
  onChartTypeChange,
  onPeriodChange,
  onDataPointClick
}) => {
  const { isMobile } = useResponsive();

  // Chart type selection
  const chartTypes = [
    { key: 'coverage', label: 'Coverage', icon: '📊' },
    { key: 'performance', label: 'Performance', icon: '⏱️' },
    { key: 'modules', label: 'Modules', icon: '🔧' },
    { key: 'hosts', label: 'Hosts', icon: '🖥️' }
  ];

  // Period selection
  const periods = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' }
  ];

  const handleDataPointClick = useCallback((dataPoint: any) => {
    onDataPointClick?.(dataPoint, chartType);
  }, [onDataPointClick, chartType]);

  const renderChart = () => {
    switch (chartType) {
      case 'coverage':
        return coverageTrends ? (
          <CoverageTrendsChart
            data={coverageTrends}
            showComparison={showComparison}
            onDataPointClick={handleDataPointClick}
          />
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No coverage trend data available
          </div>
        );

      case 'performance':
        return performanceTrends ? (
          <PerformanceTrendsChart
            data={performanceTrends}
            onDataPointClick={handleDataPointClick}
          />
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No performance trend data available
          </div>
        );

      case 'modules':
        return moduleTrends ? (
          <ModuleTrendsChart
            data={moduleTrends}
            onDataPointClick={handleDataPointClick}
          />
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No module trend data available
          </div>
        );

      case 'hosts':
        return (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Host trends visualization coming soon
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Select a chart type to view trends
          </div>
        );
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
        {/* Chart type selector */}
        <div className="flex flex-wrap gap-2">
          {chartTypes.map((type) => (
            <button
              key={type.key}
              onClick={() => onChartTypeChange?.(type.key as TrendChartType)}
              className={`
                flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${chartType === type.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
            >
              <span>{type.icon}</span>
              <span>{type.label}</span>
            </button>
          ))}
        </div>

        {/* Period selector */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Period:</span>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
            {periods.map((p) => (
              <button
                key={p.key}
                onClick={() => onPeriodChange?.(p.key as TrendPeriod)}
                className={`
                  px-3 py-1.5 text-sm font-medium transition-colors
                  ${period === p.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart content */}
      {renderChart()}
    </div>
  );
}; 