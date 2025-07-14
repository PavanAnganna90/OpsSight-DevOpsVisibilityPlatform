import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Appbar,
  List,
  Switch,
  Text,
  Card,
  Button,
  Divider,
  Chip,
  Title,
  Paragraph,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../hooks';
import { updateNotificationSettings, setEnabled } from '../store/slices/notificationSlice';
import { useNotifications } from '../providers/NotificationProvider';

export const NotificationPreferencesScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const notificationState = useAppSelector(state => state.notifications);
  const {
    requestPermissions,
    permissionStatus,
    pushToken,
    scheduleTestNotification,
    clearAllNotifications,
  } = useNotifications();

  const [preferences, setPreferences] = useState({
    critical_alerts: true,
    system_alerts: true,
    deployments: true,
    team_updates: true,
    maintenance: false,
    security_alerts: true,
    performance_alerts: true,
    backup_reports: false,
    scheduled_reports: false,
    marketing: false,
  });

  const [deliverySettings, setDeliverySettings] = useState({
    push_notifications: true,
    email_notifications: true,
    in_app_notifications: true,
    sound_enabled: true,
    vibration_enabled: true,
    led_enabled: true,
    do_not_disturb_start: '22:00',
    do_not_disturb_end: '08:00',
    weekend_notifications: true,
  });

  const handlePreferenceChange = (key: string, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    // Also update Redux store
    dispatch(updateNotificationSettings({ [key]: value }));
  };

  const handleDeliverySettingChange = (key: string, value: boolean) => {
    setDeliverySettings(prev => ({ ...prev, [key]: value }));
  };

  const handleEnableNotifications = async () => {
    const granted = await requestPermissions();
    if (granted) {
      dispatch(setEnabled(true));
      Alert.alert(
        'Notifications Enabled',
        'You will now receive push notifications for important updates.'
      );
    } else {
      Alert.alert(
        'Permission Denied',
        'Please enable notifications in your device settings to receive alerts.'
      );
    }
  };

  const handleTestNotification = async () => {
    try {
      await scheduleTestNotification();
      Alert.alert('Test Sent', 'A test notification has been sent.');
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification.');
    }
  };

  const handleClearNotifications = async () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAllNotifications();
            Alert.alert('Cleared', 'All notifications have been cleared.');
          },
        },
      ]
    );
  };

  const renderPermissionStatus = () => {
    const getStatusInfo = () => {
      switch (permissionStatus) {
        case 'granted':
          return { color: '#4CAF50', text: 'Enabled', icon: 'checkmark-circle' };
        case 'denied':
          return { color: '#F44336', text: 'Disabled', icon: 'close-circle' };
        case 'undetermined':
          return { color: '#FF9800', text: 'Not Set', icon: 'help-circle' };
        default:
          return { color: '#9E9E9E', text: 'Unknown', icon: 'help-circle' };
      }
    };

    const status = getStatusInfo();

    return (
      <Card style={styles.statusCard}>
        <Card.Content>
          <View style={styles.statusHeader}>
            <View style={styles.statusInfo}>
              <Ionicons name={status.icon as any} size={24} color={status.color} />
              <View style={styles.statusText}>
                <Title style={styles.statusTitle}>Notification Status</Title>
                <Text style={[styles.statusValue, { color: status.color }]}>
                  {status.text}
                </Text>
              </View>
            </View>
            {permissionStatus !== 'granted' && (
              <Button
                mode="contained"
                onPress={handleEnableNotifications}
                style={styles.enableButton}
              >
                Enable
              </Button>
            )}
          </View>

          {pushToken && (
            <View style={styles.tokenInfo}>
              <Text style={styles.tokenLabel}>Push Token:</Text>
              <Text style={styles.tokenValue} numberOfLines={1}>
                {pushToken.substring(0, 20)}...
              </Text>
            </View>
          )}

          <View style={styles.statusActions}>
            <Button
              mode="outlined"
              onPress={handleTestNotification}
              disabled={permissionStatus !== 'granted'}
              style={styles.actionButton}
            >
              Send Test
            </Button>
            <Button
              mode="outlined"
              onPress={handleClearNotifications}
              style={styles.actionButton}
            >
              Clear All
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderNotificationTypes = () => (
    <Card style={styles.section}>
      <Card.Content>
        <Title style={styles.sectionTitle}>Notification Types</Title>
        <Paragraph style={styles.sectionDescription}>
          Choose which types of notifications you want to receive
        </Paragraph>
        
        <List.Section>
          <List.Item
            title="Critical Alerts"
            description="System failures and security incidents"
            left={() => <Ionicons name="alert-circle" size={24} color="#F44336" />}
            right={() => (
              <Switch
                value={preferences.critical_alerts}
                onValueChange={(value) => handlePreferenceChange('critical_alerts', value)}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="System Alerts"
            description="Performance warnings and system status"
            left={() => <Ionicons name="warning" size={24} color="#FF9800" />}
            right={() => (
              <Switch
                value={preferences.system_alerts}
                onValueChange={(value) => handlePreferenceChange('system_alerts', value)}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Deployments"
            description="Deployment status and results"
            left={() => <Ionicons name="rocket" size={24} color="#4CAF50" />}
            right={() => (
              <Switch
                value={preferences.deployments}
                onValueChange={(value) => handlePreferenceChange('deployments', value)}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Team Updates"
            description="Team announcements and collaboration"
            left={() => <Ionicons name="people" size={24} color="#2196F3" />}
            right={() => (
              <Switch
                value={preferences.team_updates}
                onValueChange={(value) => handlePreferenceChange('team_updates', value)}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Security Alerts"
            description="Security events and vulnerabilities"
            left={() => <Ionicons name="shield" size={24} color="#9C27B0" />}
            right={() => (
              <Switch
                value={preferences.security_alerts}
                onValueChange={(value) => handlePreferenceChange('security_alerts', value)}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Performance Alerts"
            description="Performance degradation notifications"
            left={() => <Ionicons name="speedometer" size={24} color="#FF5722" />}
            right={() => (
              <Switch
                value={preferences.performance_alerts}
                onValueChange={(value) => handlePreferenceChange('performance_alerts', value)}
              />
            )}
          />
        </List.Section>
      </Card.Content>
    </Card>
  );

  const renderDeliverySettings = () => (
    <Card style={styles.section}>
      <Card.Content>
        <Title style={styles.sectionTitle}>Delivery Settings</Title>
        <Paragraph style={styles.sectionDescription}>
          Configure how you receive notifications
        </Paragraph>
        
        <List.Section>
          <List.Item
            title="Push Notifications"
            description="Receive notifications on your device"
            left={() => <Ionicons name="phone-portrait" size={24} color="#1976D2" />}
            right={() => (
              <Switch
                value={deliverySettings.push_notifications}
                onValueChange={(value) => handleDeliverySettingChange('push_notifications', value)}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Email Notifications"
            description="Receive notifications via email"
            left={() => <Ionicons name="mail" size={24} color="#1976D2" />}
            right={() => (
              <Switch
                value={deliverySettings.email_notifications}
                onValueChange={(value) => handleDeliverySettingChange('email_notifications', value)}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Sound"
            description="Play sound for notifications"
            left={() => <Ionicons name="volume-high" size={24} color="#1976D2" />}
            right={() => (
              <Switch
                value={deliverySettings.sound_enabled}
                onValueChange={(value) => handleDeliverySettingChange('sound_enabled', value)}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Vibration"
            description="Vibrate for notifications"
            left={() => <Ionicons name="phone-portrait" size={24} color="#1976D2" />}
            right={() => (
              <Switch
                value={deliverySettings.vibration_enabled}
                onValueChange={(value) => handleDeliverySettingChange('vibration_enabled', value)}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Weekend Notifications"
            description="Receive notifications on weekends"
            left={() => <Ionicons name="calendar" size={24} color="#1976D2" />}
            right={() => (
              <Switch
                value={deliverySettings.weekend_notifications}
                onValueChange={(value) => handleDeliverySettingChange('weekend_notifications', value)}
              />
            )}
          />
        </List.Section>
      </Card.Content>
    </Card>
  );

  const renderStatistics = () => (
    <Card style={styles.section}>
      <Card.Content>
        <Title style={styles.sectionTitle}>Notification Statistics</Title>
        
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{notificationState.notifications.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{notificationState.unreadCount}</Text>
            <Text style={styles.statLabel}>Unread</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {notificationState.notifications.length - notificationState.unreadCount}
            </Text>
            <Text style={styles.statLabel}>Read</Text>
          </View>
        </View>

        <View style={styles.recentTypes}>
          <Text style={styles.recentTypesLabel}>Recent Types:</Text>
          <View style={styles.typeChips}>
            {Array.from(new Set(notificationState.notifications.slice(0, 10).map(n => n.type))).map(type => (
              <Chip key={type} style={styles.typeChip} textStyle={styles.typeChipText}>
                {type}
              </Chip>
            ))}
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => {}} />
        <Appbar.Content title="Notification Preferences" />
      </Appbar.Header>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderPermissionStatus()}
        {renderNotificationTypes()}
        {renderDeliverySettings()}
        {renderStatistics()}
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
  content: {
    flex: 1,
  },
  statusCard: {
    margin: 16,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    marginLeft: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  enableButton: {
    marginLeft: 16,
  },
  tokenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
  },
  tokenLabel: {
    fontSize: 12,
    color: '#757575',
    marginRight: 8,
  },
  tokenValue: {
    fontSize: 12,
    color: '#424242',
    fontFamily: 'monospace',
    flex: 1,
  },
  statusActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  section: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
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
  recentTypes: {
    marginTop: 8,
  },
  recentTypesLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  typeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  typeChip: {
    marginRight: 8,
    marginBottom: 4,
    backgroundColor: '#E3F2FD',
  },
  typeChipText: {
    color: '#1976D2',
    fontSize: 12,
  },
});