import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Card, Title, Text, Chip, ProgressBar, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { formatRelativeTime } from '../../utils';

const { width } = Dimensions.get('window');

interface PipelineStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'cancelled';
  startTime?: string;
  endTime?: string;
  duration?: number;
  logs?: string;
}

interface Pipeline {
  id: string;
  name: string;
  repository: string;
  branch: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  trigger: 'manual' | 'push' | 'pr' | 'schedule';
  triggeredBy: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  progress: number;
  steps: PipelineStep[];
  environment: 'development' | 'staging' | 'production';
  commitHash: string;
  commitMessage: string;
}

interface PipelineStatusOverviewProps {
  teamId?: string;
  refreshInterval?: number;
  onPipelinePress?: (pipeline: Pipeline) => void;
  onStepPress?: (pipeline: Pipeline, step: PipelineStep) => void;
}

export const PipelineStatusOverview: React.FC<PipelineStatusOverviewProps> = ({
  teamId,
  refreshInterval = 30000,
  onPipelinePress,
  onStepPress,
}) => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mock data - replace with actual API calls
  const mockPipelines: Pipeline[] = [
    {
      id: '1',
      name: 'Frontend Build & Deploy',
      repository: 'opssight-frontend',
      branch: 'main',
      status: 'running',
      trigger: 'push',
      triggeredBy: 'john.doe',
      startTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      progress: 65,
      environment: 'production',
      commitHash: 'a1b2c3d',
      commitMessage: 'feat: add mobile dashboard optimizations',
      steps: [
        {
          id: 's1',
          name: 'Checkout Code',
          status: 'success',
          startTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() - 4.5 * 60 * 1000).toISOString(),
          duration: 30,
        },
        {
          id: 's2',
          name: 'Install Dependencies',
          status: 'success',
          startTime: new Date(Date.now() - 4.5 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
          duration: 90,
        },
        {
          id: 's3',
          name: 'Run Tests',
          status: 'running',
          startTime: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        },
        {
          id: 's4',
          name: 'Build Application',
          status: 'pending',
        },
        {
          id: 's5',
          name: 'Deploy to Production',
          status: 'pending',
        },
      ],
    },
    {
      id: '2',
      name: 'Backend API Deploy',
      repository: 'opssight-backend',
      branch: 'develop',
      status: 'success',
      trigger: 'pr',
      triggeredBy: 'jane.smith',
      startTime: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      duration: 600,
      progress: 100,
      environment: 'staging',
      commitHash: 'x9y8z7w',
      commitMessage: 'fix: resolve authentication timeout issues',
      steps: [
        {
          id: 's1',
          name: 'Checkout Code',
          status: 'success',
          duration: 25,
        },
        {
          id: 's2',
          name: 'Setup Python Environment',
          status: 'success',
          duration: 45,
        },
        {
          id: 's3',
          name: 'Run Unit Tests',
          status: 'success',
          duration: 180,
        },
        {
          id: 's4',
          name: 'Run Integration Tests',
          status: 'success',
          duration: 240,
        },
        {
          id: 's5',
          name: 'Build Docker Image',
          status: 'success',
          duration: 90,
        },
        {
          id: 's6',
          name: 'Deploy to Staging',
          status: 'success',
          duration: 120,
        },
      ],
    },
    {
      id: '3',
      name: 'Mobile App Build',
      repository: 'opssight-mobile',
      branch: 'feature/dashboard-improvements',
      status: 'failed',
      trigger: 'manual',
      triggeredBy: 'bob.wilson',
      startTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      duration: 600,
      progress: 60,
      environment: 'development',
      commitHash: 'p1q2r3s',
      commitMessage: 'feat: implement new pipeline status component',
      steps: [
        {
          id: 's1',
          name: 'Checkout Code',
          status: 'success',
          duration: 20,
        },
        {
          id: 's2',
          name: 'Setup Node.js',
          status: 'success',
          duration: 30,
        },
        {
          id: 's3',
          name: 'Install Dependencies',
          status: 'success',
          duration: 120,
        },
        {
          id: 's4',
          name: 'Type Check',
          status: 'failed',
          duration: 45,
          logs: 'Type error: Property "statusType" does not exist on type Pipeline',
        },
        {
          id: 's5',
          name: 'Build Android',
          status: 'skipped',
        },
        {
          id: 's6',
          name: 'Build iOS',
          status: 'skipped',
        },
      ],
    },
  ];

  useEffect(() => {
    fetchPipelines();
    
    const interval = setInterval(() => {
      fetchPipelines();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [teamId, refreshInterval]);

  const fetchPipelines = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Add some randomness to simulate real-time updates
      const updatedPipelines = mockPipelines.map(pipeline => {
        if (pipeline.status === 'running') {
          const newProgress = Math.min(100, pipeline.progress + Math.random() * 10);
          return {
            ...pipeline,
            progress: newProgress,
            steps: pipeline.steps.map(step => {
              if (step.status === 'running') {
                return step;
              }
              return step;
            }),
          };
        }
        return pipeline;
      });
      
      setPipelines(updatedPipelines);
    } catch (error) {
      console.error('Error fetching pipelines:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPipelines();
  };

  const getStatusColor = (status: Pipeline['status'] | PipelineStep['status']) => {
    switch (status) {
      case 'success':
        return '#4CAF50';
      case 'running':
        return '#2196F3';
      case 'failed':
        return '#F44336';
      case 'cancelled':
        return '#FF9800';
      case 'pending':
        return '#9E9E9E';
      case 'skipped':
        return '#757575';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: Pipeline['status'] | PipelineStep['status']) => {
    switch (status) {
      case 'success':
        return 'checkmark-circle';
      case 'running':
        return 'play-circle';
      case 'failed':
        return 'close-circle';
      case 'cancelled':
        return 'stop-circle';
      case 'pending':
        return 'time';
      case 'skipped':
        return 'remove-circle';
      default:
        return 'help-circle';
    }
  };

  const getTriggerIcon = (trigger: Pipeline['trigger']) => {
    switch (trigger) {
      case 'push':
        return 'git-commit';
      case 'pr':
        return 'git-pull-request';
      case 'manual':
        return 'person';
      case 'schedule':
        return 'timer';
      default:
        return 'flash';
    }
  };

  const getEnvironmentColor = (environment: Pipeline['environment']) => {
    switch (environment) {
      case 'production':
        return '#F44336';
      case 'staging':
        return '#FF9800';
      case 'development':
        return '#4CAF50';
      default:
        return '#9E9E9E';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
  };

  const renderPipelineStep = (pipeline: Pipeline, step: PipelineStep, index: number) => (
    <TouchableOpacity
      key={step.id}
      style={styles.stepItem}
      onPress={() => onStepPress?.(pipeline, step)}
      activeOpacity={0.7}
    >
      <View style={styles.stepIndicator}>
        <View style={[styles.stepNumber, { backgroundColor: getStatusColor(step.status) }]}>
          <Text style={styles.stepNumberText}>{index + 1}</Text>
        </View>
        {index < pipeline.steps.length - 1 && (
          <View style={[styles.stepConnector, { backgroundColor: '#E0E0E0' }]} />
        )}
      </View>
      
      <View style={styles.stepContent}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepName}>{step.name}</Text>
          <View style={styles.stepStatus}>
            <Ionicons
              name={getStatusIcon(step.status)}
              size={16}
              color={getStatusColor(step.status)}
            />
            <Text style={[styles.stepStatusText, { color: getStatusColor(step.status) }]}>
              {step.status}
            </Text>
          </View>
        </View>
        
        {step.duration && (
          <Text style={styles.stepDuration}>
            Duration: {formatDuration(step.duration)}
          </Text>
        )}
        
        {step.status === 'failed' && step.logs && (
          <Text style={styles.stepError} numberOfLines={2}>
            {step.logs}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderPipeline = (pipeline: Pipeline) => (
    <TouchableOpacity
      key={pipeline.id}
      onPress={() => onPipelinePress?.(pipeline)}
      activeOpacity={0.8}
    >
      <Card style={styles.pipelineCard}>
        <Card.Content>
          {/* Pipeline Header */}
          <View style={styles.pipelineHeader}>
            <View style={styles.pipelineInfo}>
              <Title style={styles.pipelineName}>{pipeline.name}</Title>
              <Text style={styles.repositoryName}>
                {pipeline.repository}/{pipeline.branch}
              </Text>
            </View>
            
            <View style={styles.pipelineStatus}>
              <Chip
                style={[styles.environmentChip, { backgroundColor: getEnvironmentColor(pipeline.environment) }]}
                textStyle={styles.environmentText}
                compact
              >
                {pipeline.environment.toUpperCase()}
              </Chip>
              <Chip
                style={[styles.statusChip, { backgroundColor: getStatusColor(pipeline.status) }]}
                textStyle={styles.statusText}
                compact
              >
                {pipeline.status.toUpperCase()}
              </Chip>
            </View>
          </View>

          {/* Pipeline Progress */}
          {pipeline.status === 'running' && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressText}>{Math.round(pipeline.progress)}%</Text>
              </View>
              <ProgressBar
                progress={pipeline.progress / 100}
                color={getStatusColor(pipeline.status)}
                style={styles.progressBar}
              />
            </View>
          )}

          {/* Pipeline Metadata */}
          <View style={styles.metadataContainer}>
            <View style={styles.metadataRow}>
              <View style={styles.metadataItem}>
                <Ionicons name={getTriggerIcon(pipeline.trigger)} size={16} color="#757575" />
                <Text style={styles.metadataText}>
                  {pipeline.trigger} by {pipeline.triggeredBy}
                </Text>
              </View>
              <Text style={styles.commitHash}>#{pipeline.commitHash}</Text>
            </View>
            
            <Text style={styles.commitMessage} numberOfLines={1}>
              {pipeline.commitMessage}
            </Text>
            
            <View style={styles.timingRow}>
              <Text style={styles.timingText}>
                Started: {formatRelativeTime(pipeline.startTime)}
              </Text>
              {pipeline.duration && (
                <Text style={styles.timingText}>
                  Duration: {formatDuration(pipeline.duration)}
                </Text>
              )}
            </View>
          </View>

          {/* Pipeline Steps */}
          <View style={styles.stepsContainer}>
            <Text style={styles.stepsLabel}>Pipeline Steps</Text>
            {pipeline.steps.map((step, index) => renderPipelineStep(pipeline, step, index))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              onPress={() => console.log('View logs', pipeline.id)}
              icon="file-document-outline"
              compact
              style={styles.actionButton}
            >
              Logs
            </Button>
            
            {pipeline.status === 'running' && (
              <Button
                mode="outlined"
                onPress={() => console.log('Cancel pipeline', pipeline.id)}
                icon="stop"
                compact
                style={styles.actionButton}
                buttonColor="#FF9800"
              >
                Cancel
              </Button>
            )}
            
            {(pipeline.status === 'failed' || pipeline.status === 'cancelled') && (
              <Button
                mode="contained"
                onPress={() => console.log('Retry pipeline', pipeline.id)}
                icon="refresh"
                compact
                style={styles.actionButton}
              >
                Retry
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderSummary = () => {
    const runningCount = pipelines.filter(p => p.status === 'running').length;
    const successCount = pipelines.filter(p => p.status === 'success').length;
    const failedCount = pipelines.filter(p => p.status === 'failed').length;
    const totalCount = pipelines.length;

    return (
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Title style={styles.summaryTitle}>Pipeline Summary</Title>
          <View style={styles.summaryStats}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{runningCount}</Text>
              <Text style={styles.summaryLabel}>Running</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{successCount}</Text>
              <Text style={styles.summaryLabel}>Success</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{failedCount}</Text>
              <Text style={styles.summaryLabel}>Failed</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalCount}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderSummary()}
      {pipelines.map(renderPipeline)}
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  pipelineCard: {
    marginBottom: 16,
    elevation: 2,
  },
  pipelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pipelineInfo: {
    flex: 1,
  },
  pipelineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  repositoryName: {
    fontSize: 14,
    color: '#757575',
  },
  pipelineStatus: {
    alignItems: 'flex-end',
    gap: 4,
  },
  environmentChip: {
    height: 24,
  },
  environmentText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  statusChip: {
    height: 24,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '600',
  },
  progressText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  metadataContainer: {
    marginBottom: 16,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 6,
  },
  commitHash: {
    fontSize: 12,
    color: '#1976D2',
    fontFamily: 'monospace',
  },
  commitMessage: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timingText: {
    fontSize: 11,
    color: '#9E9E9E',
  },
  stepsContainer: {
    marginBottom: 16,
  },
  stepsLabel: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '600',
    marginBottom: 12,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  stepIndicator: {
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepConnector: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 8,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepName: {
    fontSize: 14,
    color: '#424242',
    fontWeight: '500',
    flex: 1,
  },
  stepStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepStatusText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  stepDuration: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  stepError: {
    fontSize: 12,
    color: '#F44336',
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    marginHorizontal: 4,
  },
});