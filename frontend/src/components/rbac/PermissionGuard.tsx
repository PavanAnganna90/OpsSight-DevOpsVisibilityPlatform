/**
 * Permission Guard Component
 *
 * Conditionally renders children based on user permissions
 */

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface PermissionGuardProps {
  permission?: string;
  permissions?: string[];
  role?: string;
  roles?: string[];
  resource?: string;
  action?: string;
  organizationId?: string;
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGuard({
  permission,
  permissions,
  role,
  roles,
  resource,
  action,
  organizationId,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { hasPermission, hasRole, isAuthenticated, user } = useAuth();

  // If not authenticated, don't render
  if (!isAuthenticated || !user) {
    return <>{fallback}</>;
  }

  // Check permissions
  let hasAccess = true;

  // Single permission check
  if (permission) {
    hasAccess = hasPermission(permission, organizationId);
  }

  // Multiple permissions check
  if (permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? permissions.every((p) => hasPermission(p, organizationId))
      : permissions.some((p) => hasPermission(p, organizationId));
  }

  // Single role check
  if (role) {
    hasAccess = hasAccess && hasRole(role);
  }

  // Multiple roles check
  if (roles && roles.length > 0) {
    hasAccess =
      hasAccess && (requireAll ? roles.every((r) => hasRole(r)) : roles.some((r) => hasRole(r)));
  }

  // Resource/action check
  if (resource && action) {
    hasAccess = hasAccess && hasPermission(`${action}:${resource}`, organizationId);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// Convenience components for common use cases
export function AdminOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard roles={['admin', 'organization_owner', 'super_admin']} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function RoleGuard({
  role,
  roles,
  children,
  fallback = null,
}: {
  role?: string;
  roles?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard role={role} roles={roles} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function ResourceGuard({
  resource,
  action,
  organizationId,
  children,
  fallback = null,
}: {
  resource: string;
  action: string;
  organizationId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard
      resource={resource}
      action={action}
      organizationId={organizationId}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}

// Team-specific guard component
export function TeamGuard({
  teamId,
  permission,
  role,
  children,
  fallback = null,
}: {
  teamId?: string;
  permission?: string;
  role?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard
      permission={permission}
      role={role}
      resource="team"
      organizationId={teamId}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}
