/**
 * Performance Monitor Component
 * Real-time performance monitoring for React 19 applications
 */

import React, { useEffect, useState, useRef } from 'react';

interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  
  // React-specific metrics
  renderTime?: number;
  componentCount?: number;
  reRenderCount?: number;
  
  // Memory metrics
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
  
  // Navigation metrics
  domContentLoaded?: number;
  loadComplete?: number;
  
  // Resource metrics
  totalResources?: number;
  totalTransferSize?: number;
  slowResources?: number;
}

interface PerformanceThresholds {
  lcp: { good: number; needs_improvement: number };
  fid: { good: number; needs_improvement: number };
  cls: { good: number; needs_improvement: number };
  fcp: { good: number; needs_improvement: number };
  ttfb: { good: number; needs_improvement: number };
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  lcp: { good: 2500, needs_improvement: 4000 },
  fid: { good: 100, needs_improvement: 300 },
  cls: { good: 0.1, needs_improvement: 0.25 },
  fcp: { good: 1800, needs_improvement: 3000 },
  ttfb: { good: 800, needs_improvement: 1800 },
};

export const PerformanceMonitor: React.FC<{
  enabled?: boolean;
  thresholds?: Partial<PerformanceThresholds>;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  showDevOverlay?: boolean;
}> = ({ 
  enabled = process.env.NODE_ENV === 'development',
  thresholds = {},
  onMetricsUpdate,
  showDevOverlay = process.env.NODE_ENV === 'development'
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<PerformanceObserver | null>(null);
  const renderCountRef = useRef<number>(0);
  const finalThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Initialize performance monitoring
    initializePerformanceMonitoring();

    // Monitor Core Web Vitals
    monitorCoreWebVitals();

    // Monitor React performance
    monitorReactPerformance();

    // Monitor memory usage
    monitorMemoryUsage();

    // Monitor resource loading
    monitorResources();

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled]);

  useEffect(() => {
    if (onMetricsUpdate) {
      onMetricsUpdate(metrics);
    }
  }, [metrics, onMetricsUpdate]);

  const initializePerformanceMonitoring = () => {
    // Set up performance observer
    if ('PerformanceObserver' in window) {
      observerRef.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          switch (entry.entryType) {
            case 'largest-contentful-paint':
              updateMetric('lcp', entry.startTime);
              break;
                         case 'first-input':
               const fidEntry = entry as any; // First Input Delay entry type
               updateMetric('fid', fidEntry.processingStart - fidEntry.startTime);
               break;
            case 'layout-shift':
              if (!(entry as any).hadRecentInput) {
                updateMetric('cls', (metrics.cls || 0) + (entry as any).value);
              }
              break;
            case 'paint':
              if (entry.name === 'first-contentful-paint') {
                updateMetric('fcp', entry.startTime);
              }
              break;
            case 'navigation':
              const navEntry = entry as PerformanceNavigationTiming;
              updateMetric('ttfb', navEntry.responseStart - navEntry.requestStart);
              updateMetric('domContentLoaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart);
              updateMetric('loadComplete', navEntry.loadEventEnd - navEntry.loadEventStart);
              break;
          }
        });
      });

      // Observe different types of performance entries
      try {
        observerRef.current.observe({ entryTypes: ['largest-contentful-paint'] });
        observerRef.current.observe({ entryTypes: ['first-input'] });
        observerRef.current.observe({ entryTypes: ['layout-shift'] });
        observerRef.current.observe({ entryTypes: ['paint'] });
        observerRef.current.observe({ entryTypes: ['navigation'] });
        observerRef.current.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('Some performance observation types not supported:', error);
      }
    }
  };

  const monitorCoreWebVitals = () => {
    // LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          updateMetric('lcp', lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        // Fallback for browsers that don't support LCP
        console.warn('LCP not supported:', error);
      }
    }

    // CLS (Cumulative Layout Shift)
    let clsValue = 0;
    if ('PerformanceObserver' in window) {
      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShiftEntry = entry as any;
            if (!layoutShiftEntry.hadRecentInput) {
              clsValue += layoutShiftEntry.value;
              updateMetric('cls', clsValue);
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS not supported:', error);
      }
    }
  };

  const monitorReactPerformance = () => {
    renderCountRef.current += 1;
    updateMetric('reRenderCount', renderCountRef.current);

    // Monitor component mount time
    const startTime = performance.now();
    
    setTimeout(() => {
      const renderTime = performance.now() - startTime;
      updateMetric('renderTime', renderTime);
    }, 0);

    // Count React components (rough estimate)
    setTimeout(() => {
      const componentCount = document.querySelectorAll('[data-reactroot], [data-react-root]').length;
      updateMetric('componentCount', componentCount);
    }, 100);
  };

  const monitorMemoryUsage = () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      updateMetric('usedJSHeapSize', memory.usedJSHeapSize);
      updateMetric('totalJSHeapSize', memory.totalJSHeapSize);
      updateMetric('jsHeapSizeLimit', memory.jsHeapSizeLimit);
    }
  };

  const monitorResources = () => {
    const resources = performance.getEntriesByType('resource');
    updateMetric('totalResources', resources.length);
    
    const totalSize = resources.reduce((sum, resource) => {
      return sum + ((resource as any).transferSize || 0);
    }, 0);
    updateMetric('totalTransferSize', totalSize);

    const slowResources = resources.filter(resource => resource.duration > 1000).length;
    updateMetric('slowResources', slowResources);
  };

  const updateMetric = (key: keyof PerformanceMetrics, value: number) => {
    setMetrics(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getMetricStatus = (metric: keyof PerformanceThresholds, value?: number) => {
    if (!value || !finalThresholds[metric]) return 'unknown';
    
    const threshold = finalThresholds[metric];
    if (value <= threshold.good) return 'good';
    if (value <= threshold.needs_improvement) return 'needs-improvement';
    return 'poor';
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatTime = (ms?: number) => {
    if (!ms) return '0ms';
    return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
  };

  if (!enabled || !showDevOverlay) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
      >
        📊 Performance
      </button>

      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-white rounded-lg shadow-xl border p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900">Performance Metrics</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            {/* Core Web Vitals */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Core Web Vitals</h4>
              <div className="space-y-1 text-sm">
                <MetricRow
                  label="LCP"
                  value={formatTime(metrics.lcp)}
                  status={getMetricStatus('lcp', metrics.lcp)}
                  description="Largest Contentful Paint"
                />
                <MetricRow
                  label="FID"
                  value={formatTime(metrics.fid)}
                  status={getMetricStatus('fid', metrics.fid)}
                  description="First Input Delay"
                />
                <MetricRow
                  label="CLS"
                  value={metrics.cls?.toFixed(3) || '0'}
                  status={getMetricStatus('cls', metrics.cls)}
                  description="Cumulative Layout Shift"
                />
                <MetricRow
                  label="FCP"
                  value={formatTime(metrics.fcp)}
                  status={getMetricStatus('fcp', metrics.fcp)}
                  description="First Contentful Paint"
                />
                <MetricRow
                  label="TTFB"
                  value={formatTime(metrics.ttfb)}
                  status={getMetricStatus('ttfb', metrics.ttfb)}
                  description="Time to First Byte"
                />
              </div>
            </div>

            {/* React Performance */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">React Performance</h4>
              <div className="space-y-1 text-sm">
                <MetricRow
                  label="Render Time"
                  value={formatTime(metrics.renderTime)}
                  description="Last render duration"
                />
                <MetricRow
                  label="Re-renders"
                  value={metrics.reRenderCount?.toString() || '0'}
                  description="Component re-render count"
                />
                <MetricRow
                  label="Components"
                  value={metrics.componentCount?.toString() || '0'}
                  description="Estimated component count"
                />
              </div>
            </div>

            {/* Memory Usage */}
            {metrics.usedJSHeapSize && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Memory Usage</h4>
                <div className="space-y-1 text-sm">
                  <MetricRow
                    label="Used"
                    value={formatBytes(metrics.usedJSHeapSize)}
                    description="Used JS heap size"
                  />
                  <MetricRow
                    label="Total"
                    value={formatBytes(metrics.totalJSHeapSize)}
                    description="Total JS heap size"
                  />
                  <MetricRow
                    label="Limit"
                    value={formatBytes(metrics.jsHeapSizeLimit)}
                    description="JS heap size limit"
                  />
                </div>
              </div>
            )}

            {/* Resources */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Resources</h4>
              <div className="space-y-1 text-sm">
                <MetricRow
                  label="Total"
                  value={metrics.totalResources?.toString() || '0'}
                  description="Total resources loaded"
                />
                <MetricRow
                  label="Size"
                  value={formatBytes(metrics.totalTransferSize)}
                  description="Total transfer size"
                />
                <MetricRow
                  label="Slow"
                  value={metrics.slowResources?.toString() || '0'}
                  status={metrics.slowResources && metrics.slowResources > 0 ? 'poor' : 'good'}
                  description="Resources >1s load time"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t text-xs text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
};

const MetricRow: React.FC<{
  label: string;
  value: string;
  status?: 'good' | 'needs-improvement' | 'poor' | 'unknown';
  description?: string;
}> = ({ label, value, status, description }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'needs-improvement': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'good': return '✅';
      case 'needs-improvement': return '⚠️';
      case 'poor': return '❌';
      default: return '';
    }
  };

  return (
    <div className="flex justify-between items-center" title={description}>
      <span className="text-gray-600">{label}:</span>
      <span className={`font-mono ${getStatusColor()}`}>
        {getStatusIcon()} {value}
      </span>
    </div>
  );
};

export default PerformanceMonitor;

// Hook for performance monitoring
export const usePerformanceMonitoring = (options: {
  trackCoreWebVitals?: boolean;
  trackMemory?: boolean;
  onMetricUpdate?: (metric: string, value: number) => void;
} = {}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  
  useEffect(() => {
    if (!options.trackCoreWebVitals && !options.trackMemory) return;

    const interval = setInterval(() => {
      const newMetrics: PerformanceMetrics = {};

      // Track memory if requested
      if (options.trackMemory && 'memory' in performance) {
        const memory = (performance as any).memory;
        newMetrics.usedJSHeapSize = memory.usedJSHeapSize;
        newMetrics.totalJSHeapSize = memory.totalJSHeapSize;
        newMetrics.jsHeapSizeLimit = memory.jsHeapSizeLimit;
      }

      // Update metrics
      setMetrics(prev => ({ ...prev, ...newMetrics }));

      // Call callback for each new metric
      if (options.onMetricUpdate) {
        Object.entries(newMetrics).forEach(([key, value]) => {
          if (typeof value === 'number') {
            options.onMetricUpdate!(key, value);
          }
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [options]);

  return metrics;
}; 