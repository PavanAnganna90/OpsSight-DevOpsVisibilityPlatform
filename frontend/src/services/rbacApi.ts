/**
 * RBAC Management API Service
 * 
 * Extended service for comprehensive RBAC management including users, 
 * permission matrices, role templates, and access control analytics.
 */

import { roleApi } from './roleApi';
import { Role, Permission, UserPermissions } from '../types/role';

interface User {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  direct_permissions: Permission[];
  effective_permissions: Permission[];
  last_login: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
}

interface RoleTemplate {
  id: string;
  name: string;
  display_name: string;
  description: string;
  permissions: string[];
  category: 'development' | 'operations' | 'security' | 'management' | 'viewer';
}

interface AccessMatrix {
  user_id: string;
  user_name: string;
  roles: string[];
  permissions: Record<string, boolean>;
  last_reviewed: string;
  risk_level: 'low' | 'medium' | 'high';
}

interface RBACStatistics {
  total_roles: number;
  system_roles: number;
  custom_roles: number;
  total_permissions: number;
  total_users: number;
  active_users: number;
  permission_categories: Array<{
    name: string;
    count: number;
    most_assigned: string[];
  }>;
  role_usage: Array<{
    role_name: string;
    user_count: number;
    permission_count: number;
  }>;
  security_metrics: {
    users_with_admin_access: number;
    users_with_excessive_permissions: number;
    roles_not_used: number;
    recent_permission_changes: number;
  };
}

interface UserRoleAssignment {
  user_id: string;
  role_ids: string[];
  assigned_by: string;
  organization_id?: string;
}

