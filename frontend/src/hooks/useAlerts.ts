'use client';

import { useState, useEffect, useCallback } from 'react';
import { Alert, AlertRule, SilenceRule, Incident } from '@/types/monitoring';
import { useWebSocket } from './useRealTimeData';
import { useToast } from '@/contexts/ToastContext';

interface AlertsData {
  alerts: Alert[];
  rules: AlertRule[];
  silences: SilenceRule[];
  incidents: Incident[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    resolved: number;
  };
}

export function useAlerts() {
  const [alertsData, setAlertsData] = useState<AlertsData>({
    alerts: [],
    rules: [],
    silences: [],
    incidents: [],
    summary: {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      resolved: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  // Generate mock data
  const generateMockData = useCallback((): AlertsData => {
    const severities: Alert['severity'][] = ['critical', 'high', 'medium', 'low'];
    const statuses: Alert['status'][] = ['active', 'resolved', 'acknowledged', 'suppressed'];
    const metrics = [
      'cpu_usage_percent',
      'memory_usage_percent',
      'disk_usage_percent',
      'response_time_ms',
      'error_rate_percent',
      'request_count',
      'database_connections',
      'queue_depth'
    ];

    const alerts: Alert[] = Array.from({ length: 15 }, (_, i) => {
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const metric = metrics[Math.floor(Math.random() * metrics.length)];
      const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      
      return {
        id: `alert-${i + 1}`,
        name: `${metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Alert`,
        description: `${metric} has exceeded threshold for ${severity} severity`,
        severity,
        status,
        metric,
        condition: {
          type: 'threshold',
          operator: 'gt',
          value: Math.floor(Math.random() * 100),
          duration: ['5m', '10m', '15m', '30m'][Math.floor(Math.random() * 4)]
        },
        labels: {
          service: ['api', 'database', 'frontend', 'worker'][Math.floor(Math.random() * 4)],
          environment: ['production', 'staging'][Math.floor(Math.random() * 2)],
          region: ['us-east-1', 'us-west-2', 'eu-west-1'][Math.floor(Math.random() * 3)]
        },
        annotations: {
          summary: `High ${metric} detected`,
          description: `The ${metric} has been above threshold for ${Math.floor(Math.random() * 30)} minutes`
        },
        createdAt: createdAt.toISOString(),
        updatedAt: new Date(createdAt.getTime() + Math.random() * 60 * 60 * 1000).toISOString(),
        firedAt: status === 'active' ? createdAt.toISOString() : undefined,
        resolvedAt: status === 'resolved' ? new Date().toISOString() : undefined,
        acknowledgedAt: status === 'acknowledged' ? new Date().toISOString() : undefined,
        acknowledgedBy: status === 'acknowledged' ? 'admin@opssight.com' : undefined,
        notifications: []
      };
    });

    const rules: AlertRule[] = Array.from({ length: 8 }, (_, i) => {
      const metric = metrics[i % metrics.length];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      
      return {
        id: `rule-${i + 1}`,
        name: `${metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Rule`,
        description: `Monitor ${metric} and alert when threshold is exceeded`,
        metric,
        condition: {
          type: 'threshold',
          operator: 'gt',
          value: 80 + Math.floor(Math.random() * 20),
          duration: '5m'
        },
        severity,
        labels: {
          team: 'platform',
          priority: severity
        },
        annotations: {
          runbook: `https://runbooks.opssight.com/${metric}`,
          dashboard: `https://grafana.opssight.com/d/${metric}`
        },
        evaluationInterval: '30s',
        for: '5m',
        enabled: Math.random() > 0.2,
        notifications: [`channel-${Math.floor(Math.random() * 3) + 1}`],
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        lastEvaluation: {
          timestamp: new Date().toISOString(),
          status: ['ok', 'firing', 'pending'][Math.floor(Math.random() * 3)] as any,
          value: Math.floor(Math.random() * 100)
        }
      };
    });

    const silences: SilenceRule[] = Array.from({ length: 3 }, (_, i) => ({
      id: `silence-${i + 1}`,
      comment: `Maintenance window for ${['database', 'api', 'frontend'][i]} service`,
      createdBy: 'admin@opssight.com',
      startsAt: new Date(Date.now() + i * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(Date.now() + (i + 2) * 60 * 60 * 1000).toISOString(),
      matchers: [
        {
          name: 'service',
          value: ['database', 'api', 'frontend'][i],
          isRegex: false
        }
      ],
      status: {
        state: 'pending'
      }
    }));

    const incidents: Incident[] = Array.from({ length: 5 }, (_, i) => {
      const severity = severities[Math.floor(Math.random() * 3)]; // More critical incidents
      const status = ['open', 'investigating', 'identified', 'monitoring', 'resolved'][Math.floor(Math.random() * 5)] as any;
      const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      
      return {
        id: `incident-${i + 1}`,
        title: `${severity.toUpperCase()}: ${['Database Connection Issues', 'API Response Time Degradation', 'Frontend Build Failures', 'Memory Leak in Worker Service', 'Network Connectivity Problems'][i]}`,
        description: `Investigation in progress for ${severity} severity incident affecting multiple services`,
        severity,
        status,
        alerts: alerts.slice(i * 2, (i + 1) * 2),
        timeline: [
          {
            id: `event-${i}-1`,
            timestamp: createdAt.toISOString(),
            type: 'created',
            user: 'system',
            data: { message: 'Incident created automatically' }
          },
          {
            id: `event-${i}-2`,
            timestamp: new Date(createdAt.getTime() + 5 * 60 * 1000).toISOString(),
            type: 'status_change',
            user: 'admin@opssight.com',
            data: { from: 'open', to: 'investigating' }
          }
        ],
        affectedServices: ['api', 'database', 'frontend'].slice(0, Math.floor(Math.random() * 3) + 1),
        assignees: ['admin@opssight.com', 'engineer@opssight.com'].slice(0, Math.floor(Math.random() * 2) + 1),
        createdAt: createdAt.toISOString(),
        updatedAt: new Date().toISOString(),
        resolvedAt: status === 'resolved' ? new Date().toISOString() : undefined
      };
    });

    // Calculate summary
    const summary = alerts.reduce((acc, alert) => {
      acc.total++;
      acc[alert.severity]++;
      if (alert.status === 'resolved') acc.resolved++;
      return acc;
    }, {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      resolved: 0
    });

    return { alerts, rules, silences, incidents, summary };
  }, []);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        const data = generateMockData();
        setAlertsData(data);
        setError(null);
      } catch (err) {
        setError('Failed to load alerts data');
        console.error('Error loading alerts:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [generateMockData]);

  // WebSocket for real-time updates
  useWebSocket({
    onMessage: useCallback((message: any) => {
      if (message.type === 'alert_update') {
        setAlertsData(prev => {
          const updatedAlerts = prev.alerts.map(alert => 
            alert.id === message.alert.id ? { ...alert, ...message.alert } : alert
          );
          
          // Recalculate summary
          const summary = updatedAlerts.reduce((acc, alert) => {
            acc.total++;
            acc[alert.severity]++;
            if (alert.status === 'resolved') acc.resolved++;
            return acc;
          }, {
            total: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            resolved: 0
          });

          return {
            ...prev,
            alerts: updatedAlerts,
            summary
          };
        });

        // Show notification for new alerts
        if (message.alert.status === 'active' && message.isNew) {
          addToast({
            type: message.alert.severity === 'critical' ? 'error' : 'warning',
            title: `${message.alert.severity.toUpperCase()} Alert`,
            description: message.alert.name,
            duration: message.alert.severity === 'critical' ? 0 : 8000
          });
        }
      }
    }, [addToast])
  });

  // Action functions
  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAlertsData(prev => ({
        ...prev,
        alerts: prev.alerts.map(alert =>
          alert.id === alertId
            ? {
                ...alert,
                status: 'acknowledged',
                acknowledgedAt: new Date().toISOString(),
                acknowledgedBy: 'current-user@opssight.com'
              }
            : alert
        )
      }));

      addToast({
        type: 'success',
        title: 'Alert Acknowledged',
        description: 'Alert has been acknowledged successfully',
        duration: 3000
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Acknowledge',
        description: 'Could not acknowledge alert',
        duration: 5000
      });
    }
  }, [addToast]);

  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAlertsData(prev => ({
        ...prev,
        alerts: prev.alerts.map(alert =>
          alert.id === alertId
            ? {
                ...alert,
                status: 'resolved',
                resolvedAt: new Date().toISOString()
              }
            : alert
        )
      }));

      addToast({
        type: 'success',
        title: 'Alert Resolved',
        description: 'Alert has been resolved successfully',
        duration: 3000
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Resolve',
        description: 'Could not resolve alert',
        duration: 5000
      });
    }
  }, [addToast]);

  const createSilence = useCallback(async (silence: Omit<SilenceRule, 'id'>) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newSilence: SilenceRule = {
        ...silence,
        id: `silence-${Date.now()}`
      };

      setAlertsData(prev => ({
        ...prev,
        silences: [...prev.silences, newSilence]
      }));

      addToast({
        type: 'success',
        title: 'Silence Created',
        description: 'Alert silence has been created successfully',
        duration: 3000
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Create Silence',
        description: 'Could not create alert silence',
        duration: 5000
      });
    }
  }, [addToast]);

  const testNotificationChannel = useCallback(async (channelId: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addToast({
        type: 'success',
        title: 'Test Notification Sent',
        description: 'Test notification sent successfully',
        duration: 3000
      });
      
      return { success: true };
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Test Failed',
        description: 'Failed to send test notification',
        duration: 5000
      });
      
      return { success: false, error: 'Network error' };
    }
  }, [addToast]);

  return {
    alertsData,
    loading,
    error,
    acknowledgeAlert,
    resolveAlert,
    createSilence,
    testNotificationChannel,
    refreshData: () => {
      const data = generateMockData();
      setAlertsData(data);
    }
  };
}