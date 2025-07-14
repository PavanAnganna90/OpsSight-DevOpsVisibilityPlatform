/**
 * Responsive Utilities Hook
 * 
 * Custom hook providing responsive design utilities including
 * breakpoint detection, screen size queries, and mobile detection.
 */

import { useEffect, useState, useCallback } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface ResponsiveState {
  /** Current window width */
  width: number;
  /** Current window height */
  height: number;
  /** Current breakpoint */
  breakpoint: Breakpoint;
  /** Whether device is mobile (sm and below) */
  isMobile: boolean;
  /** Whether device is tablet (md) */
  isTablet: boolean;
  /** Whether device is desktop (lg and above) */
  isDesktop: boolean;
  /** Whether in portrait orientation */
  isPortrait: boolean;
  /** Whether user prefers reduced motion */
  prefersReducedMotion: boolean;
  /** Whether device supports touch */
  supportsTouch: boolean;
}

interface UseResponsiveReturn extends ResponsiveState {
  /** Check if current breakpoint matches */
  isBreakpoint: (breakpoint: Breakpoint) => boolean;
  /** Check if current breakpoint is at or above specified */
  isBreakpointUp: (breakpoint: Breakpoint) => boolean;
  /** Check if current breakpoint is at or below specified */
  isBreakpointDown: (breakpoint: Breakpoint) => boolean;
  /** Get responsive value based on current breakpoint */
  getResponsiveValue: <T>(values: Partial<Record<Breakpoint, T>>) => T | undefined;
}

/**
 * Breakpoint definitions (matching Tailwind CSS defaults)
 */
const BREAKPOINTS: Record<Breakpoint, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * Get current breakpoint based on window width
 */
const getBreakpoint = (width: number): Breakpoint => {
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

/**
 * Check if device supports touch
 */
const supportsTouch = (): boolean => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - for IE/Edge
    navigator.msMaxTouchPoints > 0
  );
};

/**
 * Responsive Utilities Hook
 * 
 * Provides comprehensive responsive design utilities:
 * - Window dimension tracking
 * - Breakpoint detection and querying
 * - Device type identification
 * - Orientation detection
 * - Accessibility preference detection
 * - Touch support detection
 * 
 * @returns Responsive utilities and state
 */
export const useResponsive = (): UseResponsiveReturn => {
  const [state, setState] = useState<ResponsiveState>(() => {
    // Initial state (SSR-safe)
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const height = typeof window !== 'undefined' ? window.innerHeight : 768;
    const breakpoint = getBreakpoint(width);
    
    return {
      width,
      height,
      breakpoint,
      isMobile: breakpoint === 'xs' || breakpoint === 'sm',
      isTablet: breakpoint === 'md',
      isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl',
      isPortrait: height > width,
      prefersReducedMotion: false,
      supportsTouch: typeof window !== 'undefined' ? supportsTouch() : false,
    };
  });

  /**
   * Update responsive state
   */
  const updateState = useCallback(() => {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const breakpoint = getBreakpoint(width);
    
    // Check reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersReducedMotion = mediaQuery.matches;

    setState({
      width,
      height,
      breakpoint,
      isMobile: breakpoint === 'xs' || breakpoint === 'sm',
      isTablet: breakpoint === 'md',
      isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl',
      isPortrait: height > width,
      prefersReducedMotion,
      supportsTouch: supportsTouch(),
    });
  }, []);

  /**
   * Check if current breakpoint matches
   */
  const isBreakpoint = useCallback((breakpoint: Breakpoint): boolean => {
    return state.breakpoint === breakpoint;
  }, [state.breakpoint]);

  /**
   * Check if current breakpoint is at or above specified
   */
  const isBreakpointUp = useCallback((breakpoint: Breakpoint): boolean => {
    return state.width >= BREAKPOINTS[breakpoint];
  }, [state.width]);

  /**
   * Check if current breakpoint is at or below specified
   */
  const isBreakpointDown = useCallback((breakpoint: Breakpoint): boolean => {
    const nextBreakpoint = getBreakpoint(BREAKPOINTS[breakpoint] + 1);
    return state.width < BREAKPOINTS[nextBreakpoint];
  }, [state.width]);

  /**
   * Get responsive value based on current breakpoint
   */
  const getResponsiveValue = useCallback(<T,>(
    values: Partial<Record<Breakpoint, T>>
  ): T | undefined => {
    // Try current breakpoint first
    if (values[state.breakpoint] !== undefined) {
      return values[state.breakpoint];
    }

    // Fall back to smaller breakpoints
    const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(state.breakpoint);
    
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i];
      if (values[bp] !== undefined) {
        return values[bp];
      }
    }

    return undefined;
  }, [state.breakpoint]);

  /**
   * Setup event listeners
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Update state on mount
    updateState();

    // Throttled resize handler
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateState, 100);
    };

    // Reduced motion preference change handler
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setState(prev => ({
        ...prev,
        prefersReducedMotion: e.matches,
      }));
    };

    // Add listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', updateState);
    mediaQuery.addEventListener('change', handleMotionChange);

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', updateState);
      mediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, [updateState]);

  return {
    ...state,
    isBreakpoint,
    isBreakpointUp,
    isBreakpointDown,
    getResponsiveValue,
  };
};

export default useResponsive; 