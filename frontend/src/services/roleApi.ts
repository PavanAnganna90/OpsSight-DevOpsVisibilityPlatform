/**
 * Role API Service
 * 
 * Service for connecting to role and permission management backend endpoints.
 * Provides methods for role CRUD operations, permission management, and user assignments.
 */

import {
  Role,
  RoleCreate,
  RoleUpdate,
  Permission,
  PermissionType,
  PermissionCategory,
  UserRoleAssignmentRequest,
  UserRoleAssignmentResponse,
  RolePermissionsResponse,
  UserPermissions,
  RoleAnalytics,
  PermissionMatrix,
  RoleComparison,
  BulkRoleOperation,
  BulkRoleOperationResponse,
  RoleSuggestion,
  RBACHealth
} from '../types/role';

class RoleApiService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? '/api/v1/roles' 
      : 'http://localhost:8000/api/v1/roles';
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAuthToken();
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (response.status === 403) {
        throw new Error('Access denied. You do not have permission to perform this action.');
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Role API request failed: ${url}`, error);
      throw error;
    }
  }

  /**
   * Get all roles
   */
  async getRoles(includePermissions: boolean = false): Promise<Role[]> {
    const queryParams = includePermissions ? '?include_permissions=true' : '';
    return this.request<Role[]>(`${queryParams}`);
  }

  /**
   * Get a specific role by ID
   */
  async getRole(roleId: number): Promise<Role> {
    return this.request<Role>(`/${roleId}`);
  }

  /**
   * Create a new role
   */
  async createRole(roleData: RoleCreate): Promise<Role> {
    return this.request<Role>('', {
      method: 'POST',
      body: JSON.stringify(roleData),
    });
  }

  /**
   * Update an existing role
   */
  async updateRole(roleId: number, roleData: RoleUpdate): Promise<Role> {
    return this.request<Role>(`/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(roleData),
    });
  }

  /**
   * Delete a role
   */
  async deleteRole(roleId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/${roleId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get all permissions
   */
  async getPermissions(): Promise<Permission[]> {
    return this.request<Permission[]>('/permissions');
  }

  /**
   * Get permissions organized by category
   */
  async getPermissionCategories(): Promise<PermissionCategory[]> {
    return this.request<PermissionCategory[]>('/permissions/categories');
  }

  /**
   * Get role permissions
   */
  async getRolePermissions(roleId: number): Promise<RolePermissionsResponse> {
    return this.request<RolePermissionsResponse>(`/${roleId}/permissions`);
  }

  /**
   * Update role permissions
   */
  async updateRolePermissions(
    roleId: number,
    permissionIds: number[]
  ): Promise<RolePermissionsResponse> {
    return this.request<RolePermissionsResponse>(`/${roleId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permission_ids: permissionIds }),
    });
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(assignmentData: UserRoleAssignmentRequest): Promise<UserRoleAssignmentResponse> {
    return this.request<UserRoleAssignmentResponse>('/assign', {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: number, roleId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/unassign`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role_id: roleId }),
    });
  }

  /**
   * Get user's effective permissions
   */
  async getUserPermissions(userId: number): Promise<UserPermissions> {
    return this.request<UserPermissions>(`/users/${userId}/permissions`);
  }

  /**
   * Get current user's permissions
   */
  async getCurrentUserPermissions(): Promise<UserPermissions> {
    return this.request<UserPermissions>('/users/me/permissions');
  }

  /**
   * Check if user has specific permission
   */
  async checkUserPermission(
    userId: number,
    permission: PermissionType,
    teamId?: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    const queryParams = new URLSearchParams({
      permission,
      ...(teamId && { team_id: teamId.toString() }),
    });

    return this.request<{ allowed: boolean; reason?: string }>(
      `/users/${userId}/check-permission?${queryParams}`
    );
  }

  /**
   * Get role analytics
   */
  async getRoleAnalytics(): Promise<RoleAnalytics> {
    return this.request<RoleAnalytics>('/analytics');
  }

  /**
   * Get permission matrix for all roles
   */
  async getPermissionMatrix(): Promise<PermissionMatrix> {
    return this.request<PermissionMatrix>('/matrix');
  }

  /**
   * Compare two roles
   */
  async compareRoles(role1Id: number, role2Id: number): Promise<RoleComparison> {
    return this.request<RoleComparison>(`/compare/${role1Id}/${role2Id}`);
  }

  /**
   * Bulk role operations
   */
  async bulkRoleOperation(operation: BulkRoleOperation): Promise<BulkRoleOperationResponse> {
    return this.request<BulkRoleOperationResponse>('/bulk', {
      method: 'POST',
      body: JSON.stringify(operation),
    });
  }

  /**
   * Get role suggestions for users
   */
  async getRoleSuggestions(): Promise<RoleSuggestion[]> {
    return this.request<RoleSuggestion[]>('/suggestions');
  }

  /**
   * Get RBAC health check
   */
  async getRBACHealth(): Promise<RBACHealth> {
    return this.request<RBACHealth>('/health');
  }

  /**
   * Get users with specific role
   */
  async getUsersWithRole(roleId: number): Promise<{
    users: {
      id: number;
      github_username: string;
      email: string;
      full_name: string | null;
      avatar_url: string | null;
      assigned_at: string;
      assigned_by_user_id: number | null;
    }[];
    total: number;
  }> {
    return this.request<{
      users: {
        id: number;
        github_username: string;
        email: string;
        full_name: string | null;
        avatar_url: string | null;
        assigned_at: string;
        assigned_by_user_id: number | null;
      }[];
      total: number;
    }>(`/${roleId}/users`);
  }

  /**
   * Clone a role
   */
  async cloneRole(roleId: number, newName: string): Promise<Role> {
    return this.request<Role>(`/${roleId}/clone`, {
      method: 'POST',
      body: JSON.stringify({ name: newName }),
    });
  }

  /**
   * Get role hierarchy
   */
  async getRoleHierarchy(): Promise<{
    roles: Role[];
    hierarchy: {
      [roleId: number]: {
        parent_roles: number[];
        child_roles: number[];
        level: number;
      };
    };
  }> {
    return this.request<{
      roles: Role[];
      hierarchy: {
        [roleId: number]: {
          parent_roles: number[];
          child_roles: number[];
          level: number;
        };
      };
    }>('/hierarchy');
  }

  /**
   * Export roles configuration
   */
  async exportRoles(): Promise<{
    roles: Role[];
    permissions: Permission[];
    assignments: {
      user_id: number;
      role_ids: number[];
    }[];
    export_date: string;
  }> {
    return this.request<{
      roles: Role[];
      permissions: Permission[];
      assignments: {
        user_id: number;
        role_ids: number[];
      }[];
      export_date: string;
    }>('/export');
  }

  /**
   * Import roles configuration
   */
  async importRoles(configData: {
    roles: Partial<Role>[];
    overwrite_existing: boolean;
  }): Promise<{
    imported_roles: number;
    skipped_roles: number;
    errors: string[];
  }> {
    return this.request<{
      imported_roles: number;
      skipped_roles: number;
      errors: string[];
    }>('/import', {
      method: 'POST',
      body: JSON.stringify(configData),
    });
  }

  /**
   * Validate role configuration
   */
  async validateRoleConfig(): Promise<{
    valid: boolean;
    issues: {
      type: 'warning' | 'error';
      message: string;
      affected_roles: number[];
    }[];
    recommendations: string[];
  }> {
    return this.request<{
      valid: boolean;
      issues: {
        type: 'warning' | 'error';
        message: string;
        affected_roles: number[];
      }[];
      recommendations: string[];
    }>('/validate');
  }
}

// Export singleton instance
export const roleApi = new RoleApiService();
export default roleApi; 