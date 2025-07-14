/**
 * Monitoring React Hooks
 * 
 * Provides React hooks for easy integration of monitoring capabilities
 * into React components.
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { monitor } from '@/utils/monitoring';

/**
 * Hook for tracking page views
 */
export const usePageTracking = () => {
  const router = useRouter();
  const previousPath = useRef<string>();

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      // Track page view
      monitor.trackPageView(url);
      
      // Track navigation timing
      monitor.timing('navigation.route_change', Date.now() - performance.now(), {
        from: previousPath.current || 'unknown',
        to: url,
      });
      
      previousPath.current = url;
    };

    // Track initial page load
    if (router.asPath && router.asPath !== previousPath.current) {
      handleRouteChange(router.asPath);
    }

    // Listen for route changes
    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);
};

/**
 * Hook for performance monitoring
 */
export const usePerformanceMonitoring = (componentName: string) => {
  const mountTime = useRef<number>();
  const renderCount = useRef<number>(0);

  useEffect(() => {
    mountTime.current = Date.now();
    renderCount.current = 0;

    // Track component mount
    monitor.counter('component.mount', 1, {
      component: componentName,
    });

    return () => {
      // Track component unmount and lifetime
      if (mountTime.current) {
        const lifetime = Date.now() - mountTime.current;
        monitor.timing('component.lifetime', lifetime, {
          component: componentName,
          renderCount: renderCount.current.toString(),
        });
      }

      monitor.counter('component.unmount', 1, {
        component: componentName,
      });
    };
  }, [componentName]);

  // Track renders
  useEffect(() => {
    renderCount.current += 1;
    
    monitor.counter('component.render', 1, {
      component: componentName,
      renderNumber: renderCount.current.toString(),
    });
  });

  const trackUserInteraction = useCallback((action: string, properties?: Record<string, any>) => {
    monitor.track('user_interaction', {
      component: componentName,
      action,
      ...properties,
    });
  }, [componentName]);

  return {
    trackUserInteraction,
    renderCount: renderCount.current,
  };
};

/**
 * Hook for tracking API calls
 */
export const useApiMonitoring = () => {
  const trackApiCall = useCallback(async <T>(
    endpoint: string,
    method: string,
    fn: () => Promise<T>,
    options?: {
      tags?: Record<string, string>;
      trackPayload?: boolean;
    }
  ): Promise<T> => {
    const timerName = `api.${method.toLowerCase()}.${endpoint.replace(/\//g, '_')}`;
    
    monitor.startTiming(timerName);
    
    try {
      const result = await fn();
      
      monitor.endTiming(timerName, {
        method,
        endpoint,
        status: 'success',
        ...options?.tags,
      });

      monitor.counter('api.requests', 1, {
        method,
        endpoint,
        status: 'success',
        ...options?.tags,
      });

      return result;
    } catch (error) {
      monitor.endTiming(timerName, {
        method,
        endpoint,
        status: 'error',
        ...options?.tags,
      });

      monitor.counter('api.requests', 1, {
        method,
        endpoint,
        status: 'error',
        ...options?.tags,
      });

      monitor.trackError(error instanceof Error ? error : new Error('API call failed'), {
        method,
        endpoint,
        ...options?.tags,
      });

      throw error;
    }
  }, []);

  return { trackApiCall };
};

/**
 * Hook for tracking form interactions
 */
export const useFormMonitoring = (formName: string) => {
  const formStartTime = useRef<number>();
  const fieldInteractions = useRef<Record<string, number>>({});

  const startForm = useCallback(() => {
    formStartTime.current = Date.now();
    fieldInteractions.current = {};
    
    monitor.track('form_start', {
      form: formName,
    });
  }, [formName]);

  const trackFieldInteraction = useCallback((fieldName: string, action: 'focus' | 'blur' | 'change') => {
    if (!fieldInteractions.current[fieldName]) {
      fieldInteractions.current[fieldName] = 0;
    }
    fieldInteractions.current[fieldName] += 1;

    monitor.track('form_field_interaction', {
      form: formName,
      field: fieldName,
      action,
      interactionCount: fieldInteractions.current[fieldName],
    });
  }, [formName]);

  const trackFormSubmission = useCallback((success: boolean, errors?: string[]) => {
    if (formStartTime.current) {
      const duration = Date.now() - formStartTime.current;
      
      monitor.timing('form.completion_time', duration, {
        form: formName,
        success: success.toString(),
      });
    }

    monitor.track('form_submission', {
      form: formName,
      success,
      errors,
      totalInteractions: Object.values(fieldInteractions.current).reduce((sum, count) => sum + count, 0),
      fieldsInteracted: Object.keys(fieldInteractions.current).length,
    });

    monitor.counter('form.submissions', 1, {
      form: formName,
      status: success ? 'success' : 'error',
    });
  }, [formName]);

  const trackFormValidation = useCallback((fieldName: string, isValid: boolean, errorMessage?: string) => {
    monitor.track('form_validation', {
      form: formName,
      field: fieldName,
      isValid,
      errorMessage,
    });

    monitor.counter('form.validation_errors', isValid ? 0 : 1, {
      form: formName,
      field: fieldName,
    });
  }, [formName]);

  return {
    startForm,
    trackFieldInteraction,
    trackFormSubmission,
    trackFormValidation,
  };
};

