/**
 * Unit tests for permission hooks.
 * Tests permission checking logic and role-based access control.
 */

import { renderHook } from '@testing-library/react';
import {
  usePermissions,
  useResourcePermissions,
  useAdminPermissions,
  useInfrastructurePermissions,
  useTeamPermissions,
  useNavigationPermissions,
  useFeaturePermissions,
  usePermissionState
} from '../usePermissions';
import { useAuth } from '../../contexts/AuthContext';

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('Permission Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('usePermissions', () => {
    it('returns auth context methods', () => {
      const mockAuthMethods = {
        hasPermission: jest.fn(),
        hasRole: jest.fn(),
        hasAnyRole: jest.fn(),
        hasAnyPermission: jest.fn(),
        canAccess: jest.fn(),
        getUserPermissions: jest.fn(),
        getUserRoles: jest.fn(),
        isAdmin: jest.fn(),
        state: { isAuthenticated: true, user: null, tokens: null, isLoading: false, error: null },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        getCurrentUser: jest.fn(),
      };

      mockUseAuth.mockReturnValue(mockAuthMethods);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission).toBe(mockAuthMethods.hasPermission);
      expect(result.current.hasRole).toBe(mockAuthMethods.hasRole);
      expect(result.current.hasAnyRole).toBe(mockAuthMethods.hasAnyRole);
      expect(result.current.hasAnyPermission).toBe(mockAuthMethods.hasAnyPermission);
      expect(result.current.canAccess).toBe(mockAuthMethods.canAccess);
      expect(result.current.getUserPermissions).toBe(mockAuthMethods.getUserPermissions);
      expect(result.current.getUserRoles).toBe(mockAuthMethods.getUserRoles);
      expect(result.current.isAdmin).toBe(mockAuthMethods.isAdmin);
    });
  });

  describe('useResourcePermissions', () => {
    it('returns correct CRUD permissions for a resource', () => {
      const mockCanAccess = jest.fn()
        .mockReturnValueOnce(true)   // canView
        .mockReturnValueOnce(false)  // canCreate
        .mockReturnValueOnce(true)   // canUpdate
        .mockReturnValueOnce(false)  // canDelete
        .mockReturnValueOnce(true);  // canManage

      mockUseAuth.mockReturnValue({
        canAccess: mockCanAccess,
        hasPermission: jest.fn(),
        hasRole: jest.fn(),
        hasAnyRole: jest.fn(),
        hasAnyPermission: jest.fn(),
        getUserPermissions: jest.fn(),
        getUserRoles: jest.fn(),
        isAdmin: jest.fn(),
        state: { isAuthenticated: true, user: null, tokens: null, isLoading: false, error: null },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        getCurrentUser: jest.fn(),
      });

      const { result } = renderHook(() => useResourcePermissions('teams', 'org123'));

      expect(result.current.canView).toBe(true);
      expect(result.current.canCreate).toBe(false);
      expect(result.current.canUpdate).toBe(true);
      expect(result.current.canDelete).toBe(false);
      expect(result.current.canManage).toBe(true);

      expect(mockCanAccess).toHaveBeenCalledWith('teams', 'view', 'org123');
      expect(mockCanAccess).toHaveBeenCalledWith('teams', 'create', 'org123');
      expect(mockCanAccess).toHaveBeenCalledWith('teams', 'update', 'org123');
      expect(mockCanAccess).toHaveBeenCalledWith('teams', 'delete', 'org123');
      expect(mockCanAccess).toHaveBeenCalledWith('teams', 'manage', 'org123');
    });
  });

  describe('useAdminPermissions', () => {
    it('returns correct admin permission flags', () => {
      const mockIsAdmin = jest.fn(() => true);
      const mockHasPermission = jest.fn((permission: string) => {
        const adminPermissions = [
          'manage_users',
          'manage_roles',
          'manage_permissions',
          'manage_teams',
          'manage_system',
          'view_audit_logs'
        ];
        return adminPermissions.includes(permission);
      });
      const mockHasRole = jest.fn((role: string) => {
        return role === 'organization_owner' || role === 'devops_admin';
      });

      mockUseAuth.mockReturnValue({
        isAdmin: mockIsAdmin,
        hasPermission: mockHasPermission,
        hasRole: mockHasRole,
        canAccess: jest.fn(),
        hasAnyRole: jest.fn(),
        hasAnyPermission: jest.fn(),
        getUserPermissions: jest.fn(),
        getUserRoles: jest.fn(),
        state: { isAuthenticated: true, user: null, tokens: null, isLoading: false, error: null },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        getCurrentUser: jest.fn(),
      });

      const { result } = renderHook(() => useAdminPermissions());

      expect(result.current.isAdmin).toBe(true);
      expect(result.current.canManageUsers).toBe(true);
      expect(result.current.canManageRoles).toBe(true);
      expect(result.current.canManagePermissions).toBe(true);
      expect(result.current.canManageTeams).toBe(true);
      expect(result.current.canManageSystem).toBe(true);
      expect(result.current.canViewAuditLogs).toBe(true);
      expect(result.current.isOrgOwner).toBe(true);
      expect(result.current.isDevOpsAdmin).toBe(true);
    });
  });

  describe('useInfrastructurePermissions', () => {
    it('returns correct infrastructure permission flags', () => {
      const mockCanAccess = jest.fn((resource: string, action: string) => {
        return resource === 'infrastructure' && (action === 'view' || action === 'manage');
      });
      const mockHasPermission = jest.fn((permission: string) => {
        const infraPermissions = [
          'manage_clusters',
          'view_clusters',
          'manage_deployments',
          'view_deployments',
          'manage_monitoring',
          'view_monitoring',
          'manage_pipelines',
          'view_pipelines'
        ];
        return infraPermissions.includes(permission);
      });

      mockUseAuth.mockReturnValue({
        canAccess: mockCanAccess,
        hasPermission: mockHasPermission,
        hasRole: jest.fn(),
        hasAnyRole: jest.fn(),
        hasAnyPermission: jest.fn(),
        getUserPermissions: jest.fn(),
        getUserRoles: jest.fn(),
        isAdmin: jest.fn(),
        state: { isAuthenticated: true, user: null, tokens: null, isLoading: false, error: null },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        getCurrentUser: jest.fn(),
      });

      const { result } = renderHook(() => useInfrastructurePermissions('org123'));

      expect(result.current.canViewInfrastructure).toBe(true);
      expect(result.current.canManageInfrastructure).toBe(true);
      expect(result.current.canManageClusters).toBe(true);
      expect(result.current.canViewClusters).toBe(true);
      expect(result.current.canManageDeployments).toBe(true);
      expect(result.current.canViewDeployments).toBe(true);
      expect(result.current.canManageMonitoring).toBe(true);
      expect(result.current.canViewMonitoring).toBe(true);
      expect(result.current.canManagePipelines).toBe(true);
      expect(result.current.canViewPipelines).toBe(true);
    });
  });

  describe('useTeamPermissions', () => {
    it('returns correct team permission flags', () => {
      const mockCanAccess = jest.fn((resource: string, action: string) => {
        return resource === 'teams' && ['view', 'create', 'update', 'delete'].includes(action);
      });
      const mockHasPermission = jest.fn((permission: string) => {
        const teamPermissions = [
          'manage_team_members',
          'view_team_members',
          'assign_roles'
        ];
        return teamPermissions.includes(permission);
      });

      mockUseAuth.mockReturnValue({
        canAccess: mockCanAccess,
        hasPermission: mockHasPermission,
        hasRole: jest.fn(),
        hasAnyRole: jest.fn(),
        hasAnyPermission: jest.fn(),
        getUserPermissions: jest.fn(),
        getUserRoles: jest.fn(),
        isAdmin: jest.fn(),
        state: { isAuthenticated: true, user: null, tokens: null, isLoading: false, error: null },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        getCurrentUser: jest.fn(),
      });

      const { result } = renderHook(() => useTeamPermissions('org123'));

      expect(result.current.canViewTeams).toBe(true);
      expect(result.current.canCreateTeams).toBe(true);
      expect(result.current.canUpdateTeams).toBe(true);
      expect(result.current.canDeleteTeams).toBe(true);
      expect(result.current.canManageTeamMembers).toBe(true);
      expect(result.current.canViewTeamMembers).toBe(true);
      expect(result.current.canAssignRoles).toBe(true);
    });
  });

  describe('useNavigationPermissions', () => {
    it('returns correct navigation permission flags', () => {
      const mockHasPermission = jest.fn((permission: string) => {
        const navPermissions = [
          'view_dashboard',
          'view_infrastructure',
          'view_pipelines',
          'view_teams',
          'view_users',
          'view_roles',
          'view_settings',
          'view_monitoring',
          'view_reports',
          'view_audit_logs'
        ];
        return navPermissions.includes(permission);
      });
      const mockHasAnyRole = jest.fn((roles: string[]) => {
        const userRoles = ['manager', 'devops_admin'];
        return roles.some(role => userRoles.includes(role));
      });
      const mockIsAdmin = jest.fn(() => true);

      mockUseAuth.mockReturnValue({
        hasPermission: mockHasPermission,
        hasAnyRole: mockHasAnyRole,
        isAdmin: mockIsAdmin,
        hasRole: jest.fn(),
        canAccess: jest.fn(),
        hasAnyPermission: jest.fn(),
        getUserPermissions: jest.fn(),
        getUserRoles: jest.fn(),
        state: { isAuthenticated: true, user: null, tokens: null, isLoading: false, error: null },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        getCurrentUser: jest.fn(),
      });

      const { result } = renderHook(() => useNavigationPermissions());

      expect(result.current.canViewDashboard).toBe(true);
      expect(result.current.canViewInfrastructure).toBe(true);
      expect(result.current.canViewPipelines).toBe(true);
      expect(result.current.canViewTeams).toBe(true);
      expect(result.current.canViewUsers).toBe(true);
      expect(result.current.canViewRoles).toBe(true);
      expect(result.current.canViewSettings).toBe(true);
      expect(result.current.canViewAdmin).toBe(true);
      expect(result.current.canViewMonitoring).toBe(true);
      expect(result.current.canViewReports).toBe(true);
      expect(result.current.canViewAuditLogs).toBe(true);
      expect(result.current.isManagerOrAbove).toBe(true);
      expect(result.current.isDevOpsRole).toBe(true);
    });
  });

  describe('useFeaturePermissions', () => {
    it('returns correct feature permission flags', () => {
      const mockHasPermission = jest.fn((permission: string) => {
        const featurePermissions = [
          'api_access',
          'webhook_management',
          'view_cost_analysis',
          'manage_cost_analysis',
          'view_alerts',
          'manage_alerts',
          'view_notifications',
          'manage_notifications',
          'view_integrations',
          'manage_integrations',
          'export_data',
          'import_data'
        ];
        return featurePermissions.includes(permission);
      });
      const mockHasRole = jest.fn((role: string) => role === 'api_only');

      mockUseAuth.mockReturnValue({
        hasPermission: mockHasPermission,
        hasRole: mockHasRole,
        hasAnyRole: jest.fn(),
        canAccess: jest.fn(),
        hasAnyPermission: jest.fn(),
        getUserPermissions: jest.fn(),
        getUserRoles: jest.fn(),
        isAdmin: jest.fn(),
        state: { isAuthenticated: true, user: null, tokens: null, isLoading: false, error: null },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        getCurrentUser: jest.fn(),
      });

      const { result } = renderHook(() => useFeaturePermissions());

      expect(result.current.canUseCLI).toBe(true);
      expect(result.current.canUseAPI).toBe(true);
      expect(result.current.canUseWebhooks).toBe(true);
      expect(result.current.canViewCosts).toBe(true);
      expect(result.current.canManageCosts).toBe(true);
      expect(result.current.canViewAlerts).toBe(true);
      expect(result.current.canManageAlerts).toBe(true);
      expect(result.current.canViewNotifications).toBe(true);
      expect(result.current.canManageNotifications).toBe(true);
      expect(result.current.canViewIntegrations).toBe(true);
      expect(result.current.canManageIntegrations).toBe(true);
      expect(result.current.canExportData).toBe(true);
      expect(result.current.canImportData).toBe(true);
      expect(result.current.hasAPIOnlyAccess).toBe(true);
    });
  });

  describe('usePermissionState', () => {
    it('returns comprehensive permission state', () => {
      const mockAuthState = {
        isAuthenticated: true,
        user: { id: 1, email: 'test@example.com' },
        tokens: null,
        isLoading: false,
        error: null,
      };

      const mockAuth = {
        state: mockAuthState,
        getUserRoles: jest.fn(() => ['manager']),
        getUserPermissions: jest.fn(() => ['view_dashboard']),
        hasPermission: jest.fn(() => true),
        hasRole: jest.fn(() => true),
        hasAnyRole: jest.fn(() => true),
        isAdmin: jest.fn(() => false),
        canAccess: jest.fn(),
        hasAnyPermission: jest.fn(),
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        getCurrentUser: jest.fn(),
      };

      mockUseAuth.mockReturnValue(mockAuth);

      const { result } = renderHook(() => usePermissionState());

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual({ id: 1, email: 'test@example.com' });
      expect(result.current.roles).toEqual(['manager']);
      expect(result.current.permissions).toEqual(['view_dashboard']);
      expect(result.current.hasAnyAdminRole).toBe(false);
      expect(result.current.hasAnyManagerRole).toBeDefined();
      expect(result.current.hasAnyDevOpsRole).toBeDefined();
    });
  });
});