/**
 * Team Form Component
 * 
 * Form for creating and editing teams with validation and settings management.
 * Supports both create and edit modes with proper error handling.
 */

import React, { useState, useEffect } from 'react';
import { Team, TeamCreate, TeamUpdate, TeamRole, TeamSettings, TeamPermissions } from '@/types/team';
import { teamApi } from '@/services/teamApi';
import { Button } from '@/components/ui';

interface TeamFormProps {
  team?: Team | null;
  onSubmit: (team: Team) => void;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * Default team settings
 */
const defaultSettings: TeamSettings = {
  allow_external_invites: true,
  require_admin_approval: false,
  default_member_role: TeamRole.MEMBER,
  visibility: 'private',
  notifications: {
    email: true,
    slack: false,
    webhook: false
  }
};

/**
 * Default team permissions
 */
const defaultPermissions: TeamPermissions = {
  repository_access: true,
  deployment_access: false,
  monitoring_access: true,
  cost_view_access: false,
  settings_access: false
};

/**
 * Team Form Component
 * 
 * @param team - Existing team for edit mode (null/undefined for create mode)
 * @param onSubmit - Callback when form is successfully submitted
 * @param onCancel - Callback when form is cancelled
 * @param loading - External loading state
 */
export const TeamForm: React.FC<TeamFormProps> = ({
  team,
  onSubmit,
  onCancel,
  loading: externalLoading = false
}) => {
  const isEditMode = Boolean(team);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data state
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    settings: defaultSettings,
    permissions: defaultPermissions
  });

  // Form validation state
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  /**
   * Initialize form data when team changes
   */
  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name,
        display_name: team.display_name || '',
        description: team.description || '',
        settings: { ...defaultSettings, ...team.settings },
        permissions: { ...defaultPermissions, ...team.permissions }
      });
    } else {
      setFormData({
        name: '',
        display_name: '',
        description: '',
        settings: defaultSettings,
        permissions: defaultPermissions
      });
    }
    setErrors({});
    setError(null);
  }, [team]);

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Team name is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.name)) {
      newErrors.name = 'Team name must contain only lowercase letters, numbers, and hyphens';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Team name must be at least 3 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Team name must be less than 50 characters';
    }

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Display name is required';
    } else if (formData.display_name.length > 100) {
      newErrors.display_name = 'Display name must be less than 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form input changes
   */
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * Handle settings changes
   */
  const handleSettingsChange = (field: keyof TeamSettings, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value
      }
    }));
  };

  /**
   * Handle permissions changes
   */
  const handlePermissionsChange = (field: keyof TeamPermissions, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [field]: value
      }
    }));
  };

  /**
   * Handle notifications changes
   */
  const handleNotificationChange = (field: keyof TeamSettings['notifications'], value: boolean) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        notifications: {
          ...prev.settings.notifications,
          [field]: value
        }
      }
    }));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let savedTeam: Team;

      if (isEditMode && team) {
        // Update existing team
        const updateData: TeamUpdate = {
          name: formData.name !== team.name ? formData.name : undefined,
          display_name: formData.display_name !== team.display_name ? formData.display_name : undefined,
          description: formData.description !== team.description ? formData.description : undefined,
          settings: formData.settings,
          permissions: formData.permissions
        };

        savedTeam = await teamApi.updateTeam(team.id, updateData);
      } else {
        // Create new team
        const createData: TeamCreate = {
          name: formData.name,
          display_name: formData.display_name || undefined,
          description: formData.description || undefined,
          settings: formData.settings,
          permissions: formData.permissions
        };

        savedTeam = await teamApi.createTeam(createData);
      }

      onSubmit(savedTeam);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save team';
      setError(message);
      console.error('Failed to save team:', err);
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading || externalLoading;

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditMode ? 'Edit Team' : 'Create Team'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isEditMode 
              ? 'Update team information and settings.' 
              : 'Create a new team to organize your projects and collaborators.'
            }
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-red-700 dark:text-red-300">
                <h3 className="text-sm font-medium">Error saving team</h3>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Team Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Team Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="my-awesome-team"
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
                          text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                          focus:ring-2 focus:ring-blue-500 focus:border-transparent
                          ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors.name && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.name}</p>
              )}
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Used in URLs and internal references. Lowercase letters, numbers, and hyphens only.
              </p>
            </div>

            {/* Display Name */}
            <div>
              <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Display Name *
              </label>
              <input
                type="text"
                id="display_name"
                value={formData.display_name}
                onChange={(e) => handleInputChange('display_name', e.target.value)}
                placeholder="My Awesome Team"
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
                          text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                          focus:ring-2 focus:ring-blue-500 focus:border-transparent
                          ${errors.display_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors.display_name && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.display_name}</p>
              )}
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Human-readable name shown in the interface.
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of the team's purpose and responsibilities..."
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
                        text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                        focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        ${errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.description && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.description}</p>
            )}
          </div>
        </div>

        {/* Team Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Team Settings
          </h3>
          
          <div className="space-y-6">
            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Team Visibility
              </label>
              <select
                value={formData.settings.visibility}
                onChange={(e) => handleSettingsChange('visibility', e.target.value as 'public' | 'private' | 'internal')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="private">Private - Only team members can see this team</option>
                <option value="internal">Internal - All organization members can see this team</option>
                <option value="public">Public - Anyone can see this team</option>
              </select>
            </div>

            {/* Default Member Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Member Role
              </label>
              <select
                value={formData.settings.default_member_role}
                onChange={(e) => handleSettingsChange('default_member_role', e.target.value as TeamRole)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={TeamRole.VIEWER}>Viewer - Read-only access</option>
                <option value={TeamRole.MEMBER}>Member - Standard access</option>
                <option value={TeamRole.ADMIN}>Admin - Administrative access</option>
              </select>
            </div>

            {/* Checkboxes */}
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allow_external_invites"
                  checked={formData.settings.allow_external_invites}
                  onChange={(e) => handleSettingsChange('allow_external_invites', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allow_external_invites" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Allow external invites (invite users outside the organization)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="require_admin_approval"
                  checked={formData.settings.require_admin_approval}
                  onChange={(e) => handleSettingsChange('require_admin_approval', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="require_admin_approval" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Require admin approval for new members
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitDisabled}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitDisabled}
            className="flex items-center gap-2"
          >
            {loading && (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {isEditMode ? 'Update Team' : 'Create Team'}
          </Button>
        </div>
      </form>
    </div>
  );
}; 