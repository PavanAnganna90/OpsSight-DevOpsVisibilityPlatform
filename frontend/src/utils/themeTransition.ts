/**
 * Theme Transition Coordination System
 * 
 * Provides advanced theme switching coordination with smooth transitions,
 * FLIP animations, performance optimizations, and accessibility support.
 * 
 * Features:
 * - Coordinated theme property transitions
 * - FLIP (First, Last, Invert, Play) animations for layout changes
 * - Performance optimizations with will-change and transform
 * - Reduced motion support
 * - Layout shift prevention
 * - Component-level transition coordination
 * - GPU acceleration and intelligent caching
 * - Batched DOM updates for optimal performance
 * - Comprehensive accessibility enhancements
 * - Screen reader announcements and focus management
 */

import { Theme, ColorMode, applyTheme, getThemeWithColorMode, ThemeName, generateThemeVariables } from '../styles/themes';
import { performanceOptimizer, withPerformanceMonitoring, PerformanceConfig } from './performanceOptimizations';
import { accessibilityManager, withAccessibilityEnhancements, AccessibilityConfig } from './accessibilityEnhancements';

// Transition configuration interface
export interface ThemeTransitionConfig {
  duration: number;
  timing: string;
  properties: string[];
  enableFLIP: boolean;
  respectReducedMotion: boolean;
  enablePerformanceOptimizations: boolean;
  enableAccessibilityEnhancements: boolean;
  performanceConfig?: Partial<PerformanceConfig>;
  accessibilityConfig?: Partial<AccessibilityConfig>;
  onStart?: () => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

// Default transition configuration
const DEFAULT_TRANSITION_CONFIG: ThemeTransitionConfig = {
  duration: 300,
  timing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  properties: [
    'background-color',
    'color',
    'border-color',
    'box-shadow',
    'fill',
    'stroke',
    'opacity'
  ],
  enableFLIP: true,
  respectReducedMotion: true,
  enablePerformanceOptimizations: true,
  enableAccessibilityEnhancements: true,
  performanceConfig: {
    enableGPUAcceleration: true,
    batchDOMUpdates: true,
    enableCaching: true,
    enableMetrics: false,
  },
  accessibilityConfig: {
    respectReducedMotion: true,
    announceThemeChanges: true,
    manageFocusDuringTransitions: true,
    enableKeyboardShortcuts: true,
  },
};

// FLIP state interface for layout transitions
interface FLIPState {
  element: Element;
  first: DOMRect;
  last?: DOMRect;
  invert?: {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
  };
}

// Component snapshot for transition coordination
interface ComponentSnapshot {
  element: Element;
  computedStyle: CSSStyleDeclaration;
  rect: DOMRect;
  children: ComponentSnapshot[];
}

// Theme transition state management
class ThemeTransitionManager {
  private isTransitioning = false;
  private currentConfig: ThemeTransitionConfig = DEFAULT_TRANSITION_CONFIG;
  private flipStates = new Map<Element, FLIPState>();
  private componentSnapshots = new Map<Element, ComponentSnapshot>();
  private transitionPromise: Promise<void> | null = null;
  private abortController: AbortController | null = null;

  constructor() {
    // Initialize performance optimizer with default config
    if (this.currentConfig.performanceConfig) {
      performanceOptimizer.updateConfig(this.currentConfig.performanceConfig);
    }

    // Initialize accessibility manager with default config
    if (this.currentConfig.accessibilityConfig) {
      accessibilityManager.updateConfig(this.currentConfig.accessibilityConfig);
    }
  }

  /**
   * Check if user prefers reduced motion (with accessibility integration)
   */
  private prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Use accessibility manager for consistent reduced motion detection
    return accessibilityManager.prefersReducedMotion();
  }

  /**
   * Get effective transition configuration
   */
  private getEffectiveConfig(config?: Partial<ThemeTransitionConfig>): ThemeTransitionConfig {
    const mergedConfig = { ...this.currentConfig, ...config };
    
    // Respect reduced motion preference using accessibility manager
    if (mergedConfig.respectReducedMotion && this.prefersReducedMotion()) {
      return {
        ...mergedConfig,
        duration: 0,
        enableFLIP: false,
        enablePerformanceOptimizations: false,
      };
    }
    
    return mergedConfig;
  }

