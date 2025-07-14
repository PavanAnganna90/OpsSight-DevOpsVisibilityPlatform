/**
 * GitHub OAuth login button component.
 * Provides secure OAuth initiation with GitHub's authorization service.
 */

import React from 'react';

// OAuth configuration constants
const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const CLIENT_ID = (import.meta as any).env.VITE_GITHUB_CLIENT_ID;
const REDIRECT_URI = `${window.location.origin}/auth/callback`;
const SCOPE = 'user:email read:user';

interface GitHubLoginButtonProps {
  /** Additional CSS classes for styling */
  className?: string;
  /** Loading state for async operations */
  isLoading?: boolean;
  /** Callback fired when OAuth initiation starts */
  onLoginStart?: () => void;
  /** Button size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Button style variant */
  variant?: 'primary' | 'secondary' | 'outline';
}

/**
 * GitHubLoginButton Component
 * 
 * Renders a secure GitHub OAuth login button that initiates the OAuth flow.
 * Uses design tokens for consistent styling and follows accessibility best practices.
 * 
 * @param props - Component props
 * @returns JSX element representing the GitHub login button
 */
export const GitHubLoginButton: React.FC<GitHubLoginButtonProps> = ({
  className = '',
  isLoading = false,
  onLoginStart,
  size = 'md',
  variant = 'primary',
}) => {
  /**
   * Handle GitHub OAuth initiation.
   * Redirects user to GitHub's authorization endpoint with required parameters.
   */
  const handleGitHubLogin = (): void => {
    if (isLoading) return;

    // Reason: Validate client ID before attempting OAuth
    if (!CLIENT_ID) {
      console.error('GitHub Client ID not configured');
      return;
    }

    // Generate secure state parameter for CSRF protection
    const state = btoa(JSON.stringify({
      timestamp: Date.now(),
      random: Math.random().toString(36).substring(2)
    }));

    // Store state in sessionStorage for validation on callback
    sessionStorage.setItem('github_oauth_state', state);

    // Callback for external handling
    onLoginStart?.();

    // Construct GitHub OAuth URL with required parameters
    const authUrl = new URL(GITHUB_AUTH_URL);
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('scope', SCOPE);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('allow_signup', 'true');

    // Reason: Use window.location.href for full page redirect (OAuth requirement)
    window.location.href = authUrl.toString();
  };

  // Generate CSS classes based on props using design tokens
  const getButtonClasses = (): string => {
    const baseClasses = [
      'inline-flex',
      'items-center',
      'justify-center',
      'font-medium',
      'rounded-lg',
      'transition-colors',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2',
      'disabled:opacity-50',
      'disabled:cursor-not-allowed',
    ];

    // Size variants using design tokens
    const sizeClasses = {
      sm: ['px-3', 'py-2', 'text-sm', 'gap-2'],
      md: ['px-4', 'py-2.5', 'text-base', 'gap-2'],
      lg: ['px-6', 'py-3', 'text-lg', 'gap-3'],
    };

    // Style variants using design tokens
    const variantClasses = {
      primary: [
        'bg-neutral-900',
        'text-neutral-0',
        'hover:bg-neutral-800',
        'focus:ring-neutral-500',
        'border',
        'border-neutral-900',
      ],
      secondary: [
        'bg-neutral-100',
        'text-neutral-900',
        'hover:bg-neutral-200',
        'focus:ring-neutral-400',
        'border',
        'border-neutral-300',
      ],
      outline: [
        'bg-transparent',
        'text-neutral-900',
        'hover:bg-neutral-50',
        'focus:ring-neutral-400',
        'border',
        'border-neutral-300',
      ],
    };

    return [
      ...baseClasses,
      ...sizeClasses[size],
      ...variantClasses[variant],
      className,
    ].join(' ');
  };

  return (
    <button
      type="button"
      onClick={handleGitHubLogin}
      disabled={isLoading}
      className={getButtonClasses()}
      aria-label="Sign in with GitHub"
      data-testid="github-login-button"
    >
      {/* GitHub Icon SVG */}
      <svg
        className={`${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}`}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"
          clipRule="evenodd"
        />
      </svg>

      {/* Button Text */}
      <span>
        {isLoading ? 'Connecting...' : 'Continue with GitHub'}
      </span>

      {/* Loading Spinner */}
      {isLoading && (
        <svg
          className={`animate-spin ${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}`}
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
    </button>
  );
};

export default GitHubLoginButton; 