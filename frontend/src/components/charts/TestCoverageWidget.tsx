/**
 * Test Coverage Widget Component
 * 
 * Displays test coverage metrics with historical trends and visual indicators.
 * Features:
 * - Unit, integration, and end-to-end coverage percentages
 * - Circular progress indicators with color-coded thresholds
 * - Historical trend visualization using line charts
 * - Responsive design with mobile optimization
 * - Interactive tooltips and trend analysis
 * - Accessibility compliance
 */

import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { format, subDays } from 'date-fns';
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

interface TestCoverageWidgetProps {
  pipelines: Pipeline[];
  timeRange?: number; // Days to look back for trends
  className?: string;
}

interface CoverageData {
  unit: number;
  integration: number;
  e2e: number;
  overall: number;
}

interface TrendData {
  date: string;
  dateLabel: string;
  unit: number;
  integration: number;
  e2e: number;
  overall: number;
}

// Coverage thresholds for color coding
const COVERAGE_THRESHOLDS = {
  excellent: 90,
  good: 75,
  warning: 60,
  poor: 0
};

// Mock coverage data extraction (in real implementation, this would come from test reports)
const extractCoverageFromPipeline = (pipeline: Pipeline): CoverageData => {
  // Simulate coverage extraction based on pipeline characteristics
  const baseUnit = Math.min(95, 70 + (pipeline.success_rate * 25));
  const baseIntegration = Math.min(90, 50 + (pipeline.success_rate * 35));
  const baseE2e = Math.min(85, 40 + (pipeline.success_rate * 40));
  
  // Add some variance based on pipeline type
  const unitCoverage = pipeline.pipeline_type === 'ci' || pipeline.pipeline_type === 'ci_cd' 
    ? baseUnit + Math.random() * 5 - 2.5 
    : baseUnit * 0.8;
  
  const integrationCoverage = pipeline.pipeline_type === 'ci_cd' 
    ? baseIntegration + Math.random() * 5 - 2.5
    : baseIntegration * 0.9;
    
  const e2eCoverage = pipeline.pipeline_type === 'cd' || pipeline.pipeline_type === 'ci_cd'
    ? baseE2e + Math.random() * 5 - 2.5
    : baseE2e * 0.7;

  const unit = Math.max(0, Math.min(100, unitCoverage));
  const integration = Math.max(0, Math.min(100, integrationCoverage));
  const e2e = Math.max(0, Math.min(100, e2eCoverage));
  const overall = (unit * 0.5 + integration * 0.3 + e2e * 0.2);

  return {
    unit: Math.round(unit * 10) / 10,
    integration: Math.round(integration * 10) / 10,
    e2e: Math.round(e2e * 10) / 10,
    overall: Math.round(overall * 10) / 10
  };
};

// Get coverage level and color
const getCoverageLevel = (percentage: number): { level: string; color: string; bgColor: string } => {
  if (percentage >= COVERAGE_THRESHOLDS.excellent) {
    return { level: 'Excellent', color: '#10B981', bgColor: '#D1FAE5' };
  } else if (percentage >= COVERAGE_THRESHOLDS.good) {
    return { level: 'Good', color: '#059669', bgColor: '#A7F3D0' };
  } else if (percentage >= COVERAGE_THRESHOLDS.warning) {
    return { level: 'Warning', color: '#F59E0B', bgColor: '#FEF3C7' };
  } else {
    return { level: 'Poor', color: '#EF4444', bgColor: '#FEE2E2' };
  }
};

// Circular progress component
interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  title: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 120,
  strokeWidth = 8,
  title
}) => {
  const { color, level } = getCoverageLevel(percentage);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-300 ease-in-out"
          />
        </svg>
        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {percentage.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {level}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 text-center">
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          {title}
        </div>
      </div>
    </div>
  );
};

