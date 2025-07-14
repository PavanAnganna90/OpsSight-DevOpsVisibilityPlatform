/**
 * AWS Cost Metrics Panel Component
 * 
 * Displays AWS infrastructure costs with service breakdowns, trends, forecasts,
 * and anomaly detection. Supports filtering and detailed drill-down views.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  ChevronDownIcon,
  XMarkIcon,
  ChevronRightIcon,
  LightBulbIcon,
  ClockIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

export interface CostDataPoint {
  date: string;
  totalCost: number;
  services: Record<string, number>;
  regions?: Record<string, number>;
  tags?: Record<string, Record<string, number>>;
  forecast?: {
    predicted: number;
    confidenceMin: number;
    confidenceMax: number;
  };
}

export interface ServiceCostBreakdown {
  serviceName: string;
  cost: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  color: string;
  regions?: string[];
  tags?: Record<string, string>;
  // Extended for detailed view
  resourceCount?: number;
  averageCostPerResource?: number;
  utilizationPercentage?: number;
  regionBreakdown?: { region: string; cost: number; percentage: number }[];
  resourceTypes?: { type: string; count: number; cost: number }[];
  monthlyTrend?: { month: string; cost: number }[];
}

export interface CostOptimizationRecommendation {
  id: string;
  title: string;
  description: string;
  category: 'right-sizing' | 'reserved-instances' | 'spot-instances' | 'lifecycle' | 'unused-resources' | 'storage' | 'networking';
  severity: 'high' | 'medium' | 'low';
  potentialSavings: number;
  potentialSavingsPercentage: number;
  implementationComplexity: 'easy' | 'medium' | 'complex';
  estimatedTimeToImplement: string;
  serviceName: string;
  actionItems: string[];
  resourcesAffected: number;
}

export interface CostAnomaly {
  date: string;
  expectedCost: number;
  actualCost: number;
  deviationPercentage: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  contributingServices: string[];
}

export interface CostTrend {
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  changePercentage: number;
  changeAmount: number;
  confidence: number;
}

export interface FilterOptions {
  services: string[];
  regions: string[];
  tags: Record<string, string>;
  costThreshold: {
    min: number;
    max: number;
  };
  granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  chartType: 'line' | 'bar' | 'area';
  aggregation: 'sum' | 'average' | 'max';
}

export interface AvailableFilters {
  services: string[];
  regions: string[];
  tags: Record<string, string[]>;
}

export interface AwsCostMetricsPanelProps {
  /** Historical cost data */
  costData: CostDataPoint[];
  /** Service breakdown data */
  serviceBreakdown: ServiceCostBreakdown[];
  /** Detected cost anomalies */
  anomalies: CostAnomaly[];
  /** Overall cost trend */
  costTrend: CostTrend;
  /** Available filter options */
  availableFilters: AvailableFilters;
  /** Cost optimization recommendations */
  recommendations?: CostOptimizationRecommendation[];
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: string;
  /** Time range for data display */
  timeRange?: '7d' | '30d' | '90d' | '1y';
  /** Current filter settings */
  filters?: Partial<FilterOptions>;
  /** Callback for time range change */
  onTimeRangeChange?: (range: '7d' | '30d' | '90d' | '1y') => void;
  /** Callback for filter changes */
  onFiltersChange?: (filters: Partial<FilterOptions>) => void;
  /** Callback for service drill-down */
  onServiceClick?: (serviceName: string) => void;
  /** Callback for export */
  onExport?: (format: 'csv' | 'pdf') => void;
}

const SERVICE_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

/**
 * AwsCostMetricsPanel Component
 * 
 * Main panel for displaying AWS cost metrics with interactive visualizations.
 */
