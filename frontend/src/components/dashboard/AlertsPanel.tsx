import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAlerts, acknowledgeAlert, resolveAlert } from '../../services/alertsApi';
import { useSettings } from '../../contexts/SettingsContext';
import { trackEvent } from '../../utils/analytics';
import { logAuditEvent } from '../../services/auditLogApi';
import EmptyState from '../ui/EmptyState';

export default function AlertsPanel() {
  const { panelVisibility } = useSettings();
  const queryClient = useQueryClient();
  const { data: alerts, isLoading, error, refetch } = useQuery({ queryKey: ['alerts'], queryFn: fetchAlerts });

  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] })
  });
  const resolveMutation = useMutation({
    mutationFn: resolveAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] })
  });

  if (!panelVisibility.alerts) return null;

  const handleAcknowledge = async (id: number) => {
    trackEvent('acknowledge_alert', { alertId: id });
    await logAuditEvent('acknowledge_alert', 'admin', { alertId: id });
    acknowledgeMutation.mutate(id);
  };
  const handleResolve = async (id: number) => {
    trackEvent('resolve_alert', { alertId: id });
    await logAuditEvent('resolve_alert', 'admin', { alertId: id });
    resolveMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <section className="bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-lg p-6 flex flex-col gap-6 min-h-[320px] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-2" aria-label="Loading alerts" />
        <span className="text-gray-500">Loading alerts...</span>
      </section>
    );
  }
  if (error) {
    trackEvent('error', { panel: 'Alerts', error: String(error) });
    return (
      <section className="bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-lg p-6 flex flex-col gap-6 min-h-[320px] items-center justify-center">
        <EmptyState
          illustration="mascot"
          title="Error Loading Alerts"
          description="We couldn't load alerts. Please try again."
          action={{ label: 'Retry', onClick: refetch }}
        />
      </section>
    );
  }
  if (!alerts?.length) {
    return (
      <section className="bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-lg p-6 flex flex-col gap-6 min-h-[320px] items-center justify-center">
        <EmptyState
          illustration="mascot"
          title="No Alerts"
          description="No active alerts. Enjoy your coffee ☕"
          action={{ label: 'Refresh', onClick: refetch }}
        />
      </section>
    );
  }
  return (
    <section className="bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-lg p-6 flex flex-col gap-6 relative overflow-hidden min-h-[320px]">
      <div className="font-medium mb-2">Active Alerts</div>
      <ul className="space-y-3">
        {alerts.map((alert: any) => (
          <li key={alert.id} className="flex flex-col md:flex-row md:items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex-1">
              <div className="font-semibold text-red-600">[{alert.severity}]</div>
              <div className="text-gray-800 dark:text-gray-100">{alert.message}</div>
              <div className="text-xs text-gray-400">{alert.timestamp}</div>
            </div>
            <div className="flex gap-2 mt-2 md:mt-0">
              {alert.status === 'open' && (
                <button
                  onClick={() => handleAcknowledge(alert.id)}
                  className="px-3 py-1 rounded bg-yellow-500 text-white font-medium hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
                  aria-label={`Acknowledge alert ${alert.id}`}
                >
                  Acknowledge
                </button>
              )}
              {(alert.status === 'open' || alert.status === 'acknowledged') && (
                <button
                  onClick={() => handleResolve(alert.id)}
                  className="px-3 py-1 rounded bg-green-600 text-white font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
                  aria-label={`Resolve alert ${alert.id}`}
                >
                  Resolve
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
} 