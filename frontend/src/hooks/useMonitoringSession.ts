/**
 * Monitoring Session Hook
 * 
 * Custom hook for managing long monitoring sessions with
 * eye-strain reduction, focus modes, and wellness features.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface MonitoringSessionOptions {
  /** Enable eye-strain reduction features */
  enableEyeStrainReduction?: boolean;
  /** Auto-enable focus mode after specified duration (ms) */
  autoFocusAfter?: number;
  /** Break reminder interval (ms) */
  breakReminderInterval?: number;
  /** Session timeout warning (ms) */
  sessionTimeoutWarning?: number;
}

interface SessionMetrics {
  /** Total session duration in ms */
  duration: number;
  /** Number of breaks taken */
  breaksCount: number;
  /** Time since last break in ms */
  timeSinceLastBreak: number;
  /** Whether user should take a break */
  shouldTakeBreak: boolean;
}

interface UseMonitoringSessionReturn {
  /** Whether focus mode is active */
  isFocusMode: boolean;
  /** Whether reduced motion is enabled */
  isReducedMotion: boolean;
  /** Whether break reminder is shown */
  showBreakReminder: boolean;
  /** Current session metrics */
  sessionMetrics: SessionMetrics;
  /** Toggle focus mode */
  toggleFocusMode: () => void;
  /** Toggle reduced motion */
  toggleReducedMotion: () => void;
  /** Dismiss break reminder */
  dismissBreakReminder: () => void;
  /** Take a break (resets break timer) */
  takeBreak: () => void;
  /** Enable eye-strain reduction */
  enableEyeStrain: () => void;
  /** Disable eye-strain reduction */
  disableEyeStrain: () => void;
}

/**
 * Monitoring Session Hook
 * 
 * Provides comprehensive session management for long monitoring periods:
 * - Eye-strain reduction with focus mode and reduced motion
 * - Break reminders and session tracking
 * - Automatic optimizations based on session duration
 * - Wellness features for extended usage
 * 
 * @param options - Configuration options
 * @returns Session management interface
 */
