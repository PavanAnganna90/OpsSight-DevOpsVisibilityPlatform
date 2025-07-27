/**
 * Slack Integration Component
 * 
 * Provides Slack workspace integration for notifications and alerts.
 * Allows users to connect their Slack workspace and configure notification preferences.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { usePerformanceMonitoring } from '@/hooks/useMonitoring';

interface SlackWorkspace {
  id: string;
  name: string;
  domain: string;
  icon: string;
  connected: boolean;
  connectedAt?: string;
  channels: SlackChannel[];
}

interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  memberCount: number;
  purpose?: string;
}

interface SlackNotificationConfig {
  enabled: boolean;
  workspaceId: string;
  channelId: string;
  alertTypes: string[];
  threshold: 'low' | 'medium' | 'high' | 'critical';
  mentionUsers: string[];
  customMessage?: string;
}

const SlackIntegration: React.FC = () => {
  const { trackUserInteraction } = usePerformanceMonitoring('SlackIntegration');
  const { showToast } = useToast();
  
  const [workspaces, setWorkspaces] = useState<SlackWorkspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<SlackWorkspace | null>(null);
  const [notificationConfigs, setNotificationConfigs] = useState<SlackNotificationConfig[]>([]);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<SlackNotificationConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  // Load Slack workspaces and configurations
  useEffect(() => {
    const loadSlackData = async () => {
      setIsLoading(true);
      
      try {
        // In a real app, these would be API calls
        const mockWorkspaces: SlackWorkspace[] = [
          {
            id: 'workspace_1',
            name: 'DevOps Team',
            domain: 'devops-team.slack.com',
            icon: '🚀',
            connected: true,
            connectedAt: '2023-01-01T00:00:00Z',
            channels: [
              {
                id: 'channel_1',
                name: 'alerts',
                isPrivate: false,
                memberCount: 25,
                purpose: 'System alerts and notifications'
              },
              {
                id: 'channel_2',
                name: 'devops',
                isPrivate: false,
                memberCount: 15,
                purpose: 'DevOps discussions and updates'
              },
              {
                id: 'channel_3',
                name: 'critical-alerts',
                isPrivate: true,
                memberCount: 8,
                purpose: 'Critical system alerts'
              }
            ]
          },
          {
            id: 'workspace_2',
            name: 'Engineering',
            domain: 'engineering.slack.com',
            icon: '⚙️',
            connected: false,
            channels: []
          }
        ];

        const mockConfigs: SlackNotificationConfig[] = [
          {
            enabled: true,
            workspaceId: 'workspace_1',
            channelId: 'channel_1',
            alertTypes: ['error', 'warning', 'info'],
            threshold: 'medium',
            mentionUsers: ['@channel'],
            customMessage: 'OpsSight Alert: {alert_type} - {message}'
          },
          {
            enabled: true,
            workspaceId: 'workspace_1',
            channelId: 'channel_3',
            alertTypes: ['critical'],
            threshold: 'critical',
            mentionUsers: ['@here', '@john.doe'],
            customMessage: '🚨 CRITICAL ALERT: {message}'
          }
        ];

        setWorkspaces(mockWorkspaces);
        setNotificationConfigs(mockConfigs);
        
        trackUserInteraction('view_slack_integration');
        
      } catch (error) {
        console.error('Failed to load Slack data:', error);
        showToast('Failed to load Slack integration data', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadSlackData();
  }, [trackUserInteraction, showToast]);

  // Connect to Slack workspace
  const handleConnectSlack = async () => {
    setIsConnecting(true);
    
    try {
      // In a real app, this would initiate OAuth flow
      const authUrl = `https://slack.com/oauth/v2/authorize?client_id=your_client_id&scope=chat:write,channels:read&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/slack/callback')}`;
      
      // Open Slack OAuth in new window
      const authWindow = window.open(
        authUrl,
        'slack-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Listen for OAuth completion
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'SLACK_AUTH_SUCCESS') {
          authWindow?.close();
          
          // Mock successful connection
          const newWorkspace: SlackWorkspace = {
            id: 'workspace_3',
            name: event.data.team_name || 'New Workspace',
            domain: event.data.team_domain || 'new-workspace.slack.com',
            icon: '✅',
            connected: true,
            connectedAt: new Date().toISOString(),
            channels: event.data.channels || []
          };
          
          setWorkspaces(prev => [...prev, newWorkspace]);
          setShowConnectModal(false);
          showToast('Successfully connected to Slack workspace', 'success');
          
          trackUserInteraction('connect_slack_workspace', {
            workspaceId: newWorkspace.id,
            workspaceName: newWorkspace.name
          });
        }
      };

      window.addEventListener('message', handleMessage);
      
      // Cleanup
      const checkClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Failed to connect to Slack:', error);
      showToast('Failed to connect to Slack workspace', 'error');
      setIsConnecting(false);
    }
  };

  // Disconnect from Slack workspace
  const handleDisconnectSlack = async (workspaceId: string) => {
    try {
      // In a real app, this would revoke OAuth token
      setWorkspaces(prev => prev.map(workspace => 
        workspace.id === workspaceId 
          ? { ...workspace, connected: false, channels: [] }
          : workspace
      ));
      
      // Remove associated notification configurations
      setNotificationConfigs(prev => 
        prev.filter(config => config.workspaceId !== workspaceId)
      );
      
      showToast('Successfully disconnected from Slack workspace', 'success');
      
      trackUserInteraction('disconnect_slack_workspace', {
        workspaceId
      });
      
    } catch (error) {
      console.error('Failed to disconnect from Slack:', error);
      showToast('Failed to disconnect from Slack workspace', 'error');
    }
  };

  // Test Slack notification
  const handleTestNotification = async (config: SlackNotificationConfig) => {
    try {
      const workspace = workspaces.find(w => w.id === config.workspaceId);
      const channel = workspace?.channels.find(c => c.id === config.channelId);
      
      if (!workspace || !channel) {
        throw new Error('Workspace or channel not found');
      }
      
      // Mock sending test notification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showToast(`Test notification sent to #${channel.name}`, 'success');
      
      trackUserInteraction('test_slack_notification', {
        workspaceId: config.workspaceId,
        channelId: config.channelId
      });
      
    } catch (error) {
      console.error('Failed to send test notification:', error);
      showToast('Failed to send test notification', 'error');
    }
  };

  // Save notification configuration
  const handleSaveConfig = async (config: SlackNotificationConfig) => {
    try {
      if (selectedConfig) {
        // Update existing config
        setNotificationConfigs(prev => 
          prev.map(c => 
            c.workspaceId === config.workspaceId && c.channelId === config.channelId
              ? config
              : c
          )
        );
      } else {
        // Add new config
        setNotificationConfigs(prev => [...prev, config]);
      }
      
      setShowConfigModal(false);
      setSelectedConfig(null);
      showToast('Notification configuration saved', 'success');
      
      trackUserInteraction('save_slack_config', {
        workspaceId: config.workspaceId,
        channelId: config.channelId,
        alertTypes: config.alertTypes
      });
      
    } catch (error) {
      console.error('Failed to save configuration:', error);
      showToast('Failed to save configuration', 'error');
    }
  };

  // Get workspace by ID
  const getWorkspaceById = (id: string) => {
    return workspaces.find(w => w.id === id);
  };

  // Get channel by ID
  const getChannelById = (workspaceId: string, channelId: string) => {
    const workspace = getWorkspaceById(workspaceId);
    return workspace?.channels.find(c => c.id === channelId);
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
            Slack Integration
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Connect your Slack workspaces to receive notifications and alerts
          </p>
        </div>
        
        <Button
          onClick={() => setShowConnectModal(true)}
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : 'Connect Workspace'}
        </Button>
      </div>

      {/* Connected Workspaces */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Workspaces</CardTitle>
        </CardHeader>
        <CardContent>
          {workspaces.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No Slack workspaces connected
            </div>
          ) : (
            <div className="space-y-4">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{workspace.icon}</div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {workspace.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {workspace.domain}
                      </p>
                      {workspace.connected && workspace.connectedAt && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Connected {new Date(workspace.connectedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={workspace.connected ? 'default' : 'secondary'}
                    >
                      {workspace.connected ? 'Connected' : 'Disconnected'}
                    </Badge>
                    
                    {workspace.connected && (
                      <>
                        <Button
                          onClick={() => {
                            setSelectedWorkspace(workspace);
                            setShowConfigModal(true);
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Configure
                        </Button>
                        <Button
                          onClick={() => handleDisconnectSlack(workspace.id)}
                          variant="outline"
                          size="sm"
                        >
                          Disconnect
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Configurations */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          {notificationConfigs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No notification configurations set up
            </div>
          ) : (
            <div className="space-y-4">
              {notificationConfigs.map((config, index) => {
                const workspace = getWorkspaceById(config.workspaceId);
                const channel = getChannelById(config.workspaceId, config.channelId);
                
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {workspace?.name} → #{channel?.name}
                        </h3>
                        <Badge 
                          variant={config.enabled ? 'default' : 'secondary'}
                        >
                          {config.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <Badge variant="outline">
                          {config.threshold}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>
                          Alert Types: {config.alertTypes.join(', ')}
                        </span>
                        <span>
                          Mentions: {config.mentionUsers.join(', ')}
                        </span>
                      </div>
                      
                      {config.customMessage && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Custom Message: {config.customMessage}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleTestNotification(config)}
                        variant="outline"
                        size="sm"
                      >
                        Test
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedConfig(config);
                          setSelectedWorkspace(workspace || null);
                          setShowConfigModal(true);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connect Workspace Modal */}
      {showConnectModal && (
        <Modal
          isOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          title="Connect Slack Workspace"
        >
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-6xl mb-4">🚀</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Connect Your Slack Workspace
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Authorize OpsSight to send notifications to your Slack workspace
              </p>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Required Permissions
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Send messages to channels</li>
                <li>• Read channel information</li>
                <li>• View workspace information</li>
              </ul>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={handleConnectSlack}
                disabled={isConnecting}
                className="flex-1"
              >
                {isConnecting ? 'Connecting...' : 'Connect to Slack'}
              </Button>
              <Button
                onClick={() => setShowConnectModal(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Configuration Modal */}
      {showConfigModal && selectedWorkspace && (
        <SlackConfigModal
          workspace={selectedWorkspace}
          config={selectedConfig}
          onSave={handleSaveConfig}
          onClose={() => {
            setShowConfigModal(false);
            setSelectedConfig(null);
            setSelectedWorkspace(null);
          }}
        />
      )}
    </div>
  );
};

// Slack Configuration Modal Component
interface SlackConfigModalProps {
  workspace: SlackWorkspace;
  config: SlackNotificationConfig | null;
  onSave: (config: SlackNotificationConfig) => void;
  onClose: () => void;
}

const SlackConfigModal: React.FC<SlackConfigModalProps> = ({
  workspace,
  config,
  onSave,
  onClose
}) => {
  const [formData, setFormData] = useState<SlackNotificationConfig>({
    enabled: config?.enabled ?? true,
    workspaceId: workspace.id,
    channelId: config?.channelId ?? '',
    alertTypes: config?.alertTypes ?? ['error', 'warning'],
    threshold: config?.threshold ?? 'medium',
    mentionUsers: config?.mentionUsers ?? [],
    customMessage: config?.customMessage ?? ''
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
      title={`Configure Notifications - ${workspace.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Channel Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Channel
          </label>
          <select
            value={formData.channelId}
            onChange={(e) => setFormData(prev => ({ ...prev, channelId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
            required
          >
            <option value="">Select a channel</option>
            {workspace.channels.map(channel => (
              <option key={channel.id} value={channel.id}>
                #{channel.name} {channel.isPrivate ? '(Private)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Alert Types */}
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

        {/* Threshold */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Minimum Threshold
          </label>
          <select
            value={formData.threshold}
            onChange={(e) => setFormData(prev => ({ ...prev, threshold: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
          >
            {thresholdOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Custom Message Template
          </label>
          <textarea
            value={formData.customMessage}
            onChange={(e) => setFormData(prev => ({ ...prev, customMessage: e.target.value }))}
            placeholder="OpsSight Alert: {alert_type} - {message}"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Available variables: {'{alert_type}'}, {'{message}'}, {'{timestamp}'}, {'{severity}'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" className="flex-1">
            {config ? 'Update Configuration' : 'Create Configuration'}
          </Button>
          <Button type="button" onClick={onClose} variant="outline">
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default SlackIntegration;