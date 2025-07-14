import React, { useEffect, useRef } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationContainerRef } from '@react-navigation/native';
import { deepLinkingService } from '../services/DeepLinkingService';

import { useAppSelector } from '../hooks/useAppSelector';
import { AuthNavigator } from './AuthNavigator';
import { DashboardScreen } from '../screens/DashboardScreen';
import { AlertsScreen } from '../screens/AlertsScreen';
import { TeamsScreen } from '../screens/TeamsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { LoadingScreen } from '../screens/LoadingScreen';
import { QuickAccessMenu } from '../components/navigation/QuickAccessMenu';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Profile: undefined;
  Notifications: undefined;
  TeamDetail: { teamId: string };
  AlertDetail: { alertId: string };
  Settings: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Alerts: undefined;
  Teams: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => {
  const navigation = useNavigation();
  const { unreadCount } = useAppSelector(state => state.notifications);
  const alerts = useAppSelector(state => state.dashboard);

  const quickActions = [
    {
      id: 'notifications',
      label: 'Notifications',
      icon: 'notifications',
      color: '#FF9800',
      badge: unreadCount,
      onPress: () => navigation.navigate('Notifications' as never),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings',
      color: '#9E9E9E',
      onPress: () => navigation.navigate('Settings' as never),
    },
    {
      id: 'refresh',
      label: 'Refresh All',
      icon: 'refresh',
      color: '#4CAF50',
      onPress: () => {
        // Trigger global refresh
        console.log('Refreshing all data...');
      },
    },
    {
      id: 'search',
      label: 'Search',
      icon: 'search',
      color: '#2196F3',
      onPress: () => {
        // Open search modal
        console.log('Opening search...');
      },
    },
  ];

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'Dashboard') {
              iconName = focused ? 'analytics' : 'analytics-outline';
            } else if (route.name === 'Alerts') {
              iconName = focused ? 'warning' : 'warning-outline';
            } else if (route.name === 'Teams') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
            } else {
              iconName = 'help-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#1976D2',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E0E0E0',
            height: 60,
            paddingBottom: 8,
          },
          headerShown: false,
        })}
      >
        <Tab.Screen 
          name="Dashboard" 
          component={DashboardScreen}
          options={{
            tabBarLabel: 'Dashboard',
          }}
        />
        <Tab.Screen 
          name="Alerts" 
          component={AlertsScreen}
          options={{
            tabBarLabel: 'Alerts',
            tabBarBadge: alerts.widgets?.filter(w => w.type === 'alerts').length || undefined,
          }}
        />
        <Tab.Screen 
          name="Teams" 
          component={TeamsScreen}
          options={{
            tabBarLabel: 'Teams',
          }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Profile',
          }}
        />
      </Tab.Navigator>
      
      <QuickAccessMenu actions={quickActions} visible={true} />
    </>
  );
};

export const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAppSelector(state => state.auth);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};