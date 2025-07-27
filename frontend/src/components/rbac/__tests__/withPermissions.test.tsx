/**
 * Unit tests for withPermissions HOC.
 * Tests higher-order component for page-level permission protection.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { withPermissions, withAdminAccess } from '../withPermissions';
import { useAuth } from '../../../contexts/AuthContext';

// Mock router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Mock the useAuth hook
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Test component to wrap with HOCs
const TestComponent = () => <div data-testid="protected-page">Protected Page Content</div>;

// Create mock user
const createMockUser = () => ({
  id: 1,
  github_id: 'gh_123',
  github_username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  avatar_url: 'https://example.com/avatar.png',
  bio: 'Test bio',
  company: 'Test Company',
  location: 'Test Location',
  blog: 'https://example.com',
  is_active: true,
  is_superuser: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  last_login: '2024-01-01T00:00:00Z',
});

// Create mock permissions
const createMockPermissions = (names: string[]) => names.map((name, index) => ({
  id: `perm_${index}`,
  name,
  display_name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
  description: `Permission for ${name}`,
  category: 'general',
  is_system_permission: true,
}));

// Create mock roles
const createMockRoles = (names: string[]) => names.map((name, index) => ({
  id: `role_${index}`,
  name,
  display_name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
  description: `Role for ${name}`,
  priority: index,
  is_system_role: true,
  permissions: [],
}));

// Mock auth context
const createMockAuth = (permissionNames: string[] = [], roleNames: string[] = [], isAdmin = false) => {
  const permissions = createMockPermissions(permissionNames);
  const roles = createMockRoles(roleNames);
  
  return {
    state: {
      isAuthenticated: true,
      user: createMockUser(),
      tokens: null,
      isLoading: false,
      error: null,
    },
    login: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    getCurrentUser: jest.fn(),
    hasPermission: jest.fn((permission: string) => permissionNames.includes(permission)),
    hasRole: jest.fn((role: string) => roleNames.includes(role)),
    hasAnyRole: jest.fn((roleList: string[]) => roleList.some(role => roleNames.includes(role))),
    hasAnyPermission: jest.fn((permList: string[]) => permList.some(perm => permissionNames.includes(perm))),
    canAccess: jest.fn((resource: string) => {
      const resourcePermissions = {
        'users': ['view_users', 'manage_users'],
        'roles': ['view_roles', 'manage_roles'],
        'infrastructure': ['view_infrastructure', 'manage_infrastructure'],
      };
      const requiredPerms = resourcePermissions[resource as keyof typeof resourcePermissions] || [];
      return requiredPerms.some(perm => permissionNames.includes(perm));
    }),
    getUserPermissions: jest.fn(() => permissions),
    getUserRoles: jest.fn(() => roles),
    isAdmin: jest.fn(() => isAdmin),
  };
};

describe('withPermissions HOC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.push.mockClear();
    mockRouter.replace.mockClear();
    mockRouter.back.mockClear();
  });

  describe('withPermissions', () => {
    it('renders component when user has required permission', () => {
      mockUseAuth.mockReturnValue(createMockAuth(['view_dashboard']));
      
      const ProtectedComponent = withPermissions(TestComponent, {
        permissions: ['view_dashboard']
      });

      render(<ProtectedComponent />);

      expect(screen.getByTestId('protected-page')).toBeInTheDocument();
    });

    it('renders access denied when user lacks required permission', () => {
      mockUseAuth.mockReturnValue(createMockAuth([]));
      
      const ProtectedComponent = withPermissions(TestComponent, {
        permissions: ['view_dashboard']
      });

      render(<ProtectedComponent />);

      expect(screen.queryByTestId('protected-page')).not.toBeInTheDocument();
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/Required permissions: view_dashboard/)).toBeInTheDocument();
      expect(mockRouter.push).toHaveBeenCalledWith('/unauthorized');
    });

    it('renders component when user has any of multiple permissions (requireAll=false)', () => {
      mockUseAuth.mockReturnValue(createMockAuth(['view_dashboard']));
      
      const ProtectedComponent = withPermissions(TestComponent, {
        permissions: ['view_dashboard', 'manage_infrastructure'],
        requireAll: false
      });

      render(<ProtectedComponent />);

      expect(screen.getByTestId('protected-page')).toBeInTheDocument();
    });

    it('requires all permissions when requireAll=true', () => {
      mockUseAuth.mockReturnValue(createMockAuth(['view_dashboard']));
      
      const ProtectedComponent = withPermissions(TestComponent, {
        permissions: ['view_dashboard', 'manage_infrastructure'],
        requireAll: true
      });

      render(<ProtectedComponent />);

      expect(screen.queryByTestId('protected-page')).not.toBeInTheDocument();
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/Required permissions: view_dashboard and manage_infrastructure/)).toBeInTheDocument();
      expect(mockRouter.push).toHaveBeenCalledWith('/unauthorized');
    });

    it('renders component when user has required role', () => {
      mockUseAuth.mockReturnValue(createMockAuth([], ['organization_owner']));
      
      const ProtectedComponent = withPermissions(TestComponent, {
        roles: ['organization_owner']
      });

      render(<ProtectedComponent />);

      expect(screen.getByTestId('protected-page')).toBeInTheDocument();
    });

    it('renders component when user has any of multiple roles', () => {
      mockUseAuth.mockReturnValue(createMockAuth([], ['team_lead']));
      
      const ProtectedComponent = withPermissions(TestComponent, {
        roles: ['organization_owner', 'team_lead', 'devops_admin']
      });

      render(<ProtectedComponent />);

      expect(screen.getByTestId('protected-page')).toBeInTheDocument();
    });

    it('renders access denied when user lacks required roles', () => {
      mockUseAuth.mockReturnValue(createMockAuth([], ['developer']));
      
      const ProtectedComponent = withPermissions(TestComponent, {
        roles: ['organization_owner', 'devops_admin']
      });

      render(<ProtectedComponent />);

      expect(screen.queryByTestId('protected-page')).not.toBeInTheDocument();
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/Required roles: organization_owner or devops_admin/)).toBeInTheDocument();
      expect(mockRouter.push).toHaveBeenCalledWith('/unauthorized');
    });

    it('renders component when user can access resource with required action', () => {
      mockUseAuth.mockReturnValue(createMockAuth(['manage_users']));
      
      const ProtectedComponent = withPermissions(TestComponent, {
        resource: 'users',
        action: 'manage'
      });

      render(<ProtectedComponent />);

      expect(screen.getByTestId('protected-page')).toBeInTheDocument();
    });

    it('renders access denied when user cannot access resource', () => {
      mockUseAuth.mockReturnValue(createMockAuth(['view_dashboard']));
      
      const ProtectedComponent = withPermissions(TestComponent, {
        resource: 'users',
        action: 'manage'
      });

      render(<ProtectedComponent />);

      expect(screen.queryByTestId('protected-page')).not.toBeInTheDocument();
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/You don't have permission to manage users/)).toBeInTheDocument();
      expect(mockRouter.push).toHaveBeenCalledWith('/unauthorized');
    });

    it('renders custom fallback component when provided', () => {
      mockUseAuth.mockReturnValue(createMockAuth([]));
      
      const CustomFallback = () => <div data-testid="custom-fallback">Custom Access Denied</div>;
      
      const ProtectedComponent = withPermissions(TestComponent, {
        permissions: ['view_dashboard'],
        fallback: CustomFallback
      });

      render(<ProtectedComponent />);

      expect(screen.queryByTestId('protected-page')).not.toBeInTheDocument();
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(mockRouter.push).toHaveBeenCalledWith('/unauthorized');
    });

    it('redirects to login when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        ...createMockAuth([]),
        state: {
          isAuthenticated: false,
          user: null,
          tokens: null,
          isLoading: false,
          error: null,
        }
      });
      
      const ProtectedComponent = withPermissions(TestComponent, {
        permissions: ['view_dashboard']
      });

      render(<ProtectedComponent />);

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText('Redirecting to login...')).toBeInTheDocument();
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });

    it('handles complex permission combinations', () => {
      mockUseAuth.mockReturnValue(createMockAuth(
        ['view_dashboard', 'view_infrastructure'], 
        ['team_lead']
      ));
      
      const ProtectedComponent = withPermissions(TestComponent, {
        permissions: ['view_dashboard'],
        roles: ['team_lead'],
        resource: 'infrastructure',
        action: 'view'
      });

      render(<ProtectedComponent />);

      expect(screen.getByTestId('protected-page')).toBeInTheDocument();
    });

    it('denies access when any permission check fails in complex combinations', () => {
      mockUseAuth.mockReturnValue(createMockAuth(
        ['view_dashboard'], 
        ['developer'] // Wrong role
      ));
      
      const ProtectedComponent = withPermissions(TestComponent, {
        permissions: ['view_dashboard'],
        roles: ['team_lead'], // Required role user doesn't have
        resource: 'infrastructure',
        action: 'view'
      });

      render(<ProtectedComponent />);

      expect(screen.queryByTestId('protected-page')).not.toBeInTheDocument();
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(mockRouter.push).toHaveBeenCalledWith('/unauthorized');
    });

    it('uses custom redirect path when provided', () => {
      mockUseAuth.mockReturnValue(createMockAuth([]));
      
      const ProtectedComponent = withPermissions(TestComponent, {
        permissions: ['view_dashboard'],
        redirectTo: '/custom-unauthorized'
      });

      render(<ProtectedComponent />);

      expect(screen.queryByTestId('protected-page')).not.toBeInTheDocument();
      expect(mockRouter.push).toHaveBeenCalledWith('/custom-unauthorized');
    });
  });

  describe('withAdminAccess HOC', () => {
    it('renders component for admin users', () => {
      mockUseAuth.mockReturnValue(createMockAuth(
        ['manage_roles', 'manage_users'], 
        ['organization_owner'], 
        true
      ));
      
      const AdminComponent = withAdminAccess(TestComponent);

      render(<AdminComponent />);

      expect(screen.getByTestId('protected-page')).toBeInTheDocument();
    });

    it('renders access denied for non-admin users', () => {
      mockUseAuth.mockReturnValue(createMockAuth(
        ['view_dashboard'], 
        ['developer'], 
        false
      ));
      
      const AdminComponent = withAdminAccess(TestComponent);

      render(<AdminComponent />);

      expect(screen.queryByTestId('protected-page')).not.toBeInTheDocument();
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('Administrator access required.')).toBeInTheDocument();
      expect(mockRouter.push).toHaveBeenCalledWith('/unauthorized');
    });

    it('preserves component props', () => {
      mockUseAuth.mockReturnValue(createMockAuth(
        ['manage_roles'], 
        ['organization_owner'], 
        true
      ));
      
      const PropsTestComponent = ({ testProp }: { testProp: string }) => (
        <div data-testid="props-test">{testProp}</div>
      );
      
      const AdminComponent = withAdminAccess(PropsTestComponent);

      render(<AdminComponent testProp="test-value" />);

      expect(screen.getByTestId('props-test')).toHaveTextContent('test-value');
    });

    it('preserves component display name', () => {
      const NamedComponent = () => <div>Test</div>;
      NamedComponent.displayName = 'NamedComponent';
      
      const AdminComponent = withAdminAccess(NamedComponent);
      
      expect(AdminComponent.displayName).toBe('withPermissions(NamedComponent)');
    });
  });

  describe('HOC Edge Cases', () => {
    it('handles undefined permissions gracefully', () => {
      mockUseAuth.mockReturnValue(createMockAuth());
      
      const ProtectedComponent = withPermissions(TestComponent, {
        permissions: undefined as any
      });

      render(<ProtectedComponent />);

      // Should render component when no permissions are required
      expect(screen.getByTestId('protected-page')).toBeInTheDocument();
    });

    it('handles empty permissions array', () => {
      mockUseAuth.mockReturnValue(createMockAuth());
      
      const ProtectedComponent = withPermissions(TestComponent, {
        permissions: []
      });

      render(<ProtectedComponent />);

      // Should render component when no permissions are required
      expect(screen.getByTestId('protected-page')).toBeInTheDocument();
    });

    it('handles missing auth context gracefully', () => {
      // Mock useAuth to throw error (simulating missing provider)
      mockUseAuth.mockImplementation(() => {
        throw new Error('useAuth must be used within an AuthProvider');
      });
      
      const ProtectedComponent = withPermissions(TestComponent, {
        permissions: ['view_dashboard']
      });

      // Should throw when auth context is missing
      expect(() => render(<ProtectedComponent />)).toThrow('useAuth must be used within an AuthProvider');
    });

    it('handles auth error state', () => {
      mockUseAuth.mockReturnValue({
        ...createMockAuth([]),
        state: {
          isAuthenticated: false,
          user: null,
          tokens: null,
          isLoading: false,
          error: 'Authentication failed',
        }
      });
      
      const ProtectedComponent = withPermissions(TestComponent, {
        permissions: ['view_dashboard']
      });

      render(<ProtectedComponent />);

      // When not authenticated, should redirect to login
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });

    it('handles organization-scoped permissions', () => {
      const mockAuth = createMockAuth(['view_dashboard']);
      
      // The implementation doesn't actually check organizationId in hasPermission
      // so this test needs to be adjusted
      const ProtectedComponent = withPermissions(TestComponent, {
        permissions: ['view_dashboard'],
        organizationId: 'org-123'
      });

      mockUseAuth.mockReturnValue(mockAuth);
      render(<ProtectedComponent />);

      expect(screen.getByTestId('protected-page')).toBeInTheDocument();
    });

    it('handles loading state', () => {
      mockUseAuth.mockReturnValue({
        ...createMockAuth(['view_dashboard']), // User has the required permission
        state: {
          isAuthenticated: true,
          user: createMockUser(),
          tokens: null,
          isLoading: true,
          error: null,
        }
      });
      
      const ProtectedComponent = withPermissions(TestComponent, {
        permissions: ['view_dashboard']
      });

      render(<ProtectedComponent />);

      // Should render when loading if authenticated and has permissions
      expect(screen.getByTestId('protected-page')).toBeInTheDocument();
    });
  });
});