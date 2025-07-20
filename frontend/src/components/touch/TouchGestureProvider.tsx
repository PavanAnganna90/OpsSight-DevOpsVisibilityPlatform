"use client";

/**
 * Touch Gesture Provider Component
 * 
 * Provides comprehensive touch gesture support for mobile experience:
 * - Swipe gestures for navigation
 * - Pinch-to-zoom for charts and visualizations
 * - Pull-to-refresh functionality
 * - Touch-friendly interactive elements
 * - Gesture-based shortcuts
 */

import React, { createContext, useContext, useRef, useCallback, useEffect, useState } from 'react';

export interface TouchGestureConfig {
  enableSwipeNavigation?: boolean;
  enablePinchZoom?: boolean;
  enablePullToRefresh?: boolean;
  enableHapticFeedback?: boolean;
  swipeThreshold?: number;
  pinchThreshold?: number;
  refreshThreshold?: number;
}

export interface TouchPosition {
  x: number;
  y: number;
  timestamp: number;
}

export interface SwipeDirection {
  direction: 'left' | 'right' | 'up' | 'down';
  velocity: number;
  distance: number;
}

export interface PinchData {
  scale: number;
  center: { x: number; y: number };
  velocity: number;
}

export interface TouchGestureContextType {
  // Configuration
  config: TouchGestureConfig;
  updateConfig: (config: Partial<TouchGestureConfig>) => void;
  
  // Gesture handlers
  onSwipe: (callback: (swipe: SwipeDirection) => void) => () => void;
  onPinch: (callback: (pinch: PinchData) => void) => () => void;
  onPullToRefresh: (callback: () => void) => () => void;
  onLongPress: (callback: (position: TouchPosition) => void) => () => void;
  
  // Touch state
  isGestureActive: boolean;
  currentGesture: 'swipe' | 'pinch' | 'pull' | 'longpress' | null;
  
  // Utilities
  triggerHaptic: (type: 'light' | 'medium' | 'heavy') => void;
  getDistance: (touch1: Touch, touch2: Touch) => number;
  getAngle: (touch1: Touch, touch2: Touch) => number;
}

const TouchGestureContext = createContext<TouchGestureContextType | null>(null);

const DEFAULT_CONFIG: TouchGestureConfig = {
  enableSwipeNavigation: true,
  enablePinchZoom: true,
  enablePullToRefresh: true,
  enableHapticFeedback: true,
  swipeThreshold: 50,
  pinchThreshold: 0.1,
  refreshThreshold: 80,
};

interface TouchGestureProviderProps {
  children: React.ReactNode;
  initialConfig?: Partial<TouchGestureConfig>;
}

