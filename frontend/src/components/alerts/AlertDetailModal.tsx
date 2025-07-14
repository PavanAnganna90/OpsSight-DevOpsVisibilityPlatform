/**
 * Alert Detail Modal Component
 * 
 * Modal component for displaying detailed alert information
 * including lifecycle history and actions.
 */

import React, { useState, useEffect } from 'react';
import { AlertWithLifecycle, LifecycleTransition } from '../../types/alert';
import alertApiService from '../../services/alertApi';
import { Modal } from '../common/Modal';
import { StatusIndicator, StatusBadge } from '../ui/StatusIndicator';
import { Button } from '../ui';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';

interface AlertDetailModalProps {
  /** Alert ID to display */
  alertId: string;
  /** Close handler */
  onClose: () => void;
  /** Action handler */
  onAction?: (alertId: string, action: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AlertDetailModal Component
 * 
 * Displays comprehensive alert information including:
 * - Full alert details
 * - Lifecycle history
 * - Action buttons
 * - Context and metadata
 * 
 * @param alertId - Alert ID to display
 * @param onClose - Close handler
 * @param onAction - Action handler
 * @param className - Additional CSS classes
 */
const AlertDetailModal: React.FC<AlertDetailModalProps> = ({
  alertId,
  onClose,
  onAction,
  className = '',
}) => {
  const [alert, setAlert] = useState<AlertWithLifecycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /**
   * Load alert details
   */
  const loadAlert = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const alertData = await alertApiService.getAlertWithLifecycle(alertId);
      setAlert(alertData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alert details');
      console.error('Failed to load alert details:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle alert actions
   */
  const handleAction = async (action: string) => {
    if (!alert) return;

    try {
      setActionLoading(action);
      await onAction?.(alert.id, action);
      
      // Reload alert to get updated status
      await loadAlert();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} alert`);
      console.error(`Failed to ${action} alert:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  /**
   * Get severity configuration
   */
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          status: 'error' as const,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
        };
      case 'HIGH':
        return {
          status: 'warning' as const,
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        };
      case 'MEDIUM':
        return {
          status: 'info' as const,
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        };
      case 'LOW':
        return {
          status: 'neutral' as const,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        };
      default:
        return {
          status: 'neutral' as const,
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
        };
    }
  };

  /**
   * Get status configuration
   */
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { status: 'error' as const, label: 'Active' };
      case 'ACKNOWLEDGED':
        return { status: 'warning' as const, label: 'Acknowledged' };
      case 'RESOLVED':
        return { status: 'success' as const, label: 'Resolved' };
      case 'SUPPRESSED':
        return { status: 'neutral' as const, label: 'Suppressed' };
      default:
        return { status: 'neutral' as const, label: status };
    }
  };

  /**
   * Get lifecycle stage configuration
   */
  const getLifecycleStageConfig = (stage: string) => {
    switch (stage) {
      case 'RECEIVED':
        return { status: 'info' as const, color: 'text-blue-600 dark:text-blue-400' };
      case 'CATEGORIZED':
        return { status: 'info' as const, color: 'text-indigo-600 dark:text-indigo-400' };
      case 'ACKNOWLEDGED':
        return { status: 'warning' as const, color: 'text-yellow-600 dark:text-yellow-400' };
      case 'INVESTIGATING':
        return { status: 'warning' as const, color: 'text-orange-600 dark:text-orange-400' };
      case 'ESCALATED':
        return { status: 'error' as const, color: 'text-red-600 dark:text-red-400' };
      case 'RESOLVED':
        return { status: 'success' as const, color: 'text-green-600 dark:text-green-400' };
      case 'CLOSED':
        return { status: 'success' as const, color: 'text-green-700 dark:text-green-300' };
      case 'SUPPRESSED':
        return { status: 'neutral' as const, color: 'text-gray-600 dark:text-gray-400' };
      default:
        return { status: 'neutral' as const, color: 'text-gray-600 dark:text-gray-400' };
    }
  };

