import React, { useEffect, useState } from 'react';
import { Permission, Role, SystemRole } from '../../../types/role';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { Modal } from '../../ui/Modal';
import { TextArea } from '../../ui/TextArea';
import { TextField } from '../../ui/TextField';

interface RoleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  role?: Role | null;
  permissions: Permission[];
  onSubmit: (roleData: RoleFormData) => void;
  isLoading: boolean;
}

interface RoleFormData {
  name: string;
  system_role: SystemRole | '';
  description: string;
  permission_ids: number[];
  is_active: boolean;
}

const SYSTEM_ROLE_OPTIONS = [
  {
    value: SystemRole.SUPER_ADMIN,
    label: 'Super Admin',
    description: 'Platform-wide access across all organizations',
  },
  {
    value: SystemRole.ORGANIZATION_OWNER,
    label: 'Organization Owner',
    description: 'Full access to organization resources',
  },
  {
    value: SystemRole.DEVOPS_ADMIN,
    label: 'DevOps Admin',
    description: 'Operational access to infrastructure',
  },
  { value: SystemRole.MANAGER, label: 'Manager', description: 'Management-level access' },
  { value: SystemRole.ENGINEER, label: 'Engineer', description: 'Engineering access' },
  { value: SystemRole.VIEWER, label: 'Viewer', description: 'Read-only access' },
  {
    value: SystemRole.API_ONLY,
    label: 'API Only',
    description: 'Programmatic access for integrations',
  },
];

/**
 * Modal for creating and editing roles with comprehensive permission assignment
 */
