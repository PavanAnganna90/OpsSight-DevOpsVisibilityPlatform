# RBAC Frontend Developer Guide

## Overview

This guide provides comprehensive instructions for frontend developers to implement Role-Based Access Control (RBAC) in the OpsSight platform. The frontend RBAC system integrates seamlessly with the backend permission system to provide secure, user-friendly access control.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Permission Types](#permission-types)
3. [React Context Setup](#react-context-setup)
4. [Permission Hooks](#permission-hooks)
5. [Component Guards](#component-guards)
6. [Route Protection](#route-protection)
7. [Form Validation](#form-validation)
8. [API Integration](#api-integration)
9. [Best Practices](#best-practices)
10. [Testing](#testing)
11. [Troubleshooting](#troubleshooting)

## Architecture Overview

The frontend RBAC system follows a layered architecture:

```
┌─────────────────┐
│   Components    │  ← Permission-aware UI components
├─────────────────┤
│   Guards        │  ← Component and route guards
├─────────────────┤
│   Hooks         │  ← Permission checking hooks
├─────────────────┤
│   Context       │  ← RBAC context and state
├─────────────────┤
│   API Layer     │  ← Backend permission API
└─────────────────┘
```

## Permission Types

### System Permissions

```typescript
// src/types/permissions.ts
export enum PermissionType {
  // User Management
  VIEW_USERS = 'view_users',
  CREATE_USERS = 'create_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  MANAGE_ROLES = 'manage_roles',
  
  // Team Management
  VIEW_TEAMS = 'view_teams',
  CREATE_TEAMS = 'create_teams',
  EDIT_TEAMS = 'edit_teams',
  DELETE_TEAMS = 'delete_teams',
  
  // Project Management
  VIEW_PROJECTS = 'view_projects',
  CREATE_PROJECTS = 'create_projects',
  EDIT_PROJECTS = 'edit_projects',
  DELETE_PROJECTS = 'delete_projects',
  
  // Infrastructure
  VIEW_INFRASTRUCTURE = 'view_infrastructure',
  MANAGE_INFRASTRUCTURE = 'manage_infrastructure',
  
  // API Access
  API_READ_ACCESS = 'api_read_access',
  API_WRITE_ACCESS = 'api_write_access',
  API_ADMIN_ACCESS = 'api_admin_access',
}

export interface Permission {
  id: number;
  name: PermissionType;
  displayName: string;
  description: string;
  category: string;
  source: 'role' | 'direct';
}

export interface UserPermissions {
  userId: number;
  organizationId: number;
  permissions: Permission[];
  roles: Role[];
  lastUpdated: Date;
}
```

### Role Definitions

```typescript
// src/types/roles.ts
export enum SystemRole {
  SUPER_ADMIN = 'super_admin',
  ORGANIZATION_OWNER = 'org_owner',
  DEVOPS_ADMIN = 'devops_admin',
  MANAGER = 'manager',
  ENGINEER = 'engineer',
  API_ONLY = 'api_only',
  VIEWER = 'viewer',
}

export interface Role {
  id: number;
  name: SystemRole;
  displayName: string;
  description: string;
  priority: number;
  permissions: Permission[];
}
```

## React Context Setup

### Permission Context

```typescript
// src/contexts/PermissionContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { permissionApi } from '../services/permissionApi';
import { PermissionType, UserPermissions } from '../types/permissions';

interface PermissionContextType {
  userPermissions: UserPermissions | null;
  loading: boolean;
  error: string | null;
  hasPermission: (permission: PermissionType) => boolean;
  hasAnyPermission: (permissions: PermissionType[]) => boolean;
  hasAllPermissions: (permissions: PermissionType[]) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, organizationId } = useAuth();

  const fetchPermissions = async () => {
    if (!user || !organizationId) {
      setUserPermissions(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const permissions = await permissionApi.getUserPermissions(user.id, organizationId);
      setUserPermissions({
        userId: user.id,
        organizationId,
        permissions,
        roles: user.roles || [],
        lastUpdated: new Date(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch permissions');
      setUserPermissions(null);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: PermissionType): boolean => {
    if (!userPermissions) return false;
    return userPermissions.permissions.some(p => p.name === permission);
  };

  const hasAnyPermission = (permissions: PermissionType[]): boolean => {
    if (!userPermissions) return false;
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: PermissionType[]): boolean => {
    if (!userPermissions) return false;
    return permissions.every(permission => hasPermission(permission));
  };

  const refreshPermissions = async () => {
    await fetchPermissions();
  };

  useEffect(() => {
    fetchPermissions();
  }, [user, organizationId]);

  const value: PermissionContextType = {
    userPermissions,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};
```

## Permission Hooks

### Basic Permission Hook

```typescript
// src/hooks/usePermission.ts
import { usePermissions } from '../contexts/PermissionContext';
import { PermissionType } from '../types/permissions';

export const usePermission = (permission: PermissionType) => {
  const { hasPermission, loading, error } = usePermissions();
  
  return {
    hasPermission: hasPermission(permission),
    loading,
    error,
  };
};
```

### Multiple Permissions Hook

```typescript
// src/hooks/useMultiplePermissions.ts
import { usePermissions } from '../contexts/PermissionContext';
import { PermissionType } from '../types/permissions';

export const useMultiplePermissions = (
  permissions: PermissionType[],
  mode: 'any' | 'all' = 'any'
) => {
  const { hasAnyPermission, hasAllPermissions, loading, error } = usePermissions();
  
  const hasPermission = mode === 'any' 
    ? hasAnyPermission(permissions)
    : hasAllPermissions(permissions);
  
  return {
    hasPermission,
    loading,
    error,
  };
};
```

### Permission Validation Hook

```typescript
// src/hooks/usePermissionValidation.ts
import { useState, useEffect } from 'react';
import { usePermissions } from '../contexts/PermissionContext';
import { PermissionType } from '../types/permissions';

interface ValidationResult {
  isValid: boolean;
  missingPermissions: PermissionType[];
  loading: boolean;
}

export const usePermissionValidation = (
  requiredPermissions: PermissionType[]
): ValidationResult => {
  const { hasPermission, loading } = usePermissions();
  const [result, setResult] = useState<ValidationResult>({
    isValid: false,
    missingPermissions: [],
    loading: true,
  });

  useEffect(() => {
    if (loading) {
      setResult(prev => ({ ...prev, loading: true }));
      return;
    }

    const missingPermissions = requiredPermissions.filter(
      permission => !hasPermission(permission)
    );

    setResult({
      isValid: missingPermissions.length === 0,
      missingPermissions,
      loading: false,
    });
  }, [requiredPermissions, hasPermission, loading]);

  return result;
};
```

## Component Guards

### Permission Guard Component

```typescript
// src/components/guards/PermissionGuard.tsx
import React, { ReactNode } from 'react';
import { usePermissions } from '../../contexts/PermissionContext';
import { PermissionType } from '../../types/permissions';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';

interface PermissionGuardProps {
  permission: PermissionType | PermissionType[];
  mode?: 'any' | 'all';
  children: ReactNode;
  fallback?: ReactNode;
  showError?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  mode = 'any',
  children,
  fallback = null,
  showError = false,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading, error } = usePermissions();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error && showError) {
    return <ErrorMessage message={error} />;
  }

  const permissions = Array.isArray(permission) ? permission : [permission];
  
  let hasRequiredPermission = false;
  
  if (Array.isArray(permission)) {
    hasRequiredPermission = mode === 'any' 
      ? hasAnyPermission(permissions)
      : hasAllPermissions(permissions);
  } else {
    hasRequiredPermission = hasPermission(permission);
  }

  if (!hasRequiredPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
```

### Role Guard Component

```typescript
// src/components/guards/RoleGuard.tsx
import React, { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SystemRole } from '../../types/roles';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface RoleGuardProps {
  role: SystemRole | SystemRole[];
  children: ReactNode;
  fallback?: ReactNode;
  minPriority?: number;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  role,
  children,
  fallback = null,
  minPriority,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user || !user.roles) {
    return <>{fallback}</>;
  }

  const userRoles = user.roles.map(r => r.name);
  const requiredRoles = Array.isArray(role) ? role : [role];

  let hasRequiredRole = false;

  if (minPriority !== undefined) {
    // Check if user has any role with priority >= minPriority
    hasRequiredRole = user.roles.some(r => r.priority >= minPriority);
  } else {
    // Check if user has any of the required roles
    hasRequiredRole = requiredRoles.some(r => userRoles.includes(r));
  }

  if (!hasRequiredRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
```

## Route Protection

### Protected Route Component

```typescript
// src/components/routing/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../contexts/PermissionContext';
import { PermissionType } from '../../types/permissions';
import { SystemRole } from '../../types/roles';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: PermissionType[];
  requiredRoles?: SystemRole[];
  requireAll?: boolean;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  requireAll = false,
  redirectTo = '/login',
}) => {
  const { user, loading: authLoading } = useAuth();
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading: permissionLoading } = usePermissions();
  const location = useLocation();

  if (authLoading || permissionLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requiredRoles.length > 0) {
    const userRoles = user.roles?.map(r => r.name) || [];
    const hasRequiredRole = requireAll
      ? requiredRoles.every(role => userRoles.includes(role))
      : requiredRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return <UnauthorizedPage />;
    }
  }

  // Check permission requirements
  if (requiredPermissions.length > 0) {
    const hasRequiredPermission = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);

    if (!hasRequiredPermission) {
      return <UnauthorizedPage />;
    }
  }

  return <>{children}</>;
};
```

### Route Configuration

```typescript
// src/routes/AppRoutes.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { PermissionType } from '../types/permissions';
import { SystemRole } from '../types/roles';

// Page imports
import { DashboardPage } from '../pages/DashboardPage';
import { UsersPage } from '../pages/UsersPage';
import { TeamsPage } from '../pages/TeamsPage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { AdminPage } from '../pages/AdminPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/users"
        element={
          <ProtectedRoute
            requiredPermissions={[PermissionType.VIEW_USERS]}
          >
            <UsersPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/teams"
        element={
          <ProtectedRoute
            requiredPermissions={[PermissionType.VIEW_TEAMS]}
          >
            <TeamsPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/projects"
        element={
          <ProtectedRoute
            requiredPermissions={[PermissionType.VIEW_PROJECTS]}
          >
            <ProjectsPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin"
        element={
          <ProtectedRoute
            requiredRoles={[SystemRole.ORGANIZATION_OWNER, SystemRole.SUPER_ADMIN]}
          >
            <AdminPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};
```

## Form Validation

### Permission-Aware Form Fields

```typescript
// src/components/forms/PermissionAwareForm.tsx
import React from 'react';
import { usePermissions } from '../../contexts/PermissionContext';
import { PermissionType } from '../../types/permissions';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { Select } from '../ui/Select';

interface UserFormProps {
  user?: User;
  onSubmit: (data: UserFormData) => void;
}

export const UserForm: React.FC<UserFormProps> = ({ user, onSubmit }) => {
  const { hasPermission } = usePermissions();
  const [formData, setFormData] = useState<UserFormData>({
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    role: user?.role || SystemRole.VIEWER,
  });

  const canEdit = hasPermission(PermissionType.EDIT_USERS);
  const canCreate = hasPermission(PermissionType.CREATE_USERS);
  const canManageRoles = hasPermission(PermissionType.MANAGE_ROLES);

  const canSubmit = user ? canEdit : canCreate;

  return (
    <form onSubmit={handleSubmit}>
      <TextField
        label="Email"
        value={formData.email}
        onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
        disabled={!canEdit}
        required
      />
      
      <TextField
        label="First Name"
        value={formData.firstName}
        onChange={(value) => setFormData(prev => ({ ...prev, firstName: value }))}
        disabled={!canEdit}
        required
      />
      
      <TextField
        label="Last Name"
        value={formData.lastName}
        onChange={(value) => setFormData(prev => ({ ...prev, lastName: value }))}
        disabled={!canEdit}
        required
      />
      
      {canManageRoles && (
        <Select
          label="Role"
          value={formData.role}
          onChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
          options={[
            { value: SystemRole.VIEWER, label: 'Viewer' },
            { value: SystemRole.ENGINEER, label: 'Engineer' },
            { value: SystemRole.MANAGER, label: 'Manager' },
            { value: SystemRole.DEVOPS_ADMIN, label: 'DevOps Admin' },
          ]}
        />
      )}
      
      <Button
        type="submit"
        disabled={!canSubmit}
      >
        {user ? 'Update User' : 'Create User'}
      </Button>
    </form>
  );
};
```

## API Integration

### Permission API Service

```typescript
// src/services/permissionApi.ts
import { apiClient } from './apiClient';
import { Permission, PermissionType } from '../types/permissions';

export const permissionApi = {
  /**
   * Get user permissions
   */
  async getUserPermissions(userId: number, organizationId: number): Promise<Permission[]> {
    const response = await apiClient.get(
      `/permissions/users/${userId}/permissions`,
      {
        params: { organization_id: organizationId }
      }
    );
    return response.data;
  },

  /**
   * Assign permission to user
   */
  async assignUserPermission(
    userId: number,
    permissionId: number,
    organizationId: number
  ): Promise<void> {
    await apiClient.post(
      `/permissions/users/${userId}/permissions/assign`,
      {
        user_id: userId,
        permission_id: permissionId,
        organization_id: organizationId,
      }
    );
  },

  /**
   * Revoke permission from user
   */
  async revokeUserPermission(
    userId: number,
    permissionId: number,
    organizationId: number
  ): Promise<void> {
    await apiClient.post(
      `/permissions/users/${userId}/permissions/revoke`,
      {
        user_id: userId,
        permission_id: permissionId,
        organization_id: organizationId,
      }
    );
  },

  /**
   * Validate user permission
   */
  async validatePermission(
    userId: number,
    permission: PermissionType,
    organizationId: number
  ): Promise<boolean> {
    const response = await apiClient.get(
      `/permissions/validate/${userId}/${permission}`,
      {
        params: { organization_id: organizationId }
      }
    );
    return response.data.has_permission;
  },

  /**
   * Bulk validate permissions
   */
  async validatePermissions(
    userId: number,
    permissions: PermissionType[],
    organizationId: number
  ): Promise<Record<string, boolean>> {
    const response = await apiClient.post(
      '/permissions/validate/bulk',
      {
        user_id: userId,
        permissions,
        organization_id: organizationId,
      }
    );
    return response.data;
  },
};
```

## Best Practices

### 1. Component Design

```typescript
// ✅ Good: Use permission guards for conditional rendering
<PermissionGuard permission={PermissionType.CREATE_USERS}>
  <CreateUserButton />
</PermissionGuard>

// ❌ Bad: Check permissions in every component
const CreateUserButton = () => {
  const { hasPermission } = usePermissions();
  if (!hasPermission(PermissionType.CREATE_USERS)) return null;
  return <button>Create User</button>;
};
```

### 2. Loading States

```typescript
// ✅ Good: Handle loading states properly
const UserList = () => {
  const { hasPermission, loading } = usePermissions();
  
  if (loading) return <LoadingSpinner />;
  if (!hasPermission(PermissionType.VIEW_USERS)) return <UnauthorizedMessage />;
  
  return <UserListContent />;
};
```

### 3. Error Handling

```typescript
// ✅ Good: Provide meaningful error messages
const PermissionError = ({ missingPermissions }: { missingPermissions: PermissionType[] }) => (
  <div className="error-message">
    <h3>Access Denied</h3>
    <p>You need the following permissions to access this feature:</p>
    <ul>
      {missingPermissions.map(perm => (
        <li key={perm}>{getPermissionDisplayName(perm)}</li>
      ))}
    </ul>
  </div>
);
```

### 4. Performance Optimization

```typescript
// ✅ Good: Memoize permission checks
const UserActions = React.memo(({ user }: { user: User }) => {
  const { hasPermission } = usePermissions();
  
  const canEdit = useMemo(() => hasPermission(PermissionType.EDIT_USERS), [hasPermission]);
  const canDelete = useMemo(() => hasPermission(PermissionType.DELETE_USERS), [hasPermission]);
  
  return (
    <div>
      {canEdit && <EditButton user={user} />}
      {canDelete && <DeleteButton user={user} />}
    </div>
  );
});
```

## Testing

### Testing Permission Components

```typescript
// src/components/__tests__/PermissionGuard.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PermissionGuard } from '../guards/PermissionGuard';
import { PermissionProvider } from '../../contexts/PermissionContext';
import { PermissionType } from '../../types/permissions';

const mockPermissions = {
  hasPermission: jest.fn(),
  hasAnyPermission: jest.fn(),
  hasAllPermissions: jest.fn(),
  loading: false,
  error: null,
};

jest.mock('../../contexts/PermissionContext', () => ({
  usePermissions: () => mockPermissions,
}));

describe('PermissionGuard', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders children when user has required permission', () => {
    mockPermissions.hasPermission.mockReturnValue(true);
    
    render(
      <PermissionGuard permission={PermissionType.VIEW_USERS}>
        <div>Protected Content</div>
      </PermissionGuard>
    );
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  test('renders fallback when user lacks required permission', () => {
    mockPermissions.hasPermission.mockReturnValue(false);
    
    render(
      <PermissionGuard 
        permission={PermissionType.VIEW_USERS}
        fallback={<div>Access Denied</div>}
      >
        <div>Protected Content</div>
      </PermissionGuard>
    );
    
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  test('handles multiple permissions with "any" mode', () => {
    mockPermissions.hasAnyPermission.mockReturnValue(true);
    
    render(
      <PermissionGuard 
        permission={[PermissionType.VIEW_USERS, PermissionType.CREATE_USERS]}
        mode="any"
      >
        <div>Protected Content</div>
      </PermissionGuard>
    );
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockPermissions.hasAnyPermission).toHaveBeenCalledWith([
      PermissionType.VIEW_USERS,
      PermissionType.CREATE_USERS
    ]);
  });
});
```

### Testing Permission Hooks

```typescript
// src/hooks/__tests__/usePermission.test.tsx
import { renderHook } from '@testing-library/react';
import { usePermission } from '../usePermission';
import { PermissionType } from '../../types/permissions';

const mockPermissions = {
  hasPermission: jest.fn(),
  loading: false,
  error: null,
};

jest.mock('../../contexts/PermissionContext', () => ({
  usePermissions: () => mockPermissions,
}));

describe('usePermission', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns permission status', () => {
    mockPermissions.hasPermission.mockReturnValue(true);
    
    const { result } = renderHook(() => usePermission(PermissionType.VIEW_USERS));
    
    expect(result.current.hasPermission).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
```

## Troubleshooting

### Common Issues

#### 1. Permission Context Not Available
```typescript
// Error: usePermissions must be used within a PermissionProvider
// Solution: Wrap your app with PermissionProvider
<PermissionProvider>
  <App />
</PermissionProvider>
```

#### 2. Permissions Not Loading
```typescript
// Check if user is authenticated and organization is set
const { user, organizationId } = useAuth();
if (!user || !organizationId) {
  // Handle missing authentication context
}
```

#### 3. Stale Permission Data
```typescript
// Refresh permissions after role changes
const { refreshPermissions } = usePermissions();
await refreshPermissions();
```

### Debug Tools

#### Permission Inspector Component
```typescript
// src/components/debug/PermissionInspector.tsx
import React from 'react';
import { usePermissions } from '../../contexts/PermissionContext';
import { useAuth } from '../../contexts/AuthContext';

export const PermissionInspector: React.FC = () => {
  const { userPermissions, loading, error } = usePermissions();
  const { user } = useAuth();

  if (loading) return <div>Loading permissions...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!userPermissions) return <div>No permissions loaded</div>;

  return (
    <div className="permission-inspector">
      <h3>Permission Inspector</h3>
      <div>
        <strong>User:</strong> {user?.email}
      </div>
      <div>
        <strong>Organization:</strong> {userPermissions.organizationId}
      </div>
      <div>
        <strong>Roles:</strong>
        <ul>
          {user?.roles?.map(role => (
            <li key={role.id}>{role.displayName} (Priority: {role.priority})</li>
          ))}
        </ul>
      </div>
      <div>
        <strong>Permissions:</strong>
        <ul>
          {userPermissions.permissions.map(perm => (
            <li key={perm.id}>
              {perm.displayName} ({perm.source})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
```

## Conclusion

The RBAC frontend system provides a comprehensive solution for implementing secure, user-friendly access control in React applications. By following this guide and using the provided components, hooks, and patterns, developers can create robust permission-aware interfaces that maintain security while providing excellent user experience.

For additional support or questions, refer to the backend permission system documentation or contact the development team.