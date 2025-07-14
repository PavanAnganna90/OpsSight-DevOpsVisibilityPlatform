'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLiveMetrics, fetchEvents } from '../../services/dashboardApi';
import { useSettings } from '../../contexts/SettingsContext';
import { trackEvent } from '../../utils/analytics';
import EmptyState from '../ui/EmptyState';

export default function CommandCenterPanel() {
  const { panelVisibility, refreshInterval } = useSettings();
  const {
    data: liveMetrics,
    isLoading: isLoadingMetrics,
    error: errorMetrics,
    refetch: refetchMetrics
  } = useQuery({ queryKey: ['liveMetrics'], queryFn: fetchLiveMetrics });
  const {
    data: events,
    isLoading: isLoadingEvents,
    error: errorEvents,
    refetch: refetchEvents
  } = useQuery({ queryKey: ['events'], queryFn: fetchEvents });

  // Hide panel if not visible
  if (!panelVisibility.commandCenter) return null;

  // Auto-refresh logic
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        trackEvent('auto-refresh', { panel: 'CommandCenter' });
        refetchMetrics();
        refetchEvents();
      }, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, refetchMetrics, refetchEvents]);

  const handleRefresh = async () => {
    trackEvent('refresh', { panel: 'CommandCenter' });
    await Promise.all([refetchMetrics(), refetchEvents()]);
  };

  if (isLoadingMetrics || isLoadingEvents) {
    return (
      <section className="bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-lg p-6 flex flex-col gap-6 min-h-[320px] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-2" aria-label="Loading command center" />
        <span className="text-gray-500">Loading command center...</span>
      </section>
    );
  }

  if (errorMetrics || errorEvents) {
    trackEvent('error', { panel: 'CommandCenter', error: String(errorMetrics || errorEvents) });
    return (
      <section className="bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-lg p-6 flex flex-col gap-6 min-h-[320px] items-center justify-center">
        <EmptyState
          illustration="mascot"
          title="Error Loading Data"
          description="We couldn't load command center data. Please try again."
          action={{ label: 'Retry', onClick: handleRefresh }}
        />
      </section>
    );
  }

  // Render live metrics and events
  return (
    <section className="bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-lg p-6 flex flex-col gap-6 relative overflow-hidden min-h-[320px]">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Live Metrics & Events</div>
        <div className="flex items-center gap-2">
          {refreshInterval > 0 && (
            <span className="text-xs text-blue-400" title="Auto-refresh enabled">
              Auto-refresh: {refreshInterval}s
            </span>
          )}
          <button
            onClick={handleRefresh}
            className="px-3 py-1 rounded bg-blue-500 text-white font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          >
            Refresh
          </button>
        </div>
      </div>
      {/* Live Metrics */}
      <div className="flex flex-col gap-2">
        <div className="font-medium">CPU Usage: <span className="text-blue-600">{liveMetrics?.cpu ?? '--'}%</span></div>
        <div className="font-medium">Memory Usage: <span className="text-blue-600">{liveMetrics?.memory ?? '--'}%</span></div>
        <div className="font-medium mt-2">Deployments</div>
        <ul className="text-sm text-gray-700 dark:text-gray-200">
          {liveMetrics?.deployments?.length ? (
            liveMetrics.deployments.map((d: any) => (
              <li key={d.id}>
                {d.service}: <span className="font-semibold">{d.status}</span> <span className="text-xs text-gray-400">({d.timestamp})</span>
              </li>
            ))
          ) : (
            <li>No deployments</li>
          )}
        </ul>
        <div className="font-medium mt-2">Active Alerts: <span className="text-red-600">{liveMetrics?.alerts ?? 0}</span></div>
      </div>
      {/* Events Feed */}
      <div className="mt-4">
        <div className="font-medium mb-1">Events Feed</div>
        <ul className="text-sm text-gray-700 dark:text-gray-200">
          {events?.length ? (
            events.map((e: any) => (
              <li key={e.id}>
                <span className="font-semibold">[{e.type}]</span> {e.message} <span className="text-xs text-gray-400">({e.timestamp})</span>
              </li>
            ))
          ) : (
            <li>No events</li>
          )}
        </ul>
      </div>
    </section>
  );
} 