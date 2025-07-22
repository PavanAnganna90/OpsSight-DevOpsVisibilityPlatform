/**
 * SSO Login Component
 * 
 * Handles OAuth2 and SAML SSO authentication flows
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheckIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';

interface SSOProvider {
  name: string;
  display_name: string;
  icon: string;
  enabled: boolean;
  type: 'oauth2' | 'saml';
}

interface SSOConfig {
  oauth_providers: SSOProvider[];
  saml_providers: SSOProvider[];
  sso_enabled: boolean;
  default_provider?: string;
}

interface SSOLoginProps {
  redirectUrl?: string;
  showTitle?: boolean;
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
}

export function SSOLogin({ 
  redirectUrl = '/dashboard', 
  showTitle = true,
  onSuccess,
  onError 
}: SSOLoginProps) {
  const router = useRouter();
  const [ssoConfig, setSSOConfig] = useState<SSOConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingProvider, setProcessingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
    show: boolean;
  }>({ message: '', type: 'success', show: false });

  useEffect(() => {
    fetchSSOConfig();
  }, []);

  const fetchSSOConfig = async () => {
    try {
      const response = await fetch('/api/v1/auth/sso/config');
      if (!response.ok) {
        throw new Error('Failed to fetch SSO configuration');
      }
      const config = await response.json();
      console.log('SSO Config received:', config);
      setSSOConfig(config);
    } catch (error) {
      console.error('Error fetching SSO config:', error);
      setError('Failed to load SSO providers');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: string) => {
    setProcessingProvider(provider);
    setError(null);

    try {
      // For GitHub with real credentials, redirect directly to GitHub
      if (provider === 'github') {
        const state = generateState();
        sessionStorage.setItem('oauth_state', state);
        sessionStorage.setItem('oauth_provider', provider);
        sessionStorage.setItem('oauth_redirect_url', redirectUrl);
        
        window.location.href = `https://github.com/login/oauth/authorize?client_id=Ov23liGhE29QQWWj0u62&redirect_uri=${encodeURIComponent('http://localhost:8000/auth/callback/github')}&state=${state}&scope=user:email`;
        return;
      }

      // For other providers, try the API endpoint
      const response = await fetch(`/api/v1/auth/sso/oauth/${provider}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          redirect_url: redirectUrl || '/dashboard',
          state: generateState()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to initiate OAuth login' }));
        throw new Error(errorData.detail || errorData.message || 'Failed to initiate OAuth login');
      }

      const data = await response.json();
      
      if (data.success && data.redirect_url) {
        // Store state for callback validation
        sessionStorage.setItem('oauth_state', data.state);
        sessionStorage.setItem('oauth_provider', provider);
        sessionStorage.setItem('oauth_redirect_url', redirectUrl);
        
        // Redirect to OAuth provider
        window.location.href = data.redirect_url;
      } else {
        throw new Error(data.error || 'OAuth login failed');
      }
    } catch (error) {
      console.error('OAuth login error:', error);
      setError(`${provider} login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      showToast(`${provider} login failed`, 'error');
      onError?.(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setProcessingProvider(null);
    }
  };

  const handleSAMLLogin = async (provider: string) => {
    setProcessingProvider(provider);
    setError(null);

    try {
      // Initiate SAML flow
      const response = await fetch(`/api/v1/auth/saml/${provider}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          relay_state: generateState()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate SAML login');
      }

      const data = await response.json();
      
      if (data.success && data.sso_url) {
        // Store state for callback validation
        sessionStorage.setItem('saml_state', data.relay_state);
        sessionStorage.setItem('saml_provider', provider);
        sessionStorage.setItem('saml_redirect_url', redirectUrl);
        
        // Redirect to SAML provider
        window.location.href = data.sso_url;
      } else {
        throw new Error(data.error || 'SAML login failed');
      }
    } catch (error) {
      console.error('SAML login error:', error);
      setError(`${provider} login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      showToast(`${provider} login failed`, 'error');
      onError?.(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setProcessingProvider(null);
    }
  };

  const generateState = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return (
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        );
      case 'github':
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        );
      case 'microsoft':
      case 'azure':
      case 'azure_saml':
        return (
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#F25022" d="M1 1h10v10H1z"/>
            <path fill="#7FBA00" d="M13 1h10v10H13z"/>
            <path fill="#00A4EF" d="M1 13h10v10H1z"/>
            <path fill="#FFB900" d="M13 13h10v10H13z"/>
          </svg>
        );
      case 'okta':
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        );
      default:
        return <ShieldCheckIcon className="h-5 w-5" />;
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type, show: true });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 5000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SSO providers...</p>
        </div>
      </div>
    );
  }

  if (!ssoConfig?.sso_enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center">
          <div className="bg-white shadow-lg rounded-lg p-8">
            <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">SSO Not Available</h2>
            <p className="text-gray-600 mb-6">
              Single Sign-On is not configured for this application.
            </p>
            <Button
              onClick={() => router.push('/auth/login')}
              variant="primary"
            >
              Use Standard Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const allProviders = [
    ...ssoConfig.oauth_providers.map(p => ({ ...p, type: 'oauth2' as const })),
    ...ssoConfig.saml_providers.map(p => ({ ...p, type: 'saml' as const }))
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {showTitle && (
            <div className="mb-8">
              <ShieldCheckIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900">
                Sign in with SSO
              </h1>
              <p className="text-gray-600 mt-2">
                Choose your organization's identity provider
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {allProviders.map((provider) => (
            <Button
              key={provider.name}
              onClick={() => 
                provider.type === 'oauth2' 
                  ? handleOAuthLogin(provider.name)
                  : handleSAMLLogin(provider.name)
              }
              variant="outline"
              className="w-full flex items-center justify-center space-x-3 py-3"
              disabled={!provider.enabled || processingProvider === provider.name}
            >
              {processingProvider === provider.name ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
              ) : (
                getProviderIcon(provider.name)
              )}
              <span>Continue with {provider.display_name}</span>
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          ))}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have access to SSO?{' '}
            <button
              onClick={() => router.push('/auth/login')}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Use standard login
            </button>
          </p>
        </div>

        <div className="text-center text-xs text-gray-500">
          <p>
            By continuing, you agree to our{' '}
            <a href="/terms" className="text-blue-600 hover:text-blue-500">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-blue-600 hover:text-blue-500">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
}

export default SSOLogin;