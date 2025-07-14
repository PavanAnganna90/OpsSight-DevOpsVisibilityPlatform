/**
 * Monitoring and Logging Utilities
 * 
 * Provides comprehensive monitoring capabilities including metrics collection,
 * performance tracking, error logging, and user analytics.
 */

import { ErrorLogger } from './errorHandling';

// Monitoring configuration
export const MONITORING_CONFIG = {
  // Metrics collection
  METRICS_ENABLED: process.env.NODE_ENV === 'production',
  METRICS_ENDPOINT: '/api/v1/metrics',
  METRICS_BATCH_SIZE: 50,
  METRICS_FLUSH_INTERVAL: 10000, // 10 seconds
  
  // Performance monitoring
  PERFORMANCE_ENABLED: true,
  PERFORMANCE_SAMPLE_RATE: 0.1, // 10% sampling
  
  // Error tracking
  ERROR_TRACKING_ENABLED: true,
  ERROR_ENDPOINT: '/api/v1/errors',
  
  // User analytics
  ANALYTICS_ENABLED: true,
  ANALYTICS_ENDPOINT: '/api/v1/analytics',
  
  // Real User Monitoring (RUM)
  RUM_ENABLED: true,
  RUM_SAMPLE_RATE: 0.05, // 5% sampling
} as const;

// Metric types
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timing';

export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  unit?: string;
}

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface ErrorMetric {
  message: string;
  stack?: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  tags?: Record<string, string>;
}

export interface UserEvent {
  event: string;
  userId?: string;
  sessionId?: string;
  timestamp: number;
  properties?: Record<string, any>;
  page?: string;
  referrer?: string;
}

/**
 * Metrics Collection Service
 */
export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Metric[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.startFlushTimer();
    this.setupUnloadHandler();
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startFlushTimer(): void {
    if (!MONITORING_CONFIG.METRICS_ENABLED) return;

    this.flushTimer = setInterval(() => {
      this.flush();
    }, MONITORING_CONFIG.METRICS_FLUSH_INTERVAL);
  }

  private setupUnloadHandler(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }
  }

  /**
   * Record a counter metric
   */
  counter(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.addMetric({
      name,
      type: 'counter',
      value,
      timestamp: Date.now(),
      tags,
    });
  }

  /**
   * Record a gauge metric
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.addMetric({
      name,
      type: 'gauge',
      value,
      timestamp: Date.now(),
      tags,
    });
  }

  /**
   * Record a histogram metric
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.addMetric({
      name,
      type: 'histogram',
      value,
      timestamp: Date.now(),
      tags,
    });
  }

  /**
   * Record a timing metric
   */
  timing(name: string, duration: number, tags?: Record<string, string>): void {
    this.addMetric({
      name,
      type: 'timing',
      value: duration,
      timestamp: Date.now(),
      tags,
      unit: 'ms',
    });
  }

  private addMetric(metric: Metric): void {
    if (!MONITORING_CONFIG.METRICS_ENABLED) return;

    this.metrics.push(metric);

    // Flush if batch size is reached
    if (this.metrics.length >= MONITORING_CONFIG.METRICS_BATCH_SIZE) {
      this.flush();
    }
  }

  /**
   * Flush metrics to the backend
   */
  async flush(): Promise<void> {
    if (!MONITORING_CONFIG.METRICS_ENABLED || this.metrics.length === 0) return;

    const metricsToSend = [...this.metrics];
    this.metrics = [];

    try {
      await fetch(MONITORING_CONFIG.METRICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          metrics: metricsToSend,
        }),
      });
    } catch (error) {
      ErrorLogger.log(error instanceof Error ? error : new Error('Failed to send metrics'), 'warn', {
        category: 'monitoring',
        metricsCount: metricsToSend.length,
      });
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Destroy the metrics collector
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }
}

