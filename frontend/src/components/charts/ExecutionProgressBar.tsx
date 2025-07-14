/**
 * Execution Progress Bar Component
 * 
 * Reusable progress bar for displaying pipeline execution progress with:
 * - Real-time progress tracking
 * - Status-based color coding
 * - Duration and ETA display
 * - Interactive hover states
 * - Accessibility support
 */

import React from 'react';
import { formatDuration } from '../../utils/time';

export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failure' | 'cancelled' | 'skipped';

export interface ExecutionProgressBarProps {
  /** Current progress percentage (0-100) */
  progress: number;
  /** Current execution status */
  status: ExecutionStatus;
  /** Duration in seconds */
  duration?: number;
  /** Estimated time to completion in seconds */
  eta?: number;
  /** Job or step name */
  name: string;
  /** Whether to show detailed information */
  showDetails?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Custom className for styling */
  className?: string;
  /** Click handler for interactive behavior */
  onClick?: () => void;
}

/**
 * Get status-based colors for the progress bar
 */
const getStatusColors = (status: ExecutionStatus): { bg: string; progress: string; text: string } => {
  switch (status) {
    case 'pending':
      return {
        bg: 'bg-gray-200 dark:bg-gray-700',
        progress: 'bg-gray-400 dark:bg-gray-500',
        text: 'text-gray-600 dark:text-gray-400'
      };
    case 'running':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        progress: 'bg-blue-500 dark:bg-blue-400',
        text: 'text-blue-700 dark:text-blue-300'
      };
    case 'success':
      return {
        bg: 'bg-green-100 dark:bg-green-900/30',
        progress: 'bg-green-500 dark:bg-green-400',
        text: 'text-green-700 dark:text-green-300'
      };
    case 'failure':
      return {
        bg: 'bg-red-100 dark:bg-red-900/30',
        progress: 'bg-red-500 dark:bg-red-400',
        text: 'text-red-700 dark:text-red-300'
      };
    case 'cancelled':
      return {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        progress: 'bg-orange-500 dark:bg-orange-400',
        text: 'text-orange-700 dark:text-orange-300'
      };
    case 'skipped':
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        progress: 'bg-gray-300 dark:bg-gray-600',
        text: 'text-gray-500 dark:text-gray-400'
      };
    default:
      return {
        bg: 'bg-gray-200 dark:bg-gray-700',
        progress: 'bg-gray-400 dark:bg-gray-500',
        text: 'text-gray-600 dark:text-gray-400'
      };
  }
};

/**
 * Get size-based dimensions
 */
const getSizeDimensions = (size: 'sm' | 'md' | 'lg'): { height: string; textSize: string } => {
  switch (size) {
    case 'sm':
      return { height: 'h-2', textSize: 'text-xs' };
    case 'md':
      return { height: 'h-3', textSize: 'text-sm' };
    case 'lg':
      return { height: 'h-4', textSize: 'text-base' };
    default:
      return { height: 'h-3', textSize: 'text-sm' };
  }
};

/**
 * Get status icon
 */
const getStatusIcon = (status: ExecutionStatus): React.JSX.Element | null => {
  switch (status) {
    case 'pending':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'running':
      return (
        <svg 
          className="w-4 h-4 animate-spin" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    case 'success':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'failure':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'cancelled':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
        </svg>
      );
    case 'skipped':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
  }
};

/**
 * ExecutionProgressBar Component
 */
export const ExecutionProgressBar: React.FC<ExecutionProgressBarProps> = ({
  progress,
  status,
  duration,
  eta,
  name,
  showDetails = true,
  size = 'md',
  className = '',
  onClick
}) => {
  const colors = getStatusColors(status);
  const dimensions = getSizeDimensions(size);
  const statusIcon = getStatusIcon(status);

  // Ensure progress is within bounds
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div 
      className={`execution-progress-bar ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : 'progressbar'}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clampedProgress}
      aria-label={`${name} - ${status} - ${clampedProgress}% complete`}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {showDetails && (
        <div className={`flex items-center justify-between mb-2 ${dimensions.textSize}`}>
          <div className={`flex items-center space-x-2 ${colors.text}`}>
            {statusIcon}
            <span className="font-medium truncate">{name}</span>
            <span className="text-xs opacity-75 capitalize">{status}</span>
          </div>
          
          <div className={`flex items-center space-x-3 text-xs ${colors.text} opacity-75`}>
            {duration !== undefined && (
              <span>
                Duration: {formatDuration(duration)}
              </span>
            )}
            {eta !== undefined && status === 'running' && (
              <span>
                ETA: {formatDuration(eta)}
              </span>
            )}
            <span>{clampedProgress.toFixed(0)}%</span>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className={`relative ${dimensions.height} ${colors.bg} rounded-full overflow-hidden`}>
        <div
          className={`absolute top-0 left-0 h-full ${colors.progress} rounded-full transition-all duration-500 ease-in-out`}
          style={{ width: `${clampedProgress}%` }}
        />
        
        {/* Shimmer effect for running status */}
        {status === 'running' && (
          <div
            className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"
            style={{
              animation: 'shimmer 2s linear infinite'
            }}
          />
        )}
      </div>

      {/* Minimal progress display when details are hidden */}
      {!showDetails && (
        <div className={`flex items-center justify-between mt-1 ${dimensions.textSize} ${colors.text}`}>
          <span className="text-xs truncate">{name}</span>
          <span className="text-xs">{clampedProgress.toFixed(0)}%</span>
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default ExecutionProgressBar; 