/**
 * AWS Cost Filters Component
 * 
 * Provides advanced filtering and view options for AWS cost metrics including
 * service filtering, region selection, tag-based filtering, and view customization.
 */

import React, { useState, useCallback } from 'react';
import {
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
  GlobeAltIcon,
  CubeIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

export interface FilterOptions {
  services: string[];
  regions: string[];
  tags: Record<string, string[]>;
  dateRange: {
    start: string;
    end: string;
  };
  groupBy: 'service' | 'region' | 'tag' | 'account';
  granularity: 'daily' | 'weekly' | 'monthly';
  costType: 'unblended' | 'blended' | 'amortized';
  includeCredits: boolean;
  includeRefunds: boolean;
  includeUpfront: boolean;
}

export interface AwsCostFiltersProps {
  /** Current filter state */
  filters: FilterOptions;
  /** Available services for filtering */
  availableServices: string[];
  /** Available regions for filtering */
  availableRegions: string[];
  /** Available tags for filtering */
  availableTags: Record<string, string[]>;
  /** Callback when filters change */
  onFiltersChange: (filters: FilterOptions) => void;
  /** Callback to reset all filters */
  onResetFilters: () => void;
  /** Show/hide advanced options */
  showAdvanced?: boolean;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * AwsCostFilters Component
 * 
 * Advanced filtering interface for AWS cost data with multiple filter types.
 */
export const AwsCostFilters: React.FC<AwsCostFiltersProps> = ({
  filters,
  availableServices,
  availableRegions,
  availableTags,
  onFiltersChange,
  onResetFilters,
  showAdvanced = false,
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Update specific filter
  const updateFilter = useCallback((key: keyof FilterOptions, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  }, [filters, onFiltersChange]);

  // Toggle service selection
  const toggleService = useCallback((service: string) => {
    const newServices = filters.services.includes(service)
      ? filters.services.filter(s => s !== service)
      : [...filters.services, service];
    updateFilter('services', newServices);
  }, [filters.services, updateFilter]);

  // Toggle region selection
  const toggleRegion = useCallback((region: string) => {
    const newRegions = filters.regions.includes(region)
      ? filters.regions.filter(r => r !== region)
      : [...filters.regions, region];
    updateFilter('regions', newRegions);
  }, [filters.regions, updateFilter]);

  // Count active filters
  const activeFilterCount = 
    filters.services.length + 
    filters.regions.length + 
    Object.values(filters.tags).reduce((sum, values) => sum + values.length, 0);

  // Dropdown component for multi-select
  const MultiSelectDropdown: React.FC<{
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    items: string[];
    selectedItems: string[];
    onToggleItem: (item: string) => void;
    dropdownKey: string;
  }> = ({ title, icon: Icon, items, selectedItems, onToggleItem, dropdownKey }) => {
    const isOpen = activeDropdown === dropdownKey;
    
    return (
      <div className="relative">
        <button
          onClick={() => setActiveDropdown(isOpen ? null : dropdownKey)}
          className={`flex items-center gap-2 px-3 py-2 border rounded-md text-sm transition-colors ${
            selectedItems.length > 0
              ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-300'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          <Icon className="h-4 w-4" />
          <span>{title}</span>
          {selectedItems.length > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full dark:bg-blue-800 dark:text-blue-100">
              {selectedItems.length}
            </span>
          )}
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10 max-h-64 overflow-y-auto">
            <div className="p-2">
              {items.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 p-2">
                  No {title.toLowerCase()} available
                </div>
              ) : (
                items.map(item => (
                  <label
                    key={item}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item)}
                      onChange={() => onToggleItem(item)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{item}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Filters & View Options
          </h3>
          {activeFilterCount > 0 && (
            <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full dark:bg-blue-800 dark:text-blue-100">
              {activeFilterCount} active
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={onResetFilters}
              className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear all
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <AdjustmentsHorizontalIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Services Filter */}
        <MultiSelectDropdown
          title="Services"
          icon={CubeIcon}
          items={availableServices}
          selectedItems={filters.services}
          onToggleItem={toggleService}
          dropdownKey="services"
        />

        {/* Regions Filter */}
        <MultiSelectDropdown
          title="Regions"
          icon={GlobeAltIcon}
          items={availableRegions}
          selectedItems={filters.regions}
          onToggleItem={toggleRegion}
          dropdownKey="regions"
        />

        {/* Group By */}
        <div className="relative">
          <select
            value={filters.groupBy}
            onChange={(e) => updateFilter('groupBy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="service">Group by Service</option>
            <option value="region">Group by Region</option>
            <option value="tag">Group by Tag</option>
            <option value="account">Group by Account</option>
          </select>
        </div>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={filters.dateRange.start}
            onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, start: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={filters.dateRange.end}
            onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, end: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Advanced Options */}
      {(isExpanded || showAdvanced) && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
          {/* Granularity and Cost Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Granularity
              </label>
              <select
                value={filters.granularity}
                onChange={(e) => updateFilter('granularity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cost Type
              </label>
              <select
                value={filters.costType}
                onChange={(e) => updateFilter('costType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="unblended">Unblended Cost</option>
                <option value="blended">Blended Cost</option>
                <option value="amortized">Amortized Cost</option>
              </select>
            </div>
          </div>

          {/* Include Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Include in Cost Calculation
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.includeCredits}
                  onChange={(e) => updateFilter('includeCredits', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">Credits</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.includeRefunds}
                  onChange={(e) => updateFilter('includeRefunds', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">Refunds</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.includeUpfront}
                  onChange={(e) => updateFilter('includeUpfront', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">Upfront Payments</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {filters.services.map(service => (
              <span
                key={`service-${service}`}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full dark:bg-blue-800 dark:text-blue-100"
              >
                Service: {service}
                <button
                  onClick={() => toggleService(service)}
                  className="hover:text-blue-600 dark:hover:text-blue-300"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
            {filters.regions.map(region => (
              <span
                key={`region-${region}`}
                className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full dark:bg-green-800 dark:text-green-100"
              >
                Region: {region}
                <button
                  onClick={() => toggleRegion(region)}
                  className="hover:text-green-600 dark:hover:text-green-300"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Click outside to close dropdowns */}
      {activeDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActiveDropdown(null)}
        />
      )}
    </div>
  );
};
