/**
 * Enhanced Providers Setup
 * 
 * Comprehensive provider composition that integrates all state management solutions:
 * - React Query for server state
 * - Context API for client state  
 * - Centralized state store
 * - Theme management
 * - Error boundaries
 */

'use client';

import React, { ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from 'react-error-boundary';

// Import existing providers
import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { TeamProvider } from '@/contexts/TeamContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ColorModeProvider } from '@/contexts/ColorModeContext';
import { ContextualThemeProvider } from '@/contexts/ContextualThemeProvider';

// Import utilities
import { getQueryClient } from './query-client';
import { getStateStore } from './state-store';

/**
 * Error Fallback Component for Error Boundary
 */
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Application Error
            </h3>
          </div>
        </div>
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-2">
              <summary className="text-sm text-gray-500 cursor-pointer">Error Details</summary>
              <pre className="mt-2 text-xs text-red-600 dark:text-red-400 bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
                {error.message}
                {error.stack}
              </pre>
            </details>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={resetErrorBoundary}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * State Store Provider
 * Initializes the centralized state store
 */
function StateStoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Initialize state store with configuration
    const stateStore = getStateStore({
      debug: process.env.NODE_ENV === 'development',
      storagePrefix: 'opsight'
    });

    // Subscribe to state store events for debugging
    if (process.env.NODE_ENV === 'development') {
      const unsubscribe = stateStore.subscribe((event) => {
        console.log('[StateStore Event]', event);
      });

      return unsubscribe;
    }
  }, []);

  return <>{children}</>;
}

/**
 * React Query Provider with enhanced configuration
 */
function ReactQueryProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
          position="bottom"
        />
      )}
    </QueryClientProvider>
  );
}

/**
 * Core Context Providers
 * Groups all context providers in the correct order
 */
function CoreContextProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SettingsProvider>
        <TeamProvider>
          {children}
        </TeamProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

/**
 * Theme Providers
 * Groups all theme-related providers
 */
function ThemeProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ColorModeProvider>
        <ContextualThemeProvider>
          {children}
        </ContextualThemeProvider>
      </ColorModeProvider>
    </ThemeProvider>
  );
}

/**
 * Root Providers Component
 * 
 * Composes all providers in the correct order with error boundaries.
 * This is the main provider component that should wrap the entire application.
 */
export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
             onError={(error: Error, errorInfo: any) => {
         console.error('Application Error:', error, errorInfo);
         // Here you could send error to monitoring service like Sentry
       }}
      onReset={() => {
        // Clear any persistent state that might be causing issues
        const stateStore = getStateStore();
        stateStore.server.clearCache();
      }}
    >
      <ReactQueryProvider>
        <StateStoreProvider>
          <ThemeProviders>
            <CoreContextProviders>
              {children}
            </CoreContextProviders>
          </ThemeProviders>
        </StateStoreProvider>
      </ReactQueryProvider>
    </ErrorBoundary>
  );
}

/**
 * Lightweight providers for testing
 * Use this in tests when you don't need all providers
 */
export function TestProviders({ children }: { children: ReactNode }) {
  return (
    <ReactQueryProvider>
      <StateStoreProvider>
        {children}
      </StateStoreProvider>
    </ReactQueryProvider>
  );
}

/**
 * Provider utilities for accessing provider instances
 */
export const ProviderUtils = {
  /**
   * Get the current query client instance
   */
  getQueryClient: () => getQueryClient(),

  /**
   * Get the current state store instance
   */
  getStateStore: () => getStateStore(),

  /**
   * Create a scoped provider setup for specific features
   */
  createScopedProviders: (options: {
    includeAuth?: boolean;
    includeTheme?: boolean;
    includeQuery?: boolean;
  }) => {
    const { includeAuth = true, includeTheme = true, includeQuery = true } = options;

    return function ScopedProviders({ children }: { children: ReactNode }) {
      let content = <StateStoreProvider>{children}</StateStoreProvider>;

      if (includeQuery) {
        content = <ReactQueryProvider>{content}</ReactQueryProvider>;
      }

      if (includeTheme) {
        content = <ThemeProviders>{content}</ThemeProviders>;
      }

      if (includeAuth) {
        content = <CoreContextProviders>{content}</CoreContextProviders>;
      }

      return content;
    };
  }
};

export default RootProviders; 