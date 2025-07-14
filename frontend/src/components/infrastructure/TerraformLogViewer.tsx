/**
 * Terraform Log Viewer Component
 * 
 * Interactive component for displaying parsed Terraform logs with risk assessment,
 * filtering capabilities, and expandable modules. Integrates with the existing theme system.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  StatusIndicator, 
  MetricCard, 
  MetricCardGrid, 
  LoadingSkeleton, 
  Button,
  type StatusType 
} from '../ui';
import { 
  TerraformLogViewerProps, 
  ResourceChange, 
  RiskLevel, 
  ActionType,
  TerraformViewerFilters,
  TerraformModule,
  TerraformSummaryStats
} from '../../types/terraform';

// Risk level to status mapping for consistent theming
const getRiskStatus = (riskLevel: RiskLevel): StatusType => {
  switch (riskLevel) {
    case 'CRITICAL': return 'error';
    case 'HIGH': return 'error';
    case 'MEDIUM': return 'warning';
    case 'LOW': return 'success';
    default: return 'neutral';
  }
};

// Action type styling
const getActionStyle = (action: ActionType): string => {
  switch (action) {
    case 'create': return 'text-green-600 bg-green-50 border-green-200';
    case 'update': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'delete': return 'text-red-600 bg-red-50 border-red-200';
    case 'replace': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'no-op': return 'text-gray-600 bg-gray-50 border-gray-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

// Action icons
const getActionIcon = (action: ActionType): string => {
  switch (action) {
    case 'create': return '+';
    case 'update': return '~';
    case 'delete': return '-';
    case 'replace': return '↻';
    case 'no-op': return '○';
    default: return '?';
  }
};

// Filter Controls Component
interface FilterControlsProps {
  filters: TerraformViewerFilters;
  availableResourceTypes: string[];
  availableEnvironments: string[];
  onFiltersChange: (filters: TerraformViewerFilters) => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  availableResourceTypes,
  availableEnvironments,
  onFiltersChange
}) => {
  const handleFilterChange = (key: keyof TerraformViewerFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
        Filter Resources
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Risk Level Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Risk Level
          </label>
          <select
            value={filters.riskLevel || 'all'}
            onChange={(e) => handleFilterChange('riskLevel', e.target.value === 'all' ? undefined : e.target.value)}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Risk Levels</option>
            <option value="LOW">Low Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="HIGH">High Risk</option>
            <option value="CRITICAL">Critical Risk</option>
          </select>
        </div>

        {/* Resource Type Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Resource Type
          </label>
          <select
            value={filters.resourceType || 'all'}
            onChange={(e) => handleFilterChange('resourceType', e.target.value === 'all' ? undefined : e.target.value)}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Resource Types</option>
            {availableResourceTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Action Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Action
          </label>
          <select
            value={filters.action || 'all'}
            onChange={(e) => handleFilterChange('action', e.target.value === 'all' ? undefined : e.target.value)}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="replace">Replace</option>
            <option value="no-op">No Operation</option>
          </select>
        </div>

        {/* Environment Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Environment
          </label>
          <select
            value={filters.environment || 'all'}
            onChange={(e) => handleFilterChange('environment', e.target.value === 'all' ? undefined : e.target.value)}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Environments</option>
            {availableEnvironments.map(env => (
              <option key={env} value={env}>{env}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sensitive Data Toggle */}
      <div className="mt-4 flex items-center">
        <input
          type="checkbox"
          id="showSensitiveData"
          checked={filters.showSensitiveData || false}
          onChange={(e) => handleFilterChange('showSensitiveData', e.target.checked)}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="showSensitiveData" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
          Show sensitive data
        </label>
      </div>
    </div>
  );
};

// Resource Change Component
interface ResourceChangeItemProps {
  resource: ResourceChange;
  showSensitiveData: boolean;
  onResourceSelect?: (resource: ResourceChange) => void;
}

