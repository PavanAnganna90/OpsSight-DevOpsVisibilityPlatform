/**
 * Role Permissions Matrix Component
 * 
 * Visual matrix showing roles and their permissions
 */

import React, { useState, useMemo } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/Button';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { Select } from '@/components/ui/Select';

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  priority: number;
  is_system_role: boolean;
  permissions: Permission[];
}

interface Permission {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  is_system_permission: boolean;
}

interface RolePermissionsMatrixProps {
  roles: Role[];
  permissions: Permission[];
  onRoleClick?: (role: Role) => void;
  onPermissionClick?: (permission: Permission) => void;
  onCellClick?: (role: Role, permission: Permission, hasPermission: boolean) => void;
}

export function RolePermissionsMatrix({
  roles,
  permissions,
  onRoleClick,
  onPermissionClick,
  onCellClick,
}: RolePermissionsMatrixProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRoleType, setSelectedRoleType] = useState<string>('all');

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(permissions.map(p => p.category)));
    return uniqueCategories.sort();
  }, [permissions]);

  // Filter permissions based on search and category
  const filteredPermissions = useMemo(() => {
    let filtered = permissions;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered.sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [permissions, selectedCategory, searchTerm]);

  // Filter roles based on type
  const filteredRoles = useMemo(() => {
    let filtered = roles;

    if (selectedRoleType === 'system') {
      filtered = filtered.filter(r => r.is_system_role);
    } else if (selectedRoleType === 'custom') {
      filtered = filtered.filter(r => !r.is_system_role);
    }

    return filtered.sort((a, b) => b.priority - a.priority);
  }, [roles, selectedRoleType]);

  const hasPermission = (role: Role, permission: Permission): boolean => {
    return role.permissions.some(p => p.id === permission.id);
  };

  const getRolePermissionCount = (role: Role): number => {
    return role.permissions.filter(p => filteredPermissions.some(fp => fp.id === p.id)).length;
  };

  const getPermissionRoleCount = (permission: Permission): number => {
    return filteredRoles.filter(r => hasPermission(r, permission)).length;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search permissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <Select
          value={selectedCategory}
          onChange={setSelectedCategory}
          options={[
            { value: 'all', label: 'All Categories' },
            ...categories.map(cat => ({ value: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1) }))
          ]}
        />

        <Select
          value={selectedRoleType}
          onChange={setSelectedRoleType}
          options={[
            { value: 'all', label: 'All Roles' },
            { value: 'system', label: 'System Roles' },
            { value: 'custom', label: 'Custom Roles' }
          ]}
        />
      </div>

      {/* Matrix */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="sticky left-0 bg-gray-800 p-4 text-left text-sm font-medium text-gray-300 border-r border-gray-700 min-w-48">
                  Role
                </th>
                {filteredPermissions.map((permission) => (
                  <th
                    key={permission.id}
                    className="p-2 text-center text-xs font-medium text-gray-300 border-r border-gray-700 min-w-24"
                  >
                    <button
                      onClick={() => onPermissionClick?.(permission)}
                      className="hover:text-white transition-colors"
                      title={`${permission.display_name} - ${permission.description}`}
                    >
                      <div className="writing-mode-vertical text-orientation-mixed transform rotate-180">
                        {permission.display_name}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {getPermissionRoleCount(permission)} roles
                      </div>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRoles.map((role) => (
                <tr key={role.id} className="border-b border-gray-700/50 hover:bg-gray-700/25">
                  <td className="sticky left-0 bg-gray-800 p-4 border-r border-gray-700">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => onRoleClick?.(role)}
                        className="flex items-center space-x-3 hover:text-white transition-colors text-left"
                      >
                        <div>
                          <div className="font-medium text-white">{role.display_name}</div>
                          <div className="text-sm text-gray-400">{role.name}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <StatusIndicator
                              status={role.is_system_role ? "warning" : "info"}
                              label={role.is_system_role ? "System" : "Custom"}
                            />
                            <span className="text-xs text-gray-500">
                              {getRolePermissionCount(role)}/{filteredPermissions.length} permissions
                            </span>
                          </div>
                        </div>
                      </button>
                    </div>
                  </td>
                  {filteredPermissions.map((permission) => {
                    const hasPermissionValue = hasPermission(role, permission);
                    return (
                      <td
                        key={permission.id}
                        className="p-2 text-center border-r border-gray-700"
                      >
                        <button
                          onClick={() => onCellClick?.(role, permission, hasPermissionValue)}
                          className="w-full h-full flex items-center justify-center hover:bg-gray-600/50 rounded p-1 transition-colors"
                          title={`${role.display_name} - ${permission.display_name}: ${hasPermissionValue ? 'Has' : 'No'} permission`}
                        >
                          {hasPermissionValue ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircleIcon className="h-5 w-5 text-gray-600" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center space-x-2">
            <AdjustmentsHorizontalIcon className="h-5 w-5 text-blue-500" />
            <span className="text-white font-medium">Roles</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {filteredRoles.length}
          </div>
          <div className="text-sm text-gray-400">
            {filteredRoles.filter(r => r.is_system_role).length} system, {filteredRoles.filter(r => !r.is_system_role).length} custom
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <span className="text-white font-medium">Permissions</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {filteredPermissions.length}
          </div>
          <div className="text-sm text-gray-400">
            {categories.length} categories
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center space-x-2">
            <XCircleIcon className="h-5 w-5 text-orange-500" />
            <span className="text-white font-medium">Coverage</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {Math.round(
              (filteredRoles.reduce((sum, role) => sum + getRolePermissionCount(role), 0) /
                (filteredRoles.length * filteredPermissions.length)) * 100
            )}%
          </div>
          <div className="text-sm text-gray-400">
            Permission coverage
          </div>
        </div>
      </div>

      {/* No Results */}
      {(filteredRoles.length === 0 || filteredPermissions.length === 0) && (
        <div className="text-center py-8 text-gray-400">
          <MagnifyingGlassIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No data to display</p>
          <p className="text-sm">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}