  /**
   * Capture FLIP first state for layout elements
   */
  private captureFirstState(selector: string = '[data-theme-transition]'): void {
    const elements = document.querySelectorAll(selector);
    
    elements.forEach(element => {
      const rect = element.getBoundingClientRect();
      this.flipStates.set(element, {
        element,
        first: rect,
      });
    });
  }

  /**
   * Calculate and apply FLIP invert transforms
   */
  private applyFlipInvert(): void {
    this.flipStates.forEach((state, element) => {
      const last = element.getBoundingClientRect();
      state.last = last;
      
      const deltaX = state.first.left - last.left;
      const deltaY = state.first.top - last.top;
      const deltaW = state.first.width / last.width;
      const deltaH = state.first.height / last.height;
      
      state.invert = {
        x: deltaX,
        y: deltaY,
        scaleX: deltaW,
        scaleY: deltaH,
      };
      
      // Apply invert transform immediately using performance optimizer
      if (deltaX !== 0 || deltaY !== 0 || deltaW !== 1 || deltaH !== 1) {
        const elementEl = element as HTMLElement;
        const transform = `translate(${deltaX}px, ${deltaY}px) scale(${deltaW}, ${deltaH})`;
        
        performanceOptimizer.queueDOMUpdate(elementEl, {
          'transform': transform,
          'transform-origin': 'top left'
        }, 'high');
      }
    });
  }

  /**
   * Play FLIP animations
   */
  private playFlipAnimations(config: ThemeTransitionConfig): Promise<void> {
    if (this.flipStates.size === 0) {
      return Promise.resolve();
    }

    const animations: Animation[] = [];

    this.flipStates.forEach((state) => {
      if (!state.invert) return;
      
      const { x, y, scaleX, scaleY } = state.invert;
      
      if (x !== 0 || y !== 0 || scaleX !== 1 || scaleY !== 1) {
        const animation = (state.element as HTMLElement).animate([
          {
            transform: `translate(${x}px, ${y}px) scale(${scaleX}, ${scaleY})`,
            transformOrigin: 'top left',
          },
          {
            transform: 'translate(0, 0) scale(1, 1)',
            transformOrigin: 'top left',
          }
        ], {
          duration: config.duration,
          easing: config.timing,
          fill: 'both',
        });
        
        animations.push(animation);
      }
    });

    return Promise.all(animations.map(anim => anim.finished)).then(() => {
      // Clean up transforms using performance optimizer
      this.flipStates.forEach((state) => {
        const elementEl = state.element as HTMLElement;
        performanceOptimizer.queueDOMUpdate(elementEl, {
          'transform': '',
          'transform-origin': ''
        }, 'low');
      });
      this.flipStates.clear();
    });
  }

  /**
   * Capture component snapshots for advanced transition coordination
   */
  private captureComponentSnapshots(selector: string = '[data-theme-component]'): void {
    const elements = document.querySelectorAll(selector);
    
    elements.forEach(element => {
      const computedStyle = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      
      const snapshot: ComponentSnapshot = {
        element,
        computedStyle: computedStyle,
        rect,
        children: []
      };
      
      // Capture child components recursively
      const childComponents = element.querySelectorAll('[data-theme-component]');
      childComponents.forEach(child => {
        if (child.parentElement === element) {
          snapshot.children.push({
            element: child,
            computedStyle: window.getComputedStyle(child),
            rect: child.getBoundingClientRect(),
            children: []
          });
        }
      });
      
      this.componentSnapshots.set(element, snapshot);
    });
  }

  /**
   * Apply performance optimizations before transition
   */
  private applyPerformanceOptimizations(config: ThemeTransitionConfig): void {
    if (!config.enablePerformanceOptimizations) return;

    // Update performance optimizer config
    if (config.performanceConfig) {
      performanceOptimizer.updateConfig(config.performanceConfig);
    }

    const root = document.documentElement;
    
    // Set up global transition properties using performance optimizer
    performanceOptimizer.queueDOMUpdate(root, {
      '--theme-transition-duration': `${config.duration}ms`,
      '--theme-transition-timing': config.timing
    }, 'high');
    
    // Apply GPU acceleration and optimizations to transition elements
    const transitionElements = document.querySelectorAll('[data-theme-transition], [data-theme-component]');
    transitionElements.forEach(element => {
      const htmlElement = element as HTMLElement;
      performanceOptimizer.optimizeElementForTransition(htmlElement);
    });
    
    // Add transition classes
    document.body.classList.add('theme-transitioning');
  }

