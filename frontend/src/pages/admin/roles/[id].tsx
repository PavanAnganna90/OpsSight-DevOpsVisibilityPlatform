/**
 * Individual Role Management Page
 * 
 * Detailed view and management of a specific role
 */

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  UserGroupIcon,
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
  ShieldCheckIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/layout/DashboardCard';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { Toast } from '@/components/ui/Toast';
import { PermissionTree } from './components/PermissionTree';
import { RoleUserAssignments } from './components/RoleUserAssignments';

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  priority: number;
  is_system_role: boolean;
  organization_id?: string;
  permissions: Permission[];
  user_count: number;
  created_at: string;
  updated_at: string;
}

interface Permission {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  is_system_permission: boolean;
  organization_id?: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  roles: Role[];
  last_login?: string;
  created_at: string;
}

export default function RoleDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'permissions' | 'users'>('permissions');
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
    show: boolean;
  }>({ message: '', type: 'success', show: false });

  // Fetch role details
  const { data: role, isLoading: roleLoading, error: roleError } = useQuery({
    queryKey: ['role', params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/roles/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch role');
      return response.json();
    },
  });

  // Fetch all permissions
  const { data: allPermissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = await fetch('/api/v1/permissions/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch permissions');
      return response.json();
    },
  });

  // Fetch permission categories
  const { data: permissionCategories } = useQuery({
    queryKey: ['permission-categories'],
    queryFn: async () => {
      const response = await fetch('/api/v1/permissions/categories/all', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch permission categories');
      return response.json();
    },
  });

  // Fetch users assigned to this role
  const { data: assignedUsers } = useQuery({
    queryKey: ['role-users', params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/roles/${params.id}/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch role users');
      return response.json();
    },
  });

  // Fetch all users for assignment
  const { data: allUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/v1/users/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  // Update role permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async (permissionIds: string[]) => {
      const response = await fetch(`/api/v1/permissions/roles/${params.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ permission_ids: permissionIds }),
      });
      if (!response.ok) throw new Error('Failed to update permissions');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role', params.id] });
      showToast('Permissions updated successfully', 'success');
    },
    onError: (error) => {
      showToast(`Failed to update permissions: ${error.message}`, 'error');
    },
  });

  // Assign user mutation
  const assignUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/v1/roles/${params.id}/users/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to assign user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-users', params.id] });
      showToast('User assigned successfully', 'success');
    },
    onError: (error) => {
      showToast(`Failed to assign user: ${error.message}`, 'error');
    },
  });

  // Unassign user mutation
  const unassignUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/v1/roles/${params.id}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to unassign user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-users', params.id] });
      showToast('User unassigned successfully', 'success');
    },
    onError: (error) => {
      showToast(`Failed to unassign user: ${error.message}`, 'error');
    },
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type, show: true });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 5000);
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    if (!role) return;

    const currentPermissionIds = role.permissions.map(p => p.id);
    const newPermissionIds = checked
      ? [...currentPermissionIds, permissionId]
      : currentPermissionIds.filter(id => id !== permissionId);

    updatePermissionsMutation.mutate(newPermissionIds);
  };

  const handleBulkUserAssign = (userIds: string[]) => {
    userIds.forEach(userId => {
      assignUserMutation.mutate(userId);
    });
  };

  const handleBulkUserUnassign = (userIds: string[]) => {
    userIds.forEach(userId => {
      unassignUserMutation.mutate(userId);
    });
  };

  const getRolePriorityColor = (priority: number) => {
    if (priority >= 90) return 'text-red-500';
    if (priority >= 70) return 'text-orange-500';
    if (priority >= 50) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="h-96 bg-gray-800 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (roleError || !role) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Role Not Found</h1>
            <p className="text-gray-400">The requested role could not be found.</p>
            <Button
              onClick={() => router.push('/admin/roles')}
              variant="primary"
              className="mt-4"
            >
              Back to Roles
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => router.push('/admin/roles')}
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
            >
              Back to Roles
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center">
                <UserGroupIcon className="h-8 w-8 mr-3 text-blue-500" />
                {role.display_name}
              </h1>
              <p className="text-gray-400 mt-2">{role.description}</p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              onClick={() => router.push('/admin/roles/matrix')}
              variant="secondary"
              leftIcon={<TableCellsIcon className="h-4 w-4" />}
            >
              View Matrix
            </Button>
            <Button
              onClick={() => router.push(`/admin/roles/${role.id}/edit`)}
              variant="secondary"
              leftIcon={<PencilIcon className="h-4 w-4" />}
              disabled={role.is_system_role}
            >
              Edit Role
            </Button>
          </div>
        </div>

        {/* Role Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <DashboardCard>
            <div className="flex items-center">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <UserGroupIcon className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Role Type</p>
                <StatusIndicator
                  status={role.is_system_role ? "warning" : "info"}
                  label={role.is_system_role ? "System Role" : "Custom Role"}
                />
              </div>
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="flex items-center">
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <ShieldCheckIcon className="h-6 w-6 text-orange-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Priority</p>
                <p className={`text-2xl font-bold ${getRolePriorityColor(role.priority)}`}>
                  {role.priority}
                </p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="flex items-center">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <ShieldCheckIcon className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Permissions</p>
                <p className="text-2xl font-bold text-white">{role.permissions.length}</p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="flex items-center">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <UsersIcon className="h-6 w-6 text-purple-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Users</p>
                <p className="text-2xl font-bold text-white">{role.user_count}</p>
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('permissions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'permissions'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Permissions ({role.permissions.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Users ({role.user_count})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <DashboardCard>
          <div className="p-6">
            {activeTab === 'permissions' && (
              <PermissionTree
                categories={permissionCategories || {}}
                selectedPermissions={role.permissions.map(p => p.id)}
                onPermissionChange={handlePermissionChange}
                searchable={true}
                showDescription={true}
              />
            )}

            {activeTab === 'users' && (
              <RoleUserAssignments
                role={role}
                users={assignedUsers || []}
                availableUsers={allUsers || []}
                onAssignUser={(userId) => assignUserMutation.mutate(userId)}
                onUnassignUser={(userId) => unassignUserMutation.mutate(userId)}
                onBulkAssign={handleBulkUserAssign}
                onBulkUnassign={handleBulkUserUnassign}
                isLoading={assignUserMutation.isPending || unassignUserMutation.isPending}
              />
            )}
          </div>
        </DashboardCard>

        {/* Toast */}
        {toast.show && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(prev => ({ ...prev, show: false }))}
          />
        )}
      </div>
    </div>
  );
}