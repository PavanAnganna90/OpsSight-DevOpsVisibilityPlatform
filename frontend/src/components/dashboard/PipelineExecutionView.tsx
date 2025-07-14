import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  useExpensiveMemo, 
  useStableCallback, 
  withMemo, 
  shallowEqual,
  useRenderPerformance 
} from '../../utils/performanceOptimizations';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  PlayCircle,
  Pause,
  RefreshCw,
  GitBranch,
  User,
  Calendar,
  Timer,
  AlertCircle,
  Loader2,
  Zap
} from 'lucide-react';

// Types for pipeline execution data
interface PipelineRun {
  id: number;
  pipeline_id: number;
  run_number: number;
  status: 'pending' | 'running' | 'success' | 'failure' | 'cancelled';
  commit_sha: string;
  commit_message?: string;
  triggered_by: string;
  trigger_event: 'push' | 'pull_request' | 'schedule' | 'manual';
  started_at: string;
  finished_at?: string;
  duration_seconds?: number;
  branch: string;
  steps?: PipelineStep[];
  logs?: string[];
}

interface PipelineStep {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failure' | 'skipped';
  started_at?: string;
  finished_at?: string;
  duration_seconds?: number;
  logs?: string[];
}

interface Pipeline {
  id: number;
  name: string;
  repository_url: string;
  branch: string;
  is_active: boolean;
}

interface PipelineExecutionViewProps {
  className?: string;
  maxRuns?: number;
  autoRefresh?: boolean;
  showLogs?: boolean;
}

// Custom hook for WebSocket connection
const useWebSocket = (url: string, options: { enabled: boolean }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!options.enabled) return;

    const socketInstance = io(url, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      retries: 3,
      ackTimeout: 10000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      setError(null);
      console.log('Pipeline WebSocket connected');
    });

    socketInstance.on('disconnect', (reason, details) => {
      setIsConnected(false);
      console.log('Pipeline WebSocket disconnected:', reason, details);
    });

    socketInstance.on('connect_error', (error) => {
      setError(error.message);
      console.error('Pipeline WebSocket connection error:', error);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [url, options.enabled]);

  return { socket, isConnected, error };
};

