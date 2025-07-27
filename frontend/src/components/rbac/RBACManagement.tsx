/**
 * RBAC Management Component
 * 
 * Comprehensive Role-Based Access Control management interface.
 * Handles roles, permissions, and user assignments with advanced features.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { usePerformanceMonitoring } from '@/hooks/useMonitoring';
import { PermissionGuard } from './PermissionGuard';
import { RoleBadge } from './RoleBadge';
import { rbacApi } from '@/services/rbacApi';

interface Permission {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  resource_type?: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  permissions: Permission[];
  is_system: boolean;
  is_default: boolean;
  user_count: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

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

const RBACManagement: React.FC = () => {
  const { trackUserInteraction } = usePerformanceMonitoring('RBACManagement');
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([]);
  const [accessMatrix, setAccessMatrix] = useState<AccessMatrix[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [statistics, setStatistics] = useState<any>(null);

  // Load RBAC data
  useEffect(() => {
    const loadRBACData = async () => {
      setIsLoading(true);
      
      try {
        // Load real data from APIs
        const [permissionsData, rolesData, usersData, statisticsData, templatesData] = await Promise.all([
          rbacApi.getPermissions(),
          rbacApi.getRoles(true),
          rbacApi.getUsers(),
          rbacApi.getStatistics(),
          rbacApi.getRoleTemplates()
        ]);

        setPermissions(permissionsData);
        setRoles(rolesData);
        setUsers(usersData);
        setStatistics(statisticsData);
        setRoleTemplates(templatesData);

        // Load access matrix
        const accessMatrixData = await rbacApi.getAccessMatrix();
        setAccessMatrix(accessMatrixData);
        
        trackUserInteraction('rbac_data_loaded', {
          permissions_count: permissionsData.length,
          roles_count: rolesData.length,
          users_count: usersData.length
        });
        
      } catch (error) {
        console.error('Failed to load RBAC data:', error);
        showToast('Failed to load RBAC data. Please try again.', 'error');
        setError('Failed to load RBAC data');
      } finally {
        setIsLoading(false);
      }
    };

    loadRBACData();
  }, [trackUserInteraction, showToast]);

  // Handle role assignment
  const handleAssignRole = async (userId: string, roleId: string) => {
    try {
      // Get current user's roles
      const currentUser = users.find(u => u.id === userId);
      if (!currentUser) return;
      
      const newRoleIds = [...currentUser.roles.map(r => r.id), roleId];
      
      // Update user roles via API
      const updatedUser = await rbacApi.updateUserRoles(userId, newRoleIds);
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? updatedUser : user
      ));
      
      showToast('Role assigned successfully', 'success');
      trackUserInteraction('assign_role', { userId, roleId });
      
    } catch (error) {
      console.error('Failed to assign role:', error);
      showToast('Failed to assign role', 'error');
    }
  };

  // Handle permission grant - Note: This would typically require a backend endpoint for direct user permissions
  const handleGrantPermission = async (userId: string, permissionId: string) => {
    try {
      // This is a simplified implementation - in practice, you'd need a dedicated API endpoint for direct user permissions
      showToast('Direct permission assignment not yet implemented', 'info');
      trackUserInteraction('grant_permission_attempted', { userId, permissionId });
      
    } catch (error) {
      console.error('Failed to grant permission:', error);
      showToast('Failed to grant permission', 'error');
    }
  };

  // Handle role creation
  const handleCreateRole = async (roleData: {
    name: string;
    display_name: string;
    description: string;
    permission_ids: number[];
  }) => {
    try {
      const newRole = await rbacApi.createRole(roleData);
      setRoles(prev => [...prev, newRole]);
      showToast('Role created successfully', 'success');
      trackUserInteraction('create_role', { roleName: roleData.name });
      setShowRoleModal(false);
    } catch (error) {
      console.error('Failed to create role:', error);
      showToast('Failed to create role', 'error');
    }
  };

  // Handle role update
  const handleUpdateRole = async (roleId: number, updates: {
    display_name?: string;
    description?: string;
    permission_ids?: number[];
  }) => {
    try {
      const updatedRole = await rbacApi.updateRole(roleId, updates);
      setRoles(prev => prev.map(role => role.id === roleId.toString() ? updatedRole : role));
      showToast('Role updated successfully', 'success');
      trackUserInteraction('update_role', { roleId });
    } catch (error) {
      console.error('Failed to update role:', error);
      showToast('Failed to update role', 'error');
    }
  };

  // Handle role deletion
  const handleDeleteRole = async (roleId: number) => {
    try {
      await rbacApi.deleteRole(roleId);
      setRoles(prev => prev.filter(role => role.id !== roleId.toString()));
      showToast('Role deleted successfully', 'success');
      trackUserInteraction('delete_role', { roleId });
    } catch (error) {
      console.error('Failed to delete role:', error);
      showToast('Failed to delete role', 'error');
    }
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'team': return 'bg-blue-100 text-blue-800';
      case 'project': return 'bg-green-100 text-green-800';
      case 'deployment': return 'bg-red-100 text-red-800';
      case 'user': return 'bg-purple-100 text-purple-800';
      case 'rbac': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get risk level color
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Failed to Load RBAC Data</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            RBAC Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage roles, permissions, and access control
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <PermissionGuard permission="role:manage">
            <Button
              onClick={() => setShowRoleModal(true)}
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Role
            </Button>
          </PermissionGuard>
          
          <PermissionGuard permission="role:manage">
            <Button
              onClick={() => setShowPermissionModal(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Manage Permissions
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Roles</p>
                <p className="text-2xl font-bold text-blue-600">{roles.length}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Permissions</p>
                <p className="text-2xl font-bold text-green-600">{permissions.length}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 12H9v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.586l4.707-4.707C10.923 3.663 11.536 4 12 4s1.077-.337 1.707.293z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
                <p className="text-2xl font-bold text-purple-600">{users.filter(u => u.status === 'active').length}</p>
              </div>
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Role Templates</p>
                <p className="text-2xl font-bold text-orange-600">{roleTemplates.length}</p>
              </div>
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="h-4 w-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="matrix">Access Matrix</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Role Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Role Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roleTemplates.map((template) => (
                  <div key={template.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {template.display_name}
                      </h3>
                      <Badge className={getCategoryColor(template.category)}>
                        {template.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {template.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.permissions.slice(0, 3).map((permission) => (
                        <Badge key={permission} variant="secondary" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                      {template.permissions.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.permissions.length - 3} more
                        </Badge>
                      )}
                    </div>
                    <Button size="sm" variant="outline" className="w-full">
                      Use Template
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent RBAC Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-shrink-0">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Role 'Developer' assigned to Alice Johnson
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      2 hours ago • System Administrator
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Permission 'deploy:staging' added to Team Lead role
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      5 hours ago • System Administrator
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {role.display_name}
                        </h3>
                        <RoleBadge role={role.name} />
                        {role.is_system && (
                          <Badge variant="outline" className="text-xs">System</Badge>
                        )}
                        {role.is_default && (
                          <Badge variant="outline" className="text-xs">Default</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {role.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{role.permissions.length} permissions</span>
                        <span>{role.user_count} users</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRole(role);
                          setShowRoleModal(true);
                        }}
                      >
                        Edit
                      </Button>
                      {!role.is_system && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Handle role deletion
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(
                  permissions.reduce((acc, permission) => {
                    if (!acc[permission.category]) {
                      acc[permission.category] = [];
                    }
                    acc[permission.category].push(permission);
                    return acc;
                  }, {} as Record<string, Permission[]>)
                ).map(([category, categoryPermissions]) => (
                  <div key={category} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3 capitalize">
                      {category} Permissions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categoryPermissions.map((permission) => (
                        <div key={permission.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                              {permission.display_name}
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {permission.description}
                            </p>
                          </div>
                          <Badge className={`text-xs ${getCategoryColor(permission.category)}`}>
                            {permission.name}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Access Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <RoleBadge key={role.id} role={role.name} />
                        ))}
                      </div>
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                        {user.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserModal(true);
                        }}
                      >
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Matrix Tab */}
        <TabsContent value="matrix" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Access Control Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accessMatrix.map((matrix) => (
                  <div key={matrix.user_id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {matrix.user_name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Last reviewed: {new Date(matrix.last_reviewed).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={getRiskLevelColor(matrix.risk_level)}>
                        {matrix.risk_level} risk
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Roles</h4>
                        <div className="flex flex-wrap gap-1">
                          {matrix.roles.map((role) => (
                            <RoleBadge key={role} role={role} />
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Permissions</h4>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(matrix.permissions).slice(0, 5).map(([permission, granted]) => (
                            <Badge key={permission} variant={granted ? 'default' : 'secondary'} className="text-xs">
                              {permission}
                            </Badge>
                          ))}
                          {Object.keys(matrix.permissions).length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{Object.keys(matrix.permissions).length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export { RBACManagement };
export default RBACManagement;