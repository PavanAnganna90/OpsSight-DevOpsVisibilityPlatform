/**
 * Events Timeline Component
 * 
 * Displays a real-time timeline of Kubernetes events with filtering,
 * grouping, and severity-based visualization.
 */

import React, { useState, useMemo, JSX } from 'react';
import { Button } from '../ui';
import { useKubernetesEvents } from '../../hooks/useKubernetesEvents';
import { KubernetesEvent } from '../../services/websocket';

interface EventsTimelineProps {
  clusterId?: string;
  maxEvents?: number;
  showConnectionStatus?: boolean;
  autoRefresh?: boolean;
  className?: string;
}

interface EventFilter {
  type: string;
  severity: string;
  search: string;
  timeRange: string;
}

/**
 * EventsTimeline Component
 * 
 * Real-time timeline display of Kubernetes cluster events with advanced filtering.
 */
export const EventsTimeline: React.FC<EventsTimelineProps> = ({
  clusterId,
  maxEvents = 100,
  showConnectionStatus = true,
  autoRefresh = true,
  className = ''
}) => {
  // Event subscription
  const [eventsState, eventsActions] = useKubernetesEvents({
    clusterId,
    enabled: autoRefresh,
    autoConnect: true,
    maxEvents
  });

  // Filter state
  const [filter, setFilter] = useState<EventFilter>({
    type: 'all',
    severity: 'all',
    search: '',
    timeRange: 'all'
  });

  // Filter events based on current filters
  const filteredEvents = useMemo(() => {
    let filtered = eventsState.events;

    // Filter by type
    if (filter.type !== 'all') {
      filtered = filtered.filter(event => event.type === filter.type);
    }

    // Filter by severity
    if (filter.severity !== 'all') {
      filtered = filtered.filter(event => event.severity === filter.severity);
    }

    // Filter by search text
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(event => 
        JSON.stringify(event.data).toLowerCase().includes(searchLower) ||
        event.action.toLowerCase().includes(searchLower)
      );
    }

    // Filter by time range
    if (filter.timeRange !== 'all') {
      const now = new Date();
      const timeMs = {
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000
      };

      const cutoff = new Date(now.getTime() - timeMs[filter.timeRange as keyof typeof timeMs]);
      filtered = filtered.filter(event => new Date(event.timestamp) >= cutoff);
    }

    return filtered;
  }, [eventsState.events, filter]);

  // Group events by time periods
  const groupedEvents = useMemo(() => {
    const groups: { [key: string]: KubernetesEvent[] } = {};
    
    filteredEvents.forEach(event => {
      const date = new Date(event.timestamp);
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      
      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = date.toLocaleDateString();
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(event);
    });

    // Sort groups by date (newest first)
    const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
      if (a === 'Today') return -1;
      if (b === 'Today') return 1;
      if (a === 'Yesterday') return -1;
      if (b === 'Yesterday') return 1;
      return new Date(b).getTime() - new Date(a).getTime();
    });

    return sortedGroups.map(([date, events]) => ({
      date,
      events: events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    }));
  }, [filteredEvents]);

  // Get icon for event type
  const getEventIcon = (event: KubernetesEvent): JSX.Element => {
    const iconClass = "h-4 w-4";
    
    switch (event.type) {
      case 'pod':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'node':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
          </svg>
        );
      case 'cluster':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case 'alert':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Get color classes for event severity
  const getSeverityColor = (severity?: string): string => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'error': return 'text-red-500 bg-red-50 dark:bg-red-900/10';
      case 'warning': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'info': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  // Get action color
  const getActionColor = (action: string): string => {
    switch (action) {
      case 'created': return 'text-green-600';
      case 'updated': return 'text-blue-600';
      case 'deleted': return 'text-red-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Format event data for display
  const formatEventData = (event: KubernetesEvent): string => {
    if (event.data.name) {
      return event.data.name;
    }
    if (typeof event.data === 'string') {
      return event.data;
    }
    return JSON.stringify(event.data).slice(0, 100) + '...';
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Events Timeline
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredEvents.length} events
          </p>
        </div>
        
        {showConnectionStatus && (
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              eventsState.isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {eventsState.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search events..."
              value={filter.search}
              onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filter.type}
              onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800"
            >
              <option value="all">All Types</option>
              <option value="pod">Pod Events</option>
              <option value="node">Node Events</option>
              <option value="cluster">Cluster Events</option>
              <option value="alert">Alert Events</option>
              <option value="resource">Resource Events</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <select
              value={filter.severity}
              onChange={(e) => setFilter(prev => ({ ...prev, severity: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          {/* Time Range Filter */}
          <div>
            <select
              value={filter.timeRange}
              onChange={(e) => setFilter(prev => ({ ...prev, timeRange: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800"
            >
              <option value="all">All Time</option>
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex space-x-2">
            <Button
              onClick={eventsActions.clearEvents}
              size="sm"
              variant="outline"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear
            </Button>
            
            {!eventsState.isConnected && (
              <Button
                onClick={eventsActions.connect}
                size="sm"
                variant="outline"
                disabled={eventsState.isConnecting}
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {eventsState.isConnecting ? 'Connecting...' : 'Reconnect'}
              </Button>
            )}
          </div>

          {eventsState.error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {eventsState.error}
            </div>
          )}
        </div>
      </div>

      {/* Events Timeline */}
      <div className="max-h-96 overflow-y-auto">
        {groupedEvents.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 dark:text-gray-600">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No events found
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No events match the current filters.
              </p>
            </div>
          </div>
        ) : (
          groupedEvents.map(({ date, events }) => (
            <div key={date} className="p-4">
              {/* Date Header */}
              <div className="flex items-center mb-4">
                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                <div className="px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {date}
                </div>
                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
              </div>

              {/* Events List */}
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="flex items-start space-x-3">
                    {/* Timeline Line */}
                    <div className="flex flex-col items-center">
                      <div className={`p-2 rounded-full ${getSeverityColor(event.severity)}`}>
                        {getEventIcon(event)}
                      </div>
                      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
                    </div>

                    {/* Event Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                            {event.type}
                          </span>
                          <span className={`text-xs font-medium capitalize ${getActionColor(event.action)}`}>
                            {event.action}
                          </span>
                          {event.severity && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                              {event.severity}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(event.timestamp)}
                        </span>
                      </div>
                      
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {formatEventData(event)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EventsTimeline; 