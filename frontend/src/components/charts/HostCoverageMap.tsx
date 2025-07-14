/**
 * Host Coverage Map Component
 * 
 * Interactive visualization of Ansible automation coverage across infrastructure hosts.
 * Features:
 * - Grid layout showing all managed hosts
 * - Color-coded status indicators based on success rates
 * - Hover tooltips with detailed host information
 * - Interactive filtering by environment and success rate
 * - Responsive grid that adapts to screen size
 * - Loading and error states
 */

import React, { useMemo, useState } from 'react';
import { HostCoverage, Environment } from '../../types/automation';
import { useResponsive } from '../../hooks/useResponsive';
import { formatRelativeTime, formatDuration } from '../../utils/time';

interface HostCoverageMapProps {
  /** Array of host coverage data */
  hostCoverage: HostCoverage[];
  /** Available environments for filtering */
  environments: Environment[];
  /** Selected environment filter */
  selectedEnvironment?: string;
  /** Minimum success rate filter */
  minSuccessRate?: number;
  /** Number of columns in the grid */
  columns?: number;
  /** Whether to show host details on hover */
  showTooltips?: boolean;
  /** Custom className for styling */
  className?: string;
  /** Callback when a host is clicked */
  onHostClick?: (host: HostCoverage) => void;
  /** Callback when environment filter changes */
  onEnvironmentChange?: (environment: string | undefined) => void;
  /** Callback when success rate filter changes */
  onSuccessRateChange?: (minRate: number | undefined) => void;
}

/**
 * Get status color and level based on success rate
 */
const getHostStatus = (successRate: number, hasRecentRuns: boolean): {
  status: string;
  color: string;
  bgColor: string;
  borderColor: string;
} => {
  if (!hasRecentRuns) {
    return {
      status: 'No Data',
      color: '#6B7280',
      bgColor: '#F9FAFB',
      borderColor: '#E5E7EB'
    };
  }

  if (successRate >= 95) {
    return {
      status: 'Excellent',
      color: '#10B981',
      bgColor: '#D1FAE5',
      borderColor: '#6EE7B7'
    };
  } else if (successRate >= 85) {
    return {
      status: 'Good',
      color: '#059669',
      bgColor: '#A7F3D0',
      borderColor: '#34D399'
    };
  } else if (successRate >= 70) {
    return {
      status: 'Warning',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      borderColor: '#FCD34D'
    };
  } else {
    return {
      status: 'Critical',
      color: '#EF4444',
      bgColor: '#FEE2E2',
      borderColor: '#FCA5A5'
    };
  }
};

/**
 * Host tile component
 */
