'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLiveData } from '../../hooks/useLiveData';
import { useToast } from '../../components/ui/Toast';
import { LoadingOverlay, SkeletonMetric, SkeletonChart } from '../../components/ui/LoadingStates';
import { OpsCopilot } from '../../components/ai/OpsCopilot';
import PipelineExecutionView from '../../components/dashboard/PipelineExecutionView';
import { DashboardGrid, DashboardPanel, DashboardCard, MetricWidget } from '../../components/layout';
import { PermissionGuard } from '../../components/rbac/PermissionGuard';
import { withPermissions } from '../../components/rbac/withPermissions';

/**
 * OpsSight Dashboard - Pilot Cockpit Design
 * Layout: Left (System Pulse) | Center (Command Center) | Right (Action & Insights)
 * Philosophy: Overview → Drill-down → Action
 */
function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOpsCopilotOpen, setIsOpsCopilotOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { systemPulse, liveEvents } = useLiveData();
  const { addToast } = useToast();

  useEffect(() => {
    // Simulate initial loading - only once when component mounts
    const loadDashboard = async () => {
      if (!isLoaded) {  // Only load if not already loaded
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsLoaded(true);
        setIsLoading(false);
        
        // Show welcome toast only once
        addToast({
          type: 'success',
          title: 'Dashboard Loaded',
          description: 'All systems data synchronized successfully',
          duration: 3000
        });
      }
    };
    
    loadDashboard();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Listen for OpsCopilot events from command palette
    const handleOpenOpsCopilot = () => {
      setIsOpsCopilotOpen(true);
    };
    
    window.addEventListener('openOpsCopilot', handleOpenOpsCopilot);
    
    return () => {
      clearInterval(timer);
      window.removeEventListener('openOpsCopilot', handleOpenOpsCopilot);
    };
  }, [addToast, isLoaded]); // Add isLoaded to dependencies

  // Helper function to get event status color
  const getEventStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'emerald';
      case 'warning': return 'amber';
      case 'error': return 'red';
      case 'info': return 'blue';
      default: return 'slate';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Top Status Bar */}
      <div className="bg-slate-800/50 backdrop-blur-lg border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <h1 className="text-2xl font-bold text-white">OpsSight Dashboard</h1>
              <div className="flex items-center space-x-2 text-emerald-400">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">All Systems Operational</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-slate-300 text-sm">
                {currentTime.toLocaleTimeString()} • {currentTime.toLocaleDateString()}
              </div>
              <kbd className="px-2 py-1 bg-slate-700/50 rounded border border-slate-600 text-xs text-slate-400">
                ⌘K for commands
              </kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid - Using New Architecture */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <DashboardGrid>
          
          {/* Left Panel - System Pulse */}
          <DashboardPanel 
            variant="system-pulse"
            title="System Pulse"
            icon={
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          >
            {systemPulse.map((metric) => (
              <MetricWidget
                key={metric.name}
                name={metric.name}
                value={metric.value}
                status={metric.status}
                trend={metric.trend}
                duration={metric.duration}
                details={metric.details}
                icon={metric.icon}
              />
            ))}
          </DashboardPanel>

          {/* Center Panel - Command Center */}
          <DashboardPanel 
            variant="command-center"
            title="Command Center" 
            icon={
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          >
            {/* Live Graphs */}
            <DashboardCard className="hover:shadow-2xl">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Live Metrics
              </h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-slate-400 text-sm mb-2">CPU Usage</div>
                  <div className="h-16 bg-slate-700/30 rounded-lg flex items-end p-2 space-x-1">
                    {[45, 52, 48, 61, 55, 67, 72, 68, 59, 63, 58, 65].map((height, i) => (
                      <div
                        key={i}
                        className="bg-gradient-to-t from-blue-600 to-blue-400 rounded-sm flex-1 transition-all duration-500"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                  <div className="text-cyan-400 font-semibold mt-2">65%</div>
                </div>
                
                <div>
                  <div className="text-slate-400 text-sm mb-2">Memory Usage</div>
                  <div className="h-16 bg-slate-700/30 rounded-lg flex items-end p-2 space-x-1">
                    {[38, 42, 35, 48, 44, 52, 49, 46, 43, 47, 41, 58].map((height, i) => (
                      <div
                        key={i}
                        className="bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-sm flex-1 transition-all duration-500"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                  <div className="text-emerald-400 font-semibold mt-2">58%</div>
                </div>
              </div>
            </DashboardCard>

            {/* Real-time Pipeline Execution View */}
            <DashboardCard hoverable={false}>
              <PipelineExecutionView />
            </DashboardCard>

            {/* Events Feed */}
            <DashboardCard>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Recent Events
              </h3>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {liveEvents.map((event) => {
                  const statusColor = getEventStatusColor(event.status);
                  return (
                    <div key={event.id} className="flex items-start space-x-3 p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors duration-200">
                      <div className={`w-2 h-2 rounded-full bg-${statusColor}-500 mt-2 flex-shrink-0`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium text-sm truncate">{event.message}</span>
                          <span className="text-slate-400 text-xs">{event.time}</span>
                        </div>
                        <p className="text-slate-300 text-sm mt-1">{event.service}</p>
                        <div className="flex items-center space-x-1 mt-2">
                          <span className="px-2 py-1 bg-slate-600/50 text-slate-300 text-xs rounded">
                            {event.type}
                          </span>
                          <span className="text-lg">{event.icon}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </DashboardCard>
          </DashboardPanel>

          {/* Right Panel - Action & Insights */}
          <DashboardPanel 
            variant="action-insights"
            title="Actions & Insights"
            icon={
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          >
            {/* Action Buttons */}
            <DashboardCard variant="accent" hoverable={false}>
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              
              <div className="space-y-4">
                <PermissionGuard permission="manage_infrastructure">
                  <Link
                    href="/deploy"
                    className="flex items-center justify-center w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg transform transition-all duration-200 hover:shadow-cyan-500/30 hover:-translate-y-1 hover:scale-105"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                    </svg>
                    Deploy
                  </Link>
                </PermissionGuard>
                
                <PermissionGuard permission="manage_infrastructure">
                  <button className="flex items-center justify-center w-full py-3 px-4 bg-slate-700 text-slate-300 font-medium rounded-xl border border-slate-600 hover:bg-slate-600 hover:text-white transition-all duration-200">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Rollback
                  </button>
                </PermissionGuard>
                
                <PermissionGuard permission="view_infrastructure">
                  <Link
                    href="/logs"
                    className="flex items-center justify-center w-full py-3 px-4 bg-slate-700 text-slate-300 font-medium rounded-xl border border-slate-600 hover:bg-slate-600 hover:text-white transition-all duration-200"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View Logs
                  </Link>
                </PermissionGuard>
              </div>
            </DashboardCard>

            {/* AI Suggestions */}
            <DashboardCard variant="success">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Insights
              </h3>
              
              <div className="space-y-3">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2"></div>
                    <div>
                      <span className="text-emerald-400 font-medium text-sm">Optimization Available</span>
                      <p className="text-slate-300 text-sm mt-1">Unused node group detected in cluster-prod. Consider scaling down to save $240/month.</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                    <div>
                      <span className="text-blue-400 font-medium text-sm">Performance Boost</span>
                      <p className="text-slate-300 text-sm mt-1">Enable pod autoscaling on auth-service to handle traffic spikes better.</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-amber-400 rounded-full mt-2"></div>
                    <div>
                      <span className="text-amber-400 font-medium text-sm">Security Alert</span>
                      <p className="text-slate-300 text-sm mt-1">3 dependencies have security updates available. Update recommended.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setIsOpsCopilotOpen(true)}
                className="w-full mt-4 py-2 px-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200"
              >
                Ask OpsCopilot
              </button>
            </DashboardCard>

            {/* Team Activity */}
            <DashboardCard>
              <h3 className="text-lg font-semibold text-white mb-4">Team Activity</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    JD
                  </div>
                  <div className="flex-1">
                    <div className="text-white text-sm font-medium">John deployed auth-service v2.1.4</div>
                    <div className="text-slate-400 text-xs">2 minutes ago</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    SR
                  </div>
                  <div className="flex-1">
                    <div className="text-white text-sm font-medium">Sarah fixed critical bug in payment-api</div>
                    <div className="text-slate-400 text-xs">15 minutes ago</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    MK
                  </div>
                  <div className="flex-1">
                    <div className="text-white text-sm font-medium">Mike updated Kubernetes config</div>
                    <div className="text-slate-400 text-xs">1 hour ago</div>
                  </div>
                </div>
              </div>
            </DashboardCard>
          </DashboardPanel>

        </DashboardGrid>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <LoadingOverlay 
          isLoading={true}
          message="Loading dashboard data..."
        >
          <div></div>
        </LoadingOverlay>
      )}

      {/* OpsCopilot Modal */}
      {isOpsCopilotOpen && (
        <OpsCopilot 
          isOpen={isOpsCopilotOpen}
          onClose={() => setIsOpsCopilotOpen(false)}
        />
      )}
    </div>
  );
}

// Export with dashboard permission protection
export default withPermissions(DashboardPage, {
  permissions: ['view_dashboard'],
  redirectTo: '/unauthorized',
});