  /**
   * Apply accessibility enhancements before transition
   */
  private applyAccessibilityEnhancements(
    config: ThemeTransitionConfig, 
    themeName: string, 
    colorMode: string
  ): {
    shouldReduceMotion: boolean;
    announcement: string;
    focusManagement: {
      capture: () => void;
      restore: () => void;
    };
    contrastMonitoring: {
      startMonitoring: () => void;
      stopMonitoring: () => void;
      getViolations: () => string[];
    };
  } {
    if (!config.enableAccessibilityEnhancements) {
      return {
        shouldReduceMotion: false,
        announcement: '',
        focusManagement: {
          capture: () => {},
          restore: () => {},
        },
        contrastMonitoring: {
          startMonitoring: () => {},
          stopMonitoring: () => {},
          getViolations: () => [],
        },
      };
    }

    // Update accessibility manager config
    if (config.accessibilityConfig) {
      accessibilityManager.updateConfig(config.accessibilityConfig);
    }

    // Enhance theme-related elements with accessibility attributes
    accessibilityManager.enhanceThemeElements();

    // Get accessibility enhancements for this transition
    return accessibilityManager.enhanceThemeTransition(themeName, colorMode);
  }

  /**
   * Clean up performance optimizations after transition
   */
  private cleanupPerformanceOptimizations(): void {
    // Remove optimizations from transition elements
    const transitionElements = document.querySelectorAll('[data-theme-transition], [data-theme-component]');
    transitionElements.forEach(element => {
      const htmlElement = element as HTMLElement;
      performanceOptimizer.cleanupElementOptimizations(htmlElement);
    });
    
    // Remove transition classes
    document.body.classList.remove('theme-transitioning');
    
    // Clear snapshots
    this.componentSnapshots.clear();
  }

  /**
   * Apply theme with caching support
   */
  private applyThemeWithCaching(
    theme: Theme, 
    colorMode: ColorMode, 
    themeName: ThemeName, 
    contextualTheme: string = 'default'
  ): void {
    // Try to get cached theme variables
    const cachedVariables = performanceOptimizer.getCachedThemeVariables(
      themeName, 
      colorMode, 
      contextualTheme
    );

    if (cachedVariables) {
      // Apply cached variables using batched updates
      const root = document.documentElement;
      Object.entries(cachedVariables).forEach(([property, value]) => {
        performanceOptimizer.queueDOMUpdate(root, { [property]: value }, 'high');
      });
    } else {
      // Generate and cache new variables
      const variables = generateThemeVariables(theme);
      performanceOptimizer.cacheThemeVariables(themeName, colorMode, contextualTheme, variables);
      
      // Apply new variables
      const root = document.documentElement;
      Object.entries(variables).forEach(([property, value]) => {
        performanceOptimizer.queueDOMUpdate(root, { [property]: value }, 'high');
      });
    }

    // Apply theme classes
    document.body.className = document.body.className
      .replace(/theme-\w+/g, '')
      .concat(` theme-${theme.name}`);
      
    if (colorMode) {
      document.body.className = document.body.className
        .replace(/color-mode-\w+/g, '')
        .concat(` color-mode-${colorMode}`);
    }
  }

