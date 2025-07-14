import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Animated } from 'react-native';
import { Text, FAB, Portal, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCard } from './AlertCard';
import { AlertFilters } from './AlertFilters';
import { useAppSelector, useAppDispatch } from '../../hooks';

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'acknowledged';
  source: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface RealTimeAlertsListProps {
  onAlertPress?: (alert: Alert) => void;
}

export const RealTimeAlertsList: React.FC<RealTimeAlertsListProps> = ({
  onAlertPress,
}) => {
  const dispatch = useAppDispatch();
  const { isOnline } = useAppSelector(state => state.offline);
  
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newAlertsCount, setNewAlertsCount] = useState(0);
  const [showSnackbar, setShowSnackbar] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>(['active']);
  const [selectedSource, setSelectedSource] = useState<string[]>([]);
  
  // Animation for new alerts
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Mock data - replace with actual API calls
  const mockAlerts: Alert[] = [
    {
      id: '1',
      title: 'High CPU Usage Detected',
      description: 'Production server CPU usage has exceeded 85% for the past 10 minutes',
      severity: 'high',
      status: 'active',
      source: 'prod-server-01',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      title: 'Database Connection Pool Exhausted',
      description: 'All available database connections are in use',
      severity: 'critical',
      status: 'active',
      source: 'postgres-cluster',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      title: 'Deployment Completed Successfully',
      description: 'Application v2.1.0 has been deployed to production',
      severity: 'low',
      status: 'resolved',
      source: 'ci-cd-pipeline',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      title: 'Memory Usage Warning',
      description: 'Application memory usage is approaching the configured limit',
      severity: 'medium',
      status: 'acknowledged',
      source: 'app-server-02',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
  ];

  const availableSources = Array.from(new Set(alerts.map(alert => alert.source)));

  useEffect(() => {
    fetchAlerts();
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      if (isOnline) {
        checkForNewAlerts();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isOnline]);

  useEffect(() => {
    filterAlerts();
  }, [alerts, searchQuery, selectedSeverity, selectedStatus, selectedSource]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAlerts(mockAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkForNewAlerts = async () => {
    try {
      // Simulate checking for new alerts
      const random = Math.random();
      if (random > 0.7) { // 30% chance of new alert
        const newAlert: Alert = {
          id: Date.now().toString(),
          title: 'New Alert Detected',
          description: 'A new system alert has been generated',
          severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
          status: 'active',
          source: 'monitoring-system',
          timestamp: new Date().toISOString(),
        };
        
        setAlerts(prev => [newAlert, ...prev]);
        setNewAlertsCount(prev => prev + 1);
        setShowSnackbar(true);
        
        // Animate new alert
        Animated.sequence([
          Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
      }
    } catch (error) {
      console.error('Error checking for new alerts:', error);
    }
  };

  const filterAlerts = () => {
    let filtered = alerts;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(alert =>
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.source.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Severity filter
    if (selectedSeverity.length > 0) {
      filtered = filtered.filter(alert => selectedSeverity.includes(alert.severity));
    }

    // Status filter
    if (selectedStatus.length > 0) {
      filtered = filtered.filter(alert => selectedStatus.includes(alert.status));
    }

    // Source filter
    if (selectedSource.length > 0) {
      filtered = filtered.filter(alert => selectedSource.includes(alert.source));
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setFilteredAlerts(filtered);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
    setNewAlertsCount(0);
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    try {
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId ? { ...alert, status: 'acknowledged' as const } : alert
        )
      );
      // API call would go here
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId ? { ...alert, status: 'resolved' as const } : alert
        )
      );
      // API call would go here
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const renderAlert = ({ item }: { item: Alert }) => (
    <AlertCard
      alert={item}
      onPress={() => onAlertPress?.(item)}
      onAcknowledge={handleAcknowledge}
      onResolve={handleResolve}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No alerts found</Text>
      <Text style={styles.emptySubtext}>
        {searchQuery || selectedSeverity.length > 0 || selectedStatus.length > 0 || selectedSource.length > 0
          ? 'Try adjusting your filters'
          : 'All systems are running smoothly'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AlertFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedSeverity={selectedSeverity}
        onSeverityChange={setSelectedSeverity}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedSource={selectedSource}
        onSourceChange={setSelectedSource}
        availableSources={availableSources}
      />

      <FlatList
        data={filteredAlerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#1976D2']}
            tintColor="#1976D2"
          />
        }
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button for refresh */}
      <Portal>
        <FAB
          icon="refresh"
          style={[styles.fab, newAlertsCount > 0 && styles.fabWithNotification]}
          onPress={handleRefresh}
          loading={refreshing}
        />
        {newAlertsCount > 0 && (
          <Animated.View style={[styles.notificationBadge, { opacity: fadeAnim }]}>
            <Text style={styles.notificationText}>{newAlertsCount}</Text>
          </Animated.View>
        )}
      </Portal>

      <Snackbar
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        duration={3000}
        action={{
          label: 'View',
          onPress: () => {
            setNewAlertsCount(0);
            setShowSnackbar(false);
          },
        }}
      >
        {newAlertsCount === 1 ? 'New alert received' : `${newAlertsCount} new alerts received`}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80, // Space for FAB
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#1976D2',
  },
  fabWithNotification: {
    backgroundColor: '#F44336',
  },
  notificationBadge: {
    position: 'absolute',
    right: 8,
    bottom: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  notificationText: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: 'bold',
  },
});