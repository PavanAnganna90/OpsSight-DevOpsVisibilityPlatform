/**
 * Deployment Frequency Chart Component
 * 
 * Displays deployment frequency by environment using a bar chart.
 * Features:
 * - Environment-based grouping (dev, staging, production)
 * - Daily/weekly toggle for different time granularities
 * - Responsive design with mobile optimization
 * - Interactive tooltips and filtering
 * - Accessibility compliance
 */

import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format, subDays, startOfDay, startOfWeek, parseISO, isValid } from 'date-fns';
import { useResponsive } from '../../hooks/useResponsive';

// Types
interface PipelineRun {
  id: number;
  pipeline_id: number;
  run_number: number;
  status: 'pending' | 'running' | 'success' | 'failure' | 'cancelled';
  commit_sha: string;
  commit_message?: string;
  triggered_by: string;
  trigger_event: string;
  started_at?: string;
  finished_at?: string;
  duration_seconds?: number;
  branch: string;
  logs_url?: string;
  artifacts_url?: string;
  error_message?: string;
}

interface Pipeline {
  id: number;
  name: string;
  description?: string;
  repository_url: string;
  branch: string;
  pipeline_type: 'ci' | 'cd' | 'ci_cd';
  last_run_status?: 'pending' | 'running' | 'success' | 'failure' | 'cancelled';
  last_run_at?: string;
  total_runs: number;
  success_rate: number;
  average_duration?: number;
  is_active: boolean;
  project_id: number;
  runs?: PipelineRun[];
}

interface DeploymentFrequencyChartProps {
  pipelines: Pipeline[];
  timeRange?: number; // Days to look back
  className?: string;
}

interface ChartDataPoint {
  period: string;
  periodLabel: string;
  dev: number;
  staging: number;
  production: number;
  total: number;
}

type GroupingPeriod = 'daily' | 'weekly';

// Environment detection logic
const detectEnvironment = (pipelineRun: PipelineRun, pipelineName: string): string => {
  const branch = pipelineRun.branch?.toLowerCase() || '';
  const name = pipelineName.toLowerCase();
  
  // Check branch patterns
  if (branch.includes('main') || branch.includes('master') || branch.includes('prod')) {
    return 'production';
  }
  if (branch.includes('staging') || branch.includes('stage') || branch.includes('uat')) {
    return 'staging';
  }
  if (branch.includes('dev') || branch.includes('develop') || branch.includes('feature')) {
    return 'dev';
  }
  
  // Check pipeline name patterns
  if (name.includes('prod') || name.includes('deploy') || name.includes('release')) {
    return 'production';
  }
  if (name.includes('staging') || name.includes('stage') || name.includes('uat')) {
    return 'staging';
  }
  
  // Default to dev for other branches/patterns
  return 'dev';
};

// Environment colors
const ENVIRONMENT_COLORS = {
  dev: '#3B82F6',      // Blue
  staging: '#F59E0B',   // Amber
  production: '#10B981' // Emerald
};

