import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import {
  Text,
  Card,
  Chip,
  IconButton,
  Menu,
  Divider,
  Button,
  Searchbar,
  Appbar,
  Portal,
  Modal,
  Title,
  Paragraph,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { formatRelativeTime } from '../../utils';
import { useAppSelector, useAppDispatch } from '../../hooks';
import { pushNotificationService } from '../../services/PushNotificationService';

interface NotificationHistoryItem {
  id: string;
  title: string;
  body: string;
  type: string;
  category: string;
  timestamp: string;
  read: boolean;
  data?: Record<string, any>;
  actions?: Array<{
    identifier: string;
    title: string;
    completed?: boolean;
  }>;
  platform: 'ios' | 'android';
  deliveryStatus: 'sent' | 'delivered' | 'failed' | 'clicked';
}

interface NotificationHistoryManagerProps {
  onNotificationPress?: (notification: NotificationHistoryItem) => void;
  onActionPress?: (notification: NotificationHistoryItem, actionId: string) => void;
}

export const NotificationHistoryManager: React.FC<NotificationHistoryManagerProps> = ({
  onNotificationPress,
  onActionPress,
}) => {
  const dispatch = useAppDispatch();
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationHistoryItem | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  // Mock data - replace with actual API calls
  const mockNotifications: NotificationHistoryItem[] = [
    {
      id: '1',
      title: '🚨 CRITICAL Alert',
      body: 'High CPU usage detected on production server',
      type: 'critical_alert',
      category: 'ALERT_CRITICAL',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      read: false,
      data: {
        alert_id: 'alert_001',
        severity: 'critical',
        source: 'prod-server-01',
        action_url: '/alerts/alert_001'
      },
      actions: [
        { identifier: 'ACKNOWLEDGE', title: 'Acknowledge', completed: false },
        { identifier: 'VIEW_DETAILS', title: 'View Details', completed: false }
      ],
      platform: 'ios',
      deliveryStatus: 'delivered'
    },
    {
      id: '2',
      title: '🚀 Deployment Completed',
      body: 'Frontend v2.1.0 deployed successfully to production',
      type: 'deployment',
      category: 'DEPLOYMENT',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      read: true,
      data: {
        deployment_id: 'deploy_123',
        status: 'success',
        environment: 'production',
        action_url: '/deployments/deploy_123'
      },
      actions: [
        { identifier: 'VIEW_LOGS', title: 'View Logs', completed: true }
      ],
      platform: 'android',
      deliveryStatus: 'clicked'
    },
    {
      id: '3',
      title: '👥 Team Update',
      body: 'New collaboration request from Data Engineering team',
      type: 'team_update',
      category: 'TEAM_UPDATE',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      read: true,
      data: {
        team_id: 'team_456',
        update_type: 'collaboration_request',
        action_url: '/teams/collaborations'
      },
      actions: [
        { identifier: 'VIEW_UPDATE', title: 'View', completed: true },
        { identifier: 'DISMISS', title: 'Dismiss', completed: false }
      ],
      platform: 'ios',
      deliveryStatus: 'delivered'
    },
    {
      id: '4',
      title: '⚠️ System Alert',
      body: 'Memory usage approaching threshold on API gateway',
      type: 'system_alert',
      category: 'ALERT_NORMAL',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      read: false,
      data: {
        alert_id: 'alert_002',
        severity: 'warning',
        source: 'api-gateway',
        action_url: '/alerts/alert_002'
      },
      platform: 'android',
      deliveryStatus: 'sent'
    },
    {
      id: '5',
      title: '🧪 Test Notification',
      body: 'This is a test notification from OpsSight',
      type: 'test',
      category: 'TEAM_UPDATE',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      read: true,
      data: {
        type: 'test',
        test_id: 'manual_test'
      },
      platform: 'ios',
      deliveryStatus: 'clicked'
    }
  ];

  useEffect(() => {
    fetchNotificationHistory();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, searchQuery, selectedType, selectedStatus]);

  const fetchNotificationHistory = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get delivered notifications from the system
      const deliveredNotifications = await pushNotificationService.getDeliveredNotifications();
      
      // Combine with mock data for demo
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error fetching notification history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(notification => notification.type === selectedType);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'read') {
        filtered = filtered.filter(notification => notification.read);
      } else if (selectedStatus === 'unread') {
        filtered = filtered.filter(notification => !notification.read);
      } else {
        filtered = filtered.filter(notification => notification.deliveryStatus === selectedStatus);
      }
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setFilteredNotifications(filtered);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotificationHistory();
  }, []);

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const handleClearAll = async () => {
    try {
      await pushNotificationService.clearAllNotifications();
      setNotifications([]);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const handleDeleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'critical_alert':
        return '#F44336';
      case 'system_alert':
        return '#FF9800';
      case 'deployment':
        return '#4CAF50';
      case 'team_update':
        return '#2196F3';
      case 'test':
        return '#9C27B0';
      default:
        return '#757575';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'critical_alert':
        return 'alert-circle';
      case 'system_alert':
        return 'warning';
      case 'deployment':
        return 'rocket';
      case 'team_update':
        return 'people';
      case 'test':
        return 'flask';
      default:
        return 'notifications';
    }
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return '#9E9E9E';
      case 'delivered':
        return '#4CAF50';
      case 'failed':
        return '#F44336';
      case 'clicked':
        return '#2196F3';
      default:
        return '#757575';
    }
  };

  const getDeliveryStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return 'send';
      case 'delivered':
        return 'checkmark-circle';
      case 'failed':
        return 'close-circle';
      case 'clicked':
        return 'open';
      default:
        return 'help-circle';
    }
  };

  const renderNotificationItem = ({ item }: { item: NotificationHistoryItem }) => (
    <TouchableOpacity
      onPress={() => {
        handleMarkAsRead(item.id);
        onNotificationPress?.(item);
      }}
      activeOpacity={0.7}
    >
      <Card style={[styles.notificationCard, !item.read && styles.unreadCard]}>
        <Card.Content>
          <View style={styles.notificationHeader}>
            <View style={styles.notificationInfo}>
              <View style={styles.titleRow}>
                <Ionicons
                  name={getTypeIcon(item.type)}
                  size={20}
                  color={getTypeColor(item.type)}
                  style={styles.typeIcon}
                />
                <Text style={[styles.notificationTitle, !item.read && styles.unreadTitle]}>
                  {item.title}
                </Text>
                {!item.read && <View style={styles.unreadDot} />}
              </View>
              
              <View style={styles.metadataRow}>
                <Chip
                  style={[styles.typeChip, { backgroundColor: getTypeColor(item.type) }]}
                  textStyle={styles.typeChipText}
                  compact
                >
                  {item.type.replace('_', ' ').toUpperCase()}
                </Chip>
                
                <Chip
                  style={[styles.statusChip, { backgroundColor: getDeliveryStatusColor(item.deliveryStatus) }]}
                  textStyle={styles.statusChipText}
                  compact
                  icon={() => (
                    <Ionicons
                      name={getDeliveryStatusIcon(item.deliveryStatus)}
                      size={12}
                      color="#FFFFFF"
                    />
                  )}
                >
                  {item.deliveryStatus.toUpperCase()}
                </Chip>
                
                <Chip
                  style={styles.platformChip}
                  textStyle={styles.platformChipText}
                  compact
                >
                  {item.platform.toUpperCase()}
                </Chip>
              </View>
            </View>
            
            <View style={styles.notificationActions}>
              <IconButton
                icon="information"
                size={20}
                onPress={() => {
                  setSelectedNotification(item);
                  setDetailsModalVisible(true);
                }}
              />
              <IconButton
                icon="delete"
                size={20}
                onPress={() => handleDeleteNotification(item.id)}
              />
            </View>
          </View>

          <Text style={styles.notificationBody} numberOfLines={2}>
            {item.body}
          </Text>

          {/* Action Buttons */}
          {item.actions && item.actions.length > 0 && (
            <View style={styles.actionsContainer}>
              {item.actions.map((action) => (
                <Button
                  key={action.identifier}
                  mode={action.completed ? "outlined" : "contained"}
                  onPress={() => onActionPress?.(item, action.identifier)}
                  style={styles.actionButton}
                  compact
                >
                  {action.completed ? `✓ ${action.title}` : action.title}
                </Button>
              ))}
            </View>
          )}

          <View style={styles.notificationFooter}>
            <Text style={styles.timestamp}>
              {formatRelativeTime(item.timestamp)}
            </Text>
            {item.data?.action_url && (
              <Button
                mode="text"
                onPress={() => {
                  // Navigate to action URL
                  console.log('Navigate to:', item.data?.action_url);
                }}
                compact
              >
                View Details
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <Searchbar
        placeholder="Search notifications..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchBar}
      />
      
      <View style={styles.filterButtons}>
        <Button
          mode={selectedType === 'all' ? 'contained' : 'outlined'}
          onPress={() => setSelectedType('all')}
          style={styles.filterButton}
          compact
        >
          All Types
        </Button>
        <Button
          mode={selectedType === 'critical_alert' ? 'contained' : 'outlined'}
          onPress={() => setSelectedType('critical_alert')}
          style={styles.filterButton}
          compact
        >
          Critical
        </Button>
        <Button
          mode={selectedType === 'deployment' ? 'contained' : 'outlined'}
          onPress={() => setSelectedType('deployment')}
          style={styles.filterButton}
          compact
        >
          Deployments
        </Button>
        <Button
          mode={selectedType === 'team_update' ? 'contained' : 'outlined'}
          onPress={() => setSelectedType('team_update')}
          style={styles.filterButton}
          compact
        >
          Team
        </Button>
      </View>
      
      <View style={styles.filterButtons}>
        <Button
          mode={selectedStatus === 'all' ? 'contained' : 'outlined'}
          onPress={() => setSelectedStatus('all')}
          style={styles.filterButton}
          compact
        >
          All Status
        </Button>
        <Button
          mode={selectedStatus === 'unread' ? 'contained' : 'outlined'}
          onPress={() => setSelectedStatus('unread')}
          style={styles.filterButton}
          compact
        >
          Unread
        </Button>
        <Button
          mode={selectedStatus === 'delivered' ? 'contained' : 'outlined'}
          onPress={() => setSelectedStatus('delivered')}
          style={styles.filterButton}
          compact
        >
          Delivered
        </Button>
        <Button
          mode={selectedStatus === 'clicked' ? 'contained' : 'outlined'}
          onPress={() => setSelectedStatus('clicked')}
          style={styles.filterButton}
          compact
        >
          Clicked
        </Button>
      </View>
    </View>
  );

  const renderSummary = () => {
    const totalCount = notifications.length;
    const unreadCount = notifications.filter(n => !n.read).length;
    const deliveredCount = notifications.filter(n => n.deliveryStatus === 'delivered').length;
    const failedCount = notifications.filter(n => n.deliveryStatus === 'failed').length;

    return (
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Title style={styles.summaryTitle}>Notification Summary</Title>
          
          <View style={styles.summaryStats}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalCount}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#FF9800' }]}>{unreadCount}</Text>
              <Text style={styles.summaryLabel}>Unread</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>{deliveredCount}</Text>
              <Text style={styles.summaryLabel}>Delivered</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#F44336' }]}>{failedCount}</Text>
              <Text style={styles.summaryLabel}>Failed</Text>
            </View>
          </View>

          <View style={styles.summaryActions}>
            <Button
              mode="outlined"
              onPress={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              style={styles.summaryAction}
            >
              Mark All Read
            </Button>
            <Button
              mode="outlined"
              onPress={handleClearAll}
              disabled={totalCount === 0}
              style={styles.summaryAction}
            >
              Clear All
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderDetailsModal = () => (
    <Portal>
      <Modal
        visible={detailsModalVisible}
        onDismiss={() => setDetailsModalVisible(false)}
        contentContainerStyle={styles.modalContainer}
      >
        {selectedNotification && (
          <Card>
            <Card.Content>
              <Title style={styles.modalTitle}>{selectedNotification.title}</Title>
              <Paragraph style={styles.modalBody}>{selectedNotification.body}</Paragraph>
              
              <View style={styles.modalMetadata}>
                <Text style={styles.modalLabel}>Type:</Text>
                <Text style={styles.modalValue}>{selectedNotification.type}</Text>
              </View>
              
              <View style={styles.modalMetadata}>
                <Text style={styles.modalLabel}>Category:</Text>
                <Text style={styles.modalValue}>{selectedNotification.category}</Text>
              </View>
              
              <View style={styles.modalMetadata}>
                <Text style={styles.modalLabel}>Platform:</Text>
                <Text style={styles.modalValue}>{selectedNotification.platform}</Text>
              </View>
              
              <View style={styles.modalMetadata}>
                <Text style={styles.modalLabel}>Status:</Text>
                <Text style={styles.modalValue}>{selectedNotification.deliveryStatus}</Text>
              </View>
              
              <View style={styles.modalMetadata}>
                <Text style={styles.modalLabel}>Timestamp:</Text>
                <Text style={styles.modalValue}>
                  {new Date(selectedNotification.timestamp).toLocaleString()}
                </Text>
              </View>

              {selectedNotification.data && (
                <View style={styles.modalData}>
                  <Text style={styles.modalLabel}>Data:</Text>
                  <Text style={styles.modalDataValue}>
                    {JSON.stringify(selectedNotification.data, null, 2)}
                  </Text>
                </View>
              )}
            </Card.Content>
            
            <Card.Actions>
              <Button onPress={() => setDetailsModalVisible(false)}>Close</Button>
            </Card.Actions>
          </Card>
        )}
      </Modal>
    </Portal>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off" size={64} color="#E0E0E0" />
      <Text style={styles.emptyText}>No notifications found</Text>
      <Text style={styles.emptySubtext}>
        {searchQuery || selectedType !== 'all' || selectedStatus !== 'all'
          ? 'Try adjusting your filters'
          : 'You have no notification history'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderSummary()}
      {renderFilters()}
      
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#1976D2']}
            tintColor="#1976D2"
          />
        }
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {renderDetailsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  summaryCard: {
    margin: 16,
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
    marginBottom: 16,
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
  summaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryAction: {
    flex: 1,
    marginHorizontal: 8,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchBar: {
    marginBottom: 12,
    elevation: 1,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  filterButton: {
    marginRight: 4,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  notificationCard: {
    marginBottom: 12,
    elevation: 2,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationInfo: {
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
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212121',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1976D2',
    marginLeft: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  typeChip: {
    height: 24,
  },
  typeChipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  statusChip: {
    height: 24,
  },
  statusChipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  platformChip: {
    height: 24,
    backgroundColor: '#E0E0E0',
  },
  platformChipText: {
    color: '#424242',
    fontSize: 10,
    fontWeight: '600',
  },
  notificationActions: {
    flexDirection: 'row',
  },
  notificationBody: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 12,
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    marginRight: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#424242',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalMetadata: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    width: 80,
  },
  modalValue: {
    fontSize: 14,
    color: '#616161',
    flex: 1,
  },
  modalData: {
    marginTop: 16,
  },
  modalDataValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#424242',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 4,
    marginTop: 8,
  },
});