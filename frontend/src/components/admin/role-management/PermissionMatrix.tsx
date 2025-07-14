import React, { useState, useEffect } from 'react';
import { Permission } from '../../../types/role';

interface PermissionMatrixProps {
  permissions: Permission[];
  setPermissions: (perms: Permission[]) => void;
}

/**
 * UI for assigning permissions to a role.
 */
const PermissionMatrix: React.FC<PermissionMatrixProps> = ({ permissions, setPermissions }) => {
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all permissions from API
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await fetch('/api/v1/permissions');
        if (!response.ok) {
          throw new Error('Failed to fetch permissions');
        }
        const data = await response.json();
        setAllPermissions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);
  const togglePermission = (perm: Permission) => {
    if (permissions.some(p => p.id === perm.id)) {
      setPermissions(permissions.filter(p => p.id !== perm.id));
    } else {
      setPermissions([...permissions, perm]);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-6 bg-gray-300 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600">Error loading permissions: {error}</div>;
  }

  // Group permissions by category
  const groupedPermissions = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-4">
      {Object.entries(groupedPermissions).map(([category, perms]) => (
        <div key={category}>
          <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
            {category.replace('_', ' ')}
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {perms.map(perm => (
              <label key={perm.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={permissions.some(p => p.id === perm.id)}
                  onChange={() => togglePermission(perm)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">{perm.description}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PermissionMatrix;
