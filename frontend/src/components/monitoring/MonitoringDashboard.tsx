/**
 * Monitoring Dashboard Component
 * 
 * Provides a comprehensive dashboard for viewing application metrics,
 * performance data, and system health.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { monitor } from '@/utils/monitoring';
import { usePerformanceMonitoring } from '@/hooks/useMonitoring';

interface MetricData {
  name: string;
  value: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  uptime: number;
  responseTime: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface AlertData {
  id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: number;
  resolved: boolean;
}

const MonitoringDashboard: React.FC = () => {
  const { trackUserInteraction } = usePerformanceMonitoring('MonitoringDashboard');
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('1h');
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    status: 'healthy',
    uptime: 99.9,
    responseTime: 150,
    errorRate: 0.1,
    memoryUsage: 65,
    cpuUsage: 45,
  });
  const [alerts, setAlerts] = useState<AlertData[]>([]);

  // Fetch monitoring data
  useEffect(() => {
    const fetchMonitoringData = async () => {
      setIsLoading(true);
      
      try {
        // In a real app, these would be API calls
        const mockMetrics: MetricData[] = [
          { name: 'Page Views', value: 12500, trend: 'up', change: 15.2 },
          { name: 'API Requests', value: 8750, trend: 'up', change: 8.7 },
          { name: 'Active Users', value: 423, trend: 'stable', change: 2.1 },
          { name: 'Error Rate', value: 0.1, unit: '%', trend: 'down', change: -0.3 },
          { name: 'Avg Response Time', value: 150, unit: 'ms', trend: 'down', change: -12.5 },
          { name: 'Memory Usage', value: 65, unit: '%', trend: 'stable', change: 1.2 },
        ];

        const mockAlerts: AlertData[] = [
          {
            id: '1',
            level: 'warning',
            message: 'High memory usage detected on server-02',
            timestamp: Date.now() - 300000, // 5 minutes ago
            resolved: false,
          },
          {
            id: '2',
            level: 'info',
            message: 'Deployment completed successfully',
            timestamp: Date.now() - 600000, // 10 minutes ago
            resolved: true,
          },
          {
            id: '3',
            level: 'error',
            message: 'Database connection timeout',
            timestamp: Date.now() - 900000, // 15 minutes ago
            resolved: true,
          },
        ];

        setMetrics(mockMetrics);
        setAlerts(mockAlerts);
        
        // Track dashboard view
        trackUserInteraction('view_dashboard', {
          tab: activeTab,
          timeRange,
        });
        
      } catch (error) {
        console.error('Failed to fetch monitoring data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonitoringData();
  }, [timeRange, activeTab, trackUserInteraction]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    trackUserInteraction('change_tab', { tab });
  };

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    trackUserInteraction('change_time_range', { range });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return (
          <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
          </svg>
        );
      case 'down':
        return (
          <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
          </svg>
        );
      case 'stable':
        return (
          <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getAlertBadgeVariant = (level: string) => {
    switch (level) {
      case 'error': return 'destructive';
      case 'warning': return 'warning';
      case 'info': return 'default';
      default: return 'secondary';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  const unresolvedAlerts = alerts.filter(alert => !alert.resolved);
  const healthScore = useMemo(() => {
    const scores = [
      systemHealth.uptime,
      100 - systemHealth.errorRate * 10,
      100 - systemHealth.responseTime / 10,
      100 - systemHealth.memoryUsage,
      100 - systemHealth.cpuUsage,
    ];
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }, [systemHealth]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Monitoring Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time system metrics and performance monitoring
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Time Range:</span>
            <select
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
          
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${systemHealth.status === 'healthy' ? 'bg-green-500' : systemHealth.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
            System Health
            <Badge variant={systemHealth.status === 'healthy' ? 'default' : 'destructive'}>
              {healthScore}% Health Score
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{systemHealth.uptime}%</div>
              <div className="text-sm text-gray-600">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{systemHealth.responseTime}ms</div>
              <div className="text-sm text-gray-600">Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{systemHealth.errorRate}%</div>
              <div className="text-sm text-gray-600">Error Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{systemHealth.memoryUsage}%</div>
              <div className="text-sm text-gray-600">Memory Usage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{systemHealth.cpuUsage}%</div>
              <div className="text-sm text-gray-600">CPU Usage</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {unresolvedAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Active Alerts
              <Badge variant="destructive">{unresolvedAlerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unresolvedAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={getAlertBadgeVariant(alert.level)}>
                      {alert.level.toUpperCase()}
                    </Badge>
                    <span className="text-sm font-medium">{alert.message}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDuration(Date.now() - alert.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric) => (
              <Card key={metric.name}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {metric.name}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {metric.value.toLocaleString()}
                        {metric.unit && <span className="text-lg text-gray-500 ml-1">{metric.unit}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(metric.trend!)}
                      <span className={`text-sm font-medium ${
                        metric.trend === 'up' ? 'text-green-600' : 
                        metric.trend === 'down' ? 'text-red-600' : 
                        'text-gray-600'
                      }`}>
                        {metric.change ? `${metric.change > 0 ? '+' : ''}${metric.change}%` : ''}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">Core Web Vitals</h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Largest Contentful Paint</span>
                        <span className="text-sm font-medium">1.2s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">First Input Delay</span>
                        <span className="text-sm font-medium">15ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Cumulative Layout Shift</span>
                        <span className="text-sm font-medium">0.05</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h3 className="font-semibold text-green-900 dark:text-green-100">Resource Timing</h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">DNS Lookup</span>
                        <span className="text-sm font-medium">23ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">TCP Connection</span>
                        <span className="text-sm font-medium">45ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Time to First Byte</span>
                        <span className="text-sm font-medium">120ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <h3 className="font-semibold text-red-900 dark:text-red-100">JavaScript Errors</h3>
                    <div className="text-2xl font-bold text-red-600 mt-2">3</div>
                    <div className="text-sm text-red-600">Last 24 hours</div>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">Network Errors</h3>
                    <div className="text-2xl font-bold text-yellow-600 mt-2">7</div>
                    <div className="text-sm text-yellow-600">Last 24 hours</div>
                  </div>
                  
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <h3 className="font-semibold text-orange-900 dark:text-orange-100">API Errors</h3>
                    <div className="text-2xl font-bold text-orange-600 mt-2">12</div>
                    <div className="text-sm text-orange-600">Last 24 hours</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100">User Engagement</h3>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Average Session Duration</span>
                      <span className="text-sm font-medium">4m 32s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Pages per Session</span>
                      <span className="text-sm font-medium">3.2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Bounce Rate</span>
                      <span className="text-sm font-medium">32%</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">Feature Usage</h3>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Dashboard Views</span>
                      <span className="text-sm font-medium">2,453</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Report Generations</span>
                      <span className="text-sm font-medium">187</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">API Calls</span>
                      <span className="text-sm font-medium">8,921</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MonitoringDashboard;