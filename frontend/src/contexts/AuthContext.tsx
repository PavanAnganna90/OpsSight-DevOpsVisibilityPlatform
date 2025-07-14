/**
 * Authentication context for managing user session state.
 * Provides authentication state, user data, and auth methods to components.
 */
'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { 
  APIError, 
  NetworkError, 
  TokenError, 
  ErrorLogger,
  AppError,
  ErrorType,
  handleFetchError,
  createNetworkError 
} from '../utils/errorHandling';
import { 
  TokenSecurity, 
  CSRFProtection,
  InputValidator,
  RateLimiter 
} from '../utils/security';

// Types for authentication state
interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  priority: number;
  is_system_role: boolean;
  permissions: Permission[];
}

interface Permission {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  is_system_permission: boolean;
}

interface User {
  id: number;
  github_id: string;
  github_username: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string | null;
  updated_at: string | null;
  last_login: string | null;
  roles?: Role[];
  permissions?: Permission[];
  organization_id?: string;
  // Multi-provider auth fields
  auth_provider?: string;
  provider_user_id?: string;
  linked_accounts?: LinkedAccount[];
}

interface LinkedAccount {
  provider: string;
  provider_user_id: string;
  provider_username?: string;
  linked_at: string;
}

interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  tokens: AuthTokens | null;
  error: string | null;
}

// Auth action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; tokens: AuthTokens } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_REFRESH_SUCCESS'; payload: AuthTokens }
  | { type: 'AUTH_UPDATE_USER'; payload: User };

// Provider information interface
interface SSOProvider {
  name: string;
  display_name: string;
  icon: string;
  enabled: boolean;
  type: 'oauth2' | 'saml';
}

// Auth context interface
interface AuthContextType {
  state: AuthState;
  login: (code: string, state?: string) => Promise<void>;
  loginWithProvider: (provider: string, redirectUri?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  getAvailableProviders: () => Promise<SSOProvider[]>;
  hasPermission: (permission: string, organizationId?: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  getUserPermissions: () => Permission[];
  getUserRoles: () => Role[];
  isAdmin: () => boolean;
  canAccess: (resource: string, action: string, organizationId?: string) => boolean;
}

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  tokens: null,
  error: null,
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
        tokens: action.payload.tokens,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        tokens: null,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...initialState,
      };
    case 'AUTH_REFRESH_SUCCESS':
      return {
        ...state,
        tokens: action.payload,
        error: null,
      };
    case 'AUTH_UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'opsight_access_token',
  REFRESH_TOKEN: 'opsight_refresh_token',
  USER_DATA: 'opsight_user_data',
} as const;

// API base URL - Use process.env for Jest compatibility
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

