/**
 * Error handling utilities for OAuth flow and API interactions.
 * Provides centralized error management, logging, and user feedback.
 */

/**
 * Custom error types for OAuth and API operations
 */
export enum ErrorType {
  OAUTH_ERROR = 'OAUTH_ERROR',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CSRF_ERROR = 'CSRF_ERROR',
  TOKEN_ERROR = 'TOKEN_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * OAuth specific error codes from GitHub
 */
export enum OAuthErrorCode {
  ACCESS_DENIED = 'access_denied',
  INVALID_REQUEST = 'invalid_request',
  INVALID_CLIENT = 'invalid_client',
  INVALID_GRANT = 'invalid_grant',
  UNAUTHORIZED_CLIENT = 'unauthorized_client',
  UNSUPPORTED_GRANT_TYPE = 'unsupported_grant_type',
  INVALID_SCOPE = 'invalid_scope',
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly code?: string;
  public readonly userMessage: string;
  public readonly originalError?: Error;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(
    type: ErrorType,
    message: string,
    userMessage: string,
    code?: string,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = code;
    this.userMessage = userMessage;
    this.originalError = originalError;
    this.timestamp = new Date();
    this.context = context;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * OAuth error class for handling OAuth-specific errors
 */
export class OAuthError extends AppError {
  constructor(
    code: string,
    description?: string,
    state?: string,
    context?: Record<string, any>
  ) {
    const userMessage = getOAuthErrorMessage(code);
    const message = `OAuth Error: ${code}${description ? ` - ${description}` : ''}`;
    
    super(
      ErrorType.OAUTH_ERROR,
      message,
      userMessage,
      code,
      undefined,
      { ...context, state, description }
    );
  }
}

/**
 * API error class for handling HTTP API errors
 */
export class APIError extends AppError {
  public readonly status: number;
  public readonly statusText: string;

  constructor(
    status: number,
    statusText: string,
    message: string,
    userMessage?: string,
    context?: Record<string, any>
  ) {
    super(
      ErrorType.API_ERROR,
      `API Error ${status}: ${message}`,
      userMessage || getAPIErrorMessage(status),
      status.toString(),
      undefined,
      { ...context, status, statusText }
    );
    
    this.status = status;
    this.statusText = statusText;
  }
}

/**
 * Network error class for handling network-related errors
 */
export class NetworkError extends AppError {
  constructor(message: string, originalError?: Error, context?: Record<string, any>) {
    super(
      ErrorType.NETWORK_ERROR,
      `Network Error: ${message}`,
      'Unable to connect to the server. Please check your internet connection and try again.',
      'NETWORK_ERROR',
      originalError,
      context
    );
  }
}

/**
 * CSRF error class for handling CSRF token validation errors
 */
export class CSRFError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      ErrorType.CSRF_ERROR,
      `CSRF Error: ${message}`,
      'Security validation failed. Please try logging in again.',
      'CSRF_ERROR',
      undefined,
      context
    );
  }
}

/**
 * Token error class for handling JWT token errors
 */
export class TokenError extends AppError {
  constructor(message: string, code?: string, context?: Record<string, any>) {
    super(
      ErrorType.TOKEN_ERROR,
      `Token Error: ${message}`,
      'Your session has expired. Please log in again.',
      code || 'TOKEN_ERROR',
      undefined,
      context
    );
  }
}

/**
 * Get user-friendly error message for OAuth errors
 * 
 * @param code - OAuth error code
 * @returns User-friendly error message
 */
function getOAuthErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    [OAuthErrorCode.ACCESS_DENIED]: 'You denied access to the application. Please try again if you want to continue.',
    [OAuthErrorCode.INVALID_REQUEST]: 'The authentication request was invalid. Please try again.',
    [OAuthErrorCode.INVALID_CLIENT]: 'There was a problem with the application configuration. Please contact support.',
    [OAuthErrorCode.INVALID_GRANT]: 'The authorization code is invalid or expired. Please try logging in again.',
    [OAuthErrorCode.UNAUTHORIZED_CLIENT]: 'This application is not authorized to use this authentication method.',
    [OAuthErrorCode.UNSUPPORTED_GRANT_TYPE]: 'This authentication method is not supported.',
    [OAuthErrorCode.INVALID_SCOPE]: 'The requested permissions are invalid. Please contact support.',
  };

  return messages[code] || 'An authentication error occurred. Please try again.';
}

/**
 * Get user-friendly error message for API status codes
 * 
 * @param status - HTTP status code
 * @returns User-friendly error message
 */
