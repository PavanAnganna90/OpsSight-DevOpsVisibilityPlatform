/**
 * LazyWrapper Component
 * 
 * Enhanced lazy loading component with suspense, error boundaries, and performance optimizations
 */

'use client';

import React, { Suspense, ComponentType } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '../performance/ErrorBoundary';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  height?: string;
  errorFallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

/**
 * Enhanced default fallback with skeleton loading
 */
const DefaultFallback: React.FC<{ height?: string; className?: string }> = ({ 
  height = '400px', 
  className = '' 
}) => (
  <div 
    className={`flex items-center justify-center bg-slate-800/50 rounded-lg border border-slate-700/50 ${className}`}
    style={{ minHeight: height }}
  >
    <div className="text-center">
      <LoadingSpinner size="lg" className="mx-auto mb-4" />
      <p className="text-slate-300 text-sm">Loading component...</p>
    </div>
  </div>
);

/**
 * Default error fallback
 */
const DefaultErrorFallback: React.FC<{ error: Error; resetError: () => void }> = ({ 
  error, 
  resetError 
}) => (
  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
    <div className="text-red-400 mb-2">
      <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-white mb-2">Component Error</h3>
    <p className="text-slate-300 text-sm mb-4">
      {error.message || 'Failed to load component'}
    </p>
    <button
      onClick={resetError}
      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
    >
      Try Again
    </button>
  </div>
);

export const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  children, 
  fallback,
  className,
  height,
  errorFallback: ErrorFallback = DefaultErrorFallback
}) => {
  const loadingFallback = fallback || <DefaultFallback height={height} className={className} />;

  return (
    <ErrorBoundary fallback={ErrorFallback}>
      <Suspense fallback={loadingFallback}>
        <div className={className}>
          {children}
        </div>
      </Suspense>
    </ErrorBoundary>
  );
};

/**
 * Enhanced HOC for lazy loading components with better type safety
 */
export const withLazyLoading = <P extends object>(
  Component: React.ComponentType<P>,
  options: {
    fallback?: React.ReactNode;
    height?: string;
    className?: string;
  } = {}
) => {
  const LazyComponent = React.lazy(() => Promise.resolve({ default: Component }));
  
  return (props: P) => (
    <LazyWrapper 
      fallback={options.fallback}
      height={options.height}
      className={options.className}
    >
      <LazyComponent {...props} />
    </LazyWrapper>
  );
};

/**
 * Utility function to create lazy components from dynamic imports
 */
export const createLazyComponent = <T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  options: {
    fallback?: React.ReactNode;
    height?: string;
    className?: string;
  } = {}
) => {
  const LazyComponent = React.lazy(componentImport);
  
  return (props: React.ComponentProps<T>) => (
    <LazyWrapper {...options}>
      <LazyComponent {...props} />
    </LazyWrapper>
  );
};

export default LazyWrapper;