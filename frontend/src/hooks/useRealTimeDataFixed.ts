/**
 * Fixed Real-time Data Hooks with proper subscription management
 * Prevents memory leaks and handler conflicts between multiple components
 */

import { useState, useEffect, useCallback, useRef, startTransition, useMemo } from 'react';
import { WebSocketMessage, metricsWS, notificationsWS } from '../services/websocketServiceRefactored';
import { useToast } from '@/contexts/ToastContext';

// Subscription manager for handling multiple component subscriptions
class SubscriptionManager {
  private static instance: SubscriptionManager;
  private subscriptions: Map<string, Set<string>> = new Map(); // service -> set of subscription IDs
  private handlers: Map<string, (message: WebSocketMessage) => void> = new Map(); // subscription ID -> handler

  private constructor() {}

  static getInstance(): SubscriptionManager {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager();
    }
    return SubscriptionManager.instance;
  }

  subscribe(serviceName: string, subscriptionId: string, handler: (message: WebSocketMessage) => void): () => void {
    // Add subscription
    if (!this.subscriptions.has(serviceName)) {
      this.subscriptions.set(serviceName, new Set());
    }
    this.subscriptions.get(serviceName)!.add(subscriptionId);
    this.handlers.set(subscriptionId, handler);

    // Set up service handler if this is the first subscription for this service
    if (this.subscriptions.get(serviceName)!.size === 1) {
      this.setupServiceHandler(serviceName);
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(serviceName, subscriptionId);
    };
  }

  private unsubscribe(serviceName: string, subscriptionId: string): void {
    const serviceSubscriptions = this.subscriptions.get(serviceName);
    if (serviceSubscriptions) {
      serviceSubscriptions.delete(subscriptionId);
      
      // Clean up service handler if no more subscriptions
      if (serviceSubscriptions.size === 0) {
        this.cleanupServiceHandler(serviceName);
        this.subscriptions.delete(serviceName);
      }
    }
    
    this.handlers.delete(subscriptionId);
  }

  private setupServiceHandler(serviceName: string): void {
    const service = this.getService(serviceName);
    if (!service) return;

    const masterHandler = (message: WebSocketMessage) => {
      const serviceSubscriptions = this.subscriptions.get(serviceName);
      if (serviceSubscriptions) {
        serviceSubscriptions.forEach(subscriptionId => {
          const handler = this.handlers.get(subscriptionId);
          if (handler) {
            handler(message);
          }
        });
      }
    };

    service.onMessageHandler = masterHandler;
  }

  private cleanupServiceHandler(serviceName: string): void {
    const service = this.getService(serviceName);
    if (service) {
      service.onMessageHandler = undefined;
    }
  }

  private getService(serviceName: string): any {
    switch (serviceName) {
      case 'metrics':
        return metricsWS;
      case 'notifications':
        return notificationsWS;
      default:
        return null;
    }
  }

  getStats(): { totalSubscriptions: number; serviceBreakdown: Record<string, number> } {
    let totalSubscriptions = 0;
    const serviceBreakdown: Record<string, number> = {};

    this.subscriptions.forEach((subscriptions, serviceName) => {
      const count = subscriptions.size;
      totalSubscriptions += count;
      serviceBreakdown[serviceName] = count;
    });

    return { totalSubscriptions, serviceBreakdown };
  }
}

const subscriptionManager = SubscriptionManager.getInstance();

// Generate unique subscription IDs
function generateSubscriptionId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Real-time data interfaces (unchanged)
export interface RealTimeMetrics {
  system: {
    cpu: number;
    memory: number;
    network: number;
    storage: number;
    timestamp: string;
  };
  pipelines: {
    running: number;
    success: number;
    failed: number;
    pending: number;
  };
  infrastructure: {
    nodes: {
      healthy: number;
      total: number;
    };
    pods: {
      running: number;
      total: number;
    };
  };
  alerts: {
    critical: number;
    warning: number;
    info: number;
  };
}

