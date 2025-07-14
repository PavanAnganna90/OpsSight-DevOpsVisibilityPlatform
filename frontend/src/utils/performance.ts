/**
 * Performance Utilities for React 19 and Next.js 15
 * Comprehensive performance optimization utilities
 */

import React, { useCallback, useMemo, useRef, useEffect, startTransition, useState, Suspense, lazy, DependencyList } from 'react';

// React 19 Performance Features (commented out until React 19 is stable)
// export { startTransition, useOptimistic, useFormStatus, use } from 'react';

/**
 * Enhanced useMemo with performance profiling
 */
export function useProfiledMemo<T>(
  factory: () => T,
  deps: React.DependencyList | undefined,
  debugLabel?: string
): T {
  return useMemo(() => {
    if (process.env.NODE_ENV === 'development' && debugLabel) {
      const start = performance.now();
      const result = factory();
      const end = performance.now();
      
      if (end - start > 1) {
        console.warn(`[Performance] ${debugLabel} took ${(end - start).toFixed(2)}ms`);
      }
      
      return result;
    }
    
    return factory();
  }, deps);
}

/**
 * Enhanced useCallback with performance profiling
 */
export function useProfiledCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  debugLabel?: string
): T {
  return useCallback((...args: Parameters<T>) => {
    if (process.env.NODE_ENV === 'development' && debugLabel) {
      const start = performance.now();
      const result = callback(...args);
      const end = performance.now();
      
      if (end - start > 1) {
        console.warn(`[Performance] ${debugLabel} execution took ${(end - start).toFixed(2)}ms`);
      }
      
      return result;
    }
    
    return callback(...args);
  }, deps) as T;
}

/**
 * Debounced value hook for performance optimization
 */
export function useDebounced<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Alias for useDebounced to match requested API
 */
export const useDebounce = useDebounced;

/**
 * Throttled callback hook
 */
export function useThrottled<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef<number>(0);
  
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      return callback(...args);
    }
  }, [callback, delay]) as T;
}

/**
 * Alias for useThrottled to match requested API
 */
export const useThrottle = useThrottled;

/**
 * Intersection observer configuration
 */
interface IntersectionObserverConfig {
  threshold?: number | number[];
  rootMargin?: string;
  root?: Element | null;
}

/**
 * Enhanced Intersection Observer hook
 * @param config - Intersection observer configuration
 * @returns Ref to attach to element and intersection state
 * @example
 * const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.5 });
 */
export function useIntersectionObserver<T extends HTMLElement>(
  config: IntersectionObserverConfig = {}
): {
  ref: React.RefObject<T>;
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
} {
  const { threshold = 0, rootMargin = '0px', root = null } = config;
  const ref = useRef<T>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        setEntry(entry);
      },
      { threshold, rootMargin, root }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, root]);

  return { ref, isIntersecting, entry };
}

/**
 * Virtual scroll configuration
 */
interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

/**
 * Virtual scroll return type
 */
interface VirtualScrollReturn {
  visibleRange: { start: number; end: number };
  totalHeight: number;
  offsetY: number;
}

/**
 * Custom hook for virtual scrolling large lists
 * @param items - Array of items to render
 * @param config - Virtual scroll configuration
 * @returns Virtual scroll properties
 * @example
 * const { visibleRange, totalHeight, offsetY } = useVirtualScroll(items, {
 *   itemHeight: 50,
 *   containerHeight: 500,
 *   overscan: 5
 * });
 */
export function useVirtualScroll<T>(
  items: T[],
  config: VirtualScrollConfig
): VirtualScrollReturn {
  const { itemHeight, containerHeight, overscan = 3 } = config;
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);
  
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;
  
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      setScrollTop(target.scrollTop);
    };
    
    const scrollContainer = document.getElementById('virtual-scroll-container');
    scrollContainer?.addEventListener('scroll', handleScroll);
    
    return () => {
      scrollContainer?.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  return { visibleRange, totalHeight, offsetY };
}

/**
 * Legacy alias for existing implementation
 */
export function useVirtualScrolling<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    );
    
    return {
      start: Math.max(0, start - overscan),
      end,
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index,
      style: {
        position: 'absolute' as const,
        top: (visibleRange.start + index) * itemHeight,
        height: itemHeight,
        width: '100%',
      },
    }));
  }, [items, visibleRange, itemHeight]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll,
  };
}

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor(componentName: string) {
  const renderStart = useRef<number>(performance.now());
  const renderCount = useRef<number>(0);

  useEffect(() => {
    renderCount.current += 1;
    const renderTime = performance.now() - renderStart.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName} render #${renderCount.current} took ${renderTime.toFixed(2)}ms`);
      
      // Warn about slow renders
      if (renderTime > 16) {
        console.warn(`[Performance] ${componentName} render exceeded 16ms budget (${renderTime.toFixed(2)}ms)`);
      }
    }
    
    renderStart.current = performance.now();
  });

  return {
    renderCount: renderCount.current,
  };
}

/**
 * Memory usage monitoring hook
 */
export function useMemoryMonitor(componentName: string) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
      const memory = (performance as any).memory;
      console.log(`[Memory] ${componentName} - Used: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`);
    }
  });
}

