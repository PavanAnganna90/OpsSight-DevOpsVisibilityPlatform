/**
 * Container Logs Viewer Component
 * 
 * Real-time log streaming component with search, filtering, and color-coded log levels.
 * Features auto-refresh, scroll-to-bottom, and log level filtering.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '../ui';
import { useResponsive } from '../../hooks/useResponsive';

// Log interfaces
interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'unknown';
  message: string;
  source?: string;
}

interface ContainerLogsViewerProps {
  clusterId: string;
  podName: string;
  containerName: string;
  namespace?: string;
  maxLines?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onClose?: () => void;
  className?: string;
}

/**
 * ContainerLogsViewer Component
 * 
 * Displays real-time container logs with filtering, search, and automatic scrolling.
 */
export const ContainerLogsViewer: React.FC<ContainerLogsViewerProps> = ({
  clusterId,
  podName,
  containerName,
  namespace,
  maxLines = 1000,
  autoRefresh = true,
  refreshInterval = 5000,
  onClose,
  className = ''
}) => {
  // State management
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Refs
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Responsive design
  const { isMobile } = useResponsive();

  // Parse log line to extract level and format message
  const parseLogEntry = useCallback((line: string, timestamp: string): LogEntry => {
    // Common log level patterns
    const levelPatterns = [
      { pattern: /\b(ERROR|ERR)\b/i, level: 'error' as const },
      { pattern: /\b(WARN|WARNING)\b/i, level: 'warn' as const },
      { pattern: /\b(INFO|INFORMATION)\b/i, level: 'info' as const },
      { pattern: /\b(DEBUG|DBG)\b/i, level: 'debug' as const },
      { pattern: /\b(TRACE|TRC)\b/i, level: 'trace' as const }
    ];

    let level: LogEntry['level'] = 'unknown';
    for (const { pattern, level: patternLevel } of levelPatterns) {
      if (pattern.test(line)) {
        level = patternLevel;
        break;
      }
    }

    return {
      timestamp,
      level,
      message: line,
      source: containerName
    };
  }, [containerName]);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      params.append('lines', maxLines.toString());
      if (namespace) params.append('namespace', namespace);

      const response = await fetch(
        `/api/v1/kubernetes/clusters/${clusterId}/pods/${podName}/containers/${containerName}/logs?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`);
      }

      const data = await response.json();
      const logLines = data.logs || [];
      
      const parsedLogs = logLines.map((line: any) => 
        parseLogEntry(line.message || line, line.timestamp || new Date().toISOString())
      );

      setLogs(parsedLogs);
      setLastRefresh(new Date());
      
      // Auto-scroll to bottom if enabled
      if (autoScroll && logsContainerRef.current) {
        setTimeout(() => {
          if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
          }
        }, 100);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  }, [clusterId, podName, containerName, namespace, maxLines, parseLogEntry, autoScroll]);

  // Stream logs (WebSocket or polling simulation)
  const startStreaming = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsStreaming(true);
    intervalRef.current = setInterval(() => {
      fetchLogs();
    }, refreshInterval);
  }, [fetchLogs, refreshInterval]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Initial load
  useEffect(() => {
    fetchLogs();
    
    if (autoRefresh) {
      startStreaming();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchLogs, autoRefresh, startStreaming]);

  // Filter logs based on search and level
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = !searchQuery || 
        log.message.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLevel = !levelFilter || log.level === levelFilter;
      
      return matchesSearch && matchesLevel;
    });
  }, [logs, searchQuery, levelFilter]);

  // Get color class for log level
  const getLogLevelColor = (level: LogEntry['level']): string => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      case 'debug': return 'text-green-400';
      case 'trace': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  // Get background color for log level
  const getLogLevelBg = (level: LogEntry['level']): string => {
    switch (level) {
      case 'error': return 'bg-red-900/20 border-l-red-500';
      case 'warn': return 'bg-yellow-900/20 border-l-yellow-500';
      case 'info': return 'bg-blue-900/20 border-l-blue-500';
      case 'debug': return 'bg-green-900/20 border-l-green-500';
      case 'trace': return 'bg-purple-900/20 border-l-purple-500';
      default: return 'bg-gray-900/20 border-l-gray-500';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };

  // Download logs
  const downloadLogs = () => {
    const logText = filteredLogs.map(log => 
      `${log.timestamp} [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${podName}-${containerName}-logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle scroll to detect if user is at bottom
  const handleScroll = () => {
    if (logsContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setAutoScroll(isAtBottom);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Container Logs
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {podName} › {containerName}
          </p>
        </div>
        
        {onClose && (
          <Button
            onClick={onClose}
            size="sm"
            variant="ghost"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
        {/* Search and Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search logs
            </label>
            <input
              type="text"
              placeholder="Search in logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800"
            />
          </div>

          {/* Level Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Log Level
            </label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800"
            >
              <option value="">All Levels</option>
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
              <option value="trace">Trace</option>
            </select>
          </div>

          {/* Max Lines */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Lines
            </label>
            <select
              value={maxLines}
              onChange={(e) => {
                // This would require updating the parent component or state
                console.log('Max lines changed:', e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800"
            >
              <option value="100">100</option>
              <option value="500">500</option>
              <option value="1000">1000</option>
              <option value="5000">5000</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              onClick={isStreaming ? stopStreaming : startStreaming}
              size="sm"
              variant={isStreaming ? "primary" : "outline"}
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d={isStreaming ? "M10 9v6m4-6v6" : "M14.828 14.828a4 4 0 01-5.656 0M9 10h6m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"} 
                />
              </svg>
              {isStreaming ? 'Stop' : 'Start'} Stream
            </Button>

            <Button
              onClick={fetchLogs}
              size="sm"
              variant="outline"
              disabled={loading}
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>

            <Button
              onClick={clearLogs}
              size="sm"
              variant="outline"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoScroll"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-700"
              />
              <label htmlFor="autoScroll" className="text-sm text-gray-700 dark:text-gray-300">
                Auto-scroll
              </label>
            </div>

            <Button
              onClick={downloadLogs}
              size="sm"
              variant="outline"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </Button>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              {filteredLogs.length} / {logs.length} lines
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-gray-600 dark:text-gray-400">
                {isStreaming ? 'Streaming' : 'Not streaming'}
              </span>
            </div>
            <span className="text-gray-600 dark:text-gray-400">
              Last update: {formatTimestamp(lastRefresh.toISOString())}
            </span>
          </div>
        </div>
      </div>

      {/* Logs Content */}
      <div className="relative">
        {error ? (
          <div className="p-4 text-center">
            <div className="text-red-500 dark:text-red-400 mb-2">
              <svg className="h-8 w-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <Button
              onClick={fetchLogs}
              size="sm"
              variant="outline"
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        ) : (
          <div 
            ref={logsContainerRef}
            onScroll={handleScroll}
            className="h-96 overflow-y-auto bg-gray-900 text-gray-100 font-mono text-sm"
          >
            {loading && logs.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-400">Loading logs...</div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-400">
                  {logs.length === 0 ? 'No logs available' : 'No logs match current filters'}
                </div>
              </div>
            ) : (
              <div className="p-2">
                {filteredLogs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`py-1 px-2 border-l-2 ${getLogLevelBg(log.level)} hover:bg-gray-800/50`}
                  >
                    <div className="flex items-start space-x-2">
                      <span className="text-gray-500 text-xs flex-shrink-0 mt-0.5">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <span className={`text-xs font-medium flex-shrink-0 mt-0.5 ${getLogLevelColor(log.level)} uppercase`}>
                        {log.level}
                      </span>
                      <span className="text-gray-100 whitespace-pre-wrap break-words flex-1">
                        {log.message}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContainerLogsViewer; 