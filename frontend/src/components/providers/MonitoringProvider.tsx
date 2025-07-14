/**
 * Monitoring Provider Component
 * 
 * Provides monitoring context and auto-initializes monitoring services
 * throughout the application.
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { monitor } from '@/utils/monitoring';

interface MonitoringContextType {
  isInitialized: boolean;
  sessionId: string;
  trackEvent: (event: string, properties?: Record<string, any>) => void;
  trackError: (error: Error, context?: Record<string, any>) => void;
  trackTiming: (name: string, duration: number, tags?: Record<string, string>) => void;
  trackMetric: (name: string, value: number, type: 'counter' | 'gauge' | 'histogram', tags?: Record<string, string>) => void;
  startTiming: (name: string) => void;
  endTiming: (name: string, tags?: Record<string, string>) => void;
  config: {
    enableRealUserMonitoring: boolean;
    enableErrorTracking: boolean;
    enablePerformanceMonitoring: boolean;
    enableAnalytics: boolean;
    sampleRate: number;
  };
  updateConfig: (config: Partial<MonitoringContextType['config']>) => void;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined);

interface MonitoringProviderProps {
  children: ReactNode;
  config?: Partial<MonitoringContextType['config']>;
}

export const MonitoringProvider: React.FC<MonitoringProviderProps> = ({ 
  children, 
  config: initialConfig = {} 
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [config, setConfig] = useState<MonitoringContextType['config']>({
    enableRealUserMonitoring: true,
    enableErrorTracking: true,
    enablePerformanceMonitoring: true,
    enableAnalytics: true,
    sampleRate: 0.1,
    ...initialConfig,
  });

  // Initialize monitoring
  useEffect(() => {
    const initializeMonitoring = async () => {
      try {
        // Get session ID
        const id = monitor.getSessionId();
        setSessionId(id);

        // Track application start
        monitor.track('app_start', {
          timestamp: Date.now(),
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          url: typeof window !== 'undefined' ? window.location.href : 'unknown',
          referrer: typeof document !== 'undefined' ? document.referrer : 'unknown',
        });

        // Track initial page load
        monitor.trackPageView();

        // Set up global error handlers if enabled
        if (config.enableErrorTracking) {
          setupGlobalErrorHandlers();
        }

        // Set up performance monitoring if enabled
        if (config.enablePerformanceMonitoring) {
          setupPerformanceMonitoring();
        }

        // Set up user engagement tracking if enabled
        if (config.enableAnalytics) {
          setupUserEngagementTracking();
        }

        setIsInitialized(true);
        
        console.log('Monitoring initialized successfully', {
          sessionId: id,
          config,
        });
      } catch (error) {
        console.error('Failed to initialize monitoring:', error);
        setIsInitialized(false);
      }
    };

    initializeMonitoring();
  }, [config]);

  // Set up global error handlers
  const setupGlobalErrorHandlers = () => {
    if (typeof window === 'undefined') return;

    // Track unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      monitor.trackError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
          type: 'unhandled_promise_rejection',
          reason: String(event.reason),
        }
      );
    };

    // Track global errors
    const handleGlobalError = (event: ErrorEvent) => {
      monitor.trackError(
        event.error || new Error(event.message),
        {
          type: 'global_error',
          filename: event.filename,
          lineno: event.lineno?.toString(),
          colno: event.colno?.toString(),
        }
      );
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    // Cleanup function
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  };

  // Set up performance monitoring
  const setupPerformanceMonitoring = () => {
    if (typeof window === 'undefined') return;

    // Track navigation performance
    const trackNavigationPerformance = () => {
      if (window.performance && window.performance.getEntriesByType) {
        const navigationEntries = window.performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (navigationEntries.length > 0) {
          const navigation = navigationEntries[0];
          
          // Track key navigation metrics
          monitor.trackTiming('navigation.dns_lookup', navigation.domainLookupEnd - navigation.domainLookupStart);
          monitor.trackTiming('navigation.tcp_connection', navigation.connectEnd - navigation.connectStart);
          monitor.trackTiming('navigation.server_response', navigation.responseEnd - navigation.requestStart);
          monitor.trackTiming('navigation.dom_processing', navigation.domComplete - navigation.domLoading);
          monitor.trackTiming('navigation.page_load', navigation.loadEventEnd - navigation.navigationStart);
        }
      }
    };

    // Track resource performance
    const trackResourcePerformance = () => {
      if (window.performance && window.performance.getEntriesByType) {
        const resourceEntries = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        
        resourceEntries.forEach(resource => {
          if (Math.random() < config.sampleRate) {
            const resourceType = getResourceType(resource.name);
            monitor.trackTiming(`resource.${resourceType}`, resource.duration, {
              initiator: resource.initiatorType,
              name: resource.name.split('/').pop() || 'unknown',
            });
          }
        });
      }
    };

    // Track memory usage
    const trackMemoryUsage = () => {
      if ('memory' in performance && (performance as any).memory) {
        const memory = (performance as any).memory;
        monitor.trackMetric('memory.used', memory.usedJSHeapSize, 'gauge');
        monitor.trackMetric('memory.total', memory.totalJSHeapSize, 'gauge');
        monitor.trackMetric('memory.limit', memory.jsHeapSizeLimit, 'gauge');
      }
    };

    // Run initial performance tracking
    setTimeout(trackNavigationPerformance, 1000);
    setTimeout(trackResourcePerformance, 2000);
    
    // Set up periodic memory tracking
    const memoryInterval = setInterval(trackMemoryUsage, 30000); // Every 30 seconds

    // Cleanup function
    return () => {
      clearInterval(memoryInterval);
    };
  };

  // Set up user engagement tracking
  const setupUserEngagementTracking = () => {
    if (typeof window === 'undefined') return;

    let pageViewStart = Date.now();
    let isVisible = !document.hidden;

    // Track page visibility changes
    const handleVisibilityChange = () => {
      const wasVisible = isVisible;
      isVisible = !document.hidden;
      
      if (wasVisible && !isVisible) {
        // User left the page
        const timeOnPage = Date.now() - pageViewStart;
        monitor.track('page_blur', {
          timeOnPage,
          url: window.location.href,
        });
      } else if (!wasVisible && isVisible) {
        // User returned to the page
        pageViewStart = Date.now();
        monitor.track('page_focus', {
          url: window.location.href,
        });
      }
    };

    // Track scroll depth
    let maxScrollDepth = 0;
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollDepth = Math.round((scrollTop / documentHeight) * 100);
      
      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth;
        
        // Track scroll milestones
        if (scrollDepth >= 25 && maxScrollDepth < 25) {
          monitor.track('scroll_depth', { depth: 25 });
        } else if (scrollDepth >= 50 && maxScrollDepth < 50) {
          monitor.track('scroll_depth', { depth: 50 });
        } else if (scrollDepth >= 75 && maxScrollDepth < 75) {
          monitor.track('scroll_depth', { depth: 75 });
        } else if (scrollDepth >= 100 && maxScrollDepth < 100) {
          monitor.track('scroll_depth', { depth: 100 });
        }
      }
    };

    // Track user interactions
    const handleUserInteraction = (event: Event) => {
      monitor.track('user_interaction', {
        type: event.type,
        target: (event.target as Element)?.tagName?.toLowerCase(),
        timestamp: Date.now(),
      });
    };

    // Set up event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('click', handleUserInteraction, { passive: true });
    document.addEventListener('keydown', handleUserInteraction, { passive: true });

    // Track session end
    const handleBeforeUnload = () => {
      const timeOnPage = Date.now() - pageViewStart;
      monitor.track('session_end', {
        timeOnPage,
        maxScrollDepth,
        url: window.location.href,
      });
      
      // Flush any pending metrics
      monitor.flush();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  };

  // Helper function to determine resource type
  const getResourceType = (url: string): string => {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/)) return 'image';
    if (url.includes('/api/')) return 'api';
    if (url.includes('.woff') || url.includes('.ttf')) return 'font';
    return 'other';
  };

  // Context methods
  const trackEvent = (event: string, properties?: Record<string, any>) => {
    if (config.enableAnalytics) {
      monitor.track(event, properties);
    }
  };

  const trackError = (error: Error, context?: Record<string, any>) => {
    if (config.enableErrorTracking) {
      monitor.trackError(error, context);
    }
  };

  const trackTiming = (name: string, duration: number, tags?: Record<string, string>) => {
    if (config.enablePerformanceMonitoring) {
      monitor.timing(name, duration, tags);
    }
  };

  const trackMetric = (name: string, value: number, type: 'counter' | 'gauge' | 'histogram', tags?: Record<string, string>) => {
    if (config.enablePerformanceMonitoring) {
      switch (type) {
        case 'counter':
          monitor.counter(name, value, tags);
          break;
        case 'gauge':
          monitor.gauge(name, value, tags);
          break;
        case 'histogram':
          monitor.histogram(name, value, tags);
          break;
      }
    }
  };

  const startTiming = (name: string) => {
    if (config.enablePerformanceMonitoring) {
      monitor.startTiming(name);
    }
  };

  const endTiming = (name: string, tags?: Record<string, string>) => {
    if (config.enablePerformanceMonitoring) {
      monitor.endTiming(name, tags);
    }
  };

  const updateConfig = (newConfig: Partial<MonitoringContextType['config']>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const contextValue: MonitoringContextType = {
    isInitialized,
    sessionId,
    trackEvent,
    trackError,
    trackTiming,
    trackMetric,
    startTiming,
    endTiming,
    config,
    updateConfig,
  };

  return (
    <MonitoringContext.Provider value={contextValue}>
      {children}
    </MonitoringContext.Provider>
  );
};

/**
 * Hook to use monitoring context
 */
export const useMonitoring = (): MonitoringContextType => {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
};

/**
 * HOC to add monitoring to components
 */
export const withMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> => {
  return function WithMonitoringComponent(props: P) {
    const monitoring = useMonitoring();
    
    useEffect(() => {
      const name = componentName || Component.displayName || Component.name || 'UnknownComponent';
      monitoring.trackEvent('component_mount', {
        component: name,
        timestamp: Date.now(),
      });
      
      return () => {
        monitoring.trackEvent('component_unmount', {
          component: name,
          timestamp: Date.now(),
        });
      };
    }, [monitoring]);
    
    return <Component {...props} />;
  };
};

export default MonitoringProvider;