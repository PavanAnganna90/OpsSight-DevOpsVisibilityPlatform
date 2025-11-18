/**
 * DEPRECATED: Legacy WebSocket Service - Use services/websocket/WebSocketService.ts
 * 
 * This file is kept for backward compatibility and will be removed in a future version.
 * Please migrate to the new modular WebSocket services.
 */

// Re-export from new modular services
export type { WebSocketMessage } from './websocket/WebSocketService';
export { WebSocketService } from './websocket/WebSocketService';
export { ConnectionManager } from './websocket/ConnectionManager';
export { MessageQueue } from './websocket/MessageQueue';
export { HeartbeatManager } from './websocket/HeartbeatManager';

// Legacy interface for backward compatibility
export interface LegacyWebSocketOptions {
  url: string;
  protocols?: string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  onOpen?: (event: Event) => void;
  onMessage?: (message: any) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onReconnect?: (attempt: number) => void;
}

// Legacy class - use WebSocketService from ./websocket/WebSocketService instead
export class LegacyWebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private protocols?: string[];
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private heartbeatInterval: number;
  private reconnectAttempts: number = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private isConnecting: boolean = false;
  private isManualClose: boolean = false;

  // Event handlers
  private onOpenHandler?: (event: Event) => void;
  private onMessageHandler?: (message: WebSocketMessage) => void;
  private onErrorHandler?: (error: Event) => void;
  private onCloseHandler?: (event: CloseEvent) => void;
  private onReconnectHandler?: (attempt: number) => void;

  constructor(options: LegacyWebSocketOptions) {
    this.url = options.url;
    this.protocols = options.protocols;
    this.reconnectInterval = options.reconnectInterval || 3000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    
    this.onOpenHandler = options.onOpen;
    this.onMessageHandler = options.onMessage;
    this.onErrorHandler = options.onError;
    this.onCloseHandler = options.onClose;
    this.onReconnectHandler = options.onReconnect;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    this.isManualClose = false;

    try {
      // Get secure WebSocket token
      const token = await this.getAuthToken();
      
      // Use secure subprotocol for authentication instead of URL parameter
      const protocols = token ? [...(this.protocols || []), `token.${token}`] : this.protocols;
      
      this.ws = new WebSocket(this.url, protocols);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);

    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isManualClose = true;
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  /**
   * Send message to WebSocket server
   */
  send(message: Omit<WebSocketMessage, 'timestamp'>): void {
    const fullMessage: WebSocketMessage = {
      ...message,
      timestamp: new Date().toISOString(),
      id: message.id || this.generateMessageId()
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(fullMessage));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        this.queueMessage(fullMessage);
      }
    } else {
      this.queueMessage(fullMessage);
    }
  }

  /**
   * Subscribe to specific message types
   */
  subscribe(messageType: string): void {
    this.send({
      type: 'subscribe',
      payload: { messageType }
    });
  }

  /**
   * Unsubscribe from specific message types
   */
  unsubscribe(messageType: string): void {
    this.send({
      type: 'unsubscribe',
      payload: { messageType }
    });
  }

  /**
   * Get current connection state
   */
  getReadyState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private handleOpen(event: Event): void {
    console.log('WebSocket connected');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Send queued messages
    this.flushMessageQueue();
    
    // Call user handler
    if (this.onOpenHandler) {
      this.onOpenHandler(event);
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // Handle internal messages
      if (message.type === 'pong') {
        // Heartbeat response received
        return;
      }
      
      // Call user handler
      if (this.onMessageHandler) {
        this.onMessageHandler(message);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private handleError(error: Event): void {
    console.error('WebSocket error:', error);
    this.isConnecting = false;
    
    if (this.onErrorHandler) {
      this.onErrorHandler(error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.isConnecting = false;
    
    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    // Call user handler
    if (this.onCloseHandler) {
      this.onCloseHandler(event);
    }
    
    // Schedule reconnect if not manually closed
    if (!this.isManualClose && event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      if (this.onReconnectHandler) {
        this.onReconnectHandler(this.reconnectAttempts);
      }
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        }));
      }
    }, this.heartbeatInterval);
  }

  private queueMessage(message: WebSocketMessage): void {
    this.messageQueue.push(message);
    
    // Limit queue size
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift();
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message && this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error('Failed to send queued message:', error);
          break;
        }
      }
    }
  }

  private async getAuthToken(): Promise<string | null> {
    if (typeof window !== 'undefined') {
      // Use secure auth service instead of localStorage
      const { authService } = await import('../lib/auth');
      return authService.getWebSocketToken();
    }
    return null;
  }

  private generateMessageId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

/**
 * Real-time Metrics WebSocket Service
 */
export class MetricsWebSocketService extends LegacyWebSocketService {
  private mockUnsubscribe?: () => void;
  
