/**
 * Notification Center Component
 * 
 * Centralized notification management hub that integrates Slack, webhook,
 * and email notifications with comprehensive alert routing and management.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/contexts/ToastContext';
import { usePerformanceMonitoring } from '@/hooks/useMonitoring';
import SlackIntegration from './SlackIntegration';
import WebhookIntegration from './WebhookIntegration';

interface NotificationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    alertTypes: string[];
    severity: string[];
    sources: string[];
    timeRange?: {
      start: string;
      end: string;
    };
  };
  actions: {
    slack?: {
      enabled: boolean;
      workspaceId: string;
      channelId: string;
      mentions: string[];
      customMessage?: string;
    };
    webhook?: {
      enabled: boolean;
      endpointId: string;
      customPayload?: string;
    };
    email?: {
      enabled: boolean;
      recipients: string[];
      subject?: string;
      template?: string;
    };
  };
  createdAt: string;
  lastTriggered?: string;
  triggerCount: number;
}

interface NotificationHistory {
  id: string;
  ruleId: string;
  ruleName: string;
  alertType: string;
  severity: string;
  message: string;
  timestamp: string;
  deliveryStatus: {
    slack?: { status: 'success' | 'error' | 'pending'; error?: string };
    webhook?: { status: 'success' | 'error' | 'pending'; error?: string };
    email?: { status: 'success' | 'error' | 'pending'; error?: string };
  };
  metadata?: Record<string, any>;
}

interface NotificationStats {
  totalRules: number;
  activeRules: number;
  totalNotifications: number;
  successRate: number;
  recentAlerts: number;
  channelStats: {
    slack: { total: number; success: number; errors: number };
    webhook: { total: number; success: number; errors: number };
    email: { total: number; success: number; errors: number };
  };
}

const NotificationCenter: React.FC = () => {
  const { trackUserInteraction } = usePerformanceMonitoring('NotificationCenter');
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [selectedRule, setSelectedRule] = useState<NotificationRule | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<NotificationHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load notification data
  useEffect(() => {
    const loadNotificationData = async () => {
      setIsLoading(true);
      
      try {
        // In a real app, these would be API calls
        const mockRules: NotificationRule[] = [
          {
            id: 'rule_1',
            name: 'Critical Production Alerts',
            description: 'Send critical alerts to the ops team immediately',
            enabled: true,
            conditions: {
              alertTypes: ['error', 'critical'],
              severity: ['high', 'critical'],
              sources: ['kubernetes', 'application']
            },
            actions: {
              slack: {
                enabled: true,
                workspaceId: 'workspace_1',
                channelId: 'channel_3',
                mentions: ['@here', '@ops-team'],
                customMessage: '🚨 CRITICAL: {message}'
              },
              webhook: {
                enabled: true,
                endpointId: 'webhook_1',
                customPayload: JSON.stringify({
                  alert: '{alert_type}',
                  message: '{message}',
                  severity: '{severity}',
                  timestamp: '{timestamp}'
                }, null, 2)
              },
              email: {
                enabled: true,
                recipients: ['ops@company.com', 'oncall@company.com'],
                subject: 'CRITICAL ALERT: {alert_type}',
                template: 'critical_alert'
              }
            },
            createdAt: '2023-01-01T00:00:00Z',
            lastTriggered: '2023-01-15T10:30:00Z',
            triggerCount: 25
          },
          {
            id: 'rule_2',
            name: 'Development Environment Alerts',
            description: 'Non-critical alerts for development environment',
            enabled: true,
            conditions: {
              alertTypes: ['warning', 'info'],
              severity: ['low', 'medium'],
              sources: ['development', 'staging']
            },
            actions: {
              slack: {
                enabled: true,
                workspaceId: 'workspace_1',
                channelId: 'channel_2',
                mentions: ['@dev-team'],
                customMessage: '⚠️ Dev Alert: {message}'
              },
              webhook: {
                enabled: false,
                endpointId: 'webhook_2'
              },
              email: {
                enabled: false,
                recipients: ['dev@company.com']
              }
            },
            createdAt: '2023-01-05T00:00:00Z',
            lastTriggered: '2023-01-15T09:45:00Z',
            triggerCount: 127
          },
          {
            id: 'rule_3',
            name: 'Business Hours Only',
            description: 'Alerts only during business hours',
            enabled: true,
            conditions: {
              alertTypes: ['info', 'warning'],
              severity: ['medium'],
              sources: ['monitoring'],
              timeRange: {
                start: '09:00',
                end: '17:00'
              }
            },
            actions: {
              slack: {
                enabled: true,
                workspaceId: 'workspace_1',
                channelId: 'channel_1',
                mentions: [],
                customMessage: '📊 Business Hours Alert: {message}'
              }
            },
            createdAt: '2023-01-10T00:00:00Z',
            triggerCount: 45
          }
        ];

        const mockHistory: NotificationHistory[] = [
          {
            id: 'history_1',
            ruleId: 'rule_1',
            ruleName: 'Critical Production Alerts',
            alertType: 'critical',
            severity: 'critical',
            message: 'Database connection timeout',
            timestamp: '2023-01-15T10:30:00Z',
            deliveryStatus: {
              slack: { status: 'success' },
              webhook: { status: 'success' },
              email: { status: 'success' }
            },
            metadata: {
              source: 'kubernetes',
              cluster: 'production',
              namespace: 'default'
            }
          },
          {
            id: 'history_2',
            ruleId: 'rule_2',
            ruleName: 'Development Environment Alerts',
            alertType: 'warning',
            severity: 'medium',
            message: 'High memory usage detected',
            timestamp: '2023-01-15T09:45:00Z',
            deliveryStatus: {
              slack: { status: 'success' },
              webhook: { status: 'error', error: 'Connection timeout' },
              email: { status: 'pending' }
            },
            metadata: {
              source: 'monitoring',
              service: 'api-service',
              environment: 'development'
            }
          },
          {
            id: 'history_3',
            ruleId: 'rule_1',
            ruleName: 'Critical Production Alerts',
            alertType: 'error',
            severity: 'high',
            message: 'API response time exceeded threshold',
            timestamp: '2023-01-15T08:15:00Z',
            deliveryStatus: {
              slack: { status: 'error', error: 'Channel not found' },
              webhook: { status: 'success' },
              email: { status: 'success' }
            },
            metadata: {
              source: 'application',
              endpoint: '/api/users',
              responseTime: '5.2s'
            }
          }
        ];

        const mockStats: NotificationStats = {
          totalRules: mockRules.length,
          activeRules: mockRules.filter(r => r.enabled).length,
          totalNotifications: 197,
          successRate: 94.2,
          recentAlerts: 12,
          channelStats: {
            slack: { total: 150, success: 142, errors: 8 },
            webhook: { total: 89, success: 84, errors: 5 },
            email: { total: 67, success: 65, errors: 2 }
          }
        };

        setRules(mockRules);
        setHistory(mockHistory);
        setStats(mockStats);
        
        trackUserInteraction('view_notification_center');
        
      } catch (error) {
        console.error('Failed to load notification data:', error);
        showToast('Failed to load notification data', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadNotificationData();
  }, [trackUserInteraction, showToast]);

  // Test notification rule
  const handleTestRule = async (rule: NotificationRule) => {
    try {
      showToast('Testing notification rule...', 'info');
      
      // Mock test notification
      const testPayload = {
        alert_type: 'test',
        message: 'This is a test notification',
        severity: 'info',
        timestamp: new Date().toISOString(),
        source: 'notification_center'
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showToast('Test notification sent successfully', 'success');
      
      trackUserInteraction('test_notification_rule', {
        ruleId: rule.id,
        ruleName: rule.name
      });
      
    } catch (error) {
      console.error('Failed to test notification rule:', error);
      showToast('Failed to send test notification', 'error');
    }
  };

  // Toggle rule enabled state
  const handleToggleRule = async (ruleId: string) => {
    try {
      setRules(prev => prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, enabled: !rule.enabled }
          : rule
      ));
      
      const rule = rules.find(r => r.id === ruleId);
      showToast(`Rule ${rule?.enabled ? 'disabled' : 'enabled'}`, 'success');
      
      trackUserInteraction('toggle_notification_rule', {
        ruleId,
        enabled: !rule?.enabled
      });
      
    } catch (error) {
      console.error('Failed to toggle rule:', error);
      showToast('Failed to update rule', 'error');
    }
  };

  // Save notification rule
  const handleSaveRule = async (rule: NotificationRule) => {
    try {
      if (selectedRule) {
        // Update existing rule
        setRules(prev => prev.map(r => r.id === rule.id ? rule : r));
        showToast('Rule updated successfully', 'success');
      } else {
        // Add new rule
        const newRule: NotificationRule = {
          ...rule,
          id: `rule_${Date.now()}`,
          createdAt: new Date().toISOString(),
          triggerCount: 0
        };
        setRules(prev => [...prev, newRule]);
        showToast('Rule created successfully', 'success');
      }

      setShowRuleModal(false);
      setSelectedRule(null);
      
      trackUserInteraction('save_notification_rule', {
        ruleId: rule.id,
        isNew: !selectedRule
      });
      
    } catch (error) {
      console.error('Failed to save rule:', error);
      showToast('Failed to save rule', 'error');
    }
  };

  // Delete notification rule
  const handleDeleteRule = async (ruleId: string) => {
    try {
      setRules(prev => prev.filter(r => r.id !== ruleId));
      showToast('Rule deleted successfully', 'success');
      
      trackUserInteraction('delete_notification_rule', { ruleId });
      
    } catch (error) {
      console.error('Failed to delete rule:', error);
      showToast('Failed to delete rule', 'error');
    }
  };

  // Get delivery status color
  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  // Get delivery status badge variant
  const getDeliveryStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return 'default';
      case 'error': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
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
            Notification Center
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage alerts and notifications across all channels
          </p>
        </div>
        
        <Button
          onClick={() => {
            setSelectedRule(null);
            setShowRuleModal(true);
          }}
        >
          Create Rule
        </Button>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="slack">Slack</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Rules</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stats.totalRules}
                      </p>
                    </div>
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Active Rules</p>
                      <p className="text-2xl font-bold text-green-600">
                        {stats.activeRules}
                      </p>
                    </div>
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Notifications</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stats.totalNotifications}
                      </p>
                    </div>
                    <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                      <p className="text-2xl font-bold text-green-600">
                        {stats.successRate}%
                      </p>
                    </div>
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Channel Performance */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>Channel Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">Slack</h3>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Total:</span>
                        <span className="font-medium">{stats.channelStats.slack.total}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Success:</span>
                        <span className="font-medium text-green-600">{stats.channelStats.slack.success}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Errors:</span>
                        <span className="font-medium text-red-600">{stats.channelStats.slack.errors}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h3 className="font-semibold text-green-900 dark:text-green-100">Webhooks</h3>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Total:</span>
                        <span className="font-medium">{stats.channelStats.webhook.total}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Success:</span>
                        <span className="font-medium text-green-600">{stats.channelStats.webhook.success}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Errors:</span>
                        <span className="font-medium text-red-600">{stats.channelStats.webhook.errors}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">Email</h3>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Total:</span>
                        <span className="font-medium">{stats.channelStats.email.total}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Success:</span>
                        <span className="font-medium text-green-600">{stats.channelStats.email.success}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Errors:</span>
                        <span className="font-medium text-red-600">{stats.channelStats.email.errors}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Rules</CardTitle>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No notification rules configured
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {rule.name}
                          </h3>
                          <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                            {rule.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {rule.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>
                            Alert Types: {rule.conditions.alertTypes.join(', ')}
                          </span>
                          <span>
                            Triggered: {rule.triggerCount} times
                          </span>
                          {rule.lastTriggered && (
                            <span>
                              Last: {new Date(rule.lastTriggered).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleTestRule(rule)}
                          variant="outline"
                          size="sm"
                        >
                          Test
                        </Button>
                        <Button
                          onClick={() => handleToggleRule(rule.id)}
                          variant="outline"
                          size="sm"
                        >
                          {rule.enabled ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedRule(rule);
                            setShowRuleModal(true);
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDeleteRule(rule.id)}
                          variant="outline"
                          size="sm"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification History</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No notification history
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {item.ruleName}
                          </h3>
                          <Badge variant="outline">
                            {item.alertType}
                          </Badge>
                          <Badge variant="outline">
                            {item.severity}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {item.message}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                          <div className="flex items-center gap-2">
                            {item.deliveryStatus.slack && (
                              <Badge variant={getDeliveryStatusBadge(item.deliveryStatus.slack.status)}>
                                Slack: {item.deliveryStatus.slack.status}
                              </Badge>
                            )}
                            {item.deliveryStatus.webhook && (
                              <Badge variant={getDeliveryStatusBadge(item.deliveryStatus.webhook.status)}>
                                Webhook: {item.deliveryStatus.webhook.status}
                              </Badge>
                            )}
                            {item.deliveryStatus.email && (
                              <Badge variant={getDeliveryStatusBadge(item.deliveryStatus.email.status)}>
                                Email: {item.deliveryStatus.email.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => {
                            setSelectedHistoryItem(item);
                            setShowHistoryModal(true);
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Slack Tab */}
        <TabsContent value="slack">
          <SlackIntegration />
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks">
          <WebhookIntegration />
        </TabsContent>
      </Tabs>

      {/* History Detail Modal */}
      {showHistoryModal && selectedHistoryItem && (
        <Modal
          isOpen={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedHistoryItem(null);
          }}
          title="Notification Details"
        >
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                {selectedHistoryItem.ruleName}
              </h3>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline">{selectedHistoryItem.alertType}</Badge>
                <Badge variant="outline">{selectedHistoryItem.severity}</Badge>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Message</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedHistoryItem.message}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Delivery Status</h4>
              <div className="space-y-2">
                {Object.entries(selectedHistoryItem.deliveryStatus).map(([channel, status]) => (
                  <div key={channel} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{channel}:</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={getDeliveryStatusBadge(status.status)}>
                        {status.status}
                      </Badge>
                      {status.error && (
                        <span className="text-xs text-red-600 dark:text-red-400">
                          {status.error}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {selectedHistoryItem.metadata && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Metadata</h4>
                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto">
                  {JSON.stringify(selectedHistoryItem.metadata, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Timestamp: {new Date(selectedHistoryItem.timestamp).toLocaleString()}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default NotificationCenter;