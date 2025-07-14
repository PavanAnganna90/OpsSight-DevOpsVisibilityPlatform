/**
 * Resource Usage Panel Component
 * 
 * Comprehensive resource visualization panel that combines gauges for current usage
 * and trend charts for historical data with time range selection and real-time updates.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui';
import { ResourceGauge, ResourceGaugeGrid } from '../charts/ResourceGauge';
import ResourceTrendChart, { TrendSeries } from '../charts/ResourceTrendChart';
import { useKubernetesEvents } from '../../hooks/useKubernetesEvents';

export interface ResourceMetrics {
  cpu: {
    usage: number;
    limit: number;
    requests: number;
  };
  memory: {
    usage: number;
    limit: number;
    requests: number;
  };
  storage: {
    usage: number;
    limit: number;
  };
  network: {
    inbound: number;
    outbound: number;
  };
}

export interface HistoricalMetrics {
  timestamp: string;
  cpu: number;
  memory: number;
  network: number;
  storage: number;
}

export interface ResourceUsagePanelProps {
  /** Current resource metrics */
  currentMetrics?: ResourceMetrics;
  /** Historical metrics data */
  historicalData?: HistoricalMetrics[];
  /** Cluster ID for real-time updates */
  clusterId?: string;
  /** Enable real-time updates */
  realTimeEnabled?: boolean;
  /** Panel title */
  title?: string;
  /** Show trend charts */
  showTrends?: boolean;
  /** Default time range */
  defaultTimeRange?: '1h' | '6h' | '24h' | '7d' | '30d';
  /** Custom className */
  className?: string;
  /** Callback for metrics update */
  onMetricsUpdate?: (metrics: ResourceMetrics) => void;
}

type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';
type ViewMode = 'overview' | 'detailed' | 'trends';

/**
 * ResourceUsagePanel Component
 * 
 * Complete resource monitoring solution with gauges, trends, and real-time updates.
 */
