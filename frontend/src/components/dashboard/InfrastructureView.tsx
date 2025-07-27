import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Server, 
  Database, 
  Cloud, 
  HardDrive, 
  Network, 
  Shield,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface ServiceStatus {
  name: string;
  type: 'compute' | 'storage' | 'network' | 'database' | 'cache';
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  metrics: {
    cpu?: number;
    memory?: number;
    disk?: number;
    connections?: number;
    latency?: number;
  };
  lastChecked: string;
}

interface InfrastructureMetrics {
  services: ServiceStatus[];
  alerts: {
    critical: number;
    warning: number;
    info: number;
  };
  resources: {
    totalCpu: number;
    usedCpu: number;
    totalMemory: number;
    usedMemory: number;
    totalStorage: number;
    usedStorage: number;
  };
}

export const InfrastructureView: React.FC = () => {
  const [infrastructure, setInfrastructure] = useState<InfrastructureMetrics>({
    services: [],
    alerts: { critical: 0, warning: 0, info: 0 },
    resources: {
      totalCpu: 0,
      usedCpu: 0,
      totalMemory: 0,
      usedMemory: 0,
      totalStorage: 0,
      usedStorage: 0
    }
  });

  const [selectedService, setSelectedService] = useState<ServiceStatus | null>(null);

  useEffect(() => {
    // Fetch infrastructure data
    fetchInfrastructureData();
    
    // Poll for updates every minute
    const interval = setInterval(fetchInfrastructureData, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchInfrastructureData = async () => {
    // Mock data - replace with actual API call
    const mockData: InfrastructureMetrics = {
      services: [
        {
          name: 'Web Server Cluster',
          type: 'compute',
          status: 'healthy',
          uptime: 99.99,
          metrics: { cpu: 45, memory: 62, connections: 1250 },
          lastChecked: new Date().toISOString()
        },
        {
          name: 'PostgreSQL Primary',
          type: 'database',
          status: 'healthy',
          uptime: 99.95,
          metrics: { cpu: 35, memory: 78, connections: 45 },
          lastChecked: new Date().toISOString()
        },
        {
          name: 'Redis Cache',
          type: 'cache',
          status: 'healthy',
          uptime: 100,
          metrics: { memory: 42, connections: 125, latency: 0.8 },
          lastChecked: new Date().toISOString()
        },
        {
          name: 'Load Balancer',
          type: 'network',
          status: 'healthy',
          uptime: 100,
          metrics: { connections: 2500, latency: 12 },
          lastChecked: new Date().toISOString()
        },
        {
          name: 'S3 Storage',
          type: 'storage',
          status: 'healthy',
          uptime: 99.999,
          metrics: { disk: 68 },
          lastChecked: new Date().toISOString()
        },
        {
          name: 'Monitoring Stack',
          type: 'compute',
          status: 'degraded',
          uptime: 98.5,
          metrics: { cpu: 85, memory: 92 },
          lastChecked: new Date().toISOString()
        }
      ],
      alerts: {
        critical: 0,
        warning: 1,
        info: 3
      },
      resources: {
        totalCpu: 16,
        usedCpu: 8.5,
        totalMemory: 64,
        usedMemory: 42,
        totalStorage: 1000,
        usedStorage: 680
      }
    };
    
    setInfrastructure(mockData);
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'compute': return <Server className="h-5 w-5" />;
      case 'database': return <Database className="h-5 w-5" />;
      case 'cache': return <Database className="h-5 w-5" />;
      case 'network': return <Network className="h-5 w-5" />;
      case 'storage': return <HardDrive className="h-5 w-5" />;
      default: return <Cloud className="h-5 w-5" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'down': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      case 'down': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Infrastructure Overview</h2>
        <div className="flex items-center space-x-4">
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {infrastructure.alerts.critical} Critical
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-100 text-yellow-800">
            <AlertCircle className="h-3 w-3" />
            {infrastructure.alerts.warning} Warning
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {infrastructure.alerts.info} Info
          </Badge>
        </div>
      </div>

      {/* Resource Usage Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{infrastructure.resources.usedCpu} / {infrastructure.resources.totalCpu} vCPUs</span>
                <span className="font-medium">
                  {((infrastructure.resources.usedCpu / infrastructure.resources.totalCpu) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={(infrastructure.resources.usedCpu / infrastructure.resources.totalCpu) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{infrastructure.resources.usedMemory} / {infrastructure.resources.totalMemory} GB</span>
                <span className="font-medium">
                  {((infrastructure.resources.usedMemory / infrastructure.resources.totalMemory) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={(infrastructure.resources.usedMemory / infrastructure.resources.totalMemory) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{infrastructure.resources.usedStorage} / {infrastructure.resources.totalStorage} GB</span>
                <span className="font-medium">
                  {((infrastructure.resources.usedStorage / infrastructure.resources.totalStorage) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={(infrastructure.resources.usedStorage / infrastructure.resources.totalStorage) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
          <CardDescription>Real-time status of infrastructure services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {infrastructure.services.map((service) => (
              <Card 
                key={service.name}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedService(service)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getServiceIcon(service.type)}
                      <CardTitle className="text-sm">{service.name}</CardTitle>
                    </div>
                    {getStatusIcon(service.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className={getStatusColor(service.status)}>
                        {service.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {service.uptime}% uptime
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {service.metrics.cpu !== undefined && (
                        <div>
                          <span className="text-muted-foreground">CPU:</span>
                          <span className="ml-1 font-medium">{service.metrics.cpu}%</span>
                        </div>
                      )}
                      {service.metrics.memory !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Memory:</span>
                          <span className="ml-1 font-medium">{service.metrics.memory}%</span>
                        </div>
                      )}
                      {service.metrics.connections !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Connections:</span>
                          <span className="ml-1 font-medium">{service.metrics.connections}</span>
                        </div>
                      )}
                      {service.metrics.latency !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Latency:</span>
                          <span className="ml-1 font-medium">{service.metrics.latency}ms</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Network Topology Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Network Topology</CardTitle>
          <CardDescription>Visual representation of infrastructure connections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center space-y-4">
              <Cloud className="h-16 w-16 text-gray-400 mx-auto" />
              <p className="text-gray-500">Interactive network topology diagram</p>
              <p className="text-sm text-gray-400">
                Shows connections between services, load balancers, and external resources
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Detail Modal */}
      {selectedService && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedService(null)}
        >
          <Card className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getServiceIcon(selectedService.type)}
                  <CardTitle>{selectedService.name}</CardTitle>
                </div>
                <button
                  onClick={() => setSelectedService(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(selectedService.status)}>
                      {selectedService.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Uptime</p>
                    <p className="font-medium">{selectedService.uptime}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium capitalize">{selectedService.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Checked</p>
                    <p className="font-medium">
                      {new Date(selectedService.lastChecked).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Metrics</h4>
                  <div className="space-y-2">
                    {selectedService.metrics.cpu !== undefined && (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>CPU Usage</span>
                          <span>{selectedService.metrics.cpu}%</span>
                        </div>
                        <Progress value={selectedService.metrics.cpu} className="h-2" />
                      </div>
                    )}
                    {selectedService.metrics.memory !== undefined && (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Memory Usage</span>
                          <span>{selectedService.metrics.memory}%</span>
                        </div>
                        <Progress value={selectedService.metrics.memory} className="h-2" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};