/**
 * Enhanced API Service for backend communication
 * Handles authentication, error handling, caching, and real-time data fetching
 * Optimized for enterprise-grade backend architecture
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  cached?: boolean;
  request_id?: string;
  process_time?: number;
}

export interface OAuthProvider {
  provider: string;
  name: string;
  configured: boolean;
  enabled: boolean;
  description: string;
}

export interface OAuthProvidersResponse {
  providers: OAuthProvider[];
  total_count: number;
  enabled_count: number;
}

export interface AuthorizationUrlResponse {
  authorization_url: string;
  provider: string;
  state: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment?: string;
  dependencies?: Record<string, boolean>;
}

export interface DashboardMetrics {
  services: {
    name: string;
    status: 'healthy' | 'warning' | 'error';
    uptime: string;
    response_time: number;
  }[];
  system: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
  };
  deployments: {
    id: string;
    service: string;
    status: 'running' | 'pending' | 'failed';
    timestamp: string;
    duration: number;
  }[];
}

export interface CacheMetrics {
  hit_rate: number;
  miss_rate: number;
  total_requests: number;
  hits: number;
  misses: number;
  size: number;
  max_size: number;
}

class ApiService {
  private baseUrl: string;
  private authToken: string | null = null;
  private requestCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private retryAttempts: number = 3;
  private retryDelay: number = 1000;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    // SSR-safe localStorage access
    this.authToken = typeof window !== 'undefined' 
      ? localStorage.getItem('auth_token') 
      : null;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string | null) {
    this.authToken = token;
    // SSR-safe localStorage access
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(cacheKey: string): boolean {
    const cached = this.requestCache.get(cacheKey);
    if (!cached) return false;
    
    const now = Date.now();
    return (now - cached.timestamp) < cached.ttl;
  }

  /**
   * Get cached data if valid
   */
  private getCachedData(cacheKey: string): any | null {
    if (this.isCacheValid(cacheKey)) {
      return this.requestCache.get(cacheKey)?.data || null;
    }
    return null;
  }

  /**
   * Cache data with TTL
   */
  private setCachedData(cacheKey: string, data: any, ttl: number = 300000): void {
    this.requestCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Retry failed requests with exponential backoff
   */
  private async retryRequest<T>(
    requestFn: () => Promise<Response>,
    attempts: number = this.retryAttempts
  ): Promise<Response> {
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await requestFn();
        if (response.ok || response.status < 500) {
          return response;
        }
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        if (i === attempts - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, i)));
      }
    }
    throw new Error('Max retry attempts exceeded');
  }

  /**
   * Generic API request method with caching and retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useCache: boolean = false,
    cacheTtl: number = 300000
  ): Promise<ApiResponse<T>> {
    const cacheKey = `${endpoint}-${JSON.stringify(options)}`;
    
    // Check cache for GET requests
    if (useCache && (!options.method || options.method === 'GET')) {
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        return {
          success: true,
          data: cachedData,
          cached: true,
        };
      }
    }

    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const response = await this.retryRequest(async () => {
        return fetch(url, {
          ...options,
          headers: {
            ...this.getAuthHeaders(),
            ...options.headers,
          },
        });
      });

      const data = await response.json();

      // Extract performance headers
      const requestId = response.headers.get('X-Request-ID');
      const processTime = response.headers.get('X-Process-Time');

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || `HTTP ${response.status}`,
          status: response.status,
          request_id: requestId || undefined,
          process_time: processTime ? parseFloat(processTime) : undefined,
        };
      }

      // Cache successful GET requests
      if (useCache && (!options.method || options.method === 'GET')) {
        this.setCachedData(cacheKey, data, cacheTtl);
      }

      return {
        success: true,
        data,
        status: response.status,
        request_id: requestId || undefined,
        process_time: processTime ? parseFloat(processTime) : undefined,
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * GET request with optional caching
   */
  async get<T>(endpoint: string, useCache: boolean = true, cacheTtl?: number): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' }, useCache, cacheTtl);
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Clear cache for specific endpoint or all cache
   */
  clearCache(endpoint?: string): void {
    if (endpoint) {
      const keysToDelete = Array.from(this.requestCache.keys()).filter(key => 
        key.startsWith(endpoint)
      );
      keysToDelete.forEach(key => this.requestCache.delete(key));
    } else {
      this.requestCache.clear();
    }
  }

  // OAuth Methods
  /**
   * Get available OAuth providers
   */
  async getOAuthProviders(): Promise<ApiResponse<OAuthProvidersResponse>> {
    return this.get<OAuthProvidersResponse>('/auth/oauth/providers');
  }

  /**
   * Get OAuth authorization URL for a provider
   */
  async getOAuthAuthorizationUrl(
    provider: string,
    redirectUri?: string,
    state?: string
  ): Promise<ApiResponse<AuthorizationUrlResponse>> {
    const params = new URLSearchParams();
    if (redirectUri) params.set('redirect_uri', redirectUri);
    if (state) params.set('state', state);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.get<AuthorizationUrlResponse>(`/auth/oauth/${provider}/authorize${query}`);
  }

  /**
   * Check OAuth provider health
   */
  async checkOAuthProviderHealth(provider: string): Promise<ApiResponse<any>> {
    return this.get(`/auth/oauth/${provider}/health`);
  }

  // Health Methods
  /**
   * Get application health status
   */
  async getHealth(): Promise<ApiResponse<HealthResponse>> {
    // Use the root health endpoint instead of API v1
    const response = await fetch('http://localhost:8000/health');
    const data = await response.json();
    
    return {
      success: response.ok,
      data: response.ok ? data : undefined,
      error: response.ok ? undefined : data.detail || 'Health check failed',
      status: response.status,
    };
  }

  // Dashboard Data Methods
  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(): Promise<ApiResponse<DashboardMetrics>> {
    return this.get<DashboardMetrics>('/dashboard/overview', true, 60000); // Cache for 1 minute
  }

  /**
   * Get cache performance metrics
   */
  async getCacheMetrics(): Promise<ApiResponse<CacheMetrics>> {
    try {
      // Use the root cache metrics endpoint with cache control headers to bypass service worker
      const response = await fetch(`${this.baseUrl.replace('/api/v1', '')}/cache/metrics`, {
        headers: {
          ...this.getAuthHeaders(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      });
      const data = await response.json();
      
      return {
        success: response.ok,
        data: response.ok ? data : undefined,
        error: response.ok ? undefined : data.detail || 'Cache metrics failed',
        status: response.status,
      };
    } catch (error) {
      console.error('Cache metrics fetch error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error accessing cache metrics',
        status: 0,
      };
    }
  }

  /**
   * Get API performance information
   */
  async getApiPerformance(): Promise<ApiResponse<any>> {
    try {
      // Use the root API performance endpoint with cache control headers to bypass service worker
      const response = await fetch(`${this.baseUrl.replace('/api/v1', '')}/api/performance`, {
        headers: {
          ...this.getAuthHeaders(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      });
      const data = await response.json();
      
      return {
        success: response.ok,
        data: response.ok ? data : undefined,
        error: response.ok ? undefined : data.detail || 'API performance failed',
        status: response.status,
      };
    } catch (error) {
      console.error('API performance fetch error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error accessing API performance',
        status: 0,
      };
    }
  }

  /**
   * Get pipeline data
   */
  async getPipelines(): Promise<ApiResponse<any[]>> {
    return this.get('/pipelines', true, 120000); // Cache for 2 minutes
  }

  /**
   * Get organization data
   */
  async getOrganizations(): Promise<ApiResponse<any[]>> {
    return this.get('/organizations', true, 300000); // Cache for 5 minutes
  }

  /**
   * Get user data
   */
  async getUsers(): Promise<ApiResponse<any[]>> {
    return this.get('/users', true, 180000); // Cache for 3 minutes
  }

  /**
   * Get alerts with optional filtering
   */
  async getAlerts(status?: string): Promise<ApiResponse<any[]>> {
    const endpoint = status ? `/alerts?status=${status}` : '/alerts';
    return this.get(endpoint, true, 30000); // Cache for 30 seconds (real-time data)
  }

  /**
   * Get infrastructure data
   */
  async getInfrastructure(): Promise<ApiResponse<any[]>> {
    return this.get('/infrastructure', true, 180000); // Cache for 3 minutes
  }

  /**
   * Get system monitoring data
   */
  async getMonitoringData(): Promise<ApiResponse<any>> {
    return this.get('/monitoring/system', true, 30000); // Cache for 30 seconds
  }

  /**
   * Get deployment status
   */
  async getDeployments(): Promise<ApiResponse<any[]>> {
    return this.get('/deployments', true, 60000); // Cache for 1 minute
  }

  /**
   * Get service health status
   */
  async getServiceHealth(): Promise<ApiResponse<any[]>> {
    return this.get('/monitoring/services', true, 60000); // Cache for 1 minute
  }

  /**
   * Get real-time metrics for dashboard
   */
  async getRealTimeMetrics(): Promise<ApiResponse<any>> {
    return this.get('/metrics/realtime', false); // No cache for real-time data
  }

  /**
   * Trigger cache invalidation for specific patterns
   */
  async invalidateCache(pattern?: string): Promise<ApiResponse<any>> {
    const data = pattern ? { pattern } : {};
    return this.post('/cache/invalidate', data);
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;