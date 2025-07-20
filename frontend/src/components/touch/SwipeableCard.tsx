"use client";

/**
 * Swipeable Card Component
 * 
 * A card component that supports touch gestures:
 * - Swipe left/right for actions
 * - Pull down to refresh
 * - Touch-friendly interactions
 * - Smooth animations
 */

import React, { useRef, useState, useEffect } from 'react';
import { useTouchGestures } from './TouchGestureProvider';

export interface SwipeAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: 'red' | 'green' | 'blue' | 'yellow' | 'gray';
  action: () => void;
}

interface SwipeableCardProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onRefresh?: () => void;
  className?: string;
  disabled?: boolean;
  threshold?: number;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  leftActions = [],
  rightActions = [],
  onRefresh,
  className = '',
  disabled = false,
  threshold = 80,
}) => {
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [revealedActions, setRevealedActions] = useState<'left' | 'right' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number>(0);
  const currentX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  
  const { onSwipe, triggerHaptic } = useTouchGestures();

  useEffect(() => {
    if (disabled) return;

    const unsubscribe = onSwipe((swipe) => {
      if (!cardRef.current) return;

      const { direction, distance, velocity } = swipe;
      
      if (direction === 'left' && rightActions.length > 0) {
        handleSwipeLeft(distance, velocity);
      } else if (direction === 'right' && leftActions.length > 0) {
        handleSwipeRight(distance, velocity);
      } else if (direction === 'down' && onRefresh) {
        handlePullToRefresh();
      }
    });

    return unsubscribe;
  }, [disabled, leftActions, rightActions, onRefresh, onSwipe]);

  const handleSwipeLeft = (distance: number, velocity: number) => {
    if (distance > threshold) {
      setRevealedActions('right');
      setTranslateX(-threshold);
      triggerHaptic('light');
    } else {
      resetPosition();
    }
  };

  const handleSwipeRight = (distance: number, velocity: number) => {
    if (distance > threshold) {
      setRevealedActions('left');
      setTranslateX(threshold);
      triggerHaptic('light');
    } else {
      resetPosition();
    }
  };

  const handlePullToRefresh = () => {
    if (onRefresh) {
      triggerHaptic('medium');
      onRefresh();
    }
  };

  const resetPosition = () => {
    setIsAnimating(true);
    setTranslateX(0);
    setRevealedActions(null);
    
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };

  const executeAction = (action: SwipeAction) => {
    action.action();
    triggerHaptic('medium');
    resetPosition();
  };

  const getActionColor = (color: SwipeAction['color']) => {
    const colors = {
      red: 'bg-red-500 hover:bg-red-600 text-white',
      green: 'bg-green-500 hover:bg-green-600 text-white',
      blue: 'bg-blue-500 hover:bg-blue-600 text-white',
      yellow: 'bg-yellow-500 hover:bg-yellow-600 text-white',
      gray: 'bg-gray-500 hover:bg-gray-600 text-white',
    };
    return colors[color];
  };

  // Touch event handlers for direct manipulation
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    
    const touch = e.touches[0];
    startX.current = touch.clientX;
    currentX.current = touch.clientX;
    isDragging.current = true;
    setIsAnimating(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !isDragging.current) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX.current;
    
    // Limit swipe distance
    const maxSwipe = threshold * 1.5;
    const limitedDeltaX = Math.max(-maxSwipe, Math.min(maxSwipe, deltaX));
    
    // Only allow swipe if there are actions in that direction
    if (limitedDeltaX > 0 && leftActions.length === 0) return;
    if (limitedDeltaX < 0 && rightActions.length === 0) return;
    
    setTranslateX(limitedDeltaX);
    currentX.current = touch.clientX;
  };

  const handleTouchEnd = () => {
    if (disabled || !isDragging.current) return;
    
    isDragging.current = false;
    const deltaX = currentX.current - startX.current;
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && leftActions.length > 0) {
        setRevealedActions('left');
        setTranslateX(threshold);
        triggerHaptic('light');
      } else if (deltaX < 0 && rightActions.length > 0) {
        setRevealedActions('right');
        setTranslateX(-threshold);
        triggerHaptic('light');
      } else {
        resetPosition();
      }
    } else {
      resetPosition();
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {/* Left Actions */}
      {leftActions.length > 0 && (
        <div className="absolute left-0 top-0 bottom-0 flex items-center">
          {leftActions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => executeAction(action)}
              className={`h-full px-4 flex items-center justify-center min-w-[80px] 
                         ${getActionColor(action.color)} transition-all duration-200
                         ${revealedActions === 'left' ? 'opacity-100' : 'opacity-0'}
                         transform ${revealedActions === 'left' ? 'scale-100' : 'scale-95'}`}
              style={{
                transitionDelay: `${index * 50}ms`,
              }}
              aria-label={action.label}
            >
              <div className="flex flex-col items-center space-y-1">
                <div className="text-lg">{action.icon}</div>
                <span className="text-xs font-medium">{action.label}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Right Actions */}
      {rightActions.length > 0 && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center">
          {rightActions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => executeAction(action)}
              className={`h-full px-4 flex items-center justify-center min-w-[80px] 
                         ${getActionColor(action.color)} transition-all duration-200
                         ${revealedActions === 'right' ? 'opacity-100' : 'opacity-0'}
                         transform ${revealedActions === 'right' ? 'scale-100' : 'scale-95'}`}
              style={{
                transitionDelay: `${index * 50}ms`,
              }}
              aria-label={action.label}
            >
              <div className="flex flex-col items-center space-y-1">
                <div className="text-lg">{action.icon}</div>
                <span className="text-xs font-medium">{action.label}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Main Card Content */}
      <div
        ref={cardRef}
        className={`relative bg-white dark:bg-gray-800 transition-transform duration-300 ease-out
                   ${isAnimating ? '' : 'transition-none'}
                   ${disabled ? 'pointer-events-none' : 'touch-manipulation'}`}
        style={{
          transform: `translateX(${translateX}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {children}
        
        {/* Swipe Indicators */}
        {!disabled && (
          <>
            {leftActions.length > 0 && (
              <div 
                className={`absolute left-2 top-1/2 transform -translate-y-1/2 transition-opacity duration-200
                           ${translateX > 10 ? 'opacity-60' : 'opacity-20'}`}
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
            
            {rightActions.length > 0 && (
              <div 
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 transition-opacity duration-200
                           ${translateX < -10 ? 'opacity-60' : 'opacity-20'}`}
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
            )}
          </>
        )}
      </div>

      {/* Overlay for action feedback */}
      {revealedActions && (
        <div
          className="absolute inset-0 pointer-events-none"
          onClick={resetPosition}
        />
      )}
    </div>
  );
};

export default SwipeableCard;