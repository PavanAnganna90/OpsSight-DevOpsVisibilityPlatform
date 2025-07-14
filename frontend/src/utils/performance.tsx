/**
 * Performance Utilities for React 19 and Next.js 15
 * Comprehensive performance optimization utilities
 */

import React, { useCallback, useMemo, useRef, useEffect, startTransition, useState, Suspense, lazy } from 'react';

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
  }, deps || []);
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
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, options]);

  return isIntersecting;
}

/**
 * Virtual scrolling hook for large lists
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
 * Image lazy loading with progressive enhancement
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
  const requestRef = useRef<number | null>(null);
  
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
  fallback: React.ReactNode = <div>Loading...</div>
) => {
  return (props: P) => (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
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

 