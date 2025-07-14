/**
 * Team-aware Dashboard API Service
 * 
 * Provides dashboard data and metrics filtered by team context.
 * Handles team-specific monitoring, alerts, and activity data.
 */

// Dashboard interfaces
export interface DashboardMetrics {
  pipelines: {
    successful: number;
    total: number;
    successRate: number;
    trend: {
      value: string;
      direction: 'up' | 'down' | 'neutral';
      label: string;
    };
  };
  deployments: {
    active: number;
    pending: number;
    successful: number;
    failed: number;
  };
  systemHealth: {
    percentage: number;
    status: 'healthy' | 'warning' | 'critical';
    issues: number;
  };
  alerts: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
}

export interface DashboardActivity {
  id: string;
  type: 'deployment' | 'pipeline' | 'alert' | 'system';
  status: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description: string;
  timestamp: string;
  teamId?: number;
  projectId?: string;
  userId?: number;
  metadata?: Record<string, any>;
}

export interface SystemStatus {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'down' | 'maintenance';
  description?: string;
  lastChecked: string;
  responseTime?: number;
  uptime?: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  recentActivity: DashboardActivity[];
  systemStatus: SystemStatus[];
  lastUpdated: string;
}

export interface DashboardFilters {
  teamId?: number;
  dateRange?: {
    start: string;
    end: string;
  };
  includeSubteams?: boolean;
  projectIds?: string[];
}

/**
 * Dashboard API Service Class
 * 
 * Singleton service for dashboard data operations with team filtering.
 * Provides real-time dashboard metrics, activity feeds, and system status.
 */
