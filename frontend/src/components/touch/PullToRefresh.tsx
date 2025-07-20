"use client";

/**
 * Pull to Refresh Component
 * 
 * Provides native-like pull-to-refresh functionality:
 * - Smooth pull gesture detection
 * - Visual feedback with loading states
 * - Customizable threshold and styling
 * - Haptic feedback integration
 * - Works with scrollable content
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTouchGestures } from './TouchGestureProvider';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
  threshold?: number;
  className?: string;
  refreshingText?: string;
  pullText?: string;
  releaseText?: string;
}

type RefreshState = 'idle' | 'pulling' | 'ready' | 'refreshing';

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  disabled = false,
  threshold = 80,
  className = '',
  refreshingText = 'Refreshing...',
  pullText = 'Pull to refresh',
  releaseText = 'Release to refresh',
}) => {
  const [refreshState, setRefreshState] = useState<RefreshState>('idle');
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const canPull = useRef<boolean>(false);
  
  const { triggerHaptic } = useTouchGestures();

  // Check if at top of scroll
  const checkCanPull = useCallback(() => {
    if (!containerRef.current) return false;
    return containerRef.current.scrollTop === 0;
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    canPull.current = checkCanPull();
    if (!canPull.current) return;
    
    const touch = e.touches[0];
    startY.current = touch.clientY;
    currentY.current = touch.clientY;
    isDragging.current = true;
    setRefreshState('idle');
  }, [disabled, isRefreshing, checkCanPull]);

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing || !isDragging.current || !canPull.current) return;
    
    const touch = e.touches[0];
    const deltaY = touch.clientY - startY.current;
    
    // Only handle downward pulls
    if (deltaY <= 0) {
      setPullDistance(0);
      setRefreshState('idle');
      return;
    }
    
    // Check if still at top during drag
    if (!checkCanPull()) {
      isDragging.current = false;
      setPullDistance(0);
      setRefreshState('idle');
      return;
    }
    
    // Apply elastic resistance
    const resistance = 0.5;
    const elasticDistance = deltaY * resistance;
    const maxPull = threshold * 2;
    const limitedDistance = Math.min(elasticDistance, maxPull);
    
    setPullDistance(limitedDistance);
    currentY.current = touch.clientY;
    
    // Update state based on distance
    if (limitedDistance >= threshold) {
      if (refreshState !== 'ready') {
        setRefreshState('ready');
        triggerHaptic('light');
      }
    } else {
      if (refreshState !== 'pulling') {
        setRefreshState('pulling');
      }
    }
    
    // Prevent default to avoid overscroll on iOS
    if (limitedDistance > 0) {
      e.preventDefault();
    }
  }, [disabled, isRefreshing, threshold, refreshState, checkCanPull, triggerHaptic]);

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current) return;
    
    isDragging.current = false;
    
    if (refreshState === 'ready' && pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setRefreshState('refreshing');
      triggerHaptic('medium');
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setRefreshState('idle');
        setPullDistance(0);
      }
    } else {
      // Animate back to idle
      setRefreshState('idle');
      setPullDistance(0);
    }
  }, [refreshState, pullDistance, threshold, isRefreshing, onRefresh, triggerHaptic]);

  // Handle touch cancel
  const handleTouchCancel = useCallback(() => {
    isDragging.current = false;
    setRefreshState('idle');
    setPullDistance(0);
  }, []);

  // Reset state when disabled changes
  useEffect(() => {
    if (disabled) {
      setRefreshState('idle');
      setPullDistance(0);
      isDragging.current = false;
    }
  }, [disabled]);

  // Calculate transform and opacity
  const indicatorTransform = `translateY(${Math.max(0, pullDistance - 40)}px)`;
  const indicatorOpacity = Math.min(1, pullDistance / threshold);
  const backgroundOpacity = Math.min(0.1, pullDistance / threshold * 0.1);

  // Get indicator content
  const getIndicatorContent = () => {
    switch (refreshState) {
      case 'pulling':
        return (
          <>
            <svg 
              className="w-5 h-5 text-gray-400 transition-transform duration-200" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{ transform: `rotate(${Math.min(180, (pullDistance / threshold) * 180)}deg)` }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span className="text-sm text-gray-500 dark:text-gray-400">{pullText}</span>
          </>
        );
      
      case 'ready':
        return (
          <>
            <svg 
              className="w-5 h-5 text-blue-500 transition-transform duration-200" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">{releaseText}</span>
          </>
        );
      
      case 'refreshing':
        return (
          <>
            <svg 
              className="w-5 h-5 text-blue-500 animate-spin" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">{refreshingText}</span>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Pull to refresh indicator */}
      <div 
        className="absolute top-0 left-0 right-0 z-10 flex flex-col items-center justify-end pointer-events-none"
        style={{
          height: Math.max(40, pullDistance),
          transform: indicatorTransform,
          opacity: indicatorOpacity,
        }}
      >
        {/* Background */}
        <div 
          className="absolute inset-0 bg-white dark:bg-gray-800"
          style={{ opacity: backgroundOpacity }}
        />
        
        {/* Indicator content */}
        <div className="flex flex-col items-center space-y-2 pb-4 relative z-10">
          {getIndicatorContent()}
        </div>
      </div>

      {/* Main content */}
      <div
        ref={containerRef}
        className="relative overflow-auto touch-manipulation"
        style={{
          transform: `translateY(${refreshState === 'refreshing' ? '60px' : '0px'})`,
          transition: refreshState === 'refreshing' ? 'transform 0.3s ease-out' : 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        {children}
      </div>

      {/* Loading overlay for refreshing state */}
      {refreshState === 'refreshing' && (
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white dark:from-gray-800 to-transparent z-20 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm text-blue-600 dark:text-blue-400">{refreshingText}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PullToRefresh;