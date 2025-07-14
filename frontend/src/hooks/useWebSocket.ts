/**
 * WebSocket Hook for Real-time Pipeline Updates
 * 
 * Custom React hook providing WebSocket connectivity with:
 * - Automatic connection management
 * - Reconnection with exponential backoff
 * - Connection status tracking
 * - Message handling for pipeline updates
 * - Cleanup on component unmount
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
}

export interface PipelineUpdateMessage extends WebSocketMessage {
  type: 'pipeline_update';
  payload: {
    pipeline_id: number;
    run_id: number;
    status: string;
    progress?: number;
    stage?: string;
    job?: string;
    step?: string;
    duration?: number;
    eta?: number;
  };
}

export interface UseWebSocketOptions {
  /** WebSocket server URL */
  url: string;
  /** Protocols to use */
  protocols?: string | string[];
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Reconnection attempts before giving up */
  maxReconnectAttempts?: number;
  /** Base delay for reconnection (ms) */
  reconnectDelay?: number;
  /** Maximum delay for reconnection (ms) */
  maxReconnectDelay?: number;
  /** Authentication token */
  token?: string;
}

export interface UseWebSocketReturn {
  /** Current connection status */
  connectionStatus: ConnectionStatus;
  /** Send message to server */
  sendMessage: (message: WebSocketMessage) => void;
  /** Connect to WebSocket server */
  connect: () => void;
  /** Disconnect from WebSocket server */
  disconnect: () => void;
  /** Subscribe to specific message types */
  subscribe: (messageType: string, callback: (message: WebSocketMessage) => void) => () => void;
  /** Last error that occurred */
  lastError: Error | null;
  /** Whether currently attempting to reconnect */
  isReconnecting: boolean;
}

/**
 * Custom hook for WebSocket connections with automatic reconnection
 */
export const useWebSocket = (options: UseWebSocketOptions): UseWebSocketReturn => {
  const {
    url,
    protocols,
    autoConnect = true,
    maxReconnectAttempts = 10,
    reconnectDelay = 1000,
    maxReconnectDelay = 30000,
    token
  } = options;

  // State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastError, setLastError] = useState<Error | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Refs
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const subscribersRef = useRef<Map<string, Set<(message: WebSocketMessage) => void>>>(new Map());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Clear reconnection timeout
   */
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  /**
   * Clear heartbeat interval
   */
  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  /**
   * Start heartbeat to keep connection alive
   */
  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'ping',
          payload: {},
          timestamp: new Date().toISOString()
        }));
      }
    }, 30000); // Send ping every 30 seconds
  }, [clearHeartbeat]);

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // Handle pong messages
      if (message.type === 'pong') {
        return;
      }

      // Dispatch to subscribers
      const subscribers = subscribersRef.current.get(message.type);
      if (subscribers) {
        subscribers.forEach(callback => callback(message));
      }

      // Dispatch to wildcard subscribers
      const wildcardSubscribers = subscribersRef.current.get('*');
      if (wildcardSubscribers) {
        wildcardSubscribers.forEach(callback => callback(message));
      }
    } catch (error) {
      console.warn('Failed to parse WebSocket message:', error);
    }
  }, []);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setConnectionStatus('connecting');
    setLastError(null);

    try {
      // Construct WebSocket URL with token if provided
      const wsUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;
      
      const socket = new WebSocket(wsUrl, protocols);
      socketRef.current = socket;

      socket.onopen = () => {
        setConnectionStatus('connected');
        setIsReconnecting(false);
        reconnectAttemptsRef.current = 0;
        clearReconnectTimeout();
        startHeartbeat();
        
        // Send initial connection message
        socket.send(JSON.stringify({
          type: 'connect',
          payload: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString()
        }));
      };

      socket.onmessage = handleMessage;

      socket.onclose = (event) => {
        setConnectionStatus('disconnected');
        clearHeartbeat();
        
        // Attempt reconnection if not intentionally closed
        if (!event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts) {
          setIsReconnecting(true);
          const delay = Math.min(
            reconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
            maxReconnectDelay
          );
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setIsReconnecting(false);
          setLastError(new Error('Maximum reconnection attempts reached'));
        }
      };

      socket.onerror = (error) => {
        setConnectionStatus('error');
        setLastError(new Error('WebSocket connection error'));
        clearHeartbeat();
      };

    } catch (error) {
      setConnectionStatus('error');
      setLastError(error as Error);
    }
  }, [url, protocols, token, maxReconnectAttempts, reconnectDelay, maxReconnectDelay, handleMessage, startHeartbeat, clearHeartbeat, clearReconnectTimeout]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    clearReconnectTimeout();
    clearHeartbeat();
    setIsReconnecting(false);
    
    if (socketRef.current) {
      socketRef.current.close(1000, 'Manual disconnect');
      socketRef.current = null;
    }
    
    setConnectionStatus('disconnected');
  }, [clearReconnectTimeout, clearHeartbeat]);

  /**
   * Send message to WebSocket server
   */
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify({
          ...message,
          timestamp: message.timestamp || new Date().toISOString()
        }));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        setLastError(error as Error);
      }
    } else {
      console.warn('WebSocket is not connected. Cannot send message.');
    }
  }, []);

  /**
   * Subscribe to specific message types
   */
  const subscribe = useCallback((messageType: string, callback: (message: WebSocketMessage) => void) => {
    if (!subscribersRef.current.has(messageType)) {
      subscribersRef.current.set(messageType, new Set());
    }
    
    subscribersRef.current.get(messageType)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const subscribers = subscribersRef.current.get(messageType);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          subscribersRef.current.delete(messageType);
        }
      }
    };
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearReconnectTimeout();
      clearHeartbeat();
    };
  }, [clearReconnectTimeout, clearHeartbeat]);

  return {
    connectionStatus,
    sendMessage,
    connect,
    disconnect,
    subscribe,
    lastError,
    isReconnecting
  };
};

export default useWebSocket; 