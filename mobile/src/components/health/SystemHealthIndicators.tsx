import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Card, Title, Text, Chip, ProgressBar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { formatRelativeTime } from '../../utils';

const { width } = Dimensions.get('window');

interface HealthIndicator {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  category: 'infrastructure' | 'application' | 'database' | 'external';
  description: string;
  lastChecked: string;
  responseTime?: number;
  uptime?: number;
  details?: {
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      message?: string;
      value?: string | number;
    }>;
  };
}

interface SystemHealthIndicatorsProps {
  onIndicatorPress?: (indicator: HealthIndicator) => void;
  refreshInterval?: number;
}

export const SystemHealthIndicators: React.FC<SystemHealthIndicatorsProps> = ({
  onIndicatorPress,
  refreshInterval = 60000,
}) => {
  const [indicators, setIndicators] = useState<HealthIndicator[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data - replace with actual health check API
  const mockIndicators: HealthIndicator[] = [
    {
      id: '1',
      name: 'API Gateway',
      status: 'healthy',
      category: 'infrastructure',
      description: 'Main API gateway is responding normally',
      lastChecked: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      responseTime: 45,
      uptime: 99.98,
      details: {
        checks: [
          { name: 'HTTP Health Check', status: 'pass', message: 'Responding on port 443' },
          { name: 'SSL Certificate', status: 'pass', value: '89 days remaining' },
          { name: 'Load Balancer', status: 'pass', message: 'All nodes healthy' },
        ],
      },
    },
    {
      id: '2',
      name: 'Database Cluster',
      status: 'degraded',
      category: 'database',
      description: 'One replica is experiencing high latency',
      lastChecked: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
      responseTime: 120,
      uptime: 99.85,
      details: {
        checks: [
          { name: 'Primary DB', status: 'pass', message: 'Responding normally' },
          { name: 'Replica 1', status: 'warn', message: 'High latency detected' },
          { name: 'Replica 2', status: 'pass', message: 'Responding normally' },
          { name: 'Connection Pool', status: 'pass', value: '85% utilized' },
        ],
      },
    },
    {
      id: '3',
      name: 'Application Services',
      status: 'healthy',
      category: 'application',
      description: 'All microservices are operational',
      lastChecked: new Date(Date.now() - 30 * 1000).toISOString(),
      responseTime: 78,
      uptime: 99.95,
      details: {
        checks: [
          { name: 'User Service', status: 'pass', message: 'Healthy' },
          { name: 'Auth Service', status: 'pass', message: 'Healthy' },
          { name: 'Notification Service', status: 'pass', message: 'Healthy' },
          { name: 'Analytics Service', status: 'pass', message: 'Healthy' },
        ],
      },
    },
    {
      id: '4',
      name: 'External APIs',
      status: 'unhealthy',
      category: 'external',
      description: 'Payment gateway is experiencing issues',
      lastChecked: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      responseTime: 2500,
      uptime: 97.2,
      details: {
        checks: [
          { name: 'Payment Gateway', status: 'fail', message: 'Connection timeout' },
          { name: 'Email Service', status: 'pass', message: 'Operational' },
          { name: 'SMS Service', status: 'pass', message: 'Operational' },
          { name: 'CDN', status: 'pass', message: 'All edge locations healthy' },
        ],
      },
    },
  ];

  useEffect(() => {
    fetchHealthIndicators();
    
    const interval = setInterval(() => {
      fetchHealthIndicators();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const fetchHealthIndicators = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Add some randomness to simulate status changes
      const updatedIndicators = mockIndicators.map(indicator => {
        const random = Math.random();
        let status = indicator.status;
        
        // Occasionally change status for demo
        if (random > 0.95) {
          const statuses: HealthIndicator['status'][] = ['healthy', 'degraded', 'unhealthy'];
          status = statuses[Math.floor(Math.random() * statuses.length)];
        }
        
        return {
          ...indicator,
          status,
          lastChecked: new Date().toISOString(),
          responseTime: indicator.responseTime ? 
            Math.max(10, indicator.responseTime + (Math.random() - 0.5) * 20) : undefined,
        };
      });
      
      setIndicators(updatedIndicators);
    } catch (error) {
      console.error('Error fetching health indicators:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: HealthIndicator['status']) => {
    switch (status) {
      case 'healthy':
        return '#4CAF50';
      case 'degraded':
        return '#FF9800';
      case 'unhealthy':
        return '#F44336';
      case 'unknown':
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: HealthIndicator['status']) => {
    switch (status) {
      case 'healthy':
        return 'checkmark-circle';
      case 'degraded':
        return 'warning';
      case 'unhealthy':
        return 'close-circle';
      case 'unknown':
        return 'help-circle';
      default:
        return 'help-circle';
    }
  };

  const getCategoryIcon = (category: HealthIndicator['category']) => {
    switch (category) {
      case 'infrastructure':
        return 'server';
      case 'application':
        return 'apps';
      case 'database':
        return 'library';
      case 'external':
        return 'globe';
      default:
        return 'hardware-chip';
    }
  };

  const getCheckStatusColor = (status: 'pass' | 'fail' | 'warn') => {
    switch (status) {
      case 'pass':
        return '#4CAF50';
      case 'warn':
        return '#FF9800';
      case 'fail':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const renderHealthIndicator = (indicator: HealthIndicator) => (
    <TouchableOpacity
      key={indicator.id}
      onPress={() => onIndicatorPress?.(indicator)}
      activeOpacity={0.7}
    >
      <Card style={styles.indicatorCard}>
        <Card.Content>
          <View style={styles.indicatorHeader}>
            <View style={styles.titleRow}>
              <Ionicons
                name={getCategoryIcon(indicator.category)}
                size={20}
                color="#1976D2"
                style={styles.categoryIcon}
              />
              <Title style={styles.indicatorTitle}>{indicator.name}</Title>
            </View>
            
            <View style={styles.statusContainer}>
              <Ionicons
                name={getStatusIcon(indicator.status)}
                size={24}
                color={getStatusColor(indicator.status)}
              />
              <Chip
                style={[styles.statusChip, { backgroundColor: getStatusColor(indicator.status) }]}
                textStyle={styles.statusText}
                compact
              >
                {indicator.status.toUpperCase()}
              </Chip>
            </View>
          </View>

          <Text style={styles.description}>{indicator.description}</Text>

          {/* Metrics Row */}
          <View style={styles.metricsRow}>
            {indicator.responseTime && (
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Response Time</Text>
                <Text style={styles.metricValue}>{indicator.responseTime}ms</Text>
              </View>
            )}
            
            {indicator.uptime && (
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Uptime</Text>
                <Text style={styles.metricValue}>{indicator.uptime}%</Text>
                <ProgressBar
                  progress={indicator.uptime / 100}
                  color={getStatusColor(indicator.status)}
                  style={styles.uptimeBar}
                />
              </View>
            )}
          </View>

          {/* Health Checks */}
          {indicator.details?.checks && (
            <View style={styles.checksContainer}>
              <Text style={styles.checksLabel}>Health Checks</Text>
              {indicator.details.checks.slice(0, 3).map((check, index) => (
                <View key={index} style={styles.checkItem}>
                  <Ionicons
                    name={check.status === 'pass' ? 'checkmark' : check.status === 'warn' ? 'warning' : 'close'}
                    size={16}
                    color={getCheckStatusColor(check.status)}
                  />
                  <Text style={styles.checkName}>{check.name}</Text>
                  <Text style={styles.checkValue}>
                    {check.value || check.message || check.status}
                  </Text>
                </View>
              ))}
              {indicator.details.checks.length > 3 && (
                <Text style={styles.moreChecks}>
                  +{indicator.details.checks.length - 3} more checks
                </Text>
              )}
            </View>
          )}

          <Text style={styles.lastChecked}>
            Last checked: {formatRelativeTime(indicator.lastChecked)}
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderOverallHealth = () => {
    const healthyCount = indicators.filter(i => i.status === 'healthy').length;
    const degradedCount = indicators.filter(i => i.status === 'degraded').length;
    const unhealthyCount = indicators.filter(i => i.status === 'unhealthy').length;
    const totalCount = indicators.length;

    const overallHealth = unhealthyCount > 0 ? 'unhealthy' : 
                         degradedCount > 0 ? 'degraded' : 'healthy';

    return (
      <Card style={[styles.overallCard, { borderLeftColor: getStatusColor(overallHealth) }]}>
        <Card.Content>
          <View style={styles.overallHeader}>
            <View style={styles.overallTitle}>
              <Ionicons
                name={getStatusIcon(overallHealth)}
                size={32}
                color={getStatusColor(overallHealth)}
              />
              <View style={styles.overallText}>
                <Title style={styles.overallStatus}>System Health</Title>
                <Text style={[styles.overallStatusText, { color: getStatusColor(overallHealth) }]}>
                  {overallHealth.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.overallStats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{healthyCount}</Text>
              <Text style={styles.statLabel}>Healthy</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{degradedCount}</Text>
              <Text style={styles.statLabel}>Degraded</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{unhealthyCount}</Text>
              <Text style={styles.statLabel}>Unhealthy</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{totalCount}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {renderOverallHealth()}
      {indicators.map(renderHealthIndicator)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  overallCard: {
    marginBottom: 16,
    elevation: 4,
    borderLeftWidth: 4,
  },
  overallHeader: {
    marginBottom: 16,
  },
  overallTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overallText: {
    marginLeft: 12,
  },
  overallStatus: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  overallStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  overallStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  indicatorCard: {
    marginBottom: 12,
    elevation: 2,
  },
  indicatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    marginRight: 8,
  },
  indicatorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChip: {
    height: 24,
    marginLeft: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metric: {
    flex: 1,
    marginRight: 16,
  },
  metricLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  uptimeBar: {
    height: 4,
    marginTop: 4,
  },
  checksContainer: {
    marginBottom: 12,
  },
  checksLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 8,
    fontWeight: '600',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkName: {
    fontSize: 12,
    color: '#424242',
    marginLeft: 8,
    flex: 1,
  },
  checkValue: {
    fontSize: 12,
    color: '#757575',
  },
  moreChecks: {
    fontSize: 12,
    color: '#1976D2',
    marginTop: 4,
    fontStyle: 'italic',
  },
  lastChecked: {
    fontSize: 11,
    color: '#9E9E9E',
    fontStyle: 'italic',
  },
});