export const ResourceUsagePanel: React.FC<ResourceUsagePanelProps> = ({
  currentMetrics,
  historicalData = [],
  clusterId,
  realTimeEnabled = false,
  title = 'Resource Usage',
  showTrends = true,
  defaultTimeRange = '24h',
  className = '',
  onMetricsUpdate
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(defaultTimeRange);
  const [metrics, setMetrics] = useState<ResourceMetrics | undefined>(currentMetrics);
  const [loading, setLoading] = useState(false);

  // Real-time events integration
  const [eventsState] = useKubernetesEvents({
    clusterId,
    enabled: realTimeEnabled,
    eventTypes: ['resource', 'pod'],
    maxEvents: 50
  });

  // Update metrics when real-time events arrive
  useEffect(() => {
    if (realTimeEnabled && eventsState.events.length > 0) {
      const latestResourceEvent = eventsState.events
        .filter(event => event.type === 'resource')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      if (latestResourceEvent?.data) {
        const updatedMetrics = {
          ...metrics,
          ...latestResourceEvent.data
        } as ResourceMetrics;
        setMetrics(updatedMetrics);
        onMetricsUpdate?.(updatedMetrics);
      }
    }
  }, [eventsState.events, realTimeEnabled, metrics, onMetricsUpdate]);

  // Update metrics when prop changes
  useEffect(() => {
    if (currentMetrics) {
      setMetrics(currentMetrics);
    }
  }, [currentMetrics]);

  // Generate gauge data from current metrics
  const gaugeData = useMemo(() => {
    if (!metrics) return [];

    return [
      {
        id: 'cpu',
        label: 'CPU Usage',
        value: (metrics.cpu.usage / metrics.cpu.limit) * 100,
        unit: '%',
        thresholds: { warning: 70, critical: 85 },
        onValueChange: (value: number) => console.log('CPU:', value)
      },
      {
        id: 'memory',
        label: 'Memory Usage', 
        value: (metrics.memory.usage / metrics.memory.limit) * 100,
        unit: '%',
        thresholds: { warning: 80, critical: 90 },
        onValueChange: (value: number) => console.log('Memory:', value)
      },
      {
        id: 'storage',
        label: 'Storage Usage',
        value: (metrics.storage.usage / metrics.storage.limit) * 100,
        unit: '%',
        thresholds: { warning: 75, critical: 85 },
        onValueChange: (value: number) => console.log('Storage:', value)
      },
      {
        id: 'network',
        label: 'Network I/O',
        value: Math.min(((metrics.network.inbound + metrics.network.outbound) / 1000), 100), // Convert to percentage
        unit: 'MB/s',
        thresholds: { warning: 70, critical: 85 },
        onValueChange: (value: number) => console.log('Network:', value)
      }
    ];
  }, [metrics]);

  // Filter historical data by time range
  const filterDataByTimeRange = (data: HistoricalMetrics[], range: TimeRange): HistoricalMetrics[] => {
    const now = new Date().getTime();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const cutoff = now - timeRanges[range];
    return data.filter(d => new Date(d.timestamp).getTime() >= cutoff);
  };

  // Generate trend chart series from historical data
  const trendSeries = useMemo((): TrendSeries[] => {
    if (!historicalData.length) return [];

    const filteredData = filterDataByTimeRange(historicalData, selectedTimeRange);

    return [
      {
        id: 'cpu',
        name: 'CPU Usage',
        data: filteredData.map(d => ({ timestamp: d.timestamp, value: d.cpu })),
        color: '#3B82F6', // blue-500
        unit: '%',
        strokeWidth: 2,
        showDots: false
      },
      {
        id: 'memory',
        name: 'Memory Usage',
        data: filteredData.map(d => ({ timestamp: d.timestamp, value: d.memory })),
        color: '#10B981', // green-500
        unit: '%',
        strokeWidth: 2,
        showDots: false
      },
      {
        id: 'network',
        name: 'Network I/O',
        data: filteredData.map(d => ({ timestamp: d.timestamp, value: d.network })),
        color: '#F59E0B', // yellow-500
        unit: 'MB/s',
        strokeWidth: 2,
        showDots: false
      }
    ];
  }, [historicalData, selectedTimeRange]);

  // Get average usage for summary
  const getAverageUsage = () => {
    if (!metrics) return null;

    const cpuPercent = (metrics.cpu.usage / metrics.cpu.limit) * 100;
    const memoryPercent = (metrics.memory.usage / metrics.memory.limit) * 100;
    const storagePercent = (metrics.storage.usage / metrics.storage.limit) * 100;

    return {
      cpu: Math.round(cpuPercent),
      memory: Math.round(memoryPercent),
      storage: Math.round(storagePercent),
      overall: Math.round((cpuPercent + memoryPercent + storagePercent) / 3)
    };
  };

  const averageUsage = getAverageUsage();

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            {averageUsage && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Overall utilization: {averageUsage.overall}% • 
                CPU: {averageUsage.cpu}% • 
                Memory: {averageUsage.memory}% • 
                Storage: {averageUsage.storage}%
              </p>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {(['overview', 'detailed', 'trends'] as ViewMode[]).map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={viewMode === mode ? 'primary' : 'ghost'}
                  onClick={() => setViewMode(mode)}
                  className="px-3 py-1 text-xs"
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Button>
              ))}
            </div>

            {/* Real-time Indicator */}
            {realTimeEnabled && (
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  eventsState.isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {eventsState.isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {viewMode === 'overview' && (
          <div className="space-y-6">
            {/* Current Usage Gauges */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Current Usage
              </h3>
              <ResourceGaugeGrid
                gauges={gaugeData}
                size="md"
                columns={{ sm: 2, md: 4, lg: 4 }}
                gap="md"
              />
            </div>

            {/* Quick Trends */}
            {showTrends && historicalData.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  24-Hour Trend
                </h3>
                <ResourceTrendChart
                  series={trendSeries.slice(0, 2)} // Show only CPU and Memory for overview
                  title=""
                  height={200}
                  timeRange="24h"
                  showLegend={true}
                  interactive={true}
                />
              </div>
            )}
          </div>
        )}

        {viewMode === 'detailed' && (
          <div className="space-y-6">
            {/* Large Gauges */}
            <ResourceGaugeGrid
              gauges={gaugeData}
              size="lg"
              columns={{ sm: 1, md: 2, lg: 2 }}
              gap="lg"
            />

            {/* Resource Details */}
            {metrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">CPU Details</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Usage:</span>
                      <span>{metrics.cpu.usage.toFixed(2)} cores</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Requests:</span>
                      <span>{metrics.cpu.requests.toFixed(2)} cores</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Limits:</span>
                      <span>{metrics.cpu.limit.toFixed(2)} cores</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Memory Details</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Usage:</span>
                      <span>{(metrics.memory.usage / 1024).toFixed(2)} GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Requests:</span>
                      <span>{(metrics.memory.requests / 1024).toFixed(2)} GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Limits:</span>
                      <span>{(metrics.memory.limit / 1024).toFixed(2)} GB</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === 'trends' && (
          <div className="space-y-6">
            {/* Time Range Selector */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Historical Trends
              </h3>
              <div className="flex space-x-2">
                {(['1h', '6h', '24h', '7d', '30d'] as TimeRange[]).map((range) => (
                  <Button
                    key={range}
                    size="sm"
                    variant={selectedTimeRange === range ? 'primary' : 'outline'}
                    onClick={() => setSelectedTimeRange(range)}
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </div>

            {/* Trend Charts */}
            {historicalData.length > 0 ? (
              <div className="space-y-6">
                <ResourceTrendChart
                  series={trendSeries}
                  title="Resource Usage Over Time"
                  height={350}
                  timeRange={selectedTimeRange}
                  showLegend={true}
                  interactive={true}
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 dark:text-gray-600">
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No Historical Data
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Historical metrics will appear here once data collection begins.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Loading resource data...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceUsagePanel; 