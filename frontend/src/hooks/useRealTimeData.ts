import { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import { WebSocketMessage, metricsWS, notificationsWS } from '../services/websocketService';
import { useToast } from '@/contexts/ToastContext';

// Real-time data interfaces
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
 * Hook for real-time metrics data
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

  useEffect(() => {
    const handleMessage = (message: WebSocketMessage) => {
      // Use startTransition for non-urgent metric updates to improve performance
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

    const handleOpen = () => {
      setIsConnected(true);
    };

    const handleClose = () => {
      setIsConnected(false);
    };

    // Set up WebSocket event handlers
    metricsWS.onMessageHandler = handleMessage;
    metricsWS.onOpenHandler = handleOpen;
    metricsWS.onCloseHandler = handleClose;

    // Connect if not already connected
    if (!metricsWS.isConnected()) {
      metricsWS.connect();
    } else {
      setIsConnected(true);
    }

    return () => {
      // Clean up handlers but don't disconnect (other components might be using it)
      metricsWS.onMessageHandler = undefined;
      metricsWS.onOpenHandler = undefined;
      metricsWS.onCloseHandler = undefined;
    };
  }, []);

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
 * Hook for real-time events stream
 */
export function useRealTimeEvents(maxEvents: number = 50) {
  const [events, setEvents] = useState<RealTimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventsRef = useRef<RealTimeEvent[]>([]);

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

        // Use startTransition for non-urgent event updates
        startTransition(() => {
          eventsRef.current = [newEvent, ...eventsRef.current.slice(0, maxEvents - 1)];
          setEvents([...eventsRef.current]);
        });
      }
    };

    const handleOpen = () => {
      setIsConnected(true);
    };

    const handleClose = () => {
      setIsConnected(false);
    };

    // Set up WebSocket event handlers
    metricsWS.onMessageHandler = handleMessage;
    metricsWS.onOpenHandler = handleOpen;
    metricsWS.onCloseHandler = handleClose;

    // Connect if not already connected
    if (!metricsWS.isConnected()) {
      metricsWS.connect();
    } else {
      setIsConnected(true);
    }

    return () => {
      metricsWS.onMessageHandler = undefined;
      metricsWS.onOpenHandler = undefined;
      metricsWS.onCloseHandler = undefined;
    };
  }, [maxEvents]);

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
 * Hook for real-time notifications
 */
export function useRealTimeNotifications() {
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const { addToast } = useToast();
  const notificationsRef = useRef<RealTimeNotification[]>([]);

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

        // Use startTransition for non-urgent notification updates
        startTransition(() => {
          notificationsRef.current = [notification, ...notificationsRef.current];
          setNotifications([...notificationsRef.current]);
          setUnreadCount(prev => prev + 1);
        });

        // Show toast for important notifications
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

    const handleOpen = () => {
      setIsConnected(true);
    };

    const handleClose = () => {
      setIsConnected(false);
    };

    // Set up WebSocket event handlers
    notificationsWS.onMessageHandler = handleMessage;
    notificationsWS.onOpenHandler = handleOpen;
    notificationsWS.onCloseHandler = handleClose;

    // Connect if not already connected
    if (!notificationsWS.isConnected()) {
      notificationsWS.connect();
    } else {
      setIsConnected(true);
    }

    return () => {
      notificationsWS.onMessageHandler = undefined;
      notificationsWS.onOpenHandler = undefined;
      notificationsWS.onCloseHandler = undefined;
    };
  }, [addToast]);

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

    // Send read status to server
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
 * Hook for WebSocket connection status across all services
 * Optimized with exponential backoff and event-driven checks
 */
