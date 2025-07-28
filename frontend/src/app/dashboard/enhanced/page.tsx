'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  GitBranch, 
  AlertCircle, 
  Server, 
  Activity,
  BarChart3,
  Users,
  Zap,
  Shield,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Rocket,
  Target,
  Code,
  Database,
  Cloud,
  Terminal,
  Settings,
  Bell
} from 'lucide-react';

// Dynamically import heavy components
const MetricsOverview = dynamic(() => import('@/components/dashboard/MetricsOverview').then(mod => ({ default: mod.MetricsOverview })), { 
  ssr: false,
  loading: () => <DashboardSkeleton />
});

const PipelineStatus = dynamic(() => import('@/components/dashboard/PipelineStatus').then(mod => ({ default: mod.PipelineStatus })), { 
  ssr: false,
  loading: () => <DashboardSkeleton />
});

const InfrastructureView = dynamic(() => import('@/components/dashboard/InfrastructureView').then(mod => ({ default: mod.InfrastructureView })), { 
  ssr: false,
  loading: () => <DashboardSkeleton />
});

const RealTimeAlertsPanel = dynamic(() => import('@/components/dashboard/RealTimeAlertsPanel').then(mod => ({ default: mod.RealTimeAlertsPanel })), { 
  ssr: false,
  loading: () => <DashboardSkeleton />
});

const GitActivityFeed = dynamic(() => import('@/components/dashboard/GitActivityFeed').then(mod => ({ default: mod.GitActivityFeed })), { 
  ssr: false,
  loading: () => <DashboardSkeleton />
});

// Loading skeleton component
function DashboardSkeleton() {
  return <div className="h-64 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" />;
}

// DevOps-specific metric cards
const devOpsMetrics = {
  deployment: {
    title: 'Deployment Frequency',
    value: '12/day',
    change: '+20%',
    trend: 'up',
    icon: Rocket,
    color: 'text-green-500',
    target: '10/day'
  },
  leadTime: {
    title: 'Lead Time for Changes',
    value: '2.4 hrs',
    change: '-15%',
    trend: 'down',
    icon: Clock,
    color: 'text-blue-500',
    target: '< 4 hrs'
  },
  mttr: {
    title: 'Mean Time to Recovery',
    value: '45 min',
    change: '-30%',
    trend: 'down',
    icon: Activity,
    color: 'text-yellow-500',
    target: '< 1 hr'
  },
  changeFailure: {
    title: 'Change Failure Rate',
    value: '2.3%',
    change: '-0.5%',
    trend: 'down',
    icon: XCircle,
    color: 'text-red-500',
    target: '< 5%'
  }
};

