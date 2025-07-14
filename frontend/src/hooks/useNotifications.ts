/**
 * Notification Hooks
 * 
 * Custom React hooks for managing notification state and API calls.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import * as notificationApi from '@/utils/notificationApi';
import type {
  NotificationRule,
  WebhookEndpoint,
  SlackWorkspace,
  SlackNotificationConfig,
  NotificationHistory,
  NotificationStats
} from '@/utils/notificationApi';

// Query Keys
export const NOTIFICATION_QUERY_KEYS = {
  rules: ['notifications', 'rules'] as const,
  webhooks: ['notifications', 'webhooks'] as const,
  slackWorkspaces: ['notifications', 'slack', 'workspaces'] as const,
  slackConfigs: ['notifications', 'slack', 'configs'] as const,
  history: ['notifications', 'history'] as const,
  stats: ['notifications', 'stats'] as const,
  health: ['notifications', 'health'] as const,
  templates: ['notifications', 'templates'] as const,
  preferences: ['notifications', 'preferences'] as const,
};

// Notification Rules Hooks
export const useNotificationRules = () => {
  return useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.rules,
    queryFn: notificationApi.getNotificationRules,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useCreateNotificationRule = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: notificationApi.createNotificationRule,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.rules });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.stats });
      showToast('Notification rule created successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to create notification rule:', error);
      showToast('Failed to create notification rule', 'error');
    },
  });
};

export const useUpdateNotificationRule = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, rule }: { id: string; rule: Partial<NotificationRule> }) =>
      notificationApi.updateNotificationRule(id, rule),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.rules });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.stats });
      showToast('Notification rule updated successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to update notification rule:', error);
      showToast('Failed to update notification rule', 'error');
    },
  });
};

export const useDeleteNotificationRule = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: notificationApi.deleteNotificationRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.rules });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.stats });
      showToast('Notification rule deleted successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to delete notification rule:', error);
      showToast('Failed to delete notification rule', 'error');
    },
  });
};

export const useTestNotificationRule = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: notificationApi.testNotificationRule,
    onSuccess: () => {
      showToast('Test notification sent successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to send test notification:', error);
      showToast('Failed to send test notification', 'error');
    },
  });
};

// Webhook Hooks
export const useWebhookEndpoints = () => {
  return useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.webhooks,
    queryFn: notificationApi.getWebhookEndpoints,
    refetchInterval: 60000, // Refresh every minute
  });
};

export const useCreateWebhookEndpoint = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: notificationApi.createWebhookEndpoint,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.webhooks });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.stats });
      showToast('Webhook endpoint created successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to create webhook endpoint:', error);
      showToast('Failed to create webhook endpoint', 'error');
    },
  });
};

export const useUpdateWebhookEndpoint = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, webhook }: { id: string; webhook: Partial<WebhookEndpoint> }) =>
      notificationApi.updateWebhookEndpoint(id, webhook),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.webhooks });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.stats });
      showToast('Webhook endpoint updated successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to update webhook endpoint:', error);
      showToast('Failed to update webhook endpoint', 'error');
    },
  });
};

export const useDeleteWebhookEndpoint = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: notificationApi.deleteWebhookEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.webhooks });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.stats });
      showToast('Webhook endpoint deleted successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to delete webhook endpoint:', error);
      showToast('Failed to delete webhook endpoint', 'error');
    },
  });
};

export const useTestWebhookEndpoint = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: notificationApi.testWebhookEndpoint,
    onSuccess: () => {
      showToast('Webhook test completed successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to test webhook:', error);
      showToast('Webhook test failed', 'error');
    },
  });
};

// Slack Integration Hooks
export const useSlackWorkspaces = () => {
  return useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.slackWorkspaces,
    queryFn: notificationApi.getSlackWorkspaces,
    refetchInterval: 300000, // Refresh every 5 minutes
  });
};

export const useConnectSlackWorkspace = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: notificationApi.connectSlackWorkspace,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.slackWorkspaces });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.stats });
      showToast('Slack workspace connected successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to connect Slack workspace:', error);
      showToast('Failed to connect Slack workspace', 'error');
    },
  });
};

export const useDisconnectSlackWorkspace = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: notificationApi.disconnectSlackWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.slackWorkspaces });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.slackConfigs });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.stats });
      showToast('Slack workspace disconnected successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to disconnect Slack workspace:', error);
      showToast('Failed to disconnect Slack workspace', 'error');
    },
  });
};

export const useSlackNotificationConfigs = () => {
  return useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.slackConfigs,
    queryFn: notificationApi.getSlackNotificationConfigs,
    refetchInterval: 60000, // Refresh every minute
  });
};

export const useCreateSlackNotificationConfig = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: notificationApi.createSlackNotificationConfig,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.slackConfigs });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.stats });
      showToast('Slack notification configuration created successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to create Slack notification configuration:', error);
      showToast('Failed to create Slack notification configuration', 'error');
    },
  });
};

export const useUpdateSlackNotificationConfig = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ workspaceId, channelId, config }: { 
      workspaceId: string; 
      channelId: string; 
      config: Partial<SlackNotificationConfig> 
    }) =>
      notificationApi.updateSlackNotificationConfig(workspaceId, channelId, config),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.slackConfigs });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.stats });
      showToast('Slack notification configuration updated successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to update Slack notification configuration:', error);
      showToast('Failed to update Slack notification configuration', 'error');
    },
  });
};

export const useTestSlackNotification = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ workspaceId, channelId }: { workspaceId: string; channelId: string }) =>
      notificationApi.testSlackNotification(workspaceId, channelId),
    onSuccess: () => {
      showToast('Slack test notification sent successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to send Slack test notification:', error);
      showToast('Failed to send Slack test notification', 'error');
    },
  });
};

// History and Stats Hooks
export const useNotificationHistory = (params?: {
  ruleId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: [...NOTIFICATION_QUERY_KEYS.history, params],
    queryFn: () => notificationApi.getNotificationHistory(params),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useNotificationStats = (timeRange?: string) => {
  return useQuery({
    queryKey: [...NOTIFICATION_QUERY_KEYS.stats, timeRange],
    queryFn: () => notificationApi.getNotificationStats(timeRange),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

// Health Check Hook
export const useNotificationHealth = () => {
  return useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.health,
    queryFn: notificationApi.checkNotificationHealth,
    refetchInterval: 60000, // Refresh every minute
  });
};

// Templates Hook
export const useNotificationTemplates = () => {
  return useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.templates,
    queryFn: notificationApi.getNotificationTemplates,
    refetchInterval: 300000, // Refresh every 5 minutes
  });
};

// Preferences Hook
export const useNotificationPreferences = () => {
  return useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.preferences,
    queryFn: notificationApi.getUserNotificationPreferences,
    refetchInterval: 300000, // Refresh every 5 minutes
  });
};

export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: notificationApi.updateUserNotificationPreferences,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.preferences });
      showToast('Notification preferences updated successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to update notification preferences:', error);
      showToast('Failed to update notification preferences', 'error');
    },
  });
};

// Bulk Operations Hooks
export const useBulkUpdateNotificationRules = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: notificationApi.bulkUpdateNotificationRules,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.rules });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.stats });
      showToast(`${data.length} notification rules updated successfully`, 'success');
    },
    onError: (error) => {
      console.error('Failed to bulk update notification rules:', error);
      showToast('Failed to update notification rules', 'error');
    },
  });
};

export const useBulkDeleteNotificationRules = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: notificationApi.bulkDeleteNotificationRules,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.rules });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.stats });
      showToast(`${variables.length} notification rules deleted successfully`, 'success');
    },
    onError: (error) => {
      console.error('Failed to bulk delete notification rules:', error);
      showToast('Failed to delete notification rules', 'error');
    },
  });
};

// Utility Hooks
export const useSendTestNotification = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ type, message, severity }: { type: string; message: string; severity?: string }) =>
      notificationApi.sendTestNotification(type, message, severity),
    onSuccess: () => {
      showToast('Test notification sent successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to send test notification:', error);
      showToast('Failed to send test notification', 'error');
    },
  });
};

export const useTriggerAlert = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: notificationApi.triggerAlert,
    onSuccess: () => {
      showToast('Alert triggered successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to trigger alert:', error);
      showToast('Failed to trigger alert', 'error');
    },
  });
};