/**
 * Authentication Provider Component
 * 
 * Manages authentication state and provides auth methods to child components.
 * Handles token persistence, automatic refresh, and session restoration.
 * 
 * @param children - Child components that need access to auth context
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  /**
   * Initialize authentication state from stored tokens on app start.
   */
  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);

      if (accessToken && userData) {
        try {
          const user = JSON.parse(userData);
          const tokens = {
            access_token: accessToken,
            refresh_token: refreshToken || undefined,
            token_type: 'bearer',
          };

          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user, tokens },
          });

          // Verify token is still valid by fetching current user
          await getCurrentUser();
        } catch (error) {
          // Reason: Clear invalid stored data
          clearStoredAuth();
        }
      }
    };

    initializeAuth();
  }, []);

  /**
   * Clear stored authentication data from localStorage.
   */
  const clearStoredAuth = (): void => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  };

  /**
   * Store authentication data in localStorage.
   */
  const storeAuthData = (user: User, tokens: AuthTokens): void => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
    if (tokens.refresh_token) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
    }
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  };

  /**
   * Make authenticated API request with automatic token refresh.
   */
  const authenticatedFetch = async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const accessToken = state.tokens?.access_token;
    
    if (!accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // If token expired, try to refresh
    if (response.status === 401 && state.tokens?.refresh_token) {
      try {
        await refreshToken();
        // Retry the request with new token
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${state.tokens?.access_token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (refreshError) {
        // Refresh failed, logout user
        await logout();
        throw new Error('Session expired. Please log in again.');
      }
    }

    return response;
  };

  /**
   * Login with GitHub OAuth code.
   */
  const login = async (code: string, state_param?: string): Promise<void> => {
    dispatch({ type: 'AUTH_START' });

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/github`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          state: state_param,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const tokens: AuthTokens = await response.json();

      // Get user data
      const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
      }

      const user: User = await userResponse.json();

      // Store auth data
      storeAuthData(user, tokens);

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, tokens },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      throw error;
    }
  };

  /**
   * Logout current user.
   */
  const logout = async (): Promise<void> => {
    try {
      // Call logout endpoint if authenticated
      if (state.tokens?.access_token) {
        await authenticatedFetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
        });
      }
    } catch (error) {
      // Log error but continue with logout
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local state and storage
      clearStoredAuth();
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  /**
   * Refresh access token using refresh token.
   */
  const refreshToken = async (): Promise<void> => {
    const refresh_token = state.tokens?.refresh_token;
    
    if (!refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token,
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const tokens: AuthTokens = await response.json();

      // Update stored tokens
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
      if (tokens.refresh_token) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
      }

      dispatch({
        type: 'AUTH_REFRESH_SUCCESS',
        payload: tokens,
      });
    } catch (error) {
      // Refresh failed, logout user
      await logout();
      throw error;
    }
  };

  /**
   * Get current user data from API.
   */
  const getCurrentUser = async (): Promise<void> => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/auth/me`);

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const user: User = await response.json();

      // Update stored user data
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

      dispatch({
        type: 'AUTH_UPDATE_USER',
        payload: user,
      });
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  };

  /**
   * Check if user has specific permission.
   */
  const hasPermission = (permission: string, organizationId?: string): boolean => {
    if (!state.user || !state.isAuthenticated) return false;
    
    // Superuser has all permissions
    if (state.user.is_superuser) return true;
    
    // Check user permissions
    if (state.user.permissions) {
      return state.user.permissions.some(p => 
        p.name === permission && 
        (!organizationId || !p.organization_id || p.organization_id === organizationId)
      );
    }
    
    // Check role permissions
    if (state.user.roles) {
      return state.user.roles.some(role => 
        role.permissions.some(p => 
          p.name === permission && 
          (!organizationId || !p.organization_id || p.organization_id === organizationId)
        )
      );
    }
    
    return false;
  };

  /**
   * Check if user has specific role.
   */
  const hasRole = (role: string): boolean => {
    if (!state.user || !state.isAuthenticated) return false;
    
    return state.user.roles?.some(r => r.name === role) || false;
  };

  /**
   * Check if user has any of the specified roles.
   */
  const hasAnyRole = (roles: string[]): boolean => {
    if (!state.user || !state.isAuthenticated) return false;
    
    return roles.some(role => hasRole(role));
  };

  /**
   * Check if user has any of the specified permissions.
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!state.user || !state.isAuthenticated) return false;
    
    return permissions.some(permission => hasPermission(permission));
  };

  /**
   * Get all user permissions (direct + role-based).
   */
  const getUserPermissions = (): Permission[] => {
    if (!state.user || !state.isAuthenticated) return [];
    
    const permissions = new Map<string, Permission>();
    
    // Add direct permissions
    if (state.user.permissions) {
      state.user.permissions.forEach(p => permissions.set(p.id, p));
    }
    
    // Add role permissions
    if (state.user.roles) {
      state.user.roles.forEach(role => {
        role.permissions.forEach(p => permissions.set(p.id, p));
      });
    }
    
    return Array.from(permissions.values());
  };

  /**
   * Get all user roles.
   */
  const getUserRoles = (): Role[] => {
    if (!state.user || !state.isAuthenticated) return [];
    
    return state.user.roles || [];
  };

  /**
   * Check if user is admin (superuser or has admin role).
   */
  const isAdmin = (): boolean => {
    if (!state.user || !state.isAuthenticated) return false;
    
    return state.user.is_superuser || hasRole('admin') || hasRole('organization_owner');
  };

  /**
   * Check if user can access a resource with specific action.
   */
  const canAccess = (resource: string, action: string, organizationId?: string): boolean => {
    if (!state.user || !state.isAuthenticated) return false;
    
    // Build permission name from resource and action
    const permissionName = `${action}_${resource}`;
    
    return hasPermission(permissionName, organizationId);
  };

  /**
   * Login with any supported provider (OAuth2 or SAML).
   */
  const loginWithProvider = async (provider: string, redirectUri?: string): Promise<void> => {
    dispatch({ type: 'AUTH_START' });

    try {
      // Check if it's an OAuth2 or SAML provider
      const availableProviders = await getAvailableProviders();
      const providerInfo = availableProviders.find(p => p.name === provider);
      
      if (!providerInfo) {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      if (providerInfo.type === 'oauth2') {
        // Handle OAuth2 flow
        const response = await fetch(`${API_BASE_URL}/auth/sso/oauth/${provider}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider,
            redirect_uri: redirectUri || `${window.location.origin}/auth/callback`,
            state: generateState()
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to initiate OAuth login');
        }

        const data = await response.json();
        
        if (data.success && data.redirect_url) {
          // Store state for callback validation
          sessionStorage.setItem('oauth_state', data.state);
          sessionStorage.setItem('oauth_provider', provider);
          
          // Redirect to OAuth provider
          window.location.href = data.redirect_url;
        } else {
          throw new Error(data.error || 'OAuth login failed');
        }
      } else if (providerInfo.type === 'saml') {
        // Handle SAML flow
        const response = await fetch(`${API_BASE_URL}/auth/sso/saml/${provider}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider,
            relay_state: generateState()
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to initiate SAML login');
        }

        const data = await response.json();
        
        if (data.success && data.sso_url) {
          // Store state for callback validation
          sessionStorage.setItem('saml_state', data.relay_state);
          sessionStorage.setItem('saml_provider', provider);
          
          // Redirect to SAML provider
          window.location.href = data.sso_url;
        } else {
          throw new Error(data.error || 'SAML login failed');
        }
      }
    } catch (error) {
      console.error('Provider login error:', error);
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error instanceof Error ? error.message : 'Provider login failed',
      });
      throw error;
    }
  };

  /**
   * Get available SSO providers.
   */
  const getAvailableProviders = async (): Promise<SSOProvider[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/sso/config`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch SSO providers');
      }

      const data = await response.json();
      
      // Combine OAuth2 and SAML providers
      return [
        ...data.oauth_providers,
        ...data.saml_providers
      ].filter(provider => provider.enabled);
    } catch (error) {
      console.error('Error fetching providers:', error);
      return [];
    }
  };

  /**
   * Generate random state for CSRF protection.
   */
  const generateState = (): string => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  const contextValue: AuthContextType = {
    state,
    login,
    loginWithProvider,
    logout,
    refreshToken,
    getCurrentUser,
    getAvailableProviders,
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAnyPermission,
    getUserPermissions,
    getUserRoles,
    isAdmin,
    canAccess,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to access authentication context.
 * 
 * @returns AuthContextType - Authentication state and methods
 * @throws Error if used outside AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext; 