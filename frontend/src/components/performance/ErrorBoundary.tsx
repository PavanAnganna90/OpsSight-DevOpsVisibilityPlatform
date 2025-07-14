/**
 * Enhanced Error Boundary with Performance Monitoring
 * React 19 compatible error boundary with detailed error reporting
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  level?: 'page' | 'section' | 'component';
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;
    const { errorId } = this.state;

    // Log error with performance context
    this.logErrorWithContext(error, errorInfo, errorId!);

    // Call custom error handler
    if (onError && errorId) {
      onError(error, errorInfo, errorId);
    }

    // Report to monitoring service (if available)
    this.reportError(error, errorInfo, errorId!);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && !prevProps.resetOnPropsChange && resetOnPropsChange) {
      this.resetErrorBoundary();
    }

    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys![index]
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  private logErrorWithContext = (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    const errorContext = {
      errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: localStorage.getItem('userId') || 'anonymous',
      sessionId: sessionStorage.getItem('sessionId') || 'unknown',
      level: this.props.level || 'component',
    };

    // Performance metrics at time of error
    const performanceMetrics = this.gatherPerformanceMetrics();

    console.group(`🚨 Error Boundary: ${errorId}`);
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.log('Context:', errorContext);
    console.log('Performance Metrics:', performanceMetrics);
    console.groupEnd();

    // Store error in session storage for debugging
    const errorData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo,
      context: errorContext,
      performance: performanceMetrics,
    };

    try {
      sessionStorage.setItem(`error_${errorId}`, JSON.stringify(errorData));
    } catch (e) {
      console.warn('Failed to store error data in session storage:', e);
    }
  };

  private gatherPerformanceMetrics = () => {
    const metrics: Record<string, any> = {};

    // Navigation timing
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        metrics.navigation = {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        };
      }
    }

    // Memory usage (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      metrics.memory = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }

    // Resource timing
    if ('performance' in window) {
      const resources = performance.getEntriesByType('resource');
      metrics.resources = {
        count: resources.length,
        totalSize: resources.reduce((sum, resource) => sum + ((resource as any).transferSize || 0), 0),
        slowResources: resources
          .filter(resource => resource.duration > 1000)
          .map(resource => ({ name: resource.name, duration: resource.duration })),
      };
    }

    return metrics;
  };

  private reportError = async (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    // Only report in production
    if (process.env.NODE_ENV !== 'production') return;

    try {
      // Example error reporting (replace with your error reporting service)
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errorId,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          errorInfo,
          context: {
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            level: this.props.level || 'component',
          },
          performance: this.gatherPerformanceMetrics(),
        }),
      });
    } catch (reportingError) {
      console.warn('Failed to report error:', reportingError);
    }
  };

  private resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorId: undefined,
      });
    }, 100);
  };

  private handleRetry = () => {
    this.resetErrorBoundary();
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error, errorId } = this.state;
    const { children, fallback, level = 'component' } = this.props;

    if (hasError) {
      // Custom fallback UI
      if (fallback) {
        return fallback;
      }

      // Default fallback UI based on level
      return (
        <div className="error-boundary" data-error-id={errorId}>
          {level === 'page' ? (
            <PageErrorFallback 
              error={error} 
              errorId={errorId}
              onRetry={this.handleRetry}
              onReload={this.handleReload}
            />
          ) : level === 'section' ? (
            <SectionErrorFallback 
              error={error} 
              errorId={errorId}
              onRetry={this.handleRetry}
            />
          ) : (
            <ComponentErrorFallback 
              error={error} 
              errorId={errorId}
              onRetry={this.handleRetry}
            />
          )}
        </div>
      );
    }

    return children;
  }
}

// Fallback UI Components
const PageErrorFallback: React.FC<{
  error?: Error;
  errorId?: string;
  onRetry: () => void;
  onReload: () => void;
}> = ({ error, errorId, onRetry, onReload }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">
        Something went wrong
      </h1>
      <p className="text-gray-600 mb-6">
        We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
      </p>
      {process.env.NODE_ENV === 'development' && (
        <details className="text-left mb-4 p-3 bg-gray-100 rounded text-sm">
          <summary className="cursor-pointer font-medium">Error Details</summary>
          <pre className="mt-2 text-xs overflow-auto">
            {error?.stack || error?.message}
          </pre>
          <p className="mt-2 text-xs text-gray-500">Error ID: {errorId}</p>
        </details>
      )}
      <div className="flex space-x-3">
        <button
          onClick={onRetry}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Try Again
        </button>
        <button
          onClick={onReload}
          className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Reload Page
        </button>
      </div>
    </div>
  </div>
);

const SectionErrorFallback: React.FC<{
  error?: Error;
  errorId?: string;
  onRetry: () => void;
}> = ({ error, errorId, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <div className="flex">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3 flex-1">
        <h3 className="text-sm font-medium text-red-800">
          Section Error
        </h3>
        <p className="mt-1 text-sm text-red-700">
          This section encountered an error and couldn't load properly.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-2">
            <summary className="text-xs cursor-pointer">Error Details</summary>
            <pre className="text-xs mt-1 overflow-auto">
              {error?.message}
            </pre>
            <p className="text-xs text-red-600 mt-1">ID: {errorId}</p>
          </details>
        )}
        <div className="mt-3">
          <button
            onClick={onRetry}
            className="bg-red-100 text-red-800 px-3 py-1 rounded-md text-sm hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  </div>
);

const ComponentErrorFallback: React.FC<{
  error?: Error;
  errorId?: string;
  onRetry: () => void;
}> = ({ error, errorId, onRetry }) => (
  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <svg className="h-4 w-4 text-yellow-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-2 flex-1">
        <p className="text-sm text-yellow-800">
          Component failed to load
        </p>
        {process.env.NODE_ENV === 'development' && (
          <p className="text-xs text-yellow-600 mt-1">
            {error?.message} (ID: {errorId})
          </p>
        )}
        <button
          onClick={onRetry}
          className="mt-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-200 focus:outline-none focus:ring-1 focus:ring-yellow-500"
        >
          Retry
        </button>
      </div>
    </div>
  </div>
);

export default ErrorBoundary;

// Higher-order component for easy usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  return (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
};

// Hook for manual error reporting
export const useErrorHandler = () => {
  const reportError = React.useCallback((error: Error, errorInfo?: any) => {
    // Trigger error boundary or report manually
    console.error('Manual error report:', error, errorInfo);
    
    // You can throw the error to trigger the nearest error boundary
    // throw error;
  }, []);

  return { reportError };
}; 