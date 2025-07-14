/**
 * Performance Optimizations for Theme Transitions
 * 
 * Advanced performance optimization utilities for smooth theme transitions
 * including GPU acceleration, batched DOM updates, intelligent caching,
 * and performance monitoring.
 * 
 * Features:
 * - GPU acceleration with transform3d and will-change
 * - Batched DOM updates with requestAnimationFrame
 * - Intelligent theme caching and preloading
 * - Performance monitoring and metrics
 * - Memory management and cleanup
 * - Frame rate optimization
 */

// Performance monitoring interface
export interface PerformanceMetrics {
  transitionDuration: number;
  frameRate: number;
  memoryUsage: number;
  domUpdates: number;
  cacheHits: number;
  cacheMisses: number;
  timestamp: number;
}

// Performance configuration
export interface PerformanceConfig {
  enableGPUAcceleration: boolean;
  batchDOMUpdates: boolean;
  enableCaching: boolean;
  maxCacheSize: number;
  targetFrameRate: number;
  enableMetrics: boolean;
  memoryThreshold: number; // MB
}

// Default performance configuration
const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  enableGPUAcceleration: true,
  batchDOMUpdates: true,
  enableCaching: true,
  maxCacheSize: 50, // Number of cached theme states
  targetFrameRate: 60,
  enableMetrics: false,
  memoryThreshold: 100, // MB
};

// Theme cache entry
interface ThemeCacheEntry {
  key: string;
  cssVariables: Record<string, string>;
  timestamp: number;
  accessCount: number;
}

// DOM update batch
interface DOMUpdateBatch {
  element: HTMLElement;
  properties: Record<string, string>;
  priority: 'high' | 'medium' | 'low';
}

// Performance optimization manager
class PerformanceOptimizer {
  private config: PerformanceConfig = DEFAULT_PERFORMANCE_CONFIG;
  private themeCache = new Map<string, ThemeCacheEntry>();
  private domUpdateQueue: DOMUpdateBatch[] = [];
  private isProcessingUpdates = false;
  private metrics: PerformanceMetrics[] = [];
  private frameRateMonitor: number | null = null;
  private lastFrameTime = 0;
  private frameCount = 0;
  private currentFrameRate = 0;

