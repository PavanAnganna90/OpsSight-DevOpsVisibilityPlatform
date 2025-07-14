/**
 * Alert Management Hooks
 * 
 * Custom React hooks for managing alert state and API calls.
 * Provides comprehensive alert management functionality.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';

// Mock API functions (replace with actual API calls)
const alertApi = {
  // Get alert metrics and dashboard data
  getAlertMetrics: async (timeRange: string = '24h') => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      total: 47,
      active: 12,
      critical: 3,
      acknowledged: 8,
      resolved: 24,
      avgResolutionTime: 18.5,
      trends: {
        daily: [
          { date: '2023-01-10', count: 15, severity: { critical: 2, high: 4, medium: 6, low: 3 } },
          { date: '2023-01-11', count: 12, severity: { critical: 1, high: 3, medium: 5, low: 3 } },
          { date: '2023-01-12', count: 18, severity: { critical: 3, high: 5, medium: 7, low: 3 } },
          { date: '2023-01-13', count: 9, severity: { critical: 1, high: 2, medium: 4, low: 2 } },
          { date: '2023-01-14', count: 22, severity: { critical: 4, high: 6, medium: 8, low: 4 } },
          { date: '2023-01-15', count: 11, severity: { critical: 1, high: 3, medium: 5, low: 2 } },
          { date: '2023-01-16', count: 13, severity: { critical: 2, high: 3, medium: 6, low: 2 } }
        ]
      },
      topSources: [
        { source: 'kubernetes', count: 15, severity: 'critical' },
        { source: 'database', count: 12, severity: 'high' },
        { source: 'application', count: 8, severity: 'medium' },
        { source: 'network', count: 6, severity: 'high' },
        { source: 'storage', count: 4, severity: 'medium' }
      ],
      recentAlerts: [
        {
          id: '1',
          title: 'Database Connection Pool Exhausted',
          severity: 'critical',
          status: 'active',
          timestamp: '2023-01-16T10:30:00Z',
          source: 'database'
        },
        {
          id: '2',
          title: 'High CPU Usage on Node 3',
          severity: 'high',
          status: 'acknowledged',
          timestamp: '2023-01-16T10:15:00Z',
          source: 'kubernetes'
        },
        {
          id: '3',
          title: 'SSL Certificate Expiring Soon',
          severity: 'medium',
          status: 'active',
          timestamp: '2023-01-16T09:45:00Z',
          source: 'security'
        }
      ]
    };
  },

  // Get alert rules
  getAlertRules: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return [
      {
        id: 'rule_1',
        name: 'Database Connection Alert',
        enabled: true,
        conditions: 'db_connections > 95%',
        severity: 'critical',
        triggerCount: 8,
        lastTriggered: '2023-01-16T10:30:00Z'
      },
      {
        id: 'rule_2',
        name: 'High CPU Usage',
        enabled: true,
        conditions: 'cpu_usage > 80% for 5m',
        severity: 'high',
        triggerCount: 23,
        lastTriggered: '2023-01-16T10:15:00Z'
      },
      {
        id: 'rule_3',
        name: 'SSL Certificate Expiry',
        enabled: true,
        conditions: 'ssl_expiry < 30 days',
        severity: 'medium',
        triggerCount: 3,
        lastTriggered: '2023-01-16T09:45:00Z'
      }
    ];
  },

  // Get system health
  getSystemHealth: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      overall: 'warning' as const,
      components: [
        { name: 'Web Services', status: 'healthy' as const, lastCheck: '2023-01-16T10:30:00Z', alertCount: 0 },
        { name: 'Database', status: 'critical' as const, lastCheck: '2023-01-16T10:30:00Z', alertCount: 3 },
        { name: 'Cache Layer', status: 'healthy' as const, lastCheck: '2023-01-16T10:29:00Z', alertCount: 0 },
        { name: 'Message Queue', status: 'warning' as const, lastCheck: '2023-01-16T10:28:00Z', alertCount: 1 },
        { name: 'File Storage', status: 'healthy' as const, lastCheck: '2023-01-16T10:27:00Z', alertCount: 0 },
        { name: 'API Gateway', status: 'healthy' as const, lastCheck: '2023-01-16T10:26:00Z', alertCount: 0 }
      ],
      sla: {
        current: 98.2,
        target: 99.5,
        trend: 'down' as const
      }
    };
  },

  // Alert actions
  acknowledgeAlert: async (alertId: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  },

  resolveAlert: async (alertId: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  },

  silenceAlert: async (alertId: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  },

  // Bulk actions
  bulkAction: async (action: string, alertIds: string[]) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: alertIds.length, failed: 0 };
  },

  // Rule management
  toggleRule: async (ruleId: string) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: true };
  },

  createRule: async (rule: any) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { id: `rule_${Date.now()}`, ...rule };
  },

  updateRule: async (ruleId: string, updates: any) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { id: ruleId, ...updates };
  },

  deleteRule: async (ruleId: string) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: true };
  }
};

// Query Keys
export const ALERT_QUERY_KEYS = {
  metrics: ['alerts', 'metrics'] as const,
  rules: ['alerts', 'rules'] as const,
  systemHealth: ['alerts', 'system-health'] as const,
  recentAlerts: ['alerts', 'recent'] as const,
  alertTrends: ['alerts', 'trends'] as const,
};

// Hook for alert metrics
export const useAlertMetrics = (timeRange: string = '24h') => {
  return useQuery({
    queryKey: [...ALERT_QUERY_KEYS.metrics, timeRange],
    queryFn: () => alertApi.getAlertMetrics(timeRange),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 30000,
  });
};

// Hook for alert rules
export const useAlertRules = () => {
  return useQuery({
    queryKey: ALERT_QUERY_KEYS.rules,
    queryFn: alertApi.getAlertRules,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 60000,
  });
};

// Hook for system health
export const useSystemHealth = () => {
  return useQuery({
    queryKey: ALERT_QUERY_KEYS.systemHealth,
    queryFn: alertApi.getSystemHealth,
    refetchInterval: 30000,
    staleTime: 30000,
  });
};

// Hook for acknowledging alerts
export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: alertApi.acknowledgeAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEYS.metrics });
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEYS.systemHealth });
      showToast('Alert acknowledged successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to acknowledge alert:', error);
      showToast('Failed to acknowledge alert', 'error');
    },
  });
};

// Hook for resolving alerts
export const useResolveAlert = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: alertApi.resolveAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEYS.metrics });
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEYS.systemHealth });
      showToast('Alert resolved successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to resolve alert:', error);
      showToast('Failed to resolve alert', 'error');
    },
  });
};

// Hook for silencing alerts
export const useSilenceAlert = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: alertApi.silenceAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEYS.metrics });
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEYS.systemHealth });
      showToast('Alert silenced successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to silence alert:', error);
      showToast('Failed to silence alert', 'error');
    },
  });
};

// Hook for bulk actions
export const useBulkAlertAction = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ action, alertIds }: { action: string; alertIds: string[] }) =>
      alertApi.bulkAction(action, alertIds),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEYS.metrics });
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEYS.systemHealth });
      
      if (data.success > 0) {
        showToast(`${data.success} alerts ${variables.action}d successfully`, 'success');
      }
      
      if (data.failed > 0) {
        showToast(`${data.failed} alerts failed to ${variables.action}`, 'error');
      }
    },
    onError: (error, variables) => {
      console.error(`Failed to ${variables.action} alerts:`, error);
      showToast(`Failed to ${variables.action} alerts`, 'error');
    },
  });
};

// Hook for toggling alert rules
export const useToggleAlertRule = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: alertApi.toggleRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEYS.rules });
      showToast('Alert rule updated successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to toggle alert rule:', error);
      showToast('Failed to update alert rule', 'error');
    },
  });
};

// Hook for creating alert rules
export const useCreateAlertRule = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: alertApi.createRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEYS.rules });
      showToast('Alert rule created successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to create alert rule:', error);
      showToast('Failed to create alert rule', 'error');
    },
  });
};

// Hook for updating alert rules
export const useUpdateAlertRule = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ ruleId, updates }: { ruleId: string; updates: any }) =>
      alertApi.updateRule(ruleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEYS.rules });
      showToast('Alert rule updated successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to update alert rule:', error);
      showToast('Failed to update alert rule', 'error');
    },
  });
};

// Hook for deleting alert rules
export const useDeleteAlertRule = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: alertApi.deleteRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEYS.rules });
      showToast('Alert rule deleted successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to delete alert rule:', error);
      showToast('Failed to delete alert rule', 'error');
    },
  });
};

// Utility hook for real-time alert updates
export const useAlertRealTime = (enabled: boolean = true) => {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      // Silently refresh alert data
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEYS.metrics });
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEYS.systemHealth });
    }, 30000);

    return () => clearInterval(interval);
  }, [enabled, queryClient]);
};

// Combined hook for alert dashboard
export const useAlertDashboard = (timeRange: string = '24h') => {
  const metrics = useAlertMetrics(timeRange);
  const rules = useAlertRules();
  const systemHealth = useSystemHealth();
  
  return {
    metrics,
    rules,
    systemHealth,
    isLoading: metrics.isLoading || rules.isLoading || systemHealth.isLoading,
    error: metrics.error || rules.error || systemHealth.error,
    refetch: () => {
      metrics.refetch();
      rules.refetch();
      systemHealth.refetch();
    },
  };
};