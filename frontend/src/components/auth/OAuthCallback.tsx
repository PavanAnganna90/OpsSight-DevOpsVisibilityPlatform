/**
 * OAuth callback component for handling GitHub authentication redirects.
 * Processes OAuth authorization code and state parameters from URL.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  parseOAuthError, 
  ErrorLogger, 
  AppError,
  ErrorType,
  OAuthError 
} from '../../utils/errorHandling';
import { 
  InputValidator, 
  CSRFProtection,
  RateLimiter 
} from '../../utils/security';

interface OAuthCallbackProps {
  /** Optional redirect path after successful authentication */
  redirectTo?: string;
  /** Optional error handling callback */
  onError?: (error: string) => void;
  /** Optional success handling callback */
  onSuccess?: () => void;
}

/**
 * OAuth Callback Component
 * 
 * Handles the OAuth redirect from GitHub and processes the authorization code.
 * Validates CSRF state parameter and completes the authentication flow.
 * 
 * Features:
 * - CSRF protection via state parameter validation
 * - Error handling with user-friendly messages
 * - Loading states with proper feedback
 * - Automatic redirect after successful authentication
 * - Support for custom redirect paths
 * 
 * @param redirectTo - Path to redirect to after successful authentication
 * @param onError - Callback function for handling errors
 * @param onSuccess - Callback function for handling success
 */
export const OAuthCallback: React.FC<OAuthCallbackProps> = ({
  redirectTo = '/dashboard',
  onError,
  onSuccess,
}) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processOAuthCallback = async () => {
      const clientIP = 'unknown'; // In production, this would come from headers
      const rateLimitKey = `oauth_callback_${clientIP}`;
      
      try {
        setIsProcessing(true);
        setError(null);

        // Check rate limiting
        if (!RateLimiter.isAllowed(rateLimitKey, 10, 60000)) { // 10 attempts per minute
          throw new AppError(
            ErrorType.VALIDATION_ERROR,
            'Too many authentication attempts',
            'Too many authentication attempts. Please wait a moment and try again.',
            'RATE_LIMITED'
          );
        }

        // Record the attempt
        RateLimiter.recordAttempt(rateLimitKey, 10, 60000);

        // Extract and validate URL parameters
        const urlParams = new URLSearchParams(window.location.search);

        // Check for OAuth errors first using our enhanced error parsing
        const oauthError = parseOAuthError(urlParams);
        if (oauthError) {
          ErrorLogger.logOAuthError(oauthError, {
            url: window.location.href,
            userAgent: navigator.userAgent,
          });
          throw oauthError;
        }

        // Validate OAuth callback parameters using our security utilities
        const validation = InputValidator.validateOAuthCallback(urlParams);
        if (!validation.isValid) {
          const errorMessage = validation.errors.join(', ');
          throw new AppError(
            ErrorType.VALIDATION_ERROR,
            `OAuth callback validation failed: ${errorMessage}`,
            'The authentication response is invalid. Please try logging in again.',
            'VALIDATION_FAILED'
          );
        }

        const code = urlParams.get('code')!; // Safe because validation passed
        const state = urlParams.get('state')!; // Safe because validation passed

        // Validate CSRF state parameter using our security utilities
        try {
          CSRFProtection.validateToken(state);
                 } catch (csrfError) {
           const error = csrfError instanceof Error ? csrfError : new Error('CSRF validation failed');
           ErrorLogger.log(error, 'error', {
             category: 'csrf_validation',
             url: window.location.href,
             providedState: state,
           });
           throw error;
         }

        // Clean up stored CSRF state
        CSRFProtection.clearToken();

        // Complete authentication
        await login(code, state);

        // Clear rate limiting on successful authentication
        RateLimiter.clearAttempts(rateLimitKey);

        // Handle success
        onSuccess?.();

        // Redirect to specified path
        navigate(redirectTo, { replace: true });

      } catch (err) {
        let appError: AppError;
        
        if (err instanceof AppError) {
          appError = err;
        } else if (err instanceof Error) {
          appError = new AppError(
            ErrorType.OAUTH_ERROR,
            err.message,
            'Authentication failed. Please try again.',
            'OAUTH_FAILED',
            err
          );
        } else {
          appError = new AppError(
            ErrorType.UNKNOWN_ERROR,
            'Unknown authentication error',
            'An unexpected error occurred during authentication. Please try again.',
            'UNKNOWN_ERROR'
          );
        }

        // Log the error with context
        ErrorLogger.log(appError, 'error', {
          category: 'oauth_callback',
          url: window.location.href,
          userAgent: navigator.userAgent,
          redirectTo,
        });

        setError(appError.userMessage);
        onError?.(appError.userMessage);

        // Clean up state on error
        CSRFProtection.clearToken();

        // Redirect to login page after a short delay
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      } finally {
        setIsProcessing(false);
      }
    };

    processOAuthCallback();
  }, [login, navigate, redirectTo, onError, onSuccess]);

  /**
   * Render loading spinner.
   */
  const renderLoading = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            Completing Sign In
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we authenticate your GitHub account...
          </p>
        </div>
      </div>
    </div>
  );

  /**
   * Render error state.
   */
  const renderError = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-red-100 p-3">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            Authentication Failed
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {error}
          </p>
          <p className="mt-4 text-xs text-gray-500">
            Redirecting to login page in a few seconds...
          </p>
        </div>
      </div>
    </div>
  );

  // Show error state
  if (error) {
    return renderError();
  }

  // Show loading state
  if (isProcessing) {
    return renderLoading();
  }

  // This should not be reached, but provide fallback
  return null;
};

export default OAuthCallback; 