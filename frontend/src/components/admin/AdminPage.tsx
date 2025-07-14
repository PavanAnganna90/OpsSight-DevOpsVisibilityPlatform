import React, { useState, useEffect } from 'react';
import AppShell from '../layout/AppShell';
import RoleList from './RoleList';
import RoleDetail from './RoleDetail';
import PermissionAssignment from './PermissionAssignment';
import LoadingSpinner from '../common/LoadingSpinner';
import RoleCreateModal from './RoleCreateModal';
import RoleManagementPage from './role-management/RoleManagementPage';
import { PermissionGuard, AdminOnly } from '../rbac/PermissionGuard';

/**
 * AdminPage - Main admin UI for role and permission management in OpsSight.
 * Provides tabbed interface for legacy role management and new RBAC system.
 * Now includes RoleCreateModal for creating new roles and supports editing, deleting roles and permissions.
 */
const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'legacy' | 'rbac'>('rbac');
  const [roles, setRoles] = useState<Array<any>>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]); // assigned permissions (names)
  const [allPermissions, setAllPermissions] = useState<any[]>([]); // all permission objects
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  // Edit state
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState(false);
  // Permission update state
  const [permLoading, setPermLoading] = useState(false);
  const [permError, setPermError] = useState('');
  const [permSuccess, setPermSuccess] = useState(false);
  // Delete state
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  // Fetch roles on mount
  useEffect(() => {
    fetch('/api/v1/roles')
      .then(res => res.json())
      .then(data => {
        setRoles(data);
        if (data.length > 0) setSelected(data[0]);
      })
      .catch(() => setError('Failed to load roles'))
      .finally(() => setLoading(false));
  }, []);

  // Fetch all permissions on mount
  useEffect(() => {
    fetch('/api/v1/permissions')
      .then(res => res.json())
      .then(data => setAllPermissions(data))
      .catch(() => setAllPermissions([]));
  }, []);

  // Fetch assigned permissions for selected role
  useEffect(() => {
    if (!selected) return;
    fetch(`/api/v1/roles/${selected.id}/permissions`)
      .then(res => res.json())
      .then(data => setPermissions(data.permissions ? data.permissions.map((p: any) => p.name) : []))
      .catch(() => setPermissions([]));
  }, [selected]);

  const handleRoleSelect = (role: any) => setSelected(role);

  // Handle role edit (display_name, description)
  const handleRoleEdit = async (updated: { display_name: string; description?: string }) => {
    if (!selected) return;
    setEditLoading(true);
    setEditError('');
    try {
      const res = await fetch(`/api/v1/roles/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to update role');
      }
      const updatedRole = await res.json();
      setRoles(prev => prev.map(r => (r.id === updatedRole.id ? updatedRole : r)));
      setSelected(updatedRole);
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 2500);
    } catch (e: any) {
      setEditError(e.message || 'Failed to update role');
    } finally {
      setEditLoading(false);
    }
  };

  const handleRoleSave = handleRoleEdit; // For clarity in prop passing
  const handleRoleCancel = () => setEditError('');

  // Handle permission assignment update
  const handlePermissionChange = async (updated: string[]) => {
    if (!selected) return;
    setPermLoading(true);
    setPermError('');
    try {
      // Map permission names to IDs
      const updatedIds = allPermissions.filter(p => updated.includes(p.name)).map(p => p.id);
      const res = await fetch(`/api/v1/roles/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission_ids: updatedIds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to update permissions');
      }
      const updatedRole = await res.json();
      setRoles(prev => prev.map(r => (r.id === updatedRole.id ? updatedRole : r)));
      setSelected(updatedRole);
      setPermissions(updated);
      setPermSuccess(true);
      setTimeout(() => setPermSuccess(false), 2000);
    } catch (e: any) {
      setPermError(e.message || 'Failed to update permissions');
    } finally {
      setPermLoading(false);
    }
  };

  // Handle role creation with robust error/success feedback
  const handleCreateRole = async (role: { name: string; display_name: string; description?: string; permission_ids?: number[] }) => {
    setCreateLoading(true);
    setCreateError('');
    try {
      const res = await fetch('/api/v1/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(role),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create role');
      }
      const newRole = await res.json();
      setRoles(prev => [...prev, newRole]);
      setSelected(newRole);
      setShowCreate(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    } catch (e: any) {
      setCreateError(e.message || 'Failed to create role');
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle role deletion
  const handleDeleteRole = async () => {
    if (!selected) return;
    if (!window.confirm(`Are you sure you want to delete the role "${selected.display_name}"? This action cannot be undone.`)) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/v1/roles/${selected.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to delete role');
      }
      setRoles(prev => prev.filter(r => r.id !== selected.id));
      // Select next available role or null
      const idx = roles.findIndex(r => r.id === selected.id);
      const next = roles[idx + 1] || roles[idx - 1] || null;
      setSelected(next);
      setDeleteSuccess(true);
      setTimeout(() => setDeleteSuccess(false), 2500);
    } catch (e: any) {
      setDeleteError(e.message || 'Failed to delete role');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Reset error/loading state on modal close
  const handleCloseModal = () => {
    setShowCreate(false);
    setCreateError('');
    setCreateLoading(false);
  };

  if (loading) return <AppShell><LoadingSpinner /></AppShell>;
  if (error) return <AppShell><div className="text-red-500">{error}</div></AppShell>;

  return (
    <AppShell>
      <AdminOnly fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-6v2m0-4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Denied</h3>
            <p className="text-gray-600 dark:text-gray-400">You don't have permission to access the admin panel.</p>
          </div>
        </div>
      }>
        {/* Success Toasts */}
        {showSuccess && (
          <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow z-50 animate-fade-in">
            Role created successfully!
          </div>
        )}
        {editSuccess && (
          <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow z-50 animate-fade-in">
            Role updated successfully!
          </div>
        )}
        {permSuccess && (
          <div className="fixed top-4 right-4 bg-green-700 text-white px-4 py-2 rounded shadow z-50 animate-fade-in">
            Permissions updated!
          </div>
        )}
        {deleteSuccess && (
          <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow z-50 animate-fade-in">
            Role deleted.
          </div>
        )}
        
        <PermissionGuard permission="role:create">
          <RoleCreateModal
            open={showCreate}
            onClose={handleCloseModal}
            onCreate={handleCreateRole}
            creationLoading={createLoading}
            creationError={createError}
            onSuccess={() => setShowSuccess(true)}
          />
        </PermissionGuard>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold">Roles</h3>
              <PermissionGuard permission="role:create">
                <button
                  className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                  onClick={() => setShowCreate(true)}
                  disabled={createLoading}
                >
                  + New Role
                </button>
              </PermissionGuard>
            </div>
            <RoleList roles={roles} onSelect={handleRoleSelect} />
          </div>
          <div>
            {selected && (
              <>
                <PermissionGuard permission="role:update">
                  <RoleDetail
                    role={{ ...selected, permissions }}
                    onSave={handleRoleSave}
                    onCancel={handleRoleCancel}
                    loading={editLoading}
                  />
                </PermissionGuard>
                <PermissionGuard permission="role:delete">
                  <button
                    className="mt-4 px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                    onClick={handleDeleteRole}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete Role'}
                  </button>
                  {deleteError && <div className="text-red-500 mt-2">{deleteError}</div>}
                </PermissionGuard>
              </>
            )}
            {editError && <div className="text-red-500 mt-2">{editError}</div>}
          </div>
          <div>
            {selected && (
              <PermissionGuard permission="role:manage">
                <div className="bg-white dark:bg-gray-900 rounded shadow p-4">
                  <h3 className="font-bold mb-2">Assign Permissions</h3>
                  <PermissionAssignment
                    allPermissions={allPermissions}
                    assigned={permissions}
                    onChange={handlePermissionChange}
                    loading={permLoading}
                    error={permError}
                  />
                  {permError && <div className="text-red-500 mt-2">{permError}</div>}
                </div>
              </PermissionGuard>
            )}
          </div>
        </div>
      </AdminOnly>
    </AppShell>
  );
};

export default AdminPage; 