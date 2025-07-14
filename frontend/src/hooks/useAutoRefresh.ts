/**
 * Auto Refresh Hook
 * 
 * Custom hook for implementing auto-refresh functionality with
 * configurable intervals, pause/resume, and visibility detection.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseAutoRefreshOptions {
  /** Refresh interval in milliseconds */
  interval?: number;
  /** Whether auto-refresh is enabled by default */
  enabled?: boolean;
  /** Pause when tab is not visible */
  pauseOnHidden?: boolean;
  /** Pause when user is idle */
  pauseOnIdle?: boolean;
  /** Idle timeout in milliseconds */
  idleTimeout?: number;
}

interface UseAutoRefreshReturn {
  /** Whether auto-refresh is currently enabled */
  isEnabled: boolean;
  /** Whether auto-refresh is currently paused */
  isPaused: boolean;
  /** Whether user is considered idle */
  isIdle: boolean;
  /** Time until next refresh (in seconds) */
  timeUntilRefresh: number;
  /** Enable auto-refresh */
  enable: () => void;
  /** Disable auto-refresh */
  disable: () => void;
  /** Toggle auto-refresh */
  toggle: () => void;
  /** Manually trigger refresh */
  refresh: () => void;
  /** Set refresh interval */
  setInterval: (interval: number) => void;
}

/**
 * Auto Refresh Hook
 * 
 * Provides auto-refresh functionality with smart pausing based on
 * tab visibility and user activity.
 * 
 * Features:
 * - Configurable refresh intervals
 * - Automatic pause when tab is hidden
 * - Idle detection and pause
 * - Manual refresh triggering
 * - Countdown timer display
 * - Memory cleanup on unmount
 * 
 * @param callback - Function to call on each refresh
 * @param options - Configuration options
 * @returns Auto-refresh control interface
 */
export const useAutoRefresh = (
  callback: () => void | Promise<void>,
  options: UseAutoRefreshOptions = {}
): UseAutoRefreshReturn => {
  const {
    interval = 30000, // 30 seconds default
    enabled = true,
    pauseOnHidden = true,
    pauseOnIdle = true,
    idleTimeout = 300000, // 5 minutes default
  } = options;

  const [isEnabled, setIsEnabled] = useState(enabled);
  const [isPaused, setIsPaused] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(Math.floor(interval / 1000));
  const [currentInterval, setCurrentInterval] = useState(interval);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  /**
   * Clear all timers
   */
  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
  }, []);

  /**
   * Reset idle timer
   */
  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsIdle(false);

    if (pauseOnIdle && idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }

    if (pauseOnIdle) {
      idleTimeoutRef.current = setTimeout(() => {
        setIsIdle(true);
      }, idleTimeout);
    }
  }, [pauseOnIdle, idleTimeout]);

  /**
   * Start countdown timer
   */
  const startCountdown = useCallback(() => {
    setTimeUntilRefresh(Math.floor(currentInterval / 1000));
    
    countdownRef.current = setInterval(() => {
      setTimeUntilRefresh(prev => {
        if (prev <= 1) {
          return Math.floor(currentInterval / 1000);
        }
        return prev - 1;
      });
    }, 1000);
  }, [currentInterval]);

  /**
   * Start auto-refresh
   */
  const startAutoRefresh = useCallback(() => {
    clearTimers();

    if (!isEnabled) return;

    // Check if should be paused
    const shouldPause = 
      (pauseOnHidden && document.hidden) ||
      (pauseOnIdle && isIdle);

    if (shouldPause) {
      setIsPaused(true);
      return;
    }

    setIsPaused(false);
    startCountdown();

    intervalRef.current = setInterval(async () => {
      try {
        await callback();
      } catch (error) {
        console.error('Auto-refresh callback error:', error);
      }
    }, currentInterval);
  }, [isEnabled, pauseOnHidden, pauseOnIdle, isIdle, currentInterval, callback, clearTimers, startCountdown]);

  /**
   * Handle visibility change
   */
  const handleVisibilityChange = useCallback(() => {
    if (pauseOnHidden) {
      if (document.hidden) {
        setIsPaused(true);
        clearTimers();
      } else {
        resetIdleTimer();
        startAutoRefresh();
      }
    }
  }, [pauseOnHidden, clearTimers, resetIdleTimer, startAutoRefresh]);

  /**
   * Handle user activity
   */
  const handleActivity = useCallback(() => {
    resetIdleTimer();
    
    // Resume if paused due to idle
    if (isIdle && isEnabled) {
      startAutoRefresh();
    }
  }, [resetIdleTimer, isIdle, isEnabled, startAutoRefresh]);

  /**
   * Manual refresh
   */
  const refresh = useCallback(async () => {
    try {
      await callback();
      // Reset timer after manual refresh
      if (isEnabled && !isPaused) {
        startAutoRefresh();
      }
    } catch (error) {
      console.error('Manual refresh error:', error);
    }
  }, [callback, isEnabled, isPaused, startAutoRefresh]);

  /**
   * Enable auto-refresh
   */
  const enable = useCallback(() => {
    setIsEnabled(true);
  }, []);

  /**
   * Disable auto-refresh
   */
  const disable = useCallback(() => {
    setIsEnabled(false);
    clearTimers();
  }, [clearTimers]);

  /**
   * Toggle auto-refresh
   */
  const toggle = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  /**
   * Set refresh interval
   */
  const setRefreshInterval = useCallback((newInterval: number) => {
    setCurrentInterval(newInterval);
    setTimeUntilRefresh(Math.floor(newInterval / 1000));
  }, []);

  /**
   * Setup event listeners and auto-refresh
   */
  useEffect(() => {
    // Add event listeners for activity detection
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initialize idle timer
    resetIdleTimer();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimers();
    };
  }, [handleActivity, handleVisibilityChange, resetIdleTimer, clearTimers]);

  /**
   * Start/stop auto-refresh based on enabled state
   */
  useEffect(() => {
    if (isEnabled) {
      startAutoRefresh();
    } else {
      clearTimers();
      setIsPaused(false);
    }

    return () => {
      clearTimers();
    };
  }, [isEnabled, startAutoRefresh, clearTimers]);

  /**
   * Restart auto-refresh when idle state changes
   */
  useEffect(() => {
    if (isEnabled && !isIdle && pauseOnIdle) {
      startAutoRefresh();
    }
  }, [isIdle, isEnabled, pauseOnIdle, startAutoRefresh]);

  return {
    isEnabled,
    isPaused,
    isIdle,
    timeUntilRefresh,
    enable,
    disable,
    toggle,
    refresh,
    setInterval: setRefreshInterval,
  };
};

export default useAutoRefresh; 