const DeploymentFrequencyChart: React.FC<DeploymentFrequencyChartProps> = ({
  pipelines,
  timeRange = 30,
  className = ''
}) => {
  const { isMobile } = useResponsive();
  const [groupingPeriod, setGroupingPeriod] = useState<GroupingPeriod>('daily');
  const [selectedEnvironments, setSelectedEnvironments] = useState<Set<string>>(
    new Set(['dev', 'staging', 'production'])
  );

  // Process deployment data
  const chartData = useMemo(() => {
    const now = new Date();
    const startDate = subDays(now, timeRange);
    
    // Collect all deployments with environment detection
    const deployments: Array<{
      date: Date;
      environment: string;
    }> = [];

    pipelines.forEach(pipeline => {
      if (!pipeline.runs) return;

      pipeline.runs.forEach(run => {
        // Only count successful deployments
        if (run.status !== 'success') return;

        if (!run.started_at) return;
        const runDate = parseISO(run.started_at);
        if (!isValid(runDate) || runDate < startDate) return;

        const environment = detectEnvironment(run, pipeline.name);
        deployments.push({
          date: runDate,
          environment
        });
      });
    });

    // Group by time period
    const groupedData = new Map<string, Record<string, number>>();

    deployments.forEach(deployment => {
      const periodStart = groupingPeriod === 'weekly' 
        ? startOfWeek(deployment.date)
        : startOfDay(deployment.date);
      
      const periodKey = format(periodStart, 'yyyy-MM-dd');
      
      if (!groupedData.has(periodKey)) {
        groupedData.set(periodKey, {
          dev: 0,
          staging: 0,
          production: 0
        });
      }

      const periodData = groupedData.get(periodKey)!;
      periodData[deployment.environment] = (periodData[deployment.environment] || 0) + 1;
    });

    // Generate complete time series
    const result: ChartDataPoint[] = [];
    const periods = Math.ceil(timeRange / (groupingPeriod === 'weekly' ? 7 : 1));

    for (let i = periods - 1; i >= 0; i--) {
      const periodStart = groupingPeriod === 'weekly'
        ? startOfWeek(subDays(now, i * 7))
        : startOfDay(subDays(now, i));
      
      const periodKey = format(periodStart, 'yyyy-MM-dd');
      const data = groupedData.get(periodKey) || { dev: 0, staging: 0, production: 0 };
      
      result.push({
        period: periodKey,
        periodLabel: groupingPeriod === 'weekly'
          ? format(periodStart, 'MMM dd')
          : format(periodStart, isMobile ? 'M/d' : 'MMM dd'),
        dev: data.dev,
        staging: data.staging,
        production: data.production,
        total: data.dev + data.staging + data.production
      });
    }

    return result;
  }, [pipelines, timeRange, groupingPeriod, isMobile]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalDeployments = chartData.reduce((sum, point) => sum + point.total, 0);
    const averagePerPeriod = totalDeployments / chartData.length;
    
    const environmentTotals = {
      dev: chartData.reduce((sum, point) => sum + point.dev, 0),
      staging: chartData.reduce((sum, point) => sum + point.staging, 0),
      production: chartData.reduce((sum, point) => sum + point.production, 0)
    };

    return {
      total: totalDeployments,
      average: averagePerPeriod,
      byEnvironment: environmentTotals
    };
  }, [chartData]);

  // Toggle environment visibility
  const toggleEnvironment = (env: string) => {
    const newSelected = new Set(selectedEnvironments);
    if (newSelected.has(env)) {
      newSelected.delete(env);
    } else {
      newSelected.add(env);
    }
    setSelectedEnvironments(newSelected);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="font-medium text-gray-900 dark:text-white">
          {groupingPeriod === 'weekly' ? 'Week of ' : ''}{label}
        </p>
        <div className="mt-2 space-y-1">
          {Object.entries(ENVIRONMENT_COLORS).map(([env, color]) => (
            <div key={env} className="flex items-center justify-between space-x-3">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {env}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {data[env]} deployments
              </span>
            </div>
          ))}
          <hr className="border-gray-200 dark:border-gray-700" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {data.total} deployments
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Deployment Frequency
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last {timeRange} days • {stats.total} total deployments • 
            Avg: {stats.average.toFixed(1)} per {groupingPeriod === 'weekly' ? 'week' : 'day'}
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          {/* Grouping toggle */}
          <div className="inline-flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(['daily', 'weekly'] as GroupingPeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setGroupingPeriod(period)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  groupingPeriod === period
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="periodLabel" 
              stroke="#6B7280"
              fontSize={isMobile ? 10 : 12}
            />
            <YAxis 
              stroke="#6B7280"
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {Object.entries(ENVIRONMENT_COLORS).map(([env, color]) => (
              selectedEnvironments.has(env) && (
                <Bar
                  key={env}
                  dataKey={env}
                  stackId="deployments"
                  fill={color}
                  name={env.charAt(0).toUpperCase() + env.slice(1)}
                />
              )
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Environment Legend and Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {Object.entries(ENVIRONMENT_COLORS).map(([env, color]) => (
            <button
              key={env}
              onClick={() => toggleEnvironment(env)}
              className={`flex items-center space-x-2 px-2 py-1 rounded transition-colors ${
                selectedEnvironments.has(env)
                  ? 'bg-gray-50 dark:bg-gray-700'
                  : 'opacity-50 hover:opacity-75'
              }`}
            >
              <div 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: color }}
              />
              <span className="text-gray-600 dark:text-gray-400 capitalize">
                {env}
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {stats.byEnvironment[env as keyof typeof stats.byEnvironment]}
              </span>
            </button>
          ))}
        </div>
        
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Click environments to toggle visibility
        </div>
      </div>
    </div>
  );
};

export default React.memo(DeploymentFrequencyChart); 