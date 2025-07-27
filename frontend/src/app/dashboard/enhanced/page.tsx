'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
// Dynamically import to prevent SSR issues
const MetricsOverview = dynamic(() => import('@/components/dashboard/MetricsOverview').then(mod => ({ default: mod.MetricsOverview })), { 
  ssr: false,
  loading: () => <div className="h-48 animate-pulse bg-gray-200 rounded-lg" />
});
const PerformanceMetrics = dynamic(() => import('@/components/Dashboard/PerformanceMetrics').then(mod => ({ default: mod.PerformanceMetrics })), { 
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-gray-200 rounded-lg" />
});
const InfrastructureView = dynamic(() => import('@/components/Dashboard/InfrastructureView').then(mod => ({ default: mod.InfrastructureView })), { 
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-gray-200 rounded-lg" />
});
import { PipelineStatus } from '@/components/dashboard/PipelineStatus';
import { RealTimeAlertsPanel } from '@/components/dashboard/RealTimeAlertsPanel';
import { ResourceMonitor } from '@/components/dashboard/ResourceMonitor';
import { GitActivityFeed } from '@/components/dashboard/GitActivityFeed';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LayoutDashboard, 
  GitBranch, 
  AlertCircle, 
  Server, 
  Activity,
  BarChart3,
  TrendingUp,
  Zap
} from 'lucide-react';

export default function EnhancedDashboardPage() {
  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold">DevOps Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor your infrastructure, pipelines, and team activity in real-time
          </p>
        </div>

        {/* Main Dashboard Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-2 lg:grid-cols-7 w-full max-w-4xl">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="infrastructure" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              Infrastructure
            </TabsTrigger>
            <TabsTrigger value="pipelines" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Pipelines
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <MetricsOverview />
            
            {/* Quick Overview Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-blue-500" />
                    Recent Pipelines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PipelineQuickView />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Active Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AlertsQuickView />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <PerformanceMetrics />
          </TabsContent>

          <TabsContent value="infrastructure" className="space-y-6">
            <InfrastructureView />
          </TabsContent>

          <TabsContent value="pipelines" className="space-y-6">
            <PipelineStatus />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <RealTimeAlertsPanel />
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <GitActivityFeed />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}

// Quick view components for the overview tab
function PipelineQuickView() {
  const recentPipelines = [
    { name: 'Frontend Build', status: 'running', branch: 'main', progress: 65 },
    { name: 'API Tests', status: 'success', branch: 'feature/auth', progress: 100 },
    { name: 'Deploy Staging', status: 'failed', branch: 'develop', progress: 40 }
  ];

  const statusColors = {
    running: 'bg-blue-500',
    success: 'bg-green-500',
    failed: 'bg-red-500'
  };

  return (
    <div className="space-y-3">
      {recentPipelines.map((pipeline, index) => (
        <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${statusColors[pipeline.status as keyof typeof statusColors]}`} />
            <div>
              <p className="font-medium">{pipeline.name}</p>
              <p className="text-sm text-muted-foreground">{pipeline.branch}</p>
            </div>
          </div>
          {pipeline.status === 'running' && (
            <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${pipeline.progress}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AlertsQuickView() {
  const activeAlerts = [
    { title: 'High CPU Usage', severity: 'critical', time: '5m ago' },
    { title: 'Slow DB Queries', severity: 'warning', time: '15m ago' },
    { title: 'SSL Cert Expiring', severity: 'warning', time: '1h ago' }
  ];

  const severityColors = {
    critical: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500'
  };

  return (
    <div className="space-y-3">
      {activeAlerts.map((alert, index) => (
        <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
          <div className="flex items-center gap-3">
            <AlertCircle className={`h-4 w-4 ${severityColors[alert.severity as keyof typeof severityColors]}`} />
            <div>
              <p className="font-medium">{alert.title}</p>
              <p className="text-sm text-muted-foreground">{alert.time}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalyticsDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Analytics & Insights</h2>
        <p className="text-muted-foreground">Performance metrics and trends</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Deployment Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              Chart Component
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Time for Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              Chart Component
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mean Time to Recovery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              Chart Component
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Failure Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              Chart Component
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              Chart Component
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Infrastructure Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              Chart Component
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}