class RBACApiService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? '/api/v1/rbac-management' 
      : 'http://localhost:8000/api/v1/rbac-management';
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
      console.error(`RBAC API request failed: ${url}`, error);
      throw error;
    }
  }

  /**
   * Get comprehensive RBAC statistics
   */
  async getStatistics(): Promise<RBACStatistics> {
    return this.request<RBACStatistics>('/statistics');
  }

  /**
   * Get all users with their role and permission information
   */
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/users');
  }

  /**
   * Get a specific user with full RBAC details
   */
  async getUser(userId: string): Promise<User> {
    return this.request<User>(`/users/${userId}`);
  }

  /**
   * Update user roles
   */
  async updateUserRoles(userId: string, roleIds: string[]): Promise<User> {
    return this.request<User>(`/users/${userId}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ role_ids: roleIds }),
    });
  }

  /**
   * Get role templates for quick role creation
   */
  async getRoleTemplates(): Promise<RoleTemplate[]> {
    return this.request<RoleTemplate[]>('/role-templates');
  }

  /**
   * Create role from template
   */
  async createRoleFromTemplate(templateId: string, customizations: {
    name: string;
    display_name: string;
    description?: string;
    additional_permissions?: string[];
  }): Promise<Role> {
    return this.request<Role>('/role-templates/create', {
      method: 'POST',
      body: JSON.stringify({
        template_id: templateId,
        ...customizations,
      }),
    });
  }

  /**
   * Get access matrix for all users
   */
  async getAccessMatrix(): Promise<AccessMatrix[]> {
    return this.request<AccessMatrix[]>('/access-matrix');
  }

  /**
   * Get permission matrix showing which roles have which permissions
   */
  async getPermissionMatrix(): Promise<{
    roles: Role[];
    permissions: Permission[];
    matrix: Record<string, Record<string, boolean>>;
  }> {
    return this.request<{
      roles: Role[];
      permissions: Permission[];
      matrix: Record<string, Record<string, boolean>>;
    }>('/permission-matrix');
  }

  /**
   * Audit user permissions and flag potential security issues
   */
  async auditUserPermissions(userId?: string): Promise<{
    user_id?: string;
    audit_results: Array<{
      type: 'warning' | 'error' | 'info';
      message: string;
      affected_permissions: string[];
      recommendation: string;
      risk_level: 'low' | 'medium' | 'high';
    }>;
    summary: {
      total_permissions: number;
      direct_permissions: number;
      inherited_permissions: number;
      excessive_permissions: number;
      recommended_actions: string[];
    };
  }> {
    const endpoint = userId ? `/audit/user/${userId}` : '/audit/permissions';
    return this.request<{
      user_id?: string;
      audit_results: Array<{
        type: 'warning' | 'error' | 'info';
        message: string;
        affected_permissions: string[];
        recommendation: string;
        risk_level: 'low' | 'medium' | 'high';
      }>;
      summary: {
        total_permissions: number;
        direct_permissions: number;
        inherited_permissions: number;
        excessive_permissions: number;
        recommended_actions: string[];
      };
    }>(endpoint);
  }

  /**
   * Bulk assign/remove roles for multiple users
   */
  async bulkUpdateUserRoles(assignments: UserRoleAssignment[]): Promise<{
    successful: number;
    failed: number;
    errors: Array<{
      user_id: string;
      error: string;
    }>;
  }> {
    return this.request<{
      successful: number;
      failed: number;
      errors: Array<{
        user_id: string;
        error: string;
      }>;
    }>('/users/bulk-update-roles', {
      method: 'POST',
      body: JSON.stringify({ assignments }),
    });
  }

  /**
   * Search users by role or permission
   */
  async searchUsers(query: {
    role_name?: string;
    permission_name?: string;
    status?: 'active' | 'inactive' | 'suspended';
    organization_id?: string;
  }): Promise<User[]> {
    const queryParams = new URLSearchParams();
    
    Object.entries(query).forEach(([key, value]) => {
      if (value) {
        queryParams.append(key, value);
      }
    });

    return this.request<User[]>(`/users/search?${queryParams}`);
  }

  /**
   * Get role hierarchy visualization data
   */
  async getRoleHierarchy(): Promise<{
    nodes: Array<{
      id: string;
      name: string;
      display_name: string;
      level: number;
      user_count: number;
      permission_count: number;
    }>;
    edges: Array<{
      from: string;
      to: string;
      type: 'inherits' | 'extends';
    }>;
  }> {
    return this.request<{
      nodes: Array<{
        id: string;
        name: string;
        display_name: string;
        level: number;
        user_count: number;
        permission_count: number;
      }>;
      edges: Array<{
        from: string;
        to: string;
        type: 'inherits' | 'extends';
      }>;
    }>('/hierarchy/visualization');
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(format: 'json' | 'csv' | 'pdf' = 'json'): Promise<{
    report_id: string;
    generated_at: string;
    compliance_status: 'compliant' | 'non_compliant' | 'needs_review';
    findings: Array<{
      category: string;
      status: 'pass' | 'fail' | 'warning';
      description: string;
      details: string;
    }>;
    recommendations: string[];
    download_url?: string;
  }> {
    return this.request<{
      report_id: string;
      generated_at: string;
      compliance_status: 'compliant' | 'non_compliant' | 'needs_review';
      findings: Array<{
        category: string;
        status: 'pass' | 'fail' | 'warning';
        description: string;
        details: string;
      }>;
      recommendations: string[];
      download_url?: string;
    }>(`/compliance/report?format=${format}`);
  }

  // Delegate basic role operations to roleApi
  getRoles = (includePermissions: boolean = false) => roleApi.getRoles(includePermissions);
  getRole = (roleId: number) => roleApi.getRole(roleId);
  createRole = (roleData: any) => roleApi.createRole(roleData);
  updateRole = (roleId: number, roleData: any) => roleApi.updateRole(roleId, roleData);
  deleteRole = (roleId: number) => roleApi.deleteRole(roleId);
  getPermissions = () => roleApi.getPermissions();
  getPermissionCategories = () => roleApi.getPermissionCategories();
  updateRolePermissions = (roleId: number, permissionIds: number[]) => 
    roleApi.updateRolePermissions(roleId, permissionIds);
}

// Export singleton instance
export const rbacApi = new RBACApiService();
export default rbacApi;