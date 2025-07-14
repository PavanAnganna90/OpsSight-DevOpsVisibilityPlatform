import { ExclamationTriangleIcon, PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { roleApi } from '../../../services/roleApi';
import { Role } from '../../../types/role';
import { PermissionGuard } from '../../rbac/PermissionGuard';
import { Button } from '../../ui/Button';
import { ConfirmationModal } from '../../ui/Modal';
import { StatusIndicator } from '../../ui/StatusIndicator';
import { Toast } from '../../ui/Toast';
import RoleEditorModal from './RoleEditorModal';
import RoleTable from './RoleTable';

/**
 * Main page for managing roles and permissions.
 * Enhanced with comprehensive error handling, loading states, and user feedback.
 */
const RoleManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    show: boolean;
  }>({ message: '', type: 'success', show: false });

  // Fetch roles
  const {
    data: roles,
    isLoading: rolesLoading,
    error: rolesError,
    refetch: refetchRoles,
  } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleApi.getRoles(true), // Include permissions
    staleTime: 30000, // 30 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch permissions
  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => roleApi.getPermissions(),
    staleTime: 60000, // 1 minute
    retry: 3,
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: (roleData: any) => roleApi.createRole(roleData),
    onSuccess: (newRole) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsModalOpen(false);
      setSelectedRole(null);
      showToast('Role created successfully', 'success');
    },
    onError: (error: any) => {
      const message = error.message || 'Failed to create role';
      showToast(message, 'error');
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => roleApi.updateRole(id, data),
    onSuccess: (updatedRole) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsModalOpen(false);
      setSelectedRole(null);
      showToast('Role updated successfully', 'success');
    },
    onError: (error: any) => {
      const message = error.message || 'Failed to update role';
      showToast(message, 'error');
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: number) => roleApi.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowDeleteModal(false);
      setRoleToDelete(null);
      showToast('Role deleted successfully', 'success');
    },
    onError: (error: any) => {
      const message = error.message || 'Failed to delete role';
      showToast(message, 'error');
      setShowDeleteModal(false);
    },
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ message, type, show: true });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 5000);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setIsModalOpen(true);
  };

  const handleCreateRole = () => {
    setSelectedRole(null);
    setIsModalOpen(true);
  };

  const handleDeleteRole = (role: Role) => {
    setRoleToDelete(role);
    setShowDeleteModal(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRole(null);
  };

  const handleRoleSubmit = (roleData: any) => {
    if (selectedRole) {
      updateRoleMutation.mutate({ id: selectedRole.id, data: roleData });
    } else {
      createRoleMutation.mutate(roleData);
    }
  };

  const handleConfirmDelete = () => {
    if (roleToDelete) {
      deleteRoleMutation.mutate(roleToDelete.id);
    }
  };

  const isLoading = rolesLoading || permissionsLoading;
  const hasError = rolesError;

  // Error state
  if (hasError) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-6 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Roles</h2>
            <p className="text-red-300 mb-4">
              {rolesError?.message || 'An error occurred while loading roles'}
            </p>
            <Button variant="outline" onClick={() => refetchRoles()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard permission="role:read">
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
            <PermissionGuard permission="role:create">
              <Button
                variant="primary"
                leftIcon={<PlusIcon className="h-5 w-5" />}
                onClick={handleCreateRole}
                disabled={isLoading}
              >
                Create Role
              </Button>
            </PermissionGuard>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Roles</p>
                  <p className="text-2xl font-bold text-white">
                    {isLoading ? '...' : roles?.length || 0}
                  </p>
                </div>
                <UserGroupIcon className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">System Roles</p>
                  <p className="text-2xl font-bold text-white">
                    {isLoading ? '...' : roles?.filter((r) => r.is_system_role).length || 0}
                  </p>
                </div>
                <StatusIndicator status="info" />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Custom Roles</p>
                  <p className="text-2xl font-bold text-white">
                    {isLoading ? '...' : roles?.filter((r) => !r.is_system_role).length || 0}
                  </p>
                </div>
                <StatusIndicator status="success" />
              </div>
            </div>
          </div>

          {/* Role Table */}
          <RoleTable
            roles={roles || []}
            permissions={permissions || []}
            isLoading={isLoading}
            onEditRole={handleEditRole}
            onDeleteRole={handleDeleteRole}
            onCreateRole={handleCreateRole}
          />

          {/* Role Editor Modal */}
          <RoleEditorModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            role={selectedRole}
            permissions={permissions || []}
            onSubmit={handleRoleSubmit}
            isLoading={createRoleMutation.isPending || updateRoleMutation.isPending}
          />

          {/* Delete Confirmation Modal */}
          <ConfirmationModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleConfirmDelete}
            title="Delete Role"
            message={`Are you sure you want to delete the role "${roleToDelete?.display_name}"? This action cannot be undone and may affect users with this role.`}
            confirmText="Delete"
            cancelText="Cancel"
            variant="danger"
            isLoading={deleteRoleMutation.isPending}
          />

          {/* Toast Notifications */}
          {toast.show && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast((prev) => ({ ...prev, show: false }))}
            />
          )}
        </div>
      </div>
    </PermissionGuard>
  );
};

export default RoleManagementPage;
