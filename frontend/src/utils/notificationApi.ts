/**
 * Notification API Utilities
 * 
 * Provides API functions for managing notifications, webhooks, and Slack integrations.
 */

import { apiClient } from './api';

// Types
export interface NotificationRule {
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

export interface WebhookEndpoint {
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

export interface SlackWorkspace {
  id: string;
  name: string;
  domain: string;
  icon: string;
  connected: boolean;
  connectedAt?: string;
  channels: SlackChannel[];
}

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  memberCount: number;
  purpose?: string;
}

export interface SlackNotificationConfig {
  enabled: boolean;
  workspaceId: string;
  channelId: string;
  alertTypes: string[];
  threshold: 'low' | 'medium' | 'high' | 'critical';
  mentionUsers: string[];
  customMessage?: string;
}

export interface NotificationHistory {
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

export interface NotificationStats {
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

// API Functions

// Notification Rules
export const getNotificationRules = async (): Promise<NotificationRule[]> => {
  const response = await apiClient.get('/api/v1/notifications/rules');
  return response.data;
};

export const createNotificationRule = async (rule: Omit<NotificationRule, 'id' | 'createdAt' | 'triggerCount'>): Promise<NotificationRule> => {
  const response = await apiClient.post('/api/v1/notifications/rules', rule);
  return response.data;
};

export const updateNotificationRule = async (id: string, rule: Partial<NotificationRule>): Promise<NotificationRule> => {
  const response = await apiClient.put(`/api/v1/notifications/rules/${id}`, rule);
  return response.data;
};

export const deleteNotificationRule = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/v1/notifications/rules/${id}`);
};

export const testNotificationRule = async (id: string): Promise<void> => {
  await apiClient.post(`/api/v1/notifications/rules/${id}/test`);
};

// Webhook Endpoints
export const getWebhookEndpoints = async (): Promise<WebhookEndpoint[]> => {
  const response = await apiClient.get('/api/v1/notifications/webhooks');
  return response.data;
};

export const createWebhookEndpoint = async (webhook: Omit<WebhookEndpoint, 'id' | 'createdAt' | 'successCount' | 'errorCount'>): Promise<WebhookEndpoint> => {
  const response = await apiClient.post('/api/v1/notifications/webhooks', webhook);
  return response.data;
};

export const updateWebhookEndpoint = async (id: string, webhook: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> => {
  const response = await apiClient.put(`/api/v1/notifications/webhooks/${id}`, webhook);
  return response.data;
};

export const deleteWebhookEndpoint = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/v1/notifications/webhooks/${id}`);
};

export const testWebhookEndpoint = async (id: string): Promise<void> => {
  await apiClient.post(`/api/v1/notifications/webhooks/${id}/test`);
};

// Slack Integration
export const getSlackWorkspaces = async (): Promise<SlackWorkspace[]> => {
  const response = await apiClient.get('/api/v1/notifications/slack/workspaces');
  return response.data;
};

export const connectSlackWorkspace = async (code: string): Promise<SlackWorkspace> => {
  const response = await apiClient.post('/api/v1/notifications/slack/connect', { code });
  return response.data;
};

export const disconnectSlackWorkspace = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/v1/notifications/slack/workspaces/${id}`);
};

export const getSlackChannels = async (workspaceId: string): Promise<SlackChannel[]> => {
  const response = await apiClient.get(`/api/v1/notifications/slack/workspaces/${workspaceId}/channels`);
  return response.data;
};

export const getSlackNotificationConfigs = async (): Promise<SlackNotificationConfig[]> => {
  const response = await apiClient.get('/api/v1/notifications/slack/configs');
  return response.data;
};

export const createSlackNotificationConfig = async (config: SlackNotificationConfig): Promise<SlackNotificationConfig> => {
  const response = await apiClient.post('/api/v1/notifications/slack/configs', config);
  return response.data;
};

export const updateSlackNotificationConfig = async (workspaceId: string, channelId: string, config: Partial<SlackNotificationConfig>): Promise<SlackNotificationConfig> => {
  const response = await apiClient.put(`/api/v1/notifications/slack/configs/${workspaceId}/${channelId}`, config);
  return response.data;
};

export const deleteSlackNotificationConfig = async (workspaceId: string, channelId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/notifications/slack/configs/${workspaceId}/${channelId}`);
};

export const testSlackNotification = async (workspaceId: string, channelId: string): Promise<void> => {
  await apiClient.post(`/api/v1/notifications/slack/test/${workspaceId}/${channelId}`);
};

// Notification History
export const getNotificationHistory = async (params?: {
  ruleId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  limit?: number;
}): Promise<NotificationHistory[]> => {
  const response = await apiClient.get('/api/v1/notifications/history', { params });
  return response.data;
};

export const getNotificationStats = async (timeRange?: string): Promise<NotificationStats> => {
  const response = await apiClient.get('/api/v1/notifications/stats', { params: { timeRange } });
  return response.data;
};

// Notification Triggers
export const sendTestNotification = async (type: string, message: string, severity: string = 'info'): Promise<void> => {
  await apiClient.post('/api/v1/notifications/send', {
    type,
    message,
    severity,
    timestamp: new Date().toISOString(),
    metadata: { test: true }
  });
};

export const triggerAlert = async (alert: {
  type: string;
  message: string;
  severity: string;
  source: string;
  metadata?: Record<string, any>;
}): Promise<void> => {
  await apiClient.post('/api/v1/notifications/alert', alert);
};

// Notification Templates
export const getNotificationTemplates = async (): Promise<any[]> => {
  const response = await apiClient.get('/api/v1/notifications/templates');
  return response.data;
};

export const createNotificationTemplate = async (template: {
  name: string;
  type: string;
  content: string;
  variables: string[];
}): Promise<any> => {
  const response = await apiClient.post('/api/v1/notifications/templates', template);
  return response.data;
};

// Notification Preferences
export const getUserNotificationPreferences = async (): Promise<any> => {
  const response = await apiClient.get('/api/v1/notifications/preferences');
  return response.data;
};

export const updateUserNotificationPreferences = async (preferences: any): Promise<any> => {
  const response = await apiClient.put('/api/v1/notifications/preferences', preferences);
  return response.data;
};

// Bulk Operations
export const bulkUpdateNotificationRules = async (updates: Array<{
  id: string;
  changes: Partial<NotificationRule>;
}>): Promise<NotificationRule[]> => {
  const response = await apiClient.post('/api/v1/notifications/rules/bulk-update', { updates });
  return response.data;
};

export const bulkDeleteNotificationRules = async (ids: string[]): Promise<void> => {
  await apiClient.post('/api/v1/notifications/rules/bulk-delete', { ids });
};

// Health Check
export const checkNotificationHealth = async (): Promise<{
  status: string;
  services: {
    slack: { status: string; workspaces: number };
    webhook: { status: string; endpoints: number };
    email: { status: string; configured: boolean };
  };
}> => {
  const response = await apiClient.get('/api/v1/notifications/health');
  return response.data;
};