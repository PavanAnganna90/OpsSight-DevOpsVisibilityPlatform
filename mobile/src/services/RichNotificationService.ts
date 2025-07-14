import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { pushNotificationService } from './PushNotificationService';

export interface RichNotificationAction {
  identifier: string;
  title: string;
  options?: {
    foreground?: boolean;
    destructive?: boolean;
    authenticationRequired?: boolean;
  };
}

export interface RichNotificationData {
  title: string;
  body: string;
  categoryId: string;
  data?: Record<string, any>;
  actions: RichNotificationAction[];
  sound?: string;
  badge?: number;
  priority?: 'default' | 'low' | 'high' | 'max';
  imageUrl?: string;
  attachments?: Array<{
    url: string;
    type: 'image' | 'video' | 'audio';
  }>;
}

class RichNotificationService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize the base push notification service
      await pushNotificationService.initialize();

      // Set up enhanced notification categories for rich notifications
      await this.setupRichNotificationCategories();

      this.initialized = true;
      console.log('Rich notification service initialized');
    } catch (error) {
      console.error('Failed to initialize rich notification service:', error);
      throw error;
    }
  }

  private async setupRichNotificationCategories(): Promise<void> {
    // Alert categories with rich actions
    await Notifications.setNotificationCategoryAsync('ALERT_CRITICAL', [
      {
        identifier: 'ACKNOWLEDGE',
        buttonTitle: 'Acknowledge',
        options: { foreground: true },
      },
      {
        identifier: 'ESCALATE',
        buttonTitle: 'Escalate',
        options: { foreground: true, destructive: false },
      },
      {
        identifier: 'MUTE_ALERT',
        buttonTitle: 'Mute 1h',
        options: { foreground: false },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('ALERT_WARNING', [
      {
        identifier: 'ACKNOWLEDGE',
        buttonTitle: 'Acknowledge',
        options: { foreground: true },
      },
      {
        identifier: 'VIEW_DETAILS',
        buttonTitle: 'View Details',
        options: { foreground: true },
      },
      {
        identifier: 'DISMISS',
        buttonTitle: 'Dismiss',
        options: { foreground: false },
      },
    ]);

    // Deployment categories
    await Notifications.setNotificationCategoryAsync('DEPLOYMENT_SUCCESS', [
      {
        identifier: 'VIEW_LOGS',
        buttonTitle: 'View Logs',
        options: { foreground: true },
      },
      {
        identifier: 'RUN_TESTS',
        buttonTitle: 'Run Tests',
        options: { foreground: false },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('DEPLOYMENT_FAILED', [
      {
        identifier: 'VIEW_LOGS',
        buttonTitle: 'View Logs',
        options: { foreground: true },
      },
      {
        identifier: 'ROLLBACK',
        buttonTitle: 'Rollback',
        options: { foreground: true, destructive: true, authenticationRequired: true },
      },
      {
        identifier: 'RETRY',
        buttonTitle: 'Retry',
        options: { foreground: true },
      },
    ]);

    // Team collaboration categories
    await Notifications.setNotificationCategoryAsync('TEAM_COLLABORATION', [
      {
        identifier: 'APPROVE',
        buttonTitle: 'Approve',
        options: { foreground: true },
      },
      {
        identifier: 'REJECT',
        buttonTitle: 'Reject',
        options: { foreground: false },
      },
      {
        identifier: 'VIEW_REQUEST',
        buttonTitle: 'View Request',
        options: { foreground: true },
      },
    ]);

    // Security alert categories
    await Notifications.setNotificationCategoryAsync('SECURITY_ALERT', [
      {
        identifier: 'INVESTIGATE',
        buttonTitle: 'Investigate',
        options: { foreground: true },
      },
      {
        identifier: 'BLOCK_IP',
        buttonTitle: 'Block IP',
        options: { foreground: false, destructive: true },
      },
      {
        identifier: 'FALSE_POSITIVE',
        buttonTitle: 'False Positive',
        options: { foreground: false },
      },
    ]);

    // Infrastructure alerts
    await Notifications.setNotificationCategoryAsync('INFRASTRUCTURE_ALERT', [
      {
        identifier: 'SCALE_UP',
        buttonTitle: 'Scale Up',
        options: { foreground: false },
      },
      {
        identifier: 'RESTART_SERVICE',
        buttonTitle: 'Restart',
        options: { foreground: false, destructive: true },
      },
      {
        identifier: 'VIEW_METRICS',
        buttonTitle: 'View Metrics',
        options: { foreground: true },
      },
    ]);

    // Cost optimization
    await Notifications.setNotificationCategoryAsync('COST_ALERT', [
      {
        identifier: 'VIEW_BREAKDOWN',
        buttonTitle: 'View Breakdown',
        options: { foreground: true },
      },
      {
        identifier: 'OPTIMIZE_NOW',
        buttonTitle: 'Optimize Now',
        options: { foreground: true },
      },
      {
        identifier: 'SET_BUDGET',
        buttonTitle: 'Set Budget',
        options: { foreground: true },
      },
    ]);

    console.log('Rich notification categories setup complete');
  }

  async sendRichNotification(notification: RichNotificationData): Promise<string> {
    try {
      // Enhanced payload with rich content
      const enhancedData = {
        ...notification.data,
        actions: notification.actions,
        category: notification.categoryId,
        interactive: true,
        timestamp: new Date().toISOString(),
      };

      // Add image attachment if provided
      const attachments: any = {};
      if (notification.imageUrl) {
        attachments.image = notification.imageUrl;
      }

      if (notification.attachments) {
        notification.attachments.forEach((attachment, index) => {
          attachments[`attachment_${index}`] = attachment.url;
        });
      }

      const notificationRequest: Notifications.NotificationRequestInput = {
        content: {
          title: notification.title,
          body: notification.body,
          data: enhancedData,
          categoryIdentifier: notification.categoryId,
          sound: notification.sound || 'default',
          badge: notification.badge,
          attachments: Object.keys(attachments).length > 0 ? attachments : undefined,
        },
        trigger: null, // Send immediately
      };

      // Add platform-specific enhancements
      if (Platform.OS === 'ios') {
        // iOS-specific rich content
        if (notification.imageUrl) {
          notificationRequest.content.attachments = [
            {
              url: notification.imageUrl,
              options: {
                typeHint: 'public.jpeg',
                thumbnailHidden: false,
                thumbnailClippingRect: { x: 0, y: 0, width: 1, height: 1 },
              },
            },
          ];
        }
      } else if (Platform.OS === 'android') {
        // Android-specific enhancements
        enhancedData.android = {
          channelId: this.getAndroidChannelId(notification.categoryId),
          priority: this.mapPriorityToAndroid(notification.priority),
          largeIcon: notification.imageUrl,
          bigPicture: notification.imageUrl,
          style: notification.imageUrl ? 'bigpicture' : 'bigtext',
        };
      }

      const notificationId = await Notifications.scheduleNotificationAsync(notificationRequest);
      
      console.log('Rich notification sent:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Failed to send rich notification:', error);
      throw error;
    }
  }

  private getAndroidChannelId(categoryId: string): string {
    switch (categoryId) {
      case 'ALERT_CRITICAL':
      case 'SECURITY_ALERT':
        return 'critical';
      case 'ALERT_WARNING':
      case 'INFRASTRUCTURE_ALERT':
        return 'alerts';
      case 'DEPLOYMENT_SUCCESS':
      case 'DEPLOYMENT_FAILED':
        return 'deployments';
      case 'TEAM_COLLABORATION':
        return 'team_updates';
      case 'COST_ALERT':
        return 'alerts';
      default:
        return 'default';
    }
  }

  private mapPriorityToAndroid(priority?: string): 'default' | 'low' | 'high' | 'max' {
    switch (priority) {
      case 'low':
        return 'low';
      case 'high':
        return 'high';
      case 'max':
        return 'max';
      default:
        return 'default';
    }
  }

  // Predefined rich notification templates
  async sendCriticalAlert(alertData: {
    title: string;
    body: string;
    alertId: string;
    severity: string;
    source: string;
    imageUrl?: string;
  }): Promise<string> {
    return this.sendRichNotification({
      title: `🚨 ${alertData.title}`,
      body: alertData.body,
      categoryId: 'ALERT_CRITICAL',
      data: {
        type: 'critical_alert',
        alert_id: alertData.alertId,
        severity: alertData.severity,
        source: alertData.source,
        action_url: `/alerts/${alertData.alertId}`,
      },
      actions: [
        { identifier: 'ACKNOWLEDGE', title: 'Acknowledge', options: { foreground: true } },
        { identifier: 'ESCALATE', title: 'Escalate', options: { foreground: true } },
        { identifier: 'MUTE_ALERT', title: 'Mute 1h', options: { foreground: false } },
      ],
      priority: 'max',
      sound: 'critical_alert.wav',
      imageUrl: alertData.imageUrl,
    });
  }

  async sendDeploymentNotification(deploymentData: {
    title: string;
    body: string;
    deploymentId: string;
    status: 'success' | 'failed' | 'in_progress';
    environment: string;
    imageUrl?: string;
  }): Promise<string> {
    const categoryId = deploymentData.status === 'success' ? 'DEPLOYMENT_SUCCESS' : 'DEPLOYMENT_FAILED';
    const emoji = deploymentData.status === 'success' ? '✅' : '❌';

    return this.sendRichNotification({
      title: `${emoji} ${deploymentData.title}`,
      body: deploymentData.body,
      categoryId,
      data: {
        type: 'deployment',
        deployment_id: deploymentData.deploymentId,
        status: deploymentData.status,
        environment: deploymentData.environment,
        action_url: `/deployments/${deploymentData.deploymentId}`,
      },
      actions: deploymentData.status === 'success' ? [
        { identifier: 'VIEW_LOGS', title: 'View Logs', options: { foreground: true } },
        { identifier: 'RUN_TESTS', title: 'Run Tests', options: { foreground: false } },
      ] : [
        { identifier: 'VIEW_LOGS', title: 'View Logs', options: { foreground: true } },
        { identifier: 'ROLLBACK', title: 'Rollback', options: { foreground: true, destructive: true, authenticationRequired: true } },
        { identifier: 'RETRY', title: 'Retry', options: { foreground: true } },
      ],
      priority: deploymentData.status === 'failed' ? 'high' : 'default',
      imageUrl: deploymentData.imageUrl,
    });
  }

  async sendTeamCollaborationRequest(collaborationData: {
    title: string;
    body: string;
    requestId: string;
    requestingTeam: string;
    targetTeam: string;
  }): Promise<string> {
    return this.sendRichNotification({
      title: `🤝 ${collaborationData.title}`,
      body: collaborationData.body,
      categoryId: 'TEAM_COLLABORATION',
      data: {
        type: 'team_collaboration',
        request_id: collaborationData.requestId,
        requesting_team: collaborationData.requestingTeam,
        target_team: collaborationData.targetTeam,
        action_url: `/teams/collaborations/${collaborationData.requestId}`,
      },
      actions: [
        { identifier: 'APPROVE', title: 'Approve', options: { foreground: true } },
        { identifier: 'REJECT', title: 'Reject', options: { foreground: false } },
        { identifier: 'VIEW_REQUEST', title: 'View Request', options: { foreground: true } },
      ],
      priority: 'high',
    });
  }

  async sendSecurityAlert(securityData: {
    title: string;
    body: string;
    alertId: string;
    severity: string;
    sourceIp?: string;
    threatType: string;
  }): Promise<string> {
    return this.sendRichNotification({
      title: `🛡️ ${securityData.title}`,
      body: securityData.body,
      categoryId: 'SECURITY_ALERT',
      data: {
        type: 'security_alert',
        alert_id: securityData.alertId,
        severity: securityData.severity,
        source_ip: securityData.sourceIp,
        threat_type: securityData.threatType,
        action_url: `/security/alerts/${securityData.alertId}`,
      },
      actions: [
        { identifier: 'INVESTIGATE', title: 'Investigate', options: { foreground: true } },
        { identifier: 'BLOCK_IP', title: 'Block IP', options: { foreground: false, destructive: true } },
        { identifier: 'FALSE_POSITIVE', title: 'False Positive', options: { foreground: false } },
      ],
      priority: 'max',
      sound: 'security_alert.wav',
    });
  }

  async sendInfrastructureAlert(infraData: {
    title: string;
    body: string;
    resourceId: string;
    resourceType: string;
    metricType: string;
    currentValue: number;
    threshold: number;
  }): Promise<string> {
    return this.sendRichNotification({
      title: `⚠️ ${infraData.title}`,
      body: infraData.body,
      categoryId: 'INFRASTRUCTURE_ALERT',
      data: {
        type: 'infrastructure_alert',
        resource_id: infraData.resourceId,
        resource_type: infraData.resourceType,
        metric_type: infraData.metricType,
        current_value: infraData.currentValue,
        threshold: infraData.threshold,
        action_url: `/infrastructure/${infraData.resourceId}`,
      },
      actions: [
        { identifier: 'SCALE_UP', title: 'Scale Up', options: { foreground: false } },
        { identifier: 'RESTART_SERVICE', title: 'Restart', options: { foreground: false, destructive: true } },
        { identifier: 'VIEW_METRICS', title: 'View Metrics', options: { foreground: true } },
      ],
      priority: 'high',
    });
  }

  async sendCostAlert(costData: {
    title: string;
    body: string;
    currentSpend: number;
    budget: number;
    period: string;
    topServices: string[];
  }): Promise<string> {
    return this.sendRichNotification({
      title: `💰 ${costData.title}`,
      body: costData.body,
      categoryId: 'COST_ALERT',
      data: {
        type: 'cost_alert',
        current_spend: costData.currentSpend,
        budget: costData.budget,
        period: costData.period,
        top_services: costData.topServices,
        action_url: '/costs/optimization',
      },
      actions: [
        { identifier: 'VIEW_BREAKDOWN', title: 'View Breakdown', options: { foreground: true } },
        { identifier: 'OPTIMIZE_NOW', title: 'Optimize Now', options: { foreground: true } },
        { identifier: 'SET_BUDGET', title: 'Set Budget', options: { foreground: true } },
      ],
      priority: 'high',
    });
  }

  // Handle notification response (when user taps action button)
  setupNotificationResponseHandler(
    handler: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener((response) => {
      const { actionIdentifier, notification } = response;
      const notificationData = notification.request.content.data;

      console.log('Notification action received:', {
        actionIdentifier,
        notificationId: notification.request.identifier,
        data: notificationData,
      });

      // Call the provided handler
      handler(response);
    });
  }

  // Get notification interaction analytics
  async getNotificationAnalytics(): Promise<{
    totalSent: number;
    totalInteractions: number;
    interactionRate: number;
    actionBreakdown: Record<string, number>;
  }> {
    // This would typically fetch from backend analytics
    // For now, return mock data
    return {
      totalSent: 150,
      totalInteractions: 89,
      interactionRate: 0.593,
      actionBreakdown: {
        ACKNOWLEDGE: 45,
        VIEW_DETAILS: 23,
        ESCALATE: 8,
        APPROVE: 13,
        DISMISS: 0,
      },
    };
  }
}

export const richNotificationService = new RichNotificationService();