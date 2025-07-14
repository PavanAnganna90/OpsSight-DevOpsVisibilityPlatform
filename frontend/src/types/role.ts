/**
 * Role and Permission management TypeScript types.
 * Corresponds to backend Role, Permission, and RBAC models.
 */

/**
 * System role enum - Updated to match PRD specifications
 */
export enum SystemRole {
  SUPER_ADMIN = 'super_admin',          // Platform-wide access across all organizations
  ORGANIZATION_OWNER = 'org_owner',     // Full access to organization resources
  DEVOPS_ADMIN = 'devops_admin',        // Operational access to infrastructure
  MANAGER = 'manager',                  // Management-level access
  ENGINEER = 'engineer',                // Engineering access
  VIEWER = 'viewer',                    // Read-only access
  API_ONLY = 'api_only'                 // Programmatic access for integrations
}

/**
 * Permission types enum - Enhanced with new API and DevOps permissions
 */
export enum PermissionType {
  // Organization management (super admin only)
  CREATE_ORGANIZATIONS = 'create_organizations',
  UPDATE_ORGANIZATIONS = 'update_organizations',
  DELETE_ORGANIZATIONS = 'delete_organizations',
  VIEW_ALL_ORGANIZATIONS = 'view_all_organizations',
  
  // User management
  CREATE_USERS = 'create_users',
  UPDATE_USERS = 'update_users',
  DELETE_USERS = 'delete_users',
  VIEW_USERS = 'view_users',
  INVITE_USERS = 'invite_users',
  
  // Team management
  CREATE_TEAMS = 'create_teams',
  UPDATE_TEAMS = 'update_teams',
  DELETE_TEAMS = 'delete_teams',
  VIEW_TEAMS = 'view_teams',
  MANAGE_TEAM_MEMBERS = 'manage_team_members',
  
  // Project management
  CREATE_PROJECTS = 'create_projects',
  UPDATE_PROJECTS = 'update_projects',
  DELETE_PROJECTS = 'delete_projects',
  VIEW_PROJECTS = 'view_projects',
  
  // Infrastructure management
  VIEW_INFRASTRUCTURE = 'view_infrastructure',
  MANAGE_INFRASTRUCTURE = 'manage_infrastructure',
  DEPLOY_INFRASTRUCTURE = 'deploy_infrastructure',
  
  // Pipeline management
  VIEW_PIPELINES = 'view_pipelines',
  TRIGGER_PIPELINES = 'trigger_pipelines',
  MANAGE_PIPELINES = 'manage_pipelines',
  
  // Automation management
  VIEW_AUTOMATION = 'view_automation',
  TRIGGER_AUTOMATION = 'trigger_automation',
  MANAGE_AUTOMATION = 'manage_automation',
  
  // Alert management
  VIEW_ALERTS = 'view_alerts',
  ACKNOWLEDGE_ALERTS = 'acknowledge_alerts',
  RESOLVE_ALERTS = 'resolve_alerts',
  MANAGE_ALERTS = 'manage_alerts',
  
  // Cost management
  VIEW_COSTS = 'view_costs',
  MANAGE_COST_BUDGETS = 'manage_cost_budgets',
  
  // Role management
  VIEW_ROLES = 'view_roles',
  MANAGE_ROLES = 'manage_roles',
  
  // System administration
  VIEW_SYSTEM_LOGS = 'view_system_logs',
  MANAGE_SYSTEM_SETTINGS = 'manage_system_settings',
  
  // Organization-specific settings
  MANAGE_ORG_SETTINGS = 'manage_org_settings',
  VIEW_ORG_SETTINGS = 'view_org_settings',
  MANAGE_ORG_BILLING = 'manage_org_billing',
  VIEW_ORG_BILLING = 'view_org_billing',
  
  // API access permissions for programmatic access
  API_READ_ACCESS = 'api_read_access',
  API_WRITE_ACCESS = 'api_write_access',
  API_ADMIN_ACCESS = 'api_admin_access',
  WEBHOOK_MANAGEMENT = 'webhook_management',
  TOKEN_MANAGEMENT = 'token_management',
  
