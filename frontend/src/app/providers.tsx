'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { TeamProvider } from '@/contexts/TeamContext';

/**
 * Global providers wrapper component
 */
export function Providers({ children }: { children: React.ReactNode }) {
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