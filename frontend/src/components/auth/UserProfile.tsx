/**
 * User profile component for displaying authenticated user information.
 * Shows user avatar, name, GitHub profile details, and provides logout functionality.
 */

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../ui/Avatar';
import { UserRoleDisplay } from '../rbac/RoleBadge';
import { usePermissionState } from '../../hooks/usePermissions';

interface UserProfileProps {
  /** Display variant - compact for headers, full for profile pages */
  variant?: 'compact' | 'full';
  /** Show logout button */
  showLogout?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Optional click handler for profile interaction */
  onClick?: () => void;
}

/**
 * User Profile Component
 * 
 * Displays authenticated user information with flexible layouts.
 * Supports both compact (for headers/navbars) and full (for profile pages) variants.
 * 
 * Features:
 * - Responsive user avatar with fallback
 * - GitHub profile information display
 * - Logout functionality with confirmation
 * - Loading states during user operations
 * - Accessible keyboard navigation
 * - Design token integration
 * 
 * @param variant - Display variant (compact or full)
 * @param showLogout - Whether to show logout button
 * @param className - Additional CSS classes
 * @param onClick - Optional click handler
 */
export const UserProfile: React.FC<UserProfileProps> = ({
  variant = 'compact',
  showLogout = true,
  className = '',
  onClick,
}) => {
  const { state, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const permissionState = usePermissionState();

  const { user } = state;

  /**
   * Handle logout with confirmation.
   */
  const handleLogout = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      // Reason: Continue with logout even if API call fails
    } finally {
      setIsLoggingOut(false);
      setShowConfirm(false);
    }
  };

  /**
   * Cancel logout confirmation.
   */
  const cancelLogout = () => {
    setShowConfirm(false);
  };



  /**
   * Format date for display.
   */
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Not available';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date);
    } catch {
      return 'Invalid date';
    }
  };

  if (!user) {
    return null;
  }

  /**
   * Render compact variant for headers/navbars.
   */
  const renderCompact = () => (
    <div 
      className={`flex items-center space-x-3 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `User profile: ${user.github_username}` : undefined}
    >
      {/* Avatar */}
      <Avatar
        src={user.avatar_url}
        alt={`${user.github_username} avatar`}
        name={user.full_name || user.github_username}
        size="sm"
        priority={true} // Above-fold avatar should load immediately
      />

      {/* User info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {user.full_name || user.github_username}
        </p>
        <div className="flex items-center space-x-2">
          <p className="text-xs text-gray-500 truncate">
            @{user.github_username}
          </p>
          {user.roles && user.roles.length > 0 && (
            <UserRoleDisplay user={user} size="sm" variant="compact" />
          )}
        </div>
      </div>

      {/* Logout button */}
      {showLogout && (
        <div className="relative">
          {!showConfirm ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              disabled={isLoggingOut}
              className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded disabled:opacity-50"
              aria-label="Logout"
              title="Logout"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogout();
                }}
                disabled={isLoggingOut}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isLoggingOut ? 'Logging out...' : 'Confirm'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cancelLogout();
                }}
                disabled={isLoggingOut}
                className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  /**
   * Render full variant for profile pages.
   */
  const renderFull = () => (
    <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
      <div className="flex items-start space-x-6">
        {/* Large avatar */}
        <div className="flex-shrink-0">
          <Avatar
            src={user.avatar_url}
            alt={`${user.github_username} avatar`}
            name={user.full_name || user.github_username}
            size="2xl"
            priority={false} // Profile page avatar can use lazy loading
          />
        </div>

        {/* User details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user.full_name || user.github_username}
              </h1>
              <p className="text-lg text-gray-600">@{user.github_username}</p>
            </div>
            
            {showLogout && (
              <div>
                {!showConfirm ? (
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                ) : (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      {isLoggingOut ? 'Logging out...' : 'Confirm Logout'}
                    </button>
                    <button
                      onClick={cancelLogout}
                      disabled={isLoggingOut}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bio */}
          {user.bio && (
            <p className="mt-4 text-gray-700">{user.bio}</p>
          )}

          {/* Roles and Permissions */}
          <div className="mt-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Roles & Permissions</h3>
              <div className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Assigned Roles</dt>
                  <dd className="mt-1">
                    <UserRoleDisplay user={user} size="md" variant="default" />
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Permission Summary</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {permissionState.permissions.length} permissions across {permissionState.roles.length} roles
                    {permissionState.hasAnyAdminRole && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Administrator
                      </span>
                    )}
                  </dd>
                </div>
              </div>
            </div>
          </div>

          {/* Profile details */}
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {user.email && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
              </div>
            )}
            
            {user.company && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Company</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.company}</dd>
              </div>
            )}
            
            {user.location && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Location</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.location}</dd>
              </div>
            )}
            
            {user.blog && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Website</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a 
                    href={user.blog.startsWith('http') ? user.blog : `https://${user.blog}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-500"
                  >
                    {user.blog}
                  </a>
                </dd>
              </div>
            )}
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Member since</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(user.created_at)}</dd>
            </div>
            
            {user.last_login && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Last login</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(user.last_login)}</dd>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return variant === 'compact' ? renderCompact() : renderFull();
};

export default UserProfile; 