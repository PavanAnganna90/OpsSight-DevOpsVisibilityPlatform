import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { Card, Title, Text, Chip, ProgressBar } from 'react-native-paper';
import { MetricChart } from './MetricChart';
import { formatRelativeTime } from '../../utils';

const { width } = Dimensions.get('window');

interface MetricData {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  unit: string;
  type: 'gauge' | 'counter' | 'trend';
  category: 'performance' | 'infrastructure' | 'application' | 'business';
  status: 'normal' | 'warning' | 'critical';
  threshold?: {
    warning: number;
    critical: number;
  };
  chartData?: Array<{ x: string; y: number }>;
}

interface MetricsDashboardProps {
  teamId?: string;
  refreshInterval?: number;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  teamId,
  refreshInterval = 30000,
}) => {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Mock data - replace with actual API calls
  const mockMetrics: MetricData[] = [
    {
      id: '1',
      name: 'CPU Usage',
      value: 68.5,
      previousValue: 72.3,
      unit: '%',
      type: 'gauge',
      category: 'infrastructure',
      status: 'normal',
      threshold: { warning: 80, critical: 90 },
      chartData: [
        { x: '00:00', y: 65 },
        { x: '04:00', y: 70 },
        { x: '08:00', y: 78 },
        { x: '12:00', y: 72 },
        { x: '16:00', y: 69 },
        { x: '20:00', y: 68.5 },
      ],
    },
    {
      id: '2',
      name: 'Memory Usage',
      value: 4.2,
      previousValue: 3.8,
      unit: 'GB',
      type: 'gauge',
      category: 'infrastructure',
      status: 'warning',
      threshold: { warning: 4, critical: 6 },
      chartData: [
        { x: '00:00', y: 3.5 },
        { x: '04:00', y: 3.7 },
        { x: '08:00', y: 4.1 },
        { x: '12:00', y: 4.3 },
        { x: '16:00', y: 4.0 },
        { x: '20:00', y: 4.2 },
      ],
    },
    {
      id: '3',
      name: 'Request Rate',
      value: 1250,
      previousValue: 1180,
      unit: '/min',
      type: 'counter',
      category: 'application',
      status: 'normal',
      chartData: [
        { x: '00:00', y: 890 },
        { x: '04:00', y: 450 },
        { x: '08:00', y: 1100 },
        { x: '12:00', y: 1350 },
        { x: '16:00', y: 1280 },
        { x: '20:00', y: 1250 },
      ],
    },
    {
      id: '4',
      name: 'Response Time',
      value: 245,
      previousValue: 280,
      unit: 'ms',
      type: 'trend',
      category: 'performance',
      status: 'normal',
      threshold: { warning: 500, critical: 1000 },
      chartData: [
        { x: '00:00', y: 220 },
        { x: '04:00', y: 180 },
        { x: '08:00', y: 290 },
        { x: '12:00', y: 310 },
        { x: '16:00', y: 260 },
        { x: '20:00', y: 245 },
      ],
    },
    {
      id: '5',
      name: 'Error Rate',
      value: 0.8,
      previousValue: 1.2,
      unit: '%',
      type: 'gauge',
      category: 'application',
      status: 'normal',
      threshold: { warning: 2, critical: 5 },
      chartData: [
        { x: '00:00', y: 1.1 },
        { x: '04:00', y: 0.5 },
        { x: '08:00', y: 1.8 },
        { x: '12:00', y: 1.4 },
        { x: '16:00', y: 0.9 },
        { x: '20:00', y: 0.8 },
      ],
    },
    {
      id: '6',
      name: 'Active Users',
      value: 2847,
      previousValue: 2654,
      unit: '',
      type: 'counter',
      category: 'business',
      status: 'normal',
      chartData: [
        { x: '00:00', y: 1200 },
        { x: '04:00', y: 800 },
        { x: '08:00', y: 2100 },
        { x: '12:00', y: 2900 },
        { x: '16:00', y: 3100 },
        { x: '20:00', y: 2847 },
      ],
    },
  ];

  useEffect(() => {
    fetchMetrics();
    
    const interval = setInterval(() => {
      fetchMetrics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [teamId, refreshInterval]);

  const fetchMetrics = async () => {
    try {
      // Simulate API call with slight delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Add some randomness to simulate real-time updates
      const updatedMetrics = mockMetrics.map(metric => ({
        ...metric,
        value: metric.value + (Math.random() - 0.5) * (metric.value * 0.1),
        chartData: metric.chartData?.map(point => ({
          ...point,
          y: point.y + (Math.random() - 0.5) * (point.y * 0.05),
        })),
      }));
      
      setMetrics(updatedMetrics);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return '#F44336';
      case 'warning':
        return '#FF9800';
      case 'normal':
        return '#4CAF50';
      default:
        return '#9E9E9E';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'infrastructure':
        return '#2196F3';
      case 'performance':
        return '#9C27B0';
      case 'application':
        return '#4CAF50';
      case 'business':
        return '#FF9800';
      default:
        return '#757575';
    }
  };

  const getChartType = (metric: MetricData) => {
    switch (metric.type) {
      case 'gauge':
        return 'area';
      case 'counter':
        return 'bar';
      case 'trend':
        return 'line';
      default:
        return 'line';
    }
  };

  const renderMetricCard = (metric: MetricData) => (
    <View key={metric.id} style={styles.metricCard}>
      <MetricChart
        title={metric.name}
        data={metric.chartData || []}
        type={getChartType(metric)}
        color={getCategoryColor(metric.category)}
        currentValue={metric.value}
        previousValue={metric.previousValue}
        unit={metric.unit}
        height={180}
      />
      
      <View style={styles.metricFooter}>
        <View style={styles.statusContainer}>
          <Chip
            style={[styles.statusChip, { backgroundColor: getStatusColor(metric.status) }]}
            textStyle={styles.statusText}
            compact
          >
            {metric.status.toUpperCase()}
          </Chip>
          <Chip
            style={[styles.categoryChip, { backgroundColor: getCategoryColor(metric.category) }]}
            textStyle={styles.categoryText}
            compact
          >
            {metric.category.toUpperCase()}
          </Chip>
        </View>
        
        {metric.threshold && (
          <View style={styles.thresholdContainer}>
            <Text style={styles.thresholdLabel}>Thresholds:</Text>
            <Text style={styles.thresholdValue}>
              Warning: {metric.threshold.warning}{metric.unit} | 
              Critical: {metric.threshold.critical}{metric.unit}
            </Text>
            <ProgressBar
              progress={metric.value / metric.threshold.critical}
              color={getStatusColor(metric.status)}
              style={styles.thresholdBar}
            />
          </View>
        )}
      </View>
    </View>
  );

  const renderSummaryCards = () => {
    const criticalCount = metrics.filter(m => m.status === 'critical').length;
    const warningCount = metrics.filter(m => m.status === 'warning').length;
    const normalCount = metrics.filter(m => m.status === 'normal').length;

    return (
      <View style={styles.summaryContainer}>
        <Card style={[styles.summaryCard, styles.criticalCard]}>
          <Card.Content style={styles.summaryContent}>
            <Text style={styles.summaryValue}>{criticalCount}</Text>
            <Text style={styles.summaryLabel}>Critical</Text>
          </Card.Content>
        </Card>
        
        <Card style={[styles.summaryCard, styles.warningCard]}>
          <Card.Content style={styles.summaryContent}>
            <Text style={styles.summaryValue}>{warningCount}</Text>
            <Text style={styles.summaryLabel}>Warning</Text>
          </Card.Content>
        </Card>
        
        <Card style={[styles.summaryCard, styles.normalCard]}>
          <Card.Content style={styles.summaryContent}>
            <Text style={styles.summaryValue}>{normalCount}</Text>
            <Text style={styles.summaryLabel}>Normal</Text>
          </Card.Content>
        </Card>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#1976D2']}
          tintColor="#1976D2"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Title style={styles.title}>System Metrics</Title>
        <Text style={styles.lastUpdated}>
          Last updated: {formatRelativeTime(lastUpdated.toISOString())}
        </Text>
      </View>

      {renderSummaryCards()}

      <View style={styles.metricsContainer}>
        {metrics.map(renderMetricCard)}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
  },
  summaryContent: {
    alignItems: 'center',
    padding: 12,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 4,
  },
  criticalCard: {
    backgroundColor: '#F44336',
  },
  warningCard: {
    backgroundColor: '#FF9800',
  },
  normalCard: {
    backgroundColor: '#4CAF50',
  },
  metricsContainer: {
    padding: 16,
    paddingTop: 8,
  },
  metricCard: {
    marginBottom: 16,
  },
  metricFooter: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    elevation: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statusChip: {
    height: 24,
    marginRight: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  categoryChip: {
    height: 24,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  thresholdContainer: {
    marginTop: 8,
  },
  thresholdLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  thresholdValue: {
    fontSize: 11,
    color: '#424242',
    marginBottom: 8,
  },
  thresholdBar: {
    height: 4,
  },
});