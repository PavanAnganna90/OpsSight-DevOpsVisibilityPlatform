/**
 * Unit tests for AuthContext.
 * Tests authentication state management, API integration, and error handling.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Mock import.meta.env
Object.defineProperty(global, 'importMeta', {
  value: {
    env: {
      VITE_API_BASE_URL: 'http://localhost:8000/api/v1',
    },
  },
  writable: true,
});

// Test component that uses auth context
const TestComponent: React.FC = () => {
  const { state, login, logout, refreshToken, getCurrentUser } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">
        {state.isAuthenticated ? 'authenticated' : 'unauthenticated'}
      </div>
      <div data-testid="loading-status">
        {state.isLoading ? 'loading' : 'not-loading'}
      </div>
      <div data-testid="user-data">
        {state.user ? state.user.github_username : 'no-user'}
      </div>
      <div data-testid="error-message">
        {state.error || 'no-error'}
      </div>
      <button 
        data-testid="login-button" 
        onClick={() => login('test-code', 'test-state')}
      >
        Login
      </button>
      <button 
        data-testid="logout-button" 
        onClick={() => logout()}
      >
        Logout
      </button>
      <button 
        data-testid="refresh-button" 
        onClick={() => refreshToken()}
      >
        Refresh
      </button>
      <button 
        data-testid="get-user-button" 
        onClick={() => getCurrentUser()}
      >
        Get User
      </button>
    </div>
  );
};

// Mock user data
const mockUser = {
  id: 1,
  github_id: '12345',
  github_username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  bio: 'Test bio',
  company: 'Test Company',
  location: 'Test Location',
  blog: 'https://test.com',
  is_active: true,
  is_superuser: false,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  last_login: '2023-01-01T00:00:00Z',
};

// Mock tokens
const mockTokens = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  describe('Initial State', () => {
    it('should render with initial unauthenticated state', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
      expect(screen.getByTestId('loading-status')).toHaveTextContent('not-loading');
      expect(screen.getByTestId('user-data')).toHaveTextContent('no-user');
      expect(screen.getByTestId('error-message')).toHaveTextContent('no-error');
    });

    it('should throw error when useAuth is used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Initialization from localStorage', () => {
    it('should restore authentication state from localStorage', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'opsight_access_token':
            return 'stored-access-token';
          case 'opsight_refresh_token':
            return 'stored-refresh-token';
          case 'opsight_user_data':
            return JSON.stringify(mockUser);
          default:
            return null;
        }
      });

      // Mock getCurrentUser API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('user-data')).toHaveTextContent('testuser');
      });
    });

    it('should clear invalid stored data on initialization error', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'opsight_access_token':
            return 'invalid-token';
          case 'opsight_user_data':
            return 'invalid-json';
          default:
            return null;
        }
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('opsight_access_token');
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('opsight_refresh_token');
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('opsight_user_data');
      });
    });
  });

  describe('Login Flow', () => {
    it('should handle successful login', async () => {
      // Mock login API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      });

      // Mock user data API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      fireEvent.click(screen.getByTestId('login-button'));

      // Should show loading state
      expect(screen.getByTestId('loading-status')).toHaveTextContent('loading');

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('user-data')).toHaveTextContent('testuser');
        expect(screen.getByTestId('loading-status')).toHaveTextContent('not-loading');
      });

      // Verify API calls
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/auth/login/github',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: 'test-code', state: 'test-state' }),
        })
      );

      // Verify localStorage calls
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('opsight_access_token', mockTokens.access_token);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('opsight_refresh_token', mockTokens.refresh_token);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('opsight_user_data', JSON.stringify(mockUser));
    });

    it('should handle login API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Login failed' }),
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Login failed');
        expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
        expect(screen.getByTestId('loading-status')).toHaveTextContent('not-loading');
      });
    });

    it('should handle user data fetch error during login', async () => {
      // Mock successful token exchange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      });

      // Mock failed user data fetch
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to fetch user data');
        expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
      });
    });
  });

  describe('Logout Flow', () => {
    it('should handle successful logout', async () => {
      // Set up authenticated state
      mockLocalStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'opsight_access_token':
            return 'test-token';
          case 'opsight_user_data':
            return JSON.stringify(mockUser);
          default:
            return null;
        }
      });

      // Mock getCurrentUser for initialization
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      // Mock logout API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      fireEvent.click(screen.getByTestId('logout-button'));

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
        expect(screen.getByTestId('user-data')).toHaveTextContent('no-user');
      });

      // Verify localStorage is cleared
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('opsight_access_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('opsight_refresh_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('opsight_user_data');
    });

    it('should clear state even if logout API fails', async () => {
      // Set up authenticated state
      mockLocalStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'opsight_access_token':
            return 'test-token';
          case 'opsight_user_data':
            return JSON.stringify(mockUser);
          default:
            return null;
        }
      });

      // Mock getCurrentUser for initialization
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      // Mock failed logout API call
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      fireEvent.click(screen.getByTestId('logout-button'));

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
      });

      expect(consoleSpy).toHaveBeenCalledWith('Logout API call failed:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Token Refresh', () => {
    it('should handle successful token refresh', async () => {
      // Set up authenticated state with refresh token
      const initialState = {
        isAuthenticated: true,
        isLoading: false,
        user: mockUser,
        tokens: mockTokens,
        error: null,
      };

      const newTokens = {
        ...mockTokens,
        access_token: 'new-access-token',
      };

      // Mock refresh API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newTokens,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Set initial state manually for this test
      fireEvent.click(screen.getByTestId('refresh-button'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/v1/auth/refresh',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: undefined }),
          })
        );
      });
    });

    it('should handle refresh token error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      fireEvent.click(screen.getByTestId('refresh-button'));

      await waitFor(() => {
        // Should logout user on refresh failure
        expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
      });
    });
  });

  describe('Get Current User', () => {
    it('should fetch and update current user data', async () => {
      const updatedUser = { ...mockUser, full_name: 'Updated Name' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedUser,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      fireEvent.click(screen.getByTestId('get-user-button'));

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'opsight_user_data',
          JSON.stringify(updatedUser)
        );
      });
    });

    it('should handle get user API error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      fireEvent.click(screen.getByTestId('get-user-button'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to get current user:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed localStorage data', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'opsight_user_data') return '{invalid json}';
        return null;
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
    });

    it('should handle missing refresh token during refresh', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      fireEvent.click(screen.getByTestId('refresh-button'));

      // Should not make API call without refresh token
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Network error');
        expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
      });
    });
  });
}); 