const ResourceChangeItem: React.FC<ResourceChangeItemProps> = ({
  resource,
  showSensitiveData,
  onResourceSelect
}) => {
  const [expanded, setExpanded] = useState(false);
  
  const hasSensitiveData = resource.sensitive_attributes && resource.sensitive_attributes.length > 0;
  const shouldHideSensitive = hasSensitiveData && !showSensitiveData;

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const maskedValue = (value: any): string => {
    return shouldHideSensitive ? '********' : formatValue(value);
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-4 overflow-hidden">
      {/* Header */}
      <div 
        className="bg-gray-50 dark:bg-gray-800 px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Action Icon */}
            <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-mono font-bold border ${getActionStyle(resource.action)}`}>
              {getActionIcon(resource.action)}
            </span>
            
            {/* Resource Info */}
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {resource.address}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {resource.resource_type} • {resource.action}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Risk Level */}
            <StatusIndicator 
              status={getRiskStatus(resource.risk_level)}
              size="sm"
              label={resource.risk_level}
            />
            
            {/* Sensitive Data Warning */}
            {hasSensitiveData && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                🔒 Sensitive
              </span>
            )}

            {/* Expand Arrow */}
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-4 bg-white dark:bg-gray-900">
          {/* Change Summary */}
          {resource.change_summary && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Summary</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{resource.change_summary}</p>
            </div>
          )}

          {/* Before/After Changes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Before */}
            {resource.before && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                  Before
                </h4>
                <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded border overflow-x-auto">
                  {maskedValue(resource.before)}
                </pre>
              </div>
            )}

            {/* After */}
            {resource.after && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  After
                </h4>
                <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded border overflow-x-auto">
                  {maskedValue(resource.after)}
                </pre>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {resource.requires_replacement && (
              <div className="flex items-center text-orange-600 dark:text-orange-400">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Requires Replacement
              </div>
            )}
            
            {resource.provider_name && (
              <div className="text-gray-600 dark:text-gray-400">
                Provider: {resource.provider_name}
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onResourceSelect?.(resource)}
            >
              View Details
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Summary Stats Component
interface SummaryStatsProps {
  stats: TerraformSummaryStats;
  loading?: boolean;
}

const SummaryStats: React.FC<SummaryStatsProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <MetricCardGrid>
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" />
      </MetricCardGrid>
    );
  }

  return (
    <MetricCardGrid>
      <MetricCard
        title="Total Changes"
        value={stats.total_changes.toString()}
        size="sm"
      />
      
      <MetricCard
        title="High Risk Changes"
        value={(stats.changes_by_risk.HIGH + stats.changes_by_risk.CRITICAL).toString()}
        size="sm"
      />
      
      <MetricCard
        title="Requires Approval"
        value={stats.requires_approval ? "Yes" : "No"}
        size="sm"
      />
      
      {stats.cost_impact && (
        <MetricCard
          title="Cost Impact"
          value={`${stats.cost_impact.estimated_change >= 0 ? '+' : ''}$${stats.cost_impact.estimated_change}`}
          size="sm"
        />
      )}
    </MetricCardGrid>
  );
};

// Main Component
export const TerraformLogViewer: React.FC<TerraformLogViewerProps> = ({
  logData,
  infrastructureChange,
  loading = false,
  error,
  className = '',
  filters = {},
  config = {},
  onFiltersChange,
  onResourceSelect,
  onRefresh
}) => {
  const [currentFilters, setCurrentFilters] = useState<TerraformViewerFilters>(filters);

  // Compute filtered resources and summary stats
  const { filteredResources, summaryStats, availableTypes, availableEnvironments } = useMemo(() => {
    if (!logData?.resource_changes) {
      return {
        filteredResources: [],
        summaryStats: {
          total_changes: 0,
          changes_by_risk: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
          changes_by_action: { create: 0, update: 0, delete: 0, replace: 0, 'no-op': 0 },
          resources_by_type: {},
          environments: [],
          requires_approval: false
        } as TerraformSummaryStats,
        availableTypes: [],
        availableEnvironments: []
      };
    }

    const resources = logData.resource_changes;
    
    // Apply filters
    const filtered = resources.filter(resource => {
      if (currentFilters.riskLevel && resource.risk_level !== currentFilters.riskLevel) return false;
      if (currentFilters.resourceType && resource.resource_type !== currentFilters.resourceType) return false;
      if (currentFilters.action && resource.action !== currentFilters.action) return false;
      return true;
    });

    // Compute stats
    const stats: TerraformSummaryStats = {
      total_changes: filtered.length,
      changes_by_risk: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      changes_by_action: { create: 0, update: 0, delete: 0, replace: 0, 'no-op': 0 },
      resources_by_type: {},
      environments: infrastructureChange ? [infrastructureChange.target_environment] : [],
      requires_approval: logData.risk_assessment.requires_approval
    };

    filtered.forEach(resource => {
      stats.changes_by_risk[resource.risk_level]++;
      stats.changes_by_action[resource.action]++;
      stats.resources_by_type[resource.resource_type] = (stats.resources_by_type[resource.resource_type] || 0) + 1;
    });

    return {
      filteredResources: filtered,
      summaryStats: stats,
      availableTypes: [...new Set(resources.map(r => r.resource_type))],
      availableEnvironments: infrastructureChange ? [infrastructureChange.target_environment] : []
    };
  }, [logData, currentFilters, infrastructureChange]);

  const handleFiltersChange = useCallback((newFilters: TerraformViewerFilters) => {
    setCurrentFilters(newFilters);
    onFiltersChange?.(newFilters);
  }, [onFiltersChange]);

  // Error state
  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 ${className}`}>
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Error Loading Terraform Data</h3>
        </div>
        <p className="mt-2 text-red-700 dark:text-red-300">{error}</p>
        {onRefresh && (
          <Button variant="outline" size="sm" className="mt-4" onClick={onRefresh}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="list" />
        <LoadingSkeleton variant="list" />
      </div>
    );
  }

  // No data state
  if (!logData) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center ${className}`}>
        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Terraform Data</h3>
        <p className="text-gray-600 dark:text-gray-400">Upload or paste Terraform logs to view parsed results.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Terraform Log Analysis
          </h2>
          {logData.terraform_version && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Terraform v{logData.terraform_version} • {logData.format} format
            </p>
          )}
        </div>
        
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      <SummaryStats stats={summaryStats} loading={loading} />

      {/* Risk Assessment Summary */}
      {logData.risk_assessment && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Risk Assessment</h3>
            <StatusIndicator 
              status={getRiskStatus(logData.risk_assessment.overall_risk)}
              label={`${logData.risk_assessment.overall_risk} RISK`}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Risk Score</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {(logData.risk_assessment.risk_score * 100).toFixed(1)}%
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Impact Scope</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
                {logData.risk_assessment.impact_scope}
              </div>
            </div>
          </div>

          {logData.risk_assessment.mitigation_recommendations.length > 0 && (
            <div className="mt-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Recommendations</div>
              <ul className="space-y-1">
                {logData.risk_assessment.mitigation_recommendations.slice(0, 3).map((rec, index) => (
                  <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      {config.enableFiltering !== false && (
        <FilterControls
          filters={currentFilters}
          availableResourceTypes={availableTypes}
          availableEnvironments={availableEnvironments}
          onFiltersChange={handleFiltersChange}
        />
      )}

      {/* Resource Changes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Resource Changes ({filteredResources.length})
          </h3>
        </div>

        {filteredResources.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">No resources match the current filters.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredResources.map((resource, index) => (
              <ResourceChangeItem
                key={`${resource.address}-${index}`}
                resource={resource}
                showSensitiveData={currentFilters.showSensitiveData || false}
                onResourceSelect={onResourceSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TerraformLogViewer; 