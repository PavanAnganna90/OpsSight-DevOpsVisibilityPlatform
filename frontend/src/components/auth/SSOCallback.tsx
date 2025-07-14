/**
 * SSO Callback Handler Component
 * 
 * Handles OAuth2 and SAML SSO callbacks after user authentication
 */

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

interface CallbackState {
  status: 'processing' | 'success' | 'error';
  message: string;
  provider?: string;
  error?: string;
}

export function SSOCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [callbackState, setCallbackState] = useState<CallbackState>({
    status: 'processing',
    message: 'Processing authentication...'
  });

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Get callback parameters
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      const samlResponse = searchParams.get('SAMLResponse');
      const relayState = searchParams.get('RelayState');

      // Handle OAuth error
      if (error) {
        setCallbackState({
          status: 'error',
          message: `Authentication failed: ${errorDescription || error}`,
          error: error
        });
        return;
      }

      // Determine if this is OAuth or SAML callback
      const isOAuth = code && state;
      const isSAML = samlResponse;

      if (isOAuth) {
        await handleOAuthCallback(code, state);
      } else if (isSAML) {
        await handleSAMLCallback(samlResponse, relayState);
      } else {
        setCallbackState({
          status: 'error',
          message: 'Invalid callback parameters',
          error: 'missing_parameters'
        });
      }
    } catch (error) {
      console.error('Callback handling error:', error);
      setCallbackState({
        status: 'error',
        message: 'Authentication failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      // Get stored OAuth state
      const storedState = sessionStorage.getItem('oauth_state');
      const provider = sessionStorage.getItem('oauth_provider');
      const redirectUrl = sessionStorage.getItem('oauth_redirect_url') || '/dashboard';

      // Validate state
      if (!storedState || storedState !== state) {
        throw new Error('Invalid OAuth state parameter');
      }

      if (!provider) {
        throw new Error('OAuth provider not found in session');
      }

      setCallbackState({
        status: 'processing',
        message: `Completing ${provider} authentication...`,
        provider
      });

      // Complete OAuth flow
      const response = await fetch(`/api/v1/auth/oauth/${provider}/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          code,
          state,
          redirect_uri: `${window.location.origin}/auth/callback`
        }),
      });

      if (!response.ok) {
        throw new Error('OAuth callback request failed');
      }

      const data = await response.json();

      if (data.success) {
        // Store tokens
        if (data.access_token) {
          localStorage.setItem('token', data.access_token);
        }

        // Clear session storage
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_provider');
        sessionStorage.removeItem('oauth_redirect_url');

        setCallbackState({
          status: 'success',
          message: `Successfully authenticated with ${provider}`,
          provider
        });

        // Redirect after success
        setTimeout(() => {
          router.push(redirectUrl);
        }, 2000);
      } else {
        throw new Error(data.error_description || data.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      setCallbackState({
        status: 'error',
        message: `OAuth authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleSAMLCallback = async (samlResponse: string, relayState: string | null) => {
    try {
      // Get stored SAML state
      const storedState = sessionStorage.getItem('saml_state');
      const provider = sessionStorage.getItem('saml_provider');
      const redirectUrl = sessionStorage.getItem('saml_redirect_url') || '/dashboard';

      // Validate state if provided
      if (relayState && storedState && storedState !== relayState) {
        throw new Error('Invalid SAML RelayState parameter');
      }

      if (!provider) {
        throw new Error('SAML provider not found in session');
      }

      setCallbackState({
        status: 'processing',
        message: `Completing ${provider} authentication...`,
        provider
      });

      // Complete SAML flow
      const response = await fetch(`/api/v1/auth/saml/${provider}/acs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          saml_response: samlResponse,
          relay_state: relayState
        }),
      });

      if (!response.ok) {
        throw new Error('SAML callback request failed');
      }

      const data = await response.json();

      if (data.success) {
        // Store tokens
        if (data.access_token) {
          localStorage.setItem('token', data.access_token);
        }

        // Clear session storage
        sessionStorage.removeItem('saml_state');
        sessionStorage.removeItem('saml_provider');
        sessionStorage.removeItem('saml_redirect_url');

        setCallbackState({
          status: 'success',
          message: `Successfully authenticated with ${provider}`,
          provider
        });

        // Redirect after success
        setTimeout(() => {
          router.push(redirectUrl);
        }, 2000);
      } else {
        throw new Error(data.error_description || data.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('SAML callback error:', error);
      setCallbackState({
        status: 'error',
        message: `SAML authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleRetry = () => {
    // Clear any stored state and redirect to login
    sessionStorage.removeItem('oauth_state');
    sessionStorage.removeItem('oauth_provider');
    sessionStorage.removeItem('oauth_redirect_url');
    sessionStorage.removeItem('saml_state');
    sessionStorage.removeItem('saml_provider');
    sessionStorage.removeItem('saml_redirect_url');
    
    router.push('/auth/sso');
  };

  const getStatusIcon = () => {
    switch (callbackState.status) {
      case 'processing':
        return <ArrowPathIcon className="h-16 w-16 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircleIcon className="h-16 w-16 text-green-600" />;
      case 'error':
        return <XCircleIcon className="h-16 w-16 text-red-600" />;
      default:
        return <ArrowPathIcon className="h-16 w-16 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (callbackState.status) {
      case 'processing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="mb-6">
            {getStatusIcon()}
          </div>
          
          <h1 className={`text-2xl font-bold mb-2 ${getStatusColor()}`}>
            {callbackState.status === 'processing' && 'Authenticating...'}
            {callbackState.status === 'success' && 'Success!'}
            {callbackState.status === 'error' && 'Authentication Failed'}
          </h1>
          
          <p className="text-gray-600 mb-6">
            {callbackState.message}
          </p>

          {callbackState.provider && (
            <p className="text-sm text-gray-500 mb-4">
              Provider: {callbackState.provider.replace('_', ' ').toUpperCase()}
            </p>
          )}

          {callbackState.status === 'success' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <CheckCircleIcon className="h-5 w-5" />
                <span className="text-sm">Redirecting to dashboard...</span>
              </div>
            </div>
          )}

          {callbackState.status === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-700">
                  {callbackState.error || 'Please try again or contact support if the issue persists.'}
                </p>
              </div>
              
              <div className="flex flex-col space-y-2">
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Try Again
                </button>
                
                <button
                  onClick={() => router.push('/auth/login')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Use Standard Login
                </button>
              </div>
            </div>
          )}

          {callbackState.status === 'processing' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2 text-blue-600">
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                <span className="text-sm">Please wait...</span>
              </div>
              <p className="text-xs text-gray-500">
                Do not close this window or navigate away
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SSOCallback;