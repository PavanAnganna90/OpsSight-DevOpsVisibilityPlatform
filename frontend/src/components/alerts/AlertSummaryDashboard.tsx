/**
 * Alert Summary Dashboard Component
 * 
 * Enhanced dashboard component for comprehensive alert overview and management.
 * Provides high-level insights, trends, and quick actions for alert management.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { usePerformanceMonitoring } from '@/hooks/useMonitoring';
import AlertSummary from './AlertSummary';
import CIFailureAnalyzer from './CIFailureAnalyzer';

interface AlertMetrics {
  total: number;
  active: number;
  critical: number;
  acknowledged: number;
  resolved: number;
  avgResolutionTime: number;
  trends: {
    daily: Array<{ date: string; count: number; severity: Record<string, number> }>;
    weekly: Array<{ week: string; count: number; severity: Record<string, number> }>;
  };
  topSources: Array<{ source: string; count: number; severity: string }>;
  recentAlerts: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    timestamp: string;
    source: string;
  }>;
}

interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: string;
  severity: string;
  triggerCount: number;
  lastTriggered?: string;
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  components: Array<{
    name: string;
    status: 'healthy' | 'warning' | 'critical';
    lastCheck: string;
    alertCount: number;
  }>;
  sla: {
    current: number;
    target: number;
    trend: 'up' | 'down' | 'stable';
  };
}

const AlertSummaryDashboard: React.FC = () => {
  const { trackUserInteraction } = usePerformanceMonitoring('AlertSummaryDashboard');
  const { showToast } = useToast();
  
  const [metrics, setMetrics] = useState<AlertMetrics | null>(null);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      
      try {
        // Mock metrics data
        const mockMetrics: AlertMetrics = {
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
            ],
            weekly: [
              { week: 'Week 1', count: 85, severity: { critical: 12, high: 23, medium: 35, low: 15 } },
              { week: 'Week 2', count: 76, severity: { critical: 9, high: 19, medium: 32, low: 16 } },
              { week: 'Week 3', count: 92, severity: { critical: 14, high: 26, medium: 38, low: 14 } },
              { week: 'Week 4', count: 68, severity: { critical: 8, high: 18, medium: 28, low: 14 } }
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

        const mockRules: AlertRule[] = [
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

        const mockSystemHealth: SystemHealth = {
          overall: 'warning',
          components: [
            { name: 'Web Services', status: 'healthy', lastCheck: '2023-01-16T10:30:00Z', alertCount: 0 },
            { name: 'Database', status: 'critical', lastCheck: '2023-01-16T10:30:00Z', alertCount: 3 },
            { name: 'Cache Layer', status: 'healthy', lastCheck: '2023-01-16T10:29:00Z', alertCount: 0 },
            { name: 'Message Queue', status: 'warning', lastCheck: '2023-01-16T10:28:00Z', alertCount: 1 },
            { name: 'File Storage', status: 'healthy', lastCheck: '2023-01-16T10:27:00Z', alertCount: 0 },
            { name: 'API Gateway', status: 'healthy', lastCheck: '2023-01-16T10:26:00Z', alertCount: 0 }
          ],
          sla: {
            current: 98.2,
            target: 99.5,
            trend: 'down'
          }
        };

        setMetrics(mockMetrics);
        setRules(mockRules);
        setSystemHealth(mockSystemHealth);
        
        trackUserInteraction('view_alert_dashboard');
        
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        showToast('Failed to load dashboard data', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [trackUserInteraction, showToast, selectedTimeRange]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Reload data without showing loading state
      // In a real app, this would call loadDashboardData(false)
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    try {
      showToast(`Bulk ${action} action initiated`, 'info');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showToast(`Bulk ${action} completed successfully`, 'success');
      setShowBulkActions(false);
      
      trackUserInteraction('bulk_alert_action', { action });
      
    } catch (error) {
      console.error(`Failed to perform bulk ${action}:`, error);
      showToast(`Failed to perform bulk ${action}`, 'error');
    }
  };

  // Handle rule toggle
  const handleToggleRule = async (ruleId: string) => {
    try {
      setRules(prev => prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, enabled: !rule.enabled }
          : rule
      ));
      
      const rule = rules.find(r => r.id === ruleId);
      showToast(`Rule ${rule?.enabled ? 'disabled' : 'enabled'}`, 'success');
      
      trackUserInteraction('toggle_alert_rule', { ruleId });
      
    } catch (error) {
      console.error('Failed to toggle rule:', error);
      showToast('Failed to update rule', 'error');
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Alert Management Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor system health, manage alerts, and track performance metrics
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Time Range Selector */}
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          {/* Auto-refresh toggle */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Auto-refresh</span>
          </label>

          {/* Bulk Actions */}
          <Button
            onClick={() => setShowBulkActions(true)}
            variant="outline"
          >
            Bulk Actions
          </Button>
        </div>
      </div>

      {/* System Health Status */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              System Health Overview
              <Badge className={getStatusColor(systemHealth.overall)}>
                {systemHealth.overall}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemHealth.components.map((component, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{component.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {component.alertCount} alerts
                    </p>
                  </div>
                  <Badge className={getStatusColor(component.status)}>
                    {component.status}
                  </Badge>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  SLA Performance
                </span>
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {systemHealth.sla.current}% (Target: {systemHealth.sla.target}%)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">Alert Management</TabsTrigger>
          <TabsTrigger value="ci-failures">CI/CD Failures</TabsTrigger>
          <TabsTrigger value="rules">Alert Rules</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Alerts</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.total}</p>
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
                      <p className="text-sm text-gray-600 dark:text-gray-400">Active Alerts</p>
                      <p className="text-2xl font-bold text-red-600">{metrics.active}</p>
                    </div>
                    <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 14.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Critical Alerts</p>
                      <p className="text-2xl font-bold text-orange-600">{metrics.critical}</p>
                    </div>
                    <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <svg className="h-4 w-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Avg Resolution</p>
                      <p className="text-2xl font-bold text-green-600">{metrics.avgResolutionTime}m</p>
                    </div>
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Alerts */}
          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.recentAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{alert.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {alert.source} • {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={alert.status === 'active' ? 'destructive' : 'secondary'}>
                        {alert.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Alert Sources */}
          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle>Top Alert Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.topSources.map((source, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900 dark:text-white">{source.source}</span>
                        <Badge className={getSeverityColor(source.severity)}>
                          {source.severity}
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {source.count} alerts
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Alert Management Tab */}
        <TabsContent value="alerts">
          <AlertSummary showMetrics={false} />
        </TabsContent>

        {/* CI/CD Failures Tab */}
        <TabsContent value="ci-failures">
          <CIFailureAnalyzer 
            compact={false}
            onFixSuggestion={(suggestion) => {
              showToast(`Fix suggestion noted: ${suggestion}`, 'info');
              trackUserInteraction('ci_fix_suggestion_applied', { suggestion });
            }}
          />
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert Rules Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">{rule.name}</h3>
                        <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <Badge className={getSeverityColor(rule.severity)}>
                          {rule.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{rule.conditions}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>Triggered: {rule.triggerCount} times</span>
                        {rule.lastTriggered && (
                          <span>Last: {new Date(rule.lastTriggered).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleToggleRule(rule.id)}
                        variant="outline"
                        size="sm"
                      >
                        {rule.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm">Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-medium mb-2">Analytics Dashboard</h3>
                <p>Detailed analytics and reporting features coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Actions Modal */}
      {showBulkActions && (
        <Modal
          isOpen={showBulkActions}
          onClose={() => setShowBulkActions(false)}
          title="Bulk Alert Actions"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select an action to perform on all selected alerts:
            </p>
            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={() => handleBulkAction('acknowledge')}
                className="w-full"
              >
                Acknowledge All Active Alerts
              </Button>
              <Button
                onClick={() => handleBulkAction('resolve')}
                className="w-full"
              >
                Resolve All Acknowledged Alerts
              </Button>
              <Button
                onClick={() => handleBulkAction('silence')}
                variant="outline"
                className="w-full"
              >
                Silence All Low Priority Alerts
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AlertSummaryDashboard;