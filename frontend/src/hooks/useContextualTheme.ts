/**
 * Contextual Theme Hook
 * 
 * Manages contextual themes (default, focus, relax, energize) with state management,
 * persistence, smooth transitions, and integration with the main theme system.
 */

import { useState, useEffect, useCallback } from 'react';
import { ThemeContext, ThemeConfig, applyTheme, getThemeVariables } from '../utils/theme';

export interface ContextualThemeState {
  /** Current contextual theme */
  context: ThemeContext;
  /** Whether contextual themes are enabled */
  enabled: boolean;
  /** Whether transitions are enabled */
  transitionsEnabled: boolean;
}

export interface UseContextualThemeReturn {
  /** Current contextual theme state */
  state: ContextualThemeState;
  /** Set contextual theme */
  setContext: (context: ThemeContext) => void;
  /** Toggle contextual themes on/off */
  toggleEnabled: () => void;
  /** Enable/disable transitions */
  setTransitionsEnabled: (enabled: boolean) => void;
  /** Reset to default context */
  resetToDefault: () => void;
  /** Apply contextual theme immediately */
  applyContextualTheme: (config: ThemeConfig) => void;
  /** Get current contextual theme variables */
  getContextualVariables: (config: ThemeConfig) => Record<string, string>;
}

/**
 * Custom hook for managing contextual themes
 * 
 * Features:
 * - State management for contextual themes
 * - Persistent storage in localStorage
 * - Smooth transitions between contexts
 * - Integration with main theme system
 * - Performance optimizations
 * 
 * @param storageKey - localStorage key for persistence
 * @param defaultContext - Default contextual theme
 * @param enableTransitions - Whether to enable transitions by default
 */
export function useContextualTheme(
  storageKey: string = 'opssight-contextual-theme',
  defaultContext: ThemeContext = 'default',
  enableTransitions: boolean = true
): UseContextualThemeReturn {
  const [state, setState] = useState<ContextualThemeState>({
    context: defaultContext,
    enabled: true,
    transitionsEnabled: enableTransitions,
  });

  /**
   * Load contextual theme state from localStorage
   */
  const loadFromStorage = useCallback((): ContextualThemeState => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          context: parsed.context || defaultContext,
          enabled: parsed.enabled !== undefined ? parsed.enabled : true,
          transitionsEnabled: parsed.transitionsEnabled !== undefined ? parsed.transitionsEnabled : enableTransitions,
        };
      }
    } catch (error) {
      console.warn('Failed to load contextual theme from localStorage:', error);
    }
    
    return {
      context: defaultContext,
      enabled: true,
      transitionsEnabled: enableTransitions,
    };
  }, [storageKey, defaultContext, enableTransitions]);

  /**
   * Save contextual theme state to localStorage
   */
  const saveToStorage = useCallback((newState: ContextualThemeState) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newState));
    } catch (error) {
      console.warn('Failed to save contextual theme to localStorage:', error);
    }
  }, [storageKey]);

  /**
   * Set contextual theme with persistence and transition support
   */
  const setContext = useCallback((context: ThemeContext) => {
    setState(prevState => {
      const newState = { ...prevState, context };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  /**
   * Toggle contextual themes on/off
   */
  const toggleEnabled = useCallback(() => {
    setState(prevState => {
      const newState = { ...prevState, enabled: !prevState.enabled };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  /**
   * Enable/disable transitions
   */
  const setTransitionsEnabled = useCallback((enabled: boolean) => {
    setState(prevState => {
      const newState = { ...prevState, transitionsEnabled: enabled };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  /**
   * Reset to default context
   */
  const resetToDefault = useCallback(() => {
    setContext(defaultContext);
  }, [setContext, defaultContext]);

  /**
   * Apply contextual theme with smooth transitions
   */
  const applyContextualTheme = useCallback((config: ThemeConfig) => {
    if (!state.enabled) return;

    const contextualConfig: ThemeConfig = {
      ...config,
      context: state.context,
    };

    // Apply transition class for smooth animations
    if (state.transitionsEnabled && typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.classList.add('theme-transitioning');
      
      // Remove transition class after transition completes
      setTimeout(() => {
        if (document.documentElement) {
          document.documentElement.classList.remove('theme-transitioning');
        }
      }, 300);
    }

    // Apply the theme with contextual overrides
    applyTheme(contextualConfig);
  }, [state.enabled, state.context, state.transitionsEnabled]);

  /**
   * Get current contextual theme variables
   */
  const getContextualVariables = useCallback((config: ThemeConfig): Record<string, string> => {
    if (!state.enabled) {
      return getThemeVariables(config);
    }

    const contextualConfig: ThemeConfig = {
      ...config,
      context: state.context,
    };

    return getThemeVariables(contextualConfig);
  }, [state.enabled, state.context]);

  /**
   * Initialize state from localStorage on mount
   */
  useEffect(() => {
    const loadedState = loadFromStorage();
    setState(loadedState);
  }, [loadFromStorage]);

  /**
   * Apply CSS class for transition support
   */
  useEffect(() => {
    // Handle cases where document is not available (e.g., SSR, tests)
    if (typeof document === 'undefined' || !document.documentElement) {
      return;
    }
    
    const root = document.documentElement;
    
    if (state.transitionsEnabled) {
      root.style.setProperty('--theme-transition-duration', '300ms');
      root.style.setProperty('--theme-transition-easing', 'cubic-bezier(0.4, 0, 0.2, 1)');
    } else {
      root.style.removeProperty('--theme-transition-duration');
      root.style.removeProperty('--theme-transition-easing');
    }
  }, [state.transitionsEnabled]);

  /**
   * Add data attribute for CSS targeting
   */
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-contextual-theme', state.context);
    root.setAttribute('data-contextual-enabled', state.enabled.toString());
  }, [state.context, state.enabled]);

  return {
    state,
    setContext,
    toggleEnabled,
    setTransitionsEnabled,
    resetToDefault,
    applyContextualTheme,
    getContextualVariables,
  };
} 