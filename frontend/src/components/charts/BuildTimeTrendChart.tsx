/**
 * Build Time Trend Chart Component
 * 
 * Displays build time trends over the past 30 days using a line chart.
 * Features:
 * - Time series visualization of average build times
 * - Outlier detection and highlighting
 * - Responsive design with mobile optimization
 * - Filtering by pipeline and time range
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
  ResponsiveContainer,
  ReferenceLine,
  Dot
} from 'recharts';
import { format, subDays, startOfDay, parseISO } from 'date-fns';
import { useResponsive } from '../../hooks/useResponsive';

// Types
interface PipelineRun {
  id: number;
  pipeline_id: number;
  run_number: number;
  status: 'pending' | 'running' | 'success' | 'failure' | 'cancelled';
  started_at?: string;
  finished_at?: string;
  duration_seconds?: number;
  branch: string;
}

interface Pipeline {
  id: number;
  name: string;
  runs?: PipelineRun[];
}

interface TrendDataPoint {
  date: string;
  dateLabel: string;
  averageDuration: number;
  medianDuration: number;
  minDuration: number;
  maxDuration: number;
  runCount: number;
  outliers: Array<{
    duration: number;
    pipelineName: string;
    runId: number;
  }>;
}

interface BuildTimeTrendChartProps {
  pipelines: Pipeline[];
  selectedPipelineId?: number;
  timeRange?: 7 | 14 | 30;
  className?: string;
}

const BuildTimeTrendChart: React.FC<BuildTimeTrendChartProps> = ({
  pipelines,
  selectedPipelineId,
  timeRange = 30,
  className = ''
}) => {
  const { isMobile } = useResponsive();
  const [showOutliers, setShowOutliers] = useState(true);
  const [granularity, setGranularity] = useState<'daily' | 'weekly'>('daily');

  // Process data for trend analysis
  const trendData = useMemo(() => {
    const endDate = new Date();
    const startDate = subDays(endDate, timeRange);
    
    // Filter pipelines and runs
    const relevantPipelines = selectedPipelineId 
      ? pipelines.filter(p => p.id === selectedPipelineId)
      : pipelines;

    // Collect all runs within time range
    const allRuns: Array<PipelineRun & { pipelineName: string }> = [];
    relevantPipelines.forEach(pipeline => {
      if (pipeline.runs) {
        pipeline.runs.forEach(run => {
          if (run.finished_at && run.duration_seconds && run.status === 'success') {
            const runDate = parseISO(run.finished_at);
            if (runDate >= startDate && runDate <= endDate) {
              allRuns.push({
                ...run,
                pipelineName: pipeline.name
              });
            }
          }
        });
      }
    });

    // Group runs by date
    const groupedData = new Map<string, Array<PipelineRun & { pipelineName: string }>>();
    
    allRuns.forEach(run => {
      const runDate = parseISO(run.finished_at!);
      const dateKey = granularity === 'daily' 
        ? format(startOfDay(runDate), 'yyyy-MM-dd')
        : format(startOfDay(runDate), 'yyyy-MM-dd'); // TODO: Implement weekly grouping
      
      if (!groupedData.has(dateKey)) {
        groupedData.set(dateKey, []);
      }
      groupedData.get(dateKey)!.push(run);
    });

    // Calculate statistics for each date
    const trendPoints: TrendDataPoint[] = [];
    
    for (let i = 0; i < timeRange; i++) {
      const currentDate = subDays(endDate, timeRange - 1 - i);
      const dateKey = format(startOfDay(currentDate), 'yyyy-MM-dd');
      const runsForDate = groupedData.get(dateKey) || [];
      
      if (runsForDate.length > 0) {
        const durations = runsForDate.map(run => run.duration_seconds!);
        durations.sort((a, b) => a - b);
        
        const average = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        const median = durations[Math.floor(durations.length / 2)];
        const min = durations[0];
        const max = durations[durations.length - 1];
        
        // Detect outliers using IQR method
        const q1 = durations[Math.floor(durations.length * 0.25)];
        const q3 = durations[Math.floor(durations.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        const outliers = runsForDate
          .filter(run => run.duration_seconds! < lowerBound || run.duration_seconds! > upperBound)
          .map(run => ({
            duration: run.duration_seconds!,
            pipelineName: run.pipelineName,
            runId: run.id
          }));

        trendPoints.push({
          date: dateKey,
          dateLabel: format(currentDate, isMobile ? 'MM/dd' : 'MMM dd'),
          averageDuration: Math.round(average),
          medianDuration: Math.round(median),
          minDuration: min,
          maxDuration: max,
          runCount: runsForDate.length,
          outliers
        });
      } else {
        // Add empty data point to maintain continuity
        trendPoints.push({
          date: dateKey,
          dateLabel: format(currentDate, isMobile ? 'MM/dd' : 'MMM dd'),
          averageDuration: 0,
          medianDuration: 0,
          minDuration: 0,
          maxDuration: 0,
          runCount: 0,
          outliers: []
        });
      }
    }

    return trendPoints;
  }, [pipelines, selectedPipelineId, timeRange, granularity, isMobile]);

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const validPoints = trendData.filter(point => point.runCount > 0);
    if (validPoints.length === 0) {
      return { avgBuildTime: 0, trend: 'neutral', improvement: 0 };
    }

    const totalAverage = validPoints.reduce((sum, point) => sum + point.averageDuration, 0) / validPoints.length;
    
    // Calculate trend (compare first half vs second half)
    const midPoint = Math.floor(validPoints.length / 2);
    const firstHalf = validPoints.slice(0, midPoint);
    const secondHalf = validPoints.slice(midPoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, point) => sum + point.averageDuration, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, point) => sum + point.averageDuration, 0) / secondHalf.length;
    
    const improvement = ((firstHalfAvg - secondHalfAvg) / firstHalfAvg) * 100;
    const trend = improvement > 5 ? 'improving' : improvement < -5 ? 'degrading' : 'stable';

    return {
      avgBuildTime: Math.round(totalAverage),
      trend,
      improvement: Math.round(improvement)
    };
  }, [trendData]);

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '0s';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as TrendDataPoint;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600 dark:text-blue-400">
              Average: {formatDuration(data.averageDuration)}
            </p>
            <p className="text-green-600 dark:text-green-400">
              Median: {formatDuration(data.medianDuration)}
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Runs: {data.runCount}
            </p>
            {data.outliers.length > 0 && (
              <p className="text-orange-600 dark:text-orange-400">
                Outliers: {data.outliers.length}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom dot component for outliers
  const OutlierDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.outliers && payload.outliers.length > 0 && showOutliers) {
      return (
        <Dot
          cx={cx}
          cy={cy}
          r={4}
          fill="#f59e0b"
          stroke="#d97706"
          strokeWidth={2}
        />
      );
    }
    return null;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Build Time Trends
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last {timeRange} days • Average: {formatDuration(overallStats.avgBuildTime)}
          </p>
        </div>

        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          {/* Trend indicator */}
          <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
            overallStats.trend === 'improving' 
              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
              : overallStats.trend === 'degrading'
              ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}>
            {overallStats.trend === 'improving' && '↗ Improving'}
            {overallStats.trend === 'degrading' && '↘ Degrading'}
            {overallStats.trend === 'stable' && '→ Stable'}
            {overallStats.improvement !== 0 && ` (${Math.abs(overallStats.improvement)}%)`}
          </div>

          {/* Outliers toggle */}
          <button
            onClick={() => setShowOutliers(!showOutliers)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              showOutliers
                ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            Outliers
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
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
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              interval={isMobile ? 'preserveStartEnd' : 0}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatDuration}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Average build time line */}
            <Line
              type="monotone"
              dataKey="averageDuration"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              name="Average Duration"
            />
            
            {/* Median build time line */}
            <Line
              type="monotone"
              dataKey="medianDuration"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls={false}
              name="Median Duration"
            />

            {/* Outlier indicators */}
            {showOutliers && (
              <Line
                type="monotone"
                dataKey="averageDuration"
                stroke="transparent"
                dot={<OutlierDot />}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-0.5 bg-blue-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Average Duration</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-0.5 bg-green-500 border-dashed border-t"></div>
          <span className="text-gray-600 dark:text-gray-400">Median Duration</span>
        </div>
        {showOutliers && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">Outliers</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(BuildTimeTrendChart); 