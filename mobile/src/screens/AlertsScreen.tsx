import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Appbar } from 'react-native-paper';
import { RealTimeAlertsList } from '../components/alerts/RealTimeAlertsList';

export const AlertsScreen: React.FC = () => {
  const handleAlertPress = (alert: any) => {
    // Navigate to alert detail screen or show modal
    console.log('Alert pressed:', alert);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.Content title="Alerts" subtitle="Real-time system notifications" />
        <Appbar.Action 
          icon="bell" 
          onPress={() => {
            // Navigate to notification settings
          }} 
        />
      </Appbar.Header>

      <RealTimeAlertsList onAlertPress={handleAlertPress} />
    </View>
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
});