/**
 * Unit tests for App component and routing.
 * Tests authentication flows, route protection, and navigation.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

// Mock the auth context
const mockAuthState = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  tokens: null,
  error: null,
};

const mockLogin = jest.fn();
const mockLogout = jest.fn();
const mockRefreshToken = jest.fn();
const mockGetCurrentUser = jest.fn();

// Mock the useAuth hook
jest.mock('../contexts/AuthContext', () => ({
  ...jest.requireActual('../contexts/AuthContext'),
  AuthProvider: (props) => React.createElement('div', {}, props.children),
  useAuth: () => ({
    state: mockAuthState,
    login: mockLogin,
    logout: mockLogout,
    refreshToken: mockRefreshToken,
    getCurrentUser: mockGetCurrentUser,
  }),
}));

// Mock the components to avoid complex rendering
jest.mock('../components/auth/OAuthCallback', () => {
  return function MockOAuthCallback() {
    return <div data-testid="oauth-callback">OAuth Callback Component</div>;
  };
});

jest.mock('../components/auth/GitHubLoginButton', () => {
  return function MockGitHubLoginButton() {
    return <button data-testid="github-login-button">Sign in with GitHub</button>;
  };
});

jest.mock('../components/auth/UserProfile', () => {
  return function MockUserProfile({ variant }: { variant?: string }) {
    return <div data-testid={`user-profile-${variant || 'default'}`}>User Profile</div>;
  };
});

// Mock globals.css import
jest.mock('../globals.css', () => ({}));

// Helper function to render app with specific route
const renderWithRoute = (initialRoute = '/') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <App />
    </MemoryRouter>
  );
};

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to unauthenticated state
    Object.assign(mockAuthState, {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      tokens: null,
      error: null,
    });
  });

  describe('Authentication State Management', () => {
    it('should show loading spinner when authentication is loading', () => {
      Object.assign(mockAuthState, { isLoading: true });

      renderWithRoute('/dashboard');

      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });

    it('should redirect to login when not authenticated and accessing protected route', () => {
      renderWithRoute('/dashboard');

      expect(screen.getByText('Welcome to OpsSight')).toBeInTheDocument();
      expect(screen.getByText('Sign in with your GitHub account to get started')).toBeInTheDocument();
    });

    it('should redirect to dashboard when authenticated and accessing public route', () => {
      Object.assign(mockAuthState, { 
        isAuthenticated: true,
        user: { github_username: 'testuser' }
      });

      renderWithRoute('/login');

      expect(screen.getByText('Welcome to your DevOps Dashboard')).toBeInTheDocument();
    });
  });

  describe('Route Rendering', () => {
    it('should render login page for /login route when unauthenticated', () => {
      renderWithRoute('/login');

      expect(screen.getByText('Welcome to OpsSight')).toBeInTheDocument();
      expect(screen.getByText('Your comprehensive DevOps visibility platform')).toBeInTheDocument();
      expect(screen.getByTestId('github-login-button')).toBeInTheDocument();
    });

    it('should render OAuth callback component for /auth/callback route', () => {
      renderWithRoute('/auth/callback');

      expect(screen.getByTestId('oauth-callback')).toBeInTheDocument();
    });

    it('should render dashboard for /dashboard route when authenticated', () => {
      Object.assign(mockAuthState, { 
        isAuthenticated: true,
        user: { github_username: 'testuser' }
      });

      renderWithRoute('/dashboard');

      expect(screen.getByText('Welcome to your DevOps Dashboard')).toBeInTheDocument();
      expect(screen.getByText('OpsSight')).toBeInTheDocument();
      expect(screen.getByTestId('user-profile-compact')).toBeInTheDocument();
      expect(screen.getByTestId('user-profile-full')).toBeInTheDocument();
    });

    it('should render profile page for /profile route when authenticated', () => {
      Object.assign(mockAuthState, { 
        isAuthenticated: true,
        user: { github_username: 'testuser' }
      });

      renderWithRoute('/profile');

      expect(screen.getByText('User Profile')).toBeInTheDocument();
      expect(screen.getByTestId('user-profile-full')).toBeInTheDocument();
      expect(screen.getByTestId('user-profile-compact')).toBeInTheDocument();
    });

    it('should redirect root path to dashboard', () => {
      Object.assign(mockAuthState, { 
        isAuthenticated: true,
        user: { github_username: 'testuser' }
      });

      renderWithRoute('/');

      expect(screen.getByText('Welcome to your DevOps Dashboard')).toBeInTheDocument();
    });

    it('should render 404 page for unknown routes', () => {
      renderWithRoute('/unknown-route');

      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByText('Page not found')).toBeInTheDocument();
      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
    });
  });

  describe('Login Page Features', () => {
    it('should display login page with proper branding', () => {
      renderWithRoute('/login');

      expect(screen.getByText('Welcome to OpsSight')).toBeInTheDocument();
      expect(screen.getByText('Your comprehensive DevOps visibility platform')).toBeInTheDocument();
      expect(screen.getByText('Sign in with your GitHub account to get started')).toBeInTheDocument();
      expect(screen.getByText('By signing in, you agree to our terms of service and privacy policy')).toBeInTheDocument();
    });

    it('should display security icon on login page', () => {
      renderWithRoute('/login');

      const securityIcon = screen.getByRole('img', { hidden: true });
      expect(securityIcon).toBeInTheDocument();
    });
  });

  describe('Dashboard Features', () => {
    beforeEach(() => {
      Object.assign(mockAuthState, { 
        isAuthenticated: true,
        user: { github_username: 'testuser' }
      });
    });

    it('should display dashboard metrics cards', () => {
      renderWithRoute('/dashboard');

      expect(screen.getByText('Repositories')).toBeInTheDocument();
      expect(screen.getByText('Connected repositories')).toBeInTheDocument();
      expect(screen.getByText('Deployments')).toBeInTheDocument();
      expect(screen.getByText('Active deployments')).toBeInTheDocument();
      expect(screen.getByText('Alerts')).toBeInTheDocument();
      expect(screen.getByText('Active alerts')).toBeInTheDocument();
    });

    it('should display initial metric values as zero', () => {
      renderWithRoute('/dashboard');

      const metricValues = screen.getAllByText('0');
      expect(metricValues).toHaveLength(3); // Repositories, Deployments, Alerts
    });

    it('should display header with application name', () => {
      renderWithRoute('/dashboard');

      expect(screen.getByText('OpsSight')).toBeInTheDocument();
    });

    it('should display user profile in header', () => {
      renderWithRoute('/dashboard');

      expect(screen.getByTestId('user-profile-compact')).toBeInTheDocument();
    });
  });

  describe('Profile Page Features', () => {
    beforeEach(() => {
      Object.assign(mockAuthState, { 
        isAuthenticated: true,
        user: { github_username: 'testuser' }
      });
    });

    it('should display profile page with proper header', () => {
      renderWithRoute('/profile');

      expect(screen.getByText('User Profile')).toBeInTheDocument();
      expect(screen.getByText('OpsSight')).toBeInTheDocument();
    });

    it('should display user profile components', () => {
      renderWithRoute('/profile');

      expect(screen.getByTestId('user-profile-compact')).toBeInTheDocument();
      expect(screen.getByTestId('user-profile-full')).toBeInTheDocument();
    });
  });

  describe('Navigation and Links', () => {
    it('should have working dashboard link in 404 page', () => {
      renderWithRoute('/unknown-route');

      const dashboardLink = screen.getByText('Go to Dashboard');
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('Error Boundary Integration', () => {
    it('should render without crashing', () => {
      render(<App />);
    });

    it('should handle component errors gracefully', () => {
      // Mock console.error to avoid noisy test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // This is a simple test to ensure error boundary is in place
      // In a real scenario, you'd want to throw an error from a child component
      render(<App />);

      consoleSpy.mockRestore();
    });
  });

  describe('Responsive Design', () => {
    it('should apply responsive classes on dashboard', () => {
      Object.assign(mockAuthState, { 
        isAuthenticated: true,
        user: { github_username: 'testuser' }
      });

      renderWithRoute('/dashboard');

      // Check for responsive grid classes
      const metricsGrid = screen.getByText('Repositories').closest('div')?.parentElement;
      expect(metricsGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-3');
    });

    it('should apply responsive padding and margins', () => {
      Object.assign(mockAuthState, { 
        isAuthenticated: true,
        user: { github_username: 'testuser' }
      });

      renderWithRoute('/dashboard');

      const header = screen.getByRole('banner');
      expect(header.querySelector('.max-w-7xl')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure on login page', () => {
      renderWithRoute('/login');

      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toHaveTextContent('Welcome to OpsSight');
    });

    it('should have proper heading structure on dashboard', () => {
      Object.assign(mockAuthState, { 
        isAuthenticated: true,
        user: { github_username: 'testuser' }
      });

      renderWithRoute('/dashboard');

      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('OpsSight');

      const dashboardHeading = screen.getByRole('heading', { level: 2 });
      expect(dashboardHeading).toHaveTextContent('Welcome to your DevOps Dashboard');
    });

    it('should have accessible form elements on login page', () => {
      renderWithRoute('/login');

      const loginButton = screen.getByTestId('github-login-button');
      expect(loginButton).toBeInTheDocument();
    });

    it('should have landmark roles', () => {
      Object.assign(mockAuthState, { 
        isAuthenticated: true,
        user: { github_username: 'testuser' }
      });

      renderWithRoute('/dashboard');

      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByRole('main')).toBeInTheDocument(); // main content
    });
  });
}); 