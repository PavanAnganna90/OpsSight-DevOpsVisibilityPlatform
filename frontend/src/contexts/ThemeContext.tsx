/**
 * Comprehensive Theme Context
 * 
 * Provides unified theme management functionality including:
 * - Theme variants (minimal, neo-brutalist, glassmorphic, cyberpunk, editorial, accessible)
 * - Color modes (light, dark, high-contrast)
 * - Contextual themes (default, focus, relax, energize)
 * - System preference detection
 * - Persistent storage
 * - Reduced motion detection
 * - Enhanced theme transitions with FLIP animations
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { 
  themes, 
  ThemeName, 
  ColorMode, 
  Theme, 
  getThemeWithColorMode, 
  applyTheme as applyThemeToDOM,
  generateDynamicTheme
} from '../styles/themes';
import { 
  applyThemeWithTransition, 
  themeTransitionManager, 
  ThemeTransitionConfig,
  useThemeTransition
} from '../utils/themeTransition';

// Contextual theme types
export type ContextualTheme = 'default' | 'focus' | 'relax' | 'energize';

// System preferences interface
export interface SystemPreferences {
  colorScheme: 'light' | 'dark';
  reducedMotion: boolean;
  highContrast: boolean;
}

// Main theme configuration interface
export interface ThemeConfig {
  variant: RuntimeThemeName;
  colorMode: ColorMode | 'system';
  contextualTheme: ContextualTheme;
  respectSystemPreferences: boolean;
  enableTransitions: boolean;
  dynamicSeed?: number; // For dynamic theme generation
  transitionConfig?: Partial<ThemeTransitionConfig>; // Enhanced transition configuration
}

// Update ThemeName type locally to allow 'dynamic' as a special case
export type RuntimeThemeName = ThemeName | 'dynamic';

// Theme context interface
interface ThemeContextType {
  /** Current theme configuration */
  config: ThemeConfig;
  /** Resolved theme (never 'system') */
  resolvedColorMode: ColorMode;
  /** Current applied theme object */
  currentTheme: Theme;
  /** System preferences */
  systemPreferences: SystemPreferences;
  
  // Theme variant methods
  /** Set theme variant */
  setThemeVariant: (variant: RuntimeThemeName) => void;
  /** Get available theme variants */
  getAvailableVariants: () => ThemeName[];
  
  // Color mode methods
  /** Set color mode */
  setColorMode: (mode: ColorMode | 'system') => void;
  /** Toggle between light and dark */
  toggleColorMode: () => void;
  
  // Contextual theme methods
  /** Set contextual theme */
  setContextualTheme: (context: ContextualTheme) => void;
  /** Reset to default contextual theme */
  resetContextualTheme: () => void;
  
  // System preferences methods
  /** Toggle system preference respect */
  toggleSystemPreferences: () => void;
  /** Update specific system preference */
  updateSystemPreference: (key: keyof SystemPreferences, value: boolean) => void;
  
  // Utility methods
  /** Apply current theme to DOM */
  applyTheme: () => Promise<void>;
  /** Reset to default theme */
  resetTheme: () => void;
  /** Generate dynamic theme from seed */
  generateDynamicTheme: (seed: number) => void;
  /** Export current theme configuration */
  exportConfig: () => string;
  /** Import theme configuration */
  importConfig: (config: string) => boolean;
  
  // Enhanced transition control
  /** Toggle transitions */
  toggleTransitions: () => void;
  /** Update transition configuration */
  updateTransitionConfig: (config: Partial<ThemeTransitionConfig>) => void;
  /** Check if theme is currently transitioning */
  isTransitioning: () => boolean;
  /** Abort current transition */
  abortTransition: () => void;
  
  // Computed properties
  /** Whether dark mode is currently active */
  isDark: boolean;
  /** Whether high contrast is active */
  isHighContrast: boolean;
  /** Whether reduced motion is enabled */
  isReducedMotion: boolean;
  /** Whether transitions are enabled */
  hasTransitions: boolean;
}

