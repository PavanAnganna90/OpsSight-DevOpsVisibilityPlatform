/**
 * Responsive Design Example for OpsSight
 * 
 * Demonstrates the comprehensive responsive design implementation including:
 * - Mobile-first 3-column dashboard layout
 * - Responsive navigation with functional mobile menu
 * - Touch-optimized interactions
 * - Breakpoint-aware components
 * - Accessibility considerations
 */

'use client';

import React, { useState } from 'react';
import { 
  DashboardGrid, 
  DashboardPanel, 
  DashboardCard, 
  MetricWidget 
} from '@/components/layout/DashboardGrid';
import { useBreakpoint, useTouchInteraction, useReducedMotion } from '@/utils/responsive';
import Navigation from '@/components/Navigation';

/**
 * Responsive Dashboard Example
 * Shows OpsSight's 3-column adaptive layout in action
 */
export function ResponsiveDashboardExample() {
  const { breakpoint, isMobile, isTablet, isDesktop } = useBreakpoint();
  const { touchProps } = useTouchInteraction();
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation with mobile menu */}
      <Navigation />
      
      {/* Main Content */}
      <main className="pt-16 sm:pt-18">
        {/* Page Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2">
              OpsSight Dashboard
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-2xl">
              Monitor and manage your DevOps workflows with responsive design.
              Current breakpoint: <span className="text-cyan-400 font-mono">{breakpoint}</span>
            </p>
          </div>

          {/* Responsive Info Cards */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <DashboardCard variant="accent" accentSide="left">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  📱
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm md:text-base">Device Type</h3>
                  <p className="text-slate-400 text-xs md:text-sm">
                    {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}
                  </p>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard variant="success" accentSide="left">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  ♿
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm md:text-base">Motion</h3>
                  <p className="text-slate-400 text-xs md:text-sm">
                    {prefersReducedMotion ? 'Reduced' : 'Normal'}
                  </p>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard variant="warning" accentSide="left" className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  🎯
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm md:text-base">Touch Ready</h3>
                  <p className="text-slate-400 text-xs md:text-sm">
                    44px+ targets
                  </p>
                </div>
              </div>
            </DashboardCard>
          </div>
        </div>

        {/* Dashboard Grid - OpsSight 3-Column Layout */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <DashboardGrid>
            
            {/* System Pulse Panel (Left on desktop) */}
            <DashboardPanel 
              variant="system-pulse" 
              title="System Pulse"
              icon={<span className="text-xl">🟢</span>}
            >
              <MetricWidget
                icon="🚀"
                name="CI/CD Pipelines"
                value={94}
                status="excellent"
                trend="12 successful deploys today"
                duration="avg 4.2min"
                details="All pipelines healthy. React app deployment completed 2min ago."
              />
              
              <MetricWidget
                icon="☸️"
                name="Kubernetes Pods"
                value={87}
                status="healthy"
                trend="23 pods running"
                duration="2 restarts"
                details="Production cluster stable. Node autoscaling active."
              />
              
              <MetricWidget
                icon="💰"
                name="Cloud Costs"
                value={76}
                status="warning"
                trend="$342/day (+8%)"
                duration="7d trend"
                details="Monthly budget: $8.2k of $10k used. Consider optimizing unused resources."
              />
            </DashboardPanel>

            {/* Command Center Panel (Center/Full-width on tablet) */}
            <DashboardPanel 
              variant="command-center" 
              title="Command Center"
              icon={<span className="text-xl">🎛️</span>}
            >
              {/* Live Events */}
              <DashboardCard className="space-y-4">
                <h3 className="text-white font-medium mb-4 text-sm md:text-base">Live Events & Timeline</h3>
                
                <div className="space-y-3">
                  {[
                    { time: '2min ago', event: 'Production deployment completed', status: 'success' },
                    { time: '15min ago', event: 'Database backup started', status: 'info' },
                    { time: '1hr ago', event: 'Scaling event: +2 nodes', status: 'info' },
                    { time: '3hr ago', event: 'Security scan completed', status: 'success' },
                  ].map((item, index) => (
                    <div 
                      key={index} 
                      className="flex items-center space-x-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30"
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        item.status === 'success' ? 'bg-emerald-400' : 'bg-blue-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs md:text-sm truncate">{item.event}</p>
                        <p className="text-slate-400 text-xs">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* AI Summary */}
                <div className="mt-4 p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <div className="flex items-start space-x-3">
                    <span className="text-lg">🤖</span>
                    <div>
                      <p className="text-cyan-400 font-medium text-xs md:text-sm mb-1">AI Summary</p>
                      <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
                        Systems running smoothly. Deployment pipeline averaged 4.2min today (15% improvement). 
                        No critical alerts in the last 6 hours.
                      </p>
                    </div>
                  </div>
                </div>
              </DashboardCard>

              {/* CPU/Memory Charts */}
              <DashboardCard>
                <h3 className="text-white font-medium mb-4 text-sm md:text-base">Resource Usage</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-slate-400">CPU Usage</span>
                      <span className="text-white">67%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '67%' }} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-slate-400">Memory</span>
                      <span className="text-white">43%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '43%' }} />
                    </div>
                  </div>
                </div>
              </DashboardCard>
            </DashboardPanel>

            {/* Action & Insights Panel (Right on desktop) */}
            <DashboardPanel 
              variant="action-insights" 
              title="Actions & Insights"
              icon={<span className="text-xl">⚡</span>}
            >
              {/* Action Buttons */}
              <DashboardCard>
                <h3 className="text-white font-medium mb-4 text-sm md:text-base">Quick Actions</h3>
                
                <div className="space-y-3">
                  <button 
                    {...touchProps}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-3 md:p-4 rounded-lg font-medium transition-all duration-200 hover:from-cyan-600 hover:to-blue-600 active:scale-95 text-sm md:text-base"
                  >
                    🚀 Deploy to Production
                  </button>
                  
                  <button 
                    {...touchProps}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white p-3 md:p-4 rounded-lg font-medium transition-all duration-200 active:scale-95 text-sm md:text-base"
                  >
                    ↩️ Rollback Last Deploy
                  </button>
                  
                  <button 
                    {...touchProps}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white p-3 md:p-4 rounded-lg font-medium transition-all duration-200 active:scale-95 text-sm md:text-base"
                  >
                    📊 View Logs
                  </button>
                </div>
              </DashboardCard>

              {/* Notifications */}
              <DashboardCard variant="warning" accentSide="left">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    🔔
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-amber-400 font-medium text-xs md:text-sm mb-1">
                      Notification
                    </h4>
                    <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
                      Unused node group detected in us-west-2. Consider scaling down to save $120/month.
                    </p>
                    <button 
                      {...touchProps}
                      className="mt-3 text-amber-400 hover:text-amber-300 font-medium text-xs md:text-sm underline"
                    >
                      Review & Optimize
                    </button>
                  </div>
                </div>
              </DashboardCard>

              {/* AI Suggestions */}
              <DashboardCard variant="accent" accentSide="left">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    💡
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-blue-400 font-medium text-xs md:text-sm mb-1">
                      AI Insight
                    </h4>
                    <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
                      Peak traffic occurs 2-4 PM. Schedule deployments for 10-11 AM to avoid impact.
                    </p>
                  </div>
                </div>
              </DashboardCard>
            </DashboardPanel>
          </DashboardGrid>
        </div>

        {/* Responsive Features Demo */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <DashboardCard>
            <h3 className="text-white font-medium mb-4 text-sm md:text-base">Responsive Features Implemented</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { feature: 'Mobile-First Design', icon: '📱', status: '✅' },
                { feature: 'Breakpoint Detection', icon: '📏', status: '✅' },
                { feature: 'Touch Optimization', icon: '👆', status: '✅' },
                { feature: 'Adaptive Grid Layout', icon: '🏗️', status: '✅' },
                { feature: 'Progressive Enhancement', icon: '⬆️', status: '✅' },
                { feature: 'Accessibility Ready', icon: '♿', status: '✅' },
              ].map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center space-x-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30"
                >
                  <span className="text-lg">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs md:text-sm">{item.feature}</p>
                  </div>
                  <span className="text-emerald-400 text-sm">{item.status}</span>
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>
      </main>
    </div>
  );
}

export default ResponsiveDashboardExample; 