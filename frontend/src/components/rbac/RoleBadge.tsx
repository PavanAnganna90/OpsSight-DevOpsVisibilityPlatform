/**
 * Role Badge Component
 * 
 * Displays user roles as badges with appropriate styling
 */

import React from 'react';
import { 
  ShieldCheckIcon, 
  UserIcon, 
  CogIcon, 
  EyeIcon,
  KeyIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  priority: number;
  is_system_role: boolean;
}

interface RoleBadgeProps {
  role: Role;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showDescription?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export function RoleBadge({ 
  role, 
  size = 'md', 
  showIcon = true, 
  showDescription = false,
  variant = 'default'
}: RoleBadgeProps) {
  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'super_admin':
      case 'admin':
        return ShieldCheckIcon;
      case 'organization_owner':
        return CogIcon;
      case 'devops_admin':
        return KeyIcon;
      case 'manager':
        return UsersIcon;
      case 'engineer':
        return UserIcon;
      case 'viewer':
        return EyeIcon;
      default:
        return UserIcon;
    }
  };

  const getRoleColor = (roleName: string, priority: number) => {
    if (priority >= 90) return 'bg-red-500/10 text-red-500 border-red-500/20';
    if (priority >= 80) return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    if (priority >= 60) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    if (priority >= 40) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    if (priority >= 20) return 'bg-green-500/10 text-green-500 border-green-500/20';
    return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-4 py-2 text-base';
      default:
        return 'px-3 py-1 text-sm';
    }
  };

  const getIconSize = (size: string) => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3';
      case 'lg':
        return 'h-5 w-5';
      default:
        return 'h-4 w-4';
    }
  };

  const Icon = getRoleIcon(role.name);
  const colorClasses = getRoleColor(role.name, role.priority);
  const sizeClasses = getSizeClasses(size);
  const iconSize = getIconSize(size);

  if (variant === 'compact') {
    return (
      <span 
        className={`inline-flex items-center rounded-full border font-medium ${colorClasses} ${sizeClasses}`}
        title={`${role.display_name} - ${role.description}`}
      >
        {showIcon && <Icon className={`mr-1 ${iconSize}`} />}
        {role.display_name}
      </span>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`inline-flex items-center rounded-lg border ${colorClasses} ${sizeClasses}`}>
        {showIcon && <Icon className={`mr-2 ${iconSize}`} />}
        <div>
          <div className="font-medium">{role.display_name}</div>
          {showDescription && (
            <div className="text-xs opacity-75 mt-1">{role.description}</div>
          )}
          <div className="text-xs opacity-60 mt-1">
            Priority: {role.priority}
            {role.is_system_role && ' • System Role'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <span 
      className={`inline-flex items-center rounded-md border font-medium ${colorClasses} ${sizeClasses}`}
      title={`${role.display_name} - ${role.description}`}
    >
      {showIcon && <Icon className={`mr-1.5 ${iconSize}`} />}
      {role.display_name}
      {role.is_system_role && (
        <span className="ml-1 text-xs opacity-60">(System)</span>
      )}
    </span>
  );
}

interface RoleBadgeListProps {
  roles: Role[];
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export function RoleBadgeList({ 
  roles, 
  maxDisplay = 3, 
  size = 'md', 
  showIcon = true,
  variant = 'default'
}: RoleBadgeListProps) {
  const sortedRoles = [...roles].sort((a, b) => b.priority - a.priority);
  const displayRoles = sortedRoles.slice(0, maxDisplay);
  const remainingCount = sortedRoles.length - maxDisplay;

  return (
    <div className="flex flex-wrap gap-2">
      {displayRoles.map((role) => (
        <RoleBadge 
          key={role.id} 
          role={role} 
          size={size} 
          showIcon={showIcon}
          variant={variant}
        />
      ))}
      {remainingCount > 0 && (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-500 bg-gray-500/10 border border-gray-500/20 rounded-md">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
}

interface UserRoleDisplayProps {
  user: {
    roles?: Role[];
    is_superuser?: boolean;
  };
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export function UserRoleDisplay({ 
  user, 
  size = 'md', 
  showIcon = true,
  variant = 'default'
}: UserRoleDisplayProps) {
  if (user.is_superuser) {
    return (
      <RoleBadge 
        role={{
          id: 'superuser',
          name: 'super_admin',
          display_name: 'Super Admin',
          description: 'Full system access',
          priority: 100,
          is_system_role: true,
        }}
        size={size}
        showIcon={showIcon}
        variant={variant}
      />
    );
  }

  if (!user.roles || user.roles.length === 0) {
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-500 bg-gray-500/10 border border-gray-500/20 rounded-md">
        No roles assigned
      </span>
    );
  }

  return (
    <RoleBadgeList 
      roles={user.roles} 
      size={size} 
      showIcon={showIcon}
      variant={variant}
    />
  );
}