const RoleEditorModal: React.FC<RoleEditorModalProps> = ({
  isOpen,
  onClose,
  role,
  permissions,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    system_role: '',
    description: '',
    permission_ids: [],
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Initialize form data when role changes
  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        system_role: role.system_role,
        description: role.description,
        permission_ids: role.permissions?.map((p) => p.id) || [],
        is_active: role.is_active,
      });
    } else {
      setFormData({
        name: '',
        system_role: '',
        description: '',
        permission_ids: [],
        is_active: true,
      });
    }
    setErrors({});
    setSearchTerm('');
    setSelectedCategory('all');
  }, [role, isOpen]);

  // Group permissions by category
  const permissionsByCategory = permissions.reduce<Record<string, Permission[]>>(
    (acc, permission) => {
      const category = permission.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    },
    {}
  );

  const categories = Object.keys(permissionsByCategory).sort();

  // Filter permissions based on search and category
  const filteredPermissions = permissions.filter((permission) => {
    const matchesSearch =
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || permission.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    }

    if (formData.system_role === '') {
      newErrors.system_role = 'System role is required';
    }

    if (formData.permission_ids.length === 0) {
      newErrors.permissions = 'At least one permission must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit({
      ...formData,
      system_role: formData.system_role as SystemRole,
    });
  };

  const handlePermissionToggle = (permissionId: number): void => {
    setFormData((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permissionId)
        ? prev.permission_ids.filter((id) => id !== permissionId)
        : [...prev.permission_ids, permissionId],
    }));

    // Clear permission errors when user selects permissions
    setErrors((prev) => ({ ...prev, permissions: '' }));
  };

  const handleSelectAllInCategory = (category: string): void => {
    const categoryPermissions = permissionsByCategory[category];
    const categoryPermissionIds = categoryPermissions.map((p) => p.id);

    const allSelected = categoryPermissionIds.every((id) => formData.permission_ids.includes(id));

    if (allSelected) {
      // Deselect all in category
      setFormData((prev) => ({
        ...prev,
        permission_ids: prev.permission_ids.filter((id) => !categoryPermissionIds.includes(id)),
      }));
    } else {
      // Select all in category
      setFormData((prev) => ({
        ...prev,
        permission_ids: [...new Set([...prev.permission_ids, ...categoryPermissionIds])],
      }));
    }
  };

  const isPermissionSelected = (permissionId: number): boolean => {
    return formData.permission_ids.includes(permissionId);
  };

  const getSelectedPermissionCount = (): number => {
    return formData.permission_ids.length;
  };

  const getCategorySelectedCount = (category: string): number => {
    const categoryPermissions = permissionsByCategory[category];
    return categoryPermissions.filter((p) => formData.permission_ids.includes(p.id)).length;
  };

  const formatPermissionName = (name: string): string => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={role ? 'Edit Role' : 'Create Role'}
      size="xl"
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Basic Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Role Name"
              value={formData.name}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, name: value }));
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              error={errors.name}
              placeholder="Enter role name"
              required
              disabled={isLoading}
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">System Role *</label>
              <select
                value={formData.system_role}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, system_role: e.target.value as SystemRole }));
                  if (errors.system_role) setErrors((prev) => ({ ...prev, system_role: '' }));
                }}
                className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.system_role ? 'border-red-500' : 'border-gray-600'
                }`}
                disabled={isLoading}
              >
                <option value="">Select a system role</option>
                {SYSTEM_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.system_role && <p className="text-sm text-red-400">{errors.system_role}</p>}
              {formData.system_role && (
                <p className="text-xs text-gray-400">
                  {
                    SYSTEM_ROLE_OPTIONS.find((opt) => opt.value === formData.system_role)
                      ?.description
                  }
                </p>
              )}
            </div>
          </div>

          <TextArea
            label="Description"
            value={formData.description}
            onChange={(value) => {
              setFormData((prev) => ({ ...prev, description: value }));
            }}
            placeholder="Enter role description"
            rows={3}
            disabled={isLoading}
          />

          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.is_active}
              onChange={(checked) => {
                setFormData((prev) => ({ ...prev, is_active: checked }));
              }}
              disabled={isLoading}
            />
            <label className="text-sm text-gray-300">Active role</label>
          </div>
        </div>

        {/* Permission Assignment */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">
              Permissions ({getSelectedPermissionCount()} selected)
            </h3>
            {errors.permissions && <p className="text-sm text-red-400">{errors.permissions}</p>}
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <TextField
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search permissions..."
                className="w-full"
                disabled={isLoading}
              />
            </div>
            <div className="sm:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {formatPermissionName(category)} ({permissionsByCategory[category].length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Permission List */}
          <div className="max-h-96 overflow-y-auto border border-gray-600 rounded-lg">
            {selectedCategory === 'all' ? (
              // Show by category
              categories.map((category) => (
                <div key={category} className="border-b border-gray-600 last:border-b-0">
                  <div className="bg-gray-700 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium text-white">{formatPermissionName(category)}</h4>
                      <span className="text-sm text-gray-400">
                        ({getCategorySelectedCount(category)}/
                        {permissionsByCategory[category].length})
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        handleSelectAllInCategory(category);
                      }}
                      disabled={isLoading}
                    >
                      {getCategorySelectedCount(category) === permissionsByCategory[category].length
                        ? 'Deselect All'
                        : 'Select All'}
                    </Button>
                  </div>
                  <div className="p-4 space-y-2">
                    {permissionsByCategory[category].map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-center space-x-3 p-2 rounded hover:bg-gray-600 transition-colors"
                      >
                        <Checkbox
                          checked={isPermissionSelected(permission.id)}
                          onChange={() => {
                            handlePermissionToggle(permission.id);
                          }}
                          disabled={isLoading}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-white">
                            {formatPermissionName(permission.name)}
                          </div>
                          <div className="text-sm text-gray-400">{permission.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              // Show filtered permissions
              <div className="p-4 space-y-2">
                {filteredPermissions.map((permission) => (
                  <div
                    key={permission.id}
                    className="flex items-center space-x-3 p-2 rounded hover:bg-gray-600 transition-colors"
                  >
                    <Checkbox
                      checked={isPermissionSelected(permission.id)}
                      onChange={() => {
                        handlePermissionToggle(permission.id);
                      }}
                      disabled={isLoading}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white">
                        {formatPermissionName(permission.name)}
                      </div>
                      <div className="text-sm text-gray-400">{permission.description}</div>
                      <div className="text-xs text-gray-500">
                        Category: {formatPermissionName(permission.category)}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredPermissions.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    No permissions match your search criteria
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-600">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {isLoading
              ? role
                ? 'Updating...'
                : 'Creating...'
              : role
                ? 'Update Role'
                : 'Create Role'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default RoleEditorModal;
