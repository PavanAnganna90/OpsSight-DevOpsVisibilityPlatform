'use client';

// Prevent static generation - this page requires client-side context (ToastProvider)
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { LoadingOverlay } from '../../../components/ui/LoadingStates';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface GitHubAuthResponse {
  access_token: string;
  user: {
    id: number;
    login: string;
    name: string;
    email: string;
    avatar_url: string;
  };
  teams: Array<{
    id: number;
    name: string;
    role: string;
    permissions: string[];
  }>;
}

export default function LoginPage() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const router = useRouter();
  const { addToast } = useToast();

  // Check if user is already authenticated
  useEffect(() => {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  // Handle GitHub OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      addToast({
        type: 'error',
        title: 'GitHub OAuth Error',
        description: `Authentication failed: ${error}`,
        duration: 5000
      });
      return;
    }

    if (code && state) {
      handleGitHubCallback(code, state);
    }
  }, [addToast, handleGitHubCallback]);

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginFormData> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      // Simulate API call to backend
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      
      // Store token based on remember me preference
      const storage = formData.rememberMe ? localStorage : sessionStorage;
      storage.setItem('auth_token', data.access_token);
      storage.setItem('user_data', JSON.stringify(data.user));
      
      addToast({
        type: 'success',
        title: 'Login Successful',
        description: `Welcome back, ${data.user.name}!`,
        duration: 3000
      });

      // Redirect to dashboard
      router.push('/dashboard');

    } catch (error) {
      addToast({
        type: 'error',
        title: 'Login Failed',
        description: error instanceof Error ? error.message : 'Invalid email or password',
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    setGithubLoading(true);
    
    try {
      // Generate state for CSRF protection
      const state = btoa(Math.random().toString(36).substr(2));
      localStorage.setItem('github_oauth_state', state);

      // Redirect to GitHub OAuth
      const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || 'your-github-client-id';
      const redirectUri = `${window.location.origin}/auth/login`;
      const scope = 'user:email,read:org';
      
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
      
      window.location.href = githubAuthUrl;

    } catch (error) {
      addToast({
        type: 'error',
        title: 'GitHub OAuth Error',
        description: 'Failed to initiate GitHub authentication',
        duration: 5000
      });
      setGithubLoading(false);
    }
  };

  const handleGitHubCallback = async (code: string, state: string) => {
    setGithubLoading(true);
    
    try {
      // Verify state to prevent CSRF attacks
      const storedState = localStorage.getItem('github_oauth_state');
      if (state !== storedState) {
        throw new Error('Invalid state parameter');
      }
      
      localStorage.removeItem('github_oauth_state');

      // Exchange code for access token
      const response = await fetch('/api/v1/auth/github/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, state }),
      });

      if (!response.ok) {
        throw new Error('GitHub authentication failed');
      }

      const data: GitHubAuthResponse = await response.json();
      
      // Store authentication data
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('user_data', JSON.stringify(data.user));
      localStorage.setItem('user_teams', JSON.stringify(data.teams));
      
      addToast({
        type: 'success',
        title: 'GitHub Login Successful',
        description: `Welcome, ${data.user.name}!`,
        duration: 3000
      });

      // Clean up URL and redirect
      window.history.replaceState({}, document.title, '/auth/login');
      router.push('/dashboard');

    } catch (error) {
      addToast({
        type: 'error',
        title: 'GitHub Authentication Failed',
        description: error instanceof Error ? error.message : 'Authentication failed',
        duration: 5000
      });
      
      // Clean up URL on error
      window.history.replaceState({}, document.title, '/auth/login');
    } finally {
      setGithubLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof LoginFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  return (
    <div className="min-h-screen bg-kassow-dark flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block">
            <div className="flex items-center justify-center space-x-2 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-2xl font-black text-kassow-light tracking-wide">OpsSight</span>
            </div>
          </Link>
          
          <h2 className="text-3xl font-bold text-kassow-light">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Or{' '}
            <Link href="/auth/signup" className="font-medium text-kassow-accent hover:text-kassow-accent-hover transition-colors">
              create a new account
            </Link>
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-kassow-darker/80 backdrop-blur-lg rounded-xl shadow-2xl border border-gray-700/50 p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-kassow-light mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-3 py-3 bg-kassow-dark border rounded-lg shadow-sm placeholder-slate-400 text-kassow-light focus:outline-none focus:ring-2 focus:ring-kassow-accent focus:border-kassow-accent transition-colors ${
                  errors.email ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-kassow-light mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-3 py-3 bg-kassow-dark border rounded-lg shadow-sm placeholder-slate-400 text-kassow-light focus:outline-none focus:ring-2 focus:ring-kassow-accent focus:border-kassow-accent transition-colors ${
                  errors.password ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-kassow-accent focus:ring-kassow-accent border-gray-600 rounded bg-kassow-dark"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-slate-300">
                  Remember me
                </label>
              </div>

              <Link 
                href="/auth/forgot-password" 
                className="text-sm text-kassow-accent hover:text-kassow-accent-hover transition-colors"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kassow-accent focus:ring-offset-kassow-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-kassow-darker text-slate-400">Or continue with</span>
              </div>
            </div>

            {/* GitHub OAuth Button */}
            <button
              type="button"
              onClick={handleGitHubLogin}
              disabled={githubLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-gray-600 rounded-lg shadow-sm text-sm font-medium text-kassow-light bg-kassow-dark hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kassow-accent focus:ring-offset-kassow-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {githubLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-kassow-light" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting to GitHub...
                </div>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Continue with GitHub
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-slate-500">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-kassow-accent hover:text-kassow-accent-hover">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-kassow-accent hover:text-kassow-accent-hover">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>

      {/* Loading Overlay */}
      {(isLoading || githubLoading) && (
        <LoadingOverlay 
          isLoading={true}
          message={githubLoading ? "Connecting to GitHub..." : "Signing you in..."}
        >
          <div></div>
        </LoadingOverlay>
      )}
    </div>
  );
}