export function useWebSocketStatus() {
  const [status, setStatus] = useState({
    metrics: false,
    notifications: false
  });
  const [checkInterval, setCheckInterval] = useState(1000);
  const [consecutiveSuccesses, setConsecutiveSuccesses] = useState(0);

  useEffect(() => {
    const checkStatus = () => {
      const newStatus = {
        metrics: metricsWS.isConnected(),
        notifications: notificationsWS.isConnected()
      };
      
      const allConnected = newStatus.metrics && newStatus.notifications;
      
      setStatus(newStatus);
      
      // Adaptive polling: slow down when connections are stable
      if (allConnected) {
        setConsecutiveSuccesses(prev => prev + 1);
        // Increase interval up to 30 seconds for stable connections
        if (consecutiveSuccesses > 5) {
          setCheckInterval(Math.min(30000, checkInterval * 1.5));
        }
      } else {
        setConsecutiveSuccesses(0);
        // Reset to frequent checking when connections are unstable
        setCheckInterval(1000);
      }
    };

    // Check status immediately
    checkStatus();

    // Set up adaptive interval checking
    const interval = setInterval(checkStatus, checkInterval);

    return () => clearInterval(interval);
  }, [checkInterval, consecutiveSuccesses]);

  // Listen to WebSocket events for immediate updates
  useEffect(() => {
    const handleConnectionChange = () => {
      setStatus({
        metrics: metricsWS.isConnected(),
        notifications: notificationsWS.isConnected()
      });
      setCheckInterval(1000); // Reset to frequent checking on state change
      setConsecutiveSuccesses(0);
    };

    // Set up event listeners for immediate status updates
    metricsWS.onOpenHandler = handleConnectionChange;
    metricsWS.onCloseHandler = handleConnectionChange;
    notificationsWS.onOpenHandler = handleConnectionChange;
    notificationsWS.onCloseHandler = handleConnectionChange;

    return () => {
      // Clean up only our handlers
      if (metricsWS.onOpenHandler === handleConnectionChange) {
        metricsWS.onOpenHandler = undefined;
      }
      if (metricsWS.onCloseHandler === handleConnectionChange) {
        metricsWS.onCloseHandler = undefined;
      }
      if (notificationsWS.onOpenHandler === handleConnectionChange) {
        notificationsWS.onOpenHandler = undefined;
      }
      if (notificationsWS.onCloseHandler === handleConnectionChange) {
        notificationsWS.onCloseHandler = undefined;
      }
    };
  }, []);

  return status;
}

/**
 * Hook for managing WebSocket reconnection
 */
export function useWebSocketReconnection() {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const { addToast } = useToast();

  const reconnectAll = useCallback(() => {
    setIsReconnecting(true);
    
    addToast({
      type: 'info',
      title: 'Reconnecting...',
      description: 'Attempting to restore real-time connections',
      duration: 3000
    });

    // Disconnect and reconnect all services
    metricsWS.disconnect();
    notificationsWS.disconnect();

    setTimeout(() => {
      metricsWS.connect();
      notificationsWS.connect();
      setIsReconnecting(false);
      
      addToast({
        type: 'success',
        title: 'Reconnection Successful',
        description: 'Real-time connections restored',
        duration: 3000
      });
    }, 1000);
  }, [addToast]);

  return {
    isReconnecting,
    reconnectAll
  };
}

/**
 * Generic real-time data hook with API fetching
 */
export function useRealTimeData(options: {
  endpoint: string;
  enabled?: boolean;
  interval?: number;
}) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!options.enabled) return;

    let intervalId: NodeJS.Timeout;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // In development, return mock data
        if (process.env.NODE_ENV === 'development') {
          setData({
            system: {
              cpu: Math.random() * 100,
              memory: Math.random() * 100,
              status: 'healthy'
            },
            timestamp: new Date().toISOString()
          });
        } else {
          const response = await fetch(options.endpoint);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const result = await response.json();
          setData(result);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    if (options.interval) {
      // Use requestIdleCallback for non-critical polling to improve performance
      const scheduleNextFetch = () => {
        setTimeout(() => {
          if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
              fetchData().then(scheduleNextFetch);
            });
          } else {
            fetchData().then(scheduleNextFetch);
          }
        }, options.interval);
      };
      
      scheduleNextFetch();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [options.endpoint, options.enabled, options.interval]);

  return { data, isLoading, error };
}

/**
 * Basic WebSocket hook for compatibility
 */
export function useWebSocket(url: string, options?: { onMessage?: (data: any) => void }) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Mock WebSocket functionality for compatibility
    setIsConnected(true);
    setError(null);
    
    return () => {
      setIsConnected(false);
    };
  }, [url]);

  return {
    isConnected,
    error,
    send: () => {},
    close: () => {},
  };
}