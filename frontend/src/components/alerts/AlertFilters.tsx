/**
 * Alert Filters Component
 * 
 * Component for filtering and sorting alerts with various criteria.
 * Provides a comprehensive filtering interface.
 */

import React, { useState } from 'react';
import { AlertFilter, AlertSortOptions, AlertSeverity, AlertStatus, AlertCategory, AlertChannel } from '../../types/alert';
import { Button } from '../ui';
import { AccessibleSelect } from '../ui/AccessibleSelect';

interface AlertFiltersProps {
  /** Current filter state */
  filter: AlertFilter;
  /** Filter change handler */
  onFilterChange: (filter: AlertFilter) => void;
  /** Current sort state */
  sort: AlertSortOptions;
  /** Sort change handler */
  onSortChange: (sort: AlertSortOptions) => void;
  /** Compact view mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AlertFilters Component
 * 
 * Provides filtering and sorting controls for alerts including:
 * - Severity filtering
 * - Status filtering
 * - Category filtering
 * - Channel filtering
 * - Date range filtering
 * - Search functionality
 * - Sort options
 * 
 * @param filter - Current filter state
 * @param onFilterChange - Filter change handler
 * @param sort - Current sort state
 * @param onSortChange - Sort change handler
 * @param compact - Compact view mode
 * @param className - Additional CSS classes
 */
const AlertFilters: React.FC<AlertFiltersProps> = ({
  filter,
  onFilterChange,
  sort,
  onSortChange,
  compact = false,
  className = '',
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchValue, setSearchValue] = useState(filter.search || '');

  /**
   * Update filter with new values
   */
  const updateFilter = (updates: Partial<AlertFilter>) => {
    onFilterChange({ ...filter, ...updates });
  };

  /**
   * Handle search input
   */
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    updateFilter({ search: value || undefined });
  };

  /**
   * Handle multi-select changes
   */
  const handleMultiSelectChange = (key: keyof AlertFilter, value: string, checked: boolean) => {
    const currentValues = (filter[key] as string[]) || [];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);
    
    updateFilter({ [key]: newValues.length > 0 ? newValues : undefined });
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setSearchValue('');
    onFilterChange({});
  };

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = () => {
    return Object.keys(filter).length > 0;
  };

  const severityOptions: AlertSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const statusOptions: AlertStatus[] = ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'SUPPRESSED'];
  const categoryOptions: AlertCategory[] = [
    'INFRASTRUCTURE', 'PERFORMANCE', 'SECURITY', 'AVAILABILITY',
    'DEPLOYMENT', 'MONITORING', 'NETWORK', 'DATABASE', 'APPLICATION', 'GENERAL'
  ];
  const channelOptions: AlertChannel[] = ['SLACK', 'WEBHOOK', 'EMAIL', 'SMS'];

  const sortOptions = [
    { value: 'created_at', label: 'Created Date' },
    { value: 'updated_at', label: 'Updated Date' },
    { value: 'severity', label: 'Severity' },
    { value: 'status', label: 'Status' },
    { value: 'category', label: 'Category' },
  ];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${compact ? 'p-3' : 'p-4'} ${className}`}>
      {/* Basic Filters Row */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        {/* Search */}
        <div className="flex-1 min-w-64">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <AccessibleSelect
            value={sort.field}
            onChange={(value) => onSortChange({ ...sort, field: value as AlertSortOptions['field'] })}
            options={sortOptions}
            placeholder="Sort by"
            size="sm"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSortChange({ ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' })}
            className="px-2"
          >
            {sort.direction === 'asc' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
              </svg>
            )}
          </Button>
        </div>

        {/* Advanced Toggle */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? 'Less' : 'More'} Filters
        </Button>

        {/* Clear Filters */}
        {hasActiveFilters() && (
          <Button
            size="sm"
            variant="ghost"
            onClick={clearFilters}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Severity
            </label>
            <div className="flex flex-wrap gap-2">
              {severityOptions.map((severity) => (
                <label key={severity} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={filter.severity?.includes(severity) || false}
                    onChange={(e) => handleMultiSelectChange('severity', severity, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className={`ml-2 text-sm ${
                    severity === 'CRITICAL' ? 'text-red-600 dark:text-red-400' :
                    severity === 'HIGH' ? 'text-orange-600 dark:text-orange-400' :
                    severity === 'MEDIUM' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-blue-600 dark:text-blue-400'
                  }`}>
                    {severity}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((status) => (
                <label key={status} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={filter.status?.includes(status) || false}
                    onChange={(e) => handleMultiSelectChange('status', status, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {status}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {categoryOptions.map((category) => (
                <label key={category} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={filter.category?.includes(category) || false}
                    onChange={(e) => handleMultiSelectChange('category', category, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {category}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Channel Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Channel
            </label>
            <div className="flex flex-wrap gap-2">
              {channelOptions.map((channel) => (
                <label key={channel} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={filter.channel?.includes(channel) || false}
                    onChange={(e) => handleMultiSelectChange('channel', channel, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {channel}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date Range
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filter.date_range?.start || ''}
                onChange={(e) => updateFilter({
                  date_range: {
                    start: e.target.value,
                    end: filter.date_range?.end || ''
                  }
                })}
                className="block px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <span className="text-gray-500 dark:text-gray-400">to</span>
              <input
                type="date"
                value={filter.date_range?.end || ''}
                onChange={(e) => updateFilter({
                  date_range: {
                    start: filter.date_range?.start || '',
                    end: e.target.value
                  }
                })}
                className="block px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters() && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {filter.severity?.map((severity) => (
              <span
                key={`severity-${severity}`}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
              >
                Severity: {severity}
                <button
                  onClick={() => handleMultiSelectChange('severity', severity, false)}
                  className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  ×
                </button>
              </span>
            ))}
            
            {filter.status?.map((status) => (
              <span
                key={`status-${status}`}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
              >
                Status: {status}
                <button
                  onClick={() => handleMultiSelectChange('status', status, false)}
                  className="ml-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                >
                  ×
                </button>
              </span>
            ))}
            
            {filter.category?.map((category) => (
              <span
                key={`category-${category}`}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
              >
                Category: {category}
                <button
                  onClick={() => handleMultiSelectChange('category', category, false)}
                  className="ml-1 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
                >
                  ×
                </button>
              </span>
            ))}
            
            {filter.search && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                Search: "{filter.search}"
                <button
                  onClick={() => handleSearchChange('')}
                  className="ml-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertFilters; 