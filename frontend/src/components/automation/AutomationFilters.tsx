/**
 * Automation Filters Component
 * 
 * Comprehensive filtering and grouping controls for automation coverage visualization.
 * Features:
 * - Advanced filtering by multiple criteria
 * - Grouping options with hierarchical organization
 * - Persistent filter state and user preferences
 * - Real-time filter application with debouncing
 * - Filter presets and saved configurations
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AutomationFilter, AutomationStatus, AutomationType, Environment } from '../../types/automation';
import { useResponsive } from '../../hooks/useResponsive';

export interface FilterState extends AutomationFilter {
  // Additional UI-specific filter state
  searchQuery?: string;
  groupBy?: 'environment' | 'status' | 'playbook' | 'host_type' | 'time_period' | 'none';
  sortBy?: 'name' | 'success_rate' | 'last_run' | 'total_runs';
  sortOrder?: 'asc' | 'desc';
  showAdvanced?: boolean;
}

export interface GroupingOption {
  key: string;
  label: string;
  icon: string;
  description: string;
}

interface AutomationFiltersProps {
  /** Current filter state */
  filters: FilterState;
  /** Available environments for filtering */
  environments?: Environment[];
  /** Available playbooks for filtering */
  playbooks?: string[];
  /** Available hosts for filtering */
  hosts?: string[];
  /** Whether to show grouping options */
  showGrouping?: boolean;
  /** Whether to show advanced filters */
  showAdvanced?: boolean;
  /** Whether filters are collapsed */
  collapsed?: boolean;
  /** Custom className for styling */
  className?: string;
  /** Callback when filters change */
  onFiltersChange?: (filters: FilterState) => void;
  /** Callback when filters are reset */
  onReset?: () => void;
  /** Callback when a preset is saved */
  onSavePreset?: (name: string, filters: FilterState) => void;
  /** Callback when a preset is loaded */
  onLoadPreset?: (preset: { name: string; filters: FilterState }) => void;
}

/**
 * Date range presets
 */
const DATE_PRESETS = [
  { key: 'today', label: 'Today', days: 1 },
  { key: 'week', label: 'Last 7 days', days: 7 },
  { key: 'month', label: 'Last 30 days', days: 30 },
  { key: 'quarter', label: 'Last 90 days', days: 90 },
  { key: 'year', label: 'Last year', days: 365 },
  { key: 'custom', label: 'Custom range', days: 0 }
];

/**
 * Grouping options
 */
const GROUPING_OPTIONS: GroupingOption[] = [
  {
    key: 'none',
    label: 'No Grouping',
    icon: '📋',
    description: 'Show all items in a flat list'
  },
  {
    key: 'environment',
    label: 'Environment',
    icon: '🌍',
    description: 'Group by deployment environment'
  },
  {
    key: 'status',
    label: 'Status',
    icon: '🚦',
    description: 'Group by execution status'
  },
  {
    key: 'playbook',
    label: 'Playbook',
    icon: '📖',
    description: 'Group by playbook name'
  },
  {
    key: 'host_type',
    label: 'Host Type',
    icon: '🖥️',
    description: 'Group by host category'
  },
  {
    key: 'time_period',
    label: 'Time Period',
    icon: '📅',
    description: 'Group by time period'
  }
];

/**
 * AutomationFilters Component
 */
