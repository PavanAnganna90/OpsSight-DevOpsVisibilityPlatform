/**
 * ColorModeProvider component and context for managing color modes across the application
 * Integrates with the useColorMode hook and theme system
 */

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useColorMode, ColorMode } from '../hooks/useColorMode';

interface ColorModeContextValue {
  colorMode: ColorMode;
  resolvedColorMode: Exclude<ColorMode, 'system'>;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
  isSystemMode: boolean;
  systemPreference: 'light' | 'dark';
}

// Create the context
const ColorModeContext = createContext<ColorModeContextValue | undefined>(undefined);

interface ColorModeProviderProps {
  children: ReactNode;
  defaultMode?: ColorMode;
  enableTransitions?: boolean;
  storageKey?: string;
}

/**
 * ColorModeProvider component that wraps the app and provides color mode context
 * 
 * Features:
 * - Automatic theme application based on color mode
 * - Smooth transitions between color modes
 * - Integration with CSS custom properties
 * - Support for prefers-reduced-motion
 * 
 * Props:
 *   children: React components to wrap
 *   defaultMode: Default color mode (defaults to 'system')
 *   enableTransitions: Whether to enable smooth transitions (default: true)
 *   storageKey: Custom storage key for persistence
 */
export function ColorModeProvider({
  children,
  defaultMode,
  enableTransitions = true,
  storageKey,
}: ColorModeProviderProps) {
  const colorModeHook = useColorMode();

  // Apply color mode transitions
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (enableTransitions && !prefersReducedMotion) {
      // Add transition for smooth color mode changes
      root.style.setProperty('--color-mode-transition', 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease');
      
      // Apply transitions to all elements
      const transitionStyle = document.createElement('style');
      transitionStyle.textContent = `
        *, *::before, *::after {
          transition: var(--color-mode-transition);
        }
        
        /* Disable transitions on elements that shouldn't animate */
        .no-transition,
        .no-transition *,
        [data-no-transition],
        [data-no-transition] * {
          transition: none !important;
        }
        
        /* Specific transitions for different elements */
        .theme-transition {
          transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
        
        /* Smooth opacity transitions for theme-specific elements */
        .theme-specific {
          transition: opacity 0.2s ease;
        }
        
        /* Handle focus states during transitions */
        :focus-visible {
          transition: outline-color 0.2s ease, box-shadow 0.2s ease;
        }
      `;
      
      document.head.appendChild(transitionStyle);
      
      // Cleanup function
      return () => {
        root.style.removeProperty('--color-mode-transition');
        if (document.head.contains(transitionStyle)) {
          document.head.removeChild(transitionStyle);
        }
      };
    }
  }, [enableTransitions]);

  // Apply color mode specific CSS custom properties
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const { resolvedColorMode } = colorModeHook;

    // Define color mode specific CSS custom properties
    const colorModeProperties = {
      light: {
        '--mode-background': '#ffffff',
        '--mode-foreground': '#000000',
        '--mode-surface': '#f8f9fa',
        '--mode-border': '#e9ecef',
        '--mode-shadow': 'rgba(0, 0, 0, 0.1)',
        '--mode-overlay': 'rgba(0, 0, 0, 0.5)',
        '--mode-filter': 'none',
        '--mode-opacity': '1',
      },
      dark: {
        '--mode-background': '#0a0a0a',
        '--mode-foreground': '#ffffff',
        '--mode-surface': '#1a1a1a',
        '--mode-border': '#2a2a2a',
        '--mode-shadow': 'rgba(0, 0, 0, 0.3)',
        '--mode-overlay': 'rgba(0, 0, 0, 0.7)',
        '--mode-filter': 'invert(0)',
        '--mode-opacity': '1',
      },
      'high-contrast': {
        '--mode-background': '#000000',
        '--mode-foreground': '#ffffff',
        '--mode-surface': '#000000',
        '--mode-border': '#ffffff',
        '--mode-shadow': 'none',
        '--mode-overlay': 'rgba(0, 0, 0, 0.9)',
        '--mode-filter': 'contrast(2)',
        '--mode-opacity': '1',
      },
    };

    const properties = colorModeProperties[resolvedColorMode];
    
    // Apply properties
    Object.entries(properties).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Set color scheme for native form controls
    root.style.setProperty('color-scheme', resolvedColorMode === 'light' ? 'light' : 'dark');

  }, [colorModeHook.resolvedColorMode]);

  // Handle system changes for better UX
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Add event listener for visibility changes to sync with system
    const handleVisibilityChange = () => {
      if (!document.hidden && colorModeHook.isSystemMode) {
        // Refresh system preference when page becomes visible
        // This helps sync with system changes that happened while page was hidden
        const event = new Event('change');
        window.matchMedia('(prefers-color-scheme: dark)').dispatchEvent(event);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [colorModeHook.isSystemMode]);

  return (
    <ColorModeContext.Provider value={colorModeHook}>
      {children}
    </ColorModeContext.Provider>
  );
}

/**
 * Hook to access color mode context
 * Must be used within a ColorModeProvider
 */
export function useColorModeContext(): ColorModeContextValue {
  const context = useContext(ColorModeContext);
  
  if (context === undefined) {
    throw new Error('useColorModeContext must be used within a ColorModeProvider');
  }
  
  return context;
}

// Re-export types for convenience
export type { ColorMode };

// Higher-order component for class-based components
export function withColorMode<P extends object>(
  Component: React.ComponentType<P & ColorModeContextValue>
) {
  const WrappedComponent = (props: P) => {
    const colorMode = useColorModeContext();
    return <Component {...props} {...colorMode} />;
  };

  WrappedComponent.displayName = `withColorMode(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
} 