export const TouchGestureProvider: React.FC<TouchGestureProviderProps> = ({
  children,
  initialConfig = {},
}) => {
  const [config, setConfig] = useState<TouchGestureConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  
  const [isGestureActive, setIsGestureActive] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<TouchGestureContextType['currentGesture']>(null);
  
  // Gesture callback registries
  const swipeCallbacks = useRef<Set<(swipe: SwipeDirection) => void>>(new Set());
  const pinchCallbacks = useRef<Set<(pinch: PinchData) => void>>(new Set());
  const pullToRefreshCallbacks = useRef<Set<() => void>>(new Set());
  const longPressCallbacks = useRef<Set<(position: TouchPosition) => void>>(new Set());
  
  // Touch tracking state
  const touchStart = useRef<TouchPosition | null>(null);
  const touchCurrent = useRef<TouchPosition | null>(null);
  const lastTouchDistance = useRef<number>(0);
  const initialPinchDistance = useRef<number>(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isPinching = useRef<boolean>(false);
  const isScrolling = useRef<boolean>(false);

  // Utility functions
  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getAngle = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }, []);

  const getCenter = useCallback((touch1: Touch, touch2: Touch) => ({
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  }), []);

  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy') => {
    if (!config.enableHapticFeedback) return;
    
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
      };
      navigator.vibrate(patterns[type]);
    }
  }, [config.enableHapticFeedback]);

  const calculateSwipeDirection = useCallback((start: TouchPosition, end: TouchPosition): SwipeDirection | null => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const timeDiff = end.timestamp - start.timestamp;
    const velocity = distance / timeDiff;

    if (distance < (config.swipeThreshold || 50)) return null;

    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    let direction: SwipeDirection['direction'];

    if (Math.abs(angle) < 45) {
      direction = 'right';
    } else if (Math.abs(angle) > 135) {
      direction = 'left';
    } else if (angle > 0) {
      direction = 'down';
    } else {
      direction = 'up';
    }

    return { direction, velocity, distance };
  }, [config.swipeThreshold]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    const position: TouchPosition = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };

    touchStart.current = position;
    touchCurrent.current = position;
    isScrolling.current = false;
    setIsGestureActive(true);

    // Handle multi-touch (pinch)
    if (e.touches.length === 2 && config.enablePinchZoom) {
      isPinching.current = true;
      initialPinchDistance.current = getDistance(e.touches[0], e.touches[1]);
      lastTouchDistance.current = initialPinchDistance.current;
      setCurrentGesture('pinch');
      
      // Prevent default to avoid page zoom
      e.preventDefault();
    } else if (e.touches.length === 1) {
      // Start long press timer
      longPressTimer.current = setTimeout(() => {
        if (touchStart.current && !isScrolling.current) {
          setCurrentGesture('longpress');
          triggerHaptic('medium');
          longPressCallbacks.current.forEach(callback => callback(touchStart.current!));
        }
      }, 500);
    }
  }, [config.enablePinchZoom, getDistance, triggerHaptic]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStart.current) return;

    const touch = e.touches[0];
    const currentPosition: TouchPosition = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };

    touchCurrent.current = currentPosition;

    // Check if this is scrolling
    const dx = Math.abs(currentPosition.x - touchStart.current.x);
    const dy = Math.abs(currentPosition.y - touchStart.current.y);
    
    if (dy > dx && dy > 10) {
      isScrolling.current = true;
    }

    // Handle pinch gesture
    if (e.touches.length === 2 && isPinching.current && config.enablePinchZoom) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / initialPinchDistance.current;
      const center = getCenter(e.touches[0], e.touches[1]);
      const velocity = Math.abs(currentDistance - lastTouchDistance.current);

      const pinchData: PinchData = {
        scale,
        center,
        velocity,
      };

      pinchCallbacks.current.forEach(callback => callback(pinchData));
      lastTouchDistance.current = currentDistance;
      
      e.preventDefault();
    }

    // Handle pull-to-refresh
    if (config.enablePullToRefresh && !isPinching.current && e.touches.length === 1) {
      const pullDistance = currentPosition.y - touchStart.current.y;
      
      if (pullDistance > (config.refreshThreshold || 80) && window.scrollY === 0) {
        setCurrentGesture('pull');
        triggerHaptic('light');
      }
    }

    // Clear long press timer if moved too much
    if (longPressTimer.current && (dx > 10 || dy > 10)) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, [config.enablePinchZoom, config.enablePullToRefresh, config.refreshThreshold, getDistance, getCenter, triggerHaptic]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStart.current || !touchCurrent.current) return;

    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Handle swipe gesture
    if (!isPinching.current && !isScrolling.current && config.enableSwipeNavigation && e.changedTouches.length === 1) {
      const swipe = calculateSwipeDirection(touchStart.current, touchCurrent.current);
      
      if (swipe) {
        setCurrentGesture('swipe');
        triggerHaptic('light');
        swipeCallbacks.current.forEach(callback => callback(swipe));
      }
    }

    // Handle pull-to-refresh completion
    if (currentGesture === 'pull') {
      const pullDistance = touchCurrent.current.y - touchStart.current.y;
      
      if (pullDistance > (config.refreshThreshold || 80)) {
        triggerHaptic('medium');
        pullToRefreshCallbacks.current.forEach(callback => callback());
      }
    }

    // Reset state
    touchStart.current = null;
    touchCurrent.current = null;
    isPinching.current = false;
    isScrolling.current = false;
    setIsGestureActive(false);
    setCurrentGesture(null);
  }, [config.enableSwipeNavigation, config.enablePullToRefresh, config.refreshThreshold, currentGesture, calculateSwipeDirection, triggerHaptic]);

  // Register/unregister gesture callbacks
  const onSwipe = useCallback((callback: (swipe: SwipeDirection) => void) => {
    swipeCallbacks.current.add(callback);
    return () => swipeCallbacks.current.delete(callback);
  }, []);

  const onPinch = useCallback((callback: (pinch: PinchData) => void) => {
    pinchCallbacks.current.add(callback);
    return () => pinchCallbacks.current.delete(callback);
  }, []);

  const onPullToRefresh = useCallback((callback: () => void) => {
    pullToRefreshCallbacks.current.add(callback);
    return () => pullToRefreshCallbacks.current.delete(callback);
  }, []);

  const onLongPress = useCallback((callback: (position: TouchPosition) => void) => {
    longPressCallbacks.current.add(callback);
    return () => longPressCallbacks.current.delete(callback);
  }, []);

  const updateConfig = useCallback((newConfig: Partial<TouchGestureConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // Set up global touch event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const options = { passive: false };
    
    document.addEventListener('touchstart', handleTouchStart, options);
    document.addEventListener('touchmove', handleTouchMove, options);
    document.addEventListener('touchend', handleTouchEnd, options);
    document.addEventListener('touchcancel', handleTouchEnd, options);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const contextValue: TouchGestureContextType = {
    config,
    updateConfig,
    onSwipe,
    onPinch,
    onPullToRefresh,
    onLongPress,
    isGestureActive,
    currentGesture,
    triggerHaptic,
    getDistance,
    getAngle,
  };

  return (
    <TouchGestureContext.Provider value={contextValue}>
      {children}
    </TouchGestureContext.Provider>
  );
};

export const useTouchGestures = (): TouchGestureContextType => {
  const context = useContext(TouchGestureContext);
  if (!context) {
    throw new Error('useTouchGestures must be used within a TouchGestureProvider');
  }
  return context;
};

export default TouchGestureProvider;