export const AutomationFilters: React.FC<AutomationFiltersProps> = ({
  filters,
  environments = [],
  playbooks = [],
  hosts = [],
  showGrouping = true,
  showAdvanced = false,
  collapsed = false,
  className = '',
  onFiltersChange,
  onReset,
  onSavePreset,
  onLoadPreset
}) => {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(showAdvanced);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const { isMobile } = useResponsive();

  // Debounced search handler
  const handleSearchChange = useCallback((query: string) => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    const timer = setTimeout(() => {
      onFiltersChange?.({
        ...filters,
        searchQuery: query
      });
    }, 300);

    setSearchDebounceTimer(timer);
  }, [filters, onFiltersChange, searchDebounceTimer]);

  // Filter update handler
  const updateFilter = useCallback((updates: Partial<FilterState>) => {
    onFiltersChange?.({
      ...filters,
      ...updates
    });
  }, [filters, onFiltersChange]);

  // Date range handler
  const handleDateRangeChange = useCallback((preset: string, customStart?: string, customEnd?: string) => {
    if (preset === 'custom' && customStart && customEnd) {
      updateFilter({
        date_range: {
          start: customStart,
          end: customEnd
        }
      });
    } else {
      const presetConfig = DATE_PRESETS.find(p => p.key === preset);
      if (presetConfig && presetConfig.days > 0) {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - presetConfig.days);
        
        updateFilter({
          date_range: {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
          }
        });
      }
    }
  }, [updateFilter]);

  // Reset filters
  const handleReset = useCallback(() => {
    const resetFilters: FilterState = {
      groupBy: 'none',
      sortBy: 'name',
      sortOrder: 'asc',
      showAdvanced: false
    };
    onFiltersChange?.(resetFilters);
    onReset?.();
  }, [onFiltersChange, onReset]);

  // Save preset
  const handleSavePreset = useCallback(() => {
    if (presetName.trim() && onSavePreset) {
      onSavePreset(presetName.trim(), filters);
      setPresetName('');
      setShowPresetModal(false);
    }
  }, [presetName, filters, onSavePreset]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status?.length) count++;
    if (filters.automation_type?.length) count++;
    if (filters.environment?.length) count++;
    if (filters.playbook?.length) count++;
    if (filters.date_range) count++;
    if (filters.success_rate_min !== undefined) count++;
    if (filters.hosts_min !== undefined) count++;
    if (filters.searchQuery?.trim()) count++;
    return count;
  }, [filters]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }
    };
  }, [searchDebounceTimer]);

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      {/* Filter Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg
              className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Filters & Grouping
          </h3>
          
          {activeFilterCount > 0 && (
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
              {activeFilterCount} active
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              showAdvancedFilters
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Advanced
          </button>

          {/* Reset button */}
          <button
            onClick={handleReset}
            disabled={activeFilterCount === 0}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Filter Content */}
      {!isCollapsed && (
        <div className="p-4 space-y-6">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search playbooks, hosts, or descriptions..."
                defaultValue={filters.searchQuery || ''}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Basic Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                multiple
                value={filters.status || []}
                onChange={(e) => updateFilter({
                  status: Array.from(e.target.selectedOptions, option => option.value as AutomationStatus)
                })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                size={3}
              >
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="running">Running</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="partial_success">Partial Success</option>
              </select>
            </div>

            {/* Environment Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Environment
              </label>
              <select
                multiple
                value={filters.environment || []}
                onChange={(e) => updateFilter({
                  environment: Array.from(e.target.selectedOptions, option => option.value)
                })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                size={Math.min(environments.length, 3)}
              >
                {environments.map((env) => (
                  <option key={env.name} value={env.name}>
                    {env.name} ({env.host_count} hosts)
                  </option>
                ))}
              </select>
            </div>

            {/* Automation Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                multiple
                value={filters.automation_type || []}
                onChange={(e) => updateFilter({
                  automation_type: Array.from(e.target.selectedOptions, option => option.value as AutomationType)
                })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                size={3}
              >
                <option value="playbook">Playbook</option>
                <option value="role">Role</option>
                <option value="task">Task</option>
                <option value="ad_hoc">Ad Hoc</option>
                <option value="tower_job">Tower Job</option>
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date Range
            </label>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => handleDateRangeChange(preset.key)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    // Simple check for active preset - could be enhanced
                    'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="border-t border-gray-200 dark:border-gray-600 pt-6 space-y-4">
              <h4 className="text-md font-medium text-gray-900 dark:text-white">Advanced Filters</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Success Rate Threshold */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Minimum Success Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={filters.success_rate_min || ''}
                    onChange={(e) => updateFilter({
                      success_rate_min: e.target.value ? parseFloat(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 90"
                  />
                </div>

                {/* Minimum Hosts */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Minimum Hosts
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={filters.hosts_min || ''}
                    onChange={(e) => updateFilter({
                      hosts_min: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 5"
                  />
                </div>
              </div>

              {/* Playbook Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Playbooks
                </label>
                <select
                  multiple
                  value={filters.playbook || []}
                  onChange={(e) => updateFilter({
                    playbook: Array.from(e.target.selectedOptions, option => option.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  size={Math.min(playbooks.length, 4)}
                >
                  {playbooks.map((playbook) => (
                    <option key={playbook} value={playbook}>
                      {playbook}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Grouping Options */}
          {showGrouping && (
            <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Grouping & Sorting</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Group By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Group By
                  </label>
                  <select
                    value={filters.groupBy || 'none'}
                    onChange={(e) => updateFilter({ groupBy: e.target.value as FilterState['groupBy'] })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {GROUPING_OPTIONS.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.icon} {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sort By
                  </label>
                  <div className="flex space-x-2">
                    <select
                      value={filters.sortBy || 'name'}
                      onChange={(e) => updateFilter({ sortBy: e.target.value as FilterState['sortBy'] })}
                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="name">Name</option>
                      <option value="success_rate">Success Rate</option>
                      <option value="last_run">Last Run</option>
                      <option value="total_runs">Total Runs</option>
                    </select>
                    
                    <button
                      onClick={() => updateFilter({ 
                        sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' 
                      })}
                      className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      {filters.sortOrder === 'desc' ? '↓' : '↑'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preset Management */}
          <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-medium text-gray-900 dark:text-white">Filter Presets</h4>
              
              <button
                onClick={() => setShowPresetModal(true)}
                disabled={activeFilterCount === 0}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Preset Modal */}
      {showPresetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Save Filter Preset
            </h3>
            
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Enter preset name..."
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPresetModal(false);
                  setPresetName('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 