import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { pushNotificationService } from '../services/PushNotificationService';
import { useAppDispatch, useAppSelector } from '../hooks';
import { addNotification, setPushToken, setLastSync } from '../store/slices/notificationSlice';
import { NOTIFICATION_TYPES } from '../constants';

interface NotificationContextType {
  isInitialized: boolean;
  pushToken: string | null;
  permissionStatus: Notifications.PermissionStatus | null;
  requestPermissions: () => Promise<boolean>;
  refreshToken: () => Promise<string | null>;
  scheduleTestNotification: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  setBadgeCount: (count: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { isEnabled } = useAppSelector(state => state.notifications);
  const { isAuthenticated } = useAppSelector(state => state.auth);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [pushToken, setPushTokenState] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | null>(null);

  useEffect(() => {
    if (isAuthenticated && isEnabled) {
      initializeNotifications();
    }
  }, [isAuthenticated, isEnabled]);

  const initializeNotifications = async () => {
    try {
      // Initialize the push notification service
      await pushNotificationService.initialize();
      
      // Get current permission status
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
      
      // Get push token
      const token = await pushNotificationService.getPushToken();
      if (token) {
        setPushTokenState(token);
        dispatch(setPushToken(token));
      }

      // Set up notification listeners
      setupNotificationListeners();
      
      setIsInitialized(true);
      console.log('Notification provider initialized');
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  };

  const setupNotificationListeners = () => {
    // Listen for notifications received while app is foregrounded
    const notificationListener = pushNotificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        
        // Add to notification store
        const notificationData = {
          id: notification.request.identifier,
          title: notification.request.content.title || 'Notification',
          body: notification.request.content.body || '',
          type: notification.request.content.data?.type || 'info',
          timestamp: Date.now(),
          read: false,
          actionUrl: notification.request.content.data?.actionUrl,
          teamId: notification.request.content.data?.teamId,
          metadata: notification.request.content.data,
        };
        
        dispatch(addNotification(notificationData));
      }
    );

    // Listen for notification responses (user interactions)
    const responseListener = pushNotificationService.addNotificationResponseListener(
      (response) => {
        console.log('Notification response:', response);
        
        const { notification, actionIdentifier } = response;
        const notificationData = notification.request.content.data;
        
        handleNotificationAction(actionIdentifier, notificationData);
      }
    );

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  };

  const handleNotificationAction = async (actionIdentifier: string, data: any) => {
    console.log('Handling notification action:', actionIdentifier, data);
    
    switch (actionIdentifier) {
      case 'ACKNOWLEDGE':
        if (data?.alertId) {
          // Handle alert acknowledgment
          try {
            const response = await fetch(`/api/v1/alerts/${data.alertId}/acknowledge`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
            });
            
            if (response.ok) {
              console.log('Alert acknowledged via notification');
            }
          } catch (error) {
            console.error('Failed to acknowledge alert:', error);
          }
        }
        break;
        
      case 'VIEW_DETAILS':
      case 'VIEW_UPDATE':
      case 'VIEW_LOGS':
        // These would typically navigate to specific screens
        // Implementation depends on navigation structure
        console.log('Navigate to details:', data);
        break;
        
      case 'ROLLBACK':
        if (data?.deploymentId) {
          // Handle deployment rollback
          console.log('Initiating rollback for deployment:', data.deploymentId);
        }
        break;
        
      case 'DISMISS':
        // Just dismiss the notification
        break;
        
      default:
        // Default action (usually opening the app)
        console.log('Default notification action');
        break;
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    try {
      const granted = await pushNotificationService.requestPermissions();
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
      
      if (granted) {
        const token = await pushNotificationService.registerForPushNotifications();
        if (token) {
          setPushTokenState(token);
          dispatch(setPushToken(token));
        }
      }
      
      return granted;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  };

  const refreshToken = async (): Promise<string | null> => {
    try {
      const newToken = await pushNotificationService.refreshToken();
      if (newToken) {
        setPushTokenState(newToken);
        dispatch(setPushToken(newToken));
      }
      return newToken;
    } catch (error) {
      console.error('Failed to refresh push token:', error);
      return null;
    }
  };

  const scheduleTestNotification = async (): Promise<void> => {
    try {
      await pushNotificationService.sendTestNotification();
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  };

  const clearAllNotifications = async (): Promise<void> => {
    try {
      await pushNotificationService.clearAllNotifications();
      await pushNotificationService.clearBadge();
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  const setBadgeCount = async (count: number): Promise<void> => {
    try {
      await pushNotificationService.setBadgeCount(count);
    } catch (error) {
      console.error('Failed to set badge count:', error);
    }
  };

  // Update badge count when unread notifications change
  const { unreadCount } = useAppSelector(state => state.notifications);
  useEffect(() => {
    if (isInitialized) {
      setBadgeCount(unreadCount);
    }
  }, [unreadCount, isInitialized]);

  return (
    <NotificationContext.Provider
      value={{
        isInitialized,
        pushToken,
        permissionStatus,
        requestPermissions,
        refreshToken,
        scheduleTestNotification,
        clearAllNotifications,
        setBadgeCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};