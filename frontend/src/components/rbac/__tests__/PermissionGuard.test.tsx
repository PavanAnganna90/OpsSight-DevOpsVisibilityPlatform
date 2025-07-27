/**
 * Unit tests for PermissionGuard component.
 * Tests permission-based rendering, role checks, and resource access control.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PermissionGuard, AdminOnly, RoleGuard, ResourceGuard } from '../PermissionGuard';
import { useAuth } from '../../../contexts/AuthContext';

// Mock the useAuth hook
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Test component to wrap with PermissionGuard
const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

describe('PermissionGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('permission-based rendering', () => {
    it('renders children when user has required permission', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => true),
        hasRole: jest.fn(() => false),
        hasAnyRole: jest.fn(() => false),
        hasAnyPermission: jest.fn(() => false),
        canAccess: jest.fn(() => false),
        state: { isAuthenticated: true, user: null, tokens: null, isLoading: false, error: null },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        getCurrentUser: jest.fn(),
        getUserPermissions: jest.fn(() => []),
        getUserRoles: jest.fn(() => []),
        isAdmin: jest.fn(() => false),
      });

      render(
        <PermissionGuard permission="view_dashboard">
          <TestComponent />
        </PermissionGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('does not render children when user lacks required permission', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => false),
        hasRole: jest.fn(() => false),
        hasAnyRole: jest.fn(() => false),
        hasAnyPermission: jest.fn(() => false),
        canAccess: jest.fn(() => false),
        state: { isAuthenticated: true, user: null, tokens: null, isLoading: false, error: null },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        getCurrentUser: jest.fn(),
        getUserPermissions: jest.fn(() => []),
        getUserRoles: jest.fn(() => []),
        isAdmin: jest.fn(() => false),
      });

      render(
        <PermissionGuard permission="view_dashboard">
          <TestComponent />
        </PermissionGuard>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('renders fallback when user lacks permission and fallback is provided', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => false),
        hasRole: jest.fn(() => false),
        hasAnyRole: jest.fn(() => false),
        hasAnyPermission: jest.fn(() => false),
        canAccess: jest.fn(() => false),
        state: { isAuthenticated: true, user: null, tokens: null, isLoading: false, error: null },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        getCurrentUser: jest.fn(),
        getUserPermissions: jest.fn(() => []),
        getUserRoles: jest.fn(() => []),
        isAdmin: jest.fn(() => false),
      });

      const fallback = <div data-testid="fallback-content">Access Denied</div>;

      render(
        <PermissionGuard permission="view_dashboard" fallback={fallback}>
          <TestComponent />
        </PermissionGuard>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('fallback-content')).toBeInTheDocument();
    });
  });

  describe('multiple permissions', () => {
    it('renders when user has any required permission (requireAll=false)', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => false),
        hasRole: jest.fn(() => false),
        hasAnyRole: jest.fn(() => false),
        hasAnyPermission: jest.fn(() => true),
        canAccess: jest.fn(() => false),
        state: { isAuthenticated: true, user: null, tokens: null, isLoading: false, error: null },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        getCurrentUser: jest.fn(),
        getUserPermissions: jest.fn(() => []),
        getUserRoles: jest.fn(() => []),
        isAdmin: jest.fn(() => false),
      });

      render(
        <PermissionGuard permissions={['view_dashboard', 'view_infrastructure']} requireAll={false}>
          <TestComponent />
        </PermissionGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('does not render when user lacks all required permissions (requireAll=true)', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => false),
        hasRole: jest.fn(() => false),
        hasAnyRole: jest.fn(() => false),
        hasAnyPermission: jest.fn(() => false),
        canAccess: jest.fn(() => false),
        state: { isAuthenticated: true, user: null, tokens: null, isLoading: false, error: null },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        getCurrentUser: jest.fn(),
        getUserPermissions: jest.fn(() => []),
        getUserRoles: jest.fn(() => []),
        isAdmin: jest.fn(() => false),
      });

      render(
        <PermissionGuard permissions={['view_dashboard', 'view_infrastructure']} requireAll={true}>
          <TestComponent />
        </PermissionGuard>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('role-based rendering', () => {
    it('renders when user has required role', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => false),
        hasRole: jest.fn(() => true),
        hasAnyRole: jest.fn(() => false),
        hasAnyPermission: jest.fn(() => false),
        canAccess: jest.fn(() => false),
        state: { isAuthenticated: true, user: null, tokens: null, isLoading: false, error: null },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        getCurrentUser: jest.fn(),
        getUserPermissions: jest.fn(() => []),
        getUserRoles: jest.fn(() => []),
        isAdmin: jest.fn(() => false),
      });

      render(
        <PermissionGuard role="organization_owner">
          <TestComponent />
        </PermissionGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('renders when user has any of the required roles', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => false),
        hasRole: jest.fn(() => false),
        hasAnyRole: jest.fn(() => true),
        hasAnyPermission: jest.fn(() => false),
        canAccess: jest.fn(() => false),
        state: { isAuthenticated: true, user: null, tokens: null, isLoading: false, error: null },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        getCurrentUser: jest.fn(),
        getUserPermissions: jest.fn(() => []),
        getUserRoles: jest.fn(() => []),
        isAdmin: jest.fn(() => false),
      });

      render(
        <PermissionGuard roles={['organization_owner', 'devops_admin']}>
          <TestComponent />
        </PermissionGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('resource-based access', () => {
    it('renders when user can access resource with specified action', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => false),
        hasRole: jest.fn(() => false),
        hasAnyRole: jest.fn(() => false),
        hasAnyPermission: jest.fn(() => false),
        canAccess: jest.fn(() => true),
        state: { isAuthenticated: true, user: null, tokens: null, isLoading: false, error: null },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        getCurrentUser: jest.fn(),
        getUserPermissions: jest.fn(() => []),
        getUserRoles: jest.fn(() => []),
        isAdmin: jest.fn(() => false),
      });

      render(
        <PermissionGuard resource="infrastructure" action="manage">
          <TestComponent />
        </PermissionGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('does not render when user cannot access resource with specified action', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => false),
        hasRole: jest.fn(() => false),
        hasAnyRole: jest.fn(() => false),
        hasAnyPermission: jest.fn(() => false),
        canAccess: jest.fn(() => false),
        state: { isAuthenticated: true, user: null, tokens: null, isLoading: false, error: null },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        getCurrentUser: jest.fn(),
        getUserPermissions: jest.fn(() => []),
        getUserRoles: jest.fn(() => []),
        isAdmin: jest.fn(() => false),
      });

      render(
        <PermissionGuard resource="infrastructure" action="manage">
          <TestComponent />
        </PermissionGuard>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('convenience components', () => {
    describe('AdminOnly', () => {
      it('renders for admin users', () => {
        mockUseAuth.mockReturnValue({
          hasPermission: jest.fn(() => false),
          hasRole: jest.fn(() => false),
          hasAnyRole: jest.fn(() => true),
          hasAnyPermission: jest.fn(() => false),
          canAccess: jest.fn(() => false),
          state: { isAuthenticated: true, user: null, tokens: null, isLoading: false, error: null },
          login: jest.fn(),
          logout: jest.fn(),
          refreshToken: jest.fn(),
          getCurrentUser: jest.fn(),
          getUserPermissions: jest.fn(() => []),
          getUserRoles: jest.fn(() => []),
          isAdmin: jest.fn(() => false),
        });

        render(
          <AdminOnly>
            <TestComponent />
          </AdminOnly>
        );

        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });

      it('does not render for non-admin users', () => {
        mockUseAuth.mockReturnValue({
          hasPermission: jest.fn(() => false),
          hasRole: jest.fn(() => false),
          hasAnyRole: jest.fn(() => false),
          hasAnyPermission: jest.fn(() => false),
          canAccess: jest.fn(() => false),
          state: { isAuthenticated: true, user: null, tokens: null, isLoading: false, error: null },
          login: jest.fn(),
          logout: jest.fn(),
          refreshToken: jest.fn(),
          getCurrentUser: jest.fn(),
          getUserPermissions: jest.fn(() => []),
          getUserRoles: jest.fn(() => []),
          isAdmin: jest.fn(() => false),
        });

        render(
          <AdminOnly>
            <TestComponent />
          </AdminOnly>
        );

        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      });
    });

    describe('RoleGuard', () => {
      it('renders when user has the specified role', () => {
        mockUseAuth.mockReturnValue({
          hasPermission: jest.fn(() => false),
          hasRole: jest.fn(() => true),
          hasAnyRole: jest.fn(() => false),
          hasAnyPermission: jest.fn(() => false),
          canAccess: jest.fn(() => false),
          state: { isAuthenticated: true, user: null, tokens: null, isLoading: false, error: null },
          login: jest.fn(),
          logout: jest.fn(),
          refreshToken: jest.fn(),
          getCurrentUser: jest.fn(),
          getUserPermissions: jest.fn(() => []),
          getUserRoles: jest.fn(() => []),
          isAdmin: jest.fn(() => false),
        });

        render(
          <RoleGuard role="devops_admin">
            <TestComponent />
          </RoleGuard>
        );

        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });

    describe('ResourceGuard', () => {
      it('renders when user can access the resource', () => {
        mockUseAuth.mockReturnValue({
          hasPermission: jest.fn(() => false),
          hasRole: jest.fn(() => false),
          hasAnyRole: jest.fn(() => false),
          hasAnyPermission: jest.fn(() => false),
          canAccess: jest.fn(() => true),
          state: { isAuthenticated: true, user: null, tokens: null, isLoading: false, error: null },
          login: jest.fn(),
          logout: jest.fn(),
          refreshToken: jest.fn(),
          getCurrentUser: jest.fn(),
          getUserPermissions: jest.fn(() => []),
          getUserRoles: jest.fn(() => []),
          isAdmin: jest.fn(() => false),
        });

        render(
          <ResourceGuard resource="teams" action="create">
            <TestComponent />
          </ResourceGuard>
        );

        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });
  });
});