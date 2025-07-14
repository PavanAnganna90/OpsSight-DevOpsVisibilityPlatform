/**
 * Enhanced Kubernetes Metrics Chart Component
 * 
 * Specialized chart components for visualizing Kubernetes cluster metrics
 * with real-time updates and interactive features.
 */

import React, { useMemo } from 'react';
import { KubernetesMetrics, CapacityInfo, UtilizationInfo } from '../../types/cluster';

// Temporary simple chart components until we have proper chart library integration
const DonutChart: React.FC<{
  data: Array<{ name: string; value: number; color: string }>;
  height: number;
  showLegend: boolean;
  centerText: string;
}> = ({ data, height, showLegend, centerText }) => (
  <div style={{ height }} className="flex items-center justify-center border-2 border-gray-200 rounded">
    <div className="text-center">
      <div className="text-lg font-bold">{centerText}</div>
      {showLegend && (
        <div className="mt-2 text-sm">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <span style={{ color: item.color }}>●</span>
              <span className="ml-2">{item.name}: {item.value}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const AreaChart: React.FC<{
  data: any[];
  height: number;
  xAxisKey: string;
  yAxisLines: any[];
  showGrid: boolean;
  showTooltip: boolean;
  showLegend: boolean;
}> = ({ data, height }) => (
  <div style={{ height }} className="flex items-center justify-center border-2 border-gray-200 rounded">
    <div className="text-center text-gray-500">
      <div>Timeline Chart</div>
      <div className="text-sm">{data.length} data points</div>
    </div>
  </div>
);

const BarChart: React.FC<{
  data: any[];
  height: number;
  xAxisKey: string;
  yAxisLines: any[];
  showGrid: boolean;
  showTooltip: boolean;
}> = ({ data, height }) => (
  <div style={{ height }} className="flex items-center justify-center border-2 border-gray-200 rounded">
    <div className="text-center text-gray-500">
      <div>Bar Chart</div>
      <div className="text-sm">{data.length} items</div>
    </div>
  </div>
);

interface ResourceUtilizationChartProps {
  /** Utilization data */
  utilization: UtilizationInfo;
  /** Chart title */
  title?: string;
  /** Chart height */
  height?: number;
  /** Show legend */
  showLegend?: boolean;
}

/**
 * Resource Utilization Donut Chart
 * 
 * Displays CPU, memory, and storage utilization as donut charts
 */
export const ResourceUtilizationChart: React.FC<ResourceUtilizationChartProps> = ({
  utilization,
  title = "Resource Utilization",
  height = 300,
  showLegend = true
}) => {
  const chartData = useMemo(() => [
    {
      name: 'CPU',
      value: utilization.cpu_percent,
      color: utilization.cpu_percent > 80 ? '#EF4444' : 
             utilization.cpu_percent > 60 ? '#F59E0B' : '#10B981'
    },
    {
      name: 'Memory',
      value: utilization.memory_percent,
      color: utilization.memory_percent > 80 ? '#EF4444' : 
             utilization.memory_percent > 60 ? '#F59E0B' : '#10B981'
    },
    ...(utilization.storage_percent ? [{
      name: 'Storage',
      value: utilization.storage_percent,
      color: utilization.storage_percent > 80 ? '#EF4444' : 
             utilization.storage_percent > 60 ? '#F59E0B' : '#10B981'
    }] : [])
  ], [utilization]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        {title}
      </h3>
      <DonutChart
        data={chartData}
        height={height}
        showLegend={showLegend}
        centerText="Cluster Resources"
      />
    </div>
  );
};

interface NodeMetricsTimelineProps {
  /** Metrics data over time */
  metricsHistory: Array<{
    timestamp: string;
    cpu_percent: number;
    memory_percent: number;
    disk_percent?: number;
  }>;
  /** Chart title */
  title?: string;
  /** Chart height */
  height?: number;
}

/**
 * Node Metrics Timeline Chart
 * 
 * Shows historical trends of node metrics over time
 */
export const NodeMetricsTimelineChart: React.FC<NodeMetricsTimelineProps> = ({
  metricsHistory,
  title = "Node Metrics Over Time",
  height = 350
}) => {
  const chartData = useMemo(() => {
    return metricsHistory.map(metric => ({
      timestamp: new Date(metric.timestamp).toLocaleTimeString(),
      CPU: metric.cpu_percent,
      Memory: metric.memory_percent,
      ...(metric.disk_percent && { Disk: metric.disk_percent })
    }));
  }, [metricsHistory]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        {title}
      </h3>
      <AreaChart
        data={chartData}
        height={height}
        xAxisKey="timestamp"
        yAxisLines={[
          { dataKey: 'CPU', stroke: '#3B82F6', fill: '#3B82F6', fillOpacity: 0.3 },
          { dataKey: 'Memory', stroke: '#10B981', fill: '#10B981', fillOpacity: 0.3 },
          ...(chartData.some(d => d.Disk !== undefined) ? [{
            dataKey: 'Disk',
            stroke: '#F59E0B',
            fill: '#F59E0B',
            fillOpacity: 0.3
          }] : [])
        ]}
        showGrid={true}
        showTooltip={true}
        showLegend={true}
      />
    </div>
  );
};

interface PodStatusChartProps {
  /** Pod metrics */
  podMetrics: {
    running_pods: number;
    pending_pods: number;
    failed_pods: number;
    succeeded_pods: number;
    total_pods: number;
  };
  /** Chart title */
  title?: string;
  /** Chart height */
  height?: number;
}

/**
 * Pod Status Distribution Chart
 * 
 * Shows the distribution of pod statuses in the cluster
 */
export const PodStatusChart: React.FC<PodStatusChartProps> = ({
  podMetrics,
  title = "Pod Status Distribution",
  height = 250
}) => {
  const chartData = useMemo(() => [
    {
      name: 'Running',
      value: podMetrics.running_pods,
      color: '#10B981'
    },
    {
      name: 'Pending',
      value: podMetrics.pending_pods,
      color: '#F59E0B'
    },
    {
      name: 'Failed',
      value: podMetrics.failed_pods,
      color: '#EF4444'
    },
    {
      name: 'Succeeded',
      value: podMetrics.succeeded_pods,
      color: '#6366F1'
    }
  ].filter(item => item.value > 0), [podMetrics]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        {title}
      </h3>
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Total Pods: {podMetrics.total_pods}
      </div>
      <DonutChart
        data={chartData}
        height={height}
        showLegend={true}
        centerText={`${podMetrics.total_pods} Total`}
      />
    </div>
  );
};

interface WorkloadDistributionChartProps {
  /** Workload metrics */
  workloadMetrics: {
    deployments: number;
    statefulsets: number;
    daemonsets: number;
    services: number;
    ingresses: number;
  };
  /** Chart title */
  title?: string;
  /** Chart height */
  height?: number;
}

/**
 * Workload Distribution Chart
 * 
 * Shows the distribution of different workload types
 */
export const WorkloadDistributionChart: React.FC<WorkloadDistributionChartProps> = ({
  workloadMetrics,
  title = "Workload Distribution",
  height = 300
}) => {
  const chartData = useMemo(() => [
    { name: 'Deployments', value: workloadMetrics.deployments, color: '#3B82F6' },
    { name: 'StatefulSets', value: workloadMetrics.statefulsets, color: '#10B981' },
    { name: 'DaemonSets', value: workloadMetrics.daemonsets, color: '#F59E0B' },
    { name: 'Services', value: workloadMetrics.services, color: '#8B5CF6' },
    { name: 'Ingresses', value: workloadMetrics.ingresses, color: '#EF4444' }
  ].filter(item => item.value > 0), [workloadMetrics]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        {title}
      </h3>
      <BarChart
        data={chartData}
        height={height}
        xAxisKey="name"
        yAxisLines={[{ dataKey: 'value', fill: '#3B82F6' }]}
        showGrid={true}
        showTooltip={true}
      />
    </div>
  );
};

interface CachePerformanceChartProps {
  /** Cache statistics */
  cacheStats: {
    hit_rate_percent: number;
    miss_rate_percent: number;
    total_requests: number;
  };
  /** Chart title */
  title?: string;
  /** Chart height */
  height?: number;
}

/**
 * Cache Performance Chart
 * 
 * Visualizes cache hit/miss rates and performance metrics
 */
export const CachePerformanceChart: React.FC<CachePerformanceChartProps> = ({
  cacheStats,
  title = "Cache Performance",
  height = 250
}) => {
  const chartData = useMemo(() => [
    {
      name: 'Hit Rate',
      value: cacheStats.hit_rate_percent,
      color: '#10B981'
    },
    {
      name: 'Miss Rate',
      value: cacheStats.miss_rate_percent,
      color: '#EF4444'
    }
  ], [cacheStats]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        {title}
      </h3>
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Total Requests: {cacheStats.total_requests.toLocaleString()}
      </div>
      <DonutChart
        data={chartData}
        height={height}
        showLegend={true}
        centerText={`${cacheStats.hit_rate_percent.toFixed(1)}% Hit Rate`}
      />
    </div>
  );
};

// Combined dashboard component
interface KubernetesMetricsDashboardProps {
  /** Complete metrics data */
  metrics: KubernetesMetrics;
  /** Cache statistics */
  cacheStats?: {
    hit_rate_percent: number;
    miss_rate_percent: number;
    total_requests: number;
  };
  /** Historical metrics for timeline */
  metricsHistory?: Array<{
    timestamp: string;
    cpu_percent: number;
    memory_percent: number;
    disk_percent?: number;
  }>;
  /** Grid layout configuration */
  layout?: 'compact' | 'detailed';
}

/**
 * Complete Kubernetes Metrics Dashboard
 * 
 * Combines all metric charts into a comprehensive dashboard
 */
export const KubernetesMetricsDashboard: React.FC<KubernetesMetricsDashboardProps> = ({
  metrics,
  cacheStats,
  metricsHistory,
  layout = 'detailed'
}) => {
  if (layout === 'compact') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ResourceUtilizationChart
          utilization={{
            cpu_percent: metrics.resource_metrics.cpu.utilization_percent,
            memory_percent: metrics.resource_metrics.memory.utilization_percent,
            storage_percent: metrics.resource_metrics.storage.utilization_percent
          }}
          height={200}
        />
        <PodStatusChart
          podMetrics={metrics.pod_metrics}
          height={200}
        />
        {cacheStats && (
          <CachePerformanceChart
            cacheStats={cacheStats}
            height={200}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top row - Resource utilization and timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResourceUtilizationChart
          utilization={{
            cpu_percent: metrics.resource_metrics.cpu.utilization_percent,
            memory_percent: metrics.resource_metrics.memory.utilization_percent,
            storage_percent: metrics.resource_metrics.storage.utilization_percent
          }}
        />
        {metricsHistory && (
          <NodeMetricsTimelineChart
            metricsHistory={metricsHistory}
          />
        )}
      </div>

      {/* Middle row - Pod status and workload distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PodStatusChart
          podMetrics={metrics.pod_metrics}
        />
        <WorkloadDistributionChart
          workloadMetrics={metrics.workload_metrics}
        />
      </div>

      {/* Bottom row - Cache performance if available */}
      {cacheStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CachePerformanceChart
            cacheStats={cacheStats}
          />
        </div>
      )}
    </div>
  );
};

export default KubernetesMetricsDashboard;
