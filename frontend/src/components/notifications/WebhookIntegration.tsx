/**
 * Webhook Integration Component
 * 
 * Provides webhook endpoint management for notifications and alerts.
 * Allows users to configure custom webhook endpoints for receiving notifications.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { usePerformanceMonitoring } from '@/hooks/useMonitoring';

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
  enabled: boolean;
  createdAt: string;
  lastUsed?: string;
  successCount: number;
  errorCount: number;
  alertTypes: string[];
  threshold: 'low' | 'medium' | 'high' | 'critical';
  retryConfig: {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number;
  };
  authConfig?: {
    type: 'none' | 'bearer' | 'basic' | 'api_key';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
}

interface WebhookTest {
  id: string;
  webhookId: string;
  status: 'pending' | 'success' | 'error';
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
  };
  error?: string;
  timestamp: string;
  duration?: number;
}

const WebhookIntegration: React.FC = () => {
  const { trackUserInteraction } = usePerformanceMonitoring('WebhookIntegration');
  const { showToast } = useToast();
  
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookEndpoint | null>(null);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testResults, setTestResults] = useState<WebhookTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  // Load webhook endpoints
  useEffect(() => {
    const loadWebhooks = async () => {
      setIsLoading(true);
      
      try {
        // In a real app, this would be an API call
        const mockWebhooks: WebhookEndpoint[] = [
          {
            id: 'webhook_1',
            name: 'Production Alerts',
            url: 'https://api.example.com/webhooks/alerts',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Version': '1.0'
            },
            enabled: true,
            createdAt: '2023-01-01T00:00:00Z',
            lastUsed: '2023-01-15T10:30:00Z',
            successCount: 245,
            errorCount: 3,
            alertTypes: ['error', 'critical'],
            threshold: 'high',
            retryConfig: {
              enabled: true,
              maxRetries: 3,
              retryDelay: 1000
            },
            authConfig: {
              type: 'bearer',
              token: 'sk-1234567890abcdef'
            }
          },
          {
            id: 'webhook_2',
            name: 'Development Notifications',
            url: 'https://dev-api.example.com/notifications',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            enabled: false,
            createdAt: '2023-01-05T00:00:00Z',
            successCount: 12,
            errorCount: 1,
            alertTypes: ['info', 'warning', 'error'],
            threshold: 'medium',
            retryConfig: {
              enabled: false,
              maxRetries: 1,
              retryDelay: 500
            },
            authConfig: {
              type: 'api_key',
              apiKey: 'dev-key-123',
              apiKeyHeader: 'X-API-Key'
            }
          }
        ];

        setWebhooks(mockWebhooks);
        trackUserInteraction('view_webhook_integration');
        
      } catch (error) {
        console.error('Failed to load webhooks:', error);
        showToast('Failed to load webhook configurations', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadWebhooks();
  }, [trackUserInteraction, showToast]);

  // Test webhook endpoint
  const handleTestWebhook = async (webhook: WebhookEndpoint) => {
    setIsTesting(true);
    setSelectedWebhook(webhook);
    setShowTestModal(true);

    const testId = `test_${Date.now()}`;
    const testPayload = {
      event: 'test_notification',
      timestamp: new Date().toISOString(),
      alert: {
        type: 'info',
        message: 'This is a test notification from OpsSight',
        severity: 'low',
        source: 'webhook_test'
      },
      metadata: {
        test: true,
        webhook_id: webhook.id,
        webhook_name: webhook.name
      }
    };

    // Add pending test result
    const pendingTest: WebhookTest = {
      id: testId,
      webhookId: webhook.id,
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    setTestResults(prev => [pendingTest, ...prev]);

    try {
      const startTime = Date.now();
      
      // Prepare request headers
      const headers: Record<string, string> = { ...webhook.headers };
      
      // Add authentication
      if (webhook.authConfig) {
        switch (webhook.authConfig.type) {
          case 'bearer':
            headers['Authorization'] = `Bearer ${webhook.authConfig.token}`;
            break;
          case 'basic':
            const credentials = btoa(`${webhook.authConfig.username}:${webhook.authConfig.password}`);
            headers['Authorization'] = `Basic ${credentials}`;
            break;
          case 'api_key':
            if (webhook.authConfig.apiKeyHeader && webhook.authConfig.apiKey) {
              headers[webhook.authConfig.apiKeyHeader] = webhook.authConfig.apiKey;
            }
            break;
        }
      }

      // Mock API call (in real app, this would go through backend)
      const response = await fetch('/api/webhook-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook,
          payload: testPayload,
          headers
        })
      });

      const duration = Date.now() - startTime;
      const responseData = await response.json();

      // Update test result
      const successTest: WebhookTest = {
        id: testId,
        webhookId: webhook.id,
        status: 'success',
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: JSON.stringify(responseData, null, 2)
        },
        timestamp: new Date().toISOString(),
        duration
      };

      setTestResults(prev => prev.map(t => t.id === testId ? successTest : t));
      
      // Update webhook stats
      setWebhooks(prev => prev.map(w => 
        w.id === webhook.id 
          ? { ...w, successCount: w.successCount + 1, lastUsed: new Date().toISOString() }
          : w
      ));

      showToast('Webhook test completed successfully', 'success');
      
      trackUserInteraction('test_webhook_success', {
        webhookId: webhook.id,
        duration,
        status: response.status
      });

    } catch (error) {
      const errorTest: WebhookTest = {
        id: testId,
        webhookId: webhook.id,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };

      setTestResults(prev => prev.map(t => t.id === testId ? errorTest : t));
      
      // Update webhook stats
      setWebhooks(prev => prev.map(w => 
        w.id === webhook.id 
          ? { ...w, errorCount: w.errorCount + 1 }
          : w
      ));

      showToast('Webhook test failed', 'error');
      
      trackUserInteraction('test_webhook_error', {
        webhookId: webhook.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

    } finally {
      setIsTesting(false);
    }
  };

  // Save webhook configuration
  const handleSaveWebhook = async (webhook: WebhookEndpoint) => {
    try {
      if (selectedWebhook) {
        // Update existing webhook
        setWebhooks(prev => prev.map(w => w.id === webhook.id ? webhook : w));
        showToast('Webhook updated successfully', 'success');
      } else {
        // Add new webhook
        const newWebhook: WebhookEndpoint = {
          ...webhook,
          id: `webhook_${Date.now()}`,
          createdAt: new Date().toISOString(),
          successCount: 0,
          errorCount: 0
        };
        setWebhooks(prev => [...prev, newWebhook]);
        showToast('Webhook created successfully', 'success');
      }

      setShowWebhookModal(false);
      setSelectedWebhook(null);
      
      trackUserInteraction('save_webhook', {
        webhookId: webhook.id,
        isNew: !selectedWebhook
      });

    } catch (error) {
      console.error('Failed to save webhook:', error);
      showToast('Failed to save webhook', 'error');
    }
  };

  // Delete webhook
  const handleDeleteWebhook = async (webhookId: string) => {
    try {
      setWebhooks(prev => prev.filter(w => w.id !== webhookId));
      showToast('Webhook deleted successfully', 'success');
      
      trackUserInteraction('delete_webhook', { webhookId });

    } catch (error) {
      console.error('Failed to delete webhook:', error);
      showToast('Failed to delete webhook', 'error');
    }
  };

  // Toggle webhook enabled state
  const handleToggleWebhook = async (webhookId: string) => {
    try {
      setWebhooks(prev => prev.map(w => 
        w.id === webhookId 
          ? { ...w, enabled: !w.enabled }
          : w
      ));
      
      const webhook = webhooks.find(w => w.id === webhookId);
      showToast(`Webhook ${webhook?.enabled ? 'disabled' : 'enabled'}`, 'success');
      
      trackUserInteraction('toggle_webhook', {
        webhookId,
        enabled: !webhook?.enabled
      });

    } catch (error) {
      console.error('Failed to toggle webhook:', error);
      showToast('Failed to update webhook', 'error');
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Webhook Integration
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Configure webhook endpoints to receive notifications and alerts
          </p>
        </div>
        
        <Button
          onClick={() => {
            setSelectedWebhook(null);
            setShowWebhookModal(true);
          }}
        >
          Add Webhook
        </Button>
      </div>

      {/* Webhook Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No webhook endpoints configured
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {webhook.name}
                      </h3>
                      <Badge variant={webhook.enabled ? 'default' : 'secondary'}>
                        {webhook.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <Badge variant="outline">
                        {webhook.method}
                      </Badge>
                      <Badge variant="outline">
                        {webhook.threshold}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {webhook.url}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>
                        Alert Types: {webhook.alertTypes.join(', ')}
                      </span>
                      <span>
                        Success: {webhook.successCount}
                      </span>
                      <span>
                        Errors: {webhook.errorCount}
                      </span>
                      {webhook.lastUsed && (
                        <span>
                          Last Used: {new Date(webhook.lastUsed).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleTestWebhook(webhook)}
                      variant="outline"
                      size="sm"
                      disabled={isTesting}
                    >
                      {isTesting ? 'Testing...' : 'Test'}
                    </Button>
                    <Button
                      onClick={() => handleToggleWebhook(webhook.id)}
                      variant="outline"
                      size="sm"
                    >
                      {webhook.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedWebhook(webhook);
                        setShowWebhookModal(true);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDeleteWebhook(webhook.id)}
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

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((test) => {
                const webhook = webhooks.find(w => w.id === test.webhookId);
                
                return (
                  <div
                    key={test.id}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {webhook?.name}
                        </h4>
                        <Badge 
                          variant={
                            test.status === 'success' ? 'default' : 
                            test.status === 'error' ? 'destructive' : 
                            'secondary'
                          }
                        >
                          {test.status}
                        </Badge>
                        {test.duration && (
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {test.duration}ms
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(test.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    {test.response && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">
                            {test.response.status} {test.response.statusText}
                          </Badge>
                        </div>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                          {test.response.body}
                        </pre>
                      </div>
                    )}
                    
                    {test.error && (
                      <div className="mt-2">
                        <div className="text-sm text-red-600 dark:text-red-400">
                          Error: {test.error}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhook Configuration Modal */}
      {showWebhookModal && (
        <WebhookConfigModal
          webhook={selectedWebhook}
          onSave={handleSaveWebhook}
          onClose={() => {
            setShowWebhookModal(false);
            setSelectedWebhook(null);
          }}
        />
      )}
    </div>
  );
};

