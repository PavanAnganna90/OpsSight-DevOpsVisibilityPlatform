'use client';

import React, { useContext, useEffect, useMemo, useCallback, memo } from 'react';
import AnimatedIllustration from '../ui/AnimatedIllustration';
import StatusIndicator from '../ui/StatusIndicator';
import EmptyState from '../ui/EmptyState';
import { useSystemMetrics } from '../../hooks/useSystemMetrics';
import { trackEvent } from '../../utils/analytics';
import type { StatusType } from '../ui/StatusIndicator';
import { useSettings } from '../../contexts/SettingsContext';

interface Metric {
  id: string;
  title: string;
  status: string;
  value: string;
  detail: string;
}

/**
 * Individual metric item component - memoized for performance
 */
const MetricItem = memo<{ metric: Metric }>(({ metric }) => (
  <div key={metric.id} className="relative flex items-center gap-4 group hover:bg-blue-50 dark:hover:bg-blue-900/20 transition rounded-lg p-4">
    <AnimatedIllustration
      name={metric.id === 'cicd' ? 'pipeline' : metric.id === 'k8s' ? 'k8s' : 'cloud'}
      className="absolute right-2 bottom-2 w-20 h-20 opacity-15 pointer-events-none group-hover:scale-105 transition-transform duration-300"
      alt={metric.title}
    />
    <StatusIndicator status={metric.status as StatusType} />
    <div className="z-10">
      <div className="font-medium">{metric.title}</div>
      <div className="text-xs text-gray-500">{metric.value}</div>
      {metric.detail && <div className="text-xs text-blue-400 mt-1">{metric.detail}</div>}
    </div>
  </div>
));

MetricItem.displayName = 'MetricItem';

/**
 * Left panel component displaying system health signals.
 * Shows key metrics with color-coded status indicators.
 * Optimized with React.memo and useMemo for better performance.
 */
const SystemPulsePanelComponent: React.FC = () => {
  // const { refreshInterval } = useContext(SettingsContext) || { refreshInterval: 0 };
  const { data, isLoading, error, refetch } = useSystemMetrics();
  const [showUnhealthy, setShowUnhealthy] = React.useState(false);
  const { panelVisibility, refreshInterval } = useSettings();

  // Hide panel if not visible
  if (!panelVisibility.systemPulse) return null;

  // Memoized callback to prevent unnecessary re-renders
  const handleRefresh = useCallback(async () => {
    trackEvent('refresh', { panel: 'SystemPulse' });
    await refetch();
  }, [refetch]);

  // Auto-refresh logic with memoized dependencies
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        trackEvent('auto-refresh', { panel: 'SystemPulse' });
        refetch();
      }, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, refetch]);

  // Memoized metrics parsing
  const metrics: Metric[] = useMemo(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);
  // Memoized filtered metrics to prevent unnecessary filtering
  const filteredMetrics = useMemo(() => {
    return showUnhealthy
      ? metrics.filter(m => m.status !== 'success')
      : metrics;
  }, [metrics, showUnhealthy]);

  if (isLoading) {
    return (
      <section className="bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-lg p-6 flex flex-col gap-6 min-h-[320px] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-2" aria-label="Loading system metrics" />
        <span className="text-gray-500">Loading system metrics...</span>
      </section>
    );
  }

  if (error) {
    trackEvent('error', { panel: 'SystemPulse', error: String(error) });
    return (
      <section className="bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-lg p-6 flex flex-col gap-6 min-h-[320px] items-center justify-center">
        <EmptyState
          illustration="mascot"
          title="Error Loading Metrics"
          description="We couldn't load your system metrics. Please try again."
          action={{ label: 'Retry', onClick: handleRefresh }}
        />
      </section>
    );
  }

  return (
    <section className="bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-lg p-6 flex flex-col gap-6 relative overflow-hidden min-h-[320px]">
      {/* Panel Controls */}
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showUnhealthy}
            onChange={e => setShowUnhealthy(e.target.checked)}
            className="accent-blue-500"
            aria-label="Show only unhealthy systems"
          />
          Show only unhealthy systems
        </label>
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
      {/* Metrics or Empty State */}
      {filteredMetrics.length === 0 ? (
        <EmptyState
          illustration="mascot"
          title="No System Metrics"
          description="Everything is quiet. Enjoy your coffee ☕"
          action={{ label: 'Refresh', onClick: handleRefresh }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {filteredMetrics.map(metric => (
            <MetricItem key={metric.id} metric={metric} />
          ))}
        </div>
      )}
    </section>
  );
};

// Memoized component export with display name
const SystemPulsePanel = memo(SystemPulsePanelComponent, (prevProps, nextProps) => {
  // Custom comparison function - since this component has no props,
  // it only re-renders when internal state or context changes
  return true; // Always consider props equal since there are no props
});

SystemPulsePanel.displayName = 'SystemPulsePanel';

export default SystemPulsePanel; 