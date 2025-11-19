'use client';

import React from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { MonitoringProvider } from '@/components/providers/MonitoringProvider';
import { SecurityProvider } from '@/components/providers/SecurityProvider';
import { AuthProvider } from '@/contexts/DashboardAuthContext'; // Use DashboardAuthContext for full feature set
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ServiceWorkerProvider } from '@/components/providers/ServiceWorkerProvider';
import { TeamProvider } from '@/contexts/TeamContext';
import { SettingsProvider } from '@/contexts/SettingsContext';

/**
 * Global providers wrapper component
 * Wraps the application with all necessary context providers
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <MonitoringProvider>
        <SecurityProvider>
          <AuthProvider>
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
          </AuthProvider>
        </SecurityProvider>
      </MonitoringProvider>
    </QueryProvider>
  );
} 