function getAPIErrorMessage(status: number): string {
  const messages: Record<number, string> = {
    400: 'The request was invalid. Please check your input and try again.',
    401: 'Your session has expired. Please log in again.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'There was a conflict with your request. Please try again.',
    422: 'The provided data is invalid. Please check your input.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'An internal server error occurred. Please try again later.',
    502: 'The server is temporarily unavailable. Please try again later.',
    503: 'The service is temporarily unavailable. Please try again later.',
    504: 'The request timed out. Please try again.',
  };

  if (status >= 500) {
    return 'A server error occurred. Please try again later.';
  } else if (status >= 400) {
    return messages[status] || 'An error occurred with your request. Please try again.';
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Parse and handle OAuth errors from URL parameters
 * 
 * @param searchParams - URL search parameters
 * @returns OAuthError if error parameters are found, null otherwise
 */
export function parseOAuthError(searchParams: URLSearchParams): OAuthError | null {
  const error = searchParams.get('error');
  
  if (!error) {
    return null;
  }

  const errorDescription = searchParams.get('error_description');
  const errorUri = searchParams.get('error_uri');
  const state = searchParams.get('state');

  return new OAuthError(error, errorDescription || undefined, state || undefined, {
    error_uri: errorUri,
  });
}

/**
 * Handle fetch API errors and convert to appropriate error types
 * 
 * @param response - Fetch response object
 * @param context - Additional context for error
 * @returns Promise that rejects with appropriate error type
 */
export async function handleFetchError(
  response: Response,
  context?: Record<string, any>
): Promise<never> {
  let errorData: any = {};
  
  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      errorData = await response.json();
    } else {
      errorData = { message: await response.text() };
    }
  } catch {
    // Ignore JSON parsing errors, use default error data
  }

  const message = errorData.message || errorData.error || response.statusText || 'Unknown error';
  
  throw new APIError(
    response.status,
    response.statusText,
    message,
    errorData.userMessage,
    { ...context, errorData, url: response.url }
  );
}

/**
 * Create a network error from a fetch rejection
 * 
 * @param error - The original error
 * @param context - Additional context
 * @returns NetworkError instance
 */
export function createNetworkError(error: any, context?: Record<string, any>): NetworkError {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new NetworkError('Failed to fetch data from server', error, context);
  }
  
  if (error.name === 'AbortError') {
    return new NetworkError('Request was cancelled', error, context);
  }
  
  return new NetworkError(error.message || 'Network request failed', error, context);
}

/**
 * Error logging utility with different log levels
 */
export class ErrorLogger {
  private static isDevelopment = process.env.NODE_ENV === 'development';
  
  /**
   * Log error to console and potentially external service
   * 
   * @param error - The error to log
   * @param level - Log level (error, warn, info)
   * @param context - Additional context
   */
  static log(
    error: Error | AppError,
    level: 'error' | 'warn' | 'info' = 'error',
    context?: Record<string, any>
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      level,
      message: error.message,
      stack: error.stack,
      context,
      ...(error instanceof AppError && {
        type: error.type,
        code: error.code,
        userMessage: error.userMessage,
        errorContext: error.context,
      }),
    };

    // Console logging in development
    if (this.isDevelopment) {
      console.group(`🚨 ${level.toUpperCase()}: ${error.message}`);
      console.error('Error Object:', error);
      console.error('Log Data:', logData);
      if (error instanceof AppError && error.originalError) {
        console.error('Original Error:', error.originalError);
      }
      console.groupEnd();
    } else {
      // In production, use structured logging
      console[level](JSON.stringify(logData));
    }

    // TODO: Send to external error tracking service (e.g., Sentry, LogRocket)
    // this.sendToErrorService(logData);
  }

  /**
   * Log OAuth-specific errors
   * 
   * @param error - OAuth error
   * @param context - Additional context
   */
  static logOAuthError(error: OAuthError, context?: Record<string, any>): void {
    this.log(error, 'error', {
      ...context,
      category: 'oauth',
      oauthCode: error.code,
    });
  }

  /**
   * Log API errors
   * 
   * @param error - API error
   * @param context - Additional context
   */
  static logAPIError(error: APIError, context?: Record<string, any>): void {
    this.log(error, 'error', {
      ...context,
      category: 'api',
      status: error.status,
      statusText: error.statusText,
    });
  }

  /**
   * Log network errors
   * 
   * @param error - Network error
   * @param context - Additional context
   */
  static logNetworkError(error: NetworkError, context?: Record<string, any>): void {
    this.log(error, 'error', {
      ...context,
      category: 'network',
    });
  }
}

/**
 * Global error handler for unhandled errors
 * 
 * @param error - The unhandled error
 * @param errorInfo - React error info (if from error boundary)
 */
export function handleGlobalError(error: Error, errorInfo?: any): void {
  const appError = error instanceof AppError 
    ? error 
    : new AppError(
        ErrorType.UNKNOWN_ERROR,
        error.message || 'Unknown error occurred',
        'An unexpected error occurred. Please refresh the page and try again.',
        'UNKNOWN_ERROR',
        error
      );

  ErrorLogger.log(appError, 'error', {
    category: 'global',
    errorInfo,
    userAgent: navigator.userAgent,
    url: window.location.href,
  });
}

/**
 * Utility to check if an error is recoverable
 * 
 * @param error - The error to check
 * @returns True if the error is recoverable
 */
export function isRecoverableError(error: Error | AppError): boolean {
  if (error instanceof AppError) {
    // Network errors and some API errors are recoverable
    return error.type === ErrorType.NETWORK_ERROR || 
           (error.type === ErrorType.API_ERROR && error.code !== '403');
  }
  
  return false;
}

/**
 * Utility to sanitize error data for logging (remove sensitive information)
 * 
 * @param data - Data to sanitize
 * @returns Sanitized data
 */
export function sanitizeErrorData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = ['password', 'token', 'key', 'secret', 'authorization'];
  const sanitized = { ...data };

  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeErrorData(sanitized[key]);
    }
  });

  return sanitized;
} 