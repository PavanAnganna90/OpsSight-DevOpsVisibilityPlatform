/**
 * Git Activity Filters Component
 * 
 * Provides filtering and view customization controls for the Git Activity Heatmap.
 * Includes date range selection, activity type filtering, and view options.
 */

import React, { useState, useCallback } from 'react';
import { format, subDays, subMonths, subYears } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  CalendarIcon,
  FunnelIcon,
  EyeIcon,
  ChevronDownIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import {
  GitActivityFilters as GitActivityFiltersType,
  GitActivityViewOptions
} from '../../types/git-activity';

export interface GitActivityFiltersProps {
  filters: GitActivityFiltersType;
  viewOptions: GitActivityViewOptions;
  onFiltersChange: (filters: Partial<GitActivityFiltersType>) => void;
  onViewOptionsChange: (options: Partial<GitActivityViewOptions>) => void;
  onReset: () => void;
  availableContributors?: string[];
  availableRepositories?: string[];
  className?: string;
}

/**
 * Date Range Preset Options
 */
const DATE_PRESETS = [
  { label: 'Last 7 days', value: 7, unit: 'days' as const },
  { label: 'Last 30 days', value: 30, unit: 'days' as const },
  { label: 'Last 3 months', value: 3, unit: 'months' as const },
  { label: 'Last 6 months', value: 6, unit: 'months' as const },
  { label: 'Last year', value: 1, unit: 'years' as const },
  { label: 'Custom', value: 0, unit: 'custom' as const }
];

/**
 * Activity Type Options
 */
const ACTIVITY_TYPES = [
  { value: 'commits', label: 'Commits', color: 'blue' },
  { value: 'prs', label: 'Pull Requests', color: 'green' },
  { value: 'reviews', label: 'Reviews', color: 'purple' }
] as const;

/**
 * View Type Options
 */
const VIEW_TYPES = [
  { value: 'daily', label: 'Daily', icon: '📅' },
  { value: 'weekly', label: 'Weekly', icon: '📊' },
  { value: 'monthly', label: 'Monthly', icon: '📈' }
] as const;

/**
 * Sort Options
 */
const SORT_OPTIONS = [
  { value: 'date', label: 'Date' },
  { value: 'activity', label: 'Activity' },
  { value: 'commits', label: 'Commits' },
  { value: 'prs', label: 'Pull Requests' }
] as const;

/**
 * Dropdown Component
 */
