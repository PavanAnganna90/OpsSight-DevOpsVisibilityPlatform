'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
  redirectTo?: string;
}

/**
 * ProtectedRoute Component
 * 
 * Wraps components that require authentication and/or specific permissions.
 * Redirects to login page if user is not authenticated.
 */
export function ProtectedRoute({
  children,
  fallback,
  requiredPermission,
  requiredRole,
  redirectTo = '/auth/sso'
}: ProtectedRouteProps) {
  const { state, hasPermission, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!state.isLoading && !state.isAuthenticated) {
      router.push(redirectTo);
    }
  }, [state.isAuthenticated, state.isLoading, router, redirectTo]);

  // Show loading while checking authentication
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!state.isAuthenticated) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center">
          <div className="bg-white shadow-lg rounded-lg p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please sign in to access this page.</p>
            <button
              onClick={() => router.push(redirectTo)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check required permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center">
          <div className="bg-white shadow-lg rounded-lg p-8">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Access Denied</h2>
            <p className="text-red-600 mb-4">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check required role
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center">
          <div className="bg-white shadow-lg rounded-lg p-8">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Access Denied</h2>
            <p className="text-red-600 mb-4">
              You don't have the required role to access this page.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // All checks passed, render children
  return <>{children}</>;
}

export default ProtectedRoute;