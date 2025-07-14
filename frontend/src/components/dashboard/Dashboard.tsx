/**
 * Main Dashboard component for the OpsSight DevOps monitoring platform.
 * Provides the foundational layout structure with responsive grid system.
 */

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';
import { usePermissionState } from '../../hooks/usePermissions';
import { PermissionGuard } from '../rbac/PermissionGuard';
import DashboardHeader from './layout/DashboardHeader';
import DashboardSidebar from './layout/DashboardSidebar';
import DashboardContent from './layout/DashboardContent';
import SystemPulsePanel from './SystemPulsePanel';
import CommandCenterPanel from './CommandCenterPanel';
import ActionInsightsPanel from './ActionInsightsPanel';
import { motion } from 'framer-motion';

interface DashboardProps {
  /** Optional className for custom styling */
  className?: string;
}

const panelVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.15, duration: 0.6, type: 'spring', bounce: 0.18 },
  }),
};

/**
 * Dashboard Component
 * 
 * Main dashboard layout providing the foundational structure for the OpsSight
 * monitoring platform. Uses CSS Grid for responsive layout organization.
 * 
 * Features:
 * - Responsive grid layout with header, sidebar, and main content areas
 * - Integration with authentication context
 * - Mobile-first responsive design
 * - Accessibility compliance (WCAG 2.1)
 * - Support for theme switching
 * 
 * Layout Structure:
 * ```
 * ┌─────────────────────────────────┐
 * │            Header               │
 * ├─────────┬───────────────────────┤
 * │ Sidebar │    Main Content       │
 * │         │                       │
 * │         │                       │
 * └─────────┴───────────────────────┘
 * ```
 * 
 * @param className - Optional CSS classes for custom styling
 */
export const Dashboard: React.FC<DashboardProps> = ({
  className = '',
}) => {
  const { state } = useAuth();
  const { isMobile } = useResponsive();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const permissionState = usePermissionState();

  /**
   * Toggle mobile menu visibility
   */
  const toggleMobileMenu = (): void => {
    setIsMobileMenuOpen(prev => !prev);
  };

  /**
   * Close mobile menu
   */
  const closeMobileMenu = (): void => {
    setIsMobileMenuOpen(false);
  };

  // Redirect to login if not authenticated (should be handled by route protection)
  if (!state.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            Please log in to access the dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 ${className}`}
      role="main"
      aria-label="OpsSight Dashboard"
    >
      {/* Dashboard Grid Layout */}
      <div className="grid grid-rows-[auto_1fr] lg:grid-cols-[250px_1fr] min-h-screen">
        {/* Header - spans full width on mobile, right column on desktop */}
        <header className="lg:col-span-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
          <DashboardHeader />
        </header>

        {/* Sidebar - hidden on mobile, visible on desktop */}
        <aside className="hidden lg:block bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <DashboardSidebar />
        </aside>

        {/* Main Content Area */}
        <main 
          className="flex-1 overflow-y-auto p-4 lg:p-6 focus:outline-none"
          tabIndex={-1}
          aria-label="Dashboard main content"
        >
          {/* Welcome Section with Role Context */}
          <div className="mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome back, {state.user?.full_name || state.user?.github_username}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {permissionState.hasAnyAdminRole 
                  ? 'Administrator Dashboard - Full system access'
                  : permissionState.hasAnyManagerRole
                  ? 'Management Dashboard - Team oversight and reporting'
                  : permissionState.hasAnyDevOpsRole
                  ? 'DevOps Dashboard - Infrastructure and deployment monitoring'
                  : 'Dashboard - Your assigned resources and metrics'
                }
              </p>
              {state.user?.roles && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Active roles:</span>
                  <div className="flex space-x-2">
                    {state.user.roles.slice(0, 3).map((role, index) => (
                      <span 
                        key={role.id}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        {role.display_name}
                      </span>
                    ))}
                    {state.user.roles.length > 3 && (
                      <span className="text-xs text-gray-500">+{state.user.roles.length - 3} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dashboard Panels with Permission Guards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left: System Pulse - Monitoring Permission Required */}
            <PermissionGuard 
              permission="view_monitoring"
              fallback={
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center">
                  <p className="text-gray-500 dark:text-gray-400">Monitoring access restricted</p>
                </div>
              }
            >
              <motion.div
                custom={0}
                initial="hidden"
                animate="visible"
                variants={panelVariants}
              >
                <SystemPulsePanel />
              </motion.div>
            </PermissionGuard>

            {/* Center: Command Center - Infrastructure Permission Required */}
            <PermissionGuard 
              permission="view_infrastructure"
              fallback={
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center">
                  <p className="text-gray-500 dark:text-gray-400">Infrastructure access restricted</p>
                </div>
              }
            >
              <motion.div
                custom={1}
                initial="hidden"
                animate="visible"
                variants={panelVariants}
              >
                <CommandCenterPanel />
              </motion.div>
            </PermissionGuard>

            {/* Right: Actions & Insights - General Dashboard Permission */}
            <PermissionGuard 
              permission="view_dashboard"
              fallback={
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center">
                  <p className="text-gray-500 dark:text-gray-400">Dashboard insights restricted</p>
                </div>
              }
            >
              <motion.div
                custom={2}
                initial="hidden"
                animate="visible"
                variants={panelVariants}
              >
                <ActionInsightsPanel />
              </motion.div>
            </PermissionGuard>
          </div>

          {/* Admin Quick Actions - Admin Only */}
          <PermissionGuard roles={['admin', 'organization_owner', 'super_admin']}>
            <div className="mt-8">
              <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
                <h2 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-4">
                  Administrator Quick Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <h3 className="font-medium text-red-900 dark:text-red-200">User Management</h3>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">Manage users and permissions</p>
                  </button>
                  <button className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <h3 className="font-medium text-red-900 dark:text-red-200">System Settings</h3>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">Configure system parameters</p>
                  </button>
                  <button className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <h3 className="font-medium text-red-900 dark:text-red-200">Audit Logs</h3>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">Review system activity</p>
                  </button>
                </div>
              </div>
            </div>
          </PermissionGuard>
        </main>
      </div>

      {/* Mobile Sidebar Overlay - shown when sidebar is open on mobile */}
      <div 
        className="fixed inset-0 z-50 lg:hidden bg-black bg-opacity-50 transition-opacity duration-300 opacity-0 pointer-events-none"
        aria-hidden="true"
        role="presentation"
      >
        <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-xl transform -translate-x-full transition-transform duration-300">
          <DashboardSidebar />
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 