export interface RealTimeEvent {
  id: string;
  type: 'pipeline' | 'deployment' | 'infrastructure' | 'alert' | 'system';
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface RealTimeNotification {
  id: string;
  type: 'alert' | 'team' | 'system';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Fixed hook for real-time metrics data with proper subscription management
 */
export function useRealTimeMetrics() {
  const [metrics, setMetrics] = useState<RealTimeMetrics>({
    system: {
      cpu: 0,
      memory: 0,
      network: 0,
      storage: 0,
      timestamp: new Date().toISOString()
    },
    pipelines: {
      running: 0,
      success: 0,
      failed: 0,
      pending: 0
    },
    infrastructure: {
      nodes: { healthy: 0, total: 0 },
      pods: { running: 0, total: 0 }
    },
    alerts: {
      critical: 0,
      warning: 0,
      info: 0
    }
  });

  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  
  // Generate stable subscription ID
  const subscriptionId = useMemo(() => generateSubscriptionId('metrics'), []);

  useEffect(() => {
    const handleMessage = (message: WebSocketMessage) => {
      startTransition(() => {
        if (message.type === 'system_metrics') {
          setMetrics(prev => ({
            ...prev,
            system: message.payload.system,
          }));
          setLastUpdate(message.timestamp);
        } else if (message.type === 'pipeline_metrics') {
          setMetrics(prev => ({
            ...prev,
            pipelines: message.payload.pipelines,
          }));
        } else if (message.type === 'infrastructure_metrics') {
          setMetrics(prev => ({
            ...prev,
            infrastructure: message.payload.infrastructure,
          }));
        } else if (message.type === 'alert_metrics') {
          setMetrics(prev => ({
            ...prev,
            alerts: message.payload.alerts,
          }));
        }
      });
    };

    const handleConnectionChange = () => {
      setIsConnected(metricsWS.isConnected());
    };

    // Subscribe to metrics service
    const unsubscribeMetrics = subscriptionManager.subscribe('metrics', subscriptionId, handleMessage);

    // Set up connection status listeners
    const originalOnOpen = metricsWS.onOpenHandler;
    const originalOnClose = metricsWS.onCloseHandler;

    metricsWS.onOpenHandler = (event) => {
      handleConnectionChange();
      if (originalOnOpen) originalOnOpen(event);
    };

    metricsWS.onCloseHandler = (event) => {
      handleConnectionChange();
      if (originalOnClose) originalOnClose(event);
    };

    // Connect if not already connected
    if (!metricsWS.isConnected()) {
      metricsWS.connect();
    } else {
      setIsConnected(true);
    }

    return () => {
      // Clean up subscription
      unsubscribeMetrics();
      
      // Restore original handlers only if they were ours
      if (metricsWS.onOpenHandler === handleConnectionChange) {
        metricsWS.onOpenHandler = originalOnOpen;
      }
      if (metricsWS.onCloseHandler === handleConnectionChange) {
        metricsWS.onCloseHandler = originalOnClose;
      }
    };
  }, [subscriptionId]);

  const refreshMetrics = useCallback(() => {
    if (metricsWS.isConnected()) {
      metricsWS.send({
        type: 'refresh_metrics',
        payload: {}
      });
    }
  }, []);

  return {
    metrics,
    isConnected,
    lastUpdate,
    refreshMetrics
  };
}

/**
 * Fixed hook for real-time events stream with proper subscription management
 */
export function useRealTimeEvents(maxEvents: number = 50) {
  const [events, setEvents] = useState<RealTimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventsRef = useRef<RealTimeEvent[]>([]);
  
  const subscriptionId = useMemo(() => generateSubscriptionId('events'), []);

  useEffect(() => {
    const handleMessage = (message: WebSocketMessage) => {
      if (message.type === 'pipeline_event' || 
          message.type === 'deployment_event' || 
          message.type === 'infrastructure_event' ||
          message.type === 'system_event') {
        
        const newEvent: RealTimeEvent = {
          id: message.id || Date.now().toString(),
          type: message.payload.type,
          severity: message.payload.severity,
          title: message.payload.title,
          message: message.payload.message,
          timestamp: message.timestamp,
          metadata: message.payload.metadata
        };

        startTransition(() => {
          eventsRef.current = [newEvent, ...eventsRef.current.slice(0, maxEvents - 1)];
          setEvents([...eventsRef.current]);
        });
      }
    };

    const handleConnectionChange = () => {
      setIsConnected(metricsWS.isConnected());
    };

    // Subscribe to metrics service for events
    const unsubscribeEvents = subscriptionManager.subscribe('metrics', subscriptionId, handleMessage);

    // Set up connection status
    setIsConnected(metricsWS.isConnected());

    return () => {
      unsubscribeEvents();
    };
  }, [maxEvents, subscriptionId]);

  const clearEvents = useCallback(() => {
    eventsRef.current = [];
    setEvents([]);
  }, []);

  return {
    events,
    isConnected,
    clearEvents
  };
}

/**
 * Fixed hook for real-time notifications with proper subscription management
 */
export function useRealTimeNotifications() {
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const { addToast } = useToast();
  const notificationsRef = useRef<RealTimeNotification[]>([]);
  
  const subscriptionId = useMemo(() => generateSubscriptionId('notifications'), []);

  useEffect(() => {
    const handleMessage = (message: WebSocketMessage) => {
      if (message.type === 'notification') {
        const notification: RealTimeNotification = {
          id: message.id || Date.now().toString(),
          type: message.payload.type,
          title: message.payload.title,
          message: message.payload.message,
          severity: message.payload.severity,
          timestamp: message.timestamp,
          read: false,
          actionUrl: message.payload.actionUrl,
          metadata: message.payload.metadata
        };

        startTransition(() => {
          notificationsRef.current = [notification, ...notificationsRef.current];
          setNotifications([...notificationsRef.current]);
          setUnreadCount(prev => prev + 1);
        });

        // Show toast for important notifications (immediate update)
        if (notification.severity === 'error' || notification.severity === 'warning') {
          addToast({
            type: notification.severity,
            title: notification.title,
            description: notification.message,
            duration: notification.severity === 'error' ? 8000 : 5000,
            action: notification.actionUrl ? {
              label: 'View Details',
              onClick: () => {
                if (notification.actionUrl) {
                  window.open(notification.actionUrl, '_blank');
                }
              }
            } : undefined
          });
        }
      }
    };

    const handleConnectionChange = () => {
      setIsConnected(notificationsWS.isConnected());
    };

    // Subscribe to notifications service
    const unsubscribeNotifications = subscriptionManager.subscribe('notifications', subscriptionId, handleMessage);

    // Set up connection status
    setIsConnected(notificationsWS.isConnected());

    // Connect if not already connected
    if (!notificationsWS.isConnected()) {
      notificationsWS.connect();
    }

    return () => {
      unsubscribeNotifications();
    };
  }, [addToast, subscriptionId]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    // Send read status to server
    if (notificationsWS.isConnected()) {
      notificationsWS.send({
        type: 'mark_read',
        payload: { notificationId }
      });
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);

    if (notificationsWS.isConnected()) {
      notificationsWS.send({
        type: 'mark_all_read',
        payload: {}
      });
    }
  }, []);

  const clearNotifications = useCallback(() => {
    notificationsRef.current = [];
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearNotifications
  };
}

/**
 * Debug hook to monitor subscription health
 */
export function useSubscriptionDebug() {
  const [stats, setStats] = useState(subscriptionManager.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(subscriptionManager.getStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}