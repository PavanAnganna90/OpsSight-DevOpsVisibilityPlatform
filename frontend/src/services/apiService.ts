/**
 * API Service for backend communication
 * Handles authentication, error handling, and data fetching
 */

const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
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

class ApiService {
  private baseUrl: string;
  private authToken: string | null = null;

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
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Generic API request method
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || `HTTP ${response.status}`,
          status: response.status,
        };
      }

      return {
        success: true,
        data,
        status: response.status,
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
   * GET request
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
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
   * Get dashboard metrics
   */
  async getDashboardMetrics(): Promise<ApiResponse<any>> {
    return this.get('/metrics/dashboard');
  }

  /**
   * Get pipeline data
   */
  async getPipelines(): Promise<ApiResponse<any[]>> {
    return this.get('/pipelines');
  }

  /**
   * Get organization data
   */
  async getOrganizations(): Promise<ApiResponse<any[]>> {
    return this.get('/organizations');
  }

  /**
   * Get user data
   */
  async getUsers(): Promise<ApiResponse<any[]>> {
    return this.get('/users');
  }

  /**
   * Get alerts
   */
  async getAlerts(): Promise<ApiResponse<any[]>> {
    return this.get('/alerts');
  }

  /**
   * Get infrastructure data
   */
  async getInfrastructure(): Promise<ApiResponse<any[]>> {
    return this.get('/infrastructure');
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;