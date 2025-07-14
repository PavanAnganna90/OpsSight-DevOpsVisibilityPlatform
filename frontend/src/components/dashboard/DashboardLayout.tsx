'use client';

import React from 'react';
import { TopNavigation } from './TopNavigation';
import SystemPulsePanel from './SystemPulsePanel';
import CommandCenterPanel from './CommandCenterPanel';
import ActionInsightsPanel from './ActionInsightsPanel';

interface DashboardLayoutProps {
  children?: React.ReactNode;
  className?: string;
}

/**
 * Main dashboard layout component following the 3-column adaptive design.
 * Implements the cockpit-style information hierarchy: Overview → Drill-down → Action
 */
export function DashboardLayout({ children, className = '' }: DashboardLayoutProps) {
  return (
    <div className={`min-h-screen bg-background text-foreground ${className}`}>
      <TopNavigation />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6">
          {/* 3-column adaptive layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Panel - System Pulse (3 columns) */}
            <div className="lg:col-span-3">
              <SystemPulsePanel />
            </div>
            
            {/* Center Panel - Command Center (6 columns) */}
            <div className="lg:col-span-6">
              <CommandCenterPanel />
              {children}
            </div>
            
            {/* Right Panel - Action & Insights (3 columns) */}
            <div className="lg:col-span-3">
              <ActionInsightsPanel />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 