  /**
   * Coordinate smooth theme transition with performance optimizations and accessibility
   */
  public async coordinateThemeTransition(
    theme: Theme,
    colorMode: ColorMode,
    config?: Partial<ThemeTransitionConfig>
  ): Promise<void> {
    if (this.isTransitioning) {
      // Abort current transition if running
      this.abortController?.abort();
    }

    this.isTransitioning = true;
    this.abortController = new AbortController();
    const effectiveConfig = this.getEffectiveConfig(config);

    // Get accessibility enhancements
    const accessibilityEnhancements = this.applyAccessibilityEnhancements(
      effectiveConfig, 
      theme.name, 
      colorMode
    );

    // Override motion settings if accessibility requires it
    if (accessibilityEnhancements.shouldReduceMotion) {
      effectiveConfig.duration = 0;
      effectiveConfig.enableFLIP = false;
    }

    // Wrap the entire transition with both performance monitoring and accessibility enhancements
    const enhancedTransition = withAccessibilityEnhancements(
      withPerformanceMonitoring(
        async () => {
          try {
            effectiveConfig.onStart?.();

            // Phase 1: Capture focus state (accessibility)
            accessibilityEnhancements.focusManagement.capture();

            // Phase 2: Start contrast monitoring (accessibility)
            accessibilityEnhancements.contrastMonitoring.startMonitoring();

            // Phase 3: Capture current state (FLIP First)
            if (effectiveConfig.enableFLIP) {
              this.captureFirstState();
            }
            this.captureComponentSnapshots();

            // Phase 4: Apply performance optimizations
            this.applyPerformanceOptimizations(effectiveConfig);

            // Phase 5: Apply theme changes with caching (FLIP Last)
            this.applyThemeWithCaching(theme, colorMode, theme.name as ThemeName);

            // Phase 6: Calculate inversions and apply immediately (FLIP Invert)
            if (effectiveConfig.enableFLIP) {
              // Small delay to ensure DOM updates are processed
              await new Promise(resolve => requestAnimationFrame(resolve));
              this.applyFlipInvert();
            }

            // Phase 7: Animate to final state (FLIP Play)
            if (this.abortController?.signal.aborted) {
              throw new Error('Transition aborted');
            }

            // Start FLIP animations if enabled
            const flipPromise = effectiveConfig.enableFLIP 
              ? this.playFlipAnimations(effectiveConfig)
              : Promise.resolve();

            // Wait for transitions to complete
            await flipPromise;

            if (this.abortController?.signal.aborted) {
              throw new Error('Transition aborted');
            }

            // Phase 8: Stop contrast monitoring and check violations (accessibility)
            accessibilityEnhancements.contrastMonitoring.stopMonitoring();
            const violations = accessibilityEnhancements.contrastMonitoring.getViolations();
            
            // Log violations for debugging
            if (violations.length > 0) {
              console.warn('Theme transition accessibility violations:', violations);
            }

            // Phase 9: Restore focus state (accessibility)
            setTimeout(() => {
              accessibilityEnhancements.focusManagement.restore();
            }, 100);

            effectiveConfig.onComplete?.();

          } catch (error) {
            const transitionError = error instanceof Error ? error : new Error('Theme transition failed');
            effectiveConfig.onError?.(transitionError);
            
            // Ensure focus is restored even on error
            accessibilityEnhancements.focusManagement.restore();
            
            throw transitionError;
          }
        },
        `Theme Transition (${theme.name}-${colorMode})`
      ),
      theme.name,
      colorMode
    );

    try {
      this.transitionPromise = enhancedTransition();
      await this.transitionPromise;
    } catch (error) {
      console.warn('Theme transition error:', error);
    } finally {
      // Cleanup
      this.cleanupPerformanceOptimizations();
      this.isTransitioning = false;
      this.transitionPromise = null;
      this.abortController = null;
    }
  }

  /**
   * Quick theme switch without animations (for immediate mode)
   */
  public instantThemeSwitch(theme: Theme, colorMode: ColorMode): void {
    this.abortController?.abort();
    this.isTransitioning = false;
    this.cleanupPerformanceOptimizations();
    
    // Still announce the change for accessibility
    if (this.currentConfig.enableAccessibilityEnhancements) {
      accessibilityManager.announceToScreenReader(
        `Theme instantly changed to ${theme.name} in ${colorMode} mode`,
        'polite'
      );
    }
    
    applyTheme(theme, colorMode);
  }

  /**
   * Update transition configuration
   */
  public updateConfig(config: Partial<ThemeTransitionConfig>): void {
    this.currentConfig = { ...this.currentConfig, ...config };
    
    // Update performance optimizer if config changed
    if (config.performanceConfig) {
      performanceOptimizer.updateConfig(config.performanceConfig);
    }

    // Update accessibility manager if config changed
    if (config.accessibilityConfig) {
      accessibilityManager.updateConfig(config.accessibilityConfig);
    }
  }