  /**
   * Update performance configuration
   */
  public updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enableMetrics && !this.frameRateMonitor) {
      this.startFrameRateMonitoring();
    } else if (!this.config.enableMetrics && this.frameRateMonitor) {
      this.stopFrameRateMonitoring();
    }
  }

  /**
   * Start frame rate monitoring
   */
  private startFrameRateMonitoring(): void {
    const measureFrameRate = (timestamp: number) => {
      if (this.lastFrameTime === 0) {
        this.lastFrameTime = timestamp;
      }

      const deltaTime = timestamp - this.lastFrameTime;
      this.frameCount++;

      if (deltaTime >= 1000) { // Update every second
        this.currentFrameRate = Math.round((this.frameCount * 1000) / deltaTime);
        this.frameCount = 0;
        this.lastFrameTime = timestamp;
      }

      if (this.config.enableMetrics) {
        this.frameRateMonitor = requestAnimationFrame(measureFrameRate);
      }
    };

    this.frameRateMonitor = requestAnimationFrame(measureFrameRate);
  }

  /**
   * Stop frame rate monitoring
   */
  private stopFrameRateMonitoring(): void {
    if (this.frameRateMonitor) {
      cancelAnimationFrame(this.frameRateMonitor);
      this.frameRateMonitor = null;
    }
  }

  /**
   * Generate cache key for theme state
   */
  private generateCacheKey(themeName: string, colorMode: string, contextualTheme: string): string {
    return `${themeName}-${colorMode}-${contextualTheme}`;
  }

  /**
   * Cache theme variables
   */
  public cacheThemeVariables(
    themeName: string, 
    colorMode: string, 
    contextualTheme: string, 
    variables: Record<string, string>
  ): void {
    if (!this.config.enableCaching) return;

    const key = this.generateCacheKey(themeName, colorMode, contextualTheme);
    
    // Clean cache if it exceeds max size
    if (this.themeCache.size >= this.config.maxCacheSize) {
      this.cleanCache();
    }

    this.themeCache.set(key, {
      key,
      cssVariables: { ...variables },
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  /**
   * Retrieve cached theme variables
   */
  public getCachedThemeVariables(
    themeName: string, 
    colorMode: string, 
    contextualTheme: string
  ): Record<string, string> | null {
    if (!this.config.enableCaching) return null;

    const key = this.generateCacheKey(themeName, colorMode, contextualTheme);
    const cached = this.themeCache.get(key);

    if (cached) {
      cached.accessCount++;
      cached.timestamp = Date.now();
      return { ...cached.cssVariables };
    }

    return null;
  }

  /**
   * Clean cache using LRU strategy
   */
  private cleanCache(): void {
    const entries = Array.from(this.themeCache.values());
    
    // Sort by access count and timestamp (LRU)
    entries.sort((a, b) => {
      if (a.accessCount !== b.accessCount) {
        return a.accessCount - b.accessCount;
      }
      return a.timestamp - b.timestamp;
    });

    // Remove oldest 25% of entries
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.themeCache.delete(entries[i].key);
    }
  }

  /**
   * Apply GPU acceleration to element
   */
  public applyGPUAcceleration(element: HTMLElement): void {
    if (!element || !element.style || !this.config.enableGPUAcceleration) return;

    // Force GPU layer creation
    element.style.transform = element.style.transform || 'translate3d(0, 0, 0)';
    element.style.backfaceVisibility = 'hidden';
    element.style.perspective = '1000px';
    
    // Optimize for animations
    element.style.willChange = 'transform, opacity, background-color, color, border-color, box-shadow';
  }

  /**
   * Remove GPU acceleration from element
   */
  public removeGPUAcceleration(element: HTMLElement): void {
    if (!element || !element.style) return;
    
    element.style.transform = '';
    element.style.backfaceVisibility = '';
    element.style.perspective = '';
    element.style.willChange = '';
  }

  /**
   * Queue DOM update for batching
   */
  public queueDOMUpdate(
    element: HTMLElement, 
    properties: Record<string, string>, 
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): void {
    if (!element || !element.style) return;
    
    if (!this.config.batchDOMUpdates) {
      // Apply immediately if batching is disabled
      Object.entries(properties).forEach(([prop, value]) => {
        element.style.setProperty(prop, value);
      });
      return;
    }

    this.domUpdateQueue.push({ element, properties, priority });
    
    if (!this.isProcessingUpdates) {
      this.processDOMUpdates();
    }
  }

  /**
   * Process batched DOM updates
   */
  private processDOMUpdates(): void {
    if (this.domUpdateQueue.length === 0) {
      this.isProcessingUpdates = false;
      return;
    }

    this.isProcessingUpdates = true;

    requestAnimationFrame(() => {
      // Sort by priority
      this.domUpdateQueue.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      // Process updates in batches to avoid blocking
      const batchSize = Math.min(10, this.domUpdateQueue.length);
      const batch = this.domUpdateQueue.splice(0, batchSize);

      batch.forEach(({ element, properties }) => {
        Object.entries(properties).forEach(([prop, value]) => {
          element.style.setProperty(prop, value);
        });
      });

      // Continue processing if there are more updates
      if (this.domUpdateQueue.length > 0) {
        this.processDOMUpdates();
      } else {
        this.isProcessingUpdates = false;
      }
    });
  }

  /**
   * Preload theme resources
   */
  public preloadThemeResources(themes: string[]): Promise<void> {
    return new Promise((resolve) => {
      // Simulate theme resource preloading
      // In a real implementation, this might preload CSS files, images, etc.
      const preloadPromises = themes.map(theme => {
        return new Promise<void>((themeResolve) => {
          // Simulate async resource loading
          setTimeout(() => {
            console.log(`Preloaded theme: ${theme}`);
            themeResolve();
          }, 10);
        });
      });

      Promise.all(preloadPromises).then(() => resolve());
    });
  }

  /**
   * Optimize element for transitions
   */
  public optimizeElementForTransition(element: HTMLElement): void {
    if (!element || !element.style) return;
    
    // Apply GPU acceleration
    this.applyGPUAcceleration(element);
    
    // Set up optimal CSS properties for transitions
    element.style.contain = 'layout style paint';
    element.style.isolation = 'isolate';
    
    // Optimize for specific transition properties
    const transitionProperties = [
      'background-color',
      'color',
      'border-color',
      'box-shadow',
      'opacity',
      'transform'
    ];
    
    element.style.transition = transitionProperties
      .map(prop => `${prop} var(--theme-transition-duration, 300ms) var(--theme-transition-timing, ease)`)
      .join(', ');
  }

  /**
   * Clean up element optimizations
   */
  public cleanupElementOptimizations(element: HTMLElement): void {
    if (!element || !element.style) return;
    
    this.removeGPUAcceleration(element);
    element.style.contain = '';
    element.style.isolation = '';
    element.style.transition = '';
  }

  /**
   * Monitor memory usage
   */
  public getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB
    }
    return 0;
  }

  /**
   * Check if memory usage is within threshold
   */
  public isMemoryUsageHealthy(): boolean {
    const usage = this.getMemoryUsage();
    return usage < this.config.memoryThreshold;
  }

  /**
   * Force garbage collection if available
   */
  public forceGarbageCollection(): void {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }

  /**
   * Record performance metrics
   */
  public recordMetrics(transitionDuration: number, domUpdates: number): void {
    if (!this.config.enableMetrics) return;

    const metrics: PerformanceMetrics = {
      transitionDuration,
      frameRate: this.currentFrameRate,
      memoryUsage: this.getMemoryUsage(),
      domUpdates,
      cacheHits: this.getCacheHitRate().hits,
      cacheMisses: this.getCacheHitRate().misses,
      timestamp: Date.now(),
    };

    this.metrics.push(metrics);

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  /**
   * Get cache hit rate
   */
  private getCacheHitRate(): { hits: number; misses: number } {
    const entries = Array.from(this.themeCache.values());
    const hits = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    const misses = Math.max(0, hits - entries.length);
    return { hits, misses };
  }

  /**
   * Get performance report
   */
  public getPerformanceReport(): {
    averageTransitionDuration: number;
    averageFrameRate: number;
    averageMemoryUsage: number;
    cacheEfficiency: number;
    totalTransitions: number;
  } {
    if (this.metrics.length === 0) {
      return {
        averageTransitionDuration: 0,
        averageFrameRate: 0,
        averageMemoryUsage: 0,
        cacheEfficiency: 0,
        totalTransitions: 0,
      };
    }

    const avgTransitionDuration = this.metrics.reduce((sum, m) => sum + m.transitionDuration, 0) / this.metrics.length;
    const avgFrameRate = this.metrics.reduce((sum, m) => sum + m.frameRate, 0) / this.metrics.length;
    const avgMemoryUsage = this.metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / this.metrics.length;
    
    const totalHits = this.metrics.reduce((sum, m) => sum + m.cacheHits, 0);
    const totalMisses = this.metrics.reduce((sum, m) => sum + m.cacheMisses, 0);
    const cacheEfficiency = totalHits + totalMisses > 0 ? (totalHits / (totalHits + totalMisses)) * 100 : 0;

    return {
      averageTransitionDuration: Math.round(avgTransitionDuration),
      averageFrameRate: Math.round(avgFrameRate),
      averageMemoryUsage: Math.round(avgMemoryUsage),
      cacheEfficiency: Math.round(cacheEfficiency),
      totalTransitions: this.metrics.length,
    };
  }

  /**
   * Clear all caches and reset metrics
   */
  public clearCaches(): void {
    this.themeCache.clear();
    this.metrics = [];
    this.domUpdateQueue = [];
  }

  /**
   * Cleanup and destroy
   */
  public destroy(): void {
    this.stopFrameRateMonitoring();
    this.clearCaches();
    this.isProcessingUpdates = false;
  }
}

