import React from 'react';

/**
 * PermissionAssignment - Assign permissions to a role.
 * Accessibility and UI polish improvements included.
 *
 * Props:
 *   allPermissions: Array<{ id, name, display_name, category }>
 *   assigned: string[] (permission names assigned to the role)
 *   onChange: (updated: string[]) => void
 *   loading?: boolean (disable checkboxes when true)
 *   error?: string
 */
const PermissionAssignment = ({
  allPermissions = [],
  assigned = [],
  onChange,
  loading = false,
  error = '',
}: {
  allPermissions: Array<{ id: number; name: string; display_name: string; category: string }>;
  assigned: string[];
  onChange: (updated: string[]) => void;
  loading?: boolean;
  error?: string;
}) => {
  // Group permissions by category
  const grouped = allPermissions.reduce((acc: any, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {});

  const handleToggle = (permName: string) => {
    if (assigned.includes(permName)) {
      onChange(assigned.filter(n => n !== permName));
    } else {
      onChange([...assigned, permName]);
    }
  };

  return (
    <div>
      {Object.keys(grouped).length === 0 ? (
        <div className="text-gray-500">No permissions available.</div>
      ) : (
        <div className="max-h-60 overflow-y-auto border rounded p-2 bg-gray-50 dark:bg-gray-800">
          {Object.keys(grouped).map(category => (
            <div key={category} className="mb-2">
              <div className="font-semibold text-xs text-gray-700 dark:text-gray-300 mb-1">{category}</div>
              {grouped[category].map((perm: any) => (
                <label key={perm.id} htmlFor={`perm-checkbox-${perm.id}`} className="flex items-center gap-2 text-sm mb-1">
                  <input
                    id={`perm-checkbox-${perm.id}`}
                    type="checkbox"
                    checked={assigned.includes(perm.name)}
                    onChange={() => handleToggle(perm.name)}
                    disabled={loading}
                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                  {perm.display_name}
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
      <div aria-live="polite">
        {error && <div className="text-red-500 mt-2">{error}</div>}
      </div>
    </div>
  );
};

export default PermissionAssignment; 