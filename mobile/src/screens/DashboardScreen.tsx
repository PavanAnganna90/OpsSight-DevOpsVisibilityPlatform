import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Appbar, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MetricsDashboard } from '../components/metrics/MetricsDashboard';
import { SystemHealthIndicators } from '../components/health/SystemHealthIndicators';
import { PipelineStatusOverview } from '../components/pipelines/PipelineStatusOverview';
import { InfrastructureMonitoringCards } from '../components/infrastructure/InfrastructureMonitoringCards';
import { useAppSelector } from '../hooks/useAppSelector';

export const DashboardScreen: React.FC = () => {
  const [selectedView, setSelectedView] = useState('metrics');
  const [refreshing, setRefreshing] = useState(false);
  const { selectedTeamId } = useAppSelector(state => state.dashboard);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Trigger refresh in child components
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleHealthIndicatorPress = (indicator: any) => {
    // Navigate to detailed health check view
    console.log('Health indicator pressed:', indicator);
  };

  const handlePipelinePress = (pipeline: any) => {
    // Navigate to pipeline details
    console.log('Pipeline pressed:', pipeline);
  };

  const handlePipelineStepPress = (pipeline: any, step: any) => {
    // Navigate to step details/logs
    console.log('Pipeline step pressed:', pipeline.id, step.id);
  };

  const handleResourcePress = (resource: any) => {
    // Navigate to resource details
    console.log('Resource pressed:', resource);
  };

  const handleScaleResource = (resourceId: string, action: 'up' | 'down') => {
    // Handle resource scaling
    console.log(`Scale ${action} resource:`, resourceId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.Content title="Dashboard" subtitle="Real-time system overview" />
        <Appbar.Action 
          icon="refresh" 
          onPress={handleRefresh}
          disabled={refreshing}
        />
        <Appbar.Action 
          icon="cog" 
          onPress={() => {
            // Navigate to dashboard settings
          }} 
        />
      </Appbar.Header>

      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={selectedView}
          onValueChange={setSelectedView}
          buttons={[
            {
              value: 'metrics',
              label: 'Metrics',
              icon: 'chart-line',
            },
            {
              value: 'health',
              label: 'Health',
              icon: 'heart-pulse',
            },
            {
              value: 'pipelines',
              label: 'Pipelines',
              icon: 'pipe',
            },
            {
              value: 'infrastructure',
              label: 'Infrastructure',
              icon: 'server',
            },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <ScrollView
        style={styles.content}
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
        {selectedView === 'metrics' && (
          <MetricsDashboard
            teamId={selectedTeamId || undefined}
            refreshInterval={30000}
          />
        )}
        
        {selectedView === 'health' && (
          <SystemHealthIndicators
            onIndicatorPress={handleHealthIndicatorPress}
            refreshInterval={60000}
          />
        )}
        
        {selectedView === 'pipelines' && (
          <PipelineStatusOverview
            teamId={selectedTeamId || undefined}
            refreshInterval={30000}
            onPipelinePress={handlePipelinePress}
            onStepPress={handlePipelineStepPress}
          />
        )}
        
        {selectedView === 'infrastructure' && (
          <InfrastructureMonitoringCards
            teamId={selectedTeamId || undefined}
            refreshInterval={60000}
            onResourcePress={handleResourcePress}
            onScaleResource={handleScaleResource}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: '#1976D2',
  },
  segmentContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  segmentedButtons: {
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
  },
});