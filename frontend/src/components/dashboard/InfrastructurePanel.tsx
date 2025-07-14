import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchInfrastructure, restartResource, deleteResource } from '../../services/infrastructureApi';
import { useSettings } from '../../contexts/SettingsContext';
import { useInfrastructurePermissions } from '../../hooks/usePermissions';
import { PermissionGuard } from '../rbac/PermissionGuard';
import { trackEvent } from '../../utils/analytics';
import { logAuditEvent } from '../../services/auditLogApi';
import EmptyState from '../ui/EmptyState';

export default function InfrastructurePanel() {
  const { panelVisibility } = useSettings();
  const queryClient = useQueryClient();
  const infraPerms = useInfrastructurePermissions();
  const { data: resources, isLoading, error, refetch } = useQuery({ 
    queryKey: ['infrastructure'], 
    queryFn: fetchInfrastructure,
    enabled: infraPerms.canViewInfrastructure
  });

  const restartMutation = useMutation({
    mutationFn: restartResource,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['infrastructure'] })
  });
  const deleteMutation = useMutation({
    mutationFn: deleteResource,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['infrastructure'] })
  });

  if (!panelVisibility.infrastructure) return null;
  
  // Check permissions first
  if (!infraPerms.canViewInfrastructure) return null;

  const handleRestart = async (id: number) => {
    trackEvent('restart_resource', { resourceId: id });
    await logAuditEvent('restart_resource', 'admin', { resourceId: id });
    restartMutation.mutate(id);
  };
  const handleDelete = async (id: number) => {
    trackEvent('delete_resource', { resourceId: id });
    await logAuditEvent('delete_resource', 'admin', { resourceId: id });
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <section className="bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-lg p-6 flex flex-col gap-6 min-h-[320px] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-2" aria-label="Loading infrastructure" />
        <span className="text-gray-500">Loading infrastructure...</span>
      </section>
    );
  }
  if (error) {
    trackEvent('error', { panel: 'Infrastructure', error: String(error) });
    return (
      <section className="bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-lg p-6 flex flex-col gap-6 min-h-[320px] items-center justify-center">
        <EmptyState
          illustration="mascot"
          title="Error Loading Infrastructure"
          description="We couldn't load infrastructure. Please try again."
          action={{ label: 'Retry', onClick: refetch }}
        />
      </section>
    );
  }
  if (!resources?.length) {
    return (
      <section className="bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-lg p-6 flex flex-col gap-6 min-h-[320px] items-center justify-center">
        <EmptyState
          illustration="mascot"
          title="No Infrastructure"
          description="No resources found."
          action={{ label: 'Refresh', onClick: refetch }}
        />
      </section>
    );
  }
  return (
    <section className="bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-lg p-6 flex flex-col gap-6 relative overflow-hidden min-h-[320px]">
      <div className="font-medium mb-2">Infrastructure Resources</div>
      <ul className="space-y-3">
        {resources.map((res: any) => (
          <li key={res.id} className="flex flex-col md:flex-row md:items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex-1">
              <div className="font-semibold text-blue-600">{res.name} ({res.type})</div>
              <div className="text-gray-800 dark:text-gray-100">Region: {res.region} | Status: {res.status}</div>
              <div className="text-xs text-gray-400">Cost: ${res.cost} | Last updated: {res.last_updated}</div>
            </div>
            <div className="flex gap-2 mt-2 md:mt-0">
              <PermissionGuard permission="manage_infrastructure">
                <button
                  onClick={() => handleRestart(res.id)}
                  className="px-3 py-1 rounded bg-yellow-600 text-white font-medium hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
                  aria-label={`Restart resource ${res.id}`}
                >
                  Restart
                </button>
              </PermissionGuard>
              <PermissionGuard permission="manage_infrastructure">
                <button
                  onClick={() => handleDelete(res.id)}
                  className="px-3 py-1 rounded bg-red-600 text-white font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
                  aria-label={`Delete resource ${res.id}`}
                >
                  Delete
                </button>
              </PermissionGuard>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
} 