// Status badge component
const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ 
  status, 
  size = 'md' 
}) => {
  const statusConfig = {
    pending: { icon: Clock, color: 'text-gray-500 bg-gray-100', label: 'Pending' },
    running: { icon: Loader2, color: 'text-blue-500 bg-blue-100', label: 'Running' },
    success: { icon: CheckCircle, color: 'text-green-500 bg-green-100', label: 'Success' },
    failure: { icon: XCircle, color: 'text-red-500 bg-red-100', label: 'Failed' },
    cancelled: { icon: AlertCircle, color: 'text-yellow-500 bg-yellow-100', label: 'Cancelled' },
    skipped: { icon: AlertCircle, color: 'text-gray-400 bg-gray-50', label: 'Skipped' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.color} ${sizeClasses}`}>
      <Icon className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} ${status === 'running' ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  );
};

// Duration component
const Duration: React.FC<{ 
  startedAt: string; 
  finishedAt?: string; 
  isRunning?: boolean;
  className?: string;
}> = ({ startedAt, finishedAt, isRunning, className = '' }) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const duration = useMemo(() => {
    const start = new Date(startedAt).getTime();
    const end = finishedAt ? new Date(finishedAt).getTime() : currentTime;
    const diffInSeconds = Math.floor((end - start) / 1000);
    
    const minutes = Math.floor(diffInSeconds / 60);
    const seconds = diffInSeconds % 60;
    
    return `${minutes}m ${seconds}s`;
  }, [startedAt, finishedAt, currentTime]);

  return (
    <span className={`inline-flex items-center gap-1 text-sm text-gray-600 ${className}`}>
      <Timer className="h-4 w-4" />
      {duration}
    </span>
  );
};

// Pipeline run item component
const PipelineRunItem: React.FC<{ 
  run: PipelineRun; 
  pipeline: Pipeline;
  isExpanded: boolean;
  onToggleExpand: () => void;
  showLogs: boolean;
}> = ({ run, pipeline, isExpanded, onToggleExpand, showLogs }) => {
  const isRunning = run.status === 'running';
  const hasSteps = run.steps && run.steps.length > 0;

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <StatusBadge status={run.status} />
          <div>
            <h3 className="font-semibold text-gray-900">
              {pipeline.name} #{run.run_number}
            </h3>
            <p className="text-sm text-gray-600">{run.commit_message || 'No commit message'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isRunning && (
            <Duration 
              startedAt={run.started_at} 
              finishedAt={run.finished_at} 
              isRunning={isRunning}
            />
          )}
          {hasSteps && (
            <button
              onClick={onToggleExpand}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
        <span className="flex items-center gap-1">
          <GitBranch className="h-4 w-4" />
          {run.branch}
        </span>
        <span className="flex items-center gap-1">
          <User className="h-4 w-4" />
          {run.triggered_by}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
        </span>
        <span className="flex items-center gap-1">
          <Zap className="h-4 w-4" />
          {run.trigger_event}
        </span>
      </div>

      {/* Steps (when expanded) */}
      {isExpanded && hasSteps && (
        <div className="mt-4 space-y-2">
          <h4 className="font-medium text-gray-900 mb-2">Pipeline Steps</h4>
          {run.steps!.map((step) => (
            <div key={step.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-3">
                <StatusBadge status={step.status} size="sm" />
                <span className="font-medium text-gray-900">{step.name}</span>
              </div>
              {step.duration_seconds && (
                <span className="text-sm text-gray-600">
                  {Math.floor(step.duration_seconds / 60)}m {step.duration_seconds % 60}s
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Logs (when expanded and enabled) */}
      {isExpanded && showLogs && run.logs && run.logs.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium text-gray-900 mb-2">Recent Logs</h4>
          <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm max-h-40 overflow-y-auto">
            {run.logs.slice(-10).map((log, index) => (
              <div key={index} className="whitespace-pre-wrap">{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Main component
export const PipelineExecutionView: React.FC<PipelineExecutionViewProps> = ({
  className = '',
  maxRuns = 10,
  autoRefresh = true,
  showLogs = false,
}) => {
  const [expandedRuns, setExpandedRuns] = useState<Set<number>>(new Set());
  const [selectedPipeline, setSelectedPipeline] = useState<number | 'all'>('all');
  const queryClient = useQueryClient();

  // WebSocket connection
  const { socket, isConnected, error: wsError } = useWebSocket(
    process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8000',
    { enabled: autoRefresh }
  );

  // Fetch pipelines
  const { data: pipelines = [], isLoading: pipelinesLoading } = useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const response = await fetch('/api/pipelines');
      if (!response.ok) throw new Error('Failed to fetch pipelines');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch pipeline runs
  const { data: runs = [], isLoading: runsLoading, error: runsError } = useQuery({
    queryKey: ['pipeline-runs', selectedPipeline, maxRuns],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: maxRuns.toString(),
        ...(selectedPipeline !== 'all' && { pipeline_id: selectedPipeline.toString() }),
      });
      
      const response = await fetch(`/api/pipeline-runs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch pipeline runs');
      return response.json();
    },
    refetchInterval: autoRefresh && !isConnected ? 30000 : false, // Fallback polling
    staleTime: 10000, // 10 seconds
  });

  // Handle real-time updates via WebSocket
  const handleRunUpdate = useCallback((updatedRun: PipelineRun) => {
    queryClient.setQueryData(['pipeline-runs', selectedPipeline, maxRuns], (oldData: PipelineRun[] = []) => {
      const existingIndex = oldData.findIndex(run => run.id === updatedRun.id);
      
      if (existingIndex >= 0) {
        // Update existing run
        const newData = [...oldData];
        newData[existingIndex] = updatedRun;
        return newData;
      } else {
        // Add new run (if within limit)
        return [updatedRun, ...oldData.slice(0, maxRuns - 1)];
      }
    });
  }, [queryClient, selectedPipeline, maxRuns]);

  const handleRunCreated = useCallback((newRun: PipelineRun) => {
    handleRunUpdate(newRun);
  }, [handleRunUpdate]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Subscribe to pipeline execution events
    socket.on('pipeline:run:updated', handleRunUpdate);
    socket.on('pipeline:run:created', handleRunCreated);
    socket.on('pipeline:run:status_changed', handleRunUpdate);

    // Join pipeline-specific rooms if filtering
    if (selectedPipeline !== 'all') {
      socket.emit('subscribe:pipeline', selectedPipeline);
    } else {
      socket.emit('subscribe:all_pipelines');
    }

    return () => {
      socket.off('pipeline:run:updated', handleRunUpdate);
      socket.off('pipeline:run:created', handleRunCreated);
      socket.off('pipeline:run:status_changed', handleRunUpdate);
    };
  }, [socket, isConnected, selectedPipeline, handleRunUpdate, handleRunCreated]);

  // Toggle run expansion
  const toggleRunExpansion = useCallback((runId: number) => {
    setExpandedRuns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(runId)) {
        newSet.delete(runId);
      } else {
        newSet.add(runId);
      }
      return newSet;
    });
  }, []);

  // Filter pipelines for dropdown
  const pipelineOptions = useMemo(() => [
    { value: 'all', label: 'All Pipelines' },
    ...pipelines.map((p: Pipeline) => ({ value: p.id, label: p.name }))
  ], [pipelines]);

  const isLoading = pipelinesLoading || runsLoading;
  const hasError = runsError || wsError;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Pipeline Execution
          </h2>
          <p className="text-gray-600 mt-1">
            Real-time view of pipeline executions
            {isConnected && (
              <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Pipeline filter */}
          <select
            value={selectedPipeline}
            onChange={(e) => setSelectedPipeline(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {pipelineOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Connection status */}
          {autoRefresh && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
              isConnected 
                ? 'bg-green-100 text-green-700' 
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
              {isConnected ? 'Connected' : 'Connecting...'}
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Error loading pipeline data</span>
          </div>
          <p className="text-red-700 mt-1 text-sm">
            {runsError?.message || wsError || 'Failed to connect to real-time updates'}
          </p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading pipeline executions...</span>
        </div>
      )}

      {/* Pipeline runs */}
      {!isLoading && runs.length > 0 && (
        <div className="space-y-4">
          {runs.map((run: PipelineRun) => {
            const pipeline = pipelines.find((p: Pipeline) => p.id === run.pipeline_id);
            if (!pipeline) return null;

            return (
              <PipelineRunItem
                key={run.id}
                run={run}
                pipeline={pipeline}
                isExpanded={expandedRuns.has(run.id)}
                onToggleExpand={() => toggleRunExpansion(run.id)}
                showLogs={showLogs}
              />
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && runs.length === 0 && (
        <div className="text-center py-8">
          <PlayCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No pipeline executions</h3>
          <p className="text-gray-600">
            {selectedPipeline === 'all' 
              ? 'No recent pipeline executions found.' 
              : 'No recent executions for the selected pipeline.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default PipelineExecutionView; 