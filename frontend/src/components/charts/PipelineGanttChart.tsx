/**
 * Pipeline Gantt Chart Component
 * 
 * Gantt chart visualization for pipeline execution with:
 * - Timeline visualization of stages, jobs, and steps
 * - Real-time progress tracking
 * - Interactive timeline scrubbing
 * - Dependency visualization
 * - Status-based color coding
 */

import React, { useMemo, useState } from 'react';
import { ExecutionProgressBar, ExecutionStatus } from './ExecutionProgressBar';
import { formatDuration, formatRelativeTime } from '../../utils/time';

export interface PipelineStage {
  id: string;
  name: string;
  status: ExecutionStatus;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  progress: number;
  jobs: PipelineJob[];
}

export interface PipelineJob {
  id: string;
  name: string;
  status: ExecutionStatus;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  progress: number;
  steps: PipelineStep[];
  dependencies?: string[];
}

export interface PipelineStep {
  id: string;
  name: string;
  status: ExecutionStatus;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  progress: number;
  logs?: string[];
}

export interface PipelineGanttChartProps {
  /** Pipeline stages with jobs and steps */
  stages: PipelineStage[];
  /** Total pipeline duration in seconds */
  totalDuration?: number;
  /** Whether to show detailed step information */
  showSteps?: boolean;
  /** Whether to show dependency lines */
  showDependencies?: boolean;
  /** Custom className for styling */
  className?: string;
  /** Callback when a job or step is clicked */
  onItemClick?: (item: PipelineStage | PipelineJob | PipelineStep, type: 'stage' | 'job' | 'step') => void;
}

/**
 * Calculate timeline position and width based on start/end times
 */
const calculateTimelinePosition = (
  startTime?: Date,
  endTime?: Date,
  pipelineStart?: Date,
  pipelineEnd?: Date
): { left: number; width: number } => {
  if (!startTime || !pipelineStart || !pipelineEnd) {
    return { left: 0, width: 0 };
  }

  const pipelineDuration = pipelineEnd.getTime() - pipelineStart.getTime();
  const itemStart = startTime.getTime() - pipelineStart.getTime();
  const itemDuration = endTime ? endTime.getTime() - startTime.getTime() : 0;

  const left = (itemStart / pipelineDuration) * 100;
  const width = (itemDuration / pipelineDuration) * 100;

  return {
    left: Math.max(0, Math.min(100, left)),
    width: Math.max(0, Math.min(100 - left, width))
  };
};

/**
 * Get status-based colors for timeline bars
 */
const getTimelineColors = (status: ExecutionStatus): { bg: string; border: string } => {
  switch (status) {
    case 'pending':
      return { bg: 'bg-gray-300 dark:bg-gray-600', border: 'border-gray-400 dark:border-gray-500' };
    case 'running':
      return { bg: 'bg-blue-400 dark:bg-blue-500', border: 'border-blue-500 dark:border-blue-400' };
    case 'success':
      return { bg: 'bg-green-400 dark:bg-green-500', border: 'border-green-500 dark:border-green-400' };
    case 'failure':
      return { bg: 'bg-red-400 dark:bg-red-500', border: 'border-red-500 dark:border-red-400' };
    case 'cancelled':
      return { bg: 'bg-orange-400 dark:bg-orange-500', border: 'border-orange-500 dark:border-orange-400' };
    case 'skipped':
      return { bg: 'bg-gray-200 dark:bg-gray-700', border: 'border-gray-300 dark:border-gray-600' };
    default:
      return { bg: 'bg-gray-300 dark:bg-gray-600', border: 'border-gray-400 dark:border-gray-500' };
  }
};

/**
 * Timeline Bar Component
 */
const TimelineBar: React.FC<{
  item: PipelineStage | PipelineJob | PipelineStep;
  type: 'stage' | 'job' | 'step';
  position: { left: number; width: number };
  onClick?: () => void;
}> = ({ item, type, position, onClick }) => {
  const colors = getTimelineColors(item.status);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`absolute h-6 ${colors.bg} ${colors.border} border rounded cursor-pointer transition-all duration-200 ${
        isHovered ? 'shadow-lg scale-105 z-10' : ''
      }`}
      style={{
        left: `${position.left}%`,
        width: `${Math.max(position.width, 2)}%`, // Minimum width for visibility
        top: type === 'stage' ? '0px' : type === 'job' ? '8px' : '16px'
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`${item.name} - ${item.status} - ${item.progress}%`}
    >
      {/* Progress indicator for running items */}
      {item.status === 'running' && (
        <div
          className="absolute top-0 left-0 h-full bg-white/20 rounded transition-all duration-500"
          style={{ width: `${item.progress}%` }}
        />
      )}
      
      {/* Item label (only show if there's enough space) */}
      {position.width > 10 && (
        <div className="absolute inset-0 flex items-center px-2">
          <span className="text-xs font-medium text-white truncate">
            {item.name}
          </span>
        </div>
      )}

      {/* Tooltip on hover */}
      {isHovered && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded px-2 py-1 whitespace-nowrap z-20">
          <div className="font-medium">{item.name}</div>
          <div>Status: {item.status}</div>
          <div>Progress: {item.progress}%</div>
          {item.duration && <div>Duration: {formatDuration(item.duration)}</div>}
          {item.startTime && <div>Started: {formatRelativeTime(item.startTime)}</div>}
        </div>
      )}
    </div>
  );
};

