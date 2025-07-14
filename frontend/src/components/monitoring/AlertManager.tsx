/**
 * Alert Manager Component
 * 
 * Provides real-time alerting and notification management for monitoring events.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useMonitoring } from '@/components/providers/MonitoringProvider';

interface Alert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  source: string;
  metadata?: Record<string, any>;
  acknowledged: boolean;
  resolved: boolean;
  assignedTo?: string;
  resolvedBy?: string;
  resolvedAt?: number;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  condition: string;
  threshold: number;
  operator: '>' | '<' | '=' | '!=' | '>=' | '<=';
  metric: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  channels: string[];
  cooldown: number; // minutes
  lastTriggered?: number;
}

const AlertManager: React.FC = () => {
  const { trackEvent } = useMonitoring();
  const { showToast } = useToast();
  
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'critical'>('unresolved');

  // Initialize with mock data
  useEffect(() => {
    const mockAlerts: Alert[] = [
      {
        id: 'alert_1',
        level: 'critical',
        title: 'High Memory Usage',
        message: 'Memory usage has exceeded 90% for more than 5 minutes',
        timestamp: Date.now() - 300000, // 5 minutes ago
        source: 'system_monitor',
        metadata: { server: 'web-01', usage: '94%' },
        acknowledged: false,
        resolved: false,
      },
      {
        id: 'alert_2',
        level: 'warning',
        title: 'API Response Time',
        message: 'Average API response time above 2 seconds',
        timestamp: Date.now() - 600000, // 10 minutes ago
        source: 'api_monitor',
        metadata: { endpoint: '/api/v1/users', responseTime: '2.3s' },
        acknowledged: true,
        resolved: false,
      },
      {
        id: 'alert_3',
        level: 'error',
        title: 'Database Connection Failed',
        message: 'Unable to connect to primary database',
        timestamp: Date.now() - 900000, // 15 minutes ago
        source: 'database_monitor',
        metadata: { host: 'db-primary.example.com', error: 'Connection timeout' },
        acknowledged: true,
        resolved: true,
        resolvedBy: 'admin@example.com',
        resolvedAt: Date.now() - 300000,
      },
    ];

    const mockRules: AlertRule[] = [
      {
        id: 'rule_1',
        name: 'High Memory Usage',
        description: 'Alert when memory usage exceeds threshold',
        enabled: true,
        condition: 'memory_usage',
        threshold: 90,
        operator: '>',
        metric: 'system.memory.usage',
        severity: 'critical',
        channels: ['email', 'slack'],
        cooldown: 30,
      },
      {
        id: 'rule_2',
        name: 'API Response Time',
        description: 'Alert when API response time is too high',
        enabled: true,
        condition: 'api_response_time',
        threshold: 2000,
        operator: '>',
        metric: 'api.response_time',
        severity: 'warning',
        channels: ['slack'],
        cooldown: 15,
      },
      {
        id: 'rule_3',
        name: 'Error Rate',
        description: 'Alert when error rate exceeds threshold',
        enabled: true,
        condition: 'error_rate',
        threshold: 5,
        operator: '>',
        metric: 'errors.rate',
        severity: 'error',
        channels: ['email', 'slack', 'webhook'],
        cooldown: 10,
      },
    ];

    setAlerts(mockAlerts);
    setAlertRules(mockRules);
    setIsLoading(false);
  }, []);

  // Filter alerts based on current filter
  const filteredAlerts = alerts.filter(alert => {
    switch (filter) {
      case 'unresolved':
        return !alert.resolved;
      case 'critical':
        return alert.level === 'critical';
      default:
        return true;
    }
  });

  // Get alert counts
  const alertCounts = {
    total: alerts.length,
    unresolved: alerts.filter(a => !a.resolved).length,
    critical: alerts.filter(a => a.level === 'critical' && !a.resolved).length,
  };

  // Handle alert actions
  const handleAcknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, acknowledged: true }
        : alert
    ));
    
    trackEvent('alert_acknowledged', { alertId });
    showToast('Alert acknowledged', 'success');
  }, [trackEvent, showToast]);

  const handleResolveAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { 
            ...alert, 
            resolved: true, 
            resolvedBy: 'current_user@example.com',
            resolvedAt: Date.now() 
          }
        : alert
    ));
    
    trackEvent('alert_resolved', { alertId });
    showToast('Alert resolved', 'success');
  }, [trackEvent, showToast]);

  const handleViewAlert = useCallback((alert: Alert) => {
    setSelectedAlert(alert);
    setShowAlertModal(true);
    trackEvent('alert_viewed', { alertId: alert.id });
  }, [trackEvent]);

  // Get badge variant for alert level
  const getAlertBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'warning';
      case 'info': return 'default';
      default: return 'secondary';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Calculate time ago
  const getTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Alert Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor and manage system alerts and notifications
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowRulesModal(true)}
            variant="outline"
            size="sm"
          >
            Manage Rules
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Alert Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Alerts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {alertCounts.total}
                </p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unresolved</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {alertCounts.unresolved}
                </p>
              </div>
              <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="h-4 w-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Critical</p>
                <p className="text-2xl font-bold text-red-600">
                  {alertCounts.critical}
                </p>
              </div>
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">Filter:</span>
        <div className="flex gap-2">
          {(['all', 'unresolved', 'critical'] as const).map(filterType => (
            <Button
              key={filterType}
              onClick={() => setFilter(filterType)}
              variant={filter === filterType ? 'default' : 'outline'}
              size="sm"
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts ({filteredAlerts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No alerts match the current filter
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    alert.resolved 
                      ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' 
                      : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant={getAlertBadgeVariant(alert.level)}>
                          {alert.level.toUpperCase()}
                        </Badge>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {alert.title}
                        </h3>
                        {alert.acknowledged && (
                          <Badge variant="secondary">Acknowledged</Badge>
                        )}
                        {alert.resolved && (
                          <Badge variant="default">Resolved</Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {alert.message}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>Source: {alert.source}</span>
                        <span>{getTimeAgo(alert.timestamp)}</span>
                        {alert.resolvedBy && (
                          <span>Resolved by: {alert.resolvedBy}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleViewAlert(alert)}
                        variant="outline"
                        size="sm"
                      >
                        View
                      </Button>
                      
                      {!alert.acknowledged && !alert.resolved && (
                        <Button
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          variant="outline"
                          size="sm"
                        >
                          Acknowledge
                        </Button>
                      )}
                      
                      {!alert.resolved && (
                        <Button
                          onClick={() => handleResolveAlert(alert.id)}
                          variant="default"
                          size="sm"
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <Modal
          isOpen={showAlertModal}
          onClose={() => setShowAlertModal(false)}
          title={selectedAlert.title}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={getAlertBadgeVariant(selectedAlert.level)}>
                {selectedAlert.level.toUpperCase()}
              </Badge>
              {selectedAlert.acknowledged && (
                <Badge variant="secondary">Acknowledged</Badge>
              )}
              {selectedAlert.resolved && (
                <Badge variant="default">Resolved</Badge>
              )}
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Message</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedAlert.message}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Source:</span>
                  <span className="font-medium">{selectedAlert.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Timestamp:</span>
                  <span className="font-medium">{formatTimestamp(selectedAlert.timestamp)}</span>
                </div>
                {selectedAlert.resolvedBy && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Resolved by:</span>
                    <span className="font-medium">{selectedAlert.resolvedBy}</span>
                  </div>
                )}
                {selectedAlert.resolvedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Resolved at:</span>
                    <span className="font-medium">{formatTimestamp(selectedAlert.resolvedAt)}</span>
                  </div>
                )}
              </div>
            </div>
            
            {selectedAlert.metadata && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Metadata</h4>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {JSON.stringify(selectedAlert.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AlertManager;