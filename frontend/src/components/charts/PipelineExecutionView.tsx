/**
 * Pipeline Execution View Component
 * 
 * Main component for real-time pipeline execution monitoring with:
 * - Real-time WebSocket updates
 * - Gantt chart timeline visualization
 * - Live progress tracking
 * - Interactive pipeline control
 * - Connection status monitoring
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PipelineGanttChart, PipelineStage, PipelineJob, PipelineStep } from './PipelineGanttChart';
import { ExecutionProgressBar, ExecutionStatus } from './ExecutionProgressBar';
import { useWebSocket, PipelineUpdateMessage } from '../../hooks/useWebSocket';
import { formatDuration, formatRelativeTime } from '../../utils/time';
import { useResponsive } from '../../hooks/useResponsive';

export interface PipelineRun {
  id: number;
  pipeline_id: number;
  run_number: number;
  status: ExecutionStatus;
  started_at: string;
  finished_at?: string;
  duration_seconds?: number;
  branch: string;
  commit_sha?: string;
  commit_message?: string;
  stages?: PipelineStage[];
}

export interface PipelineExecutionViewProps {
  /** Current pipeline run to monitor */
  pipelineRun?: PipelineRun;
  /** WebSocket server URL */
  websocketUrl?: string;
  /** Authentication token for WebSocket */
  authToken?: string;
  /** Whether to show detailed step information */
  showSteps?: boolean;
  /** Whether to auto-refresh data */
  autoRefresh?: boolean;
  /** Custom className for styling */
  className?: string;
  /** Callback when pipeline execution completes */
  onExecutionComplete?: (run: PipelineRun) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

/**
 * Generate mock pipeline data for demonstration
 */
const generateMockPipelineData = (status: ExecutionStatus = 'running'): PipelineStage[] => {
  const now = new Date();
  const stages: PipelineStage[] = [
    {
      id: 'build',
      name: 'Build',
      status: status === 'running' ? 'success' : status,
      startTime: new Date(now.getTime() - 300000), // 5 minutes ago
      endTime: status === 'running' ? new Date(now.getTime() - 240000) : new Date(now.getTime() - 240000), // 4 minutes ago
      duration: 60,
      progress: 100,
      jobs: [
        {
          id: 'compile',
          name: 'Compile Code',
          status: 'success',
          startTime: new Date(now.getTime() - 300000),
          endTime: new Date(now.getTime() - 270000),
          duration: 30,
          progress: 100,
          steps: [
            {
              id: 'install-deps',
              name: 'Install Dependencies',
              status: 'success',
              startTime: new Date(now.getTime() - 300000),
              endTime: new Date(now.getTime() - 285000),
              duration: 15,
              progress: 100
            },
            {
              id: 'build-app',
              name: 'Build Application',
              status: 'success',
              startTime: new Date(now.getTime() - 285000),
              endTime: new Date(now.getTime() - 270000),
              duration: 15,
              progress: 100
            }
          ]
        },
        {
          id: 'lint',
          name: 'Code Linting',
          status: 'success',
          startTime: new Date(now.getTime() - 270000),
          endTime: new Date(now.getTime() - 240000),
          duration: 30,
          progress: 100,
          steps: [
            {
              id: 'eslint',
              name: 'ESLint Check',
              status: 'success',
              startTime: new Date(now.getTime() - 270000),
              endTime: new Date(now.getTime() - 255000),
              duration: 15,
              progress: 100
            },
            {
              id: 'prettier',
              name: 'Prettier Check',
              status: 'success',
              startTime: new Date(now.getTime() - 255000),
              endTime: new Date(now.getTime() - 240000),
              duration: 15,
              progress: 100
            }
          ]
        }
      ]
    },
    {
      id: 'test',
      name: 'Test',
      status: status === 'running' ? 'running' : status,
      startTime: new Date(now.getTime() - 240000),
      endTime: status === 'running' ? undefined : new Date(now.getTime() - 120000),
      duration: status === 'running' ? undefined : 120,
      progress: status === 'running' ? 75 : 100,
      jobs: [
        {
          id: 'unit-tests',
          name: 'Unit Tests',
          status: status === 'running' ? 'success' : status,
          startTime: new Date(now.getTime() - 240000),
          endTime: status === 'running' ? new Date(now.getTime() - 180000) : new Date(now.getTime() - 180000),
          duration: 60,
          progress: 100,
          steps: [
            {
              id: 'jest-tests',
              name: 'Jest Tests',
              status: 'success',
              startTime: new Date(now.getTime() - 240000),
              endTime: new Date(now.getTime() - 180000),
              duration: 60,
              progress: 100
            }
          ]
        },
        {
          id: 'integration-tests',
          name: 'Integration Tests',
          status: status === 'running' ? 'running' : status,
          startTime: new Date(now.getTime() - 180000),
          endTime: status === 'running' ? undefined : new Date(now.getTime() - 120000),
          duration: status === 'running' ? undefined : 60,
          progress: status === 'running' ? 75 : 100,
          steps: [
            {
              id: 'api-tests',
              name: 'API Tests',
              status: status === 'running' ? 'running' : status,
              startTime: new Date(now.getTime() - 180000),
              endTime: status === 'running' ? undefined : new Date(now.getTime() - 120000),
              duration: status === 'running' ? undefined : 60,
              progress: status === 'running' ? 75 : 100
            }
          ]
        }
      ]
    },
    {
      id: 'deploy',
      name: 'Deploy',
      status: status === 'running' ? 'pending' : status,
      startTime: status === 'running' ? undefined : new Date(now.getTime() - 120000),
      endTime: status === 'running' ? undefined : new Date(now.getTime() - 60000),
      duration: status === 'running' ? undefined : 60,
      progress: status === 'running' ? 0 : 100,
      jobs: [
        {
          id: 'deploy-staging',
          name: 'Deploy to Staging',
          status: status === 'running' ? 'pending' : status,
          startTime: status === 'running' ? undefined : new Date(now.getTime() - 120000),
          endTime: status === 'running' ? undefined : new Date(now.getTime() - 60000),
          duration: status === 'running' ? undefined : 60,
          progress: status === 'running' ? 0 : 100,
          steps: [
            {
              id: 'build-image',
              name: 'Build Docker Image',
              status: status === 'running' ? 'pending' : status,
              startTime: status === 'running' ? undefined : new Date(now.getTime() - 120000),
              endTime: status === 'running' ? undefined : new Date(now.getTime() - 90000),
              duration: status === 'running' ? undefined : 30,
              progress: status === 'running' ? 0 : 100
            },
            {
              id: 'deploy-k8s',
              name: 'Deploy to Kubernetes',
              status: status === 'running' ? 'pending' : status,
              startTime: status === 'running' ? undefined : new Date(now.getTime() - 90000),
              endTime: status === 'running' ? undefined : new Date(now.getTime() - 60000),
              duration: status === 'running' ? undefined : 30,
              progress: status === 'running' ? 0 : 100
            }
          ]
        }
      ]
    }
  ];

  return stages;
};

