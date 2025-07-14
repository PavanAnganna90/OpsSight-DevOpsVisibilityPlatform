import axios from 'axios';
import { setupRefreshInterceptor } from './auth';
import { CSRFProtection, InputValidator } from './security';

/**
 * Base API client configuration
 */
const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies
});

// Set up token refresh interceptor
setupRefreshInterceptor(apiClient);

// Add CSRF protection interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add CSRF token to requests that modify data
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
      const csrfToken = CSRFProtection.getToken();
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * API error type
 */
export interface ApiError {
  message: string;
  code: string;
  status: number;
}

/**
 * Generic API response type
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/**
 * API client with error handling
 */
export const api = {
  /**
   * Make a GET request
   * @param url - API endpoint
   * @param config - Axios config
   */
  async get<T>(url: string, config = {}): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw {
          message: error.response.data.message || 'Request failed',
          code: error.response.data.code || 'API_ERROR',
          status: error.response.status,
        } as ApiError;
      }
      throw {
        message: 'Network error',
        code: 'NETWORK_ERROR',
        status: 500,
      } as ApiError;
    }
  },

  /**
   * Make a POST request
   * @param url - API endpoint
   * @param data - Request body
   * @param config - Axios config
   */
  async post<T>(url: string, data = {}, config = {}): Promise<ApiResponse<T>> {
    try {
      // Validate URL
      if (!InputValidator.validateURL(url, ['localhost', '127.0.0.1'])) {
        throw new Error('Invalid URL provided');
      }
      
      const response = await apiClient.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw {
          message: error.response.data.message || 'Request failed',
          code: error.response.data.code || 'API_ERROR',
          status: error.response.status,
        } as ApiError;
      }
      throw {
        message: 'Network error',
        code: 'NETWORK_ERROR',
        status: 500,
      } as ApiError;
    }
  },

  /**
   * Make a PUT request
   * @param url - API endpoint
   * @param data - Request body
   * @param config - Axios config
   */
  async put<T>(url: string, data = {}, config = {}): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw {
          message: error.response.data.message || 'Request failed',
          code: error.response.data.code || 'API_ERROR',
          status: error.response.status,
        } as ApiError;
      }
      throw {
        message: 'Network error',
        code: 'NETWORK_ERROR',
        status: 500,
      } as ApiError;
    }
  },

  /**
   * Make a DELETE request
   * @param url - API endpoint
   * @param config - Axios config
   */
  async delete<T>(url: string, config = {}): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw {
          message: error.response.data.message || 'Request failed',
          code: error.response.data.code || 'API_ERROR',
          status: error.response.status,
        } as ApiError;
      }
      throw {
        message: 'Network error',
        code: 'NETWORK_ERROR',
        status: 500,
      } as ApiError;
    }
  },
}; 