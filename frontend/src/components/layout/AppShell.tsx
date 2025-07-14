import React from 'react';
import Navbar from '../common/Navbar';
import Toast from '../common/Toast';

/**
 * AppShell - Main layout wrapper for OpsSight UI.
 * Includes Navbar, optional sidebar, and main content area.
 * Applies background, padding, and dark mode support.
 * Accepts children as the main content.
 */
const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#fefefc] dark:bg-gray-950 text-gray-800 dark:text-white flex flex-col">
      <Navbar />
      {/* Sidebar placeholder - to be implemented */}
      {/* <Sidebar /> */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
      {/* Toast/notification area - can be controlled via context or props */}
      <Toast message="Welcome to OpsSight!" />
    </div>
  );
};

export default AppShell; 