  /**
   * Check if currently transitioning
   */
  public isTransitionActive(): boolean {
    return this.isTransitioning;
  }

  /**
   * Abort current transition
   */
  public abortTransition(): void {
    this.abortController?.abort();
  }

  /**
   * Get performance report
   */
  public getPerformanceReport() {
    return performanceOptimizer.getPerformanceReport();
  }

  /**
   * Get accessibility report
   */
  public getAccessibilityReport() {
    return accessibilityManager.getAccessibilityReport();
  }

  /**
   * Check if performance is healthy
   */
  public isPerformanceHealthy(): boolean {
    return performanceOptimizer.isMemoryUsageHealthy();
  }

  /**
   * Clear caches and reset metrics
   */
  public clearCaches(): void {
    performanceOptimizer.clearCaches();
  }
}

// Global theme transition manager instance
export const themeTransitionManager = new ThemeTransitionManager();

/**
 * Enhanced theme application function with transition coordination
 */
export async function applyThemeWithTransition(
  themeName: ThemeName,
  colorMode: ColorMode,
  config?: Partial<ThemeTransitionConfig>
): Promise<void> {
  const theme = getThemeWithColorMode(themeName, colorMode);
  return themeTransitionManager.coordinateThemeTransition(theme, colorMode, config);
}

/**
 * Utility function to mark elements for theme transitions
 */
export function markForThemeTransition(element: HTMLElement, type: 'transition' | 'component' = 'transition'): void {
  if (type === 'transition') {
    element.setAttribute('data-theme-transition', '');
  } else {
    element.setAttribute('data-theme-component', '');
  }
}

/**
 * Utility function to unmark elements from theme transitions
 */
export function unmarkFromThemeTransition(element: HTMLElement): void {
  element.removeAttribute('data-theme-transition');
  element.removeAttribute('data-theme-component');
}

/**
 * React hook for theme transition management with performance optimization and accessibility
 */
export function useThemeTransition() {
  const applyTheme = async (
    themeName: ThemeName,
    colorMode: ColorMode,
    config?: Partial<ThemeTransitionConfig>
  ) => {
    return applyThemeWithTransition(themeName, colorMode, config);
  };

  const isTransitioning = () => themeTransitionManager.isTransitionActive();
  
  const abortTransition = () => themeTransitionManager.abortTransition();
  
  const updateConfig = (config: Partial<ThemeTransitionConfig>) => {
    themeTransitionManager.updateConfig(config);
  };

  const getPerformanceReport = () => themeTransitionManager.getPerformanceReport();
  
  const getAccessibilityReport = () => themeTransitionManager.getAccessibilityReport();
  
  const isPerformanceHealthy = () => themeTransitionManager.isPerformanceHealthy();
  
  const clearCaches = () => themeTransitionManager.clearCaches();

  return {
    applyTheme,
    isTransitioning,
    abortTransition,
    updateConfig,
    getPerformanceReport,
    getAccessibilityReport,
    isPerformanceHealthy,
    clearCaches,
    markElement: markForThemeTransition,
    unmarkElement: unmarkFromThemeTransition,
  };
}

/**
 * Preload theme resources for smoother transitions
 */
export function preloadThemeResources(themeName: ThemeName): void {
  // This could be expanded to preload theme-specific assets
  // For now, we ensure the theme is available in memory
  const theme = getThemeWithColorMode(themeName, 'light');
  const darkTheme = getThemeWithColorMode(themeName, 'dark');
  const hcTheme = getThemeWithColorMode(themeName, 'high-contrast');
  
  // Cache the theme variables for faster access
  const lightVariables = generateThemeVariables(theme);
  const darkVariables = generateThemeVariables(darkTheme);
  const hcVariables = generateThemeVariables(hcTheme);
  
  performanceOptimizer.cacheThemeVariables(themeName, 'light', 'default', lightVariables);
  performanceOptimizer.cacheThemeVariables(themeName, 'dark', 'default', darkVariables);
  performanceOptimizer.cacheThemeVariables(themeName, 'high-contrast', 'default', hcVariables);
}

export default themeTransitionManager; 