export const useMonitoringSession = (
  options: MonitoringSessionOptions = {}
): UseMonitoringSessionReturn => {
  const {
    enableEyeStrainReduction = true,
    autoFocusAfter = 1800000, // 30 minutes
    breakReminderInterval = 3600000, // 1 hour
    sessionTimeoutWarning = 14400000, // 4 hours
  } = options;

  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [showBreakReminder, setShowBreakReminder] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const [lastBreakTime, setLastBreakTime] = useState(Date.now());
  const [breaksCount, setBreaksCount] = useState(0);

  const breakReminderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoFocusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Calculate session metrics
   */
  const getSessionMetrics = useCallback((): SessionMetrics => {
    const now = Date.now();
    const duration = now - sessionStartTime;
    const timeSinceLastBreak = now - lastBreakTime;
    const shouldTakeBreak = timeSinceLastBreak >= breakReminderInterval;

    return {
      duration,
      breaksCount,
      timeSinceLastBreak,
      shouldTakeBreak,
    };
  }, [sessionStartTime, lastBreakTime, breaksCount, breakReminderInterval]);

  /**
   * Apply eye-strain reduction styles
   */
  const applyEyeStrainReduction = useCallback(() => {
    const root = document.documentElement;
    
    if (enableEyeStrainReduction) {
      // Reduce blue light
      root.style.setProperty('--filter-blue-light', 'sepia(10%) saturate(90%)');
      
      // Increase contrast slightly
      root.style.setProperty('--contrast-enhanced', '1.05');
      
      // Soften bright colors
      root.style.setProperty('--brightness-reduced', '0.95');
      
      // Apply filter
      document.body.style.filter = 'var(--filter-blue-light) contrast(var(--contrast-enhanced)) brightness(var(--brightness-reduced))';
    } else {
      // Reset filters
      document.body.style.filter = '';
      root.style.removeProperty('--filter-blue-light');
      root.style.removeProperty('--contrast-enhanced');
      root.style.removeProperty('--brightness-reduced');
    }
  }, [enableEyeStrainReduction]);

  /**
   * Apply focus mode styles
   */
  const applyFocusMode = useCallback(() => {
    const root = document.documentElement;
    
    if (isFocusMode) {
      // Reduce animation duration
      root.style.setProperty('--animation-duration-scale', '0.5');
      
      // Reduce unnecessary visual elements
      root.classList.add('focus-mode');
    } else {
      // Reset animation duration
      root.style.removeProperty('--animation-duration-scale');
      root.classList.remove('focus-mode');
    }
  }, [isFocusMode]);

  /**
   * Apply reduced motion preferences
   */
  const applyReducedMotion = useCallback(() => {
    const root = document.documentElement;
    
    if (isReducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [isReducedMotion]);

  /**
   * Setup break reminder
   */
  const setupBreakReminder = useCallback(() => {
    if (breakReminderTimeoutRef.current) {
      clearTimeout(breakReminderTimeoutRef.current);
    }

    breakReminderTimeoutRef.current = setTimeout(() => {
      setShowBreakReminder(true);
    }, breakReminderInterval);
  }, [breakReminderInterval]);

  /**
   * Setup auto-focus mode
   */
  const setupAutoFocus = useCallback(() => {
    if (autoFocusTimeoutRef.current) {
      clearTimeout(autoFocusTimeoutRef.current);
    }

    autoFocusTimeoutRef.current = setTimeout(() => {
      if (!isFocusMode) {
        setIsFocusMode(true);
      }
    }, autoFocusAfter);
  }, [autoFocusAfter, isFocusMode]);

  /**
   * Toggle focus mode
   */
  const toggleFocusMode = useCallback(() => {
    setIsFocusMode(prev => !prev);
  }, []);

  /**
   * Toggle reduced motion
   */
  const toggleReducedMotion = useCallback(() => {
    setIsReducedMotion(prev => !prev);
  }, []);

  /**
   * Dismiss break reminder
   */
  const dismissBreakReminder = useCallback(() => {
    setShowBreakReminder(false);
    setupBreakReminder();
  }, [setupBreakReminder]);

  /**
   * Take a break
   */
  const takeBreak = useCallback(() => {
    setLastBreakTime(Date.now());
    setBreaksCount(prev => prev + 1);
    setShowBreakReminder(false);
    setupBreakReminder();
  }, [setupBreakReminder]);

  /**
   * Enable eye-strain reduction
   */
  const enableEyeStrain = useCallback(() => {
    applyEyeStrainReduction();
  }, [applyEyeStrainReduction]);

  /**
   * Disable eye-strain reduction
   */
  const disableEyeStrain = useCallback(() => {
    document.body.style.filter = '';
  }, []);

  /**
   * Check system reduced motion preference
   */
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    // Set initial value
    setIsReducedMotion(mediaQuery.matches);
    
    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  /**
   * Apply styles when states change
   */
  useEffect(() => {
    applyEyeStrainReduction();
  }, [applyEyeStrainReduction]);

  useEffect(() => {
    applyFocusMode();
  }, [applyFocusMode]);

  useEffect(() => {
    applyReducedMotion();
  }, [applyReducedMotion]);

  /**
   * Setup timers on mount
   */
  useEffect(() => {
    setupBreakReminder();
    setupAutoFocus();

    return () => {
      if (breakReminderTimeoutRef.current) {
        clearTimeout(breakReminderTimeoutRef.current);
      }
      if (autoFocusTimeoutRef.current) {
        clearTimeout(autoFocusTimeoutRef.current);
      }
    };
  }, [setupBreakReminder, setupAutoFocus]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Reset all styles
      document.body.style.filter = '';
      const root = document.documentElement;
      root.style.removeProperty('--filter-blue-light');
      root.style.removeProperty('--contrast-enhanced');
      root.style.removeProperty('--brightness-reduced');
      root.style.removeProperty('--animation-duration-scale');
      root.classList.remove('focus-mode', 'reduce-motion');
    };
  }, []);

  return {
    isFocusMode,
    isReducedMotion,
    showBreakReminder,
    sessionMetrics: getSessionMetrics(),
    toggleFocusMode,
    toggleReducedMotion,
    dismissBreakReminder,
    takeBreak,
    enableEyeStrain,
    disableEyeStrain,
  };
};

export default useMonitoringSession; 