/**
 * PipelineGanttChart Component
 */
export const PipelineGanttChart: React.FC<PipelineGanttChartProps> = ({
  stages,
  totalDuration,
  showSteps = false,
  showDependencies = false,
  className = '',
  onItemClick
}) => {
  // Calculate pipeline timeline bounds
  const { pipelineStart, pipelineEnd, timelineData } = useMemo(() => {
    const allItems = stages.flatMap(stage => [
      stage,
      ...stage.jobs.flatMap(job => [job, ...(showSteps ? job.steps : [])])
    ]);

    const startTimes = allItems
      .map(item => item.startTime)
      .filter(Boolean) as Date[];
    
    const endTimes = allItems
      .map(item => item.endTime)
      .filter(Boolean) as Date[];

    if (startTimes.length === 0) {
      return { pipelineStart: undefined, pipelineEnd: undefined, timelineData: [] };
    }

    const pipelineStart = new Date(Math.min(...startTimes.map(d => d.getTime())));
    const pipelineEnd = endTimes.length > 0 
      ? new Date(Math.max(...endTimes.map(d => d.getTime())))
      : new Date(pipelineStart.getTime() + (totalDuration || 3600) * 1000);

    // Calculate positions for all items
    const timelineData = stages.map(stage => ({
      stage,
      position: calculateTimelinePosition(stage.startTime, stage.endTime, pipelineStart, pipelineEnd),
      jobs: stage.jobs.map(job => ({
        job,
        position: calculateTimelinePosition(job.startTime, job.endTime, pipelineStart, pipelineEnd),
        steps: showSteps ? job.steps.map(step => ({
          step,
          position: calculateTimelinePosition(step.startTime, step.endTime, pipelineStart, pipelineEnd)
        })) : []
      }))
    }));

    return { pipelineStart, pipelineEnd, timelineData };
  }, [stages, totalDuration, showSteps]);

  // Generate time markers
  const timeMarkers = useMemo(() => {
    if (!pipelineStart || !pipelineEnd) return [];

    const duration = pipelineEnd.getTime() - pipelineStart.getTime();
    const markers: { position: number; label: string; time: Date }[] = [];

    // Add markers every 10% of the timeline
    for (let i = 0; i <= 10; i++) {
      const position = i * 10;
      const time = new Date(pipelineStart.getTime() + (duration * i) / 10);
      markers.push({
        position,
        label: formatRelativeTime(time),
        time
      });
    }

    return markers;
  }, [pipelineStart, pipelineEnd]);

  if (!pipelineStart || !pipelineEnd) {
    return (
      <div className={`pipeline-gantt-chart ${className} p-4`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          No timeline data available
        </div>
      </div>
    );
  }

  return (
    <div className={`pipeline-gantt-chart ${className} bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Pipeline Execution Timeline
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Total Duration: {totalDuration ? formatDuration(totalDuration) : 'In Progress'}
        </div>
      </div>

      {/* Time markers */}
      <div className="relative h-8 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {timeMarkers.map((marker, index) => (
          <div
            key={index}
            className="absolute top-0 h-full flex flex-col justify-center"
            style={{ left: `${marker.position}%` }}
          >
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 transform -translate-x-1/2">
              {marker.label}
            </div>
          </div>
        ))}
      </div>

      {/* Timeline content */}
      <div className="p-4 space-y-6">
        {timelineData.map(({ stage, position: stagePosition, jobs }) => (
          <div key={stage.id} className="space-y-4">
            {/* Stage header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {stage.name}
                </h4>
                <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                  stage.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  stage.status === 'failure' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  stage.status === 'running' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                }`}>
                  {stage.status}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {stage.progress}% • {stage.jobs.length} jobs
              </div>
            </div>

            {/* Stage timeline */}
            <div className="relative h-8 bg-gray-100 dark:bg-gray-700 rounded">
              <TimelineBar
                item={stage}
                type="stage"
                position={stagePosition}
                onClick={() => onItemClick?.(stage, 'stage')}
              />
            </div>

            {/* Jobs */}
            <div className="ml-4 space-y-3">
              {jobs.map(({ job, position: jobPosition, steps }) => (
                <div key={job.id} className="space-y-2">
                  {/* Job header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {job.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {job.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {job.progress}%
                      {job.duration && ` • ${formatDuration(job.duration)}`}
                    </div>
                  </div>

                  {/* Job timeline */}
                  <div className="relative h-6 bg-gray-50 dark:bg-gray-800 rounded">
                    <TimelineBar
                      item={job}
                      type="job"
                      position={jobPosition}
                      onClick={() => onItemClick?.(job, 'job')}
                    />
                  </div>

                  {/* Steps (if enabled) */}
                  {showSteps && steps.length > 0 && (
                    <div className="ml-4 space-y-1">
                      {steps.map(({ step, position: stepPosition }) => (
                        <div key={step.id} className="flex items-center space-x-2">
                          <div className="flex-1">
                            <ExecutionProgressBar
                              progress={step.progress}
                              status={step.status}
                              duration={step.duration}
                              name={step.name}
                              size="sm"
                              showDetails={false}
                              onClick={() => onItemClick?.(step, 'step')}
                            />
                          </div>
                          <div className="relative h-4 w-32 bg-gray-50 dark:bg-gray-800 rounded">
                            <TimelineBar
                              item={step}
                              type="step"
                              position={stepPosition}
                              onClick={() => onItemClick?.(step, 'step')}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PipelineGanttChart; 