class DashboardApiService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? '/api/v1/dashboard' 
      : 'http://localhost:8000/api/v1/dashboard';
  }

  /**
   * Get authentication token from storage
   */
  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    }
    return null;
  }

  /**
   * Generic request method with authentication and error handling
   */
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Dashboard API request failed: ${url}`, error);
      throw error;
    }
  }
  /**
   * Get dashboard data for a specific team
   */
  async getDashboardData(filters: DashboardFilters = {}): Promise<DashboardData> {
    const params = new URLSearchParams();
    
    if (filters.teamId) {
      params.append('team_id', filters.teamId.toString());
    }
    
    if (filters.dateRange) {
      params.append('start_date', filters.dateRange.start);
      params.append('end_date', filters.dateRange.end);
    }
    
    if (filters.includeSubteams) {
      params.append('include_subteams', 'true');
    }
    
    if (filters.projectIds && filters.projectIds.length > 0) {
      params.append('project_ids', filters.projectIds.join(','));
    }
    
    const queryString = params.toString();
    const url = `/dashboard${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.request<DashboardData>(url);
    return response;
  }

  /**
   * Get team-specific metrics
   */
  async getTeamMetrics(teamId: number, dateRange?: { start: string; end: string }): Promise<DashboardMetrics> {
    const params = new URLSearchParams({
      team_id: teamId.toString(),
    });
    
    if (dateRange) {
      params.append('start_date', dateRange.start);
      params.append('end_date', dateRange.end);
    }
    
    const response = await this.request<DashboardMetrics>(`/dashboard/metrics?${params.toString()}`);
    return response;
  }

  /**
   * Get recent activity for a team
   */
  async getTeamActivity(
    teamId: number, 
    options: {
      limit?: number;
      offset?: number;
      types?: string[];
      status?: string[];
    } = {}
  ): Promise<{
    activities: DashboardActivity[];
    total: number;
    hasMore: boolean;
  }> {
    const params = new URLSearchParams({
      team_id: teamId.toString(),
      limit: (options.limit || 20).toString(),
      offset: (options.offset || 0).toString(),
    });
    
    if (options.types && options.types.length > 0) {
      params.append('types', options.types.join(','));
    }
    
    if (options.status && options.status.length > 0) {
      params.append('status', options.status.join(','));
    }
    
    const response = await this.request<{
      activities: DashboardActivity[];
      total: number;
      has_more: boolean;
    }>(`/dashboard/activity?${params.toString()}`);
    
    return {
      activities: response.activities,
      total: response.total,
      hasMore: response.has_more,
    };
  }

  /**
   * Get system status for team's infrastructure
   */
  async getTeamSystemStatus(teamId: number): Promise<SystemStatus[]> {
    const params = new URLSearchParams({
      team_id: teamId.toString(),
    });
    
    const response = await this.request<SystemStatus[]>(`/dashboard/system-status?${params.toString()}`);
    return response;
  }

  /**
   * Get team alerts and notifications
   */
  async getTeamAlerts(
    teamId: number,
    options: {
      severity?: string[];
      status?: string[];
      limit?: number;
    } = {}
  ): Promise<{
    alerts: Array<{
      id: string;
      title: string;
      description: string;
      severity: 'critical' | 'warning' | 'info';
      status: 'open' | 'acknowledged' | 'resolved';
      createdAt: string;
      updatedAt: string;
      teamId: number;
      projectId?: string;
    }>;
    summary: {
      total: number;
      critical: number;
      warning: number;
      info: number;
    };
  }> {
    const params = new URLSearchParams({
      team_id: teamId.toString(),
      limit: (options.limit || 50).toString(),
    });
    
    if (options.severity && options.severity.length > 0) {
      params.append('severity', options.severity.join(','));
    }
    
    if (options.status && options.status.length > 0) {
      params.append('status', options.status.join(','));
    }
    
    const response = await this.request<{
      alerts: Array<{
        id: string;
        title: string;
        description: string;
        severity: 'critical' | 'warning' | 'info';
        status: 'open' | 'acknowledged' | 'resolved';
        created_at: string;
        updated_at: string;
        team_id: number;
        project_id?: string;
      }>;
      summary: {
        total: number;
        critical: number;
        warning: number;
        info: number;
      };
    }>(`/dashboard/alerts?${params.toString()}`);
    
    return {
      alerts: response.alerts.map(alert => ({
        id: alert.id,
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        status: alert.status,
        createdAt: alert.created_at,
        updatedAt: alert.updated_at,
        teamId: alert.team_id,
        projectId: alert.project_id,
      })),
      summary: response.summary,
    };
  }

  /**
   * Refresh dashboard data (force cache invalidation)
   */
  async refreshDashboard(teamId: number): Promise<void> {
    await this.request<void>(`/dashboard/refresh`, {
      method: 'POST',
      body: JSON.stringify({ team_id: teamId }),
    });
  }

  /**
   * Get dashboard configuration for a team
   */
  async getTeamDashboardConfig(teamId: number): Promise<{
    widgets: Array<{
      id: string;
      type: string;
      title: string;
      position: { x: number; y: number; width: number; height: number };
      settings: Record<string, any>;
      enabled: boolean;
    }>;
    refreshInterval: number;
    theme: string;
  }> {
    const response = await this.request<{
      widgets: Array<{
        id: string;
        type: string;
        title: string;
        position: { x: number; y: number; width: number; height: number };
        settings: Record<string, any>;
        enabled: boolean;
      }>;
      refresh_interval: number;
      theme: string;
    }>(`/dashboard/config?team_id=${teamId}`);
    
    return {
      widgets: response.widgets,
      refreshInterval: response.refresh_interval,
      theme: response.theme,
    };
  }

  /**
   * Update dashboard configuration for a team
   */
  async updateTeamDashboardConfig(
    teamId: number,
    config: {
      widgets?: Array<{
        id: string;
        type: string;
        title: string;
        position: { x: number; y: number; width: number; height: number };
        settings: Record<string, any>;
        enabled: boolean;
      }>;
      refreshInterval?: number;
      theme?: string;
    }
  ): Promise<void> {
    await this.request<void>(`/dashboard/config`, {
      method: 'PUT',
      body: JSON.stringify({
        team_id: teamId,
        ...config,
        refresh_interval: config.refreshInterval,
      }),
    });
  }

  /**
   * Get comparative metrics across teams (for admins)
   */
  async getTeamsComparison(teamIds: number[]): Promise<{
    teams: Array<{
      teamId: number;
      teamName: string;
      metrics: DashboardMetrics;
    }>;
    aggregated: DashboardMetrics;
  }> {
    const params = new URLSearchParams({
      team_ids: teamIds.join(','),
    });
    
    const response = await this.request<{
      teams: Array<{
        team_id: number;
        team_name: string;
        metrics: DashboardMetrics;
      }>;
      aggregated: DashboardMetrics;
    }>(`/dashboard/compare?${params.toString()}`);
    
    return {
      teams: response.teams.map(team => ({
        teamId: team.team_id,
        teamName: team.team_name,
        metrics: team.metrics,
      })),
      aggregated: response.aggregated,
    };
  }
}

/**
 * Singleton instance of the dashboard API service
 */
export const dashboardApi = new DashboardApiService();
export default dashboardApi;

// Dashboard API service for OpsSight UI

/**
 * Fetch system metrics (CI/CD, K8s, Cloud Cost).
 * @returns {Promise<any>} System metrics data
 */
export async function fetchSystemMetrics() {
  const res = await fetch('/api/metrics/system');
  if (!res.ok) throw new Error('Failed to fetch system metrics');
  return res.json();
}

/**
 * Fetch live metrics for Command Center panel.
 * @returns {Promise<any>} Live metrics data
 */
export async function fetchLiveMetrics() {
  const res = await fetch('/api/metrics/live');
  if (!res.ok) throw new Error('Failed to fetch live metrics');
  return res.json();
}

/**
 * Fetch events feed for Command Center panel.
 * @returns {Promise<any>} Events data
 */
export async function fetchEvents() {
  const res = await fetch('/api/events');
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

/**
 * Fetch AI insights for Action & Insights panel.
 * @returns {Promise<any>} Insights data
 */
export async function fetchInsights() {
  const res = await fetch('/api/insights');
  if (!res.ok) throw new Error('Failed to fetch insights');
  return res.json();
}

/**
 * Fetch available actions for Action & Insights panel.
 * @returns {Promise<any>} Actions data
 */
export async function fetchActions() {
  const res = await fetch('/api/actions');
  if (!res.ok) throw new Error('Failed to fetch actions');
  return res.json();
} 