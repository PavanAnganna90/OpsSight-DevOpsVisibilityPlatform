'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface DashboardGridProps {
  children: React.ReactNode;
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
}

interface DashboardPanelProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'system-pulse' | 'command-center' | 'action-insights';
  title?: string;
  icon?: React.ReactNode;
}

/**
 * DashboardGrid - Implements OpsSight 3-column adaptive layout with mobile-first responsive design
 * Layout: 
 * - Mobile (xs-sm): Single column stack
 * - Tablet (md-lg): 2-column with command center spanning full width
 * - Desktop (xl+): 3-column layout - Left (System Pulse) | Center (Command Center) | Right (Action & Insights)
 * Philosophy: Overview → Drill-down → Action
 */
export function DashboardGrid({ children, className, gap = 'lg' }: DashboardGridProps) {
  const gapClasses = {
    sm: 'gap-3 md:gap-4',
    md: 'gap-4 md:gap-6', 
    lg: 'gap-6 md:gap-8'
  };

  return (
    <div className={cn(
      // Mobile-first: single column
      'grid grid-cols-1',
      // Tablet: 2-column grid for side panels, command center spans full
      'md:grid-cols-2',
      // Desktop: 12-column grid for precise control
      'xl:grid-cols-12',
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
}

/**
 * DashboardPanel - Reusable panel component for dashboard sections
 * Implements responsive behavior with mobile-first approach and optimal layouts for each breakpoint
 */
export function DashboardPanel({ 
  children, 
  className, 
  variant = 'command-center',
  title,
  icon
}: DashboardPanelProps) {
  const variantClasses = {
    // System Pulse: Mobile full-width, tablet left column, desktop left 3 columns
    'system-pulse': 'col-span-1 md:col-span-1 xl:col-span-3 order-1 md:order-1 xl:order-1',
    // Command Center: Mobile full-width, tablet spans both columns, desktop center 6 columns
    'command-center': 'col-span-1 md:col-span-2 xl:col-span-6 order-2 md:order-3 xl:order-2', 
    // Action Insights: Mobile full-width, tablet right column, desktop right 3 columns
    'action-insights': 'col-span-1 md:col-span-1 xl:col-span-3 order-3 md:order-2 xl:order-3'
  };

  return (
    <div className={cn(variantClasses[variant], className)}>
      {title && (
        <div className="mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-semibold text-white flex items-center">
            {icon && <span className="mr-2 flex-shrink-0">{icon}</span>}
            <span className="truncate">{title}</span>
          </h2>
        </div>
      )}
      <div className="space-y-4 md:space-y-6">
        {children}
      </div>
    </div>
  );
}

/**
 * DashboardCard - Base card component with responsive styling
 * Implements OpsSight design language with mobile-optimized spacing and interactions
 */
interface DashboardCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'accent' | 'warning' | 'success' | 'error';
  hoverable?: boolean;
  accentSide?: 'left' | 'top' | 'none';
}

export function DashboardCard({ 
  children, 
  className,
  variant = 'default',
  hoverable = true,
  accentSide = 'none'
}: DashboardCardProps) {
  const variantClasses = {
    default: 'bg-slate-800/40 border-slate-700/50',
    accent: 'bg-slate-800/40 border-blue-500/30',
    warning: 'bg-slate-800/40 border-amber-500/30',
    success: 'bg-slate-800/40 border-emerald-500/30',
    error: 'bg-slate-800/40 border-red-500/30'
  };

  const accentClasses = {
    left: {
      default: '',
      accent: 'border-l-4 border-l-blue-500',
      warning: 'border-l-4 border-l-amber-500',
      success: 'border-l-4 border-l-emerald-500',
      error: 'border-l-4 border-l-red-500'
    },
    top: {
      default: '',
      accent: 'border-t-4 border-t-blue-500',
      warning: 'border-t-4 border-t-amber-500',
      success: 'border-t-4 border-t-emerald-500',
      error: 'border-t-4 border-t-red-500'
    },
    none: {
      default: '',
      accent: '',
      warning: '',
      success: '',
      error: ''
    }
  };

  const hoverClasses = hoverable 
    ? 'hover:bg-slate-800/60 hover:border-slate-600/50 md:hover:scale-105 transition-all duration-300 transform cursor-pointer active:scale-95'
    : '';

  return (
    <div className={cn(
      // Mobile-first responsive padding and border radius
      'backdrop-blur-sm rounded-lg md:rounded-xl lg:rounded-2xl border',
      'p-4 md:p-5 lg:p-6',
      // Touch-friendly spacing on mobile
      'min-h-[44px]', // Minimum touch target size
      variantClasses[variant],
      accentClasses[accentSide][variant],
      hoverClasses,
      className
    )}>
      {children}
    </div>
  );
}

/**
 * MetricWidget - Specialized component for system metrics with responsive design
 * Implements progress rings and behavioral psychology principles with mobile-optimized layout
 */
interface MetricWidgetProps {
  name: string;
  value: number;
  status: 'excellent' | 'healthy' | 'warning' | 'critical';
  trend: string;
  duration?: string;
  details?: string;
  icon?: string;
}

export function MetricWidget({
  name,
  value,
  status,
  trend,
  duration,
  details,
  icon
}: MetricWidgetProps) {
  const statusColors = {
    excellent: 'emerald',
    healthy: 'blue', 
    warning: 'amber',
    critical: 'red'
  };

  const statusColor = statusColors[status];

  return (
    <DashboardCard 
      variant={status === 'excellent' ? 'success' : status === 'warning' ? 'warning' : status === 'critical' ? 'error' : 'accent'}
      accentSide="left"
      className="hover:shadow-2xl"
    >
      {/* Mobile-optimized header */}
      <div className="flex items-center justify-between mb-3">
        {icon && <span className="text-xl md:text-2xl flex-shrink-0">{icon}</span>}
        <div className={`text-xs px-2 py-1 rounded-full bg-${statusColor}-500/20 text-${statusColor}-400 border border-${statusColor}-500/30 whitespace-nowrap`}>
          {status}
        </div>
      </div>
      
      <h3 className="text-white font-medium mb-2 text-sm md:text-base truncate">{name}</h3>
      
      {/* Responsive progress ring layout */}
      <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-3">
        {/* Progress Ring - Smaller on mobile */}
        <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0 mx-auto sm:mx-0">
          <svg className="w-10 h-10 md:w-12 md:h-12 transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-700"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={`text-${statusColor}-500`}
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${value}, 100`}
              strokeLinecap="round"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              style={{
                transition: 'stroke-dasharray 0.6s ease-in-out'
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-${statusColor}-400 font-bold text-xs md:text-sm`}>
              {value}%
            </span>
          </div>
        </div>

        {/* Metric details - Stack on mobile, inline on tablet+ */}
        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="text-slate-300 text-xs md:text-sm">
            {trend}
          </div>
          {duration && (
            <div className="text-slate-400 text-xs">
              {duration}
            </div>
          )}
        </div>
      </div>

      {/* Additional details - Responsive text size */}
      {details && (
        <div className="text-slate-400 text-xs md:text-sm leading-relaxed">
          {details}
        </div>
      )}
    </DashboardCard>
  );
}

// Export individual components
export { DashboardGrid as default }; 