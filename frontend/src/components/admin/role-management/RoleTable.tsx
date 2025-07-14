import { PencilIcon, ShieldCheckIcon, TrashIcon, UsersIcon } from '@heroicons/react/24/outline';
import React, { useMemo, useState } from 'react';
import { Permission, Role } from '../../../types/role';
import { PermissionGuard } from '../../rbac/PermissionGuard';
import { Button } from '../../ui/Button';
import { StatusIndicator } from '../../ui/StatusIndicator';
import { TextField } from '../../ui/TextField';

interface RoleTableProps {
  roles: Role[];
  permissions: Permission[];
  isLoading: boolean;
  onEditRole: (role: Role) => void;
  onDeleteRole: (role: Role) => void;
  onCreateRole: () => void;
}

/**
 * Enhanced table displaying all roles with search, filtering, and comprehensive actions.
 */
const RoleTable: React.FC<RoleTableProps> = ({
  roles,
  permissions: _permissions, // Prefix with underscore to indicate intentionally unused
  isLoading,
  onEditRole,
  onDeleteRole,
  onCreateRole: _onCreateRole, // Prefix with underscore to indicate intentionally unused
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'system' | 'custom'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter and sort roles
  const filteredAndSortedRoles = useMemo(() => {
    const filtered = roles.filter((role) => {
      const matchesSearch =
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (role.description || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter =
        filterType === 'all' ||
        (filterType === 'system' && role.is_system_role) ||
        (filterType === 'custom' && !role.is_system_role);

      return matchesSearch && matchesFilter;
    });

    // Sort roles
    filtered.sort((a, b) => {
      let aValue: string | Date, bValue: string | Date;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [roles, searchTerm, filterType, sortBy, sortOrder]);

  const getRoleIcon = (role: Role): React.JSX.Element => {
    if (role.is_system_role) {
      return <ShieldCheckIcon className="h-5 w-5 text-blue-400" />;
    }
    return <UsersIcon className="h-5 w-5 text-green-400" />;
  };

  const getRoleTypeDisplay = (role: Role): string => {
    return role.is_system_role ? 'System' : 'Custom';
  };

  const getPermissionCount = (role: Role): number => {
    return role.permissions?.length ?? 0;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDisplayName = (role: Role): string => {
    // Convert system_role enum to display name or use role name
    return role.system_role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="h-16 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header with Search and Filters */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex-1 max-w-md">
            <TextField
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search roles..."
              className="w-full"
            />
          </div>

          <div className="flex items-center space-x-4">
            {/* Filter Dropdown */}
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as 'all' | 'system' | 'custom');
              }}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="system">System Roles</option>
              <option value="custom">Custom Roles</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [column, order] = e.target.value.split('-');
                setSortBy(column as 'name' | 'created_at');
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-400">
          Showing {filteredAndSortedRoles.length} of {roles.length} roles
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left p-4 text-gray-300 font-medium">Role</th>
              <th className="text-left p-4 text-gray-300 font-medium">Type</th>
              <th className="text-left p-4 text-gray-300 font-medium">Permissions</th>
              <th className="text-left p-4 text-gray-300 font-medium">Status</th>
              <th className="text-left p-4 text-gray-300 font-medium">Created</th>
              <th className="text-right p-4 text-gray-300 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRoles.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  {searchTerm || filterType !== 'all'
                    ? 'No roles match your criteria'
                    : 'No roles found'}
                </td>
              </tr>
            ) : (
              filteredAndSortedRoles.map((role) => (
                <tr
                  key={role.id}
                  className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      {getRoleIcon(role)}
                      <div>
                        <div className="font-medium text-white">{getDisplayName(role)}</div>
                        <div className="text-sm text-gray-400">{role.name}</div>
                        {role.description && (
                          <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                            {role.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        role.is_system_role
                          ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                          : 'bg-green-900/50 text-green-300 border border-green-700'
                      }`}
                    >
                      {getRoleTypeDisplay(role)}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <ShieldCheckIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-white">{getPermissionCount(role)}</span>
                    </div>
                  </td>

                  <td className="p-4">
                    <StatusIndicator
                      status={role.is_active ? 'success' : 'warning'}
                      label={role.is_active ? 'Active' : 'Inactive'}
                    />
                  </td>

                  <td className="p-4">
                    <span className="text-gray-300 text-sm">
                      {role.created_at ? formatDate(role.created_at) : 'N/A'}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center justify-end space-x-2">
                      <PermissionGuard permission="role:update">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onEditRole(role);
                          }}
                          leftIcon={<PencilIcon className="h-4 w-4" />}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Edit
                        </Button>
                      </PermissionGuard>

                      <PermissionGuard permission="role:delete">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onDeleteRole(role);
                          }}
                          leftIcon={<TrashIcon className="h-4 w-4" />}
                          className="text-red-400 hover:text-red-300"
                          disabled={role.is_system_role}
                        >
                          Delete
                        </Button>
                      </PermissionGuard>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>
            {filteredAndSortedRoles.length} role{filteredAndSortedRoles.length !== 1 ? 's' : ''}{' '}
            displayed
          </span>
          <div className="flex items-center space-x-4">
            <span>System roles cannot be deleted</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleTable;
