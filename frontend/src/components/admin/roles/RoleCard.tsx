/**
 * Individual Role Card Component
 * 
 * Displays role information in a card format with actions
 */

import React from 'react';
import {
  UserGroupIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  UsersIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

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

interface RoleCardProps {
  role: Role;
  onView: (role: Role) => void;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
  onManagePermissions: (role: Role) => void;
}

export function RoleCard({ role, onView, onEdit, onDelete, onManagePermissions }: RoleCardProps) {
  const getRolePriorityColor = (priority: number) => {
    if (priority >= 90) return 'text-red-500';
    if (priority >= 70) return 'text-orange-500';
    if (priority >= 50) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getRolePriorityBadge = (priority: number) => {
    if (priority >= 90) return 'bg-red-500/10 text-red-500';
    if (priority >= 70) return 'bg-orange-500/10 text-orange-500';
    if (priority >= 50) return 'bg-yellow-500/10 text-yellow-500';
    return 'bg-green-500/10 text-green-500';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="p-2 bg-blue-500/10 rounded-lg mr-3">
            <UserGroupIcon className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{role.display_name}</h3>
            <p className="text-sm text-gray-400">{role.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <StatusIndicator
            status={role.is_system_role ? "warning" : "info"}
            label={role.is_system_role ? "System" : "Custom"}
          />
          <span className={`px-2 py-1 rounded text-xs font-medium ${getRolePriorityBadge(role.priority)}`}>
            Priority: {role.priority}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-300 text-sm mb-4 line-clamp-2">
        {role.description || 'No description available'}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center">
          <UsersIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm text-gray-300">
            {role.user_count} {role.user_count === 1 ? 'user' : 'users'}
          </span>
        </div>
        <div className="flex items-center">
          <ShieldCheckIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm text-gray-300">
            {role.permissions.length} {role.permissions.length === 1 ? 'permission' : 'permissions'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        <Button
          onClick={() => onView(role)}
          variant="ghost"
          size="sm"
          className="flex-1"
        >
          <EyeIcon className="h-4 w-4 mr-2" />
          View
        </Button>
        <Button
          onClick={() => onManagePermissions(role)}
          variant="ghost"
          size="sm"
          className="flex-1"
        >
          <ShieldCheckIcon className="h-4 w-4 mr-2" />
          Permissions
        </Button>
        <Button
          onClick={() => onEdit(role)}
          variant="ghost"
          size="sm"
          disabled={role.is_system_role}
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => onDelete(role)}
          variant="ghost"
          size="sm"
          disabled={role.is_system_role || role.user_count > 0}
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* System Role Warning */}
      {role.is_system_role && (
        <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-400">
          <CheckCircleIcon className="h-3 w-3 inline mr-1" />
          System role - cannot be modified or deleted
        </div>
      )}

      {/* Users Warning */}
      {role.user_count > 0 && !role.is_system_role && (
        <div className="mt-3 p-2 bg-orange-500/10 border border-orange-500/20 rounded text-xs text-orange-400">
          <XCircleIcon className="h-3 w-3 inline mr-1" />
          Cannot delete - {role.user_count} users assigned
        </div>
      )}
    </div>
  );
}