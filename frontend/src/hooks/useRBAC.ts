/**
 * RBAC Hook for Role and Permission Management
 * 
 * Provides a comprehensive set of utilities for checking permissions,
 * roles, and managing RBAC state throughout the application.
 */

import { useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { rbacApi } from '@/services/rbacApi';

export interface UseRBACReturn {
  // Permission checks
  hasPermission: (permission: string, organizationId?: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  
  // Role checks
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
  
  // Convenience role checks
  isAdmin: boolean;
  isOrganizationOwner: boolean;
  isDevOpsAdmin: boolean;
  isManager: boolean;
  isEngineer: boolean;
  isViewer: boolean;
  isAPIOnly: boolean;
  
  // Resource access checks
  canAccess: (resource: string, action: string, organizationId?: string) => boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  canManageTeams: boolean;
  canViewAnalytics: boolean;
  canDeployToProduction: boolean;
  canAccessLogs: boolean;
  canManageInfrastructure: boolean;
  
  // User and role data
  currentUserRoles: string[];
  currentUserPermissions: string[];
  userEffectivePermissions: string[];
  
  // Role hierarchy helpers
  getRoleLevel: (role?: string) => number;
  canAssignRole: (targetRole: string) => boolean;
  getAssignableRoles: () => string[];
  
  // Organization context
  getCurrentOrganizationId: () => string | undefined;
  isOrganizationMember: (organizationId: string) => boolean;
  
  // API interactions
  refreshUserPermissions: () => Promise<void>;
  checkPermissionAsync: (permission: string, organizationId?: string) => Promise<boolean>;
}

/**
 * Role hierarchy levels for comparison and assignment rules
 */
const ROLE_LEVELS: Record<string, number> = {
  'super_admin': 100,
  'organization_owner': 90,
  'devops_admin': 80,
  'manager': 60,
  'engineer': 40,
  'api_only': 30,
  'viewer': 20,
};

/**
 * Permission mappings for common operations
 */
const PERMISSION_MAPPINGS = {
  users: {
    create: 'user:create',
    read: 'user:read',
    update: 'user:update',
    delete: 'user:delete',
  },
  roles: {
    create: 'role:create',
    read: 'role:read',
    update: 'role:update',
    delete: 'role:delete',
    manage: 'role:manage',
  },
  teams: {
    create: 'team:create',
    read: 'team:read',
    update: 'team:update',
    delete: 'team:delete',
  },
  infrastructure: {
    view: 'infrastructure:view',
    manage: 'infrastructure:manage',
    deploy_staging: 'deploy:staging',
    deploy_production: 'deploy:production',
  },
  analytics: {
    view: 'analytics:view',
    export: 'analytics:export',
  },
  logs: {
    view: 'logs:view',
    download: 'logs:download',
  },
};

export function useRBAC(): UseRBACReturn {
  const { state, hasPermission, hasRole, hasAnyRole, hasAnyPermission, getUserPermissions } = useAuth();

  // Convenience role checkers
  const isAdmin = useMemo(() => hasRole('super_admin'), [hasRole]);
  const isOrganizationOwner = useMemo(() => hasRole('organization_owner'), [hasRole]);
  const isDevOpsAdmin = useMemo(() => hasRole('devops_admin'), [hasRole]);
  const isManager = useMemo(() => hasRole('manager'), [hasRole]);
  const isEngineer = useMemo(() => hasRole('engineer'), [hasRole]);
  const isViewer = useMemo(() => hasRole('viewer'), [hasRole]);
  const isAPIOnly = useMemo(() => hasRole('api_only'), [hasRole]);

  // Get current user roles and permissions
  const currentUserRoles = useMemo(() => {
    return state.user?.roles?.map(role => role.name) || [];
  }, [state.user?.roles]);

  const currentUserPermissions = useMemo(() => {
    return state.user?.permissions?.map(permission => permission.name) || [];
  }, [state.user?.permissions]);

  const userEffectivePermissions = useMemo(() => {
    const permissions = getUserPermissions();
    return permissions.map(p => p.name);
  }, [getUserPermissions]);

  // Enhanced permission checks
  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  }, [hasPermission]);

  const hasAllRoles = useCallback((roles: string[]): boolean => {
    return roles.every(role => hasRole(role));
  }, [hasRole]);

  // Resource access checks
  const canAccess = useCallback((resource: string, action: string, organizationId?: string): boolean => {
    const permissionKey = `${resource}:${action}`;
    return hasPermission(permissionKey, organizationId);
  }, [hasPermission]);

  // Convenience access checks
  const canManageUsers = useMemo(() => 
    hasAnyPermission([PERMISSION_MAPPINGS.users.create, PERMISSION_MAPPINGS.users.update, PERMISSION_MAPPINGS.users.delete])
  , [hasAnyPermission]);

  const canManageRoles = useMemo(() => 
    hasPermission(PERMISSION_MAPPINGS.roles.manage)
  , [hasPermission]);

  const canManageTeams = useMemo(() => 
    hasAnyPermission([PERMISSION_MAPPINGS.teams.create, PERMISSION_MAPPINGS.teams.update, PERMISSION_MAPPINGS.teams.delete])
  , [hasAnyPermission]);

  const canViewAnalytics = useMemo(() => 
    hasPermission(PERMISSION_MAPPINGS.analytics.view)
  , [hasPermission]);

  const canDeployToProduction = useMemo(() => 
    hasPermission(PERMISSION_MAPPINGS.infrastructure.deploy_production)
  , [hasPermission]);

  const canAccessLogs = useMemo(() => 
    hasPermission(PERMISSION_MAPPINGS.logs.view)
  , [hasPermission]);

  const canManageInfrastructure = useMemo(() => 
    hasPermission(PERMISSION_MAPPINGS.infrastructure.manage)
  , [hasPermission]);

  // Role hierarchy helpers
  const getRoleLevel = useCallback((role?: string): number => {
    if (!role) return 0;
    return ROLE_LEVELS[role] || 0;
  }, []);

  const canAssignRole = useCallback((targetRole: string): boolean => {
    if (isAdmin) return true; // Super admin can assign any role
    
    const userHighestLevel = Math.max(...currentUserRoles.map(getRoleLevel));
    const targetLevel = getRoleLevel(targetRole);
    
    // Can only assign roles of lower level than own highest role
    return userHighestLevel > targetLevel;
  }, [currentUserRoles, getRoleLevel, isAdmin]);

  const getAssignableRoles = useCallback((): string[] => {
    if (isAdmin) return Object.keys(ROLE_LEVELS); // Super admin can assign any role
    
    const userHighestLevel = Math.max(...currentUserRoles.map(getRoleLevel));
    
    return Object.entries(ROLE_LEVELS)
      .filter(([, level]) => level < userHighestLevel)
      .map(([role]) => role);
  }, [currentUserRoles, getRoleLevel, isAdmin]);

  // Organization context
  const getCurrentOrganizationId = useCallback((): string | undefined => {
    return state.user?.organization_id;
  }, [state.user?.organization_id]);

  const isOrganizationMember = useCallback((organizationId: string): boolean => {
    return state.user?.organization_id === organizationId;
  }, [state.user?.organization_id]);

  // API interactions
  const refreshUserPermissions = useCallback(async (): Promise<void> => {
    try {
      if (state.user?.id) {
        await rbacApi.getUserPermissions(state.user.id.toString());
        // This would trigger a re-fetch of user data in the auth context
        // Implementation depends on how the auth context handles user data updates
      }
    } catch (error) {
      console.error('Failed to refresh user permissions:', error);
      throw error;
    }
  }, [state.user?.id]);

  const checkPermissionAsync = useCallback(async (permission: string, organizationId?: string): Promise<boolean> => {
    try {
      if (!state.user?.id) return false;
      
      const result = await rbacApi.checkUserPermission(
        parseInt(state.user.id.toString()),
        permission as any,
        organizationId ? parseInt(organizationId) : undefined
      );
      
      return result.allowed;
    } catch (error) {
      console.error('Failed to check permission:', error);
      return false;
    }
  }, [state.user?.id]);

  return {
    // Permission checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Role checks
    hasRole,
    hasAnyRole,
    hasAllRoles,
    
    // Convenience role checks
    isAdmin,
    isOrganizationOwner,
    isDevOpsAdmin,
    isManager,
    isEngineer,
    isViewer,
    isAPIOnly,
    
    // Resource access checks
    canAccess,
    canManageUsers,
    canManageRoles,
    canManageTeams,
    canViewAnalytics,
    canDeployToProduction,
    canAccessLogs,
    canManageInfrastructure,
    
    // User and role data
    currentUserRoles,
    currentUserPermissions,
    userEffectivePermissions,
    
    // Role hierarchy helpers
    getRoleLevel,
    canAssignRole,
    getAssignableRoles,
    
    // Organization context
    getCurrentOrganizationId,
    isOrganizationMember,
    
    // API interactions
    refreshUserPermissions,
    checkPermissionAsync,
  };
}