// Global performance optimizer instance
export const performanceOptimizer = new PerformanceOptimizer();

/**
 * React hook for performance optimization
 */
export function usePerformanceOptimization() {
  const updateConfig = (config: Partial<PerformanceConfig>) => {
    performanceOptimizer.updateConfig(config);
  };

  const optimizeElement = (element: HTMLElement) => {
    performanceOptimizer.optimizeElementForTransition(element);
  };

  const cleanupElement = (element: HTMLElement) => {
    performanceOptimizer.cleanupElementOptimizations(element);
  };

  const queueUpdate = (
    element: HTMLElement, 
    properties: Record<string, string>, 
    priority?: 'high' | 'medium' | 'low'
  ) => {
    performanceOptimizer.queueDOMUpdate(element, properties, priority);
  };

  const getReport = () => performanceOptimizer.getPerformanceReport();

  const isHealthy = () => performanceOptimizer.isMemoryUsageHealthy();

  return {
    updateConfig,
    optimizeElement,
    cleanupElement,
    queueUpdate,
    getReport,
    isHealthy,
  };
}

/**
 * Performance monitoring decorator for theme transitions
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name: string
): T {
  return (async (...args: any[]) => {
    const startTime = performance.now();
    let domUpdates = 0;

    // Monitor DOM mutations during execution
    const observer = new MutationObserver((mutations) => {
      domUpdates += mutations.length;
    });

    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['style', 'class'],
    });

    try {
      const result = await fn(...args);
      const endTime = performance.now();
      const duration = endTime - startTime;

      observer.disconnect();
      performanceOptimizer.recordMetrics(duration, domUpdates);

      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms, ${domUpdates} DOM updates`);
      
      return result;
    } catch (error) {
      observer.disconnect();
      throw error;
    }
  }) as T;
}

/**
 * Utility to create performance-optimized theme transition
 */
