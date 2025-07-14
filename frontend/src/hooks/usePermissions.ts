/**
 * Permission Hooks
 * 
 * Custom hooks for common permission checking patterns
 */

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook for checking multiple permissions
 */
export function usePermissions() {
  const { hasPermission, hasRole, hasAnyRole, hasAnyPermission, canAccess, getUserPermissions, getUserRoles, isAdmin } = useAuth();

  return {
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAnyPermission,
    canAccess,
    getUserPermissions,
    getUserRoles,
    isAdmin,
  };
}

/**
 * Hook for checking if user can perform CRUD operations on a resource
 */
export function useResourcePermissions(resource: string, organizationId?: string) {
  const { canAccess } = useAuth();

  return useMemo(() => ({
    canView: canAccess(resource, 'view', organizationId),
    canCreate: canAccess(resource, 'create', organizationId),
    canUpdate: canAccess(resource, 'update', organizationId),
    canDelete: canAccess(resource, 'delete', organizationId),
    canManage: canAccess(resource, 'manage', organizationId),
  }), [canAccess, resource, organizationId]);
}

/**
 * Hook for checking admin permissions
 */
export function useAdminPermissions() {
  const { isAdmin, hasPermission, hasRole } = useAuth();

  return useMemo(() => ({
    isAdmin: isAdmin(),
    canManageUsers: hasPermission('manage_users'),
    canManageRoles: hasPermission('manage_roles'),
    canManagePermissions: hasPermission('manage_permissions'),
    canManageTeams: hasPermission('manage_teams'),
    canManageSystem: hasPermission('manage_system'),
    canViewAuditLogs: hasPermission('view_audit_logs'),
    isOrgOwner: hasRole('organization_owner'),
    isDevOpsAdmin: hasRole('devops_admin'),
  }), [isAdmin, hasPermission, hasRole]);
}

/**
 * Hook for checking infrastructure permissions
 */
export function useInfrastructurePermissions(organizationId?: string) {
  const { hasPermission, canAccess } = useAuth();

  return useMemo(() => ({
    canViewInfrastructure: canAccess('infrastructure', 'view', organizationId),
    canManageInfrastructure: canAccess('infrastructure', 'manage', organizationId),
    canManageClusters: hasPermission('manage_clusters', organizationId),
    canViewClusters: hasPermission('view_clusters', organizationId),
    canManageDeployments: hasPermission('manage_deployments', organizationId),
    canViewDeployments: hasPermission('view_deployments', organizationId),
    canManageMonitoring: hasPermission('manage_monitoring', organizationId),
    canViewMonitoring: hasPermission('view_monitoring', organizationId),
    canManagePipelines: hasPermission('manage_pipelines', organizationId),
    canViewPipelines: hasPermission('view_pipelines', organizationId),
  }), [hasPermission, canAccess, organizationId]);
}

/**
 * Hook for checking team permissions
 */
export function useTeamPermissions(organizationId?: string) {
  const { hasPermission, canAccess } = useAuth();

  return useMemo(() => ({
    canViewTeams: canAccess('teams', 'view', organizationId),
    canCreateTeams: canAccess('teams', 'create', organizationId),
    canUpdateTeams: canAccess('teams', 'update', organizationId),
    canDeleteTeams: canAccess('teams', 'delete', organizationId),
    canManageTeamMembers: hasPermission('manage_team_members', organizationId),
    canViewTeamMembers: hasPermission('view_team_members', organizationId),
    canAssignRoles: hasPermission('assign_roles', organizationId),
  }), [hasPermission, canAccess, organizationId]);
}

/**
 * Hook for checking navigation permissions
 */
export function useNavigationPermissions() {
  const { hasPermission, hasAnyRole, isAdmin } = useAuth();

  return useMemo(() => ({
    canViewDashboard: hasPermission('view_dashboard'),
    canViewInfrastructure: hasPermission('view_infrastructure'),
    canViewPipelines: hasPermission('view_pipelines'),
    canViewAutomation: hasPermission('view_automation'),
    canViewTeams: hasPermission('view_teams'),
    canViewUsers: hasPermission('view_users'),
    canViewRoles: hasPermission('view_roles'),
    canViewSettings: hasPermission('view_settings'),
    canViewAdmin: isAdmin(),
    canViewMonitoring: hasPermission('view_monitoring'),
    canViewReports: hasPermission('view_reports'),
    canViewAuditLogs: hasPermission('view_audit_logs'),
    isManagerOrAbove: hasAnyRole(['manager', 'devops_admin', 'organization_owner', 'super_admin']),
    isDevOpsRole: hasAnyRole(['devops_admin', 'engineer', 'organization_owner', 'super_admin']),
  }), [hasPermission, hasAnyRole, isAdmin]);
}

/**
 * Hook for checking if user can access specific features
 */
export function useFeaturePermissions() {
  const { hasPermission, hasRole } = useAuth();

  return useMemo(() => ({
    canUseCLI: hasPermission('api_access'),
    canUseAPI: hasPermission('api_access'),
    canUseWebhooks: hasPermission('webhook_management'),
    canViewCosts: hasPermission('view_cost_analysis'),
    canManageCosts: hasPermission('manage_cost_analysis'),
    canViewAlerts: hasPermission('view_alerts'),
    canManageAlerts: hasPermission('manage_alerts'),
    canViewNotifications: hasPermission('view_notifications'),
    canManageNotifications: hasPermission('manage_notifications'),
    canViewIntegrations: hasPermission('view_integrations'),
    canManageIntegrations: hasPermission('manage_integrations'),
    canExportData: hasPermission('export_data'),
    canImportData: hasPermission('import_data'),
    hasAPIOnlyAccess: hasRole('api_only'),
  }), [hasPermission, hasRole]);
}

/**
 * Hook for permission-based UI state
 */
export function usePermissionState() {
  const auth = useAuth();
  const adminPerms = useAdminPermissions();
  const navPerms = useNavigationPermissions();
  const featurePerms = useFeaturePermissions();

  return useMemo(() => ({
    isAuthenticated: auth.state.isAuthenticated,
    user: auth.state.user,
    roles: auth.getUserRoles(),
    permissions: auth.getUserPermissions(),
    admin: adminPerms,
    navigation: navPerms,
    features: featurePerms,
    hasAnyAdminRole: adminPerms.isAdmin,
    hasAnyManagerRole: navPerms.isManagerOrAbove,
    hasAnyDevOpsRole: navPerms.isDevOpsRole,
  }), [auth, adminPerms, navPerms, featurePerms]);
}