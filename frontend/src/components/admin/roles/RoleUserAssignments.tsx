/**
 * Role User Assignments Component
 * 
 * Manage user assignments to roles
 */

import React, { useState, useMemo } from 'react';
import {
  UsersIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
  UserIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/TextField';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  priority: number;
  is_system_role: boolean;
  permissions: Permission[];
  user_count: number;
}

interface Permission {
  id: string;
  name: string;
  display_name: string;
  category: string;
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

interface RoleUserAssignmentsProps {
  role: Role;
  users: User[];
  availableUsers: User[];
  onAssignUser: (userId: string) => void;
  onUnassignUser: (userId: string) => void;
  onBulkAssign: (userIds: string[]) => void;
  onBulkUnassign: (userIds: string[]) => void;
  isLoading?: boolean;
}

export function RoleUserAssignments({
  role,
  users,
  availableUsers,
  onAssignUser,
  onUnassignUser,
  onBulkAssign,
  onBulkUnassign,
  isLoading = false,
}: RoleUserAssignmentsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'last_login'>('name');
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'inactive'>('all');

  // Filter and sort assigned users
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterBy === 'active') {
      filtered = filtered.filter(user => user.is_active);
    } else if (filterBy === 'inactive') {
      filtered = filtered.filter(user => !user.is_active);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.full_name.localeCompare(b.full_name);
        case 'email':
          return a.email.localeCompare(b.email);
        case 'last_login':
          if (!a.last_login) return 1;
          if (!b.last_login) return -1;
          return new Date(b.last_login).getTime() - new Date(a.last_login).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [users, searchTerm, filterBy, sortBy]);

  // Filter available users (not already assigned)
  const filteredAvailableUsers = useMemo(() => {
    return availableUsers.filter(user =>
      !users.some(assignedUser => assignedUser.id === user.id)
    );
  }, [availableUsers, users]);

  const handleBulkAction = (action: 'assign' | 'unassign') => {
    if (selectedUsers.length === 0) return;

    if (action === 'assign') {
      onBulkAssign(selectedUsers);
    } else {
      onBulkUnassign(selectedUsers);
    }

    setSelectedUsers([]);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never';
    return new Date(lastLogin).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">User Assignments</h3>
          <p className="text-gray-400">
            {users.length} users assigned to {role.display_name}
          </p>
        </div>
        <Button
          onClick={() => setShowAssignModal(true)}
          variant="primary"
          leftIcon={<PlusIcon className="h-4 w-4" />}
          disabled={isLoading || filteredAvailableUsers.length === 0}
        >
          Assign Users
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <Select
          value={filterBy}
          onChange={setFilterBy}
          options={[
            { value: 'all', label: 'All Users' },
            { value: 'active', label: 'Active Only' },
            { value: 'inactive', label: 'Inactive Only' }
          ]}
        />

        <Select
          value={sortBy}
          onChange={setSortBy}
          options={[
            { value: 'name', label: 'Sort by Name' },
            { value: 'email', label: 'Sort by Email' },
            { value: 'last_login', label: 'Sort by Last Login' }
          ]}
        />
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-blue-500" />
            <span className="text-blue-300">
              {selectedUsers.length} users selected
            </span>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => handleBulkAction('unassign')}
              variant="danger"
              size="sm"
              disabled={isLoading}
            >
              Remove Selected
            </Button>
            <Button
              onClick={() => setSelectedUsers([])}
              variant="ghost"
              size="sm"
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <UsersIcon className="h-5 w-5 text-blue-500" />
            <span className="font-medium text-white">Assigned Users</span>
            <span className="text-gray-400">({filteredUsers.length})</span>
          </div>
        </div>

        <div className="divide-y divide-gray-700">
          {filteredUsers.map((user) => (
            <div key={user.id} className="flex items-center space-x-4 p-4 hover:bg-gray-700/50">
              <input
                type="checkbox"
                checked={selectedUsers.includes(user.id)}
                onChange={() => toggleUserSelection(user.id)}
                className="h-4 w-4 text-blue-600 rounded border-gray-600 bg-gray-700 focus:ring-blue-500"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <UserIcon className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white">{user.full_name}</span>
                      <StatusIndicator
                        status={user.is_active ? "success" : "error"}
                        label={user.is_active ? "Active" : "Inactive"}
                      />
                    </div>
                    <p className="text-sm text-gray-400">{user.email}</p>
                    <p className="text-xs text-gray-500">
                      Last login: {formatLastLogin(user.last_login)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-400">
                  {user.roles.length} roles
                </span>
                <Button
                  onClick={() => onUnassignUser(user.id)}
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No users assigned</p>
            <p className="text-sm">
              {users.length === 0 
                ? 'No users have been assigned to this role yet'
                : 'No users match your search criteria'
              }
            </p>
          </div>
        )}
      </div>

      {/* Assign Users Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Users to Role"
      >
        <div className="space-y-4">
          <div className="text-gray-300">
            <p>Select users to assign to <strong>{role.display_name}</strong>:</p>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredAvailableUsers.map((user) => (
              <div key={user.id} className="flex items-center space-x-3 p-3 hover:bg-gray-700/50 rounded">
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => toggleUserSelection(user.id)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-600 bg-gray-700 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-white">{user.full_name}</span>
                    <StatusIndicator
                      status={user.is_active ? "success" : "error"}
                      label={user.is_active ? "Active" : "Inactive"}
                    />
                  </div>
                  <p className="text-sm text-gray-400">{user.email}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredAvailableUsers.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users available for assignment</p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => setShowAssignModal(false)}
              variant="secondary"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleBulkAction('assign');
                setShowAssignModal(false);
              }}
              variant="primary"
              disabled={isLoading || selectedUsers.length === 0}
              isLoading={isLoading}
            >
              Assign Selected ({selectedUsers.length})
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}