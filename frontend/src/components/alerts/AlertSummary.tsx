/**
 * Alert Summary Component
 * 
 * Main component for displaying alerts with filtering, sorting, and actions.
 * Provides a comprehensive dashboard view of the alert system.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Alert, AlertFilter, AlertSortOptions, AlertListResponse } from '../../types/alert';
import alertApiService from '../../services/alertApi';
import { StatusIndicator } from '../ui/StatusIndicator';
import { MetricCard, MetricCardGrid } from '../ui/MetricCard';
import { Button } from '../ui';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import AlertCard from './AlertCard';
import AlertFilters from './AlertFilters';
import AlertDetailModal from './AlertDetailModal';
import CIFailureAnalyzer from './CIFailureAnalyzer';
import { useWebSocket, WebSocketMessage } from '../../hooks/useWebSocket';

interface AlertSummaryProps {
  /** Project ID to filter alerts by */
  projectId?: number;
  /** Default filter to apply */
  defaultFilter?: AlertFilter;
  /** Whether to show summary metrics */
  showMetrics?: boolean;
  /** Whether to enable real-time updates */
  realTime?: boolean;
  /** Maximum number of alerts to display */
  maxAlerts?: number;
  /** Compact view mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AlertSummary Component
 * 
 * Comprehensive alert dashboard featuring:
 * - Summary metrics cards
 * - Filterable alert list
 * - Sorting capabilities
 * - Real-time updates
 * - Bulk actions
 * - Detailed alert view
 * 
 * @param projectId - Project ID to filter alerts
 * @param defaultFilter - Default filter configuration
 * @param showMetrics - Display summary metrics
 * @param realTime - Enable real-time updates
 * @param maxAlerts - Maximum alerts to display
 * @param compact - Compact view mode
 * @param className - Additional CSS classes
 */
