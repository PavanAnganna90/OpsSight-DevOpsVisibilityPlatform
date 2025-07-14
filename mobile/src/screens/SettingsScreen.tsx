import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Title, List, Switch, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../hooks';
import { setTheme, updateNotificationSettings } from '../store/slices/settingsSlice';

export const SettingsScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(state => state.settings);

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    dispatch(setTheme(theme));
  };

  const handleNotificationToggle = (key: keyof typeof settings.notifications) => {
    dispatch(updateNotificationSettings({
      [key]: !settings.notifications[key],
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Settings</Text>
          
          <Card style={styles.card}>
            <Card.Content>
              <Title>Appearance</Title>
              <List.Item
                title="Light Theme"
                right={() => 
                  <Switch 
                    value={settings.theme === 'light'} 
                    onValueChange={() => handleThemeChange('light')}
                  />
                }
              />
              <Divider />
              <List.Item
                title="Dark Theme"
                right={() => 
                  <Switch 
                    value={settings.theme === 'dark'} 
                    onValueChange={() => handleThemeChange('dark')}
                  />
                }
              />
              <Divider />
              <List.Item
                title="System Theme"
                right={() => 
                  <Switch 
                    value={settings.theme === 'system'} 
                    onValueChange={() => handleThemeChange('system')}
                  />
                }
              />
            </Card.Content>
          </Card>
          
          <Card style={styles.card}>
            <Card.Content>
              <Title>Notifications</Title>
              <List.Item
                title="Push Notifications"
                description="Receive push notifications"
                right={() => 
                  <Switch 
                    value={settings.notifications.pushEnabled} 
                    onValueChange={() => handleNotificationToggle('pushEnabled')}
                  />
                }
              />
              <Divider />
              <List.Item
                title="Email Notifications"
                description="Receive email notifications"
                right={() => 
                  <Switch 
                    value={settings.notifications.emailEnabled} 
                    onValueChange={() => handleNotificationToggle('emailEnabled')}
                  />
                }
              />
              <Divider />
              <List.Item
                title="Alert Notifications"
                description="System alerts and warnings"
                right={() => 
                  <Switch 
                    value={settings.notifications.alerts} 
                    onValueChange={() => handleNotificationToggle('alerts')}
                  />
                }
              />
              <Divider />
              <List.Item
                title="Deployment Notifications"
                description="Deployment status updates"
                right={() => 
                  <Switch 
                    value={settings.notifications.deployments} 
                    onValueChange={() => handleNotificationToggle('deployments')}
                  />
                }
              />
            </Card.Content>
          </Card>
          
          <Card style={styles.card}>
            <Card.Content>
              <Title>Security</Title>
              <List.Item
                title="Auto Lock"
                description="Automatically lock the app"
                right={() => 
                  <Switch 
                    value={settings.autoLock} 
                    onValueChange={() => {}}
                  />
                }
              />
              <Divider />
              <List.Item
                title="Biometric Authentication"
                description="Use fingerprint or face ID"
                right={() => 
                  <Switch 
                    value={settings.biometricAuth} 
                    onValueChange={() => {}}
                  />
                }
              />
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#212121',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
});