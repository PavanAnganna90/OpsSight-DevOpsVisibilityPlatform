/**
 * Alert Integrations Management Component
 * 
 * Provides UI for managing alert integrations from various sources
 * including Slack, webhooks, GitHub, Prometheus, and other monitoring tools
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface Integration {
  id: string;
  name: string;
  type: 'slack' | 'webhook' | 'github' | 'prometheus' | 'grafana' | 'pagerduty';
  status: 'active' | 'inactive' | 'error';
  config: {
    url?: string;
    token?: string;
    channel?: string;
    webhookId?: string;
    description?: string;
  };
  stats: {
    alertsReceived: number;
    lastAlert: string;
    successRate: number;
  };
  createdAt: string;
}

interface AlertSource {
  type: string;
  name: string;
  description: string;
  icon: string;
  configFields: Array<{
    name: string;
    label: string;
    type: 'text' | 'url' | 'token' | 'select';
    required: boolean;
    options?: string[];
  }>;
}

const AlertIntegrations: React.FC = () => {
  const { showToast } = useToast();
  
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSource, setSelectedSource] = useState<AlertSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);

  // Available alert sources
  const alertSources: AlertSource[] = [
    {
      type: 'slack',
      name: 'Slack',
      description: 'Receive alerts from Slack channels and mentions',
      icon: '💬',
      configFields: [
        { name: 'name', label: 'Integration Name', type: 'text', required: true },
        { name: 'token', label: 'Bot Token', type: 'token', required: true },
        { name: 'channel', label: 'Channel ID', type: 'text', required: true },
        { name: 'description', label: 'Description', type: 'text', required: false }
      ]
    },
    {
      type: 'webhook',
      name: 'Generic Webhook',
      description: 'Custom webhook endpoint for any external system',
      icon: '🔗',
      configFields: [
        { name: 'name', label: 'Webhook Name', type: 'text', required: true },
        { name: 'description', label: 'Description', type: 'text', required: false }
      ]
    },
    {
      type: 'github',
      name: 'GitHub Actions',
      description: 'Receive alerts from GitHub Actions workflows',
      icon: '🐙',
      configFields: [
        { name: 'name', label: 'Integration Name', type: 'text', required: true },
        { name: 'token', label: 'GitHub Token', type: 'token', required: true },
        { name: 'repository', label: 'Repository (owner/repo)', type: 'text', required: false }
      ]
    },
    {
      type: 'prometheus',
      name: 'Prometheus',
      description: 'Receive alerts from Prometheus Alertmanager',
      icon: '📊',
      configFields: [
        { name: 'name', label: 'Integration Name', type: 'text', required: true },
        { name: 'url', label: 'Alertmanager URL', type: 'url', required: true }
      ]
    },
    {
      type: 'grafana',
      name: 'Grafana',
      description: 'Receive alerts from Grafana dashboards',
      icon: '📈',
      configFields: [
        { name: 'name', label: 'Integration Name', type: 'text', required: true },
        { name: 'url', label: 'Grafana URL', type: 'url', required: true },
        { name: 'token', label: 'API Token', type: 'token', required: true }
      ]
    },
    {
      type: 'pagerduty',
      name: 'PagerDuty',
      description: 'Receive incidents from PagerDuty',
      icon: '🚨',
      configFields: [
        { name: 'name', label: 'Integration Name', type: 'text', required: true },
        { name: 'token', label: 'Integration Key', type: 'token', required: true }
      ]
    }
  ];

  // Load integrations
  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setIsLoading(true);
    try {
      // Mock data - in real implementation, this would call the API
      const mockIntegrations: Integration[] = [
        {
          id: 'slack_001',
          name: 'DevOps Alerts',
          type: 'slack',
          status: 'active',
          config: {
            channel: '#alerts',
            token: 'xoxb-****'
          },
          stats: {
            alertsReceived: 45,
            lastAlert: '2024-01-16T10:30:00Z',
            successRate: 98.5
          },
          createdAt: '2024-01-10T09:00:00Z'
        },
        {
          id: 'webhook_001',
          name: 'CI/CD Pipeline',
          type: 'webhook',
          status: 'active',
          config: {
            url: 'https://api.example.com/webhook/alerts',
            webhookId: 'webhook_12345'
          },
          stats: {
            alertsReceived: 23,
            lastAlert: '2024-01-16T09:45:00Z',
            successRate: 100
          },
          createdAt: '2024-01-12T14:30:00Z'
        },
        {
          id: 'github_001',
          name: 'Main Repository',
          type: 'github',
          status: 'error',
          config: {
            token: 'ghp_****',
            url: 'https://github.com/company/main-app'
          },
          stats: {
            alertsReceived: 12,
            lastAlert: '2024-01-15T16:20:00Z',
            successRate: 87.5
          },
          createdAt: '2024-01-08T11:15:00Z'
        }
      ];

      setIntegrations(mockIntegrations);
    } catch (error) {
      console.error('Failed to load integrations:', error);
      showToast('Failed to load integrations', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateIntegration = async (formData: Record<string, string>) => {
    try {
      // Mock API call
      const newIntegration: Integration = {
        id: `${selectedSource?.type}_${Date.now()}`,
        name: formData.name,
        type: selectedSource?.type as any,
        status: 'active',
        config: formData,
        stats: {
          alertsReceived: 0,
          lastAlert: '',
          successRate: 0
        },
        createdAt: new Date().toISOString()
      };

      setIntegrations(prev => [...prev, newIntegration]);
      setShowAddModal(false);
      setSelectedSource(null);
      showToast(`${selectedSource?.name} integration created successfully`, 'success');
    } catch (error) {
      console.error('Failed to create integration:', error);
      showToast('Failed to create integration', 'error');
    }
  };

  const handleTestIntegration = async (integration: Integration) => {
    setTestingIntegration(integration.id);
    try {
      // Mock API call to test integration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      showToast(`${integration.name} integration test successful`, 'success');
    } catch (error) {
      console.error('Integration test failed:', error);
      showToast('Integration test failed', 'error');
    } finally {
      setTestingIntegration(null);
    }
  };

  const handleDeleteIntegration = async (integrationId: string) => {
    try {
      setIntegrations(prev => prev.filter(int => int.id !== integrationId));
      showToast('Integration deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete integration:', error);
      showToast('Failed to delete integration', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    const source = alertSources.find(s => s.type === type);
    return source?.icon || '🔗';
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
            Alert Integrations
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage alert sources and webhook integrations
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          Add Integration
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {integrations.length}
            </div>
            <div className="text-sm text-gray-600">Total Integrations</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {integrations.filter(i => i.status === 'active').length}
            </div>
            <div className="text-sm text-gray-600">Active</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {integrations.reduce((sum, i) => sum + i.stats.alertsReceived, 0)}
            </div>
            <div className="text-sm text-gray-600">Alerts Received</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {integrations.length > 0 
                ? Math.round(integrations.reduce((sum, i) => sum + i.stats.successRate, 0) / integrations.length)
                : 0}%
            </div>
            <div className="text-sm text-gray-600">Avg Success Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Integrations List */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Integrations</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {integrations.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-4xl mb-4">🔗</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No integrations configured
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Add your first alert integration to start receiving alerts
                </p>
                <Button onClick={() => setShowAddModal(true)}>
                  Add Integration
                </Button>
              </CardContent>
            </Card>
          ) : (
            integrations.map((integration) => (
              <Card key={integration.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">{getTypeIcon(integration.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {integration.name}
                          </h3>
                          <Badge className={getStatusColor(integration.status)}>
                            {integration.status}
                          </Badge>
                          <Badge variant="outline">
                            {integration.type}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div>
                            <span className="font-medium">Alerts Received:</span> {integration.stats.alertsReceived}
                          </div>
                          <div>
                            <span className="font-medium">Success Rate:</span> {integration.stats.successRate}%
                          </div>
                          <div>
                            <span className="font-medium">Last Alert:</span> {
                              integration.stats.lastAlert 
                                ? new Date(integration.stats.lastAlert).toLocaleString()
                                : 'Never'
                            }
                          </div>
                        </div>

                        {integration.config.url && (
                          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">URL:</span> {integration.config.url}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestIntegration(integration)}
                        disabled={testingIntegration === integration.id}
                      >
                        {testingIntegration === integration.id ? 'Testing...' : 'Test'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteIntegration(integration.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="active">
          {/* Show only active integrations */}
        </TabsContent>

        <TabsContent value="inactive">
          {/* Show only inactive integrations */}
        </TabsContent>
      </Tabs>

      {/* Add Integration Modal */}
      {showAddModal && (
        <AddIntegrationModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setSelectedSource(null);
          }}
          alertSources={alertSources}
          selectedSource={selectedSource}
          onSelectSource={setSelectedSource}
          onSubmit={handleCreateIntegration}
        />
      )}
    </div>
  );
};

// Add Integration Modal Component
interface AddIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  alertSources: AlertSource[];
  selectedSource: AlertSource | null;
  onSelectSource: (source: AlertSource) => void;
  onSubmit: (formData: Record<string, string>) => Promise<void>;
}

const AddIntegrationModal: React.FC<AddIntegrationModalProps> = ({
  isOpen,
  onClose,
  alertSources,
  selectedSource,
  onSelectSource,
  onSubmit
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Alert Integration">
      <div className="space-y-6">
        {!selectedSource ? (
          // Source Selection
          <div>
            <h3 className="text-lg font-medium mb-4">Select Integration Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {alertSources.map((source) => (
                <button
                  key={source.type}
                  onClick={() => onSelectSource(source)}
                  className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{source.icon}</div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {source.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {source.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Configuration Form
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-2xl">{selectedSource.icon}</div>
              <div>
                <h3 className="text-lg font-medium">{selectedSource.name}</h3>
                <p className="text-sm text-gray-600">{selectedSource.description}</p>
              </div>
            </div>

            {selectedSource.configFields.map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={field.type === 'token' ? 'password' : field.type === 'url' ? 'url' : 'text'}
                  required={field.required}
                  value={formData[field.name] || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                  placeholder={field.type === 'token' ? '••••••••••••••••' : ''}
                />
              </div>
            ))}

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Integration'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onSelectSource(null)}
              >
                Back
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default AlertIntegrations;