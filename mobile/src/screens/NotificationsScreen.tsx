import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RealTimeAlertsList } from '../components/alerts/RealTimeAlertsList';
import { NotificationHistoryManager } from '../components/notifications/NotificationHistoryManager';

export const NotificationsScreen: React.FC = () => {
  const [selectedView, setSelectedView] = useState('live');

  const handleNotificationPress = (notification: any) => {
    // Navigate to notification details or perform action
    console.log('Notification pressed:', notification);
  };

  const handleActionPress = (notification: any, actionId: string) => {
    // Handle notification action button press
    console.log('Action pressed:', actionId, 'for notification:', notification.id);
  };

  const handleAlertPress = (alert: any) => {
    // Navigate to alert details
    console.log('Alert pressed:', alert);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.Content title="Notifications" subtitle="Alerts and updates" />
        <Appbar.Action 
          icon="cog" 
          onPress={() => {
            // Navigate to notification preferences
            console.log('Navigate to notification preferences');
          }} 
        />
      </Appbar.Header>

      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={selectedView}
          onValueChange={setSelectedView}
          buttons={[
            {
              value: 'live',
              label: 'Live Alerts',
              icon: 'alert-circle',
            },
            {
              value: 'history',
              label: 'History',
              icon: 'history',
            },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <View style={styles.content}>
        {selectedView === 'live' ? (
          <RealTimeAlertsList onAlertPress={handleAlertPress} />
        ) : (
          <NotificationHistoryManager
            onNotificationPress={handleNotificationPress}
            onActionPress={handleActionPress}
          />
        )}
      </View>
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