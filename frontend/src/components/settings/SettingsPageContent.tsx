'use client';

import { useState, useEffect } from 'react';
import { 
  CogIcon, 
  SwatchIcon,
  BellIcon,
  CodeBracketIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useSettings } from '@/contexts/SettingsContext';
import { ThemeSelector } from '@/components/settings/ThemeSelector';
import { ToggleSwitch } from '@/components/settings/ToggleSwitch';
import { Toast } from '@/components/settings/Toast';

/**
 * Settings Page Content - Simplified version matching current types
 */
export function SettingsPageContent() {
  const { panelVisibility, setPanelVisibility, refreshInterval, setRefreshInterval, notificationPrefs, setNotificationPrefs } = useSettings();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });
  
  // Mock settings for compatibility
  const settings = {
    notifications: {
      ...notificationPrefs,
      emailNotifications: true,
      slackNotifications: true,
      webhookNotifications: false,
      pushNotifications: true,
      smsNotifications: false,
      deploymentAlerts: true,
      performanceAlerts: true,
      securityAlerts: true,
      digestFrequency: 'daily'
    },
    integrations: {
      slack: false,
      github: true,
      githubEnabled: true,
      githubRepositories: ['repo1', 'repo2'],
      slackEnabled: false,
      slackChannel: '#general',
      jiraEnabled: false,
      jiraProject: '',
      aws: false,
      azure: false,
      gcp: false,
      webhooksEnabled: true,
      apiAccess: true
    },
    theme: 'dark'
  };
  const loading = false;
  const updateSettings = async (newSettings: any) => {
    // Update appropriate context values based on the newSettings
    if (newSettings.notifications) {
      setNotificationPrefs(newSettings.notifications);
    }
  };
  const resetSettings = async () => {
    // Reset to defaults
    setNotificationPrefs({ muteAlerts: false, alertThreshold: 1 });
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setToast({ message, type, isVisible: true });
  };

  const hideNotification = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  const handleNotificationToggle = async (key: string, value: boolean) => {
    if (!settings?.notifications) return;
    
    try {
      await updateSettings({
        notifications: {
          ...settings.notifications,
          [key]: value
        }
      });
      showNotification('Notification settings updated', 'success');
    } catch (error) {
      showNotification('Failed to update settings', 'error');
    }
  };

  const handleIntegrationToggle = async (key: string, value: boolean) => {
    if (!settings?.integrations) return;
    
    try {
      await updateSettings({
        integrations: {
          ...settings.integrations,
          [key]: value
        }
      });
      showNotification('Integration settings updated', 'success');
    } catch (error) {
      showNotification('Failed to update settings', 'error');
    }
  };

  const handleReset = async () => {
    try {
      await resetSettings();
      showNotification('Settings reset to defaults', 'success');
    } catch (error) {
      showNotification('Failed to reset settings', 'error');
    }
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-8"></div>
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <CogIcon className="h-8 w-8 text-blue-600" />
            Settings
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Configure your DevOps dashboard preferences and integrations.
          </p>
        </div>

        <div className="space-y-8">
          {/* Theme Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <SwatchIcon className="h-5 w-5 text-purple-600" />
                Theme & Appearance
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Customize the look and feel of your dashboard.
              </p>
            </div>
            <div className="p-6">
              <ThemeSelector />
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <BellIcon className="h-5 w-5 text-yellow-600" />
                Notifications
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Control when and how you receive notifications.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <ToggleSwitch
                id="email-notifications"
                label="Email Notifications"
                description="Receive important updates and alerts via email"
                checked={settings.notifications?.emailNotifications || false}
                onChange={(checked) => handleNotificationToggle('emailNotifications', checked)}
              />
              <ToggleSwitch
                id="push-notifications"
                label="Push Notifications"
                description="Get instant alerts in your browser"
                checked={settings.notifications?.pushNotifications || false}
                onChange={(checked) => handleNotificationToggle('pushNotifications', checked)}
              />
              <ToggleSwitch
                id="deployment-alerts"
                label="Deployment Alerts"
                description="Notifications for deployment status changes"
                checked={settings.notifications?.deploymentAlerts || false}
                onChange={(checked) => handleNotificationToggle('deploymentAlerts', checked)}
              />
              <ToggleSwitch
                id="performance-alerts"
                label="Performance Alerts"
                description="Alerts for performance threshold violations"
                checked={settings.notifications?.performanceAlerts || false}
                onChange={(checked) => handleNotificationToggle('performanceAlerts', checked)}
              />
              <ToggleSwitch
                id="security-alerts"
                label="Security Alerts"
                description="Important security-related notifications"
                checked={settings.notifications?.securityAlerts || false}
                onChange={(checked) => handleNotificationToggle('securityAlerts', checked)}
              />
            </div>
          </div>

          {/* Integration Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <CodeBracketIcon className="h-5 w-5 text-green-600" />
                Integrations
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Connect your DevOps tools and services.
              </p>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">GitHub</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Repository management and code tracking</p>
                  </div>
                  <ToggleSwitch
                    id="github-integration"
                    label=""
                    description=""
                    checked={settings.integrations?.githubEnabled || false}
                    onChange={(checked) => handleIntegrationToggle('githubEnabled', checked)}
                  />
                </div>
                
                {settings.integrations?.githubEnabled && (
                  <div className="ml-0 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {settings.integrations.githubRepositories?.length || 0} repositories connected
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Slack</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Team communication and notifications</p>
                  </div>
                  <ToggleSwitch
                    id="slack-integration"
                    label=""
                    description=""
                    checked={settings.integrations?.slackEnabled || false}
                    onChange={(checked) => handleIntegrationToggle('slackEnabled', checked)}
                  />
                </div>
                
                {settings.integrations?.slackEnabled && (
                  <div className="ml-0 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Channel: {settings.integrations.slackChannel || 'Not configured'}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">JIRA</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Issue tracking and project management</p>
                  </div>
                  <ToggleSwitch
                    id="jira-integration"
                    label=""
                    description=""
                    checked={settings.integrations?.jiraEnabled || false}
                    onChange={(checked) => handleIntegrationToggle('jiraEnabled', checked)}
                  />
                </div>
                
                {settings.integrations?.jiraEnabled && (
                  <div className="ml-0 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Project: {settings.integrations.jiraProject || 'Not configured'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reset Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <ArrowPathIcon className="h-5 w-5 text-red-600" />
                Reset Settings
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Reset all settings to their default values.
              </p>
            </div>
            <div className="p-6">
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Reset to Defaults
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                This action cannot be undone. All your custom settings will be lost.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideNotification}
      />
    </div>
  );
} 