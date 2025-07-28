'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  GitBranch,
  AlertCircle,
  Activity,
  Server,
  Users,
  Settings,
  ChevronLeft,
  Menu,
  X,
  Zap,
  TrendingUp,
  Shield,
  Code,
  Layers,
  BarChart3,
  Bell,
  Search,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardShellProps {
  children: React.ReactNode;
  activeView?: string;
  onViewChange?: (view: string) => void;
}

interface NavItem {
  label: string;
  href?: string;
  viewId?: string;
  icon: React.ElementType;
  badge?: string;
  description?: string;
  isTabNavigation?: boolean;
}

const navigation: NavItem[] = [
  {
    label: 'Overview',
    viewId: 'overview',
    icon: LayoutDashboard,
    description: 'System health and metrics',
    isTabNavigation: true
  },
  {
    label: 'Pipelines',
    viewId: 'pipelines',
    icon: GitBranch,
    badge: '3',
    description: 'CI/CD pipeline status',
    isTabNavigation: true
  },
  {
    label: 'Infrastructure',
    viewId: 'infrastructure',
    icon: Server,
    description: 'Kubernetes & cloud resources',
    isTabNavigation: true
  },
  {
    label: 'Monitoring',
    viewId: 'monitoring',
    icon: Activity,
    description: 'Real-time system monitoring',
    isTabNavigation: true
  },
  {
    label: 'Alerts',
    viewId: 'incidents',
    icon: AlertCircle,
    badge: '5',
    description: 'Incidents and notifications',
    isTabNavigation: true
  },
  {
    label: 'Analytics',
    viewId: 'analytics',
    icon: BarChart3,
    description: 'Performance insights',
    isTabNavigation: true
  },
  {
    label: 'Teams',
    viewId: 'team',
    icon: Users,
    description: 'Team collaboration',
    isTabNavigation: true
  },
  {
    label: 'Security',
    viewId: 'security',
    icon: Shield,
    description: 'Security posture',
    isTabNavigation: true
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Platform configuration',
    isTabNavigation: false
  }
];

const quickActions = [
  { label: 'Deploy', icon: Zap, color: 'text-green-500' },
  { label: 'Scale', icon: TrendingUp, color: 'text-blue-500' },
  { label: 'Secure', icon: Shield, color: 'text-purple-500' },
  { label: 'Debug', icon: Code, color: 'text-orange-500' }
];

export function DashboardShell({ children, activeView, onViewChange }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 transition-all duration-300 shadow-xl",
          sidebarCollapsed ? "w-16" : "w-72",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">OpsSight</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Platform Control</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden h-8 w-8 p-0"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="hidden lg:flex h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronLeft className={cn(
              "h-4 w-4 transition-transform duration-300",
              sidebarCollapsed && "rotate-180"
            )} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = item.isTabNavigation 
              ? activeView === item.viewId 
              : pathname === item.href;
            
            const handleClick = () => {
              if (item.isTabNavigation && item.viewId && onViewChange) {
                onViewChange(item.viewId);
              }
            };

            const commonClassName = cn(
              "group relative flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200",
              "hover:bg-slate-50 dark:hover:bg-slate-800/50",
              isActive && "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 text-blue-700 dark:text-blue-300 shadow-sm",
              !isActive && "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
            );

            const content = (
              <>
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200",
                    isActive 
                      ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 shadow-sm" 
                      : "bg-transparent group-hover:bg-slate-100 dark:group-hover:bg-slate-700/50",
                    sidebarCollapsed && "mx-auto"
                  )}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {!sidebarCollapsed && item.badge && (
                  <div className="flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full shadow-sm">
                    {item.badge}
                  </div>
                )}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-r-full"></div>
                )}
              </>
            );

            return item.isTabNavigation ? (
              <button
                key={item.viewId}
                onClick={handleClick}
                className={commonClassName}
              >
                {content}
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href!}
                className={commonClassName}
              >
                {content}
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3 px-1">Quick Actions</div>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  className="group flex items-center space-x-2 p-2.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-all duration-200 shadow-sm hover:shadow-md border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-white dark:bg-slate-800 shadow-sm group-hover:shadow-md transition-all duration-200">
                    <action.icon className={cn("h-4 w-4", action.color)} />
                  </div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        sidebarCollapsed ? "lg:ml-16" : "lg:ml-72"
      )}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden h-9 w-9 p-0"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              {/* Search Bar */}
              <div className="hidden md:flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 min-w-96">
                <Search className="h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search dashboards, metrics, alerts..."
                  className="bg-transparent border-0 outline-none text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 flex-1"
                />
                <kbd className="inline-flex items-center rounded border border-slate-200 dark:border-slate-700 px-1 font-mono text-xs text-slate-400">⌘K</kbd>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Status Indicator */}
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 rounded-full border border-green-200 dark:border-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">All Systems Operational</span>
              </div>
              
              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0">
                <Bell className="h-5 w-5" />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">3</div>
              </Button>
              
              {/* User Menu */}
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 bg-slate-50/50 dark:bg-slate-900/50">
          {children}
        </main>
      </div>
    </div>
  );
}