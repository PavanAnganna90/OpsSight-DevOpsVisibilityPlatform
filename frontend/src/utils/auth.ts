import { AuthResponse, AuthError } from '@/types/auth';

/**
 * Time before token expiry to trigger refresh (5 minutes)
 */
const REFRESH_THRESHOLD = 5 * 60 * 1000;

/**
 * Storage key for refresh timing
 */
const REFRESH_TIMING_KEY = 'auth_refresh_at';

/**
 * Check if token needs refresh based on expiry time
 * @returns boolean indicating if refresh is needed
 */
export function needsRefresh(): boolean {
  const refreshAt = localStorage.getItem(REFRESH_TIMING_KEY);
  if (!refreshAt) return true;
  
  return Date.now() >= parseInt(refreshAt, 10);
}

/**
 * Calculate next refresh time based on token expiry
 * @param expiresIn - Token expiry time in seconds
 */
export function setNextRefresh(expiresIn: number): void {
  // Calculate when to refresh (expiry minus threshold)
  const refreshAt = Date.now() + (expiresIn * 1000) - REFRESH_THRESHOLD;
  localStorage.setItem(REFRESH_TIMING_KEY, refreshAt.toString());
}

/**
 * Clear refresh timing from storage
 */
export function clearRefreshTiming(): void {
  localStorage.removeItem(REFRESH_TIMING_KEY);
}

/**
 * Refresh the access token using the refresh token
 * @returns Promise with the new auth response
 * @throws AuthError if refresh fails
 */
export async function refreshToken(): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include', // Important for cookies
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to refresh token');
    }

    const data: AuthResponse = await response.json();
    
    // Set next refresh time
    setNextRefresh(data.expires_in);
    
    return data;
  } catch (error) {
    // Clear refresh timing on error
    clearRefreshTiming();
    
    throw {
      message: error instanceof Error ? error.message : 'Token refresh failed',
      code: 'AUTH_REFRESH_ERROR',
      status: 401,
    } as AuthError;
  }
}

/**
 * Create an axios interceptor for automatic token refresh
 * @param axiosInstance - Axios instance to add interceptor to
 */
export function setupRefreshInterceptor(axiosInstance: any): void {
  let refreshPromise: Promise<AuthResponse> | null = null;

  axiosInstance.interceptors.request.use(
    async (config: any) => {
      // Check if token needs refresh
      if (needsRefresh()) {
        try {
          // Use existing refresh promise if one is in progress
          refreshPromise = refreshPromise || refreshToken();
          await refreshPromise;
        } catch (error) {
          // Clear the promise on error
          refreshPromise = null;
          throw error;
        }
      }
      return config;
    },
    (error: any) => Promise.reject(error)
  );
} 