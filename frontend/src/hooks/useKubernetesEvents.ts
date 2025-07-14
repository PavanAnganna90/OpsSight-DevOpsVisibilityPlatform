/**
 * React Hook for Kubernetes Real-time Events
 * 
 * Provides easy integration with the WebSocket service for receiving
 * real-time Kubernetes events in React components.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  KubernetesEvent, 
  EventSubscription, 
  getWebSocketService 
} from '../services/websocket';

export interface UseKubernetesEventsOptions {
  /** Event types to subscribe to */
  eventTypes?: string[];
  /** Specific cluster ID to filter events */
  clusterId?: string;
  /** Enable/disable real-time updates */
  enabled?: boolean;
  /** Auto-connect to WebSocket on mount */
  autoConnect?: boolean;
  /** Maximum number of events to keep in memory */
  maxEvents?: number;
  /** Event filter function */
  eventFilter?: (event: KubernetesEvent) => boolean;
}

export interface KubernetesEventsState {
  /** Array of received events */
  events: KubernetesEvent[];
  /** Current connection status */
  isConnected: boolean;
  /** Connection error if any */
  error: string | null;
  /** Loading state during connection */
  isConnecting: boolean;
  /** Number of active subscriptions */
  subscriptionCount: number;
}

export interface KubernetesEventsActions {
  /** Manually connect to WebSocket */
  connect: () => Promise<void>;
  /** Disconnect from WebSocket */
  disconnect: () => void;
  /** Clear all stored events */
  clearEvents: () => void;
  /** Add a new event subscription */
  addSubscription: (types: string[], callback?: (event: KubernetesEvent) => void) => string;
  /** Remove an event subscription */
  removeSubscription: (subscriptionId: string) => void;
  /** Get events by type */
  getEventsByType: (type: string) => KubernetesEvent[];
  /** Get events by severity */
  getEventsBySeverity: (severity: string) => KubernetesEvent[];
}

/**
 * Hook for managing Kubernetes real-time events
 */
export function useKubernetesEvents(
  options: UseKubernetesEventsOptions = {}
): [KubernetesEventsState, KubernetesEventsActions] {
  const {
    eventTypes = ['all'],
    clusterId,
    enabled = true,
    autoConnect = true,
    maxEvents = 1000,
    eventFilter
  } = options;

  // State
  const [events, setEvents] = useState<KubernetesEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [subscriptionCount, setSubscriptionCount] = useState(0);

  // Refs
  const wsService = useRef(getWebSocketService());
  const subscriptionIds = useRef<Set<string>>(new Set());
  const connectionCheck = useRef<NodeJS.Timeout | null>(null);

  /**
   * Handle incoming events
   */
  const handleEvent = useCallback((event: KubernetesEvent) => {
    // Apply event filter if provided
    if (eventFilter && !eventFilter(event)) {
      return;
    }

    setEvents(prevEvents => {
      const newEvents = [event, ...prevEvents];
      // Limit the number of events to prevent memory issues
      return newEvents.slice(0, maxEvents);
    });
  }, [eventFilter, maxEvents]);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(async () => {
    if (!enabled) return;

    try {
      setIsConnecting(true);
      setError(null);
      
      await wsService.current.connect();
      setIsConnected(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [enabled]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    wsService.current.disconnect();
    setIsConnected(false);
    setError(null);
    setIsConnecting(false);
  }, []);

  /**
   * Clear all stored events
   */
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  /**
   * Add a new event subscription
   */
  const addSubscription = useCallback((
    types: string[], 
    callback?: (event: KubernetesEvent) => void
  ): string => {
    const subscriptionId = wsService.current.subscribe({
      types,
      clusterId,
      callback: (event) => {
        handleEvent(event);
        callback?.(event);
      }
    });

    subscriptionIds.current.add(subscriptionId);
    setSubscriptionCount(subscriptionIds.current.size);
    
    return subscriptionId;
  }, [clusterId, handleEvent]);

  /**
   * Remove an event subscription
   */
  const removeSubscription = useCallback((subscriptionId: string) => {
    wsService.current.unsubscribe(subscriptionId);
    subscriptionIds.current.delete(subscriptionId);
    setSubscriptionCount(subscriptionIds.current.size);
  }, []);

  /**
   * Get events by type
   */
  const getEventsByType = useCallback((type: string): KubernetesEvent[] => {
    return events.filter(event => event.type === type);
  }, [events]);

  /**
   * Get events by severity
   */
  const getEventsBySeverity = useCallback((severity: string): KubernetesEvent[] => {
    return events.filter(event => event.severity === severity);
  }, [events]);

  /**
   * Monitor connection status
   */
  const checkConnectionStatus = useCallback(() => {
    const connected = wsService.current.isConnectedStatus();
    if (connected !== isConnected) {
      setIsConnected(connected);
    }
  }, [isConnected]);

  /**
   * Setup initial subscription
   */
  useEffect(() => {
    if (enabled && eventTypes.length > 0) {
      const subscriptionId = addSubscription(eventTypes);
      
      return () => {
        removeSubscription(subscriptionId);
      };
    }
  }, [enabled, eventTypes, addSubscription, removeSubscription]);

  /**
   * Auto-connect on mount if enabled
   */
  useEffect(() => {
    if (autoConnect && enabled) {
      connect();
    }

    return () => {
      // Cleanup subscriptions on unmount
      subscriptionIds.current.forEach(id => {
        wsService.current.unsubscribe(id);
      });
      subscriptionIds.current.clear();
    };
  }, [autoConnect, enabled, connect]);

  /**
   * Connection status monitoring
   */
  useEffect(() => {
    connectionCheck.current = setInterval(checkConnectionStatus, 5000);
    
    return () => {
      if (connectionCheck.current) {
        clearInterval(connectionCheck.current);
      }
    };
  }, [checkConnectionStatus]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (connectionCheck.current) {
        clearInterval(connectionCheck.current);
      }
    };
  }, []);

  // Return state and actions
  const state: KubernetesEventsState = {
    events,
    isConnected,
    error,
    isConnecting,
    subscriptionCount
  };

  const actions: KubernetesEventsActions = {
    connect,
    disconnect,
    clearEvents,
    addSubscription,
    removeSubscription,
    getEventsByType,
    getEventsBySeverity
  };

  return [state, actions];
}

/**
 * Hook for specific event types
 */
export function usePodEvents(clusterId?: string) {
  return useKubernetesEvents({
    eventTypes: ['pod'],
    clusterId,
    autoConnect: true
  });
}

export function useNodeEvents(clusterId?: string) {
  return useKubernetesEvents({
    eventTypes: ['node'],
    clusterId,
    autoConnect: true
  });
}

export function useClusterEvents(clusterId?: string) {
  return useKubernetesEvents({
    eventTypes: ['cluster'],
    clusterId,
    autoConnect: true
  });
}

export function useAlertEvents(clusterId?: string) {
  return useKubernetesEvents({
    eventTypes: ['alert'],
    clusterId,
    autoConnect: true,
    eventFilter: (event) => event.severity === 'critical' || event.severity === 'error'
  });
}

/**
 * Hook for connection status only
 */
export function useWebSocketConnection() {
  const [state] = useKubernetesEvents({
    enabled: true,
    autoConnect: true,
    eventTypes: []
  });

  return {
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error
  };
} 