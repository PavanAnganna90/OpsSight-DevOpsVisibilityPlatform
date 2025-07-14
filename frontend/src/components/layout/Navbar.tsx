import React, { useState } from 'react';
import SettingsModal from '../ui/SettingsModal';

export default function Navbar() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <nav className="...">
      {/* ...existing navbar content... */}
      <div className="flex items-center gap-2">
        {/* ...other right-side controls... */}
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Open dashboard settings"
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
        >
          <span role="img" aria-label="Settings">⚙️</span>
        </button>
      </div>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </nav>
  );
} 