  // DevOps specific permissions
  CLUSTER_MANAGEMENT = 'cluster_management',
  DEPLOYMENT_MANAGEMENT = 'deployment_management',
  MONITORING_MANAGEMENT = 'monitoring_management',
  LOG_ACCESS = 'log_access',
  SECURITY_SCANNING = 'security_scanning'
}

/**
 * Permission categories for organization
 */
export interface PermissionCategory {
  name: string;
  description: string;
  permissions: PermissionType[];
}

/**
 * Permission definition
 */
export interface Permission {
  id: number;
  name: PermissionType;
  description: string;
  category: string;
  created_at: string;
}

/**
 * Role definition
 */
export interface Role {
  id: number;
  name: string;
  system_role: SystemRole;
  description: string;
  is_system_role: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  permissions?: Permission[];
  user_count?: number;
}

/**
 * Role creation request
 */
export interface RoleCreate {
  name: string;
  system_role: SystemRole;
  description?: string;
  permission_ids?: number[];
}

/**
 * Role update request
 */
export interface RoleUpdate {
  name?: string;
  description?: string;
  permission_ids?: number[];
  is_active?: boolean;
}

/**
 * User role assignment request
 */
export interface UserRoleAssignmentRequest {
  user_id: number;
  role_id: number;
}

/**
 * User role assignment response
 */
export interface UserRoleAssignmentResponse {
  user_id: number;
  role_id: number;
  role_name: string;
  assigned_at: string;
  assigned_by_user_id: number;
  message: string;
}

/**
 * Role permissions response
 */
export interface RolePermissionsResponse {
  role_id: number;
  role_name: string;
  permissions: Permission[];
  categories: {
    [category: string]: Permission[];
  };
}

/**
 * User effective permissions
 */
export interface UserPermissions {
  user_id: number;
  system_permissions: PermissionType[];
  team_permissions: {
    [team_id: number]: {
      team_name: string;
      role: string;
      permissions: string[];
    };
  };
  effective_permissions: PermissionType[];
}

/**
 * Role analytics data
 */
export interface RoleAnalytics {
  total_roles: number;
  system_roles: number;
  custom_roles: number;
  users_by_role: {
    [role_name: string]: number;
  };
  permission_usage: {
    [permission: string]: number;
  };
  recent_assignments: {
    user_id: number;
    username: string;
    role_name: string;
    assigned_at: string;
  }[];
}

/**
 * Permission matrix for UI display
 */
export interface PermissionMatrix {
  categories: PermissionCategory[];
  roles: Role[];
  matrix: {
    [role_id: number]: {
      [permission: string]: boolean;
    };
  };
}

/**
 * Role comparison data
 */
export interface RoleComparison {
  roles: Role[];
  permissions: Permission[];
  comparison_matrix: {
    [permission: string]: {
      [role_id: number]: boolean;
    };
  };
  differences: {
    role1_only: PermissionType[];
    role2_only: PermissionType[];
    shared: PermissionType[];
  };
}

/**
 * Bulk role operation request
 */
export interface BulkRoleOperation {
  user_ids: number[];
  role_id: number;
  operation: 'assign' | 'remove';
}

/**
 * Bulk role operation response
 */
export interface BulkRoleOperationResponse {
  successful: number;
  failed: number;
  results: {
    user_id: number;
    success: boolean;
    message: string;
  }[];
}

/**
 * Role suggestion based on user activity
 */
export interface RoleSuggestion {
  user_id: number;
  username: string;
  current_role: string | null;
  suggested_role: string;
  confidence: number;
  reasons: string[];
  activity_patterns: {
    [permission: string]: number;
  };
}

/**
 * RBAC health check
 */
export interface RBACHealth {
  total_users: number;
  users_with_roles: number;
  orphaned_permissions: number;
  inactive_roles: number;
  permission_conflicts: {
    description: string;
    affected_users: number;
  }[];
  recommendations: string[];
} 