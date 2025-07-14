import React, { useState, useEffect, useRef } from 'react';

const SYSTEM_ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'org_owner', label: 'Organization Owner' },
  { value: 'devops_admin', label: 'DevOps Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'api_only', label: 'API Only' },
];

/**
 * RoleCreateModal - Modal dialog for creating a new role.
 * Accessibility and UI polish improvements included.
 */
const RoleCreateModal = ({ open, onClose, onCreate, creationLoading = false, creationError = '', onSuccess }: {
  open: boolean;
  onClose: () => void;
  onCreate: (role: { name: string; display_name: string; description?: string; permission_ids?: number[] }) => Promise<void> | void;
  creationLoading?: boolean;
  creationError?: string;
  onSuccess?: () => void;
}) => {
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [permissions, setPermissions] = useState<any[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [permError, setPermError] = useState('');
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Focus trap: focus first input on open
  useEffect(() => {
    if (open && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [open]);

  // Fetch permissions on open
  useEffect(() => {
    if (!open) return;
    setLoadingPerms(true);
    setPermError('');
    fetch('/api/v1/permissions')
      .then(res => res.json())
      .then(data => setPermissions(data))
      .catch(() => setPermError('Failed to load permissions'))
      .finally(() => setLoadingPerms(false));
  }, [open]);

  const handlePermChange = (id: number) => {
    setSelectedPermissions(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('Role type is required');
      return;
    }
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    setError('');
    await onCreate({
      name,
      display_name: displayName.trim(),
      description: description.trim(),
      permission_ids: selectedPermissions
    });
    setName('');
    setDisplayName('');
    setDescription('');
    setSelectedPermissions([]);
    if (onSuccess) onSuccess();
  };

  // Group permissions by category
  const groupedPermissions = permissions.reduce((acc: any, perm: any) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {});

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 transition-opacity duration-200">
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md overflow-y-auto max-h-[90vh] transition-all duration-200 scale-100 animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-create-modal-title"
      >
        <h2 id="role-create-modal-title" className="text-lg font-bold mb-4">Create New Role</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="role-type" className="block font-medium mb-1">Role Type</label>
            <select
              id="role-type"
              className="w-full border rounded px-3 py-2 dark:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              disabled={creationLoading}
            >
              <option value="">Select a role type...</option>
              {SYSTEM_ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="display-name" className="block font-medium mb-1">Display Name</label>
            <input
              id="display-name"
              className="w-full border rounded px-3 py-2 dark:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              disabled={creationLoading}
              ref={firstInputRef}
              autoFocus
            />
          </div>
          <div className="mb-4">
            <label htmlFor="description" className="block font-medium mb-1">Description</label>
            <textarea
              id="description"
              className="w-full border rounded px-3 py-2 dark:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              disabled={creationLoading}
            />
          </div>
          <div className="mb-4">
            <label className="block font-medium mb-1">Permissions</label>
            {loadingPerms ? (
              <div className="text-gray-500">Loading permissions...</div>
            ) : permError ? (
              <div className="text-red-500">{permError}</div>
            ) : (
              <div className="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50 dark:bg-gray-800">
                {Object.keys(groupedPermissions).map(category => (
                  <div key={category} className="mb-2">
                    <div className="font-semibold text-xs text-gray-700 dark:text-gray-300 mb-1">{category}</div>
                    {groupedPermissions[category].map((perm: any) => (
                      <label key={perm.id} className="flex items-center gap-2 text-sm mb-1">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(perm.id)}
                          onChange={() => handlePermChange(perm.id)}
                          disabled={creationLoading}
                          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        />
                        {perm.display_name}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div aria-live="polite">
            {(error || creationError) && <div className="text-red-500 mb-2">{error || creationError}</div>}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              onClick={onClose}
              disabled={creationLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 text-white flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              disabled={creationLoading}
            >
              {creationLoading && <span className="animate-spin mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleCreateModal; 