export default function DevOpsCommandCenter() {
  const [activeView, setActiveView] = useState('overview');
  const [userRole, setUserRole] = useState<'sre' | 'developer' | 'lead' | 'security'>('developer');
  const [activeIncidents, setActiveIncidents] = useState(2);
  const [runningPipelines, setRunningPipelines] = useState(3);

  // Detect user role (in real app, this would come from auth context)
  useEffect(() => {
    // Simulated role detection
    const role = localStorage.getItem('userRole') || 'developer';
    setUserRole(role as any);
  }, []);

  // Role-based default views
  const getRoleBasedView = () => {
    switch (userRole) {
      case 'sre':
        return 'infrastructure';
      case 'security':
        return 'security';
      case 'lead':
        return 'analytics';
      default:
        return 'overview';
    }
  };

  return (
    <DashboardShell activeView={activeView} onViewChange={setActiveView}>
      <div className="space-y-8">
        {/* Intelligent Header with Context */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <LayoutDashboard className="h-8 w-8 text-primary" />
              DevOps Command Center
            </h1>
            <p className="text-muted-foreground mt-2">
              {activeIncidents > 0 ? (
                <span className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  {activeIncidents} active incidents require attention
                </span>
              ) : (
                <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  All systems operational
                </span>
              )}
            </p>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <Bell className="h-4 w-4" />
              Configure Alerts
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Customize Dashboard
            </Button>
            {activeIncidents > 0 && (
              <Button variant="destructive" size="sm" className="gap-2 animate-pulse">
                <AlertCircle className="h-4 w-4" />
                View Incidents
              </Button>
            )}
          </div>
        </div>

        {/* DORA Metrics - Always visible for DevOps teams */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(devOpsMetrics).map(([key, metric]) => (
            <Card key={key} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="flex items-center justify-between mt-2">
                  <p className={`text-xs flex items-center gap-1 ${
                    metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
                    {metric.change} from last week
                  </p>
                  <Badge variant="outline" className="text-xs">
                    Target: {metric.target}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Dashboard Content with Role-Based Views */}
        <Tabs value={activeView} onValueChange={setActiveView} className="space-y-6">
          <TabsList className="grid grid-cols-2 lg:grid-cols-8 w-full">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="pipelines" className="flex items-center gap-2 relative">
              <GitBranch className="h-4 w-4" />
              <span className="hidden sm:inline">Pipelines</span>
              {runningPipelines > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1 absolute -top-1 -right-1">
                  {runningPipelines}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="infrastructure" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              <span className="hidden sm:inline">Infrastructure</span>
            </TabsTrigger>
            <TabsTrigger value="incidents" className="flex items-center gap-2 relative">
              <AlertCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Incidents</span>
              {activeIncidents > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1 absolute -top-1 -right-1 animate-pulse">
                  {activeIncidents}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Monitoring</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - High-level system health */}
          <TabsContent value="overview" className="space-y-6">
            <MetricsOverview />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Status */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>System Health Matrix</CardTitle>
                </CardHeader>
                <CardContent>
                  <SystemHealthMatrix />
                </CardContent>
              </Card>

              {/* Active Operations */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Operations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ActiveOperations />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pipelines Tab - CI/CD focus */}
          <TabsContent value="pipelines" className="space-y-6">
            <PipelineStatus />
            <DeploymentCalendar />
          </TabsContent>

          {/* Infrastructure Tab - Cloud and K8s */}
          <TabsContent value="infrastructure" className="space-y-6">
            <InfrastructureView />
            <ResourceOptimization />
          </TabsContent>

          {/* Incidents Tab - Incident Management */}
          <TabsContent value="incidents" className="space-y-6">
            <IncidentDashboard activeIncidents={activeIncidents} />
          </TabsContent>

          {/* Monitoring Tab - Real-time metrics */}
          <TabsContent value="monitoring" className="space-y-6">
            <RealTimeMonitoring />
          </TabsContent>

          {/* Analytics Tab - Business metrics */}
          <TabsContent value="analytics" className="space-y-6">
            <DevOpsAnalytics />
          </TabsContent>

          {/* Team Tab - Collaboration */}
          <TabsContent value="team" className="space-y-6">
            <TeamDashboard />
          </TabsContent>

          {/* Security Tab - Security posture */}
          <TabsContent value="security" className="space-y-6">
            <SecurityDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}

// System Health Matrix Component
function SystemHealthMatrix() {
  const services = [
    { name: 'API Gateway', status: 'healthy', uptime: '99.99%', latency: '45ms' },
    { name: 'Auth Service', status: 'healthy', uptime: '99.95%', latency: '23ms' },
    { name: 'Database', status: 'warning', uptime: '99.90%', latency: '120ms' },
    { name: 'Cache Layer', status: 'healthy', uptime: '99.99%', latency: '2ms' },
    { name: 'Message Queue', status: 'healthy', uptime: '99.97%', latency: '15ms' },
    { name: 'Storage Service', status: 'healthy', uptime: '99.98%', latency: '67ms' },
  ];

  const statusColors = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
    unknown: 'bg-gray-500'
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {services.map((service) => (
        <div key={service.name} className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${statusColors[service.status as keyof typeof statusColors]}`} />
            <div>
              <p className="font-medium">{service.name}</p>
              <p className="text-sm text-muted-foreground">Uptime: {service.uptime}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{service.latency}</p>
            <p className="text-xs text-muted-foreground">latency</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Active Operations Component
function ActiveOperations() {
  const operations = [
    { type: 'deployment', name: 'Frontend v2.1.0', status: 'in_progress', progress: 65 },
    { type: 'backup', name: 'Database Backup', status: 'scheduled', time: 'in 2 hours' },
    { type: 'scaling', name: 'Auto-scaling Event', status: 'completed', time: '5 min ago' },
  ];

  const typeIcons = {
    deployment: Rocket,
    backup: Database,
    scaling: Cloud,
  };

  return (
    <div className="space-y-3">
      {operations.map((op, index) => {
        const Icon = typeIcons[op.type as keyof typeof typeIcons];
        return (
          <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
            <Icon className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium text-sm">{op.name}</p>
              <p className="text-xs text-muted-foreground">
                {op.status === 'in_progress' ? `${op.progress}% complete` : op.time}
              </p>
            </div>
            {op.status === 'in_progress' && (
              <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${op.progress}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Incident Dashboard Component
function IncidentDashboard({ activeIncidents }: { activeIncidents: number }) {
  return (
    <div className="space-y-6">
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader className="bg-red-50 dark:bg-red-950">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              Active Incidents
            </span>
            <Badge variant="destructive">{activeIncidents} Active</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    High Database Connection Pool Exhaustion
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">Started 15 minutes ago • Affecting 3 services</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">View Runbook</Button>
                  <Button size="sm" variant="destructive">Take Action</Button>
                </div>
              </div>
            </div>
            <div className="p-4 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    Elevated API Response Times
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">Started 45 minutes ago • P95 latency increased 200%</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">View Metrics</Button>
                  <Button size="sm" variant="outline">Acknowledge</Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <RealTimeAlertsPanel />
    </div>
  );
}

// Deployment Calendar Component
function DeploymentCalendar() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deployment Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {/* Calendar implementation */}
          <div className="text-center text-sm font-medium text-muted-foreground">Mon</div>
          <div className="text-center text-sm font-medium text-muted-foreground">Tue</div>
          <div className="text-center text-sm font-medium text-muted-foreground">Wed</div>
          <div className="text-center text-sm font-medium text-muted-foreground">Thu</div>
          <div className="text-center text-sm font-medium text-muted-foreground">Fri</div>
          <div className="text-center text-sm font-medium text-muted-foreground">Sat</div>
          <div className="text-center text-sm font-medium text-muted-foreground">Sun</div>
          {/* Add calendar days with deployment indicators */}
        </div>
      </CardContent>
    </Card>
  );
}

// Resource Optimization Component
function ResourceOptimization() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Optimization Opportunities</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Underutilized Kubernetes Nodes</p>
              <p className="text-sm text-muted-foreground">3 nodes with &lt;20% CPU usage</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-600">$450/month</p>
              <p className="text-sm text-muted-foreground">potential savings</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Idle Development Environments</p>
              <p className="text-sm text-muted-foreground">5 environments inactive for 7+ days</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-600">$280/month</p>
              <p className="text-sm text-muted-foreground">potential savings</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Real-time Monitoring Component
function RealTimeMonitoring() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Live System Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">CPU Usage</span>
                <span className="text-sm">68%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: '68%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Memory Usage</span>
                <span className="text-sm">72%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-300" style={{ width: '72%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Network I/O</span>
                <span className="text-sm">245 MB/s</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: '45%' }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Application Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Request Rate</span>
              <span className="text-sm font-bold">2.4k req/s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Error Rate</span>
              <span className="text-sm font-bold text-green-600">0.02%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">P99 Latency</span>
              <span className="text-sm font-bold">124ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Connections</span>
              <span className="text-sm font-bold">1,842</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// DevOps Analytics Component
function DevOpsAnalytics() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sprint Velocity Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Velocity Chart Component
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Code Quality Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Code Coverage</span>
                <Badge variant="outline">82%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Technical Debt</span>
                <Badge variant="outline">3.2 days</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Cyclomatic Complexity</span>
                <Badge variant="outline">Low</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Team Dashboard Component
function TeamDashboard() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>On-Call Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <div>
                  <p className="font-medium">Currently On-Call</p>
                  <p className="text-sm text-muted-foreground">Sarah Chen • Started 2 hours ago</p>
                </div>
              </div>
              <Button size="sm" variant="outline">Contact</Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
              <div className="pl-5 space-y-2">
                <p className="text-sm">Mike Johnson • Tomorrow 9:00 AM</p>
                <p className="text-sm">Alex Rivera • Dec 28, 9:00 AM</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <GitActivityFeed />
    </div>
  );
}

// Security Dashboard Component
function SecurityDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">92</div>
              <p className="text-sm text-muted-foreground mt-2">Excellent</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vulnerabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Critical</span>
                <Badge variant="destructive">0</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">High</span>
                <Badge variant="outline">2</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Medium</span>
                <Badge variant="outline">5</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Low</span>
                <Badge variant="outline">12</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">SOC 2 Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">GDPR Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">ISO 27001</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}