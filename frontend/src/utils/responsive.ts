/**
 * Responsive utility library for OpsSight application
 * Provides hooks, utilities, and helpers for responsive design implementation
 */

import { useState, useEffect } from 'react';

/**
 * Tailwind CSS breakpoints matching our design system
 */
export const breakpoints = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

/**
 * Hook to detect current screen size and breakpoint
 * Returns the current breakpoint and useful boolean flags
 */
export function useBreakpoint() {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('lg');
  const [screenWidth, setScreenWidth] = useState<number>(0);

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      setScreenWidth(width);

      if (width >= breakpoints['2xl']) {
        setCurrentBreakpoint('2xl');
      } else if (width >= breakpoints.xl) {
        setCurrentBreakpoint('xl');
      } else if (width >= breakpoints.lg) {
        setCurrentBreakpoint('lg');
      } else if (width >= breakpoints.md) {
        setCurrentBreakpoint('md');
      } else if (width >= breakpoints.sm) {
        setCurrentBreakpoint('sm');
      } else {
        setCurrentBreakpoint('xs');
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return {
    breakpoint: currentBreakpoint,
    screenWidth,
    // Convenience flags
    isMobile: currentBreakpoint === 'xs' || currentBreakpoint === 'sm',
    isTablet: currentBreakpoint === 'md' || currentBreakpoint === 'lg',
    isDesktop: currentBreakpoint === 'xl' || currentBreakpoint === '2xl',
    // Specific breakpoint checks
    isXs: currentBreakpoint === 'xs',
    isSm: currentBreakpoint === 'sm',
    isMd: currentBreakpoint === 'md',
    isLg: currentBreakpoint === 'lg',
    isXl: currentBreakpoint === 'xl',
    is2Xl: currentBreakpoint === '2xl',
    // Size comparisons
    isAtLeast: (bp: Breakpoint) => screenWidth >= breakpoints[bp],
    isAtMost: (bp: Breakpoint) => screenWidth <= breakpoints[bp],
  };
}

/**
 * Hook for mobile-optimized touch interactions
 * Provides handlers for touch events with proper iOS Safari support
 */
export function useTouchInteraction() {
  return {
    // Touch-friendly button props
    touchProps: {
      className: 'touch-manipulation select-none',
      style: { WebkitTapHighlightColor: 'transparent' },
    },
    
    // iOS Safari viewport fix
    preventZoom: {
      onTouchStart: (e: React.TouchEvent) => {
        if (e.touches.length > 1) {
          e.preventDefault();
        }
      },
    },
  };
}

/**
 * Hook to detect reduced motion preference
 * Respects user's accessibility preferences
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Responsive value selector utility
 * Similar to Chakra UI's responsive values
 */
export function getResponsiveValue<T>(
  values: Partial<Record<Breakpoint, T>>,
  currentBreakpoint: Breakpoint
): T | undefined {
  // Breakpoint hierarchy for fallback
  const hierarchy: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = hierarchy.indexOf(currentBreakpoint);
  
  // Try current breakpoint first, then fall back down the hierarchy
  for (let i = currentIndex; i < hierarchy.length; i++) {
    const bp = hierarchy[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }
  
  // If no value found, try larger breakpoints
  for (let i = currentIndex - 1; i >= 0; i--) {
    const bp = hierarchy[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }
  
  return undefined;
}

/**
 * CSS class utilities for responsive design
 */
export const responsiveUtils = {
  // Grid column utilities
  gridCols: {
    mobile: 'grid-cols-1',
    tablet: 'grid-cols-2',
    desktop: 'grid-cols-12',
    adaptive: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-12',
  },
  
  // Spacing utilities
  spacing: {
    panel: 'space-y-4 md:space-y-6',
    cards: 'gap-4 md:gap-6 lg:gap-8',
    padding: 'p-4 md:p-5 lg:p-6',
    margin: 'm-4 md:m-6 lg:m-8',
  },
  
  // Typography utilities
  text: {
    heading: 'text-lg md:text-xl lg:text-2xl',
    body: 'text-sm md:text-base',
    caption: 'text-xs md:text-sm',
  },
  
  // Layout utilities
  layout: {
    container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    section: 'py-8 md:py-12 lg:py-16',
    card: 'rounded-lg md:rounded-xl lg:rounded-2xl',
  },
  
  // Touch targets (minimum 44px for accessibility)
  touch: {
    button: 'min-h-[44px] min-w-[44px]',
    link: 'min-h-[44px] min-w-[44px] flex items-center justify-center',
  },
  
  // Hide/show utilities
  visibility: {
    mobileOnly: 'block md:hidden',
    tabletOnly: 'hidden md:block lg:hidden',
    desktopOnly: 'hidden lg:block',
    notMobile: 'hidden md:block',
    notDesktop: 'block lg:hidden',
  },
} as const;

/**
 * Media query utilities for CSS-in-JS
 */
export const mediaQueries = {
  xs: `(min-width: ${breakpoints.xs}px)`,
  sm: `(min-width: ${breakpoints.sm}px)`,
  md: `(min-width: ${breakpoints.md}px)`,
  lg: `(min-width: ${breakpoints.lg}px)`,
  xl: `(min-width: ${breakpoints.xl}px)`,
  '2xl': `(min-width: ${breakpoints['2xl']}px)`,
  
  // Max-width queries
  maxXs: `(max-width: ${breakpoints.xs - 1}px)`,
  maxSm: `(max-width: ${breakpoints.sm - 1}px)`,
  maxMd: `(max-width: ${breakpoints.md - 1}px)`,
  maxLg: `(max-width: ${breakpoints.lg - 1}px)`,
  maxXl: `(max-width: ${breakpoints.xl - 1}px)`,
  
  // Range queries
  mobile: `(max-width: ${breakpoints.md - 1}px)`,
  tablet: `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.xl - 1}px)`,
  desktop: `(min-width: ${breakpoints.xl}px)`,
  
  // Accessibility queries
  reducedMotion: '(prefers-reduced-motion: reduce)',
  darkMode: '(prefers-color-scheme: dark)',
  highContrast: '(prefers-contrast: high)',
} as const;

/**
 * Utility for creating responsive className strings
 */
export function createResponsiveClass(
  baseClass: string,
  responsiveClasses: Partial<Record<Breakpoint, string>>
): string {
  const classes = [baseClass];
  
  Object.entries(responsiveClasses).forEach(([breakpoint, className]) => {
    if (breakpoint === 'xs') {
      classes.push(className);
    } else {
      classes.push(`${breakpoint}:${className}`);
    }
  });
  
  return classes.join(' ');
}

/**
 * Dashboard layout responsive utilities
 * Specific to OpsSight's 3-column layout design
 */
export const dashboardLayout = {
  // System Pulse panel (left)
  systemPulse: 'col-span-1 md:col-span-1 xl:col-span-3 order-1 md:order-1 xl:order-1',
  
  // Command Center panel (center)
  commandCenter: 'col-span-1 md:col-span-2 xl:col-span-6 order-2 md:order-3 xl:order-2',
  
  // Action Insights panel (right)
  actionInsights: 'col-span-1 md:col-span-1 xl:col-span-3 order-3 md:order-2 xl:order-3',
  
  // Card layouts within panels
  cardGrid: {
    systemPulse: 'grid gap-4 md:gap-6',
    commandCenter: 'space-y-6 md:space-y-8',
    actionInsights: 'space-y-4 md:space-y-6',
  },
} as const;

/**
 * Mobile-first responsive design principles
 */
export const designPrinciples = {
  // Typography scale
  typography: {
    // Minimum touch-friendly sizes
    minTouchTarget: '44px',
    
    // Optimal line lengths for readability
    lineLength: {
      mobile: '45ch',
      desktop: '65ch',
    },
    
    // Vertical rhythm
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  
  // Layout principles
  layout: {
    // Container max-widths
    container: {
      mobile: '100%',
      tablet: '768px',
      desktop: '1280px',
      wide: '1536px',
    },
    
    // Optimal content widths
    content: {
      narrow: '640px',
      medium: '768px',
      wide: '1024px',
    },
    
    // Spacing scale (based on 4px grid)
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
      '2xl': '48px',
      '3xl': '64px',
    },
  },
} as const; 