/**
 * Dashboard Content Component
 * 
 * Main content area for the OpsSight dashboard displaying
 * metrics, charts, and monitoring information.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { MetricCard, MetricCardGrid, StatusIndicator, LoadingSkeleton, DashboardSkeleton } from '../../ui';
import { useResponsive } from '../../../hooks/useResponsive';
import { useKeyboardNavigation } from '../../../hooks/useKeyboardNavigation';
import { useTeam } from '../../../contexts/TeamContext';
import { dashboardApi, DashboardData, DashboardMetrics } from '../../../services/dashboardApi';
import MonitoringSessionControl from '../MonitoringSessionControl';

interface DashboardContentProps {
  /** Optional className for custom styling */
  className?: string;
  /** Loading state for the dashboard */
  isLoading?: boolean;
  /** Error state for the dashboard */
  error?: string | null;
}

/**
 * DashboardContent Component
 * 
 * Primary content area for the dashboard containing:
 * - Key metrics overview cards
 * - System status indicators
 * - Charts and graphs (placeholders)
 * - Recent activity feed
 * - Alert summaries
 * 
 * Features:
 * - Responsive grid layout
 * - Loading states and skeleton screens
 * - Accessibility compliance (WCAG 2.1)
 * - Dark mode support
 * - Mobile-optimized layout
 * 
 * @param className - Optional CSS classes for custom styling
 */