/**
 * Performance Monitoring Service
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private activeTimers: Map<string, number> = new Map();
  private metrics: PerformanceMetric[] = [];

  private constructor() {
    this.setupPerformanceObserver();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private setupPerformanceObserver(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    try {
      // Observe navigation timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.recordNavigationTiming(entry as PerformanceNavigationTiming);
          }
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });

      // Observe resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.recordResourceTiming(entry as PerformanceResourceTiming);
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });

      // Observe LCP, FID, CLS
      const webVitalsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordWebVital(entry);
        }
      });
      webVitalsObserver.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });

    } catch (error) {
      ErrorLogger.log(error instanceof Error ? error : new Error('Failed to setup performance observer'), 'warn', {
        category: 'monitoring',
      });
    }
  }

  private recordNavigationTiming(entry: PerformanceNavigationTiming): void {
    const metricsCollector = MetricsCollector.getInstance();
    
    // Time to First Byte (TTFB)
    const ttfb = entry.responseStart - entry.requestStart;
    metricsCollector.timing('navigation.ttfb', ttfb, { type: 'navigation' });
    
    // DOM Content Loaded
    const domContentLoaded = entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart;
    metricsCollector.timing('navigation.dom_content_loaded', domContentLoaded, { type: 'navigation' });
    
    // Load Complete
    const loadComplete = entry.loadEventEnd - entry.loadEventStart;
    metricsCollector.timing('navigation.load_complete', loadComplete, { type: 'navigation' });
    
    // Total page load time
    const totalLoadTime = entry.loadEventEnd - entry.fetchStart;
    metricsCollector.timing('navigation.total_load_time', totalLoadTime, { type: 'navigation' });
  }

  private recordResourceTiming(entry: PerformanceResourceTiming): void {
    if (!this.shouldSamplePerformance()) return;

    const metricsCollector = MetricsCollector.getInstance();
    const resourceType = this.getResourceType(entry.name);
    
    const duration = entry.responseEnd - entry.requestStart;
    metricsCollector.timing('resource.load_time', duration, { 
      type: 'resource',
      resourceType,
      initiatorType: entry.initiatorType,
    });
  }

  private recordWebVital(entry: PerformanceEntry): void {
    const metricsCollector = MetricsCollector.getInstance();
    
    switch (entry.entryType) {
      case 'largest-contentful-paint':
        metricsCollector.timing('web_vitals.lcp', entry.startTime, { type: 'web_vital' });
        break;
      case 'first-input':
        metricsCollector.timing('web_vitals.fid', (entry as any).processingStart - entry.startTime, { type: 'web_vital' });
        break;
      case 'layout-shift':
        metricsCollector.gauge('web_vitals.cls', (entry as any).value, { type: 'web_vital' });
        break;
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return 'image';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  private shouldSamplePerformance(): boolean {
    return Math.random() < MONITORING_CONFIG.PERFORMANCE_SAMPLE_RATE;
  }

  /**
   * Start timing a custom operation
   */
  startTiming(name: string): void {
    this.activeTimers.set(name, Date.now());
  }

  /**
   * End timing and record the duration
   */
  endTiming(name: string, tags?: Record<string, string>): void {
    const startTime = this.activeTimers.get(name);
    if (!startTime) return;

    const duration = Date.now() - startTime;
    this.activeTimers.delete(name);

    const metricsCollector = MetricsCollector.getInstance();
    metricsCollector.timing(name, duration, tags);
  }

  /**
   * Time a function execution
   */
  async timeFunction<T>(name: string, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      
      const metricsCollector = MetricsCollector.getInstance();
      metricsCollector.timing(name, duration, { ...tags, status: 'success' });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      const metricsCollector = MetricsCollector.getInstance();
      metricsCollector.timing(name, duration, { ...tags, status: 'error' });
      
      throw error;
    }
  }
}

/**
 * Error Tracking Service
 */
export class ErrorTracker {
  private static instance: ErrorTracker;
  private errors: ErrorMetric[] = [];

  private constructor() {
    this.setupErrorHandlers();
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  private setupErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackError(event.error, {
        source: 'global',
        filename: event.filename,
        lineno: event.lineno.toString(),
        colno: event.colno.toString(),
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(event.reason, {
        source: 'promise',
        type: 'unhandled_rejection',
      });
    });
  }

  /**
   * Track an error
   */
  trackError(error: Error, tags?: Record<string, string>): void {
    if (!MONITORING_CONFIG.ERROR_TRACKING_ENABLED) return;

    const errorMetric: ErrorMetric = {
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      userId: this.getCurrentUserId(),
      sessionId: MetricsCollector.getInstance().getSessionId(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      tags,
    };

    this.errors.push(errorMetric);
    this.sendError(errorMetric);

    // Also count the error
    const metricsCollector = MetricsCollector.getInstance();
    metricsCollector.counter('errors.count', 1, {
      error_type: error.constructor.name,
      ...tags,
    });
  }

  private async sendError(error: ErrorMetric): Promise<void> {
    try {
      await fetch(MONITORING_CONFIG.ERROR_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(error),
      });
    } catch (sendError) {
      console.error('Failed to send error to backend:', sendError);
    }
  }

  private getCurrentUserId(): string | undefined {
    // Try to get user ID from localStorage or context
    if (typeof window !== 'undefined') {
      try {
        const userInfo = localStorage.getItem('user_info');
        if (userInfo) {
          const parsed = JSON.parse(userInfo);
          return parsed.id || parsed.userId;
        }
      } catch {
        // Ignore errors
      }
    }
    return undefined;
  }
}

/**
 * User Analytics Service
 */
export class UserAnalytics {
  private static instance: UserAnalytics;
  private events: UserEvent[] = [];

