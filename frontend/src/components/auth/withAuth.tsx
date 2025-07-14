'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Higher-order component for protecting routes that require authentication
 * @param WrappedComponent - The component to wrap with authentication
 * @returns A new component with authentication checks
 */
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function ProtectedRoute(props: P) {
    const router = useRouter();
    const { state } = useAuth();

    useEffect(() => {
      // Only redirect after the initial loading is complete
      if (!state.isLoading && !state.isAuthenticated) {
        // Store the current path for redirect after login
        const currentPath = window.location.pathname;
        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      }
    }, [state.isAuthenticated, state.isLoading, router]);

    // Show nothing while loading
    if (state.isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    // Only render the component if authenticated
    return state.isAuthenticated ? <WrappedComponent {...props} /> : null;
  };
} 