  // Load alert on mount
  useEffect(() => {
    loadAlert();
  }, [alertId]);

  const severityConfig = alert ? getSeverityConfig(alert.severity) : null;
  const statusConfig = alert ? getStatusConfig(alert.status) : null;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Alert Details"
      maxWidth="lg"
    >
      {loading && (
        <div className="space-y-4">
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {alert && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {severityConfig && (
                  <StatusIndicator
                    status={severityConfig.status}
                    size="md"
                    pulse={alert.status === 'ACTIVE' && alert.severity === 'CRITICAL'}
                  />
                )}
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {alert.title}
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                {alert.description}
              </p>
              <div className="flex items-center gap-2">
                {statusConfig && (
                  <StatusBadge
                    status={statusConfig.status}
                    label={statusConfig.label}
                    size="sm"
                  />
                )}
                {severityConfig && (
                  <StatusBadge
                    status={severityConfig.status}
                    label={alert.severity}
                    size="sm"
                  />
                )}
                <StatusBadge
                  status="info"
                  label={alert.category}
                  size="sm"
                />
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Alert ID
                </label>
                <p className="text-sm text-gray-900 dark:text-white font-mono">
                  {alert.id}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Source
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {alert.source || 'Unknown'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Channel
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {alert.channel}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  External ID
                </label>
                <p className="text-sm text-gray-900 dark:text-white font-mono">
                  {alert.external_id || 'N/A'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Created
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {formatTimestamp(alert.created_at)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Last Updated
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {formatTimestamp(alert.updated_at)}
                </p>
              </div>
              
              {alert.acknowledged_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Acknowledged
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatTimestamp(alert.acknowledged_at)}
                    {alert.acknowledged_by && (
                      <span className="text-gray-500 dark:text-gray-400">
                        {' '}by {alert.acknowledged_by}
                      </span>
                    )}
                  </p>
                </div>
              )}
              
              {alert.resolved_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Resolved
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatTimestamp(alert.resolved_at)}
                    {alert.resolved_by && (
                      <span className="text-gray-500 dark:text-gray-400">
                        {' '}by {alert.resolved_by}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {alert.tags && alert.tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {alert.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Context */}
          {alert.context && Object.keys(alert.context).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Context
              </label>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <pre className="text-xs text-gray-900 dark:text-white whitespace-pre-wrap">
                  {JSON.stringify(alert.context, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Lifecycle History */}
          {alert.lifecycle_history && alert.lifecycle_history.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Lifecycle History
              </label>
              <div className="space-y-3">
                {alert.lifecycle_history.map((transition, index) => {
                  const stageConfig = getLifecycleStageConfig(transition.to_stage);
                  return (
                    <div key={transition.id} className="flex items-start gap-3">
                      <div className="flex-shrink-0 pt-1">
                        <StatusIndicator
                          status={stageConfig.status}
                          size="sm"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${stageConfig.color}`}>
                            {transition.from_stage} → {transition.to_stage}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTimestamp(transition.created_at)}
                          </span>
                        </div>
                        {transition.reason && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {transition.reason}
                          </p>
                        )}
                        {transition.user_id && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            by {transition.user_id}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              {alert.status === 'ACTIVE' && (
                <>
                  <Button
                    onClick={() => handleAction('acknowledge')}
                    disabled={actionLoading === 'acknowledge'}
                  >
                    Acknowledge
                  </Button>
                  <Button
                    onClick={() => handleAction('resolve')}
                    disabled={actionLoading === 'resolve'}
                  >
                    Resolve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAction('suppress')}
                    disabled={actionLoading === 'suppress'}
                  >
                    Suppress
                  </Button>
                </>
              )}

              {alert.status === 'ACKNOWLEDGED' && (
                <Button
                  onClick={() => handleAction('resolve')}
                  disabled={actionLoading === 'resolve'}
                >
                  Resolve
                </Button>
              )}
            </div>

            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AlertDetailModal; 