  private constructor() {
    this.setupPageTracking();
  }

  static getInstance(): UserAnalytics {
    if (!UserAnalytics.instance) {
      UserAnalytics.instance = new UserAnalytics();
    }
    return UserAnalytics.instance;
  }

  private setupPageTracking(): void {
    if (typeof window === 'undefined') return;

    // Track page views
    this.trackPageView();

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.track('page_visibility_change', {
        visible: !document.hidden,
      });
    });

    // Track user engagement
    let engagementStartTime = Date.now();
    let isEngaged = true;

    window.addEventListener('blur', () => {
      if (isEngaged) {
        const engagementTime = Date.now() - engagementStartTime;
        this.track('user_engagement', {
          duration: engagementTime,
          type: 'blur',
        });
        isEngaged = false;
      }
    });

    window.addEventListener('focus', () => {
      if (!isEngaged) {
        engagementStartTime = Date.now();
        isEngaged = true;
        this.track('user_engagement', {
          type: 'focus',
        });
      }
    });
  }

  /**
   * Track a page view
   */
  trackPageView(page?: string): void {
    this.track('page_view', {
      page: page || (typeof window !== 'undefined' ? window.location.pathname : undefined),
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      timestamp: Date.now(),
    });
  }

  /**
   * Track a user event
   */
  track(event: string, properties?: Record<string, any>): void {
    if (!MONITORING_CONFIG.ANALYTICS_ENABLED) return;

    const userEvent: UserEvent = {
      event,
      userId: this.getCurrentUserId(),
      sessionId: MetricsCollector.getInstance().getSessionId(),
      timestamp: Date.now(),
      properties,
      page: typeof window !== 'undefined' ? window.location.pathname : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    };

    this.events.push(userEvent);
    this.sendEvent(userEvent);
  }

  private async sendEvent(event: UserEvent): Promise<void> {
    try {
      await fetch(MONITORING_CONFIG.ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      ErrorLogger.log(error instanceof Error ? error : new Error('Failed to send analytics event'), 'warn', {
        category: 'analytics',
      });
    }
  }

  private getCurrentUserId(): string | undefined {
    if (typeof window !== 'undefined') {
      try {
        const userInfo = localStorage.getItem('user_info');
        if (userInfo) {
          const parsed = JSON.parse(userInfo);
          return parsed.id || parsed.userId;
        }
      } catch {
        // Ignore errors
      }
    }
    return undefined;
  }
}

/**
 * Monitoring Facade - Main interface for monitoring
 */
export class Monitor {
  private static instance: Monitor;
  private metricsCollector: MetricsCollector;
  private performanceMonitor: PerformanceMonitor;
  private errorTracker: ErrorTracker;
  private userAnalytics: UserAnalytics;

  private constructor() {
    this.metricsCollector = MetricsCollector.getInstance();
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.errorTracker = ErrorTracker.getInstance();
    this.userAnalytics = UserAnalytics.getInstance();
  }

  static getInstance(): Monitor {
    if (!Monitor.instance) {
      Monitor.instance = new Monitor();
    }
    return Monitor.instance;
  }

  // Metrics methods
  counter(name: string, value?: number, tags?: Record<string, string>): void {
    this.metricsCollector.counter(name, value, tags);
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.metricsCollector.gauge(name, value, tags);
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.metricsCollector.histogram(name, value, tags);
  }

  timing(name: string, duration: number, tags?: Record<string, string>): void {
    this.metricsCollector.timing(name, duration, tags);
  }

  // Performance methods
  startTiming(name: string): void {
    this.performanceMonitor.startTiming(name);
  }

  endTiming(name: string, tags?: Record<string, string>): void {
    this.performanceMonitor.endTiming(name, tags);
  }

  async timeFunction<T>(name: string, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T> {
    return this.performanceMonitor.timeFunction(name, fn, tags);
  }

  // Error tracking methods
  trackError(error: Error, tags?: Record<string, string>): void {
    this.errorTracker.trackError(error, tags);
  }

  // Analytics methods
  track(event: string, properties?: Record<string, any>): void {
    this.userAnalytics.track(event, properties);
  }

  trackPageView(page?: string): void {
    this.userAnalytics.trackPageView(page);
  }

  // Utility methods
  getSessionId(): string {
    return this.metricsCollector.getSessionId();
  }

  flush(): Promise<void> {
    return this.metricsCollector.flush();
  }
}

// Export singleton instance
export const monitor = Monitor.getInstance();

// Export individual services for advanced usage
export const metricsCollector = MetricsCollector.getInstance();
export const performanceMonitor = PerformanceMonitor.getInstance();
export const errorTracker = ErrorTracker.getInstance();
export const userAnalytics = UserAnalytics.getInstance();

export default monitor;