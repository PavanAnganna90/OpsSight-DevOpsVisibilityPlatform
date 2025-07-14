/**
 * Role Management Admin Page
 * 
 * Comprehensive interface for managing roles, permissions, and user assignments.
 * Provides full RBAC administration capabilities for system administrators.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  UsersIcon,
  EyeIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/layout/DashboardCard';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { TextField } from '@/components/ui/TextField';
import { Select } from '@/components/ui/Select';
import { withAdminAccess } from '@/components/rbac/withPermissions';
import { useAdminPermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import { Checkbox } from '@/components/ui/Checkbox';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';

// Types
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

interface PermissionCategory {
  name: string;
  permissions: Permission[];
}

interface RoleFormData {
  name: string;
  display_name: string;
  description: string;
  priority: number;
  organization_id?: string;
  permission_ids: string[];
}

function RoleManagementPage() {
  const queryClient = useQueryClient();
  const adminPerms = useAdminPermissions();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  // Check if user can manage roles
  if (!adminPerms.canManageRoles) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to manage roles.</p>
        </div>
      </div>
    );
  }
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
    show: boolean;
  }>({ message: '', type: 'success', show: false });

  // Fetch roles
  const { data: roles, isLoading: rolesLoading, error: rolesError } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await fetch('/api/v1/roles/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch roles');
      return response.json();
    },
  });

  // Fetch permissions
  const { data: permissions, isLoading: permissionsLoading } = useQuery({
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

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: RoleFormData) => {
      const response = await fetch('/api/v1/roles/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(roleData),
      });
      if (!response.ok) throw new Error('Failed to create role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowCreateModal(false);
      showToast('Role created successfully', 'success');
    },
    onError: (error) => {
      showToast(`Failed to create role: ${error.message}`, 'error');
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RoleFormData> }) => {
      const response = await fetch(`/api/v1/roles/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowEditModal(false);
      showToast('Role updated successfully', 'success');
    },
    onError: (error) => {
      showToast(`Failed to update role: ${error.message}`, 'error');
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/roles/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to delete role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowDeleteModal(false);
      setSelectedRole(null);
      showToast('Role deleted successfully', 'success');
    },
    onError: (error) => {
      showToast(`Failed to delete role: ${error.message}`, 'error');
    },
  });

  // Assign permissions mutation
  const assignPermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) => {
      const response = await fetch(`/api/v1/permissions/roles/${roleId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ permission_ids: permissionIds }),
      });
      if (!response.ok) throw new Error('Failed to assign permissions');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowPermissionsModal(false);
      showToast('Permissions updated successfully', 'success');
    },
    onError: (error) => {
      showToast(`Failed to update permissions: ${error.message}`, 'error');
    },
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type, show: true });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 5000);
  };

  const getRolePriorityColor = (priority: number) => {
    if (priority >= 90) return 'text-red-500';
    if (priority >= 70) return 'text-orange-500';
    if (priority >= 50) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getRoleStatusColor = (isSystemRole: boolean) => {
    return isSystemRole ? 'text-blue-500' : 'text-gray-500';
  };

  if (rolesLoading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-gray-800 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (rolesError) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Error Loading Roles</h1>
            <p className="text-gray-400">Failed to load role data. Please try again.</p>
            <Button
              onClick={() => window.location.reload()}
              variant="primary"
              className="mt-4"
            >
              Reload Page
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center">
              <UserGroupIcon className="h-8 w-8 mr-3 text-blue-500" />
              Role Management
            </h1>
            <p className="text-gray-400 mt-2">
              Manage roles, permissions, and access control for your organization
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="primary"
            leftIcon={<PlusIcon className="h-5 w-5" />}
          >
            Create Role
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <DashboardCard>
            <div className="flex items-center">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <UserGroupIcon className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Total Roles</p>
                <p className="text-2xl font-bold text-white">{roles?.length || 0}</p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="flex items-center">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <ShieldCheckIcon className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">System Roles</p>
                <p className="text-2xl font-bold text-white">
                  {roles?.filter((r: Role) => r.is_system_role).length || 0}
                </p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="flex items-center">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Cog6ToothIcon className="h-6 w-6 text-purple-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Custom Roles</p>
                <p className="text-2xl font-bold text-white">
                  {roles?.filter((r: Role) => !r.is_system_role).length || 0}
                </p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="flex items-center">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <UsersIcon className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-white">
                  {roles?.reduce((sum: number, r: Role) => sum + r.user_count, 0) || 0}
                </p>
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* Roles Table */}
        <DashboardCard>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Roles</h2>
              <div className="flex space-x-2">
                <StatusIndicator status="success" label="Active" />
                <StatusIndicator status="warning" label="System" />
                <StatusIndicator status="info" label="Custom" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Role</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Priority</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Users</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Permissions</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles?.map((role: Role) => (
                    <tr key={role.id} className="border-b border-gray-700/50 hover:bg-gray-800/50">
                      <td className="py-4 px-4">
                        <div>
                          <div className="text-white font-medium">{role.display_name}</div>
                          <div className="text-gray-400 text-sm">{role.name}</div>
                          <div className="text-gray-500 text-xs mt-1">{role.description}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <StatusIndicator
                          status={role.is_system_role ? "warning" : "info"}
                          label={role.is_system_role ? "System" : "Custom"}
                        />
                      </td>
                      <td className="py-4 px-4">
                        <span className={`font-medium ${getRolePriorityColor(role.priority)}`}>
                          {role.priority}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <UsersIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-white">{role.user_count}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <ShieldCheckIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-white">{role.permissions.length}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => {
                              setSelectedRole(role);
                              setShowPermissionsModal(true);
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedRole(role);
                              setShowEditModal(true);
                            }}
                            variant="ghost"
                            size="sm"
                            disabled={role.is_system_role}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedRole(role);
                              setShowDeleteModal(true);
                            }}
                            variant="ghost"
                            size="sm"
                            disabled={role.is_system_role || role.user_count > 0}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DashboardCard>

        {/* Modals */}
        <CreateRoleModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createRoleMutation.mutate(data)}
          isLoading={createRoleMutation.isPending}
          permissions={permissions || []}
        />

        <EditRoleModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={(data) => selectedRole && updateRoleMutation.mutate({ id: selectedRole.id, data })}
          isLoading={updateRoleMutation.isPending}
          role={selectedRole}
          permissions={permissions || []}
        />

        <DeleteRoleModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={() => selectedRole && deleteRoleMutation.mutate(selectedRole.id)}
          isLoading={deleteRoleMutation.isPending}
          role={selectedRole}
        />

        <PermissionsModal
          isOpen={showPermissionsModal}
          onClose={() => setShowPermissionsModal(false)}
          onSubmit={(permissionIds) => 
            selectedRole && assignPermissionsMutation.mutate({ 
              roleId: selectedRole.id, 
              permissionIds 
            })
          }
          isLoading={assignPermissionsMutation.isPending}
          role={selectedRole}
          permissions={permissions || []}
          categories={permissionCategories || {}}
        />

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

