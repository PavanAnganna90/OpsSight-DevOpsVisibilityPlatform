/**
 * Alert Card Component
 * 
 * Individual alert card component for displaying alert information
 * with actions and status indicators.
 */

import React from 'react';
import { Alert } from '../../types/alert';
import { StatusIndicator, StatusBadge } from '../ui/StatusIndicator';
import { Button } from '../ui';

interface AlertCardProps {
  /** Alert data to display */
  alert: Alert;
  /** Compact view mode */
  compact?: boolean;
  /** Whether the alert is selected */
  selected?: boolean;
  /** Selection handler */
  onSelect?: () => void;
  /** Action handler */
  onAction?: (alertId: string, action: string) => void;
  /** View details handler */
  onViewDetails?: () => void;
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AlertCard Component
 * 
 * Displays individual alert information including:
 * - Severity and status indicators
 * - Alert title and description
 * - Source and timestamp
 * - Action buttons
 * - Selection checkbox
 * 
 * @param alert - Alert data
 * @param compact - Compact view mode
 * @param selected - Selection state
 * @param onSelect - Selection handler
 * @param onAction - Action handler
 * @param onViewDetails - Details view handler
 * @param showActions - Show action buttons
 * @param className - Additional CSS classes
 */
const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  compact = false,
  selected = false,
  onSelect,
  onAction,
  onViewDetails,
  showActions = true,
  className = '',
}) => {
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
          borderColor: 'border-red-200 dark:border-red-700',
        };
      case 'HIGH':
        return {
          status: 'warning' as const,
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          borderColor: 'border-orange-200 dark:border-orange-700',
        };
      case 'MEDIUM':
        return {
          status: 'info' as const,
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-700',
        };
      case 'LOW':
        return {
          status: 'neutral' as const,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-700',
        };
      default:
        return {
          status: 'neutral' as const,
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-700',
        };
    }
  };

  /**
   * Get status configuration
   */
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return {
          status: 'error' as const,
          label: 'Active',
          color: 'text-red-600 dark:text-red-400',
        };
      case 'ACKNOWLEDGED':
        return {
          status: 'warning' as const,
          label: 'Acknowledged',
          color: 'text-yellow-600 dark:text-yellow-400',
        };
      case 'RESOLVED':
        return {
          status: 'success' as const,
          label: 'Resolved',
          color: 'text-green-600 dark:text-green-400',
        };
      case 'SUPPRESSED':
        return {
          status: 'neutral' as const,
          label: 'Suppressed',
          color: 'text-gray-600 dark:text-gray-400',
        };
      default:
        return {
          status: 'neutral' as const,
          label: status,
          color: 'text-gray-600 dark:text-gray-400',
        };
    }
  };

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  /**
   * Get category icon
   */
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'INFRASTRUCTURE':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
          </svg>
        );
      case 'SECURITY':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'PERFORMANCE':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'DATABASE':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-12a9 9 0 10-9 9h12" />
          </svg>
        );
    }
  };

  const severityConfig = getSeverityConfig(alert.severity);
  const statusConfig = getStatusConfig(alert.status);

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 rounded-lg border-2 transition-all duration-200
        ${selected ? 'border-blue-500 dark:border-blue-400 shadow-md' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}
        ${compact ? 'p-3' : 'p-4'}
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Selection Checkbox */}
        {onSelect && (
          <div className="flex-shrink-0 pt-1">
            <input
              type="checkbox"
              checked={selected}
              onChange={onSelect}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        )}

        {/* Severity Indicator */}
        <div className="flex-shrink-0 pt-1">
          <StatusIndicator
            status={severityConfig.status}
            size={compact ? 'sm' : 'md'}
            pulse={alert.status === 'ACTIVE' && alert.severity === 'CRITICAL'}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold text-gray-900 dark:text-white truncate ${compact ? 'text-sm' : 'text-base'}`}>
                {alert.title}
              </h3>
              {!compact && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {alert.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge
                status={statusConfig.status}
                label={statusConfig.label}
                size="sm"
              />
              <StatusBadge
                status={severityConfig.status}
                label={alert.severity}
                size="sm"
              />
            </div>
          </div>

          {/* Metadata */}
          <div className={`flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 ${compact ? 'mb-2' : 'mb-3'}`}>
            {/* Category */}
            <div className="flex items-center gap-1">
              {getCategoryIcon(alert.category)}
              <span>{alert.category}</span>
            </div>

            {/* Source */}
            {alert.source && (
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
                <span className="truncate max-w-24">{alert.source}</span>
              </div>
            )}

            {/* Channel */}
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <span>{alert.channel}</span>
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formatTimestamp(alert.created_at)}</span>
            </div>
          </div>

          {/* Tags */}
          {alert.tags && alert.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {alert.tags.slice(0, compact ? 2 : 4).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                >
                  {tag}
                </span>
              ))}
              {alert.tags.length > (compact ? 2 : 4) && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{alert.tags.length - (compact ? 2 : 4)} more
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-2">
              {alert.status === 'ACTIVE' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAction?.(alert.id, 'acknowledge')}
                  >
                    Acknowledge
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAction?.(alert.id, 'resolve')}
                  >
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAction?.(alert.id, 'suppress')}
                  >
                    Suppress
                  </Button>
                </>
              )}

              {alert.status === 'ACKNOWLEDGED' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAction?.(alert.id, 'resolve')}
                >
                  Resolve
                </Button>
              )}

              {onViewDetails && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onViewDetails}
                  className="ml-auto"
                >
                  View Details
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertCard; 