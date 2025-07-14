/**
 * Status Indicator Component
 * 
 * Reusable component for displaying various status states with
 * consistent styling and accessibility features.
 */

import React from 'react';

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type StatusSize = 'xs' | 'sm' | 'md' | 'lg';

interface StatusIndicatorProps {
  /** Status type determining color and icon */
  status: StatusType;
  /** Size variant */
  size?: StatusSize;
  /** Optional text label */
  label?: string;
  /** Show icon alongside status */
  showIcon?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Optional pulse animation for real-time updates */
  pulse?: boolean;
  /** Accessible description for screen readers */
  ariaLabel?: string;
}

/**
 * Get status configuration including colors and icons
 */
const getStatusConfig = (status: StatusType) => {
  const configs = {
    success: {
      dotColor: 'bg-green-400 dark:bg-green-500',
      textColor: 'text-green-700 dark:text-green-300',
      bgColor: 'bg-green-50 dark:bg-green-900/30',
      borderColor: 'border-green-200 dark:border-green-700',
      icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      defaultLabel: 'Success'
    },
    warning: {
      dotColor: 'bg-yellow-400 dark:bg-yellow-500',
      textColor: 'text-yellow-700 dark:text-yellow-300',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/30',
      borderColor: 'border-yellow-200 dark:border-yellow-700',
      icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      defaultLabel: 'Warning'
    },
    error: {
      dotColor: 'bg-red-400 dark:bg-red-500',
      textColor: 'text-red-700 dark:text-red-300',
      bgColor: 'bg-red-50 dark:bg-red-900/30',
      borderColor: 'border-red-200 dark:border-red-700',
      icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      defaultLabel: 'Error'
    },
    info: {
      dotColor: 'bg-blue-400 dark:bg-blue-500',
      textColor: 'text-blue-700 dark:text-blue-300',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30',
      borderColor: 'border-blue-200 dark:border-blue-700',
      icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      defaultLabel: 'Info'
    },
    neutral: {
      dotColor: 'bg-gray-400 dark:bg-gray-500',
      textColor: 'text-gray-700 dark:text-gray-300',
      bgColor: 'bg-gray-50 dark:bg-gray-900/30',
      borderColor: 'border-gray-200 dark:border-gray-700',
      icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      defaultLabel: 'Neutral'
    }
  };

  return configs[status];
};

/**
 * Get size configuration for dots and icons
 */
const getSizeConfig = (size: StatusSize) => {
  const configs = {
    xs: {
      dot: 'h-1.5 w-1.5',
      icon: 'h-3 w-3',
      text: 'text-xs',
      container: 'gap-1',
      padding: 'px-1.5 py-0.5'
    },
    sm: {
      dot: 'h-2 w-2',
      icon: 'h-3.5 w-3.5',
      text: 'text-sm',
      container: 'gap-1.5',
      padding: 'px-2 py-1'
    },
    md: {
      dot: 'h-2.5 w-2.5',
      icon: 'h-4 w-4',
      text: 'text-sm',
      container: 'gap-2',
      padding: 'px-2.5 py-1.5'
    },
    lg: {
      dot: 'h-3 w-3',
      icon: 'h-5 w-5',
      text: 'text-base',
      container: 'gap-2.5',
      padding: 'px-3 py-2'
    }
  };

  return configs[size];
};

/**
 * StatusIndicator Component Implementation
 * 
 * Flexible status display component supporting multiple status types and sizes.
 * 
 * Features:
 * - Multiple status types with semantic colors
 * - Size variants from extra-small to large
 * - Optional text labels and icons
 * - Pulse animation for real-time indicators
 * - Full accessibility support
 * - Dark mode compatibility
 * 
 * @param status - Status type (success, warning, error, info, neutral)
 * @param size - Size variant (xs, sm, md, lg)
 * @param label - Optional text label
 * @param showIcon - Whether to display status icon
 * @param className - Additional CSS classes
 * @param pulse - Enable pulse animation
 * @param ariaLabel - Accessible description
 */
const StatusIndicatorComponent: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  label,
  showIcon = true,
  className = '',
  pulse = false,
  ariaLabel,
}) => {
  const statusConfig = getStatusConfig(status);
  const sizeConfig = getSizeConfig(size);
  const displayLabel = label || statusConfig.defaultLabel;
  const accessibleLabel = ariaLabel || `Status: ${displayLabel}`;

  return (
    <div 
      className={`inline-flex items-center ${sizeConfig.container} ${className}`}
      role="status"
      aria-label={accessibleLabel}
    >
      {/* Status Dot/Icon */}
      {showIcon ? (
        <div className={`${sizeConfig.icon} ${statusConfig.textColor} flex-shrink-0`}>
          {statusConfig.icon}
        </div>
      ) : (
        <div 
          className={`
            ${sizeConfig.dot} 
            ${statusConfig.dotColor} 
            rounded-full 
            flex-shrink-0
            ${pulse ? 'animate-pulse' : ''}
          `}
        />
      )}

      {/* Label */}
      {label && (
        <span className={`${sizeConfig.text} font-medium ${statusConfig.textColor}`}>
          {displayLabel}
        </span>
      )}
    </div>
  );
};

/**
 * Badge variant of StatusIndicator with background
 */
interface StatusBadgeProps extends Omit<StatusIndicatorProps, 'showIcon'> {
  /** Whether to show as outline variant */
  outline?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
  label,
  className = '',
  pulse = false,
  ariaLabel,
  outline = false,
}) => {
  const statusConfig = getStatusConfig(status);
  const sizeConfig = getSizeConfig(size);
  const displayLabel = label || statusConfig.defaultLabel;
  const accessibleLabel = ariaLabel || `Status: ${displayLabel}`;

  return (
    <span
      className={`
        inline-flex items-center ${sizeConfig.container} ${sizeConfig.padding}
        ${sizeConfig.text} font-medium rounded-full
        ${outline 
          ? `${statusConfig.textColor} ${statusConfig.borderColor} border bg-transparent` 
          : `${statusConfig.textColor} ${statusConfig.bgColor}`
        }
        ${pulse ? 'animate-pulse' : ''}
        ${className}
      `}
      role="status"
      aria-label={accessibleLabel}
    >
      <div 
        className={`
          ${sizeConfig.dot} 
          ${statusConfig.dotColor} 
          rounded-full 
          flex-shrink-0 
          mr-1
        `}
      />
      {displayLabel}
    </span>
  );
};

/**
 * Memoized StatusIndicator component to prevent unnecessary re-renders
 */
export const StatusIndicator = React.memo(StatusIndicatorComponent);

export default StatusIndicator; 