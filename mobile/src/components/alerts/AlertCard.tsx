import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Chip, IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { formatRelativeTime } from '../../utils';

interface AlertCardProps {
  alert: {
    id: string;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'active' | 'resolved' | 'acknowledged';
    source: string;
    timestamp: string;
    metadata?: Record<string, any>;
  };
  onPress?: () => void;
  onAcknowledge?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onPress,
  onAcknowledge,
  onResolve,
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#D32F2F';
      case 'high':
        return '#F57C00';
      case 'medium':
        return '#FBC02D';
      case 'low':
        return '#388E3C';
      default:
        return '#1976D2';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#F44336';
      case 'acknowledged':
        return '#FF9800';
      case 'resolved':
        return '#4CAF50';
      default:
        return '#9E9E9E';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'alert-circle';
      case 'high':
        return 'warning';
      case 'medium':
        return 'information-circle';
      case 'low':
        return 'checkmark-circle';
      default:
        return 'help-circle';
    }
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <Card style={[styles.card, alert.status === 'active' && styles.activeCard]}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons
                name={getSeverityIcon(alert.severity)}
                size={20}
                color={getSeverityColor(alert.severity)}
                style={styles.severityIcon}
              />
              <Title style={styles.title} numberOfLines={2}>
                {alert.title}
              </Title>
            </View>
            <View style={styles.badges}>
              <Chip
                style={[styles.severityChip, { backgroundColor: getSeverityColor(alert.severity) }]}
                textStyle={styles.chipText}
                compact
              >
                {alert.severity.toUpperCase()}
              </Chip>
            </View>
          </View>

          <Paragraph style={styles.description} numberOfLines={3}>
            {alert.description}
          </Paragraph>

          <View style={styles.metadata}>
            <View style={styles.sourceRow}>
              <Ionicons name="server" size={16} color="#757575" />
              <Paragraph style={styles.source}>{alert.source}</Paragraph>
            </View>
            <Paragraph style={styles.timestamp}>
              {formatRelativeTime(alert.timestamp)}
            </Paragraph>
          </View>

          <View style={styles.footer}>
            <Chip
              style={[styles.statusChip, { backgroundColor: getStatusColor(alert.status) }]}
              textStyle={styles.chipText}
              compact
            >
              {alert.status.toUpperCase()}
            </Chip>

            {alert.status === 'active' && (
              <View style={styles.actions}>
                <IconButton
                  icon="check"
                  iconColor="#4CAF50"
                  size={20}
                  onPress={() => onAcknowledge?.(alert.id)}
                  style={styles.actionButton}
                />
                <IconButton
                  icon="close"
                  iconColor="#F44336"
                  size={20}
                  onPress={() => onResolve?.(alert.id)}
                  style={styles.actionButton}
                />
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  activeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 8,
  },
  severityIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    color: '#212121',
  },
  badges: {
    alignItems: 'flex-end',
  },
  severityChip: {
    height: 24,
  },
  statusChip: {
    height: 24,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 12,
    lineHeight: 20,
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  source: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#757575',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    margin: 0,
    marginLeft: 4,
  },
});