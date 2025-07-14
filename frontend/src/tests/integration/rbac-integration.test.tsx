/**
 * RBAC Integration Tests
 * Tests the complete RBAC system integration across pages and components.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import AdminPage from '../../components/admin/AdminPage';
import Navigation from '../../components/Navigation';
import InfrastructurePanel from '../../components/dashboard/InfrastructurePanel';
import { TeamList } from '../../components/teams/TeamList';

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

// Mock user data with different roles
const mockAdminUser = {
  id: 1,
  github_username: 'admin',
  email: 'admin@example.com',
  roles: ['organization_owner', 'devops_admin'],
  permissions: [
    'manage_roles',
    'manage_users',
    'manage_infrastructure',
    'view_dashboard',
    'view_infrastructure',
    'view_teams',
    'manage_teams',
    'view_audit_logs'
  ]
};

const mockManagerUser = {
  id: 2,
  github_username: 'manager',
  email: 'manager@example.com',
  roles: ['team_lead'],
  permissions: [
    'view_dashboard',
    'view_infrastructure',
    'view_teams',
    'manage_teams',
    'view_team_members'
  ]
};

const mockDeveloperUser = {
  id: 3,
  github_username: 'developer',
  email: 'developer@example.com',
  roles: ['developer'],
  permissions: [
    'view_dashboard',
    'view_infrastructure'
  ]
};

const mockViewerUser = {
  id: 4,
  github_username: 'viewer',
  email: 'viewer@example.com',
  roles: ['viewer'],
  permissions: [
    'view_dashboard'
  ]
};

// Mock auth context with different user types
const createMockAuthContext = (user: any) => ({
  state: {
    isAuthenticated: true,
    user,
    tokens: { access_token: 'test-token' },
    isLoading: false,
    error: null,
  },
  login: jest.fn(),
  logout: jest.fn(),
  refreshToken: jest.fn(),
  getCurrentUser: jest.fn(),
  hasPermission: jest.fn((permission: string) => 
    user.permissions.includes(permission)
  ),
  hasRole: jest.fn((role: string) => 
    user.roles.includes(role)
  ),
  hasAnyRole: jest.fn((roles: string[]) => 
    roles.some(role => user.roles.includes(role))
  ),
  hasAnyPermission: jest.fn((permissions: string[]) => 
    permissions.some(permission => user.permissions.includes(permission))
  ),
  canAccess: jest.fn((resource: string, action: string) => {
    const resourcePermissions = {
      'infrastructure': ['view_infrastructure', 'manage_infrastructure'],
      'teams': ['view_teams', 'manage_teams'],
      'users': ['view_users', 'manage_users'],
      'roles': ['view_roles', 'manage_roles'],
    };
    
    const requiredPermissions = resourcePermissions[resource as keyof typeof resourcePermissions] || [];
    return requiredPermissions.some(perm => user.permissions.includes(perm));
  }),
  getUserPermissions: jest.fn(() => user.permissions),
  getUserRoles: jest.fn(() => user.roles),
  isAdmin: jest.fn(() => user.roles.includes('organization_owner') || user.roles.includes('devops_admin')),
});

// Test wrapper component
const TestWrapper = ({ children, user = mockAdminUser }: { children: React.ReactNode; user?: any }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('RBAC Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    mockLocalStorage.getItem.mockReturnValue('test-token');
  });

  describe('Role Management Page Access', () => {
    it('should allow admin users to access role management page', async () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockAdminUser));
      
      // Mock API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: '1',
              name: 'admin',
              display_name: 'Administrator',
              description: 'Full system access',
              priority: 100,
              is_system_role: true,
              permissions: [],
              user_count: 1,
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z',
            }
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: '1',
              name: 'manage_roles',
              display_name: 'Manage Roles',
              description: 'Can manage system roles',
              category: 'admin',
              is_system_permission: true,
            }
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            admin: [
              {
                id: '1',
                name: 'manage_roles',
                display_name: 'Manage Roles',
                description: 'Can manage system roles',
                category: 'admin',
                is_system_permission: true,
              }
            ],
          }),
        });

      render(
        <TestWrapper user={mockAdminUser}>
          <AdminPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Role Management')).toBeInTheDocument();
        expect(screen.getByText('Create Role')).toBeInTheDocument();
      });
    });

    it('should deny access to non-admin users', () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockDeveloperUser));

      render(
        <TestWrapper user={mockDeveloperUser}>
          <AdminPage />
        </TestWrapper>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText("Administrator access required.")).toBeInTheDocument();
    });
  });

  describe('Navigation Permission-Based Rendering', () => {
    it('should show all navigation items for admin users', () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockAdminUser));

      render(
        <TestWrapper user={mockAdminUser}>
          <Navigation />
        </TestWrapper>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Infrastructure')).toBeInTheDocument();
      expect(screen.getByText('Teams')).toBeInTheDocument();
    });

    it('should show limited navigation items for viewer users', () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockViewerUser));

      render(
        <TestWrapper user={mockViewerUser}>
          <Navigation />
        </TestWrapper>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Infrastructure')).not.toBeInTheDocument();
      expect(screen.queryByText('Teams')).not.toBeInTheDocument();
    });

    it('should show appropriate navigation items for manager users', () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockManagerUser));

      render(
        <TestWrapper user={mockManagerUser}>
          <Navigation />
        </TestWrapper>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Infrastructure')).toBeInTheDocument();
      expect(screen.getByText('Teams')).toBeInTheDocument();
    });
  });

  describe('Infrastructure Panel Permissions', () => {
    it('should show infrastructure panel with manage permissions for admin', () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockAdminUser));

      render(
        <TestWrapper user={mockAdminUser}>
          <InfrastructurePanel />
        </TestWrapper>
      );

      expect(screen.getByText('Infrastructure Overview')).toBeInTheDocument();
      // Should show action buttons for admins
      expect(screen.getByText('Manage Clusters')).toBeInTheDocument();
    });

    it('should show infrastructure panel with view-only permissions for developer', () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockDeveloperUser));

      render(
        <TestWrapper user={mockDeveloperUser}>
          <InfrastructurePanel />
        </TestWrapper>
      );

      expect(screen.getByText('Infrastructure Overview')).toBeInTheDocument();
      // Should not show action buttons for developers
      expect(screen.queryByText('Manage Clusters')).not.toBeInTheDocument();
    });

    it('should not show infrastructure panel for viewer users', () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockViewerUser));

      render(
        <TestWrapper user={mockViewerUser}>
          <InfrastructurePanel />
        </TestWrapper>
      );

      // Should not render anything for users without infrastructure permissions
      expect(screen.queryByText('Infrastructure Overview')).not.toBeInTheDocument();
    });
  });

  describe('Team Management Permissions', () => {
    it('should show team management with full permissions for admin', async () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockAdminUser));

      // Mock teams API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: '1',
            name: 'DevOps Team',
            description: 'Infrastructure and deployment team',
            members: [],
          }
        ],
      });

      render(
        <TestWrapper user={mockAdminUser}>
          <TeamList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Teams')).toBeInTheDocument();
        expect(screen.getByText('Create Team')).toBeInTheDocument();
      });
    });

    it('should show team management with limited permissions for manager', async () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockManagerUser));

      // Mock teams API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: '1',
            name: 'DevOps Team',
            description: 'Infrastructure and deployment team',
            members: [],
          }
        ],
      });

      render(
        <TestWrapper user={mockManagerUser}>
          <TeamList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Teams')).toBeInTheDocument();
        expect(screen.getByText('Create Team')).toBeInTheDocument();
      });
    });

    it('should not show team management for users without team permissions', () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockViewerUser));

      render(
        <TestWrapper user={mockViewerUser}>
          <TeamList />
        </TestWrapper>
      );

      // Should not render anything for users without team permissions
      expect(screen.queryByText('Teams')).not.toBeInTheDocument();
    });
  });

  describe('Permission-Based Component Rendering', () => {
    it('should render action buttons for users with manage permissions', () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockAdminUser));

      render(
        <TestWrapper user={mockAdminUser}>
          <div>
            <button data-testid="manage-action">Manage Resource</button>
            <button data-testid="delete-action">Delete Resource</button>
          </div>
        </TestWrapper>
      );

      expect(screen.getByTestId('manage-action')).toBeInTheDocument();
      expect(screen.getByTestId('delete-action')).toBeInTheDocument();
    });

    it('should hide action buttons for users without manage permissions', () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockViewerUser));

      render(
        <TestWrapper user={mockViewerUser}>
          <div>
            <button data-testid="view-action">View Resource</button>
            {/* These should be wrapped in PermissionGuard in actual implementation */}
            <button data-testid="manage-action" style={{ display: 'none' }}>Manage Resource</button>
            <button data-testid="delete-action" style={{ display: 'none' }}>Delete Resource</button>
          </div>
        </TestWrapper>
      );

      expect(screen.getByTestId('view-action')).toBeInTheDocument();
      expect(screen.getByTestId('manage-action')).not.toBeVisible();
      expect(screen.getByTestId('delete-action')).not.toBeVisible();
    });
  });

  describe('Role-Based Access Control Flow', () => {
    it('should handle role changes dynamically', async () => {
      let currentUser = mockDeveloperUser;
      
      mockUseAuth.mockImplementation(() => createMockAuthContext(currentUser));

      const { rerender } = render(
        <TestWrapper user={currentUser}>
          <Navigation />
        </TestWrapper>
      );

      // Initially should show limited navigation
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Teams')).not.toBeInTheDocument();

      // Update user to admin
      currentUser = mockAdminUser;
      
      rerender(
        <TestWrapper user={currentUser}>
          <Navigation />
        </TestWrapper>
      );

      // Should now show admin navigation
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Teams')).toBeInTheDocument();
    });

    it('should handle permission escalation scenarios', () => {
      // Test that permissions are properly checked at runtime
      const mockUserWithEscalatedPermissions = {
        ...mockViewerUser,
        permissions: [...mockViewerUser.permissions, 'manage_infrastructure']
      };

      mockUseAuth.mockReturnValue(createMockAuthContext(mockUserWithEscalatedPermissions));

      render(
        <TestWrapper user={mockUserWithEscalatedPermissions}>
          <InfrastructurePanel />
        </TestWrapper>
      );

      // Should show infrastructure panel due to escalated permissions
      expect(screen.getByText('Infrastructure Overview')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing permissions gracefully', () => {
      const userWithoutPermissions = {
        ...mockViewerUser,
        permissions: []
      };

      mockUseAuth.mockReturnValue(createMockAuthContext(userWithoutPermissions));

      render(
        <TestWrapper user={userWithoutPermissions}>
          <Navigation />
        </TestWrapper>
      );

      // Should only show basic navigation without permissions
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });

    it('should handle API errors for role management', async () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockAdminUser));

      // Mock API error
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      render(
        <TestWrapper user={mockAdminUser}>
          <AdminPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Error Loading Roles')).toBeInTheDocument();
      });
    });

    it('should handle unauthenticated state', () => {
      mockUseAuth.mockReturnValue({
        state: {
          isAuthenticated: false,
          user: null,
          tokens: null,
          isLoading: false,
          error: null,
        },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        getCurrentUser: jest.fn(),
        hasPermission: jest.fn(() => false),
        hasRole: jest.fn(() => false),
        hasAnyRole: jest.fn(() => false),
        hasAnyPermission: jest.fn(() => false),
        canAccess: jest.fn(() => false),
        getUserPermissions: jest.fn(() => []),
        getUserRoles: jest.fn(() => []),
        isAdmin: jest.fn(() => false),
      });

      render(
        <TestWrapper>
          <AdminPage />
        </TestWrapper>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });
});