// Provider props interface
interface ThemeProviderProps {
  children: ReactNode;
  defaultConfig?: Partial<ThemeConfig>;
  storageKey?: string;
  enableDebug?: boolean;
}

const defaultThemeConfig: ThemeConfig = {
  variant: 'minimal',
  colorMode: 'system',
  contextualTheme: 'default',
  respectSystemPreferences: true,
  enableTransitions: true,
  transitionConfig: {
    duration: 300,
    timing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    enableFLIP: true,
    respectReducedMotion: true,
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Comprehensive Theme Provider Component
 * 
 * Manages all aspects of theming including variants, color modes, contextual themes,
 * system preferences, persistent storage, and enhanced transitions.
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultConfig = {},
  storageKey = 'opssight-theme-config',
  enableDebug = false,
}) => {
  const [config, setConfig] = useState<ThemeConfig>({ ...defaultThemeConfig, ...defaultConfig });
  const [systemPreferences, setSystemPreferences] = useState<SystemPreferences>({
    colorScheme: 'light',
    reducedMotion: false,
    highContrast: false,
  });
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes.minimal);

  // Use the enhanced theme transition hook
  const { 
    isTransitioning, 
    abortTransition: abortThemeTransition, 
    updateConfig: updateThemeTransitionConfig 
  } = useThemeTransition();

  /**
   * Debug logging
   */
  const debugLog = useCallback((...args: any[]) => {
    if (enableDebug) {
      console.log('[ThemeProvider]', ...args);
    }
  }, [enableDebug]);

  /**
   * Get system color scheme preference
   */
  const getSystemColorScheme = useCallback((): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  /**
   * Get system reduced motion preference
   */
  const getSystemReducedMotion = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  /**
   * Get system high contrast preference
   */
  const getSystemHighContrast = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: high)').matches;
  }, []);

  /**
   * Resolve color mode to actual color mode (never 'system')
   */
  const resolveColorMode = useCallback((mode: ColorMode | 'system'): ColorMode => {
    if (mode === 'system') {
      if (config.respectSystemPreferences && systemPreferences.highContrast) {
        return 'high-contrast';
      }
      return systemPreferences.colorScheme;
    }
    return mode;
  }, [config.respectSystemPreferences, systemPreferences]);

  /**
   * Enhanced apply theme with transition coordination
   */
  const applyTheme = useCallback(async (): Promise<void> => {
    const resolvedColorMode = resolveColorMode(config.colorMode);
    let themeToApply: Theme;

    // Handle dynamic theme
    if (config.variant === 'dynamic' && config.dynamicSeed !== undefined) {
      themeToApply = generateDynamicTheme(config.dynamicSeed);
    } else {
      themeToApply = getThemeWithColorMode(config.variant as ThemeName, resolvedColorMode);
    }

    // Apply contextual theme modifications
    if (config.contextualTheme !== 'default') {
      themeToApply = applyContextualThemeModifications(themeToApply, config.contextualTheme);
    }

    setCurrentTheme(themeToApply);

    // Use enhanced theme transition if enabled
    if (config.enableTransitions) {
      try {
        await applyThemeWithTransition(
          (config.variant === 'dynamic' ? 'minimal' : config.variant) as ThemeName, // fallback for transition
          resolvedColorMode,
          {
            ...config.transitionConfig,
            onStart: () => debugLog('Theme transition started'),
            onComplete: () => debugLog('Theme transition completed'),
            onError: (error) => debugLog('Theme transition error:', error),
          }
        );
      } catch (error) {
        debugLog('Theme transition failed, falling back to instant application:', error);
        // Fallback to instant theme application
        applyThemeToDOM(themeToApply, resolvedColorMode);
      }
    } else {
      // Apply theme instantly
      applyThemeToDOM(themeToApply, resolvedColorMode);
    }

    // Add contextual theme class
    document.body.className = document.body.className
      .replace(/contextual-theme-\w+/g, '')
      .concat(` contextual-theme-${config.contextualTheme}`);

    debugLog('Theme applied:', {
      variant: config.variant,
      colorMode: config.colorMode,
      resolvedColorMode,
      contextualTheme: config.contextualTheme,
      theme: themeToApply.name,
      transitionsEnabled: config.enableTransitions,
    });
  }, [config, systemPreferences, resolveColorMode, debugLog]);

  /**
   * Apply contextual theme modifications
   */
  const applyContextualThemeModifications = useCallback((theme: Theme, contextual: ContextualTheme): Theme => {
    const modifications: Record<ContextualTheme, Partial<Theme>> = {
      default: {},
      focus: {
        colors: {
          ...theme.colors,
          primary: {
            ...theme.colors.primary,
            500: 'oklch(0.50 0.20 220)', // Enhanced focus color
          },
        },
        customProperties: {
          ...theme.customProperties,
          '--focus-ring-width': '3px',
          '--focus-ring-offset': '2px',
        },
      },
      relax: {
        colors: {
          ...theme.colors,
          primary: {
            ...theme.colors.primary,
            500: 'oklch(0.60 0.10 160)', // Calming green
          },
        },
        customProperties: {
          ...theme.customProperties,
          '--border-radius-base': '12px',
          '--shadow-soft': '0 4px 20px rgba(0, 0, 0, 0.1)',
        },
      },
      energize: {
        colors: {
          ...theme.colors,
          primary: {
            ...theme.colors.primary,
            500: 'oklch(0.65 0.25 40)', // Vibrant orange
          },
          accent: {
            ...theme.colors.accent || {},
            500: 'oklch(0.70 0.20 350)', // Energetic pink
          },
        },
        customProperties: {
          ...theme.customProperties,
          '--animation-speed': '0.15s',
          '--gradient-intensity': '1.2',
        },
      },
    };

    return { ...theme, ...modifications[contextual] };
  }, []);

  /**
   * Save configuration to localStorage
   */
  const saveConfig = useCallback((newConfig: ThemeConfig) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newConfig));
      debugLog('Configuration saved:', newConfig);
    } catch (error) {
      console.warn('Failed to save theme configuration:', error);
    }
  }, [storageKey, debugLog]);

  /**
   * Load configuration from localStorage
   */
  const loadConfig = useCallback((): ThemeConfig => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const loadedConfig = { ...defaultThemeConfig, ...parsed };
        debugLog('Configuration loaded:', loadedConfig);
        return loadedConfig;
      }
    } catch (error) {
      console.warn('Failed to load theme configuration:', error);
    }
    return { ...defaultThemeConfig, ...defaultConfig };
  }, [storageKey, defaultConfig, debugLog]);

  /**
   * Update configuration
   */
  const updateConfig = useCallback((updates: Partial<ThemeConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      saveConfig(newConfig);
      
      // Update theme transition manager config if transition config changed
      if (updates.transitionConfig) {
        updateThemeTransitionConfig(updates.transitionConfig);
      }
      
      return newConfig;
    });
  }, [saveConfig, updateThemeTransitionConfig]);

  // Theme variant methods
  const setThemeVariant = useCallback((variant: RuntimeThemeName) => {
    if (variant === 'dynamic') {
      // Use a default or last-used dynamicSeed, or prompt user to set it
      updateConfig({ variant, dynamicSeed: config.dynamicSeed ?? 180 });
    } else {
      updateConfig({ variant, dynamicSeed: undefined });
    }
  }, [updateConfig, config.dynamicSeed]);

  const getAvailableVariants = useCallback((): ThemeName[] => {
    return Object.keys(themes) as ThemeName[];
  }, []);

  // Color mode methods
  const setColorMode = useCallback((mode: ColorMode | 'system') => {
    updateConfig({ colorMode: mode });
  }, [updateConfig]);

  const toggleColorMode = useCallback(() => {
    const resolved = resolveColorMode(config.colorMode);
    const newMode: ColorMode = resolved === 'dark' ? 'light' : 'dark';
    setColorMode(newMode);
  }, [config.colorMode, resolveColorMode, setColorMode]);

  // Contextual theme methods
  const setContextualTheme = useCallback((contextualTheme: ContextualTheme) => {
    updateConfig({ contextualTheme });
  }, [updateConfig]);

  const resetContextualTheme = useCallback(() => {
    setContextualTheme('default');
  }, [setContextualTheme]);

  // System preferences methods
  const toggleSystemPreferences = useCallback(() => {
    updateConfig({ respectSystemPreferences: !config.respectSystemPreferences });
  }, [config.respectSystemPreferences, updateConfig]);

  const updateSystemPreference = useCallback((key: keyof SystemPreferences, value: boolean) => {
    setSystemPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  // Enhanced utility methods
  const resetTheme = useCallback(() => {
    const resetConfig = { ...defaultThemeConfig, ...defaultConfig };
    setConfig(resetConfig);
    saveConfig(resetConfig);
  }, [defaultConfig, saveConfig]);

  const generateDynamicThemeHandler = useCallback((seed: number) => {
    updateConfig({ dynamicSeed: seed, variant: 'minimal' }); // Use minimal as base for dynamic
  }, [updateConfig]);

  const exportConfig = useCallback((): string => {
    return JSON.stringify(config, null, 2);
  }, [config]);

  const importConfig = useCallback((configString: string): boolean => {
    try {
      const importedConfig = JSON.parse(configString);
      // Validate configuration
      if (typeof importedConfig === 'object' && importedConfig !== null) {
        const validConfig = { ...defaultThemeConfig, ...importedConfig };
        setConfig(validConfig);
        saveConfig(validConfig);
        return true;
      }
    } catch (error) {
      console.error('Failed to import configuration:', error);
    }
    return false;
  }, [saveConfig]);

  // Enhanced transition control methods
  const toggleTransitions = useCallback(() => {
    updateConfig({ enableTransitions: !config.enableTransitions });
  }, [config.enableTransitions, updateConfig]);

  const updateTransitionConfig = useCallback((transitionConfig: Partial<ThemeTransitionConfig>) => {
    updateConfig({ transitionConfig: { ...config.transitionConfig, ...transitionConfig } });
  }, [config.transitionConfig, updateConfig]);

  const abortTransition = useCallback(() => {
    abortThemeTransition();
  }, [abortThemeTransition]);

  // Computed properties
  const resolvedColorMode = resolveColorMode(config.colorMode);
  const isDark = resolvedColorMode === 'dark';
  const isHighContrast = resolvedColorMode === 'high-contrast';
  const isReducedMotion = systemPreferences.reducedMotion;
  const hasTransitions = config.enableTransitions && !isReducedMotion;

  // Initialize system preferences
  useEffect(() => {
    setSystemPreferences({
      colorScheme: getSystemColorScheme(),
      reducedMotion: getSystemReducedMotion(),
      highContrast: getSystemHighContrast(),
    });
  }, []); // Only run on mount

  // Load saved configuration on mount
  useEffect(() => {
    const loadedConfig = loadConfig();
    setConfig(loadedConfig);
    
    // Initialize theme transition manager with loaded config
    if (loadedConfig.transitionConfig) {
      updateThemeTransitionConfig(loadedConfig.transitionConfig);
    }
  }, []); // Only run on mount

  // Apply theme when configuration changes
  useEffect(() => {
    const applyCurrentTheme = async () => {
      const resolvedColorMode = resolveColorMode(config.colorMode);
      let themeToApply: Theme;

      // Handle dynamic theme
      if (config.variant === 'dynamic' && config.dynamicSeed !== undefined) {
        themeToApply = generateDynamicTheme(config.dynamicSeed);
      } else {
        themeToApply = getThemeWithColorMode(config.variant as ThemeName, resolvedColorMode);
      }

      // Apply contextual theme modifications
      if (config.contextualTheme !== 'default') {
        themeToApply = applyContextualThemeModifications(themeToApply, config.contextualTheme);
      }

      setCurrentTheme(themeToApply);

      // Use enhanced theme transition if enabled
      if (config.enableTransitions) {
        try {
          await applyThemeWithTransition(
            (config.variant === 'dynamic' ? 'minimal' : config.variant) as ThemeName, // fallback for transition
            resolvedColorMode,
            {
              ...config.transitionConfig,
              onStart: () => debugLog('Theme transition started'),
              onComplete: () => debugLog('Theme transition completed'),
              onError: (error) => debugLog('Theme transition error:', error),
            }
          );
        } catch (error) {
          debugLog('Theme transition failed, falling back to instant application:', error);
          // Fallback to instant theme application
          applyThemeToDOM(themeToApply, resolvedColorMode);
        }
      } else {
        // Apply theme instantly
        applyThemeToDOM(themeToApply, resolvedColorMode);
      }

      // Add contextual theme class
      document.body.className = document.body.className
        .replace(/contextual-theme-\w+/g, '')
        .concat(` contextual-theme-${config.contextualTheme}`);

      debugLog('Theme applied:', {
        variant: config.variant,
        colorMode: config.colorMode,
        resolvedColorMode,
        contextualTheme: config.contextualTheme,
        theme: themeToApply.name,
        transitionsEnabled: config.enableTransitions,
      });
    };

    applyCurrentTheme();
  }, [config.variant, config.colorMode, config.contextualTheme, config.enableTransitions, config.dynamicSeed, config.transitionConfig, systemPreferences.colorScheme, systemPreferences.highContrast]);

  // System preference listeners
  useEffect(() => {
    const handleColorSchemeChange = (e: MediaQueryListEvent) => {
      setSystemPreferences(prev => ({ ...prev, colorScheme: e.matches ? 'dark' : 'light' }));
    };

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setSystemPreferences(prev => ({ ...prev, reducedMotion: e.matches }));
    };

    const handleContrastChange = (e: MediaQueryListEvent) => {
      setSystemPreferences(prev => ({ ...prev, highContrast: e.matches }));
    };

    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');

    colorSchemeQuery.addEventListener('change', handleColorSchemeChange);
    motionQuery.addEventListener('change', handleMotionChange);
    contrastQuery.addEventListener('change', handleContrastChange);

    return () => {
      colorSchemeQuery.removeEventListener('change', handleColorSchemeChange);
      motionQuery.removeEventListener('change', handleMotionChange);
      contrastQuery.removeEventListener('change', handleContrastChange);
    };
  }, []);

  const contextValue: ThemeContextType = {
    config,
    resolvedColorMode,
    currentTheme,
    systemPreferences,
    
    setThemeVariant,
    getAvailableVariants,
    
    setColorMode,
    toggleColorMode,
    
    setContextualTheme,
    resetContextualTheme,
    
    toggleSystemPreferences,
    updateSystemPreference,
    
    applyTheme,
    resetTheme,
    generateDynamicTheme: generateDynamicThemeHandler,
    exportConfig,
    importConfig,
    
    toggleTransitions,
    updateTransitionConfig,
    isTransitioning,
    abortTransition,
    
    isDark,
    isHighContrast,
    isReducedMotion,
    hasTransitions,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook to access theme context
 * 
 * @returns Theme context value
 * @throws Error if used outside ThemeProvider
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

/**
 * Higher-order component to provide theme context
 */
export function withTheme<P extends object>(
  Component: React.ComponentType<P>,
  themeProviderProps?: Omit<ThemeProviderProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ThemeProvider {...themeProviderProps}>
      <Component {...props} />
    </ThemeProvider>
  );

  WrappedComponent.displayName = `withTheme(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook for theme presets and quick theme actions
 */
export const useThemePresets = () => {
  const { setThemeVariant, setColorMode, setContextualTheme, resetTheme } = useTheme();
  
  const presets = {
    workFocus: () => {
      setThemeVariant('minimal');
      setColorMode('light');
      setContextualTheme('focus');
    },
    darkMode: () => {
      setColorMode('dark');
    },
    relaxMode: () => {
      setThemeVariant('minimal');
      setContextualTheme('relax');
    },
    highContrast: () => {
      setColorMode('high-contrast');
      setThemeVariant('accessible');
    },
    energyBoost: () => {
      setThemeVariant('cyberpunk');
      setContextualTheme('energize');
    },
    reset: resetTheme,
  };
  
  return presets;
}; 