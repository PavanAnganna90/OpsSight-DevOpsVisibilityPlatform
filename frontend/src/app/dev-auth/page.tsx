'use client';

import React from 'react';
import { DevBypassComponent } from '@/components/auth/DevBypass';

// Force dynamic rendering to avoid static generation errors with useToast
export const dynamic = 'force-dynamic';

export default function DevAuthPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Development Authentication</h1>
          <p className="text-muted-foreground">
            Bypass SSO for development and testing
          </p>
        </div>
        
        <DevBypassComponent />
        
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Development mode only - this page will not be available in production
          </p>
          <div className="text-xs text-muted-foreground">
            Environment: {process.env.NODE_ENV || 'development'}
          </div>
        </div>
      </div>
    </div>
  );
}