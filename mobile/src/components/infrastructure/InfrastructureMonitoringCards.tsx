import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Card, Title, Text, Chip, ProgressBar, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { formatRelativeTime } from '../../utils';

const { width } = Dimensions.get('window');

interface ResourceMetrics {
  cpu: { current: number; average: number; peak: number };
  memory: { current: number; total: number; percentage: number };
  storage: { used: number; total: number; percentage: number };
  network: { inbound: number; outbound: number };
}

interface InfrastructureResource {
  id: string;
  name: string;
  type: 'server' | 'container' | 'cluster' | 'database' | 'loadbalancer' | 'cdn';
  provider: 'aws' | 'azure' | 'gcp' | 'on-premise';
  region?: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  environment: 'production' | 'staging' | 'development';
  metrics: ResourceMetrics;
  cost?: {
    daily: number;
    monthly: number;
    currency: string;
  };
  lastUpdated: string;
  alertsCount: number;
  tags: string[];
}

interface InfrastructureMonitoringCardsProps {
  teamId?: string;
  refreshInterval?: number;
  onResourcePress?: (resource: InfrastructureResource) => void;
  onScaleResource?: (resourceId: string, action: 'up' | 'down') => void;
}

export const InfrastructureMonitoringCards: React.FC<InfrastructureMonitoringCardsProps> = ({
  teamId,
  refreshInterval = 60000,
  onResourcePress,
  onScaleResource,
}) => {
  const [resources, setResources] = useState<InfrastructureResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');

  // Mock data - replace with actual API calls
  const mockResources: InfrastructureResource[] = [
    {
      id: '1',
      name: 'Web Server Cluster',
      type: 'cluster',
      provider: 'aws',
      region: 'us-east-1',
      status: 'healthy',
      environment: 'production',
      metrics: {
        cpu: { current: 45, average: 42, peak: 78 },
        memory: { current: 6.2, total: 16, percentage: 39 },
        storage: { used: 250, total: 1000, percentage: 25 },
        network: { inbound: 125.5, outbound: 98.2 },
      },
      cost: { daily: 45.60, monthly: 1368, currency: 'USD' },
      lastUpdated: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      alertsCount: 0,
      tags: ['web', 'frontend', 'autoscaling'],
    },
    {
      id: '2',
      name: 'API Gateway',
      type: 'loadbalancer',
      provider: 'aws',
      region: 'us-east-1',
      status: 'warning',
      environment: 'production',
      metrics: {
        cpu: { current: 82, average: 65, peak: 95 },
        memory: { current: 12.8, total: 16, percentage: 80 },
        storage: { used: 45, total: 100, percentage: 45 },
        network: { inbound: 445.2, outbound: 382.1 },
      },
      cost: { daily: 28.40, monthly: 852, currency: 'USD' },
      lastUpdated: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
      alertsCount: 2,
      tags: ['api', 'gateway', 'high-traffic'],
    },
    {
      id: '3',
      name: 'PostgreSQL Primary',
      type: 'database',
      provider: 'gcp',
      region: 'us-central1',
      status: 'healthy',
      environment: 'production',
      metrics: {
        cpu: { current: 35, average: 32, peak: 68 },
        memory: { current: 22.5, total: 32, percentage: 70 },
        storage: { used: 450, total: 1000, percentage: 45 },
        network: { inbound: 85.3, outbound: 92.7 },
      },
      cost: { daily: 62.80, monthly: 1884, currency: 'USD' },
      lastUpdated: new Date(Date.now() - 30 * 1000).toISOString(),
      alertsCount: 0,
      tags: ['database', 'primary', 'critical'],
    },
    {
      id: '4',
      name: 'Redis Cache',
      type: 'database',
      provider: 'azure',
      region: 'east-us',
      status: 'critical',
      environment: 'production',
      metrics: {
        cpu: { current: 92, average: 85, peak: 98 },
        memory: { current: 7.8, total: 8, percentage: 97 },
        storage: { used: 7.5, total: 8, percentage: 94 },
        network: { inbound: 234.1, outbound: 187.5 },
      },
      cost: { daily: 15.20, monthly: 456, currency: 'USD' },
      lastUpdated: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      alertsCount: 4,
      tags: ['cache', 'redis', 'memory-intensive'],
    },
    {
      id: '5',
      name: 'Docker Containers',
      type: 'container',
      provider: 'on-premise',
      status: 'healthy',
      environment: 'staging',
      metrics: {
        cpu: { current: 28, average: 25, peak: 45 },
        memory: { current: 8.2, total: 16, percentage: 51 },
        storage: { used: 125, total: 500, percentage: 25 },
        network: { inbound: 45.8, outbound: 38.2 },
      },
      lastUpdated: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      alertsCount: 1,
      tags: ['containers', 'docker', 'microservices'],
    },
    {
      id: '6',
      name: 'CDN Edge Nodes',
      type: 'cdn',
      provider: 'aws',
      status: 'healthy',
      environment: 'production',
      metrics: {
        cpu: { current: 15, average: 18, peak: 35 },
        memory: { current: 2.1, total: 4, percentage: 52 },
        storage: { used: 850, total: 2000, percentage: 42 },
        network: { inbound: 1250.5, outbound: 1189.3 },
      },
      cost: { daily: 89.30, monthly: 2679, currency: 'USD' },
      lastUpdated: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
      alertsCount: 0,
      tags: ['cdn', 'edge', 'global'],
    },
  ];

  useEffect(() => {
    fetchResources();
    
    const interval = setInterval(() => {
      fetchResources();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [teamId, refreshInterval]);

  const fetchResources = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Add some randomness to simulate real-time updates
      const updatedResources = mockResources.map(resource => ({
        ...resource,
        metrics: {
          ...resource.metrics,
          cpu: {
            ...resource.metrics.cpu,
            current: Math.max(0, Math.min(100, resource.metrics.cpu.current + (Math.random() - 0.5) * 10)),
          },
          memory: {
            ...resource.metrics.memory,
            current: Math.max(0, resource.metrics.memory.current + (Math.random() - 0.5) * 1),
            percentage: Math.max(0, Math.min(100, resource.metrics.memory.percentage + (Math.random() - 0.5) * 5)),
          },
          network: {
            inbound: Math.max(0, resource.metrics.network.inbound + (Math.random() - 0.5) * 20),
            outbound: Math.max(0, resource.metrics.network.outbound + (Math.random() - 0.5) * 20),
          },
        },
        lastUpdated: new Date().toISOString(),
      }));
      
      setResources(updatedResources);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: InfrastructureResource['status']) => {
    switch (status) {
      case 'healthy':
        return '#4CAF50';
      case 'warning':
        return '#FF9800';
      case 'critical':
        return '#F44336';
      case 'offline':
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: InfrastructureResource['status']) => {
    switch (status) {
      case 'healthy':
        return 'checkmark-circle';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'alert-circle';
      case 'offline':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const getTypeIcon = (type: InfrastructureResource['type']) => {
    switch (type) {
      case 'server':
        return 'server';
      case 'container':
        return 'cube';
      case 'cluster':
        return 'grid';
      case 'database':
        return 'library';
      case 'loadbalancer':
        return 'shuffle';
      case 'cdn':
        return 'globe';
      default:
        return 'hardware-chip';
    }
  };

  const getProviderIcon = (provider: InfrastructureResource['provider']) => {
    switch (provider) {
      case 'aws':
        return 'cloud';
      case 'azure':
        return 'cloud';
      case 'gcp':
        return 'cloud';
      case 'on-premise':
        return 'business';
      default:
        return 'cloud';
    }
  };

  const getProviderColor = (provider: InfrastructureResource['provider']) => {
    switch (provider) {
      case 'aws':
        return '#FF9900';
      case 'azure':
        return '#0078D4';
      case 'gcp':
        return '#4285F4';
      case 'on-premise':
        return '#757575';
      default:
        return '#9E9E9E';
    }
  };

  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 GB';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatNetworkSpeed = (speed: number) => {
    return speed < 1024 ? `${speed.toFixed(1)} MB/s` : `${(speed / 1024).toFixed(1)} GB/s`;
  };

  const renderMetricBar = (label: string, current: number, max: number, unit: string, isWarning = false) => (
    <View style={styles.metricBar}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, isWarning && { color: '#FF9800' }]}>
          {current.toFixed(1)}{unit} / {max}{unit}
        </Text>
      </View>
      <ProgressBar
        progress={current / max}
        color={isWarning ? '#FF9800' : '#1976D2'}
        style={styles.progressBar}
      />
    </View>
  );

  const renderResourceCard = (resource: InfrastructureResource) => (
    <TouchableOpacity
      key={resource.id}
      onPress={() => onResourcePress?.(resource)}
      activeOpacity={0.8}
    >
      <Card style={[styles.resourceCard, { borderLeftColor: getStatusColor(resource.status) }]}>
        <Card.Content>
          {/* Header */}
          <View style={styles.resourceHeader}>
            <View style={styles.resourceInfo}>
              <View style={styles.titleRow}>
                <Ionicons
                  name={getTypeIcon(resource.type)}
                  size={20}
                  color="#1976D2"
                  style={styles.typeIcon}
                />
                <Title style={styles.resourceName}>{resource.name}</Title>
              </View>
              <View style={styles.resourceDetails}>
                <Chip
                  style={[styles.providerChip, { backgroundColor: getProviderColor(resource.provider) }]}
                  textStyle={styles.providerText}
                  compact
                >
                  {resource.provider.toUpperCase()}
                </Chip>
                {resource.region && (
                  <Text style={styles.regionText}>{resource.region}</Text>
                )}
              </View>
            </View>
            
            <View style={styles.statusContainer}>
              <Ionicons
                name={getStatusIcon(resource.status)}
                size={24}
                color={getStatusColor(resource.status)}
              />
              <Chip
                style={[styles.statusChip, { backgroundColor: getStatusColor(resource.status) }]}
                textStyle={styles.statusText}
                compact
              >
                {resource.status.toUpperCase()}
              </Chip>
              {resource.alertsCount > 0 && (
                <Chip
                  style={styles.alertsChip}
                  textStyle={styles.alertsText}
                  compact
                >
                  {resource.alertsCount} alerts
                </Chip>
              )}
            </View>
          </View>

          {/* Metrics */}
          <View style={styles.metricsContainer}>
            {/* CPU Usage */}
            {renderMetricBar(
              'CPU',
              resource.metrics.cpu.current,
              100,
              '%',
              resource.metrics.cpu.current > 80
            )}

            {/* Memory Usage */}
            {renderMetricBar(
              'Memory',
              resource.metrics.memory.current,
              resource.metrics.memory.total,
              'GB',
              resource.metrics.memory.percentage > 85
            )}

            {/* Storage Usage */}
            {renderMetricBar(
              'Storage',
              resource.metrics.storage.used,
              resource.metrics.storage.total,
              'GB',
              resource.metrics.storage.percentage > 90
            )}

            {/* Network */}
            <View style={styles.networkMetrics}>
              <View style={styles.networkItem}>
                <Text style={styles.networkLabel}>Network In</Text>
                <Text style={styles.networkValue}>
                  {formatNetworkSpeed(resource.metrics.network.inbound)}
                </Text>
              </View>
              <View style={styles.networkItem}>
                <Text style={styles.networkLabel}>Network Out</Text>
                <Text style={styles.networkValue}>
                  {formatNetworkSpeed(resource.metrics.network.outbound)}
                </Text>
              </View>
            </View>
          </View>

          {/* Cost Information */}
          {resource.cost && (
            <View style={styles.costContainer}>
              <Text style={styles.costLabel}>Cost</Text>
              <View style={styles.costValues}>
                <Text style={styles.costValue}>
                  ${resource.cost.daily.toFixed(2)}/day
                </Text>
                <Text style={styles.costValue}>
                  ${resource.cost.monthly.toFixed(0)}/month
                </Text>
              </View>
            </View>
          )}

          {/* Tags */}
          <View style={styles.tagsContainer}>
            {resource.tags.slice(0, 3).map((tag, index) => (
              <Chip key={index} style={styles.tag} textStyle={styles.tagText} compact>
                {tag}
              </Chip>
            ))}
            {resource.tags.length > 3 && (
              <Text style={styles.moreTags}>+{resource.tags.length - 3}</Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              onPress={() => console.log('View details', resource.id)}
              icon="eye"
              compact
              style={styles.actionButton}
            >
              Details
            </Button>
            
            {(resource.type === 'cluster' || resource.type === 'container') && (
              <>
                <Button
                  mode="outlined"
                  onPress={() => onScaleResource?.(resource.id, 'up')}
                  icon="arrow-up"
                  compact
                  style={styles.actionButton}
                >
                  Scale Up
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => onScaleResource?.(resource.id, 'down')}
                  icon="arrow-down"
                  compact
                  style={styles.actionButton}
                >
                  Scale Down
                </Button>
              </>
            )}
          </View>

          <Text style={styles.lastUpdated}>
            Last updated: {formatRelativeTime(resource.lastUpdated)}
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderSummary = () => {
    const healthyCount = resources.filter(r => r.status === 'healthy').length;
    const warningCount = resources.filter(r => r.status === 'warning').length;
    const criticalCount = resources.filter(r => r.status === 'critical').length;
    const offlineCount = resources.filter(r => r.status === 'offline').length;
    const totalCost = resources
      .filter(r => r.cost)
      .reduce((sum, r) => sum + (r.cost?.monthly || 0), 0);

    return (
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Title style={styles.summaryTitle}>Infrastructure Overview</Title>
          
          <View style={styles.summaryStats}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>{healthyCount}</Text>
              <Text style={styles.summaryLabel}>Healthy</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#FF9800' }]}>{warningCount}</Text>
              <Text style={styles.summaryLabel}>Warning</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#F44336' }]}>{criticalCount}</Text>
              <Text style={styles.summaryLabel}>Critical</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>${totalCost.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Monthly Cost</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const filteredResources = resources.filter(resource => {
    if (selectedEnvironment !== 'all' && resource.environment !== selectedEnvironment) {
      return false;
    }
    if (selectedProvider !== 'all' && resource.provider !== selectedProvider) {
      return false;
    }
    return true;
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderSummary()}
      
      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Button
            mode={selectedEnvironment === 'all' ? 'contained' : 'outlined'}
            onPress={() => setSelectedEnvironment('all')}
            compact
            style={styles.filterButton}
          >
            All
          </Button>
          <Button
            mode={selectedEnvironment === 'production' ? 'contained' : 'outlined'}
            onPress={() => setSelectedEnvironment('production')}
            compact
            style={styles.filterButton}
          >
            Production
          </Button>
          <Button
            mode={selectedEnvironment === 'staging' ? 'contained' : 'outlined'}
            onPress={() => setSelectedEnvironment('staging')}
            compact
            style={styles.filterButton}
          >
            Staging
          </Button>
          <Button
            mode={selectedProvider === 'aws' ? 'contained' : 'outlined'}
            onPress={() => setSelectedProvider('aws')}
            compact
            style={styles.filterButton}
          >
            AWS
          </Button>
          <Button
            mode={selectedProvider === 'gcp' ? 'contained' : 'outlined'}
            onPress={() => setSelectedProvider('gcp')}
            compact
            style={styles.filterButton}
          >
            GCP
          </Button>
          <Button
            mode={selectedProvider === 'azure' ? 'contained' : 'outlined'}
            onPress={() => setSelectedProvider('azure')}
            compact
            style={styles.filterButton}
          >
            Azure
          </Button>
        </ScrollView>
      </View>

      {filteredResources.map(renderResourceCard)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    padding: 16,
  },
  summaryCard: {
    marginBottom: 16,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 12,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
    textAlign: 'center',
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filterButton: {
    marginRight: 8,
  },
  resourceCard: {
    marginBottom: 16,
    elevation: 2,
    borderLeftWidth: 4,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  resourceInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeIcon: {
    marginRight: 8,
  },
  resourceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    flex: 1,
  },
  resourceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerChip: {
    height: 24,
    marginRight: 8,
  },
  providerText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  regionText: {
    fontSize: 12,
    color: '#757575',
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusChip: {
    height: 24,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  alertsChip: {
    height: 20,
    backgroundColor: '#F44336',
  },
  alertsText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  metricsContainer: {
    marginBottom: 16,
  },
  metricBar: {
    marginBottom: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 12,
    color: '#424242',
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  networkMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  networkItem: {
    flex: 1,
    alignItems: 'center',
  },
  networkLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  networkValue: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
  },
  costContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  costLabel: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '600',
  },
  costValues: {
    alignItems: 'flex-end',
  },
  costValue: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    height: 20,
    backgroundColor: '#E3F2FD',
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    color: '#1976D2',
    fontSize: 10,
  },
  moreTags: {
    fontSize: 12,
    color: '#757575',
    alignSelf: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    marginHorizontal: 2,
  },
  lastUpdated: {
    fontSize: 11,
    color: '#9E9E9E',
    fontStyle: 'italic',
    textAlign: 'right',
  },
});