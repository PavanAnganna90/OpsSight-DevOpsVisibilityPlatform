/**
 * WebSocket Service for Real-time Kubernetes Events
 * 
 * Provides real-time streaming of Kubernetes cluster events including
 * pod status changes, node events, resource alerts, and system notifications.
 */

// Event types for Kubernetes real-time updates
export interface KubernetesEvent {
  id: string;
  type: 'pod' | 'node' | 'cluster' | 'resource' | 'alert';
  action: 'created' | 'updated' | 'deleted' | 'error';
  timestamp: string;
  clusterId: string;
  data: any;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  subscriptions: string[];
}

export interface EventSubscription {
  id: string;
  types: string[];
  clusterId?: string;
  callback: (event: KubernetesEvent) => void;
}

/**
 * WebSocket Event Manager
 * 
 * Manages WebSocket connections for real-time Kubernetes event streaming
 */
export class KubernetesWebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private subscriptions: Map<string, EventSubscription> = new Map();
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private eventQueue: KubernetesEvent[] = [];
  private connectionPromise: Promise<void> | null = null;

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = {
      url: config.url || this.getWebSocketUrl(),
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000,
      subscriptions: config.subscriptions || ['all']
    };
  }

  /**
   * Get WebSocket URL based on current environment
   */
  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/api/v1/kubernetes/events/stream`;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const token = localStorage.getItem('access_token');
        const wsUrl = new URL(this.config.url);
        if (token) {
          wsUrl.searchParams.append('token', token);
        }

        this.ws = new WebSocket(wsUrl.toString());

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.sendSubscriptions();
          this.processEventQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.isConnected = false;
          this.stopHeartbeat();
          
          if (!event.wasClean && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(new Error('WebSocket connection failed'));
        };

        // Connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            this.ws?.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.clearReconnectTimer();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.connectionPromise = null;
  }

  /**
   * Subscribe to specific event types
   */
  subscribe(subscription: Omit<EventSubscription, 'id'>): string {
    const id = this.generateSubscriptionId();
    
    this.subscriptions.set(id, {
      ...subscription,
      id
    });

    // Send subscription to server if connected
    if (this.isConnected) {
      this.sendSubscription(id);
    }

    return id;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
    
    // Send unsubscription to server if connected
    if (this.isConnected) {
      this.sendUnsubscription(subscriptionId);
    }
  }

  /**
   * Get connection status
   */
  isConnectedStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get number of active subscriptions
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'event':
          this.handleKubernetesEvent(message.data);
          break;
        case 'heartbeat':
          this.handleHeartbeat();
          break;
        case 'error':
          this.handleError(message.error);
          break;
        case 'subscription_ack':
          this.handleSubscriptionAck(message.subscriptionId);
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Handle Kubernetes events
   */
  private handleKubernetesEvent(event: KubernetesEvent): void {
    // Route event to subscribed callbacks
    this.subscriptions.forEach((subscription) => {
      if (this.shouldNotifySubscription(subscription, event)) {
        try {
          subscription.callback(event);
        } catch (error) {
          console.error('Error in subscription callback:', error);
        }
      }
    });
  }

  /**
   * Check if subscription should be notified of event
   */
  private shouldNotifySubscription(subscription: EventSubscription, event: KubernetesEvent): boolean {
    // Check event type
    if (!subscription.types.includes('all') && !subscription.types.includes(event.type)) {
      return false;
    }

    // Check cluster ID if specified
    if (subscription.clusterId && subscription.clusterId !== event.clusterId) {
      return false;
    }

    return true;
  }

  /**
   * Handle heartbeat messages
   */
  private handleHeartbeat(): void {
    // Server heartbeat received, connection is alive
  }

  /**
   * Handle error messages
   */
  private handleError(error: any): void {
    console.error('WebSocket server error:', error);
  }

  /**
   * Handle subscription acknowledgment
   */
  private handleSubscriptionAck(subscriptionId: string): void {
    console.log('Subscription acknowledged:', subscriptionId);
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.ws.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connectionPromise = null;
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Send all subscriptions to server
   */
  private sendSubscriptions(): void {
    this.subscriptions.forEach((subscription, id) => {
      this.sendSubscription(id);
    });
  }

  /**
   * Send individual subscription to server
   */
  private sendSubscription(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || !this.ws) return;

    this.ws.send(JSON.stringify({
      type: 'subscribe',
      subscriptionId,
      types: subscription.types,
      clusterId: subscription.clusterId
    }));
  }

  /**
   * Send unsubscription to server
   */
  private sendUnsubscription(subscriptionId: string): void {
    if (!this.ws) return;

    this.ws.send(JSON.stringify({
      type: 'unsubscribe',
      subscriptionId
    }));
  }

  /**
   * Process queued events when connection is established
   */
  private processEventQueue(): void {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        this.handleKubernetesEvent(event);
      }
    }
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Global WebSocket service instance
let globalWebSocketService: KubernetesWebSocketService | null = null;

/**
 * Get global WebSocket service instance
 */
export function getWebSocketService(): KubernetesWebSocketService {
  if (!globalWebSocketService) {
    globalWebSocketService = new KubernetesWebSocketService();
  }
  return globalWebSocketService;
}

/**
 * Initialize WebSocket service with automatic connection
 */
export async function initializeWebSocketService(config?: Partial<WebSocketConfig>): Promise<KubernetesWebSocketService> {
  const service = new KubernetesWebSocketService(config);
  
  try {
    await service.connect();
    globalWebSocketService = service;
    return service;
  } catch (error) {
    console.warn('Failed to initialize WebSocket service:', error);
    return service;
  }
}

/**
 * Cleanup WebSocket service
 */
export function cleanupWebSocketService(): void {
  if (globalWebSocketService) {
    globalWebSocketService.disconnect();
    globalWebSocketService = null;
  }
} 