/**
 * PipelineExecutionView Component
 */
export const PipelineExecutionView: React.FC<PipelineExecutionViewProps> = ({
  pipelineRun,
  websocketUrl = 'ws://localhost:8000/ws',
  authToken,
  showSteps = true,
  autoRefresh = true,
  className = '',
  onExecutionComplete,
  onError
}) => {
  const { isMobile } = useResponsive();
  
  // State
  const [currentRun, setCurrentRun] = useState<PipelineRun | undefined>(pipelineRun);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [selectedItem, setSelectedItem] = useState<{
    item: PipelineStage | PipelineJob | PipelineStep;
    type: 'stage' | 'job' | 'step';
  } | null>(null);
  const [showStepsView, setShowStepsView] = useState(showSteps && !isMobile);

  // WebSocket connection
  const {
    connectionStatus,
    subscribe,
    lastError,
    isReconnecting
  } = useWebSocket({
    url: websocketUrl,
    token: authToken,
    autoConnect: autoRefresh
  });

  // Handle WebSocket pipeline updates
  const handlePipelineUpdate = useCallback((message: any) => {
    // Type guard to ensure this is a pipeline update message
    if (message.type !== 'pipeline_update' || !currentRun || message.payload.pipeline_id !== currentRun.pipeline_id) {
      return;
    }

    // Update pipeline run status
    if (message.payload.run_id === currentRun.id) {
      setCurrentRun(prev => prev ? {
        ...prev,
        status: message.payload.status as ExecutionStatus,
        duration_seconds: message.payload.duration
      } : prev);

      // Check if execution completed
      if (['success', 'failure', 'cancelled'].includes(message.payload.status) && onExecutionComplete) {
        onExecutionComplete({
          ...currentRun,
          status: message.payload.status as ExecutionStatus,
          duration_seconds: message.payload.duration,
          finished_at: new Date().toISOString()
        });
      }
    }

    // Update stage/job/step progress
    setStages(prevStages => {
      return prevStages.map(stage => {
        if (message.payload.stage === stage.name) {
          return {
            ...stage,
            status: message.payload.status as ExecutionStatus,
            progress: message.payload.progress || stage.progress,
            duration: message.payload.duration || stage.duration
          };
        }

        // Update jobs within stages
        const updatedJobs = stage.jobs.map(job => {
          if (message.payload.job === job.name) {
            return {
              ...job,
              status: message.payload.status as ExecutionStatus,
              progress: message.payload.progress || job.progress,
              duration: message.payload.duration || job.duration
            };
          }

          // Update steps within jobs
          const updatedSteps = job.steps.map(step => {
            if (message.payload.step === step.name) {
              return {
                ...step,
                status: message.payload.status as ExecutionStatus,
                progress: message.payload.progress || step.progress,
                duration: message.payload.duration || step.duration
              };
            }
            return step;
          });

          return { ...job, steps: updatedSteps };
        });

        return { ...stage, jobs: updatedJobs };
      });
    });
  }, [currentRun, onExecutionComplete]);

  // Subscribe to pipeline updates
  useEffect(() => {
    if (autoRefresh) {
      const unsubscribe = subscribe('pipeline_update', handlePipelineUpdate);
      return unsubscribe;
    }
  }, [subscribe, handlePipelineUpdate, autoRefresh]);

  // Handle WebSocket errors
  useEffect(() => {
    if (lastError && onError) {
      onError(lastError);
    }
  }, [lastError, onError]);

  // Initialize mock data or use provided pipeline run
  useEffect(() => {
    if (pipelineRun) {
      setCurrentRun(pipelineRun);
      setStages(pipelineRun.stages || generateMockPipelineData(pipelineRun.status));
    } else {
      // Generate mock data for demonstration
      setStages(generateMockPipelineData('running'));
      setCurrentRun({
        id: 1,
        pipeline_id: 1,
        run_number: 42,
        status: 'running',
        started_at: new Date(Date.now() - 300000).toISOString(),
        branch: 'main',
        commit_sha: 'abc123def456',
        commit_message: 'feat: add real-time pipeline execution view'
      });
    }
  }, [pipelineRun]);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (stages.length === 0) return 0;
    
    const totalProgress = stages.reduce((sum, stage) => sum + stage.progress, 0);
    return Math.round(totalProgress / stages.length);
  }, [stages]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    if (!currentRun?.started_at) return undefined;
    
    const startTime = new Date(currentRun.started_at);
    const endTime = currentRun.finished_at ? new Date(currentRun.finished_at) : new Date();
    
    return Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
  }, [currentRun]);

  // Handle item selection
  const handleItemClick = useCallback((
    item: PipelineStage | PipelineJob | PipelineStep,
    type: 'stage' | 'job' | 'step'
  ) => {
    setSelectedItem({ item, type });
  }, []);

  if (!currentRun) {
    return (
      <div className={`pipeline-execution-view ${className} p-8`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          No pipeline execution data available
        </div>
      </div>
    );
  }

  return (
    <div className={`pipeline-execution-view ${className} space-y-6`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Pipeline Run #{currentRun.run_number}
              </h2>
              <span className={`px-3 py-1 text-sm rounded-full capitalize ${
                currentRun.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                currentRun.status === 'failure' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                currentRun.status === 'running' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
              }`}>
                {currentRun.status}
              </span>
              {autoRefresh && (
                <div className={`flex items-center space-x-2 text-sm ${
                  connectionStatus === 'connected' ? 'text-green-600 dark:text-green-400' :
                  connectionStatus === 'connecting' || isReconnecting ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-red-600 dark:text-red-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' :
                    connectionStatus === 'connecting' || isReconnecting ? 'bg-yellow-500 animate-pulse' :
                    'bg-red-500'
                  }`} />
                  <span>
                    {connectionStatus === 'connected' ? 'Live' :
                     connectionStatus === 'connecting' ? 'Connecting...' :
                     isReconnecting ? 'Reconnecting...' :
                     'Disconnected'}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>Branch: {currentRun.branch}</span>
              {currentRun.commit_sha && (
                <span>Commit: {currentRun.commit_sha.substring(0, 8)}</span>
              )}
              <span>Started: {formatRelativeTime(currentRun.started_at)}</span>
              {totalDuration && (
                <span>Duration: {formatDuration(totalDuration)}</span>
              )}
            </div>
            
            {currentRun.commit_message && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                {currentRun.commit_message}
              </p>
            )}
          </div>

          <div className="flex flex-col lg:items-end space-y-2">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowStepsView(!showStepsView)}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {showStepsView ? 'Hide Steps' : 'Show Steps'}
              </button>
            </div>
            
            <div className="w-64">
              <ExecutionProgressBar
                progress={overallProgress}
                status={currentRun.status}
                duration={totalDuration}
                name="Overall Progress"
                showDetails={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <PipelineGanttChart
        stages={stages}
        totalDuration={totalDuration}
        showSteps={showStepsView}
        onItemClick={handleItemClick}
        className="shadow-sm"
      />

      {/* Selected Item Details */}
      {selectedItem && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedItem.type.charAt(0).toUpperCase() + selectedItem.type.slice(1)} Details
            </h3>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                {selectedItem.item.name}
              </h4>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <div>Status: <span className="capitalize">{selectedItem.item.status}</span></div>
                <div>Progress: {selectedItem.item.progress}%</div>
                {selectedItem.item.duration && (
                  <div>Duration: {formatDuration(selectedItem.item.duration)}</div>
                )}
                {selectedItem.item.startTime && (
                  <div>Started: {formatRelativeTime(selectedItem.item.startTime)}</div>
                )}
                {selectedItem.item.endTime && (
                  <div>Finished: {formatRelativeTime(selectedItem.item.endTime)}</div>
                )}
              </div>
            </div>
            
            <div>
              <ExecutionProgressBar
                progress={selectedItem.item.progress}
                status={selectedItem.item.status}
                duration={selectedItem.item.duration}
                name={selectedItem.item.name}
                size="lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineExecutionView; 