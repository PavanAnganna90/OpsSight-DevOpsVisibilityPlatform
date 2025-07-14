import React, { useState, useEffect } from 'react';

/**
 * RoleDetail - Editable details for a role (display name, description).
 * Accessibility and UI polish improvements included.
 *
 * Props:
 *   role: { id, display_name, description, ... }
 *   onSave: (updated) => void
 *   onCancel: () => void
 *   loading?: boolean
 */
const RoleDetail = ({ role, onSave, onCancel, loading = false }: {
  role: any;
  onSave: (updated: { display_name: string; description?: string }) => void;
  onCancel: () => void;
  loading?: boolean;
}) => {
  const [displayName, setDisplayName] = useState(role.display_name || '');
  const [description, setDescription] = useState(role.description || '');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setDisplayName(role.display_name || '');
    setDescription(role.description || '');
    setEditing(false);
  }, [role]);

  const handleSave = () => {
    onSave({ display_name: displayName.trim(), description: description.trim() });
    setEditing(false);
  };

  if (!role) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded shadow p-4">
      <h3 className="font-bold mb-2">Role Details</h3>
      <div className="mb-4">
        <label htmlFor="role-detail-display-name" className="block font-medium mb-1">Display Name</label>
        <input
          id="role-detail-display-name"
          className="w-full border rounded px-3 py-2 dark:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          disabled={!editing || loading}
        />
      </div>
      <div className="mb-4">
        <label htmlFor="role-detail-description" className="block font-medium mb-1">Description</label>
        <textarea
          id="role-detail-description"
          className="w-full border rounded px-3 py-2 dark:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          disabled={!editing || loading}
        />
      </div>
      {!editing ? (
        <button
          className="px-4 py-2 rounded bg-blue-600 text-white mr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          onClick={() => setEditing(true)}
          disabled={loading}
        >
          Edit
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded bg-green-600 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={handleSave}
            disabled={loading}
          >
            Save
          </button>
          <button
            className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={() => { setEditing(false); setDisplayName(role.display_name || ''); setDescription(role.description || ''); onCancel(); }}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default RoleDetail; 