// Modal Components
function CreateRoleModal({ isOpen, onClose, onSubmit, isLoading, permissions }: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RoleFormData) => void;
  isLoading: boolean;
  permissions: Permission[];
}) {
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    display_name: '',
    description: '',
    priority: 50,
    permission_ids: [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permission_ids: checked
        ? [...prev.permission_ids, permissionId]
        : prev.permission_ids.filter(id => id !== permissionId)
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Role">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Role Name"
            value={formData.name}
            onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
            placeholder="admin, manager, viewer"
            required
          />
          <TextField
            label="Display Name"
            value={formData.display_name}
            onChange={(value) => setFormData(prev => ({ ...prev, display_name: value }))}
            placeholder="Administrator, Manager, Viewer"
            required
          />
        </div>

        <TextField
          label="Description"
          value={formData.description}
          onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
          placeholder="Describe the role's purpose and responsibilities"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Priority Level
          </label>
          <input
            type="range"
            min="1"
            max="100"
            value={formData.priority}
            onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Low (1)</span>
            <span>Current: {formData.priority}</span>
            <span>High (100)</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-4">
            Permissions
          </label>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {permissions.map((permission) => (
              <Checkbox
                key={permission.id}
                label={permission.display_name}
                checked={formData.permission_ids.includes(permission.id)}
                onChange={(checked) => handlePermissionChange(permission.id, checked)}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
          >
            Create Role
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditRoleModal({ isOpen, onClose, onSubmit, isLoading, role, permissions }: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<RoleFormData>) => void;
  isLoading: boolean;
  role: Role | null;
  permissions: Permission[];
}) {
  const [formData, setFormData] = useState<Partial<RoleFormData>>({});

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        display_name: role.display_name,
        description: role.description,
        priority: role.priority,
        permission_ids: role.permissions.map(p => p.id),
      });
    }
  }, [role]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permission_ids: checked
        ? [...(prev.permission_ids || []), permissionId]
        : (prev.permission_ids || []).filter(id => id !== permissionId)
    }));
  };

  if (!role) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Role">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Role Name"
            value={formData.name || ''}
            onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
            placeholder="admin, manager, viewer"
            required
          />
          <TextField
            label="Display Name"
            value={formData.display_name || ''}
            onChange={(value) => setFormData(prev => ({ ...prev, display_name: value }))}
            placeholder="Administrator, Manager, Viewer"
            required
          />
        </div>

        <TextField
          label="Description"
          value={formData.description || ''}
          onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
          placeholder="Describe the role's purpose and responsibilities"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Priority Level
          </label>
          <input
            type="range"
            min="1"
            max="100"
            value={formData.priority || 50}
            onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Low (1)</span>
            <span>Current: {formData.priority}</span>
            <span>High (100)</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-4">
            Permissions
          </label>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {permissions.map((permission) => (
              <Checkbox
                key={permission.id}
                label={permission.display_name}
                checked={(formData.permission_ids || []).includes(permission.id)}
                onChange={(checked) => handlePermissionChange(permission.id, checked)}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
          >
            Update Role
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteRoleModal({ isOpen, onClose, onConfirm, isLoading, role }: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  role: Role | null;
}) {
  if (!role) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Role">
      <div className="space-y-4">
        <div className="flex items-center p-4 bg-red-500/10 rounded-lg">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-3" />
          <div>
            <h3 className="text-red-500 font-medium">Confirm Deletion</h3>
            <p className="text-red-400 text-sm">This action cannot be undone.</p>
          </div>
        </div>

        <div className="text-gray-300">
          <p>Are you sure you want to delete the role:</p>
          <p className="font-medium text-white mt-2">{role.display_name}</p>
          <p className="text-gray-400 text-sm mt-1">{role.description}</p>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            Delete Role
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function PermissionsModal({ isOpen, onClose, onSubmit, isLoading, role, permissions, categories }: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (permissionIds: string[]) => void;
  isLoading: boolean;
  role: Role | null;
  permissions: Permission[];
  categories: Record<string, Permission[]>;
}) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (role) {
      setSelectedPermissions(role.permissions.map(p => p.id));
    }
  }, [role]);

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setSelectedPermissions(prev =>
      checked
        ? [...prev, permissionId]
        : prev.filter(id => id !== permissionId)
    );
  };

  const handleSubmit = () => {
    onSubmit(selectedPermissions);
  };

  if (!role) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Permissions for ${role.display_name}`}>
      <div className="space-y-6">
        <div className="text-gray-300">
          <p>Select permissions for the <strong>{role.display_name}</strong> role:</p>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-4">
          {Object.entries(categories).map(([categoryName, categoryPermissions]) => (
            <div key={categoryName} className="border border-gray-700 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3 capitalize">{categoryName}</h4>
              <div className="space-y-2">
                {categoryPermissions.map((permission) => (
                  <Checkbox
                    key={permission.id}
                    label={
                      <div>
                        <span className="text-white">{permission.display_name}</span>
                        <span className="text-gray-400 text-sm block">{permission.description}</span>
                      </div>
                    }
                    checked={selectedPermissions.includes(permission.id)}
                    onChange={(checked) => handlePermissionChange(permission.id, checked)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            Update Permissions
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Export with admin access protection
export default withAdminAccess(RoleManagementPage);