/**
 * Higher-Order Component for Route Protection
 * 
 * Protects routes based on user permissions and roles
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

interface WithPermissionsOptions {
  permissions?: string[];
  roles?: string[];
  requireAll?: boolean;
  adminOnly?: boolean;
  resource?: string;
  action?: string;
  organizationId?: string;
  redirectTo?: string;
  fallback?: React.ComponentType;
}

/**
 * HOC to protect components/pages with permission checks
 */
export function withPermissions<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  options: WithPermissionsOptions = {}
) {
  const {
    permissions = [],
    roles = [],
    requireAll = false,
    adminOnly = false,
    resource,
    action,
    organizationId,
    redirectTo = '/unauthorized',
    fallback: FallbackComponent,
  } = options;

  const ProtectedComponent: React.FC<T> = (props) => {
    const router = useRouter();
    const { state } = useAuth();
    const { hasPermission, hasRole, hasAnyRole, hasAnyPermission, canAccess, isAdmin } = usePermissions();

    // Check if user is authenticated
    if (!state.isAuthenticated) {
      React.useEffect(() => {
        router.push('/login');
      }, [router]);
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-600">Redirecting to login...</p>
          </div>
        </div>
      );
    }

    // Check admin requirement
    if (adminOnly && !isAdmin()) {
      React.useEffect(() => {
        router.push(redirectTo);
      }, [router]);

      if (FallbackComponent) {
        return <FallbackComponent />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">Administrator access required.</p>
          </div>
        </div>
      );
    }

    // Check resource/action permission
    if (resource && action) {
      const hasResourceAccess = canAccess(resource, action, organizationId);
      if (!hasResourceAccess) {
        React.useEffect(() => {
          router.push(redirectTo);
        }, [router]);

        if (FallbackComponent) {
          return <FallbackComponent />;
        }

        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">
                You don't have permission to {action} {resource}.
              </p>
            </div>
          </div>
        );
      }
    }

    // Check specific permissions
    if (permissions.length > 0) {
      const hasRequiredPermissions = requireAll
        ? permissions.every(permission => hasPermission(permission, organizationId))
        : hasAnyPermission(permissions);

      if (!hasRequiredPermissions) {
        React.useEffect(() => {
          router.push(redirectTo);
        }, [router]);

        if (FallbackComponent) {
          return <FallbackComponent />;
        }

        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">
                Required permissions: {permissions.join(requireAll ? ' and ' : ' or ')}
              </p>
            </div>
          </div>
        );
      }
    }

    // Check specific roles
    if (roles.length > 0) {
      const hasRequiredRoles = requireAll
        ? roles.every(role => hasRole(role))
        : hasAnyRole(roles);

      if (!hasRequiredRoles) {
        React.useEffect(() => {
          router.push(redirectTo);
        }, [router]);

        if (FallbackComponent) {
          return <FallbackComponent />;
        }

        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">
                Required roles: {roles.join(requireAll ? ' and ' : ' or ')}
              </p>
            </div>
          </div>
        );
      }
    }

    // All checks passed, render the component
    return <WrappedComponent {...props} />;
  };

  ProtectedComponent.displayName = `withPermissions(${WrappedComponent.displayName || WrappedComponent.name})`;

  return ProtectedComponent;
}

// Convenience HOCs for common use cases
export const withAuth = <T extends object>(Component: React.ComponentType<T>) =>
  withPermissions(Component, {});

export const withAdminAccess = <T extends object>(Component: React.ComponentType<T>) =>
  withPermissions(Component, { adminOnly: true });

export const withRoles = <T extends object>(
  Component: React.ComponentType<T>,
  roles: string[],
  requireAll = false
) =>
  withPermissions(Component, { roles, requireAll });

export const withPermission = <T extends object>(
  Component: React.ComponentType<T>,
  permission: string,
  organizationId?: string
) =>
  withPermissions(Component, { permissions: [permission], organizationId });

export const withResourceAccess = <T extends object>(
  Component: React.ComponentType<T>,
  resource: string,
  action: string,
  organizationId?: string
) =>
  withPermissions(Component, { resource, action, organizationId });

// Default unauthorized page component
export const UnauthorizedPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full text-center">
      <div className="bg-white shadow-lg rounded-lg p-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <svg 
            className="w-8 h-8 text-red-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Go Back
        </button>
      </div>
    </div>
  </div>
);

export default withPermissions;