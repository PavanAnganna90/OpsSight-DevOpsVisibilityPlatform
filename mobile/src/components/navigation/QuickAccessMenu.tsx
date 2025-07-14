import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Portal, FAB, Card, Text, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
  badge?: number;
}

interface QuickAccessMenuProps {
  actions: QuickAction[];
  visible?: boolean;
}

export const QuickAccessMenu: React.FC<QuickAccessMenuProps> = ({
  actions,
  visible = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0);

  const toggleMenu = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    
    rotation.value = withSpring(newState ? 45 : 0);
    scale.value = withTiming(newState ? 1 : 0, { duration: 200 });
  };

  const animatedFabStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const animatedMenuStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  const renderQuickAction = (action: QuickAction, index: number) => (
    <Animated.View
      key={action.id}
      style={[
        styles.actionContainer,
        {
          transform: [
            {
              translateY: useSharedValue(0).value,
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => {
          action.onPress();
          toggleMenu();
        }}
        style={styles.actionButton}
        activeOpacity={0.8}
      >
        <Card style={[styles.actionCard, { backgroundColor: action.color }]}>
          <Card.Content style={styles.actionContent}>
            <View style={styles.actionIcon}>
              <Ionicons name={action.icon as any} size={24} color="#FFFFFF" />
              {action.badge && action.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {action.badge > 99 ? '99+' : action.badge}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );

  if (!visible) return null;

  return (
    <Portal>
      {/* Overlay */}
      {isOpen && (
        <TouchableOpacity
          style={styles.overlay}
          onPress={toggleMenu}
          activeOpacity={1}
        />
      )}

      {/* Quick Actions Grid */}
      <Animated.View style={[styles.actionsContainer, animatedMenuStyle]}>
        <View style={styles.actionsGrid}>
          {actions.map(renderQuickAction)}
        </View>
      </Animated.View>

      {/* Main FAB */}
      <Animated.View style={[styles.fabContainer, animatedFabStyle]}>
        <FAB
          icon="menu"
          onPress={toggleMenu}
          style={[
            styles.fab,
            {
              backgroundColor: isOpen ? '#F44336' : '#1976D2',
            },
          ]}
        />
      </Animated.View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
  },
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 80, // Above tab bar
    zIndex: 1002,
  },
  fab: {
    elevation: 8,
  },
  actionsContainer: {
    position: 'absolute',
    right: 16,
    bottom: 140,
    zIndex: 1001,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: width - 32,
    justifyContent: 'flex-end',
  },
  actionContainer: {
    marginLeft: 8,
    marginBottom: 8,
  },
  actionButton: {
    elevation: 4,
  },
  actionCard: {
    minWidth: 80,
    elevation: 4,
  },
  actionContent: {
    alignItems: 'center',
    padding: 12,
  },
  actionIcon: {
    position: 'relative',
    marginBottom: 8,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});