/**
 * Hook for tracking user engagement
 */
export const useEngagementTracking = (contentType: string, contentId?: string) => {
  const engagementStartTime = useRef<number>();
  const scrollDepth = useRef<number>(0);
  const maxScrollDepth = useRef<number>(0);

  useEffect(() => {
    engagementStartTime.current = Date.now();

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const currentScrollDepth = Math.round((scrollTop / documentHeight) * 100);
      
      scrollDepth.current = currentScrollDepth;
      maxScrollDepth.current = Math.max(maxScrollDepth.current, currentScrollDepth);
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      
      // Track engagement metrics on cleanup
      if (engagementStartTime.current) {
        const engagementTime = Date.now() - engagementStartTime.current;
        
        monitor.track('content_engagement', {
          contentType,
          contentId,
          engagementTime,
          maxScrollDepth: maxScrollDepth.current,
        });

        monitor.timing('content.engagement_time', engagementTime, {
          contentType,
          contentId: contentId || 'unknown',
        });
      }
    };
  }, [contentType, contentId]);

  const trackContentInteraction = useCallback((action: string, properties?: Record<string, any>) => {
    monitor.track('content_interaction', {
      contentType,
      contentId,
      action,
      scrollDepth: scrollDepth.current,
      ...properties,
    });
  }, [contentType, contentId]);

  return {
    trackContentInteraction,
    currentScrollDepth: scrollDepth.current,
    maxScrollDepth: maxScrollDepth.current,
  };
};

/**
 * Hook for tracking errors in components
 */
export const useErrorTracking = (componentName: string) => {
  const trackError = useCallback((error: Error, context?: Record<string, any>) => {
    monitor.trackError(error, {
      component: componentName,
      ...context,
    });
  }, [componentName]);

  const trackErrorBoundary = useCallback((error: Error, errorInfo: { componentStack: string }) => {
    monitor.trackError(error, {
      component: componentName,
      type: 'error_boundary',
      componentStack: errorInfo.componentStack,
    });
  }, [componentName]);

  return {
    trackError,
    trackErrorBoundary,
  };
};

/**
 * Hook for tracking feature usage
 */
export const useFeatureTracking = (featureName: string) => {
  const trackFeatureUsage = useCallback((action: string, properties?: Record<string, any>) => {
    monitor.track('feature_usage', {
      feature: featureName,
      action,
      ...properties,
    });

    monitor.counter('feature.usage', 1, {
      feature: featureName,
      action,
    });
  }, [featureName]);

  const trackFeatureClick = useCallback((element: string, properties?: Record<string, any>) => {
    trackFeatureUsage('click', {
      element,
      ...properties,
    });
  }, [trackFeatureUsage]);

  const trackFeatureView = useCallback((properties?: Record<string, any>) => {
    trackFeatureUsage('view', properties);
  }, [trackFeatureUsage]);

  return {
    trackFeatureUsage,
    trackFeatureClick,
    trackFeatureView,
  };
};

/**
 * Hook for performance-sensitive components
 */
export const usePerformanceTracking = (componentName: string) => {
  const renderStartTime = useRef<number>();

  useEffect(() => {
    renderStartTime.current = performance.now();
  });

  useEffect(() => {
    if (renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current;
      
      monitor.timing('component.render_time', renderTime, {
        component: componentName,
      });
    }
  });

  const trackAsyncOperation = useCallback(async <T>(
    operationName: string,
    operation: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> => {
    return monitor.timeFunction(
      `${componentName}.${operationName}`,
      operation,
      {
        component: componentName,
        ...tags,
      }
    );
  }, [componentName]);

  return {
    trackAsyncOperation,
  };
};

/**
 * Hook for A/B testing and feature flags
 */
export const useExperimentTracking = (experimentName: string, variant: string) => {
  useEffect(() => {
    monitor.track('experiment_exposure', {
      experiment: experimentName,
      variant,
    });

    monitor.counter('experiment.exposures', 1, {
      experiment: experimentName,
      variant,
    });
  }, [experimentName, variant]);

  const trackConversion = useCallback((goal: string, value?: number) => {
    monitor.track('experiment_conversion', {
      experiment: experimentName,
      variant,
      goal,
      value,
    });

    monitor.counter('experiment.conversions', 1, {
      experiment: experimentName,
      variant,
      goal,
    });
  }, [experimentName, variant]);

  return {
    trackConversion,
  };
};

/**
 * Custom hook for monitoring bundle
 */
export const useMonitoringBundle = (componentName: string) => {
  const pageTracking = usePageTracking();
  const performanceMonitoring = usePerformanceMonitoring(componentName);
  const { trackApiCall } = useApiMonitoring();
  const { trackError } = useErrorTracking(componentName);
  const { trackFeatureUsage } = useFeatureTracking(componentName);

  return {
    ...performanceMonitoring,
    trackApiCall,
    trackError,
    trackFeatureUsage,
  };
};

export default useMonitoringBundle;