const HostTile: React.FC<{
  host: HostCoverage;
  onHostClick?: (host: HostCoverage) => void;
  showTooltips: boolean;
}> = ({ host, onHostClick, showTooltips }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const hasRecentRuns = host.total_runs > 0;
  const status = getHostStatus(host.success_rate, hasRecentRuns);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`
          relative w-full h-16 rounded-lg border-2 transition-all duration-200 cursor-pointer
          hover:shadow-md hover:scale-105 flex flex-col justify-center items-center p-2
        `}
        style={{
          backgroundColor: status.bgColor,
          borderColor: status.borderColor,
          color: status.color
        }}
        onClick={() => onHostClick?.(host)}
      >
        {/* Host name */}
        <div className="text-xs font-medium text-center leading-tight truncate w-full">
          {host.hostname}
        </div>
        
        {/* Success rate */}
        <div className="text-xs opacity-75 mt-1">
          {hasRecentRuns ? `${host.success_rate.toFixed(0)}%` : 'N/A'}
        </div>

        {/* Running indicator */}
        {hasRecentRuns && host.total_runs > 0 && (
          <div 
            className="absolute top-1 right-1 w-2 h-2 rounded-full"
            style={{ backgroundColor: status.color }}
          />
        )}
      </div>

      {/* Tooltip */}
      {showTooltips && showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3">
          <div className="font-semibold mb-2">{host.hostname}</div>
          
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300">Status:</span>
              <span style={{ color: status.color }}>{status.status}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-300">Success Rate:</span>
              <span>{hasRecentRuns ? `${host.success_rate.toFixed(1)}%` : 'No data'}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-300">Total Runs:</span>
              <span>{host.total_runs}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-300">Successful:</span>
              <span className="text-green-400">{host.successful_runs}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-300">Failed:</span>
              <span className="text-red-400">{host.failed_runs}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-300">Unreachable:</span>
              <span className="text-orange-400">{host.unreachable_count}</span>
            </div>
            
            {host.last_successful_run && (
              <div className="flex justify-between">
                <span className="text-gray-300">Last Success:</span>
                <span>{formatRelativeTime(host.last_successful_run)}</span>
              </div>
            )}
            
            {host.environments.length > 0 && (
              <div className="mt-2">
                <span className="text-gray-300">Environments:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {host.environments.slice(0, 3).map((env) => (
                    <span
                      key={env}
                      className="px-1 py-0.5 bg-gray-700 rounded text-xs"
                    >
                      {env}
                    </span>
                  ))}
                  {host.environments.length > 3 && (
                    <span className="text-gray-400">+{host.environments.length - 3}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
        </div>
      )}
    </div>
  );
};

/**
 * HostCoverageMap Component
 */
export const HostCoverageMap: React.FC<HostCoverageMapProps> = ({
  hostCoverage,
  environments,
  selectedEnvironment,
  minSuccessRate,
  columns = 8,
  showTooltips = true,
  className = '',
  onHostClick,
  onEnvironmentChange,
  onSuccessRateChange
}) => {
  const { isMobile, isTablet } = useResponsive();

  // Adjust columns based on screen size
  const gridColumns = useMemo(() => {
    if (isMobile) return 3;
    if (isTablet) return 5;
    return columns;
  }, [isMobile, isTablet, columns]);

  // Filter hosts based on selected filters
  const filteredHosts = useMemo(() => {
    let filtered = [...hostCoverage];

    // Filter by environment
    if (selectedEnvironment) {
      filtered = filtered.filter(host => 
        host.environments.includes(selectedEnvironment)
      );
    }

    // Filter by minimum success rate
    if (minSuccessRate !== undefined) {
      filtered = filtered.filter(host => 
        host.total_runs === 0 || host.success_rate >= minSuccessRate
      );
    }

    // Sort by success rate (descending) and then by hostname
    return filtered.sort((a, b) => {
      if (a.success_rate !== b.success_rate) {
        return b.success_rate - a.success_rate;
      }
      return a.hostname.localeCompare(b.hostname);
    });
  }, [hostCoverage, selectedEnvironment, minSuccessRate]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredHosts.length;
    const excellent = filteredHosts.filter(h => h.success_rate >= 95).length;
    const good = filteredHosts.filter(h => h.success_rate >= 85 && h.success_rate < 95).length;
    const warning = filteredHosts.filter(h => h.success_rate >= 70 && h.success_rate < 85).length;
    const critical = filteredHosts.filter(h => h.success_rate < 70 && h.total_runs > 0).length;
    const noData = filteredHosts.filter(h => h.total_runs === 0).length;

    return { total, excellent, good, warning, critical, noData };
  }, [filteredHosts]);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Host Coverage Map
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {stats.total} hosts • {Math.round((stats.excellent + stats.good) / stats.total * 100)}% healthy
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4 lg:mt-0">
          {/* Environment filter */}
          <select
            value={selectedEnvironment || ''}
            onChange={(e) => onEnvironmentChange?.(e.target.value || undefined)}
            className="px-3 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Environments</option>
            {environments.map((env) => (
              <option key={env.name} value={env.name}>
                {env.name} ({env.host_count})
              </option>
            ))}
          </select>

          {/* Success rate filter */}
          <select
            value={minSuccessRate || ''}
            onChange={(e) => onSuccessRateChange?.(e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Success Rates</option>
            <option value="95">≥95% (Excellent)</option>
            <option value="85">≥85% (Good)</option>
            <option value="70">≥70% (Warning)</option>
            <option value="0">≥0% (All)</option>
          </select>
        </div>
      </div>

      {/* Statistics bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600 dark:text-green-400">
            {stats.excellent}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Excellent</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-green-500 dark:text-green-400">
            {stats.good}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Good</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-yellow-500 dark:text-yellow-400">
            {stats.warning}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Warning</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-red-500 dark:text-red-400">
            {stats.critical}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Critical</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-500 dark:text-gray-400">
            {stats.noData}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">No Data</div>
        </div>
      </div>

      {/* Host grid */}
      {filteredHosts.length > 0 ? (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`
          }}
        >
          {filteredHosts.map((host) => (
            <HostTile
              key={host.hostname}
              host={host}
              onHostClick={onHostClick}
              showTooltips={showTooltips}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            No hosts match the current filters
          </div>
          <button
            onClick={() => {
              onEnvironmentChange?.(undefined);
              onSuccessRateChange?.(undefined);
            }}
            className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-green-400 border border-green-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Excellent (≥95%)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-green-300 border border-green-400" />
              <span className="text-gray-600 dark:text-gray-400">
                Good (85-94%)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-yellow-300 border border-yellow-400" />
              <span className="text-gray-600 dark:text-gray-400">
                Warning (70-84%)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-red-300 border border-red-400" />
              <span className="text-gray-600 dark:text-gray-400">
                Critical (&lt;70%)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-gray-200 border border-gray-300" />
              <span className="text-gray-600 dark:text-gray-400">
                No Data
              </span>
            </div>
          </div>
          
          <div className="text-gray-500 dark:text-gray-400">
            Click a host for details
          </div>
        </div>
      </div>
    </div>
  );
}; 