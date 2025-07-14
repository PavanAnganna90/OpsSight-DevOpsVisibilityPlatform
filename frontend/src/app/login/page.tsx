'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FaGithub } from 'react-icons/fa';

/**
 * Login page component with GitHub OAuth button
 */
export default function LoginPage() {
  const router = useRouter();
  const { state, login } = useAuth();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (state.isAuthenticated) {
      router.push('/dashboard');
    }
  }, [state.isAuthenticated, router]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        // Note: clearError method not available in current AuthContext
        // Error will be cleared on next auth action
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to OpsSight
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Your DevOps Visibility Platform
          </p>
        </div>

        {/* Error Alert */}
        {state.error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{state.error}</span>
          </div>
        )}

        <div className="mt-8 space-y-6">
          <button
            onClick={() => {
              // Redirect to GitHub OAuth
              window.location.href = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1'}/auth/github/login`;
            }}
            disabled={state.isLoading}
            className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
              state.isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800'
            }`}
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <FaGithub className="h-5 w-5" />
            </span>
            {state.isLoading ? 'Connecting...' : 'Continue with GitHub'}
          </button>

          <div className="text-sm text-center text-gray-600">
            <p>By continuing, you agree to our</p>
            <a href="/terms" className="font-medium text-indigo-600 hover:text-indigo-500">
              Terms of Service
            </a>
            {' and '}
            <a href="/privacy" className="font-medium text-indigo-600 hover:text-indigo-500">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 