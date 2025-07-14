/**
 * DigestManagement component for configuring and managing notification digests.
 * Allows users to schedule, customize, and send digest notifications.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { 
  CalendarIcon, 
  ClockIcon, 
  EnvelopeIcon, 
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';

// Types
interface DigestConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  timezone: string;
  channels: string[];
  includeTypes: string[];
  minSeverity: string;
  summaryLength: 'brief' | 'detailed' | 'comprehensive';
}

interface DigestPreview {
  alertCount: number;
  pipelineCount: number;
  deploymentCount: number;
  estimatedSize: string;
  lastGenerated?: string;
}

const DigestManagement: React.FC = () => {
  const [config, setConfig] = useState<DigestConfig>({
    enabled: true,
    frequency: 'daily',
    time: '09:00',
    timezone: 'UTC',
    channels: ['email'],
    includeTypes: ['alert_triggered', 'pipeline_failed', 'deployment_completed'],
    minSeverity: 'medium',
    summaryLength: 'detailed'
  });

  const [preview, setPreview] = useState<DigestPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string>('');

  const availableChannels = [
    { value: 'email', label: 'Email', icon: EnvelopeIcon },
    { value: 'slack', label: 'Slack', icon: EnvelopeIcon },
  ];

  const notificationTypes = [
    { value: 'alert_triggered', label: 'Alert Triggered' },
    { value: 'alert_resolved', label: 'Alert Resolved' },
    { value: 'pipeline_failed', label: 'Pipeline Failed' },
    { value: 'pipeline_succeeded', label: 'Pipeline Succeeded' },
    { value: 'deployment_started', label: 'Deployment Started' },
    { value: 'deployment_completed', label: 'Deployment Completed' },
    { value: 'security_vulnerability', label: 'Security Vulnerability' },
  ];

  const severityLevels = [
    { value: 'low', label: 'Low and above' },
    { value: 'medium', label: 'Medium and above' },
    { value: 'high', label: 'High and above' },
    { value: 'critical', label: 'Critical only' },
  ];

  useEffect(() => {
    loadPreview();
  }, [config]);

  const loadPreview = async () => {
    setLoading(true);
    try {
      // Simulate API call for digest preview
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setPreview({
        alertCount: Math.floor(Math.random() * 20) + 5,
        pipelineCount: Math.floor(Math.random() * 15) + 3,
        deploymentCount: Math.floor(Math.random() * 10) + 2,
        estimatedSize: '~2.5KB',
        lastGenerated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to load digest preview:', error);
      setMessage('Failed to load digest preview');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setLoading(true);
      // Simulate API call to save config
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage('Digest configuration saved successfully');
    } catch (error) {
      console.error('Failed to save digest config:', error);
      setMessage('Failed to save digest configuration');
    } finally {
      setLoading(false);
    }
  };

  const sendTestDigest = async () => {
    try {
      setSending(true);
      // Simulate API call to send test digest
      await new Promise(resolve => setTimeout(resolve, 2000));
      setMessage('Test digest sent successfully');
    } catch (error) {
      console.error('Failed to send test digest:', error);
      setMessage('Failed to send test digest');
    } finally {
      setSending(false);
    }
  };

  const updateConfig = (updates: Partial<DigestConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const toggleChannel = (channel: string) => {
    const newChannels = config.channels.includes(channel)
      ? config.channels.filter(c => c !== channel)
      : [...config.channels, channel];
    updateConfig({ channels: newChannels });
  };

  const toggleNotificationType = (type: string) => {
    const newTypes = config.includeTypes.includes(type)
      ? config.includeTypes.filter(t => t !== type)
      : [...config.includeTypes, type];
    updateConfig({ includeTypes: newTypes });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            <h2 className="text-lg font-medium">Digest Management</h2>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Configure automated digest notifications with customizable scheduling and content
          </p>
        </div>

        {/* Status Message */}
        {message && (
          <div className="px-6 py-3 bg-blue-50 border-b border-gray-200">
            <p className="text-sm text-blue-800">{message}</p>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Enable/Disable Digest */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium">Enable Digest Notifications</h3>
              <p className="text-sm text-gray-600">
                Automatically send summarized notifications on a schedule
              </p>
            </div>
            <button
              onClick={() => updateConfig({ enabled: !config.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.enabled ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {config.enabled && (
            <>
              {/* Schedule Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency
                  </label>
                  <select
                    value={config.frequency}
                    onChange={(e) => updateConfig({ frequency: e.target.value as any })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    value={config.time}
                    onChange={(e) => updateConfig({ time: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={config.timezone}
                    onChange={(e) => updateConfig({ timezone: e.target.value })}
                    placeholder="UTC"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Channel Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Delivery Channels
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {availableChannels.map(channel => (
                    <div
                      key={channel.value}
                      onClick={() => toggleChannel(channel.value)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        config.channels.includes(channel.value)
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <channel.icon className="h-5 w-5" />
                        <span className="font-medium">{channel.label}</span>
                        {config.channels.includes(channel.value) && (
                          <CheckIcon className="h-4 w-4 text-indigo-600 ml-auto" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Content Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Notification Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Include Notification Types
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {notificationTypes.map(type => (
                      <div key={type.value} className="flex items-center">
                        <input
                          type="checkbox"
                          id={type.value}
                          checked={config.includeTypes.includes(type.value)}
                          onChange={() => toggleNotificationType(type.value)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor={type.value} className="ml-2 text-sm text-gray-700">
                          {type.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Severity and Summary Options */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Severity
                    </label>
                    <select
                      value={config.minSeverity}
                      onChange={(e) => updateConfig({ minSeverity: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      {severityLevels.map(level => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Summary Length
                    </label>
                    <select
                      value={config.summaryLength}
                      onChange={(e) => updateConfig({ summaryLength: e.target.value as any })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="brief">Brief</option>
                      <option value="detailed">Detailed</option>
                      <option value="comprehensive">Comprehensive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Preview */}
              {preview && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium mb-3">Digest Preview</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Alerts:</span>
                      <div className="font-medium">{preview.alertCount}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Pipelines:</span>
                      <div className="font-medium">{preview.pipelineCount}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Deployments:</span>
                      <div className="font-medium">{preview.deploymentCount}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Est. Size:</span>
                      <div className="font-medium">{preview.estimatedSize}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                <Button
                  onClick={saveConfig}
                  disabled={loading}
                  variant="primary"
                >
                  {loading ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Save Configuration
                </Button>
                
                <Button
                  onClick={sendTestDigest}
                  disabled={sending || config.channels.length === 0}
                  variant="outline"
                >
                  {sending ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                  )}
                  Send Test Digest
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DigestManagement; 