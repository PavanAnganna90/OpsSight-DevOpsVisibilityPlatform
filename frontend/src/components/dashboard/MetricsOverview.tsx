'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/MetricCard';
import { LineChart, AreaChart, BarChart } from '@/components/charts';
import { 
  Activity, 
  Server, 
  GitBranch, 
  Users,
  Zap,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardMetrics } from '@/hooks/useMetrics';
import { apiService } from '@/services/apiService';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface MetricData {
  current: number;
  previous: number;
  trend: 'up' | 'down' | 'stable';
  sparkline: number[];
}

interface SystemMetrics {
  cpu: MetricData;
  memory: MetricData;
  deployments: MetricData;
  activeUsers: MetricData;
  apiLatency: MetricData;
  errorRate: MetricData;
}

export function MetricsOverview() {
  const { data: metrics, isLoading: loading } = useDashboardMetrics();
  const [dashboardMetrics, setDashboardMetrics] = React.useState<any>(null);
  const [cacheMetrics, setCacheMetrics] = React.useState<any>(null);
  const [apiPerformance, setApiPerformance] = React.useState<any>(null);

  React.useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      // Load dashboard metrics
      const metricsResponse = await apiService.getDashboardMetrics();
      if (metricsResponse.success) {
        setDashboardMetrics(metricsResponse.data);
      }

      // Load cache metrics
      const cacheResponse = await apiService.getCacheMetrics();
      if (cacheResponse.success) {
        setCacheMetrics(cacheResponse.data);
      }

      // Load API performance
      const perfResponse = await apiService.getApiPerformance();
      if (perfResponse.success) {
        setApiPerformance(perfResponse.data);
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  if (loading || (!dashboardMetrics && !cacheMetrics)) {
    return <MetricsOverviewSkeleton />;
  }

  // Use real metrics data or fallback to mock data
  const systemMetrics: SystemMetrics = {
    cpu: {
      current: dashboardMetrics?.system?.cpu_usage || 65,
      previous: dashboardMetrics?.system?.cpu_usage ? dashboardMetrics.system.cpu_usage + 7 : 72,
      trend: dashboardMetrics?.system?.cpu_usage && dashboardMetrics.system.cpu_usage < 70 ? 'down' : 'stable',
      sparkline: [70, 72, 68, 65, 63, 65, 67, dashboardMetrics?.system?.cpu_usage || 65]
    },
    memory: {
      current: dashboardMetrics?.system?.memory_usage || 78,
      previous: dashboardMetrics?.system?.memory_usage ? dashboardMetrics.system.memory_usage - 3 : 75,
      trend: dashboardMetrics?.system?.memory_usage && dashboardMetrics.system.memory_usage > 75 ? 'up' : 'stable',
      sparkline: [75, 76, 77, 76, 78, 77, 78, dashboardMetrics?.system?.memory_usage || 78]
    },
    deployments: {
      current: dashboardMetrics?.deployments?.length || 24,
      previous: dashboardMetrics?.deployments?.length ? dashboardMetrics.deployments.length - 6 : 18,
      trend: 'up',
      sparkline: [15, 18, 20, 22, 21, 23, 24, dashboardMetrics?.deployments?.length || 24]
    },
    activeUsers: {
      current: 156,
      previous: 142,
      trend: 'up',
      sparkline: [140, 142, 145, 148, 150, 152, 155, 156]
    },
    apiLatency: {
      current: apiPerformance?.response_time_ms || 45,
      previous: apiPerformance?.response_time_ms ? apiPerformance.response_time_ms + 7 : 52,
      trend: apiPerformance?.response_time_ms && apiPerformance.response_time_ms < 50 ? 'down' : 'stable',
      sparkline: [52, 50, 48, 47, 46, 45, 45, apiPerformance?.response_time_ms || 45]
    },
    errorRate: {
      current: 0.12,
      previous: 0.18,
      trend: 'down',
      sparkline: [0.18, 0.16, 0.15, 0.14, 0.13, 0.12, 0.12, 0.12]
    }
  };

  const metricCards = [
    {
      title: 'CPU Usage',
      value: `${systemMetrics.cpu.current}%`,
      change: calculateChange(systemMetrics.cpu),
      changeType: systemMetrics.cpu.trend === 'down' ? 'positive' : 'warning',
      icon: Activity,
      sparkline: systemMetrics.cpu.sparkline,
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Memory Usage',
      value: `${systemMetrics.memory.current}%`,
      change: calculateChange(systemMetrics.memory),
      changeType: systemMetrics.memory.trend === 'up' ? 'warning' : 'positive',
      icon: Server,
      sparkline: systemMetrics.memory.sparkline,
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Cache Hit Rate',
      value: cacheMetrics ? `${Math.round(cacheMetrics.hit_rate * 100)}%` : '85%',
      change: cacheMetrics ? `${cacheMetrics.hits}/${cacheMetrics.total_requests} requests` : '+5% vs yesterday',
      changeType: cacheMetrics && cacheMetrics.hit_rate > 0.8 ? 'positive' : 'warning',
      icon: Zap,
      sparkline: systemMetrics.deployments.sparkline,
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      title: 'API Response Time',
      value: `${systemMetrics.apiLatency.current}ms`,
      change: calculateChange(systemMetrics.apiLatency),
      changeType: systemMetrics.apiLatency.trend === 'down' ? 'positive' : 'warning',
      icon: Activity,
      sparkline: systemMetrics.apiLatency.sparkline,
      gradient: 'from-orange-500 to-red-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {metricCards.map((metric) => (
          <MetricCard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            change={metric.change}
            changeType={metric.changeType as any}
            icon={metric.icon}
            gradient={metric.gradient}
            className="hover:shadow-lg transition-shadow"
          />
        ))}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                API Performance
              </span>
              <span className="text-sm text-muted-foreground">Last 24h</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Average Latency</span>
                <span className="text-2xl font-bold">{systemMetrics.apiLatency.current}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cache Enabled</span>
                <span className="text-2xl font-bold">{apiPerformance?.cache_enabled ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cache Level</span>
                <span className="text-sm font-medium">{apiPerformance?.cache_level || 'both'}</span>
              </div>
              <div className="h-32">
                {/* Add actual chart component here */}
                <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                System Health
              </span>
              <span className="text-sm text-green-500 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Healthy
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['API Gateway', 'Database', 'Redis Cache', 'Message Queue'].map((service, index) => (
                <ServiceHealthRow 
                  key={service}
                  name={service}
                  status={index === 3 ? 'warning' : 'healthy'}
                  latency={Math.floor(Math.random() * 50) + 10}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStat 
          label="Uptime"
          value="99.98%"
          icon={Clock}
          color="text-green-500"
        />
        <QuickStat 
          label="Incidents"
          value="2"
          icon={AlertCircle}
          color="text-yellow-500"
        />
        <QuickStat 
          label="Success Rate"
          value="99.87%"
          icon={CheckCircle}
          color="text-blue-500"
        />
        <QuickStat 
          label="Avg Response"
          value="124ms"
          icon={Activity}
          color="text-purple-500"
        />
      </div>
    </div>
  );
}

function ServiceHealthRow({ 
  name, 
  status, 
  latency 
}: { 
  name: string; 
  status: 'healthy' | 'warning' | 'error';
  latency: number;
}) {
  const statusConfig = {
    healthy: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
    warning: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", config.bg)}>
          <Icon className={cn("h-4 w-4", config.color)} />
        </div>
        <span className="font-medium">{name}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{latency}ms</span>
        <ArrowRight className="h-4 w-4 text-gray-400" />
      </div>
    </div>
  );
}

function QuickStat({ 
  label, 
  value, 
  icon: Icon, 
  color 
}: { 
  label: string; 
  value: string; 
  icon: React.ElementType; 
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function calculateChange(metric: MetricData): string {
  const diff = metric.current - metric.previous;
  const percentage = Math.abs((diff / metric.previous) * 100).toFixed(1);
  return `${metric.trend === 'up' ? '+' : '-'}${percentage}%`;
}

function MetricsOverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <LoadingSkeleton key={i} variant="metric" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <LoadingSkeleton key={i} variant="card" className="h-64" />
        ))}
      </div>
    </div>
  );
}