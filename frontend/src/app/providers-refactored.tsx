"use client";

import React, { Suspense } from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { MonitoringProvider } from '@/components/providers/MonitoringProvider';
import { SecurityProvider } from '@/components/providers/SecurityProvider';
import { DevAuthProvider } from '@/contexts/DevAuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast';
import { ServiceWorkerProvider } from '@/components/providers/ServiceWorkerProvider';
import { TeamProvider } from '@/contexts/TeamContext';
import { SettingsProvider } from '@/contexts/SettingsContext';

/**
 * Provider Wrapper Component
 * 
 * Architecture Pattern: Evidence-based provider composition
 * - Order matters: outer providers should not depend on inner ones
 * - Each provider is wrapped in error boundaries internally
 * - Lazy loading for performance optimization
 * 
 * Provider Hierarchy (outer → inner):
 * 1. QueryProvider - Data fetching foundation
 * 2. MonitoringProvider - Performance & error tracking
 * 3. SecurityProvider - CSRF, XSS protection
 * 4. DevAuthProvider - Development authentication state (bypasses SSO)
 * 5. TeamProvider - Team context (depends on auth)
 * 6. ThemeProvider - Visual theming
 * 7. SettingsProvider - User preferences
 * 8. ToastProvider - Notification system
 * 9. ServiceWorkerProvider - PWA functionality
 */

interface ProvidersWrapperProps {
  children: React.ReactNode;
}

// Loading fallback component
const ProviderLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
      <p className="text-gray-600 dark:text-gray-400">Initializing OpsSight...</p>
    </div>
  </div>
);

export function ProvidersWrapper({ children }: ProvidersWrapperProps) {
  return (
    <Suspense fallback={<ProviderLoadingFallback />}>
      <QueryProvider>
        <MonitoringProvider>
          <SecurityProvider>
            <DevAuthProvider>
              <TeamProvider>
                <ThemeProvider>
                  <SettingsProvider>
                    <ToastProvider>
                      <ServiceWorkerProvider>
                        {children}
                      </ServiceWorkerProvider>
                    </ToastProvider>
                  </SettingsProvider>
                </ThemeProvider>
              </TeamProvider>
            </DevAuthProvider>
          </SecurityProvider>
        </MonitoringProvider>
      </QueryProvider>
    </Suspense>
  );
}

/**
 * Alternative: Compose providers dynamically for testing
 * This pattern allows for easier testing and provider mocking
 */
export function composeProviders(
  providers: Array<React.ComponentType<{ children: React.ReactNode }>>
) {
  return providers.reduce(
    (AccumulatedProviders, CurrentProvider) => 
      ({ children }: { children: React.ReactNode }) => (
        <AccumulatedProviders>
          <CurrentProvider>{children}</CurrentProvider>
        </AccumulatedProviders>
      ),
    ({ children }: { children: React.ReactNode }) => <>{children}</>
  );
}