export const AwsCostMetricsPanel: React.FC<AwsCostMetricsPanelProps> = ({
  costData,
  serviceBreakdown,
  anomalies,
  costTrend,
  availableFilters,
  recommendations = [],
  isLoading = false,
  error,
  timeRange = '30d',
  filters,
  onTimeRangeChange,
  onFiltersChange,
  onServiceClick,
  onExport
}) => {
  const [selectedView, setSelectedView] = useState<'overview' | 'trends' | 'services' | 'anomalies'>('overview');
  const [hoveredService, setHoveredService] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<Partial<FilterOptions>>(filters || {});
  const [selectedService, setSelectedService] = useState<string | null>(null);

  // Update local filters when props change
  React.useEffect(() => {
    setLocalFilters(filters || {});
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<FilterOptions>) => {
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  }, [onFiltersChange]);

  // Apply filters to data
  const filteredCostData = useMemo(() => {
    if (!costData || Object.keys(localFilters).length === 0) return costData;

    return costData.filter(dataPoint => {
      // Apply service filter
      if (localFilters.services && localFilters.services.length > 0) {
        const hasSelectedService = localFilters.services.some(service => 
          dataPoint.services[service] > 0
        );
        if (!hasSelectedService) return false;
      }

      // Apply cost threshold filter
      if (localFilters.costThreshold) {
        if (dataPoint.totalCost < localFilters.costThreshold.min || 
            dataPoint.totalCost > localFilters.costThreshold.max) {
          return false;
        }
      }

      return true;
    });
  }, [costData, localFilters]);

  // Apply filters to service breakdown
  const filteredServiceBreakdown = useMemo(() => {
    if (!serviceBreakdown || Object.keys(localFilters).length === 0) return serviceBreakdown;

    let filtered = serviceBreakdown;

    // Apply service filter
    if (localFilters.services && localFilters.services.length > 0) {
      filtered = filtered.filter(service => 
        localFilters.services!.includes(service.serviceName)
      );
    }

    // Apply region filter
    if (localFilters.regions && localFilters.regions.length > 0) {
      filtered = filtered.filter(service => 
        service.regions?.some(region => localFilters.regions!.includes(region))
      );
    }

    return filtered;
  }, [serviceBreakdown, localFilters]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (filteredCostData.length === 0) return null;

    const latestData = filteredCostData[filteredCostData.length - 1];
    const previousData = filteredCostData.length > 1 ? filteredCostData[filteredCostData.length - 2] : null;
    
    const totalCost = latestData.totalCost;
    const previousCost = previousData?.totalCost || 0;
    const changeAmount = totalCost - previousCost;
    const changePercentage = previousCost > 0 ? (changeAmount / previousCost) * 100 : 0;
    
    const avgDailyCost = filteredCostData.reduce((sum, day) => sum + day.totalCost, 0) / filteredCostData.length;

    return {
      totalCost,
      changeAmount,
      changePercentage,
      avgDailyCost,
      totalServices: filteredServiceBreakdown.length,
      criticalAnomalies: anomalies.filter(a => a.severity === 'critical').length
    };
  }, [filteredCostData, filteredServiceBreakdown, anomalies]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Time range options
  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Failed to load cost data
          </h3>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <CurrencyDollarIcon className="h-6 w-6" />
              AWS Cost Metrics
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Monitor your AWS infrastructure costs and spending trends
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Time range selector */}
            <select
              value={timeRange}
              onChange={(e) => onTimeRangeChange?.(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {timeRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Filter toggle button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                showFilters 
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <FunnelIcon className="h-4 w-4" />
              Filters
              {Object.keys(localFilters).length > 0 && (
                <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {Object.keys(localFilters).length}
                </span>
              )}
            </button>

            {/* Export button */}
            <button
              onClick={() => onExport?.('csv')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Service filter */}
              <div>
                <label htmlFor="services-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Services
                </label>
                <div className="relative">
                  <select
                    id="services-filter"
                    multiple
                    value={localFilters.services || []}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      handleFilterChange({ ...localFilters, services: selected });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 max-h-32 overflow-y-auto"
                  >
                    {availableFilters.services.map(service => (
                      <option key={service} value={service} className="py-1">
                        {service}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Region filter */}
              <div>
                <label htmlFor="regions-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Regions
                </label>
                <div className="relative">
                  <select
                    id="regions-filter"
                    multiple
                    value={localFilters.regions || []}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      handleFilterChange({ ...localFilters, regions: selected });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 max-h-32 overflow-y-auto"
                  >
                    {availableFilters.regions.map(region => (
                      <option key={region} value={region} className="py-1">
                        {region}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Granularity selector */}
              <div>
                <label htmlFor="granularity-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Granularity
                </label>
                <select
                  id="granularity-filter"
                  value={localFilters.granularity || 'daily'}
                  onChange={(e) => {
                    handleFilterChange({ ...localFilters, granularity: e.target.value as FilterOptions['granularity'] });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>

              {/* Chart type selector */}
              <div>
                <label htmlFor="chart-type-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Chart Type
                </label>
                <select
                  id="chart-type-filter"
                  value={localFilters.chartType || 'line'}
                  onChange={(e) => {
                    handleFilterChange({ ...localFilters, chartType: e.target.value as FilterOptions['chartType'] });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="line">Line Chart</option>
                  <option value="bar">Bar Chart</option>
                  <option value="area">Area Chart</option>
                </select>
              </div>
            </div>

            {/* Cost threshold filter */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cost Range ($)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Min"
                  value={localFilters.costThreshold?.min || ''}
                  onChange={(e) => {
                    const min = parseFloat(e.target.value) || 0;
                    handleFilterChange({
                      ...localFilters,
                      costThreshold: {
                        ...localFilters.costThreshold,
                        min,
                        max: localFilters.costThreshold?.max || Infinity
                      }
                    });
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={localFilters.costThreshold?.max === Infinity ? '' : localFilters.costThreshold?.max || ''}
                  onChange={(e) => {
                    const max = parseFloat(e.target.value) || Infinity;
                    handleFilterChange({
                      ...localFilters,
                      costThreshold: {
                        min: localFilters.costThreshold?.min || 0,
                        max
                      }
                    });
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Clear filters */}
            {Object.keys(localFilters).length > 0 && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setLocalFilters({});
                    handleFilterChange({});
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* View tabs */}
        <div className="mt-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: ChartBarIcon },
              { id: 'trends', label: 'Trends', icon: ArrowTrendingUpIcon },
              { id: 'services', label: 'Services', icon: CurrencyDollarIcon },
              { id: 'anomalies', label: 'Anomalies', icon: ExclamationTriangleIcon }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedView(tab.id as any)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  selectedView === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.id === 'anomalies' && anomalies.length > 0 && (
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full ml-1">
                    {anomalies.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Summary metrics */}
      {summaryMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(summaryMetrics.totalCost)}
                </p>
              </div>
              <div className={`flex items-center text-sm ${
                summaryMetrics.changePercentage >= 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {summaryMetrics.changePercentage >= 0 ? 
                  <ArrowTrendingUpIcon className="h-4 w-4 mr-1" /> : 
                  <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                }
                {formatPercentage(summaryMetrics.changePercentage)}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Daily Average</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(summaryMetrics.avgDailyCost)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Services</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {summaryMetrics.totalServices}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Anomalies</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {summaryMetrics.criticalAnomalies}
                </p>
              </div>
              {summaryMetrics.criticalAnomalies > 0 && (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content based on selected view */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost trend chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Cost Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              {localFilters.chartType === 'bar' ? (
                <BarChart data={filteredCostData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="date" 
                    className="text-gray-600 dark:text-gray-400"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    className="text-gray-600 dark:text-gray-400"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="totalCost" 
                    fill="#3B82F6" 
                  />
                </BarChart>
              ) : localFilters.chartType === 'area' ? (
                <AreaChart data={filteredCostData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="date" 
                    className="text-gray-600 dark:text-gray-400"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    className="text-gray-600 dark:text-gray-400"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="totalCost" 
                    stroke="#3B82F6" 
                    fill="#3B82F6"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              ) : (
                <LineChart data={filteredCostData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="date" 
                    className="text-gray-600 dark:text-gray-400"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    className="text-gray-600 dark:text-gray-400"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="totalCost" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  {filteredCostData.some(d => d.forecast) && (
                    <>
                      <Line 
                        type="monotone" 
                        dataKey="forecast.predicted" 
                        stroke="#F59E0B" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="forecast.confidenceMin" 
                        stroke="#F59E0B" 
                        strokeWidth={1}
                        strokeDasharray="2 2"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="forecast.confidenceMax" 
                        stroke="#F59E0B" 
                        strokeWidth={1}
                        strokeDasharray="2 2"
                        dot={false}
                      />
                    </>
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Service breakdown pie chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Service Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={filteredServiceBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ serviceName, percentage }) => `${serviceName} (${percentage.toFixed(1)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="cost"
                  onMouseEnter={(_, index) => setHoveredService(filteredServiceBreakdown[index]?.serviceName)}
                  onMouseLeave={() => setHoveredService(null)}
                  onClick={(data) => {
                    setSelectedService(data.serviceName);
                    setSelectedView('services');
                    onServiceClick?.(data.serviceName);
                  }}
                  className="cursor-pointer"
                >
                  {filteredServiceBreakdown.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color || SERVICE_COLORS[index % SERVICE_COLORS.length]}
                      className={hoveredService === entry.serviceName ? 'opacity-80' : 'opacity-100'}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Additional views placeholders for next subtasks */}
      {selectedView === 'trends' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Detailed Trend Analysis
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Advanced trend analysis will be implemented in the next subtask.
          </p>
        </div>
      )}

      {selectedView === 'services' && (
        <div className="space-y-6">
          {/* Service overview or detailed view */}
          {!selectedService ? (
            <>
              {/* Service list with metrics */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Service Cost Breakdown
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click on a service for detailed analysis
                  </p>
                </div>
                
                <div className="space-y-4">
                  {filteredServiceBreakdown.map((service, index) => (
                    <div
                      key={service.serviceName}
                      onClick={() => setSelectedService(service.serviceName)}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: service.color || SERVICE_COLORS[index % SERVICE_COLORS.length] }}
                          />
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                              {service.serviceName}
                            </h4>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {service.resourceCount || 0} resources
                              </span>
                              {service.utilizationPercentage && (
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {service.utilizationPercentage}% utilization
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                              {formatCurrency(service.cost)}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {service.percentage.toFixed(1)}% of total
                            </div>
                          </div>
                          
                          <div className={`flex items-center gap-1 text-sm ${
                            service.trend === 'up' ? 'text-red-600' :
                            service.trend === 'down' ? 'text-green-600' :
                            'text-gray-600'
                          }`}>
                            {service.trend === 'up' ? (
                              <ArrowTrendingUpIcon className="h-4 w-4" />
                            ) : service.trend === 'down' ? (
                              <ArrowTrendingDownIcon className="h-4 w-4" />
                            ) : null}
                            {service.trendPercentage !== 0 && formatPercentage(service.trendPercentage)}
                          </div>
                          
                          <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost optimization recommendations overview */}
              {recommendations.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <LightBulbIcon className="h-6 w-6 text-yellow-500" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      Cost Optimization Recommendations
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recommendations.slice(0, 6).map((recommendation) => (
                      <div
                        key={recommendation.id}
                        className={`p-4 rounded-lg border ${
                          recommendation.severity === 'high' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' :
                          recommendation.severity === 'medium' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20' :
                          'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                            {recommendation.title}
                          </h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            recommendation.severity === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            recommendation.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {recommendation.severity}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {recommendation.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <span className="font-medium text-green-600 dark:text-green-400">
                              {formatCurrency(recommendation.potentialSavings)}
                            </span>
                            <span className="text-gray-600 dark:text-gray-400 ml-1">
                              ({recommendation.potentialSavingsPercentage.toFixed(1)}%)
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <ClockIcon className="h-3 w-3" />
                            {recommendation.estimatedTimeToImplement}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {recommendations.length > 6 && (
                    <div className="mt-4 text-center">
                      <button className="text-blue-600 dark:text-blue-400 text-sm hover:underline">
                        View all {recommendations.length} recommendations
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Detailed service view */
            <div className="space-y-6">
              {/* Service header with back button */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={() => setSelectedService(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    aria-label="Back to service list"
                  >
                    <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 rotate-180" />
                  </button>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {selectedService} Cost Analysis
                  </h3>
                </div>
                
                {(() => {
                  const service = filteredServiceBreakdown.find(s => s.serviceName === selectedService);
                  if (!service) return null;
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cost</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(service.cost)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {service.percentage.toFixed(1)}% of total spend
                        </p>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Resources</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {service.resourceCount || 0}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {service.averageCostPerResource ? formatCurrency(service.averageCostPerResource) : '$0'} avg/resource
                        </p>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Utilization</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {service.utilizationPercentage || 0}%
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Average utilization
                        </p>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Trend</p>
                        <div className={`flex items-center gap-2 ${
                          service.trend === 'up' ? 'text-red-600' :
                          service.trend === 'down' ? 'text-green-600' :
                          'text-gray-600'
                        }`}>
                          {service.trend === 'up' ? (
                            <ArrowTrendingUpIcon className="h-6 w-6" />
                          ) : service.trend === 'down' ? (
                            <ArrowTrendingDownIcon className="h-6 w-6" />
                          ) : null}
                          <span className="text-2xl font-bold">
                            {service.trendPercentage !== 0 ? formatPercentage(service.trendPercentage) : 'Stable'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Service-specific recommendations */}
              {(() => {
                const serviceRecommendations = recommendations.filter(r => r.serviceName === selectedService);
                if (serviceRecommendations.length === 0) return null;
                
                return (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <LightBulbIcon className="h-6 w-6 text-yellow-500" />
                      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Optimization Recommendations for {selectedService}
                      </h4>
                    </div>
                    
                    <div className="space-y-4">
                      {serviceRecommendations.map((recommendation) => (
                        <div
                          key={recommendation.id}
                          className={`p-6 rounded-lg border ${
                            recommendation.severity === 'high' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' :
                            recommendation.severity === 'medium' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20' :
                            'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                {recommendation.title}
                              </h5>
                              <p className="text-gray-600 dark:text-gray-400 mb-4">
                                {recommendation.description}
                              </p>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              <span className={`text-xs px-3 py-1 rounded-full ${
                                recommendation.severity === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                recommendation.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              }`}>
                                {recommendation.severity} priority
                              </span>
                              
                              <span className={`text-xs px-3 py-1 rounded-full ${
                                recommendation.implementationComplexity === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                recommendation.implementationComplexity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {recommendation.implementationComplexity} to implement
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Potential Savings</p>
                              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                {formatCurrency(recommendation.potentialSavings)}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {recommendation.potentialSavingsPercentage.toFixed(1)}% reduction
                              </p>
                            </div>
                            
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Resources Affected</p>
                              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {recommendation.resourcesAffected}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                resources to optimize
                              </p>
                            </div>
                            
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Time to Implement</p>
                              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {recommendation.estimatedTimeToImplement}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                estimated duration
                              </p>
                            </div>
                          </div>
                          
                          <div>
                            <h6 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Action Items:</h6>
                            <ul className="space-y-1">
                              {recommendation.actionItems.map((item, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {selectedView === 'anomalies' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Cost Anomalies
          </h3>
          {anomalies.length > 0 ? (
            <div className="space-y-3">
              {anomalies.map((anomaly, index) => (
                <div key={index} className={`p-4 rounded-lg border ${
                  anomaly.severity === 'critical' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' :
                  anomaly.severity === 'high' ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20' :
                  'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <ExclamationTriangleIcon className={`h-5 w-5 ${
                          anomaly.severity === 'critical' ? 'text-red-500' :
                          anomaly.severity === 'high' ? 'text-orange-500' :
                          'text-yellow-500'
                        }`} />
                        <span className="font-medium capitalize">{anomaly.severity} Anomaly</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {anomaly.date}: Expected {formatCurrency(anomaly.expectedCost)}, 
                        actual {formatCurrency(anomaly.actualCost)} 
                        ({formatPercentage(anomaly.deviationPercentage)} deviation)
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Contributing services: {anomaly.contributingServices.join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              No cost anomalies detected in the current time period.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
