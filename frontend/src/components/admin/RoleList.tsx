import React, { useState, useEffect, useRef } from 'react';

/**
 * RoleList - List of roles with advanced keyboard navigation and accessibility.
 *
 * Props:
 *   roles: array of role objects
 *   onSelect: function(role)
 */
const RoleList = ({ roles = [], onSelect }: { roles?: any[]; onSelect: (role: any) => void }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  // Reset active index if roles change
  useEffect(() => {
    setActiveIdx(0);
  }, [roles?.length]);

  // Focus the active item when activeIdx changes
  useEffect(() => {
    if (listRef.current && roles && roles.length > 0) {
      const item = listRef.current.querySelectorAll('[role="option"]')[activeIdx] as HTMLElement;
      if (item) item.focus();
    }
  }, [activeIdx, roles]);

  if (!roles || roles.length === 0) {
    return (
      <div aria-live="polite" className="text-gray-500 p-4 text-center">
        No roles found. Create a new role to get started.
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!roles || roles.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(idx => (idx + 1) % roles.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(idx => (idx - 1 + roles.length) % roles.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(roles[activeIdx]);
    }
  };

  return (
    <ul
      ref={listRef}
      className="divide-y divide-gray-200 dark:divide-gray-700"
      role="listbox"
      aria-activedescendant={roles[activeIdx]?.id ? `role-option-${roles[activeIdx].id}` : undefined}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {roles.map((role, idx) => (
        <li
          key={role.id}
          id={`role-option-${role.id}`}
          role="option"
          aria-selected={activeIdx === idx}
          tabIndex={activeIdx === idx ? 0 : -1}
          className={
            `py-2 px-3 cursor-pointer rounded ` +
            (activeIdx === idx
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-white focus-visible:ring-2 focus-visible:ring-blue-500'
              : 'hover:bg-blue-50 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500')
          }
          onClick={() => onSelect(role)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') onSelect(role);
          }}
          onFocus={() => setActiveIdx(idx)}
        >
          <span className="font-medium">{role.display_name || role.name}</span>
        </li>
      ))}
    </ul>
  );
};

export default RoleList; 