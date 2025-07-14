/**
 * Contextual Theme Provider
 * 
 * Provides contextual theme management functionality throughout the application.
 * Integrates with the main theme system and provides hooks for accessing contextual theme state.
 */

'use client';

import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useContextualTheme, UseContextualThemeReturn } from '../hooks/useContextualTheme';
import { useTheme } from './ThemeContext';
import { ThemeContext, ThemeConfig } from '../utils/theme';

interface ContextualThemeContextType extends UseContextualThemeReturn {
  /** Apply contextual theme with current theme configuration */
  applyWithCurrentTheme: () => void;
  /** Get theme configuration including contextual overrides */
  getCurrentThemeConfig: () => ThemeConfig;
  /** Whether the current contextual theme is active */
  isContextActive: boolean;
}

interface ContextualThemeProviderProps {
  /** Child components */
  children: ReactNode;
  /** Storage key for persistence */
  storageKey?: string;
  /** Default contextual theme */
  defaultContext?: ThemeContext;
  /** Whether to enable transitions by default */
  enableTransitions?: boolean;
  /** Whether to auto-apply contextual themes */
  autoApply?: boolean;
}

const ContextualThemeContext = createContext<ContextualThemeContextType | undefined>(undefined);

/**
 * Contextual Theme Provider Component
 * 
 * Manages contextual theme state and provides integration with the main theme system.
 * 
 * Features:
 * - Automatic integration with main theme system
 * - Persistent storage of contextual theme preferences
 * - Smooth transitions between contextual themes
 * - Auto-application of contextual themes when main theme changes
 * - Performance optimizations
 * 
 * @param children - Child components
 * @param storageKey - localStorage key for persistence
 * @param defaultContext - Default contextual theme
 * @param enableTransitions - Whether to enable transitions by default
 * @param autoApply - Whether to automatically apply contextual themes
 */
export const ContextualThemeProvider: React.FC<ContextualThemeProviderProps> = ({
  children,
  storageKey = 'opssight-contextual-theme',
  defaultContext = 'default',
  enableTransitions = true,
  autoApply = true,
}) => {
  const { currentTheme: mainTheme, resolvedColorMode: resolvedTheme } = useTheme();
  const contextualTheme = useContextualTheme(storageKey, defaultContext, enableTransitions);

  /**
   * Get current theme configuration including contextual overrides
   */
  const getCurrentThemeConfig = (): ThemeConfig => {
    // Convert main theme to ThemeConfig format
    const baseConfig: ThemeConfig = {
      variant: 'minimal', // Default variant, should be configurable
      colorMode: resolvedTheme,
      context: contextualTheme.state.enabled ? contextualTheme.state.context : undefined,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    };

    return baseConfig;
  };

  /**
   * Apply contextual theme with current theme configuration
   */
  const applyWithCurrentTheme = () => {
    const config = getCurrentThemeConfig();
    contextualTheme.applyContextualTheme(config);
  };

  /**
   * Whether the current contextual theme is active (not default)
   */
  const isContextActive = contextualTheme.state.enabled && contextualTheme.state.context !== 'default';

  /**
   * Auto-apply contextual theme when main theme or contextual settings change
   */
  useEffect(() => {
    if (autoApply) {
      applyWithCurrentTheme();
    }
  }, [
    mainTheme,
    resolvedTheme,
    contextualTheme.state.context,
    contextualTheme.state.enabled,
    autoApply,
  ]);

  /**
   * Handle system preference changes for reduced motion
   */
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = () => {
      if (autoApply) {
        applyWithCurrentTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [autoApply]);

  /**
   * Apply initial contextual theme on mount
   */
  useEffect(() => {
    if (autoApply) {
      // Small delay to ensure main theme is applied first
      const timeout = setTimeout(() => {
        applyWithCurrentTheme();
      }, 50);

      return () => clearTimeout(timeout);
    }
  }, []);

  const contextValue: ContextualThemeContextType = {
    ...contextualTheme,
    applyWithCurrentTheme,
    getCurrentThemeConfig,
    isContextActive,
  };

  return (
    <ContextualThemeContext.Provider value={contextValue}>
      {children}
    </ContextualThemeContext.Provider>
  );
};

/**
 * Hook to access contextual theme functionality
 * 
 * Provides access to contextual theme state and methods for managing contextual themes.
 * Must be used within a ContextualThemeProvider.
 * 
 * @returns Contextual theme context with state and methods
 */
export const useContextualThemeContext = (): ContextualThemeContextType => {
  const context = useContext(ContextualThemeContext);
  
  if (context === undefined) {
    throw new Error('useContextualThemeContext must be used within a ContextualThemeProvider');
  }
  
  return context;
};

/**
 * Higher-order component to wrap components with contextual theme functionality
 * 
 * @param Component - Component to wrap
 * @param options - Provider options
 */
export function withContextualTheme<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ContextualThemeProviderProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ContextualThemeProvider {...options}>
      <Component {...props} />
    </ContextualThemeProvider>
  );

  WrappedComponent.displayName = `withContextualTheme(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook for simple contextual theme switching
 * 
 * Simplified interface for quickly switching between contextual themes.
 * 
 * @returns Object with current context and setter
 */
export const useQuickContextualTheme = () => {
  const { state, setContext } = useContextualThemeContext();
  
  return {
    context: state.context,
    setContext,
    isDefault: state.context === 'default',
    isFocus: state.context === 'focus',
    isRelax: state.context === 'relax',
    isEnergize: state.context === 'energize',
  };
};

/**
 * Component for debugging contextual theme state
 * 
 * Useful for development to visualize current contextual theme state.
 * Only renders in development mode.
 */
export const ContextualThemeDebugger: React.FC<{ 
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' 
}> = ({ 
  position = 'bottom-right' 
}) => {
  const context = useContextualThemeContext();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const positionStyles = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div className={`fixed ${positionStyles[position]} z-50 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg text-xs font-mono space-y-1`}>
      <div className="font-semibold text-text-primary">Contextual Theme Debug</div>
      <div className="text-text-secondary">
        Context: <span className="text-accent">{context.state.context}</span>
      </div>
      <div className="text-text-secondary">
        Enabled: <span className="text-accent">{context.state.enabled.toString()}</span>
      </div>
      <div className="text-text-secondary">
        Transitions: <span className="text-accent">{context.state.transitionsEnabled.toString()}</span>
      </div>
      <div className="text-text-secondary">
        Active: <span className="text-accent">{context.isContextActive.toString()}</span>
      </div>
    </div>
  );
}; 