// Webhook Configuration Modal Component
interface WebhookConfigModalProps {
  webhook: WebhookEndpoint | null;
  onSave: (webhook: WebhookEndpoint) => void;
  onClose: () => void;
}

const WebhookConfigModal: React.FC<WebhookConfigModalProps> = ({
  webhook,
  onSave,
  onClose
}) => {
  const [formData, setFormData] = useState<WebhookEndpoint>({
    id: webhook?.id ?? '',
    name: webhook?.name ?? '',
    url: webhook?.url ?? '',
    method: webhook?.method ?? 'POST',
    headers: webhook?.headers ?? { 'Content-Type': 'application/json' },
    enabled: webhook?.enabled ?? true,
    createdAt: webhook?.createdAt ?? new Date().toISOString(),
    successCount: webhook?.successCount ?? 0,
    errorCount: webhook?.errorCount ?? 0,
    alertTypes: webhook?.alertTypes ?? ['error', 'warning'],
    threshold: webhook?.threshold ?? 'medium',
    retryConfig: webhook?.retryConfig ?? {
      enabled: true,
      maxRetries: 3,
      retryDelay: 1000
    },
    authConfig: webhook?.authConfig ?? { type: 'none' }
  });

  const alertTypeOptions = [
    { value: 'info', label: 'Info' },
    { value: 'warning', label: 'Warning' },
    { value: 'error', label: 'Error' },
    { value: 'critical', label: 'Critical' }
  ];

  const thresholdOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={webhook ? 'Edit Webhook' : 'Add Webhook'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Configuration */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              URL
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Method
            </label>
            <select
              value={formData.method}
              onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
            >
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>
        </div>

        {/* Alert Configuration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Alert Types
          </label>
          <div className="grid grid-cols-2 gap-2">
            {alertTypeOptions.map(option => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.alertTypes.includes(option.value)}
                  onChange={(e) => {
                    const newAlertTypes = e.target.checked
                      ? [...formData.alertTypes, option.value]
                      : formData.alertTypes.filter(t => t !== option.value);
                    setFormData(prev => ({ ...prev, alertTypes: newAlertTypes }));
                  }}
                  className="mr-2"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Authentication */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Authentication
          </label>
          <select
            value={formData.authConfig?.type || 'none'}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              authConfig: { ...prev.authConfig, type: e.target.value as any }
            }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
          >
            <option value="none">None</option>
            <option value="bearer">Bearer Token</option>
            <option value="basic">Basic Auth</option>
            <option value="api_key">API Key</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" className="flex-1">
            {webhook ? 'Update Webhook' : 'Create Webhook'}
          </Button>
          <Button type="button" onClick={onClose} variant="outline">
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default WebhookIntegration;