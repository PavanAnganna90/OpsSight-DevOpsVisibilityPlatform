/**
 * Dashboard Layout Examples
 * 
 * Real-world examples combining Button, StatusIndicator, and MetricCard components
 * to create complete dashboard interfaces.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { StatusIndicator, StatusBadge } from '@/components/ui/StatusIndicator';
import { MetricCard, MetricCardGrid } from '@/components/ui/MetricCard';
import { 
  Activity, 
  Users, 
  Server, 
  Database,
  Wifi,
  AlertTriangle,
  CheckCircle,
  Plus,
  RefreshCw,
  Settings
} from 'lucide-react';

// 1. System Status Dashboard
export function SystemStatusDashboard() {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  const handleRefresh = () => {
    setLastUpdated(new Date());
  };

  const systemServices = [
    { name: 'Web Server', status: 'success', uptime: '99.9%', responseTime: '142ms' },
    { name: 'Database', status: 'warning', uptime: '99.1%', responseTime: '28ms' },
    { name: 'Cache Service', status: 'success', uptime: '100%', responseTime: '5ms' },
    { name: 'Message Queue', status: 'error', uptime: '85.2%', responseTime: 'N/A' },
    { name: 'File Storage', status: 'success', uptime: '99.8%', responseTime: '67ms' },
    { name: 'CDN', status: 'info', uptime: '99.6%', responseTime: '23ms' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Status</h1>
          <p className="text-gray-600">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" iconLeft={<RefreshCw />} onClick={handleRefresh}>
            Refresh
          </Button>
          <Button variant="ghost" iconLeft={<Settings />} />
        </div>
      </div>

      {/* Overall Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatusIndicator status="success" size="lg">
          4 Services Healthy
        </StatusIndicator>
        <StatusIndicator status="warning" size="lg">
          1 Service Degraded
        </StatusIndicator>
        <StatusIndicator status="error" size="lg">
          1 Service Down
        </StatusIndicator>
        <StatusIndicator status="info" size="lg" pulse>
          Monitoring Active
        </StatusIndicator>
      </div>

      {/* Service Details */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Service Details</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {systemServices.map((service) => (
              <div key={service.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <StatusIndicator status={service.status} size="md">
                    {service.name}
                  </StatusIndicator>
                </div>
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <span>Uptime: {service.uptime}</span>
                  <span>Response: {service.responseTime}</span>
                  <Button variant="ghost" size="sm">
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. Performance Metrics Dashboard
export function PerformanceMetricsDashboard() {
  const [timeRange, setTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        console.log('Auto refreshing metrics...');
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const metrics = {
    '1h': [
      { title: 'CPU Usage', value: '68%', trend: 'up', trendValue: '+5%', icon: <Activity /> },
      { title: 'Memory Usage', value: '4.2GB', trend: 'neutral', trendValue: '0%', icon: <Database /> },
      { title: 'Active Users', value: '1,234', trend: 'up', trendValue: '+12%', icon: <Users /> },
      { title: 'Response Time', value: '142ms', trend: 'down', trendValue: '-8%', icon: <Server /> },
    ],
    '24h': [
      { title: 'CPU Usage', value: '72%', trend: 'up', trendValue: '+8%', icon: <Activity /> },
      { title: 'Memory Usage', value: '4.8GB', trend: 'up', trendValue: '+15%', icon: <Database /> },
      { title: 'Active Users', value: '2,345', trend: 'up', trendValue: '+25%', icon: <Users /> },
      { title: 'Response Time', value: '138ms', trend: 'down', trendValue: '-12%', icon: <Server /> },
    ],
    '7d': [
      { title: 'CPU Usage', value: '65%', trend: 'down', trendValue: '-3%', icon: <Activity /> },
      { title: 'Memory Usage', value: '4.1GB', trend: 'neutral', trendValue: '0%', icon: <Database /> },
      { title: 'Active Users', value: '1,892', trend: 'up', trendValue: '+18%', icon: <Users /> },
      { title: 'Response Time', value: '145ms', trend: 'up', trendValue: '+2%', icon: <Server /> },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold">Performance Metrics</h1>
          <p className="text-gray-600">Real-time system performance monitoring</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Time range selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {Object.keys(metrics).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Auto refresh toggle */}
          <Button
            variant={autoRefresh ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            Auto Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <MetricCardGrid>
        {metrics[timeRange].map((metric) => (
          <MetricCard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            icon={metric.icon}
            trend={metric.trend}
            trendValue={metric.trendValue}
            trendLabel={`vs previous ${timeRange}`}
          />
        ))}
      </MetricCardGrid>

      {/* Additional Actions */}
      <div className="flex justify-center">
        <Button variant="outline" iconLeft={<Plus />}>
          Add Custom Metric
        </Button>
      </div>
    </div>
  );
}

// 3. DevOps Pipeline Dashboard
export function DevOpsPipelineDashboard() {
  const [selectedEnvironment, setSelectedEnvironment] = useState('production');

  const environments = ['development', 'staging', 'production'];
  
  const pipelineSteps = [
    { name: 'Build', status: 'success', duration: '2m 34s', completedAt: '10:30 AM' },
    { name: 'Test', status: 'success', duration: '4m 12s', completedAt: '10:34 AM' },
    { name: 'Security Scan', status: 'success', duration: '1m 45s', completedAt: '10:36 AM' },
    { name: 'Deploy to Staging', status: 'success', duration: '3m 22s', completedAt: '10:39 AM' },
    { name: 'Deploy to Production', status: 'info', duration: 'In progress...', completedAt: 'N/A' },
    { name: 'Health Check', status: 'neutral', duration: 'Pending', completedAt: 'N/A' },
  ];

  const deploymentMetrics = [
    { title: 'Deployments Today', value: '8', trend: 'up', trendValue: '+2' },
    { title: 'Success Rate', value: '98.5%', trend: 'up', trendValue: '+1.2%' },
    { title: 'Avg Deploy Time', value: '12m', trend: 'down', trendValue: '-3m' },
    { title: 'Failed Builds', value: '2', trend: 'down', trendValue: '-1' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">DevOps Pipeline</h1>
          <p className="text-gray-600">Continuous integration and deployment status</p>
        </div>
        <Button variant="primary" iconLeft={<Plus />}>
          New Deployment
        </Button>
      </div>

      {/* Environment Selector */}
      <div className="flex space-x-2">
        {environments.map((env) => (
          <Button
            key={env}
            variant={selectedEnvironment === env ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setSelectedEnvironment(env)}
          >
            {env.charAt(0).toUpperCase() + env.slice(1)}
          </Button>
        ))}
      </div>

      {/* Pipeline Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Current Pipeline - {selectedEnvironment}</h2>
          <StatusBadge status="info">Running</StatusBadge>
        </div>
        
        <div className="space-y-3">
          {pipelineSteps.map((step, index) => (
            <div key={step.name} className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500 w-6">{index + 1}</span>
                <StatusIndicator 
                  status={step.status} 
                  size="sm"
                  pulse={step.status === 'info'}
                >
                  {step.name}
                </StatusIndicator>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>{step.duration}</span>
                <span>{step.completedAt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deployment Metrics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Deployment Metrics</h2>
        <MetricCardGrid>
          {deploymentMetrics.map((metric) => (
            <MetricCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              trend={metric.trend}
              trendValue={metric.trendValue}
              trendLabel="vs yesterday"
            />
          ))}
        </MetricCardGrid>
      </div>
    </div>
  );
}

// 4. Alert Management Dashboard
export function AlertManagementDashboard() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [alerts, setAlerts] = useState([
    { id: 1, title: 'High CPU Usage', status: 'error', severity: 'high', time: '2 min ago', resolved: false },
    { id: 2, title: 'Database Connection Slow', status: 'warning', severity: 'medium', time: '5 min ago', resolved: false },
    { id: 3, title: 'Backup Completed', status: 'success', severity: 'low', time: '10 min ago', resolved: true },
    { id: 4, title: 'Memory Usage Alert', status: 'warning', severity: 'medium', time: '15 min ago', resolved: false },
    { id: 5, title: 'SSL Certificate Expiring', status: 'warning', severity: 'high', time: '1 hour ago', resolved: false },
  ]);

  const filteredAlerts = alerts.filter(alert => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return !alert.resolved;
    if (filterStatus === 'resolved') return alert.resolved;
    return alert.status === filterStatus;
  });

  const alertCounts = {
    total: alerts.length,
    active: alerts.filter(a => !a.resolved).length,
    resolved: alerts.filter(a => a.resolved).length,
    error: alerts.filter(a => a.status === 'error').length,
    warning: alerts.filter(a => a.status === 'warning').length,
  };

  const resolveAlert = (id: number) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, resolved: true, status: 'success' } : alert
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alert Management</h1>
          <p className="text-gray-600">Monitor and manage system alerts</p>
        </div>
        <Button variant="outline" iconLeft={<Settings />}>
          Alert Settings
        </Button>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard
          title="Total Alerts"
          value={alertCounts.total.toString()}
          size="sm"
        />
        <MetricCard
          title="Active"
          value={alertCounts.active.toString()}
          size="sm"
        />
        <MetricCard
          title="Resolved"
          value={alertCounts.resolved.toString()}
          size="sm"
        />
        <MetricCard
          title="Critical"
          value={alertCounts.error.toString()}
          size="sm"
        />
        <MetricCard
          title="Warnings"
          value={alertCounts.warning.toString()}
          size="sm"
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-2">
        {['all', 'active', 'resolved', 'error', 'warning', 'success'].map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            Recent Alerts ({filteredAlerts.length})
          </h2>
        </div>
        <div className="divide-y">
          {filteredAlerts.map((alert) => (
            <div key={alert.id} className="p-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <StatusIndicator status={alert.status} size="md">
                  {alert.title}
                </StatusIndicator>
                <StatusBadge status={alert.severity === 'high' ? 'error' : alert.severity === 'medium' ? 'warning' : 'neutral'}>
                  {alert.severity}
                </StatusBadge>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">{alert.time}</span>
                {!alert.resolved && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resolveAlert(alert.id)}
                  >
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 5. Complete OpsSight Dashboard
export function CompleteDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'performance', label: 'Performance' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'alerts', label: 'Alerts' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <SystemStatusDashboard />;
      case 'performance':
        return <PerformanceMetricsDashboard />;
      case 'pipeline':
        return <DevOpsPipelineDashboard />;
      case 'alerts':
        return <AlertManagementDashboard />;
      default:
        return <SystemStatusDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">OpsSight Dashboard</h1>
          <div className="flex space-x-2">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {renderTabContent()}
      </main>
    </div>
  );
} 