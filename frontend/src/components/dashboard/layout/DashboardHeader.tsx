/**
 * Dashboard Header Component
 * 
 * Provides the top navigation bar for the OpsSight dashboard including
 * user profile, theme toggle, and responsive navigation controls.
 */

import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import UserProfile from '../../auth/UserProfile';
import TeamSwitcher from '../TeamSwitcher';

interface DashboardHeaderProps {
  /** Optional className for custom styling */
  className?: string;
}

/**
 * DashboardHeader Component
 * 
 * Top navigation header for the dashboard containing:
 * - OpsSight branding and logo
 * - User profile with dropdown menu
 * - Theme toggle switch
 * - Mobile menu toggle button
 * - Breadcrumb navigation
 * 
 * Features:
 * - Responsive design with mobile hamburger menu
 * - Theme switching support
 * - User authentication integration
 * - Accessibility compliance (WCAG 2.1)
 * - Keyboard navigation support
 * 
 * @param className - Optional CSS classes for custom styling
 */
export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  className = '',
}) => {
  const { state } = useAuth();
  const { toggleColorMode, isDark } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  /**
   * Toggle mobile menu visibility
   */
  const toggleMobileMenu = (): void => {
    setIsMobileMenuOpen(prev => !prev);
  };

  /**
   * Handle keyboard navigation for mobile menu toggle
   */
  const handleMobileMenuKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleMobileMenu();
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left Section - Logo and Mobile Menu Toggle */}
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Toggle */}
            <button
              type="button"
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors duration-200"
              onClick={toggleMobileMenu}
              onKeyDown={handleMobileMenuKeyDown}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-sidebar"
              aria-label="Toggle navigation menu"
            >
              <span className="sr-only">Open main menu</span>
              {/* Hamburger Icon */}
              <svg 
                className="h-6 w-6" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 6h16M4 12h16M4 18h16" 
                />
              </svg>
            </button>

            {/* Logo and Brand */}
            <div className="flex items-center space-x-3">
              {/* OpsSight Logo */}
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">O</span>
                </div>
              </div>
              
              {/* Brand Text */}
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  OpsSight
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  DevOps Monitoring
                </p>
              </div>
            </div>
          </div>

          {/* Center Section - Team Switcher and Breadcrumb */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Team Switcher */}
            <TeamSwitcher 
              onManageTeams={() => {
                // Navigate to teams management page
                // This will be implemented when we add routing
                console.log('Navigate to team management');
              }}
            />
            
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <span>Dashboard</span>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path 
                  fillRule="evenodd" 
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" 
                  clipRule="evenodd" 
                />
              </svg>
              <span className="text-gray-900 dark:text-white">Overview</span>
            </div>
          </div>

          {/* Right Section - Theme Toggle and User Profile */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleColorMode}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Notifications Button */}
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 relative"
              aria-label="View notifications"
              title="Notifications"
            >
              <svg 
                className="h-5 w-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
                />
              </svg>
              {/* Notification Badge */}
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-medium">3</span>
              </span>
            </button>

            {/* User Profile */}
            {state.user && (
              <UserProfile 
                variant="compact"
                showLogout={true}
                className="ml-3"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader; 