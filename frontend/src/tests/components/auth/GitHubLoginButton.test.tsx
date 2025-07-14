/**
 * Unit tests for GitHubLoginButton component
 * Tests OAuth initiation, props handling, and accessibility features
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import GitHubLoginButton from '../../../components/auth/GitHubLoginButton';

// Mock environment variables
const mockEnv = {
  VITE_GITHUB_CLIENT_ID: 'test-client-id'
};

// Mock process.env for Jest
process.env.VITE_GITHUB_CLIENT_ID = 'test-client-id';

// Mock window.location
const mockLocation = {
  origin: 'http://localhost:3000',
  href: ''
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

// Mock sessionStorage
const mockSessionStorage = {
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true
});

describe('GitHubLoginButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.href = '';
    process.env.VITE_GITHUB_CLIENT_ID = 'test-client-id';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('rendering', () => {
    // Expected use test
    it('should render with default props', () => {
      render(<GitHubLoginButton />);
      
      const button = screen.getByRole('button', { name: /sign in with github/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Continue with GitHub');
      expect(button).not.toBeDisabled();
    });

    // Expected use test
    it('should render GitHub icon', () => {
      render(<GitHubLoginButton />);
      
      const icon = screen.getByRole('button').querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('viewBox', '0 0 24 24');
    });

    // Expected use test
    it('should display loading state correctly', () => {
      render(<GitHubLoginButton isLoading={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Connecting...');
      
      // Should show loading spinner
      const spinner = button.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    // Edge case test
    it('should apply size variants correctly', () => {
      const { rerender } = render(<GitHubLoginButton size="sm" />);
      let button = screen.getByRole('button');
      expect(button).toHaveClass('px-3', 'py-2', 'text-sm');

      rerender(<GitHubLoginButton size="lg" />);
      button = screen.getByRole('button');
      expect(button).toHaveClass('px-6', 'py-3', 'text-lg');
    });

    // Edge case test
    it('should apply style variants correctly', () => {
      const { rerender } = render(<GitHubLoginButton variant="primary" />);
      let button = screen.getByRole('button');
      expect(button).toHaveClass('bg-neutral-900', 'text-neutral-0');

      rerender(<GitHubLoginButton variant="secondary" />);
      button = screen.getByRole('button');
      expect(button).toHaveClass('bg-neutral-100', 'text-neutral-900');

      rerender(<GitHubLoginButton variant="outline" />);
      button = screen.getByRole('button');
      expect(button).toHaveClass('bg-transparent', 'border-neutral-300');
    });

    // Edge case test
    it('should apply custom className', () => {
      render(<GitHubLoginButton className="custom-class" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('accessibility', () => {
    // Expected use test
    it('should have proper ARIA attributes', () => {
      render(<GitHubLoginButton />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Sign in with GitHub');
      expect(button).toHaveAttribute('type', 'button');
      expect(button).toHaveAttribute('data-testid', 'github-login-button');
    });

    // Expected use test
    it('should be keyboard accessible', () => {
      render(<GitHubLoginButton />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2');
    });

    // Edge case test
    it('should hide decorative icons from screen readers', () => {
      render(<GitHubLoginButton />);
      
      const icons = screen.getByRole('button').querySelectorAll('svg');
      icons.forEach(icon => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('OAuth functionality', () => {
    // Expected use test
    it('should initiate OAuth flow on click', () => {
      render(<GitHubLoginButton />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should set state in sessionStorage
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'github_oauth_state',
        expect.any(String)
      );

      // Should redirect to GitHub OAuth URL
      expect(mockLocation.href).toContain('https://github.com/login/oauth/authorize');
      expect(mockLocation.href).toContain('client_id=test-client-id');
      expect(mockLocation.href).toContain('redirect_uri=http://localhost:3000/auth/callback');
      expect(mockLocation.href).toContain('scope=user:email%20read:user');
      expect(mockLocation.href).toContain('state=');
      expect(mockLocation.href).toContain('allow_signup=true');
    });

    // Expected use test
    it('should call onLoginStart callback when provided', () => {
      const onLoginStart = jest.fn();
      render(<GitHubLoginButton onLoginStart={onLoginStart} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(onLoginStart).toHaveBeenCalledTimes(1);
    });

    // Edge case test
    it('should generate unique state parameter', () => {
      render(<GitHubLoginButton />);
      
      const button = screen.getByRole('button');
      
      // Click multiple times
      fireEvent.click(button);
      const firstCall = mockSessionStorage.setItem.mock.calls[0][1];
      
      mockSessionStorage.setItem.mockClear();
      fireEvent.click(button);
      const secondCall = mockSessionStorage.setItem.mock.calls[0][1];

      // State should be different each time
      expect(firstCall).not.toBe(secondCall);
    });

    // Edge case test
    it('should include timestamp and random data in state', () => {
      render(<GitHubLoginButton />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      const stateParam = mockSessionStorage.setItem.mock.calls[0][1];
      const decodedState = JSON.parse(atob(stateParam));

      expect(decodedState).toHaveProperty('timestamp');
      expect(decodedState).toHaveProperty('random');
      expect(typeof decodedState.timestamp).toBe('number');
      expect(typeof decodedState.random).toBe('string');
    });
  });

  describe('error handling', () => {
    // Failure case test
    it('should handle missing GitHub client ID', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const originalEnv = process.env.VITE_GITHUB_CLIENT_ID;
      delete process.env.VITE_GITHUB_CLIENT_ID;

      render(<GitHubLoginButton />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(consoleSpy).toHaveBeenCalledWith('GitHub Client ID not configured');
      expect(mockLocation.href).toBe('');
      
      // Restore
      process.env.VITE_GITHUB_CLIENT_ID = originalEnv;
      consoleSpy.mockRestore();
    });

    // Failure case test
    it('should not initiate OAuth when loading', () => {
      render(<GitHubLoginButton isLoading={true} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
      expect(mockLocation.href).toBe('');
    });

    // Failure case test
    it('should handle sessionStorage errors gracefully', () => {
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error('SessionStorage error');
      });

      render(<GitHubLoginButton />);
      
      const button = screen.getByRole('button');
      
      // Should not throw error
      expect(() => fireEvent.click(button)).not.toThrow();
    });
  });

  describe('component state management', () => {
    // Expected use test
    it('should handle multiple rapid clicks', () => {
      render(<GitHubLoginButton />);
      
      const button = screen.getByRole('button');
      
      // Rapidly click multiple times
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      // Should still work (last click should execute)
      expect(mockSessionStorage.setItem).toHaveBeenCalled();
      expect(mockLocation.href).toContain('github.com');
    });

    // Edge case test
    it('should not interfere with button when disabled via loading', async () => {
      const { rerender } = render(<GitHubLoginButton isLoading={false} />);
      
      let button = screen.getByRole('button');
      expect(button).not.toBeDisabled();

      rerender(<GitHubLoginButton isLoading={true} />);
      button = screen.getByRole('button');
      expect(button).toBeDisabled();

      fireEvent.click(button);
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('URL construction', () => {
    // Expected use test
    it('should construct proper OAuth URL with all parameters', () => {
      render(<GitHubLoginButton />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      const url = new URL(mockLocation.href);
      
      expect(url.hostname).toBe('github.com');
      expect(url.pathname).toBe('/login/oauth/authorize');
      expect(url.searchParams.get('client_id')).toBe('test-client-id');
      expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/auth/callback');
      expect(url.searchParams.get('scope')).toBe('user:email read:user');
      expect(url.searchParams.get('allow_signup')).toBe('true');
      expect(url.searchParams.get('state')).toBeTruthy();
    });

    // Edge case test
    it('should handle different origin URLs', () => {
      mockLocation.origin = 'https://app.example.com';
      
      render(<GitHubLoginButton />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockLocation.href).toContain('redirect_uri=https://app.example.com/auth/callback');
    });
  });
}); 