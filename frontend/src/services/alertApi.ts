/**
 * Alert API Service
 * 
 * Service for connecting to the alert management backend endpoints.
 * Provides methods for fetching alerts, performing actions, and managing lifecycle.
 */

import { 
  Alert,
  AlertFilter,
  AlertSortOptions,
  AlertListResponse,
  AlertActionRequest,
  AlertActionResponse,
  AlertMetrics,
  AlertSummary,
  AlertWithLifecycle,
  LifecycleTransition
} from '../types/alert';

class AlertApiService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? '/api/v1/alerts' 
      : 'http://localhost:8000/api/v1/alerts';
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAuthToken();
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${url}`, error);
      throw error;
    }
  }

  /**
   * Get alerts with filtering, sorting, and pagination
   */
  async getAlerts(
    filter?: AlertFilter,
    sort?: AlertSortOptions,
    page: number = 1,
    perPage: number = 20
  ): Promise<AlertListResponse> {
    const queryParams = new URLSearchParams();
    
    // Pagination
    queryParams.append('page', page.toString());
    queryParams.append('per_page', perPage.toString());
    
    // Sorting
    if (sort) {
      queryParams.append('sort_by', sort.field);
      queryParams.append('sort_order', sort.direction);
    }
    
    // Filtering
    if (filter) {
      if (filter.severity?.length) {
        filter.severity.forEach(severity => queryParams.append('severity', severity));
      }
      
      if (filter.status?.length) {
        filter.status.forEach(status => queryParams.append('status', status));
      }
      
      if (filter.category?.length) {
        filter.category.forEach(category => queryParams.append('category', category));
      }
      
      if (filter.channel?.length) {
        filter.channel.forEach(channel => queryParams.append('channel', channel));
      }
      
      if (filter.source?.length) {
        filter.source.forEach(source => queryParams.append('source', source));
      }
      
      if (filter.project_id) {
        queryParams.append('project_id', filter.project_id.toString());
      }
      
      if (filter.date_range) {
        queryParams.append('start_date', filter.date_range.start);
        queryParams.append('end_date', filter.date_range.end);
      }
      
      if (filter.search) {
        queryParams.append('search', filter.search);
      }
      
      if (filter.tags?.length) {
        filter.tags.forEach(tag => queryParams.append('tags', tag));
      }
    }

    return this.request<AlertListResponse>(`?${queryParams}`);
  }

  /**
   * Get a specific alert by ID
   */
  async getAlert(alertId: string): Promise<Alert> {
    return this.request<Alert>(`/${alertId}`);
  }

  /**
   * Get alert with lifecycle information
   */
  async getAlertWithLifecycle(alertId: string): Promise<AlertWithLifecycle> {
    return this.request<AlertWithLifecycle>(`/${alertId}/lifecycle`);
  }

  /**
   * Create a new alert
   */
  async createAlert(alertData: Partial<Alert>): Promise<Alert> {
    return this.request<Alert>('', {
      method: 'POST',
      body: JSON.stringify(alertData),
    });
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId?: string, comment?: string): Promise<AlertActionResponse> {
    const actionRequest: AlertActionRequest = {
      action: 'acknowledge',
      user_id: userId,
      comment,
    };

    return this.request<AlertActionResponse>(`/${alertId}/acknowledge`, {
      method: 'PUT',
      body: JSON.stringify(actionRequest),
    });
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, userId?: string, comment?: string): Promise<AlertActionResponse> {
    const actionRequest: AlertActionRequest = {
      action: 'resolve',
      user_id: userId,
      comment,
    };

    return this.request<AlertActionResponse>(`/${alertId}/resolve`, {
      method: 'PUT',
      body: JSON.stringify(actionRequest),
    });
  }

  /**
   * Suppress an alert
   */
  async suppressAlert(alertId: string, userId?: string, comment?: string): Promise<AlertActionResponse> {
    const actionRequest: AlertActionRequest = {
      action: 'suppress',
      user_id: userId,
      comment,
    };

    return this.request<AlertActionResponse>(`/${alertId}/suppress`, {
      method: 'PUT',
      body: JSON.stringify(actionRequest),
    });
  }

  /**
   * Get alert summary statistics
   */
  async getAlertSummary(projectId?: number): Promise<AlertSummary> {
    const queryParams = new URLSearchParams();
    if (projectId) {
      queryParams.append('project_id', projectId.toString());
    }

    return this.request<AlertSummary>(`/summary?${queryParams}`);
  }

  /**
   * Get alert metrics and analytics
   */
  async getAlertMetrics(
    projectId?: number,
    timeRange?: { start: string; end: string }
  ): Promise<AlertMetrics> {
    const queryParams = new URLSearchParams();
    
    if (projectId) {
      queryParams.append('project_id', projectId.toString());
    }
    
    if (timeRange) {
      queryParams.append('start_date', timeRange.start);
      queryParams.append('end_date', timeRange.end);
    }

    return this.request<AlertMetrics>(`/metrics?${queryParams}`);
  }

  /**
   * Get lifecycle transitions for an alert
   */
  async getLifecycleHistory(alertId: string): Promise<LifecycleTransition[]> {
    return this.request<LifecycleTransition[]>(`/${alertId}/lifecycle/history`);
  }

  /**
   * Manual escalation of an alert
   */
  async escalateAlert(alertId: string, reason?: string): Promise<AlertActionResponse> {
    return this.request<AlertActionResponse>(`/${alertId}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  /**
   * Bulk actions on multiple alerts
   */
  async bulkAction(
    alertIds: string[],
    action: 'acknowledge' | 'resolve' | 'suppress',
    userId?: string,
    comment?: string
  ): Promise<{ success: number; failed: number; results: AlertActionResponse[] }> {
    return this.request<{ success: number; failed: number; results: AlertActionResponse[] }>('/bulk', {
      method: 'POST',
      body: JSON.stringify({
        alert_ids: alertIds,
        action,
        user_id: userId,
        comment,
      }),
    });
  }

  /**
   * Get available alert sources
   */
  async getSources(): Promise<{ sources: string[]; channels: string[]; categories: string[] }> {
    return this.request<{ sources: string[]; channels: string[]; categories: string[] }>('/sources');
  }

  /**
   * Test alert creation (for development/testing)
   */
  async createTestAlert(alertType: 'critical' | 'warning' | 'info' = 'info'): Promise<Alert> {
    return this.request<Alert>('/test', {
      method: 'POST',
      body: JSON.stringify({ type: alertType }),
    });
  }

  /**
   * Get real-time alert updates (for WebSocket connection)
   */
  getRealtimeEndpoint(): string {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsBaseUrl = process.env.NODE_ENV === 'production' 
      ? `${wsProtocol}//${window.location.host}/ws/alerts`
      : `${wsProtocol}//localhost:8000/ws/alerts`;
    
    const token = this.getAuthToken();
    return token ? `${wsBaseUrl}?token=${token}` : wsBaseUrl;
  }

  /**
   * Health check for alert service
   */
  async healthCheck(): Promise<{ status: string; version: string; features: string[] }> {
    return this.request<{ status: string; version: string; features: string[] }>('/health');
  }
}

// Create and export singleton instance
const alertApiService = new AlertApiService();
export default alertApiService; 