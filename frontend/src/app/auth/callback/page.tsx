'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * OAuth callback handler component content
 * Processes the GitHub OAuth response and updates auth state
 */
function CallbackPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state } = useAuth();

  useEffect(() => {
    async function handleCallback() {
      try {
        // Check for direct token in URL (from GitHub OAuth flow)
        const token = searchParams?.get('token');
        const provider = searchParams?.get('provider');
        const error = searchParams?.get('error');

        if (error) {
          console.error('OAuth error:', error);
          router.push('/auth/sso?error=oauth_failed');
          return;
        }

        if (token) {
          // Direct token flow (GitHub)
          localStorage.setItem('auth_token', token);
          localStorage.setItem('auth_provider', provider || 'github');
          
          // Get redirect URL from session storage
          const redirectUrl = sessionStorage.getItem('oauth_redirect_url') || '/dashboard';
          
          // Clean up
          sessionStorage.removeItem('oauth_state');
          sessionStorage.removeItem('oauth_provider'); 
          sessionStorage.removeItem('oauth_redirect_url');
          
          router.push(redirectUrl);
          return;
        }

        // Fallback: OAuth code flow (for other providers)
        const code = searchParams?.get('code');
        if (!code) {
          throw new Error('No authorization code or token received');
        }

        // Exchange code for tokens via backend OAuth endpoint
        const response = await fetch('/api/v1/auth/oauth/github/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            code,
            redirect_uri: `${window.location.origin}/auth/callback`,
            state: searchParams?.get('state') 
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to authenticate');
        }

        const data = await response.json();

        if (data.access_token) {
          localStorage.setItem('auth_token', data.access_token);
          localStorage.setItem('user_data', JSON.stringify(data.user || {}));
        }

        router.push('/dashboard');
      } catch (error) {
        console.error('Authentication error:', error);
        router.push('/auth/sso?error=auth_failed');
      }
    }

    handleCallback();
  }, [searchParams, router]);

  // Redirect based on auth state
  useEffect(() => {
    if (state.isAuthenticated) {
      router.push('/dashboard');
    } else if (state.error) {
      router.push('/login');
    }
  }, [state.isAuthenticated, state.error, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <h2 className="mt-6 text-xl font-medium text-gray-900">
          Completing authentication...
        </h2>
      </div>
    </div>
  );
}

/**
 * OAuth callback handler component
 * Wrapped in Suspense to handle useSearchParams
 */
export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <h2 className="mt-6 text-xl font-medium text-gray-900">
            Loading...
          </h2>
        </div>
      </div>
    }>
      <CallbackPageContent />
    </Suspense>
  );
}