'use client';

import React, { createContext, useContext, ReactNode } from 'react';

// Mock types for development
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
  organization_id?: string;
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
  auth_provider?: string;
  provider_user_id?: string;
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

interface AuthContextType {
  state: AuthState;
  login: (code: string, state?: string) => Promise<void>;
  loginWithProvider: (provider: string, redirectUri?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  getAvailableProviders: () => Promise<any[]>;
  hasPermission: (permission: string, organizationId?: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  getUserPermissions: () => Permission[];
  getUserRoles: () => Role[];
  isAdmin: () => boolean;
  canAccess: (resource: string, action: string, organizationId?: string) => boolean;
}

// Mock authenticated user
const mockUser: User = {
  id: 1,
  github_id: 'mock-dev-user',
  github_username: 'devuser',
  email: 'dev@opssight.local',
  full_name: 'Development User',
  avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
  bio: 'Development test user',
  company: 'OpsSight Dev',
  location: 'localhost',
  blog: 'https://localhost:3000',
  is_active: true,
  is_superuser: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  last_login: new Date().toISOString(),
  auth_provider: 'github',
  provider_user_id: 'mock-1',
  roles: [{
    id: 'admin',
    name: 'admin',
    display_name: 'Administrator',
    description: 'Full system access',
    priority: 100,
    is_system_role: true,
    permissions: []
  }],
  permissions: []
};

const mockTokens: AuthTokens = {
  access_token: 'mock-dev-token',
  refresh_token: 'mock-refresh-token',
  token_type: 'bearer',
  expires_in: 3600
};

// Mock authenticated state
const mockState: AuthState = {
  isAuthenticated: true,
  isLoading: false,
  user: mockUser,
  tokens: mockTokens,
  error: null
};

const DevAuthContext = createContext<AuthContextType | undefined>(undefined);

export const DevAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Mock implementations that always succeed
  const login = async (code: string, state?: string): Promise<void> => {
    console.log('Dev Auth: Mock login successful');
  };

  const loginWithProvider = async (provider: string, redirectUri?: string): Promise<void> => {
    console.log('Dev Auth: Mock provider login successful');
  };

  const logout = async (): Promise<void> => {
    console.log('Dev Auth: Mock logout');
  };

  const refreshToken = async (): Promise<void> => {
    console.log('Dev Auth: Mock token refresh');
  };

  const getCurrentUser = async (): Promise<void> => {
    console.log('Dev Auth: Mock get current user');
  };

  const getAvailableProviders = async (): Promise<any[]> => {
    return [{
      name: 'github',
      display_name: 'GitHub',
      icon: 'github',
      enabled: true,
      type: 'oauth2'
    }];
  };

  const hasPermission = (permission: string, organizationId?: string): boolean => {
    return true; // Mock: all permissions granted
  };

  const hasRole = (role: string): boolean => {
    return true; // Mock: all roles granted
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return true; // Mock: all roles granted
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return true; // Mock: all permissions granted
  };

  const getUserPermissions = (): Permission[] => {
    return [];
  };

  const getUserRoles = (): Role[] => {
    return mockUser.roles || [];
  };

  const isAdmin = (): boolean => {
    return true; // Mock: always admin
  };

  const canAccess = (resource: string, action: string, organizationId?: string): boolean => {
    return true; // Mock: all access granted
  };

  const contextValue: AuthContextType = {
    state: mockState,
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
    <DevAuthContext.Provider value={contextValue}>
      {children}
    </DevAuthContext.Provider>
  );
};

export const useDevAuth = (): AuthContextType => {
  const context = useContext(DevAuthContext);
  
  if (context === undefined) {
    throw new Error('useDevAuth must be used within a DevAuthProvider');
  }
  
  return context;
};

// Export as useAuth for drop-in replacement
export const useAuth = useDevAuth;