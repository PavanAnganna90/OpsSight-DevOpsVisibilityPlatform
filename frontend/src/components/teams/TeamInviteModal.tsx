import React, { useState, useEffect } from 'react';
import { TeamRole, TeamInvitationRequest } from '@/types/team';
import { Button } from '@/components/ui';

interface TeamInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (invitation: TeamInvitationRequest) => Promise<void>;
  teamName: string;
  availableRoles?: TeamRole[];
  loading?: boolean;
}

/**
 * Team Invitation Modal Component
 * 
 * Allows team owners/admins to invite new members by email with specific roles.
 * Features email validation, role selection, and optional invitation message.
 */
export const TeamInviteModal: React.FC<TeamInviteModalProps> = ({
  isOpen,
  onClose,
  onInvite,
  teamName,
  availableRoles = [TeamRole.MEMBER, TeamRole.VIEWER],
  loading = false,
}) => {
  const [formData, setFormData] = useState<TeamInvitationRequest>({
    email: '',
    role: 'MEMBER' as TeamRole,
    message: '',
  });
  const [errors, setErrors] = useState<{
    email?: string;
    role?: string;
    general?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: '',
        role: availableRoles[0] || ('MEMBER' as TeamRole),
        message: '',
      });
      setErrors({});
    }
  }, [isOpen, availableRoles]);

  /**
   * Validate email format
   */
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.role) {
      newErrors.role = 'Role selection is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      await onInvite(formData);
      onClose();
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to send invitation'
      });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle input changes
   */
  const handleInputChange = (field: keyof TeamInvitationRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  /**
   * Get role display name
   */
  const getRoleDisplayName = (role: TeamRole): string => {
    const roleNames: Record<TeamRole, string> = {
      [TeamRole.OWNER]: 'Owner',
      [TeamRole.ADMIN]: 'Admin',
      [TeamRole.MEMBER]: 'Member',
      [TeamRole.VIEWER]: 'Viewer',
    };
    return roleNames[role] || role;
  };

  /**
   * Get role description
   */
  const getRoleDescription = (role: TeamRole): string => {
    const descriptions: Record<TeamRole, string> = {
      [TeamRole.OWNER]: 'Full access to all team resources and settings',
      [TeamRole.ADMIN]: 'Can manage team members and most settings',
      [TeamRole.MEMBER]: 'Can access team resources and contribute to projects',
      [TeamRole.VIEWER]: 'Read-only access to team resources',
    };
    return descriptions[role] || 'Team member role';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Invite to {teamName}
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* General Error */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
            </div>
          )}

          {/* Email Input */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={submitting}
              className={`w-full px-3 py-2 border rounded-md shadow-sm 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       disabled:opacity-50 disabled:cursor-not-allowed
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       ${errors.email 
                         ? 'border-red-300 dark:border-red-600' 
                         : 'border-gray-300 dark:border-gray-600'
                       }`}
              placeholder="Enter email address"
              required
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
            )}
          </div>

          {/* Role Selection */}
          <div className="mb-4">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              disabled={submitting}
              className={`w-full px-3 py-2 border rounded-md shadow-sm 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       disabled:opacity-50 disabled:cursor-not-allowed
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       ${errors.role 
                         ? 'border-red-300 dark:border-red-600' 
                         : 'border-gray-300 dark:border-gray-600'
                       }`}
              required
            >
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {getRoleDisplayName(role)}
                </option>
              ))}
            </select>
            {formData.role && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {getRoleDescription(formData.role)}
              </p>
            )}
            {errors.role && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.role}</p>
            )}
          </div>

          {/* Optional Message */}
          <div className="mb-6">
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message (Optional)
            </label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              disabled={submitting}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       disabled:opacity-50 disabled:cursor-not-allowed
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add a personal message to the invitation..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || loading}
              className="flex items-center gap-2"
            >
              {submitting && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Send Invitation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}; 