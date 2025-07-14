import { useState, useEffect } from 'react';

interface SystemMetric {
  name: string;
  status: 'excellent' | 'healthy' | 'warning' | 'critical';
  value: number;
  duration: string;
  trend: string;
  icon: string;
  color: string;
  details: string;
  lastUpdate?: Date;
}

interface LiveEvent {
  time: string;
  type: string;
  message: string;
  service: string;
  status: 'success' | 'warning' | 'error' | 'info';
  icon: string;
  id: string;
}

interface SparklineData {
  cpu: number[];
  memory: number[];
  network: number[];
  storage: number[];
}

export function useLiveData() {
  const [systemPulse, setSystemPulse] = useState<SystemMetric[]>([
    {
      name: 'CI/CD Pipelines',
      status: 'healthy',
      value: 98.7,
      duration: '2.3min avg',
      trend: '+5%',
      icon: '🚀',
      color: 'emerald',
      details: '24 active, 3 queued',
      lastUpdate: new Date()
    },
    {
      name: 'Kubernetes',
      status: 'excellent', 
      value: 99.4,
      duration: '12 restarts',
      trend: '-2 today',
      icon: '⚙️',
      color: 'blue',
      details: '847 pods running',
      lastUpdate: new Date()
    },
    {
      name: 'Cloud Cost',
      status: 'warning',
      value: 87.1,
      duration: '$2,847/day',
      trend: '+12%',
      icon: '💰',
      color: 'amber',
      details: '7-day trend up',
      lastUpdate: new Date()
    },
    {
      name: 'Response Time',
      status: 'excellent',
      value: 96.8,
      duration: '18ms avg',
      trend: '-8ms',
      icon: '⚡',
      color: 'cyan',
      details: 'P95: 45ms',
      lastUpdate: new Date()
    }
  ]);

  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([
    {
      id: '1',
      time: '2 min ago',
      type: 'deployment',
      message: 'Production deployment completed successfully',
      service: 'auth-service-v2.1.3',
      status: 'success',
      icon: '🚀'
    },
    {
      id: '2',
      time: '5 min ago', 
      type: 'alert',
      message: 'CPU usage spike detected and auto-resolved',
      service: 'api-gateway',
      status: 'warning',
      icon: '⚠️'
    },
    {
      id: '3',
      time: '8 min ago',
      type: 'scale',
      message: 'Auto-scaled replicas from 3 to 5',
      service: 'user-service',
      status: 'info',
      icon: '📈'
    },
    {
      id: '4',
      time: '12 min ago',
      type: 'backup',
      message: 'Database backup completed (2.1GB)',
      service: 'postgres-primary',
      status: 'success',
      icon: '💾'
    }
  ]);

  // Sparkline data for mini-charts
  const [sparklineData, setSparklineData] = useState<SparklineData>({
    cpu: [45, 52, 48, 61, 55, 67, 72, 68, 59, 63, 58, 65],
    memory: [38, 42, 45, 51, 48, 53, 59, 55, 52, 58, 61, 57],
    network: [23, 28, 31, 27, 35, 42, 38, 45, 41, 39, 44, 47],
    storage: [76, 77, 76, 78, 79, 78, 77, 79, 80, 79, 78, 77]
  });

  // Real-time system updates with realistic variations
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemPulse(prev => prev.map(metric => {
        // Different update patterns for different metrics
        let change = 0;
        let newTrend = metric.trend;
        let newDetails = metric.details;
        
        switch (metric.name) {
          case 'CI/CD Pipelines':
            change = (Math.random() - 0.5) * 1.5; // Moderate changes
            if (Math.random() < 0.1) { // 10% chance of trend update
              const pipelineCount = 20 + Math.floor(Math.random() * 10);
              const queueCount = Math.floor(Math.random() * 5);
              newDetails = `${pipelineCount} active, ${queueCount} queued`;
              newTrend = queueCount > 2 ? '+queue' : 'stable';
            }
            break;
            
          case 'Kubernetes':
            change = (Math.random() - 0.5) * 0.8; // Smaller changes for stable systems
            if (Math.random() < 0.05) { // 5% chance of restart
              const restarts = Math.floor(Math.random() * 20);
              newDetails = `847 pods running`;
              newTrend = restarts > 15 ? '+restarts' : '-2 today';
            }
            break;
            
          case 'Cloud Cost':
            change = (Math.random() - 0.3) * 2; // Slight upward bias
            if (Math.random() < 0.15) { // 15% chance of cost update
              const dailyCost = 2800 + Math.floor(Math.random() * 200);
              newDetails = '7-day trend up';
              newTrend = dailyCost > 2900 ? '+15%' : '+12%';
            }
            break;
            
          case 'Response Time':
            change = (Math.random() - 0.6) * 2; // Slight downward bias (optimization)
            if (Math.random() < 0.2) { // 20% chance of latency update
              const avgMs = 15 + Math.floor(Math.random() * 10);
              const p95Ms = 40 + Math.floor(Math.random() * 15);
              newDetails = `P95: ${p95Ms}ms`;
              newTrend = avgMs < 20 ? '-8ms' : '+3ms';
            }
            break;
        }
        
        const newValue = Math.max(85, Math.min(100, metric.value + change));
        
        // Update status based on value and metric type
        let newStatus: typeof metric.status = 'healthy';
        if (metric.name === 'Cloud Cost') {
          // Cost has different thresholds
          if (newValue >= 90) newStatus = 'healthy';
          else if (newValue >= 80) newStatus = 'warning';
          else newStatus = 'critical';
        } else {
          // Standard thresholds for other metrics
          if (newValue >= 95) newStatus = 'excellent';
          else if (newValue >= 90) newStatus = 'healthy';
          else if (newValue >= 80) newStatus = 'warning';
          else newStatus = 'critical';
        }

        return {
          ...metric,
          value: Math.round(newValue * 10) / 10,
          status: newStatus,
          trend: newTrend,
          details: newDetails,
          lastUpdate: new Date()
        };
      }));
    }, 4000); // Update every 4 seconds for more realistic feel

    return () => clearInterval(interval);
  }, []);

  // Event generation with realistic scenarios
  useEffect(() => {
    const eventInterval = setInterval(() => {
      if (Math.random() < 0.4) { // 40% chance of new event
        const eventTemplates = [
          {
            type: 'deployment',
            messages: [
              'Staging deployment started',
              'Production deployment completed',
              'Rollback initiated successfully',
              'Feature flag updated in production'
            ],
            services: ['web-frontend', 'auth-service', 'payment-api', 'notification-service'],
            statuses: ['info', 'success', 'warning'] as const,
            icon: '🚀'
          },
          {
            type: 'monitoring',
            messages: [
              'Health check completed',
              'SSL certificate renewed',
              'Performance metrics collected',
              'Security scan completed'
            ],
            services: ['load-balancer', 'cdn-edge', 'monitoring-agent', 'security-scanner'],
            statuses: ['success', 'info'] as const,
            icon: '💚'
          },
          {
            type: 'infrastructure',
            messages: [
              'Pod auto-scaled successfully',
              'Database connection pool optimized',
              'Cache miss rate improved',
              'Network latency reduced'
            ],
            services: ['k8s-cluster', 'postgres-pool', 'redis-cache', 'network-optimizer'],
            statuses: ['success', 'info'] as const,
            icon: '📈'
          },
          {
            type: 'alert',
            messages: [
              'Memory usage threshold approached',
              'Disk space warning resolved',
              'API rate limit threshold reached',
              'Backup schedule running behind'
            ],
            services: ['api-gateway', 'storage-service', 'rate-limiter', 'backup-service'],
            statuses: ['warning', 'info'] as const,
            icon: '⚠️'
          }
        ];

        const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
        const message = template.messages[Math.floor(Math.random() * template.messages.length)];
        const service = template.services[Math.floor(Math.random() * template.services.length)];
        const status = template.statuses[Math.floor(Math.random() * template.statuses.length)];

        const newEvent: LiveEvent = {
          id: Date.now().toString(),
          time: 'Just now',
          type: template.type,
          message,
          service,
          status,
          icon: template.icon
        };

        setLiveEvents(prev => [newEvent, ...prev.slice(0, 9)]); // Keep last 10 events
      }
    }, 6000); // New event every 6 seconds

    return () => clearInterval(eventInterval);
  }, []);

  // Update sparkline data for mini charts
  useEffect(() => {
    const sparklineInterval = setInterval(() => {
      setSparklineData(prev => ({
        cpu: [...prev.cpu.slice(1), 45 + Math.floor(Math.random() * 40)],
        memory: [...prev.memory.slice(1), 35 + Math.floor(Math.random() * 35)],
        network: [...prev.network.slice(1), 20 + Math.floor(Math.random() * 40)],
        storage: [...prev.storage.slice(1), 75 + Math.floor(Math.random() * 10)]
      }));
    }, 2000); // Update charts every 2 seconds

    return () => clearInterval(sparklineInterval);
  }, []);

  // Age events realistically
  useEffect(() => {
    const ageInterval = setInterval(() => {
      setLiveEvents(prev => prev.map(event => {
        if (event.time === 'Just now') return { ...event, time: '1 min ago' };
        if (event.time === '1 min ago') return { ...event, time: '2 min ago' };
        if (event.time === '2 min ago') return { ...event, time: '3 min ago' };
        if (event.time === '3 min ago') return { ...event, time: '5 min ago' };
        if (event.time === '5 min ago') return { ...event, time: '8 min ago' };
        if (event.time === '8 min ago') return { ...event, time: '12 min ago' };
        if (event.time === '12 min ago') return { ...event, time: '18 min ago' };
        return event;
      }));
    }, 60000); // Age events every minute

    return () => clearInterval(ageInterval);
  }, []);

  return {
    systemPulse,
    liveEvents,
    sparklineData
  };
} 