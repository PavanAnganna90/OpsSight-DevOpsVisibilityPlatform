/**
 * Dashboard Sidebar Component
 * 
 * Provides navigation menu for the OpsSight dashboard with
 * responsive design and accessibility features.
 */

import React from 'react';

interface NavigationItem {
  /** Unique identifier for the navigation item */
  id: string;
  /** Display name for the navigation item */
  name: string;
  /** URL or route path */
  href: string;
  /** Icon component or SVG element */
  icon: React.ComponentType<{ className?: string }>;
  /** Whether this item is currently active */
  current?: boolean;
  /** Optional badge count for notifications */
  badge?: number;
  /** Accessible description */
  description?: string;
}

interface DashboardSidebarProps {
  /** Optional className for custom styling */
  className?: string;
  /** Optional click handler for mobile menu close */
  onItemClick?: () => void;
}

/**
 * Icon Components for Navigation
 */
const DashboardIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0a2 2 0 01-2 2H10a2 2 0 01-2-2v0z" />
  </svg>
);

const PipelinesIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const DeploymentsIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const MonitoringIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const AlertsIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const SettingsIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

/**
 * Navigation items configuration
 */
const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    href: '/dashboard',
    icon: DashboardIcon,
    current: true,
    description: 'Main dashboard overview'
  },
  {
    id: 'pipelines',
    name: 'Pipelines',
    href: '/pipelines',
    icon: PipelinesIcon,
    current: false,
    badge: 2,
    description: 'CI/CD pipeline status and management'
  },
  {
    id: 'deployments',
    name: 'Deployments',
    href: '/deployments',
    icon: DeploymentsIcon,
    current: false,
    description: 'Application deployment tracking'
  },
  {
    id: 'monitoring',
    name: 'Monitoring',
    href: '/monitoring',
    icon: MonitoringIcon,
    current: false,
    description: 'System metrics and performance monitoring'
  },
  {
    id: 'alerts',
    name: 'Alerts',
    href: '/alerts',
    icon: AlertsIcon,
    current: false,
    badge: 5,
    description: 'System alerts and notifications'
  },
  {
    id: 'settings',
    name: 'Settings',
    href: '/settings',
    icon: SettingsIcon,
    current: false,
    description: 'Application settings and configuration'
  },
];

/**
 * DashboardSidebar Component
 * 
 * Navigation sidebar for the OpsSight dashboard providing:
 * - Primary navigation menu
 * - Visual indicators for active pages
 * - Badge notifications for items requiring attention
 * - Responsive design with mobile support
 * - Accessibility compliance (WCAG 2.1)
 * - Keyboard navigation support
 * 
 * @param className - Optional CSS classes for custom styling
 * @param onItemClick - Optional callback for navigation item clicks (useful for mobile)
 */
export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  className = '',
  onItemClick,
}) => {
  /**
   * Handle navigation item click
   */
  const handleItemClick = (item: NavigationItem): void => {
    // Handle navigation logic here (e.g., router navigation)
    console.log(`Navigate to: ${item.href}`);
    
    // Call optional callback (useful for closing mobile menu)
    if (onItemClick) {
      onItemClick();
    }
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (event: React.KeyboardEvent, item: NavigationItem): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleItemClick(item);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 ${className}`}>
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Navigation
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          OpsSight Dashboard
        </p>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto" aria-label="Main navigation">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          
          return (
            <div key={item.id}>
              <button
                type="button"
                onClick={() => handleItemClick(item)}
                onKeyDown={(e) => handleKeyDown(e, item)}
                className={`
                  group flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg
                  transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${item.current
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                  }
                `}
                aria-current={item.current ? 'page' : undefined}
                aria-describedby={`${item.id}-description`}
                title={item.description}
              >
                {/* Icon */}
                <IconComponent 
                  className={`
                    flex-shrink-0 h-5 w-5 mr-3
                    ${item.current
                      ? 'text-blue-500 dark:text-blue-300'
                      : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300'
                    }
                  `}
                />
                
                {/* Label */}
                <span className="flex-1 text-left">{item.name}</span>
                
                {/* Badge */}
                {item.badge && item.badge > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>

              {/* Screen reader description */}
              <span id={`${item.id}-description`} className="sr-only">
                {item.description}
              </span>
            </div>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          <p>OpsSight v1.0.0</p>
          <p className="mt-1">DevOps Monitoring Platform</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardSidebar; 