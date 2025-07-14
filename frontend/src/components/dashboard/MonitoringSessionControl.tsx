/**
 * Monitoring Session Control Component
 * 
 * Provides controls for optimizing long monitoring sessions
 * including focus mode, auto-refresh, and wellness features.
 */

import React, { useCallback } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useMonitoringSession } from '../../hooks/useMonitoringSession';
import { useResponsive } from '../../hooks/useResponsive';
import { Button, StatusIndicator } from '../ui';

interface MonitoringSessionControlProps {
  /** Callback for refreshing data */
  onRefresh: () => void | Promise<void>;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * MonitoringSessionControl Component
 * 
 * Provides comprehensive controls for long monitoring sessions:
 * - Auto-refresh with customizable intervals
 * - Focus mode toggle
 * - Eye-strain reduction controls
 * - Break reminders and session metrics
 * - Reduced motion preferences
 * 
 * Features:
 * - Real-time session tracking
 * - Wellness notifications
 * - Accessibility compliance
 * - Dark mode support
 * - Responsive design
 * 
 * @param onRefresh - Function to call when refreshing data
 * @param className - Optional CSS classes for custom styling
 */
export const MonitoringSessionControl: React.FC<MonitoringSessionControlProps> = ({
  onRefresh,
  className = '',
}) => {
  const { isMobile, isTablet } = useResponsive();
  
  const autoRefresh = useAutoRefresh(onRefresh, {
    interval: 30000, // 30 seconds default
    enabled: true,
    pauseOnHidden: true,
    pauseOnIdle: true,
    idleTimeout: 300000, // 5 minutes
  });

  const monitoringSession = useMonitoringSession({
    enableEyeStrainReduction: true,
    autoFocusAfter: 1800000, // 30 minutes
    breakReminderInterval: 3600000, // 1 hour
  });

  /**
   * Format duration for display
   */
  const formatDuration = useCallback((ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, []);

  /**
   * Get refresh interval options
   */
  const refreshIntervals = [
    { value: 15000, label: '15s' },
    { value: 30000, label: '30s' },
    { value: 60000, label: '1m' },
    { value: 120000, label: '2m' },
    { value: 300000, label: '5m' },
  ];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${isMobile ? 'p-3 space-y-3' : 'p-4 space-y-4'} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Session Controls
        </h3>
        <div className="flex items-center space-x-2">
          <StatusIndicator
            status={autoRefresh.isEnabled ? 'success' : 'neutral'}
            size="sm"
            pulse={autoRefresh.isEnabled && !autoRefresh.isPaused}
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {autoRefresh.isEnabled ? 'Active' : 'Paused'}
          </span>
        </div>
      </div>

      {/* Auto-Refresh Controls */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Auto-Refresh
        </h4>
        
        <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-2">
             <Button
               variant={autoRefresh.isEnabled ? 'primary' : 'secondary'}
               size="sm"
               onClick={autoRefresh.toggle}
               leftIcon={
                 <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                     d={autoRefresh.isEnabled 
                       ? "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                       : "M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1m-6-8h1m4 0h1m-7 4h.01M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h1m0 0h1m0 0V1a2 2 0 012-2h2a2 2 0 012 2v1m1 0h1m0 0h2a2 2 0 012 2v9a2 2 0 01-2 2h-1m0 0v1a2 2 0 01-2 2h-2a2 2 0 01-2-2v-1m-1 0H9m1 0v-1a2 2 0 00-2-2H6a2 2 0 00-2 2v1m2 0H4"
                     }
                   />
                 </svg>
               }
             >
               {autoRefresh.isEnabled ? 'Pause' : 'Resume'}
             </Button>
             
             <Button
               variant="secondary"
               size="sm"
               onClick={autoRefresh.refresh}
               leftIcon={
                 <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                     d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                 </svg>
               }
             >
               Refresh Now
             </Button>
           </div>

          {autoRefresh.isEnabled && !autoRefresh.isPaused && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Next: {autoRefresh.timeUntilRefresh}s
            </div>
          )}
        </div>

        {/* Refresh Interval Selector */}
        <div className={`flex items-center ${isMobile ? 'flex-col space-y-2' : 'space-x-2'}`}>
          <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Interval:</span>
          <div className={`flex ${isMobile ? 'flex-wrap gap-1' : 'space-x-1'}`}>
            {refreshIntervals.map((interval) => (
              <button
                key={interval.value}
                onClick={() => autoRefresh.setInterval(interval.value)}
                className={`${isMobile ? 'px-3 py-2 text-sm min-w-[44px]' : 'px-2 py-1 text-xs'} rounded transition-colors ${
                  autoRefresh.timeUntilRefresh <= interval.value / 1000
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {interval.label}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-refresh status indicators */}
        {autoRefresh.isPaused && (
          <div className="flex items-center space-x-2 text-sm text-amber-600 dark:text-amber-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>
              Paused - {autoRefresh.isIdle ? 'User idle' : 'Tab hidden'}
            </span>
          </div>
        )}
      </div>

      {/* Focus Mode Controls */}
      <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Focus Mode
        </h4>
        
        <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-3">
             <Button
               variant={monitoringSession.isFocusMode ? 'primary' : 'secondary'}
               size="sm"
               onClick={monitoringSession.toggleFocusMode}
               leftIcon={
                 <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                     d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                 </svg>
               }
             >
               {monitoringSession.isFocusMode ? 'Exit Focus' : 'Focus Mode'}
             </Button>
             
             <Button
               variant={monitoringSession.isReducedMotion ? 'primary' : 'secondary'}
               size="sm"
               onClick={monitoringSession.toggleReducedMotion}
               leftIcon={
                 <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                     d="M13 10V3L4 14h7v7l9-11h-7z" />
                 </svg>
               }
             >
               Reduce Motion
             </Button>
           </div>
        </div>

        {monitoringSession.isFocusMode && (
          <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded p-2">
            Focus mode active - Reduced animations and visual distractions
          </div>
        )}
      </div>

      {/* Session Metrics */}
      <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Session Stats
        </h4>
        
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-4'} text-sm`}>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Duration:</span>
            <div className="font-medium text-gray-900 dark:text-white">
              {formatDuration(monitoringSession.sessionMetrics.duration)}
            </div>
          </div>
          
          <div>
            <span className="text-gray-500 dark:text-gray-400">Breaks:</span>
            <div className="font-medium text-gray-900 dark:text-white">
              {monitoringSession.sessionMetrics.breaksCount}
            </div>
          </div>
          
          <div className={isMobile ? '' : 'col-span-2'}>
            <span className="text-gray-500 dark:text-gray-400">Time since last break:</span>
            <div className="font-medium text-gray-900 dark:text-white">
              {formatDuration(monitoringSession.sessionMetrics.timeSinceLastBreak)}
            </div>
          </div>
        </div>

        {monitoringSession.sessionMetrics.shouldTakeBreak && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="h-5 w-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  Time for a break!
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={monitoringSession.takeBreak}
              >
                Take Break
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Break Reminder Modal */}
      {monitoringSession.showBreakReminder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl ${isMobile ? 'p-4 max-w-sm w-full' : 'p-6 max-w-md'} mx-auto`}>
            <div className={`flex items-center ${isMobile ? 'space-x-2 mb-3' : 'space-x-3 mb-4'}`}>
              <div className="flex-shrink-0">
                <svg className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-orange-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-white`}>
                  Break Reminder
                </h3>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400`}>
                  You've been monitoring for a while. Consider taking a short break.
                </p>
              </div>
            </div>
            
            <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'space-x-3'}`}>
              <Button
                variant="primary"
                onClick={monitoringSession.takeBreak}
                fullWidth
                size={isMobile ? 'md' : 'md'}
              >
                Take Break
              </Button>
              <Button
                variant="secondary"
                onClick={monitoringSession.dismissBreakReminder}
                fullWidth
                size={isMobile ? 'md' : 'md'}
              >
                Remind Later
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringSessionControl; 