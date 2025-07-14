import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  categoryId?: string;
  sound?: string;
  badge?: number;
  priority?: 'default' | 'low' | 'high' | 'max';
  channelId?: string;
}

export interface NotificationAction {
  identifier: string;
  buttonTitle: string;
  options?: {
    foreground?: boolean;
    destructive?: boolean;
    authenticationRequired?: boolean;
  };
}

export interface NotificationCategory {
  identifier: string;
  actions: NotificationAction[];
  options?: {
    customDismissAction?: boolean;
    allowInCarPlay?: boolean;
    showTitle?: boolean;
    showSubtitle?: boolean;
  };
}

class PushNotificationService {
  private initialized = false;
  private pushToken: string | null = null;

  // Configure notification handling behavior
  constructor() {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const { data } = notification.request.content;
        
        return {
          shouldShowAlert: true,
          shouldPlaySound: data?.silent !== true,
          shouldSetBadge: true,
          priority: data?.priority || Notifications.AndroidNotificationPriority.DEFAULT,
        };
      },
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Register notification categories
      await this.registerNotificationCategories();

      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      // Request permissions and get push token
      await this.requestPermissions();
      await this.registerForPushNotifications();

      this.initialized = true;
      console.log('Push notification service initialized');
    } catch (error) {
      console.error('Failed to initialize push notification service:', error);
      throw error;
    }
  }

  private async registerNotificationCategories(): Promise<void> {
    const categories: NotificationCategory[] = [
      {
        identifier: 'ALERT_CRITICAL',
        actions: [
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
        ],
      },
      {
        identifier: 'DEPLOYMENT',
        actions: [
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
        ],
      },
      {
        identifier: 'TEAM_UPDATE',
        actions: [
          {
            identifier: 'VIEW_UPDATE',
            buttonTitle: 'View',
            options: { foreground: true },
          },
          {
            identifier: 'DISMISS',
            buttonTitle: 'Dismiss',
            options: { foreground: false },
          },
        ],
      },
    ];

    await Notifications.setNotificationCategoryAsync(
      categories[0].identifier,
      categories[0].actions,
      categories[0].options
    );

    await Notifications.setNotificationCategoryAsync(
      categories[1].identifier,
      categories[1].actions,
      categories[1].options
    );

    await Notifications.setNotificationCategoryAsync(
      categories[2].identifier,
      categories[2].actions,
      categories[2].options
    );
  }

  private async setupAndroidChannels(): Promise<void> {
    await Notifications.setNotificationChannelAsync('critical', {
      name: 'Critical Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF0000',
      sound: 'notification-sound.wav',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('alerts', {
      name: 'System Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF9800',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('deployments', {
      name: 'Deployments',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      enableLights: false,
      enableVibrate: false,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('team_updates', {
      name: 'Team Updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      enableLights: false,
      enableVibrate: false,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('silent', {
      name: 'Background Updates',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      enableLights: false,
      enableVibrate: false,
      showBadge: false,
    });
  }

  async requestPermissions(): Promise<boolean> {
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Permission to receive push notifications was denied');
        return false;
      }

      return true;
    } else {
      console.warn('Push notifications are not supported on simulator/emulator');
      return false;
    }
  }

  async registerForPushNotifications(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      // Get the push notification token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      this.pushToken = tokenData.data;
      
      // Store the token locally
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, this.pushToken);

      // Send token to backend
      await this.sendTokenToBackend(this.pushToken);

      console.log('Push token registered:', this.pushToken);
      return this.pushToken;
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
      return null;
    }
  }

  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      // Replace with actual API endpoint
      const response = await fetch('/api/v1/push-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)}`,
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS,
          deviceId: Constants.sessionId,
          appVersion: Constants.expoConfig?.version,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register push token with backend');
      }

      console.log('Push token registered with backend');
    } catch (error) {
      console.error('Failed to send push token to backend:', error);
      // Don't throw here - token registration can be retried later
    }
  }

  async scheduleLocalNotification(notification: PushNotificationData): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        categoryIdentifier: notification.categoryId,
        sound: notification.sound || 'default',
        badge: notification.badge,
        priority: this.mapPriorityToExpo(notification.priority),
      },
      trigger: null, // Send immediately
    });

    return notificationId;
  }

  private mapPriorityToExpo(priority?: string): Notifications.AndroidNotificationPriority {
    switch (priority) {
      case 'low':
        return Notifications.AndroidNotificationPriority.LOW;
      case 'high':
        return Notifications.AndroidNotificationPriority.HIGH;
      case 'max':
        return Notifications.AndroidNotificationPriority.MAX;
      default:
        return Notifications.AndroidNotificationPriority.DEFAULT;
    }
  }

  // Listen for notification responses (when user taps notification or action button)
  addNotificationResponseListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  // Listen for notifications received while app is foregrounded
  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  async getPushToken(): Promise<string | null> {
    if (this.pushToken) {
      return this.pushToken;
    }

    // Try to get from storage
    try {
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
      if (storedToken) {
        this.pushToken = storedToken;
        return storedToken;
      }
    } catch (error) {
      console.error('Failed to get push token from storage:', error);
    }

    return null;
  }

  async refreshToken(): Promise<string | null> {
    try {
      // Clear existing token
      this.pushToken = null;
      await AsyncStorage.removeItem(STORAGE_KEYS.PUSH_TOKEN);

      // Register for new token
      return await this.registerForPushNotifications();
    } catch (error) {
      console.error('Failed to refresh push token:', error);
      return null;
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  async clearNotification(notificationId: string): Promise<void> {
    await Notifications.dismissNotificationAsync(notificationId);
  }

  async getDeliveredNotifications(): Promise<Notifications.Notification[]> {
    return await Notifications.getPresentedNotificationsAsync();
  }

  // Test notification for debugging
  async sendTestNotification(): Promise<void> {
    await this.scheduleLocalNotification({
      title: 'Test Notification',
      body: 'This is a test notification from OpsSight',
      data: { type: 'test' },
      categoryId: 'TEAM_UPDATE',
    });
  }
}

export const pushNotificationService = new PushNotificationService();