  constructor() {
    const wsUrl = process.env.NODE_ENV === 'production' 
      ? 'wss://your-domain.com/ws/metrics'
      : 'ws://localhost:8000/ws/metrics';

    super({
      url: wsUrl,
      onOpen: () => {
        console.log('Metrics WebSocket connected');
        // Subscribe to all metric types
        this.subscribe('system_metrics');
        this.subscribe('pipeline_events');
        this.subscribe('deployment_events');
        this.subscribe('infrastructure_events');
      },
      onError: (error) => {
        console.error('Metrics WebSocket error:', error);
        // In development, fall back to mock server
        if (process.env.NODE_ENV === 'development') {
          this.setupMockConnection();
        }
      },
      onReconnect: (attempt) => {
        console.log(`Reconnecting to metrics WebSocket (attempt ${attempt})`);
      }
    });

    // In development, set up mock connection immediately if real WebSocket fails
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        if (!this.isConnected()) {
          this.setupMockConnection();
        }
      }, 2000);
    }
  }

  private setupMockConnection(): void {
    if (typeof window === 'undefined') return;
    
    import('./mockWebSocketServer').then(({ mockWebSocketServer }) => {
      console.log('📡 Using mock WebSocket server for development');
      
      // Simulate connection state
      this.ws = { 
        readyState: WebSocket.OPEN,
        send: (data: string) => {
          // Mock send - just log the message in development
          console.log('📤 Mock WebSocket send (metrics):', JSON.parse(data));
        }
      } as WebSocket;
      
      // Start mock server
      if (!mockWebSocketServer.isRunning()) {
        mockWebSocketServer.start();
      }
      
      // Register for mock messages
      this.mockUnsubscribe = mockWebSocketServer.addMessageHandler((message) => {
        if (this.onMessageHandler) {
          this.onMessageHandler(message);
        }
      });
      
      // Simulate open event
      if (this.onOpenHandler) {
        this.onOpenHandler(new Event('open'));
      }
    });
  }

  disconnect(): void {
    super.disconnect();
    if (this.mockUnsubscribe) {
      this.mockUnsubscribe();
      this.mockUnsubscribe = undefined;
    }
  }
}

/**
 * Real-time Notifications WebSocket Service
 */
export class NotificationsWebSocketService extends LegacyWebSocketService {
  private mockUnsubscribe?: () => void;
  
  constructor() {
    const wsUrl = process.env.NODE_ENV === 'production' 
      ? 'wss://your-domain.com/ws/notifications'
      : 'ws://localhost:8000/ws/notifications';

    super({
      url: wsUrl,
      onOpen: () => {
        console.log('Notifications WebSocket connected');
        this.subscribe('alerts');
        this.subscribe('team_notifications');
        this.subscribe('system_notifications');
      },
      onError: (error) => {
        console.error('Notifications WebSocket error:', error);
        // In development, fall back to mock server
        if (process.env.NODE_ENV === 'development') {
          this.setupMockConnection();
        }
      },
      onReconnect: (attempt) => {
        console.log(`Reconnecting to notifications WebSocket (attempt ${attempt})`);
      }
    });

    // In development, set up mock connection immediately if real WebSocket fails
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        if (!this.isConnected()) {
          this.setupMockConnection();
        }
      }, 2000);
    }
  }

  private setupMockConnection(): void {
    if (typeof window === 'undefined') return;
    
    import('./mockWebSocketServer').then(({ mockWebSocketServer }) => {
      console.log('📡 Using mock WebSocket server for notifications');
      
      // Simulate connection state
      this.ws = { 
        readyState: WebSocket.OPEN,
        send: (data: string) => {
          // Mock send - just log the message in development
          console.log('📤 Mock WebSocket send (notifications):', JSON.parse(data));
        }
      } as WebSocket;
      
      // Start mock server
      if (!mockWebSocketServer.isRunning()) {
        mockWebSocketServer.start();
      }
      
      // Register for mock messages (only notification messages)
      this.mockUnsubscribe = mockWebSocketServer.addMessageHandler((message) => {
        if (message.type === 'notification' && this.onMessageHandler) {
          this.onMessageHandler(message);
        }
      });
      
      // Simulate open event
      if (this.onOpenHandler) {
        this.onOpenHandler(new Event('open'));
      }
    });
  }

  disconnect(): void {
    super.disconnect();
    if (this.mockUnsubscribe) {
      this.mockUnsubscribe();
      this.mockUnsubscribe = undefined;
    }
  }
}

/**
 * WebSocket Manager - Singleton for managing multiple WebSocket connections
 */
export class WebSocketManager {
  private static instance: WebSocketManager;
  private connections: Map<string, LegacyWebSocketService> = new Map();

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Register a WebSocket connection
   */
  register(name: string, service: LegacyWebSocketService): void {
    this.connections.set(name, service);
  }

  /**
   * Get a WebSocket connection by name
   */
  get(name: string): LegacyWebSocketService | undefined {
    return this.connections.get(name);
  }

  /**
   * Connect all registered WebSocket services
   */
  connectAll(): void {
    this.connections.forEach((service, name) => {
      console.log(`Connecting WebSocket: ${name}`);
      service.connect();
    });
  }

  /**
   * Disconnect all registered WebSocket services
   */
  disconnectAll(): void {
    this.connections.forEach((service, name) => {
      console.log(`Disconnecting WebSocket: ${name}`);
      service.disconnect();
    });
  }

  /**
   * Remove a WebSocket connection
   */
  unregister(name: string): void {
    const service = this.connections.get(name);
    if (service) {
      service.disconnect();
      this.connections.delete(name);
    }
  }

  /**
   * Get connection status for all services
   */
  getStatus(): Record<string, number> {
    const status: Record<string, number> = {};
    this.connections.forEach((service, name) => {
      status[name] = service.getReadyState();
    });
    return status;
  }
}

// Export singleton instance
export const wsManager = WebSocketManager.getInstance();

// Initialize default WebSocket services
export const metricsWS = new MetricsWebSocketService();
export const notificationsWS = new NotificationsWebSocketService();

// Register services with manager
wsManager.register('metrics', metricsWS);
wsManager.register('notifications', notificationsWS);