const DashboardContentComponent: React.FC<DashboardContentProps> = ({
  className = '',
  isLoading = false,
  error = null,
}) => {
  const { isMobile } = useResponsive();
  const { state: teamState } = useTeam();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  /**
   * Fetch dashboard data for current team
   */
  const fetchDashboardData = useCallback(async () => {
    if (!teamState.currentTeam) {
      setDashboardLoading(false);
      return;
    }

    try {
      setDashboardLoading(true);
      setDashboardError(null);
      
      const data = await dashboardApi.getDashboardData({
        teamId: teamState.currentTeam.id,
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
          end: new Date().toISOString(),
        },
      });
      
      setDashboardData(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setDashboardError(error instanceof Error ? error.message : 'Failed to load dashboard data');
    } finally {
      setDashboardLoading(false);
    }
  }, [teamState.currentTeam]);

  /**
   * Handle data refresh for monitoring session
   */
  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await fetchDashboardData();
    } catch (error) {
      console.error('Failed to refresh dashboard data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchDashboardData]);

  /**
   * Handle manual refresh button
   */
  const handleManualRefresh = useCallback(async () => {
    await handleRefresh();
  }, [handleRefresh]);

  /**
   * Format last refresh time
   */
  const formatLastRefresh = useCallback((date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }
  }, []);

  /**
   * Fetch data when team changes
   */
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Keyboard navigation setup
  const { containerRef } = useKeyboardNavigation({
    enableArrowKeys: true,
    shortcuts: {
      'r': handleManualRefresh,
      'Ctrl+r': handleManualRefresh,
      'f': () => {
        // Focus search or filter
        const searchInput = document.querySelector('input[type="search"]') as HTMLElement;
        if (searchInput) searchInput.focus();
      },
    },
  });

  // Show loading skeleton during initial load or team loading
  if (isLoading || teamState.isLoading || dashboardLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <DashboardSkeleton />
      </div>
    );
  }

  // Show error state (prioritize dashboard errors, then fallback to prop errors)
  const displayError = dashboardError || teamState.error || error;
  if (displayError) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Dashboard Error
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{displayError}</p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="bg-red-100 dark:bg-red-800 px-3 py-2 rounded-md text-sm font-medium text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-700 disabled:opacity-50"
                >
                  {isRefreshing ? 'Retrying...' : 'Try Again'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef as React.RefObject<HTMLDivElement>} className={`space-y-6 ${className}`}>
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate">
            {teamState.currentTeam 
              ? `${teamState.currentTeam.display_name || teamState.currentTeam.name} Dashboard`
              : 'Dashboard Overview'
            }
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {teamState.currentTeam 
              ? `Monitor ${teamState.currentTeam.display_name || teamState.currentTeam.name}'s DevOps infrastructure and pipeline status`
              : 'Monitor your DevOps infrastructure and pipeline status'
            }
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <div className="flex flex-col items-end space-y-1">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefreshing ? (
                <svg className="-ml-1 mr-2 h-5 w-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="-ml-1 mr-2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Last updated: {formatLastRefresh(lastRefresh)}
            </span>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <MetricCardGrid columns={{ sm: 1, md: 2, lg: 4 }} gap="md" className="mb-8">
        {/* Pipeline Status Card */}
        <MetricCard
          title="Successful Pipelines"
          value={dashboardData 
            ? `${dashboardData.metrics.pipelines.successful}/${dashboardData.metrics.pipelines.total}`
            : "24/26"
          }
          trend={dashboardData?.metrics.pipelines.trend || {
            value: "+12%",
            direction: "up",
            label: "from last week"
          }}
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          }
        />

        {/* Deployment Status Card */}
        <MetricCard
          title="Active Deployments"
          value={dashboardData?.metrics.deployments.active.toString() || "8"}
          context={dashboardData 
            ? `${dashboardData.metrics.deployments.pending} pending review`
            : "2 pending review"
          }
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          }
        />

        {/* System Health Card */}
        <MetricCard
          title="System Health"
          value={dashboardData 
            ? `${dashboardData.metrics.systemHealth.percentage}%`
            : "96.2%"
          }
          context={dashboardData 
            ? `${dashboardData.metrics.systemHealth.issues} ${dashboardData.metrics.systemHealth.issues === 1 ? 'issue' : 'issues'} ${dashboardData.metrics.systemHealth.issues > 0 ? 'need attention' : ''}`
            : "1 warning needs attention"
          }
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          }
        />

        {/* Alert Status Card */}
        <MetricCard
          title="Active Alerts"
          value={dashboardData?.metrics.alerts.total.toString() || "3"}
          context={dashboardData 
            ? `${dashboardData.metrics.alerts.critical} critical require action`
            : "2 critical require action"
          }
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          }
        />
      </MetricCardGrid>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Recent Activity
              </h3>
              <div className="mt-6 flow-root">
                {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
                  <ul className="-mb-8 space-y-6">
                    {dashboardData.recentActivity.slice(0, 5).map((activity, index) => {
                      const isLast = index === Math.min(dashboardData.recentActivity.length - 1, 4);
                      const statusColor = {
                        success: 'bg-green-500',
                        warning: 'bg-yellow-500',
                        error: 'bg-red-500',
                        info: 'bg-blue-500',
                      }[activity.status] || 'bg-gray-500';

                      const statusIcon = {
                        success: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />,
                        warning: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />,
                        error: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />,
                        info: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
                      }[activity.status];

                      return (
                        <li key={activity.id} className="relative">
                          {!isLast && (
                            <div className="absolute top-8 left-4 w-px h-6 bg-gray-200 dark:bg-gray-600" />
                          )}
                          <div className="relative flex items-start space-x-3">
                            <div className="relative">
                              <div className={`h-8 w-8 ${statusColor} rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-800`}>
                                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  {statusIcon}
                                </svg>
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {activity.title}
                                  </span>{' '}
                                  {activity.description}
                                </div>
                                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(activity.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="text-center py-8">
                    <svg className="h-8 w-8 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Team activity will appear here as it happens
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-6">
                <a 
                  href="#" 
                  className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  View all activity
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - System Status and Session Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Monitoring Session Control */}
          <MonitoringSessionControl onRefresh={handleRefresh} />

          {/* System Status */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                System Status
              </h3>
              <div className="mt-6 space-y-4">
                {dashboardData?.systemStatus && dashboardData.systemStatus.length > 0 ? (
                  dashboardData.systemStatus.map((system) => {
                    const statusColor = {
                      operational: 'bg-green-400',
                      degraded: 'bg-yellow-400',
                      down: 'bg-red-400',
                      maintenance: 'bg-blue-400',
                    }[system.status] || 'bg-gray-400';

                    const statusText = {
                      operational: 'Operational',
                      degraded: 'Degraded',
                      down: 'Down',
                      maintenance: 'Maintenance',
                    }[system.status] || system.status;

                    return (
                      <div key={system.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`h-2 w-2 ${statusColor} rounded-full`}></div>
                          <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{system.name}</span>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{statusText}</span>
                      </div>
                    );
                  })
                ) : (
                  // Fallback static data when no team data is available
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">API Gateway</span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Operational</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Database</span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Operational</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-2 w-2 bg-yellow-400 rounded-full"></div>
                        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Cache Layer</span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Degraded</span>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-6">
                <a 
                  href="#" 
                  className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  View status page
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Memoized DashboardContent for performance optimization
 */
export const DashboardContent = React.memo(DashboardContentComponent);

export default DashboardContent; 