/**
 * Custom hook that returns a stable callback reference
 * Prevents unnecessary re-renders when callback dependencies change
 * @param callback - The callback function
 * @returns A stable callback reference
 * @example
 * const stableCallback = useStableCallback(() => console.log(value));
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef<T>(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(
    ((...args: Parameters<T>) => {
      return callbackRef.current(...args);
    }) as T,
    []
  );
}

/**
 * Deep equality comparison function
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns True if values are deeply equal
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return false;
  
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
}

/**
 * Custom hook that memoizes a value with deep equality comparison
 * @param factory - Factory function that creates the value
 * @param deps - Dependencies array
 * @returns The memoized value
 * @example
 * const complexObject = useDeepMemo(() => ({ ...data }), [data]);
 */
export function useDeepMemo<T>(
  factory: () => T,
  deps: DependencyList
): T {
  const ref = useRef<{ value: T; deps: DependencyList }>();

  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = { value: factory(), deps };
  }

  return ref.current.value;
}

/**
 * Lazy image configuration
 */
interface LazyImageConfig {
  src: string;
  placeholder?: string;
  threshold?: number;
  rootMargin?: string;
}

/**
 * Lazy image return type
 */
interface LazyImageReturn {
  ref: React.RefObject<HTMLImageElement>;
  imageSrc: string;
  isLoaded: boolean;
  isError: boolean;
}

/**
 * Custom hook for lazy loading images
 * @param config - Lazy image configuration
 * @returns Lazy image properties
 * @example
 * const { ref, imageSrc, isLoaded } = useLazyImage({
 *   src: 'https://example.com/image.jpg',
 *   placeholder: 'https://example.com/placeholder.jpg'
 * });
 */
export function useLazyImage(config: LazyImageConfig): LazyImageReturn {
  const { src, placeholder = '', threshold = 0, rootMargin = '50px' } = config;
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  
  const { ref, isIntersecting } = useIntersectionObserver<HTMLImageElement>({
    threshold,
    rootMargin,
  });

  useEffect(() => {
    if (!isIntersecting || isLoaded) return;

    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
      setIsError(false);
    };
    
    img.onerror = () => {
      setIsError(true);
      setIsLoaded(true);
    };
    
    img.src = src;
  }, [src, isIntersecting, isLoaded]);

  return { ref, imageSrc, isLoaded, isError };
}

/**
 * Legacy progressive image loading hook
 */
export function useProgressiveImage(src: string, placeholderSrc?: string) {
  const [currentSrc, setCurrentSrc] = useState(placeholderSrc || src);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const img = new Image();
    
    img.onload = () => {
      setCurrentSrc(src);
      setIsLoading(false);
    };
    
    img.onerror = () => {
      setIsError(true);
      setIsLoading(false);
    };
    
    img.src = src;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return {
    src: currentSrc,
    isLoading,
    isError,
  };
}

/**
 * Animation frame based updates for smooth performance
 */
export function useAnimationFrame(callback: () => void, deps: React.DependencyList) {
  const requestRef = useRef<number>();
  
  useEffect(() => {
    const animate = () => {
      callback();
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, deps);
}

/**
 * Bundle size optimization utilities
 */
export const lazyImport = <T extends Record<string, any>>(
  importFn: () => Promise<T>,
  namedExport?: keyof T
) => {
  return lazy(() =>
    importFn().then((module) => ({
      default: namedExport ? module[namedExport] : module.default || module,
    }))
  );
};

/**
 * Critical resource preloading
 */
export function preloadResource(href: string, as: string) {
  if (typeof window === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  
  document.head.appendChild(link);
}

/**
 * DNS prefetching for external resources
 */
export function prefetchDNS(domain: string) {
  if (typeof window === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'dns-prefetch';
  link.href = domain;
  
  document.head.appendChild(link);
}

/**
 * Code splitting utilities
 */
export const withSuspense = <P extends object>(
  Component: React.ComponentType<P>,
  fallback: React.ReactNode = React.createElement('div', {}, 'Loading...')
) => {
  return (props: P) => React.createElement(
    Suspense,
    { fallback },
    React.createElement(Component, props)
  );
};

/**
 * React 19 optimized form handling
 */
export function useOptimizedForm<T extends Record<string, any>>(
  initialValues: T,
  onSubmit: (values: T) => void | Promise<void>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((name: keyof T, value: any) => {
    startTransition(() => {
      setValues(prev => ({ ...prev, [name]: value }));
    });
  }, []);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    
    try {
      setIsSubmitting(true);
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, onSubmit]);

  const reset = useCallback(() => {
    startTransition(() => {
      setValues(initialValues);
    });
  }, [initialValues]);

  return {
    values,
    handleChange,
    handleSubmit,
    reset,
    isSubmitting,
  };
}

/**
 * Performance budget monitoring
 */
export function usePerformanceBudget() {
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          const duration = entry.duration;
          
          if (duration > 100) {
            console.warn(`[Performance Budget] ${entry.name} exceeded 100ms budget: ${duration.toFixed(2)}ms`);
          }
        }
      }
    });

    observer.observe({ entryTypes: ['measure'] });

    return () => {
      observer.disconnect();
    };
  }, []);
}

// Performance measurement helpers
export const measurePerformance = {
  start: (name: string) => {
    if (typeof window !== 'undefined') {
      performance.mark(`${name}-start`);
    }
  },
  
  end: (name: string) => {
    if (typeof window !== 'undefined') {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }
  },
  
  clear: (name: string) => {
    if (typeof window !== 'undefined') {
      performance.clearMarks(`${name}-start`);
      performance.clearMarks(`${name}-end`);
      performance.clearMeasures(name);
    }
  },
};

 