export function createOptimizedTransition(
  element: HTMLElement,
  fromState: Record<string, string>,
  toState: Record<string, string>,
  duration: number = 300
): Promise<void> {
  return new Promise((resolve) => {
    // Optimize element for transition
    performanceOptimizer.optimizeElementForTransition(element);

    // Apply initial state
    Object.entries(fromState).forEach(([prop, value]) => {
      // Convert camelCase to kebab-case for CSS properties
      const cssProperty = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
      element.style.setProperty(cssProperty, value);
    });

    // Force reflow
    element.offsetHeight;

    // Apply final state
    Object.entries(toState).forEach(([prop, value]) => {
      performanceOptimizer.queueDOMUpdate(element, { [prop]: value }, 'high');
    });

    // Cleanup after transition
    setTimeout(() => {
      performanceOptimizer.cleanupElementOptimizations(element);
      resolve();
    }, duration + 50); // Small buffer for completion
  });
}

/**
 * Additional React performance optimization utilities
 */

import React, { useMemo, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for memoizing expensive calculations
 */
export const useExpensiveMemo = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  return useMemo(factory, deps);
};

/**
 * Custom hook for memoizing callback functions with dependency tracking
 */
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return useCallback(callback, deps);
};

/**
 * Custom hook for debounced values
 */
export const useDebouncedValue = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * HOC for memoizing components with custom comparison
 */
export const withMemo = <P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  return React.memo(Component, areEqual);
};

/**
 * Custom comparison function for shallow object comparison
 */
export const shallowEqual = <T extends Record<string, any>>(
  prevProps: T,
  nextProps: T
): boolean => {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }

  return true;
};

/**
 * Custom hook for intersection observer (useful for lazy loading)
 */
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLElement>, boolean] => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      options
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options]);

  return [ref, isIntersecting];
};

/**
 * Custom hook for preventing unnecessary re-renders when object references change
 */
export const useStableObject = <T extends Record<string, any>>(obj: T): T => {
  return useMemo(() => obj, [JSON.stringify(obj)]);
};

/**
 * Custom hook for preventing unnecessary re-renders when array references change
 */
export const useStableArray = <T>(arr: T[]): T[] => {
  return useMemo(() => arr, [JSON.stringify(arr)]);
};

/**
 * Performance monitoring hook for component render times
 */
export const useRenderPerformance = (
  componentName: string,
  enabled: boolean = process.env.NODE_ENV === 'development'
) => {
  const renderStartTime = useRef<number>();

  useEffect(() => {
    if (!enabled) return;
    renderStartTime.current = performance.now();
  });

  useEffect(() => {
    if (!enabled || !renderStartTime.current) return;

    const renderTime = performance.now() - renderStartTime.current;
    
    if (renderTime > 16) { // Log if render takes longer than 16ms (60fps threshold)
      console.warn(
        `🐌 Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`
      );
    }
  });
};

/**
 * Hook for implementing virtual scrolling
 */
export const useVirtualization = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = React.useState(0);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
      offsetY: (startIndex + index) * itemHeight,
    }));
  }, [items, startIndex, endIndex, itemHeight]);

  const totalHeight = items.length * itemHeight;

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    onScroll,
    containerStyle: {
      height: containerHeight,
      overflow: 'auto' as const,
    },
  };
};

export default performanceOptimizer; 