const TestCoverageWidget: React.FC<TestCoverageWidgetProps> = ({
  pipelines,
  timeRange = 30,
  className = ''
}) => {
  const { isMobile } = useResponsive();
  const [showTrends, setShowTrends] = useState(false);

  // Calculate current coverage from all active pipelines
  const currentCoverage = useMemo(() => {
    if (pipelines.length === 0) {
      return { unit: 0, integration: 0, e2e: 0, overall: 0 };
    }

    const activePipelines = pipelines.filter(p => p.is_active);
    if (activePipelines.length === 0) {
      return { unit: 0, integration: 0, e2e: 0, overall: 0 };
    }

    const coverageData = activePipelines.map(extractCoverageFromPipeline);
    
    const avgUnit = coverageData.reduce((sum, data) => sum + data.unit, 0) / coverageData.length;
    const avgIntegration = coverageData.reduce((sum, data) => sum + data.integration, 0) / coverageData.length;
    const avgE2e = coverageData.reduce((sum, data) => sum + data.e2e, 0) / coverageData.length;
    const avgOverall = coverageData.reduce((sum, data) => sum + data.overall, 0) / coverageData.length;

    return {
      unit: Math.round(avgUnit * 10) / 10,
      integration: Math.round(avgIntegration * 10) / 10,
      e2e: Math.round(avgE2e * 10) / 10,
      overall: Math.round(avgOverall * 10) / 10
    };
  }, [pipelines]);

  // Generate historical trend data
  const trendData = useMemo(() => {
    const now = new Date();
    const data: TrendData[] = [];

    for (let i = timeRange - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const dateKey = format(date, 'yyyy-MM-dd');
      
      // Simulate historical coverage data with some variance
      const baseUnit = currentCoverage.unit + (Math.random() - 0.5) * 10;
      const baseIntegration = currentCoverage.integration + (Math.random() - 0.5) * 8;
      const baseE2e = currentCoverage.e2e + (Math.random() - 0.5) * 12;
      
      const unit = Math.max(0, Math.min(100, baseUnit));
      const integration = Math.max(0, Math.min(100, baseIntegration));
      const e2e = Math.max(0, Math.min(100, baseE2e));
      const overall = (unit * 0.5 + integration * 0.3 + e2e * 0.2);

      data.push({
        date: dateKey,
        dateLabel: format(date, isMobile ? 'M/d' : 'MMM dd'),
        unit: Math.round(unit * 10) / 10,
        integration: Math.round(integration * 10) / 10,
        e2e: Math.round(e2e * 10) / 10,
        overall: Math.round(overall * 10) / 10
      });
    }

    return data;
  }, [currentCoverage, timeRange, isMobile]);

  // Calculate trend direction
  const calculateTrend = (current: number, historical: number[]): { direction: string; percentage: number } => {
    if (historical.length === 0) return { direction: 'stable', percentage: 0 };
    
    const recent = historical.slice(-7); // Last 7 days
    const older = historical.slice(0, Math.min(7, historical.length - 7));
    
    if (older.length === 0) return { direction: 'stable', percentage: 0 };
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (Math.abs(change) < 1) return { direction: 'stable', percentage: 0 };
    return {
      direction: change > 0 ? 'improving' : 'declining',
      percentage: Math.abs(change)
    };
  };

  const trends = {
    unit: calculateTrend(currentCoverage.unit, trendData.map(d => d.unit)),
    integration: calculateTrend(currentCoverage.integration, trendData.map(d => d.integration)),
    e2e: calculateTrend(currentCoverage.e2e, trendData.map(d => d.e2e)),
    overall: calculateTrend(currentCoverage.overall, trendData.map(d => d.overall))
  };

  // Custom tooltip for trend chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        <div className="mt-2 space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between space-x-3">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {entry.dataKey === 'e2e' ? 'E2E' : entry.dataKey}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {entry.value.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Trend indicator component
  const TrendIndicator: React.FC<{ trend: { direction: string; percentage: number } }> = ({ trend }) => {
    const getIcon = () => {
      switch (trend.direction) {
        case 'improving':
          return '↗';
        case 'declining':
          return '↘';
        default:
          return '→';
      }
    };

    const getColor = () => {
      switch (trend.direction) {
        case 'improving':
          return 'text-green-600';
        case 'declining':
          return 'text-red-600';
        default:
          return 'text-gray-500';
      }
    };

    return (
      <div className={`flex items-center space-x-1 text-xs ${getColor()}`}>
        <span>{getIcon()}</span>
        <span>
          {trend.direction === 'stable' 
            ? 'Stable' 
            : `${trend.percentage.toFixed(1)}%`
          }
        </span>
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Test Coverage
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Overall: {currentCoverage.overall.toFixed(1)}% • Last {timeRange} days
          </p>
        </div>
        
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <button
            onClick={() => setShowTrends(!showTrends)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              showTrends
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {showTrends ? 'Hide Trends' : 'Show Trends'}
          </button>
        </div>
      </div>

      {/* Coverage circles */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
        <div className="flex flex-col items-center">
          <CircularProgress 
            percentage={currentCoverage.overall} 
            title="Overall" 
          />
          <TrendIndicator trend={trends.overall} />
        </div>
        
        <div className="flex flex-col items-center">
          <CircularProgress 
            percentage={currentCoverage.unit} 
            title="Unit Tests" 
          />
          <TrendIndicator trend={trends.unit} />
        </div>
        
        <div className="flex flex-col items-center">
          <CircularProgress 
            percentage={currentCoverage.integration} 
            title="Integration" 
          />
          <TrendIndicator trend={trends.integration} />
        </div>
        
        <div className="flex flex-col items-center">
          <CircularProgress 
            percentage={currentCoverage.e2e} 
            title="E2E Tests" 
          />
          <TrendIndicator trend={trends.e2e} />
        </div>
      </div>

      {/* Historical trends chart */}
      {showTrends && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Coverage Trends
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="dateLabel" 
                  stroke="#6B7280"
                  fontSize={isMobile ? 10 : 12}
                />
                <YAxis 
                  domain={[0, 100]}
                  stroke="#6B7280"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="overall"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Overall"
                />
                <Line
                  type="monotone"
                  dataKey="unit"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Unit"
                />
                <Line
                  type="monotone"
                  dataKey="integration"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Integration"
                />
                <Line
                  type="monotone"
                  dataKey="e2e"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="E2E"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Coverage thresholds legend */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Excellent (≥90%)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-green-600" />
              <span className="text-gray-600 dark:text-gray-400">
                Good (75-89%)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-yellow-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Warning (60-74%)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Poor (&lt;60%)
              </span>
            </div>
          </div>
          
          <div className="text-gray-500 dark:text-gray-400">
            {pipelines.filter(p => p.is_active).length} active pipelines
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TestCoverageWidget); 