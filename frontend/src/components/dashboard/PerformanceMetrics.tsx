import React, { useEffect, useState } from 'react';
import { Line, Bar, Doughnut } from './MockChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Clock, Server, Zap } from 'lucide-react';

interface MetricData {
  timestamp: string;
  value: number;
}

interface SystemMetrics {
  cpu: MetricData[];
  memory: MetricData[];
  requests: MetricData[];
  responseTime: MetricData[];
  services: {
    healthy: number;
    degraded: number;
    down: number;
  };
}

export const PerformanceMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: [],
    memory: [],
    requests: [],
    responseTime: [],
    services: { healthy: 0, degraded: 0, down: 0 }
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch initial data
    fetchMetrics();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      // In real implementation, this would fetch from your API
      // For now, we'll generate mock data
      const now = new Date();
      const mockData: SystemMetrics = {
        cpu: generateTimeSeriesData(now, 20, 10, 80),
        memory: generateTimeSeriesData(now, 20, 40, 90),
        requests: generateTimeSeriesData(now, 20, 100, 1000),
        responseTime: generateTimeSeriesData(now, 20, 50, 300),
        services: {
          healthy: 5,
          degraded: 1,
          down: 0
        }
      };
      
      setMetrics(mockData);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      setIsLoading(false);
    }
  };

  const generateTimeSeriesData = (
    endTime: Date,
    points: number,
    min: number,
    max: number
  ): MetricData[] => {
    const data: MetricData[] = [];
    for (let i = points - 1; i >= 0; i--) {
      const timestamp = new Date(endTime.getTime() - i * 60000);
      data.push({
        timestamp: timestamp.toISOString(),
        value: Math.random() * (max - min) + min
      });
    }
    return data;
  };

  const cpuChartData = {
    labels: metrics.cpu.map(d => new Date(d.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'CPU Usage %',
        data: metrics.cpu.map(d => d.value),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const memoryChartData = {
    labels: metrics.memory.map(d => new Date(d.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Memory Usage %',
        data: metrics.memory.map(d => d.value),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const requestsChartData = {
    labels: metrics.requests.map(d => new Date(d.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Requests per Minute',
        data: metrics.requests.map(d => d.value),
        backgroundColor: 'rgba(251, 146, 60, 0.8)',
        borderColor: 'rgb(251, 146, 60)',
        borderWidth: 1
      }
    ]
  };

  const responseTimeChartData = {
    labels: metrics.responseTime.map(d => new Date(d.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Response Time (ms)',
        data: metrics.responseTime.map(d => d.value),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const serviceHealthData = {
    labels: ['Healthy', 'Degraded', 'Down'],
    datasets: [
      {
        data: [
          metrics.services.healthy,
          metrics.services.degraded,
          metrics.services.down
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(251, 146, 60)',
          'rgb(239, 68, 68)'
        ],
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false
        }
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Performance Metrics</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.cpu[metrics.cpu.length - 1]?.value.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Average: {(metrics.cpu.reduce((a, b) => a + b.value, 0) / metrics.cpu.length).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.memory[metrics.memory.length - 1]?.value.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Average: {(metrics.memory.reduce((a, b) => a + b.value, 0) / metrics.memory.length).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requests/min</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.requests[metrics.requests.length - 1]?.value.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {metrics.requests.reduce((a, b) => a + b.value, 0).toFixed(0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.responseTime[metrics.responseTime.length - 1]?.value.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              P95: {Math.max(...metrics.responseTime.map(d => d.value)).toFixed(0)}ms
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>CPU Usage</CardTitle>
            <CardDescription>Real-time CPU utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Line data={cpuChartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Memory Usage</CardTitle>
            <CardDescription>System memory consumption</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Line data={memoryChartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request Rate</CardTitle>
            <CardDescription>Incoming requests per minute</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar data={requestsChartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Time</CardTitle>
            <CardDescription>Average response latency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Line data={responseTimeChartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Health */}
      <Card>
        <CardHeader>
          <CardTitle>Service Health</CardTitle>
          <CardDescription>Current status of all monitored services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-64">
              <Doughnut data={serviceHealthData} options={doughnutOptions} />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Service Summary</h4>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Services</span>
                    <span className="font-medium">
                      {metrics.services.healthy + metrics.services.degraded + metrics.services.down}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600">Healthy</span>
                    <span className="font-medium text-green-600">{metrics.services.healthy}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-orange-600">Degraded</span>
                    <span className="font-medium text-orange-600">{metrics.services.degraded}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-600">Down</span>
                    <span className="font-medium text-red-600">{metrics.services.down}</span>
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <div className="text-sm text-gray-500">
                  Last updated: {new Date().toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};