const Dropdown: React.FC<{
  trigger: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}> = ({ trigger, children, isOpen, onToggle, className = '' }) => {
  return (
    <div className={clsx('relative', className)}>
      <button
        onClick={onToggle}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {trigger}
        <ChevronDownIcon 
          className={clsx(
            'w-4 h-4 transition-transform duration-200',
            isOpen && 'transform rotate-180'
          )} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Multi-Select Component
 */
const MultiSelect: React.FC<{
  options: readonly { value: string; label: string; color?: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
}> = ({ options, selected, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = useCallback((value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter(item => item !== value)
      : [...selected, value];
    onChange(newSelected);
  }, [selected, onChange]);

  const handleRemove = useCallback((value: string) => {
    onChange(selected.filter(item => item !== value));
  }, [selected, onChange]);

  return (
    <Dropdown
      trigger={
        <div className="flex items-center space-x-2">
          <span>{selected.length > 0 ? `${selected.length} selected` : placeholder}</span>
        </div>
      }
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
    >
      <div className="p-2 max-h-64 overflow-y-auto">
        {options.map(option => {
          const isSelected = selected.includes(option.value);
          return (
            <label
              key={option.value}
              className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(option.value)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {option.label}
              </span>
              {option.color && (
                <div 
                  className={clsx(
                    'w-3 h-3 rounded-full',
                    option.color === 'blue' && 'bg-blue-500',
                    option.color === 'green' && 'bg-green-500',
                    option.color === 'purple' && 'bg-purple-500'
                  )}
                />
              )}
            </label>
          );
        })}
      </div>
    </Dropdown>
  );
};

/**
 * Date Range Picker Component
 */
const DateRangePicker: React.FC<{
  startDate: Date;
  endDate: Date;
  onChange: (startDate: Date, endDate: Date) => void;
}> = ({ startDate, endDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  const handlePresetSelect = useCallback((preset: typeof DATE_PRESETS[0]) => {
    if (preset.unit === 'custom') {
      setSelectedPreset(0);
      return;
    }

    const now = new Date();
    let newStartDate: Date;

    switch (preset.unit) {
      case 'days':
        newStartDate = subDays(now, preset.value);
        break;
      case 'months':
        newStartDate = subMonths(now, preset.value);
        break;
      case 'years':
        newStartDate = subYears(now, preset.value);
        break;
      default:
        newStartDate = subDays(now, 30);
    }

    onChange(newStartDate, now);
    setSelectedPreset(preset.value);
    setIsOpen(false);
  }, [onChange]);

  return (
    <Dropdown
      trigger={
        <div className="flex items-center space-x-2">
          <CalendarIcon className="w-4 h-4" />
          <span>
            {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
          </span>
        </div>
      }
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
    >
      <div className="p-2">
        <div className="space-y-1">
          {DATE_PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => handlePresetSelect(preset)}
              className={clsx(
                'w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700',
                selectedPreset === preset.value && 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {selectedPreset === 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={format(startDate, 'yyyy-MM-dd')}
                  onChange={(e) => onChange(new Date(e.target.value), endDate)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={format(endDate, 'yyyy-MM-dd')}
                  onChange={(e) => onChange(startDate, new Date(e.target.value))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Dropdown>
  );
};

/**
 * Main Git Activity Filters Component
 */
export const GitActivityFilters: React.FC<GitActivityFiltersProps> = ({
  filters,
  viewOptions,
  onFiltersChange,
  onViewOptionsChange,
  onReset,
  availableContributors = [],
  availableRepositories = [],
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleActivityTypesChange = useCallback((activityTypes: string[]) => {
    onFiltersChange({ 
      activityTypes: activityTypes as ('commits' | 'prs' | 'reviews')[] 
    });
  }, [onFiltersChange]);

  const handleContributorsChange = useCallback((contributors: string[]) => {
    onFiltersChange({ contributors });
  }, [onFiltersChange]);

  const handleRepositoriesChange = useCallback((repositories: string[]) => {
    onFiltersChange({ repositories });
  }, [onFiltersChange]);

  const handleDateRangeChange = useCallback((startDate: Date, endDate: Date) => {
    onFiltersChange({ 
      dateRange: { startDate, endDate } 
    });
  }, [onFiltersChange]);

  const handleViewTypeChange = useCallback((viewType: GitActivityViewOptions['viewType']) => {
    onViewOptionsChange({ viewType });
  }, [onViewOptionsChange]);

  const handleSortChange = useCallback((sortBy: GitActivityViewOptions['sortBy'], sortOrder: GitActivityViewOptions['sortOrder']) => {
    onViewOptionsChange({ sortBy, sortOrder });
  }, [onViewOptionsChange]);

  const hasActiveFilters = 
    filters.activityTypes.length < ACTIVITY_TYPES.length ||
    filters.contributors.length > 0 ||
    filters.repositories.length > 0;

  return (
    <div className={clsx('bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Filters & View Options
          </h3>
          {hasActiveFilters && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              Active
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <XMarkIcon className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
          >
            <EyeIcon className="w-3 h-3" />
            <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
          </button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Date Range */}
        <DateRangePicker
          startDate={filters.dateRange.startDate}
          endDate={filters.dateRange.endDate}
          onChange={handleDateRangeChange}
        />

        {/* Activity Types */}
        <MultiSelect
          options={ACTIVITY_TYPES}
          selected={filters.activityTypes}
          onChange={handleActivityTypesChange}
          placeholder="Activity Types"
        />

        {/* View Type */}
        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-md p-1">
          {VIEW_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => handleViewTypeChange(type.value)}
              className={clsx(
                'px-3 py-1 text-xs font-medium rounded transition-colors',
                viewOptions.viewType === type.value
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              )}
            >
              <span className="mr-1">{type.icon}</span>
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expanded Filters */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Contributors Filter */}
                {availableContributors.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contributors
                    </label>
                    <MultiSelect
                      options={availableContributors.map(contributor => ({
                        value: contributor,
                        label: contributor
                      }))}
                      selected={filters.contributors}
                      onChange={handleContributorsChange}
                      placeholder="All Contributors"
                    />
                  </div>
                )}

                {/* Repositories Filter */}
                {availableRepositories.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Repositories
                    </label>
                    <MultiSelect
                      options={availableRepositories.map(repo => ({
                        value: repo,
                        label: repo
                      }))}
                      selected={filters.repositories}
                      onChange={handleRepositoriesChange}
                      placeholder="All Repositories"
                    />
                  </div>
                )}

                {/* Sort Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sort By
                  </label>
                  <div className="flex space-x-2">
                    <select
                      value={viewOptions.sortBy}
                      onChange={(e) => handleSortChange(e.target.value as GitActivityViewOptions['sortBy'], viewOptions.sortOrder)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {SORT_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    
                    <button
                      onClick={() => handleSortChange(viewOptions.sortBy, viewOptions.sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      {viewOptions.sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {filters.activityTypes.length < ACTIVITY_TYPES.length && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                {filters.activityTypes.length} activity types
              </span>
            )}
            
            {filters.contributors.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                {filters.contributors.length} contributors
              </span>
            )}
            
            {filters.repositories.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                {filters.repositories.length} repositories
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GitActivityFilters; 