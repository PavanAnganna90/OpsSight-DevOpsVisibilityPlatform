import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const { width } = Dimensions.get('window');

export const MetricCardSkeleton: React.FC = () => (
  <SkeletonPlaceholder borderRadius={8}>
    <SkeletonPlaceholder.Item marginBottom={16}>
      <SkeletonPlaceholder.Item width={width - 32} height={280} />
    </SkeletonPlaceholder.Item>
  </SkeletonPlaceholder>
);

export const AlertCardSkeleton: React.FC = () => (
  <SkeletonPlaceholder borderRadius={8}>
    <SkeletonPlaceholder.Item marginBottom={12} padding={16}>
      <SkeletonPlaceholder.Item flexDirection="row" alignItems="center" marginBottom={8}>
        <SkeletonPlaceholder.Item width={20} height={20} borderRadius={10} marginRight={8} />
        <SkeletonPlaceholder.Item width={200} height={20} />
        <SkeletonPlaceholder.Item marginLeft="auto">
          <SkeletonPlaceholder.Item width={60} height={24} borderRadius={12} />
        </SkeletonPlaceholder.Item>
      </SkeletonPlaceholder.Item>
      <SkeletonPlaceholder.Item width={width - 64} height={40} marginBottom={8} />
      <SkeletonPlaceholder.Item flexDirection="row" justifyContent="space-between">
        <SkeletonPlaceholder.Item width={80} height={16} />
        <SkeletonPlaceholder.Item width={60} height={16} />
      </SkeletonPlaceholder.Item>
    </SkeletonPlaceholder.Item>
  </SkeletonPlaceholder>
);

export const HealthIndicatorSkeleton: React.FC = () => (
  <SkeletonPlaceholder borderRadius={8}>
    <SkeletonPlaceholder.Item marginBottom={12} padding={16}>
      <SkeletonPlaceholder.Item flexDirection="row" alignItems="center" marginBottom={8}>
        <SkeletonPlaceholder.Item width={20} height={20} borderRadius={10} marginRight={8} />
        <SkeletonPlaceholder.Item width={150} height={20} />
        <SkeletonPlaceholder.Item marginLeft="auto">
          <SkeletonPlaceholder.Item width={24} height={24} borderRadius={12} />
        </SkeletonPlaceholder.Item>
      </SkeletonPlaceholder.Item>
      <SkeletonPlaceholder.Item width={width - 64} height={32} marginBottom={12} />
      <SkeletonPlaceholder.Item flexDirection="row" marginBottom={8}>
        <SkeletonPlaceholder.Item width={80} height={40} marginRight={16} />
        <SkeletonPlaceholder.Item width={80} height={40} />
      </SkeletonPlaceholder.Item>
      <SkeletonPlaceholder.Item>
        <SkeletonPlaceholder.Item width={100} height={14} marginBottom={4} />
        <SkeletonPlaceholder.Item width={width - 64} height={12} marginBottom={2} />
        <SkeletonPlaceholder.Item width={width - 64} height={12} marginBottom={2} />
        <SkeletonPlaceholder.Item width={width - 64} height={12} />
      </SkeletonPlaceholder.Item>
    </SkeletonPlaceholder.Item>
  </SkeletonPlaceholder>
);

export const DashboardSkeleton: React.FC = () => (
  <View style={styles.container}>
    <SkeletonPlaceholder borderRadius={8}>
      {/* Header */}
      <SkeletonPlaceholder.Item padding={16}>
        <SkeletonPlaceholder.Item width={120} height={24} marginBottom={4} />
        <SkeletonPlaceholder.Item width={200} height={16} />
      </SkeletonPlaceholder.Item>
      
      {/* Summary Cards */}
      <SkeletonPlaceholder.Item flexDirection="row" padding={16} paddingTop={0}>
        <SkeletonPlaceholder.Item flex={1} height={80} marginRight={8} />
        <SkeletonPlaceholder.Item flex={1} height={80} marginHorizontal={4} />
        <SkeletonPlaceholder.Item flex={1} height={80} marginLeft={8} />
      </SkeletonPlaceholder.Item>
    </SkeletonPlaceholder>
    
    {/* Metric Cards */}
    <View style={styles.content}>
      <MetricCardSkeleton />
      <MetricCardSkeleton />
      <MetricCardSkeleton />
    </View>
  </View>
);

export const AlertsListSkeleton: React.FC = () => (
  <View style={styles.container}>
    <SkeletonPlaceholder borderRadius={8}>
      {/* Search Bar */}
      <SkeletonPlaceholder.Item margin={16}>
        <SkeletonPlaceholder.Item width={width - 32} height={48} />
      </SkeletonPlaceholder.Item>
      
      {/* Filter Chips */}
      <SkeletonPlaceholder.Item flexDirection="row" paddingHorizontal={16} marginBottom={16}>
        <SkeletonPlaceholder.Item width={80} height={32} marginRight={8} />
        <SkeletonPlaceholder.Item width={60} height={32} marginRight={8} />
        <SkeletonPlaceholder.Item width={70} height={32} />
      </SkeletonPlaceholder.Item>
    </SkeletonPlaceholder>
    
    {/* Alert Cards */}
    <View style={styles.content}>
      <AlertCardSkeleton />
      <AlertCardSkeleton />
      <AlertCardSkeleton />
      <AlertCardSkeleton />
    </View>
  </View>
);

export const HealthIndicatorsSkeleton: React.FC = () => (
  <View style={styles.container}>
    <SkeletonPlaceholder borderRadius={8}>
      {/* Overall Health Card */}
      <SkeletonPlaceholder.Item margin={16}>
        <SkeletonPlaceholder.Item height={120} />
      </SkeletonPlaceholder.Item>
    </SkeletonPlaceholder>
    
    {/* Health Indicator Cards */}
    <View style={styles.content}>
      <HealthIndicatorSkeleton />
      <HealthIndicatorSkeleton />
      <HealthIndicatorSkeleton />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    paddingHorizontal: 16,
  },
});