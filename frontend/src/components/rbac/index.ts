/**
 * RBAC Components Export Index
 * 
 * Centralized exports for all RBAC-related components and utilities
 */

// Permission Guard Components
export { 
  PermissionGuard,
  AdminOnly,
  RoleGuard,
  ResourceGuard
} from './PermissionGuard';

// Role Badge Components
export {
  RoleBadge,
  RoleBadgeList,
  UserRoleDisplay
} from './RoleBadge';

// Higher-Order Components
export {
  withPermissions,
  withAuth,
  withAdminAccess,
  withRoles,
  withPermission,
  withResourceAccess,
  UnauthorizedPage
} from './withPermissions';

// Management Components
export { RBACManagement } from './RBACManagement';

// Types (re-export from contexts if needed)
export type {
  // Add any RBAC-specific types here
} from '@/contexts/AuthContext';