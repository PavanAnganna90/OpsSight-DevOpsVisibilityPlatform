import React from 'react';

/**
 * LoadingSpinner - Minimal spinner for loading states in OpsSight UI.
 * Uses Tailwind CSS for animation and styling.
 */
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default LoadingSpinner; 