const AlertSummary: React.FC<AlertSummaryProps> = ({
  projectId,
  defaultFilter,
  showMetrics = true,
  realTime = true,
  maxAlerts = 50,
  compact = false,
  className = '',
}) => {
  // State management
  const [alertData, setAlertData] = useState<AlertListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AlertFilter>(defaultFilter || {});
  const [sort, setSort] = useState<AlertSortOptions>({ field: 'created_at', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  
  // WebSocket connection for real-time updates
  const { connectionStatus, subscribe } = useWebSocket({
    url: process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws',
    autoConnect: realTime,
    token: localStorage.getItem('authToken') || undefined,
  });

  /**
   * Load alerts from API
   */
  const loadAlerts = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const response = await alertApiService.getAlerts(
        { ...filter, project_id: projectId },
        sort,
        page,
        maxAlerts
      );

      setAlertData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
      console.error('Failed to load alerts:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [filter, sort, page, maxAlerts, projectId]);

  /**
   * Handle filter changes
   */
  const handleFilterChange = useCallback((newFilter: AlertFilter) => {
    setFilter(newFilter);
    setPage(1); // Reset to first page when filtering
  }, []);

  /**
   * Handle sort changes
   */
  const handleSortChange = useCallback((newSort: AlertSortOptions) => {
    setSort(newSort);
    setPage(1); // Reset to first page when sorting
  }, []);

  /**
   * Handle alert actions (acknowledge, resolve, suppress)
   */
  const handleAlertAction = useCallback(async (alertId: string, action: string) => {
    try {
      let response;
      
      switch (action) {
        case 'acknowledge':
          response = await alertApiService.acknowledgeAlert(alertId);
          break;
        case 'resolve':
          response = await alertApiService.resolveAlert(alertId);
          break;
        case 'suppress':
          response = await alertApiService.suppressAlert(alertId);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      if (response.success) {
        // Refresh alerts to show updated status
        await loadAlerts();
        
        // Remove from selected alerts if it was selected
        setSelectedAlerts(prev => {
          const newSet = new Set(prev);
          newSet.delete(alertId);
          return newSet;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} alert`);
      console.error(`Failed to ${action} alert:`, err);
    }
  }, [loadAlerts]);

  /**
   * Handle bulk actions
   */
  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedAlerts.size === 0) return;

    try {
      const alertIds = Array.from(selectedAlerts);
      const response = await alertApiService.bulkAction(
        alertIds,
        action as 'acknowledge' | 'resolve' | 'suppress'
      );

      if (response.success > 0) {
        await loadAlerts();
        setSelectedAlerts(new Set());
      }

      if (response.failed > 0) {
        setError(`${response.failed} alerts failed to update`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} selected alerts`);
      console.error(`Failed to ${action} selected alerts:`, err);
    }
  }, [selectedAlerts, loadAlerts]);

  /**
   * Handle real-time alert updates via WebSocket
   */
  const handleAlertUpdate = useCallback((message: WebSocketMessage) => {
    if (!alertData) return;

    const { type, payload } = message;
    
    switch (type) {
      case 'alert_created':
        // Check if the new alert matches current filters
        const newAlert = payload as Alert;
        if (shouldIncludeAlert(newAlert)) {
          setAlertData(prev => prev ? {
            ...prev,
            alerts: [newAlert, ...prev.alerts.slice(0, maxAlerts - 1)],
            total: prev.total + 1,
            summary: updateSummaryForNewAlert(prev.summary, newAlert)
          } : prev);
        }
        break;
        
      case 'alert_updated':
        const updatedAlert = payload as Alert;
        setAlertData(prev => prev ? {
          ...prev,
          alerts: prev.alerts.map(alert => 
            alert.id === updatedAlert.id ? updatedAlert : alert
          ),
          summary: updateSummaryForUpdatedAlert(prev.summary, updatedAlert)
        } : prev);
        break;
        
      case 'alert_resolved':
      case 'alert_acknowledged':
      case 'alert_suppressed':
        const alertId = payload.alert_id || payload.id;
        setAlertData(prev => prev ? {
          ...prev,
          alerts: prev.alerts.map(alert => 
            alert.id === alertId 
              ? { ...alert, status: type.replace('alert_', '').toUpperCase() }
              : alert
          )
        } : prev);
        break;
        
      default:
        break;
    }
  }, [alertData, maxAlerts]);

  /**
   * Check if alert should be included based on current filters
   */
  const shouldIncludeAlert = useCallback((alert: Alert): boolean => {
    if (projectId && alert.project_id !== projectId) return false;
    if (filter.severity && !filter.severity.includes(alert.severity)) return false;
    if (filter.status && !filter.status.includes(alert.status)) return false;
    if (filter.category && !filter.category.includes(alert.category)) return false;
    if (filter.channel && !filter.channel.includes(alert.channel)) return false;
    if (filter.search && !alert.title.toLowerCase().includes(filter.search.toLowerCase()) && 
        !alert.description.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  }, [projectId, filter]);

  /**
   * Update summary metrics for new alert
   */
  const updateSummaryForNewAlert = useCallback((summary: any, alert: Alert) => {
    if (!summary) return summary;
    
    return {
      ...summary,
      total: summary.total + 1,
      critical_count: summary.critical_count + (alert.severity === 'CRITICAL' ? 1 : 0),
      unresolved_count: summary.unresolved_count + (alert.status !== 'RESOLVED' ? 1 : 0),
      by_severity: {
        ...summary.by_severity,
        [alert.severity]: (summary.by_severity[alert.severity] || 0) + 1
      },
      by_status: {
        ...summary.by_status,
        [alert.status]: (summary.by_status[alert.status] || 0) + 1
      },
      by_channel: {
        ...summary.by_channel,
        [alert.channel]: (summary.by_channel[alert.channel] || 0) + 1
      }
    };
  }, []);

  /**
   * Update summary metrics for updated alert
   */
  const updateSummaryForUpdatedAlert = useCallback((summary: any, alert: Alert) => {
    // For simplicity, trigger a full refresh when alerts are updated
    // In a production app, you'd want more sophisticated summary updating
    loadAlerts(false);
    return summary;
  }, [loadAlerts]);

  /**
   * Toggle alert selection
   */
  const toggleAlertSelection = useCallback((alertId: string) => {
    setSelectedAlerts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  }, []);

  /**
   * Get severity status type for display
   */
  const getSeverityStatus = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'neutral';
      default: return 'neutral';
    }
  };

  /**
   * Get severity color for styling
   */
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 dark:text-red-400';
      case 'HIGH': return 'text-orange-600 dark:text-orange-400';
      case 'MEDIUM': return 'text-yellow-600 dark:text-yellow-400';
      case 'LOW': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  /**
   * Check if there are CI/CD related alerts
   */
  const hasCIAlerts = useCallback(() => {
    if (!alerts || alerts.length === 0) return false;
    return alerts.some(alert => 
      alert.category?.toLowerCase().includes('ci') ||
      alert.category?.toLowerCase().includes('cd') ||
      alert.category?.toLowerCase().includes('pipeline') ||
      alert.category?.toLowerCase().includes('build') ||
      alert.category?.toLowerCase().includes('deploy') ||
      alert.source?.toLowerCase().includes('github') ||
      alert.source?.toLowerCase().includes('jenkins') ||
      alert.source?.toLowerCase().includes('gitlab')
    );
  }, [alerts]);

  // Load alerts on component mount and when dependencies change
  useEffect(() => {
    loadAlerts(true);
  }, [loadAlerts]);

  // Set up WebSocket subscriptions for real-time updates
  useEffect(() => {
    if (!realTime) return;

    const unsubscribers = [
      subscribe('alert_created', handleAlertUpdate),
      subscribe('alert_updated', handleAlertUpdate),
      subscribe('alert_resolved', handleAlertUpdate),
      subscribe('alert_acknowledged', handleAlertUpdate),
      subscribe('alert_suppressed', handleAlertUpdate),
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [realTime, subscribe, handleAlertUpdate]);

  // Fallback polling for when WebSocket is not connected
  useEffect(() => {
    if (realTime && connectionStatus !== 'connected' && !refreshInterval) {
      const interval = setInterval(() => {
        loadAlerts(false); // Don't show loading for background updates
      }, 30000); // Refresh every 30 seconds

      setRefreshInterval(interval as any);

      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }

    // Clear polling when WebSocket connects
    if (connectionStatus === 'connected' && refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    };
  }, [realTime, connectionStatus, loadAlerts, refreshInterval]);

  // Loading state
  if (loading && !alertData) {
    return (
      <div className={`space-y-6 ${className}`}>
        {showMetrics && (
          <MetricCardGrid>
            <LoadingSkeleton />
            <LoadingSkeleton />
            <LoadingSkeleton />
            <LoadingSkeleton />
          </MetricCardGrid>
        )}
        <div className="space-y-4">
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (error && !alertData) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-6 ${className}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Failed to load alerts
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {error}
            </p>
            <div className="mt-4">
              <Button 
                size="sm" 
                onClick={() => loadAlerts(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const summary = alertData?.summary;
  const alerts = alertData?.alerts || [];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Metrics */}
      {showMetrics && summary && (
        <MetricCardGrid columns={{ sm: 2, md: 4 }}>
          <MetricCard
            title="Total Alerts"
            value={summary.total}
            icon={
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-12a9 9 0 10-9 9h12" />
              </svg>
            }
          />
          
          <MetricCard
            title="Critical Alerts"
            value={summary.critical_count}
            icon={
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            trend={{
              value: summary.critical_count > 0 ? 'High Priority' : 'All Clear',
              direction: summary.critical_count > 0 ? 'up' : 'neutral',
            }}
          />
          
          <MetricCard
            title="Unresolved"
            value={summary.unresolved_count}
            icon={
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          
          <MetricCard
            title="Active Channels"
            value={Object.keys(summary.by_channel).length}
            icon={
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            }
          />
        </MetricCardGrid>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setError(null)}
                  className="inline-flex rounded-md p-1.5 text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-4">
        {/* Header with Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Alerts
            </h2>
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            )}
            {realTime && (
              <StatusIndicator
                status={
                  connectionStatus === 'connected' ? 'success' :
                  connectionStatus === 'connecting' ? 'warning' :
                  connectionStatus === 'error' ? 'error' :
                  'neutral'
                }
                size="xs"
                label={
                  connectionStatus === 'connected' ? 'Live' :
                  connectionStatus === 'connecting' ? 'Connecting' :
                  connectionStatus === 'error' ? 'Disconnected' :
                  'Offline'
                }
                pulse={connectionStatus === 'connected'}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedAlerts.size > 0 && (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedAlerts.size} selected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('acknowledge')}
                >
                  Acknowledge
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('resolve')}
                >
                  Resolve
                </Button>
              </>
            )}
            
            <Button
              size="sm"
              onClick={() => loadAlerts(true)}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <AlertFilters
          filter={filter}
          onFilterChange={handleFilterChange}
          sort={sort}
          onSortChange={handleSortChange}
          compact={compact}
        />

        {/* Alert List */}
        {alerts.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No alerts found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {Object.keys(filter).length > 0 ? 'Try adjusting your filters.' : 'All clear! No alerts to display.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                compact={compact}
                selected={selectedAlerts.has(alert.id)}
                onSelect={() => toggleAlertSelection(alert.id)}
                onAction={handleAlertAction}
                onViewDetails={() => setSelectedAlert(alert.id)}
                showActions={true}
              />
            ))}
          </div>
        )}

        {/* CI/CD Failure Analysis - Show compact version if there are CI-related alerts */}
        {hasCIAlerts() && !compact && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              CI/CD Failure Analysis
            </h3>
            <CIFailureAnalyzer compact={true} />
          </div>
        )}

        {/* Pagination */}
        {alertData && alertData.total > maxAlerts && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Showing {alerts.length} of {alertData.total} alerts
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {page}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => p + 1)}
                disabled={!alertData.has_next}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <AlertDetailModal
          alertId={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAction={handleAlertAction}
        />
      )}
    </div>
  );
};

export default AlertSummary; 