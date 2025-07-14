/**
 * Team Metrics Chart Component
 * 
 * Visualization component for team performance and activity metrics
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';

interface MetricDataPoint {
  date: string;
  value: number;
  label: string;
}

interface TeamMetricsChartProps {
  teamId: number;
  metricType: 'activity' | 'performance' | 'resources';
  period: '1d' | '7d' | '30d' | '90d';
  chartType?: 'line' | 'area' | 'bar';
  height?: number;
  showLegend?: boolean;
}

export function TeamMetricsChart({
  teamId,
  metricType,
  period,
  chartType = 'line',
  height = 300,
  showLegend = true
}: TeamMetricsChartProps) {
  const { data: trendsData, isLoading, error, refetch } = useQuery({
    queryKey: ['team-metrics-trends', teamId, metricType, period],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/teams/${teamId}/metrics/trends?metric_type=${metricType}&period=${period}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch metrics trends');
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error || !trendsData) {
    return (
      <div className="flex flex-col items-center justify-center text-center" style={{ height }}>
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-red-400 mb-4">Failed to load metrics</p>
        <Button onClick={() => refetch()} variant="secondary" size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  const trends = trendsData.trends || [];

  if (trends.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-400" style={{ height }}>
        <p>No data available for the selected period</p>
      </div>
    );
  }

  // Format data for charts
  const chartData = trends.map((trend: MetricDataPoint) => ({
    date: new Date(trend.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      ...(period === '90d' && { year: '2-digit' })
    }),
    value: trend.value,
    label: trend.label
  }));

  // Chart colors based on metric type
  const getChartColor = () => {
    switch (metricType) {
      case 'activity':
        return '#3B82F6'; // Blue
      case 'performance':
        return '#10B981'; // Green
      case 'resources':
        return '#8B5CF6'; // Purple
      default:
        return '#6B7280'; // Gray
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-gray-300 text-sm">{label}</p>
          <p className="text-white font-medium">
            {data.payload.label || `${data.value}${getValueSuffix()}`}
          </p>
        </div>
      );
    }
    return null;
  };

  // Get value suffix based on metric type
  const getValueSuffix = () => {
    switch (metricType) {
      case 'activity':
        return ' activities';
      case 'performance':
        return '%';
      case 'resources':
        return '%';
      default:
        return '';
    }
  };

  // Render chart based on type
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id={`gradient-${metricType}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={getChartColor()} stopOpacity={0.3} />
                <stop offset="95%" stopColor={getChartColor()} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              stroke="#9CA3AF" 
              fontSize={12}
              tick={{ fill: '#9CA3AF' }}
            />
            <YAxis 
              stroke="#9CA3AF" 
              fontSize={12}
              tick={{ fill: '#9CA3AF' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={getChartColor()}
              fillOpacity={1}
              fill={`url(#gradient-${metricType})`}
              strokeWidth={2}
            />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              stroke="#9CA3AF" 
              fontSize={12}
              tick={{ fill: '#9CA3AF' }}
            />
            <YAxis 
              stroke="#9CA3AF" 
              fontSize={12}
              tick={{ fill: '#9CA3AF' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="value"
              fill={getChartColor()}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        );

      default: // line
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              stroke="#9CA3AF" 
              fontSize={12}
              tick={{ fill: '#9CA3AF' }}
            />
            <YAxis 
              stroke="#9CA3AF" 
              fontSize={12}
              tick={{ fill: '#9CA3AF' }}
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && (
              <Legend 
                wrapperStyle={{ color: '#9CA3AF' }}
                iconType="line"
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={getChartColor()}
              strokeWidth={3}
              dot={{ fill: getChartColor(), strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: getChartColor(), strokeWidth: 2 }}
              name={`${metricType.charAt(0).toUpperCase() + metricType.slice(1)} Metrics`}
            />
          </LineChart>
        );
    }
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
      
      {/* Chart Summary */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
        <span>
          Period: {period === '1d' ? 'Last 24 hours' : 
                   period === '7d' ? 'Last 7 days' : 
                   period === '30d' ? 'Last 30 days' : 
                   'Last 90 days'}
        </span>
        <span>
          {trends.length} data points
        </span>
      </div>
    </div>
  );
}