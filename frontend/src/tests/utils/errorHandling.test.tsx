/**
 * Unit tests for error handling utilities.
 * Tests custom error classes, error parsing, and logging functionality.
 */

import {
  AppError,
  ErrorType,
  OAuthError,
  APIError,
  NetworkError,
  CSRFError,
  TokenError,
  OAuthErrorCode,
  parseOAuthError,
  handleFetchError,
  createNetworkError,
  ErrorLogger,
  isRecoverableError,
  sanitizeErrorData,
  handleGlobalError,
} from '../../utils/errorHandling';

// Mock console methods
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  group: jest.fn(),
  groupEnd: jest.fn(),
};

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Test Browser)',
  },
  writable: true,
});

// Mock window.location
Object.defineProperty(global, 'window', {
  value: {
    location: {
      href: 'https://example.com/test',
    },
  },
  writable: true,
});

describe('Error Handling Utilities', () => {
  beforeEach(() => {
    // Reset all mocks
    Object.values(mockConsole).forEach(mock => mock.mockClear());
    
    // Mock console methods
    Object.assign(console, mockConsole);
  });

  describe('AppError', () => {
    it('should create an AppError with all properties', () => {
      const context = { userId: '123', action: 'login' };
      const originalError = new Error('Original error');
      
      const appError = new AppError(
        ErrorType.API_ERROR,
        'Test error message',
        'User-friendly message',
        'TEST_ERROR',
        originalError,
        context
      );

      expect(appError).toBeInstanceOf(Error);
      expect(appError).toBeInstanceOf(AppError);
      expect(appError.name).toBe('AppError');
      expect(appError.type).toBe(ErrorType.API_ERROR);
      expect(appError.message).toBe('Test error message');
      expect(appError.userMessage).toBe('User-friendly message');
      expect(appError.code).toBe('TEST_ERROR');
      expect(appError.originalError).toBe(originalError);
      expect(appError.context).toEqual(context);
      expect(appError.timestamp).toBeInstanceOf(Date);
    });

    it('should create an AppError with minimal parameters', () => {
      const appError = new AppError(
        ErrorType.NETWORK_ERROR,
        'Network failed',
        'Please check your connection'
      );

      expect(appError.type).toBe(ErrorType.NETWORK_ERROR);
      expect(appError.message).toBe('Network failed');
      expect(appError.userMessage).toBe('Please check your connection');
      expect(appError.code).toBeUndefined();
      expect(appError.originalError).toBeUndefined();
      expect(appError.context).toBeUndefined();
    });
  });

  describe('OAuthError', () => {
    it('should create an OAuthError with proper user message', () => {
      const oauthError = new OAuthError(
        OAuthErrorCode.ACCESS_DENIED,
        'User denied access',
        'state123',
        { redirectUrl: '/login' }
      );

      expect(oauthError).toBeInstanceOf(AppError);
      expect(oauthError.type).toBe(ErrorType.OAUTH_ERROR);
      expect(oauthError.code).toBe(OAuthErrorCode.ACCESS_DENIED);
      expect(oauthError.message).toBe('OAuth Error: access_denied - User denied access');
      expect(oauthError.userMessage).toBe('You denied access to the application. Please try again if you want to continue.');
      expect(oauthError.context).toEqual({
        redirectUrl: '/login',
        state: 'state123',
        description: 'User denied access',
      });
    });

    it('should handle unknown OAuth error codes', () => {
      const oauthError = new OAuthError('unknown_error');

      expect(oauthError.userMessage).toBe('An authentication error occurred. Please try again.');
    });
  });

  describe('APIError', () => {
    it('should create an APIError with status information', () => {
      const apiError = new APIError(
        404,
        'Not Found',
        'Resource not found',
        'Custom user message',
        { resource: 'user' }
      );

      expect(apiError).toBeInstanceOf(AppError);
      expect(apiError.type).toBe(ErrorType.API_ERROR);
      expect(apiError.status).toBe(404);
      expect(apiError.statusText).toBe('Not Found');
      expect(apiError.message).toBe('API Error 404: Resource not found');
      expect(apiError.userMessage).toBe('Custom user message');
      expect(apiError.code).toBe('404');
    });

    it('should use default user message for known status codes', () => {
      const apiError = new APIError(401, 'Unauthorized', 'Token expired');

      expect(apiError.userMessage).toBe('Your session has expired. Please log in again.');
    });

    it('should use generic message for unknown status codes', () => {
      const apiError = new APIError(418, "I'm a teapot", 'Teapot error');

      expect(apiError.userMessage).toBe('An error occurred with your request. Please try again.');
    });
  });

  describe('NetworkError', () => {
    it('should create a NetworkError with original error', () => {
      const originalError = new TypeError('Failed to fetch');
      const networkError = new NetworkError('Connection failed', originalError, { url: 'https://api.example.com' });

      expect(networkError).toBeInstanceOf(AppError);
      expect(networkError.type).toBe(ErrorType.NETWORK_ERROR);
      expect(networkError.message).toBe('Network Error: Connection failed');
      expect(networkError.userMessage).toBe('Unable to connect to the server. Please check your internet connection and try again.');
      expect(networkError.originalError).toBe(originalError);
    });
  });

  describe('CSRFError', () => {
    it('should create a CSRFError with security message', () => {
      const csrfError = new CSRFError('Token mismatch', { expectedToken: 'abc', actualToken: 'xyz' });

      expect(csrfError).toBeInstanceOf(AppError);
      expect(csrfError.type).toBe(ErrorType.CSRF_ERROR);
      expect(csrfError.message).toBe('CSRF Error: Token mismatch');
      expect(csrfError.userMessage).toBe('Security validation failed. Please try logging in again.');
      expect(csrfError.code).toBe('CSRF_ERROR');
    });
  });

  describe('TokenError', () => {
    it('should create a TokenError with custom code', () => {
      const tokenError = new TokenError('JWT expired', 'JWT_EXPIRED', { tokenType: 'access' });

      expect(tokenError).toBeInstanceOf(AppError);
      expect(tokenError.type).toBe(ErrorType.TOKEN_ERROR);
      expect(tokenError.message).toBe('Token Error: JWT expired');
      expect(tokenError.userMessage).toBe('Your session has expired. Please log in again.');
      expect(tokenError.code).toBe('JWT_EXPIRED');
    });

    it('should use default code when not provided', () => {
      const tokenError = new TokenError('Invalid token');

      expect(tokenError.code).toBe('TOKEN_ERROR');
    });
  });

  describe('parseOAuthError', () => {
    it('should return null when no error parameter exists', () => {
      const searchParams = new URLSearchParams('code=123&state=abc');
      const result = parseOAuthError(searchParams);

      expect(result).toBeNull();
    });

    it('should parse OAuth error with all parameters', () => {
      const searchParams = new URLSearchParams(
        'error=access_denied&error_description=User%20denied&error_uri=https://docs.github.com&state=state123'
      );
      const result = parseOAuthError(searchParams);

      expect(result).toBeInstanceOf(OAuthError);
      expect(result?.code).toBe('access_denied');
      expect(result?.context?.description).toBe('User denied');
      expect(result?.context?.error_uri).toBe('https://docs.github.com');
      expect(result?.context?.state).toBe('state123');
    });

    it('should parse OAuth error with minimal parameters', () => {
      const searchParams = new URLSearchParams('error=invalid_request');
      const result = parseOAuthError(searchParams);

      expect(result).toBeInstanceOf(OAuthError);
      expect(result?.code).toBe('invalid_request');
    });
  });

  describe('handleFetchError', () => {
    it('should handle JSON error response', async () => {
             const mockResponse = {
         status: 400,
         statusText: 'Bad Request',
         url: 'https://api.example.com/test',
         headers: new Headers({ 'content-type': 'application/json' }),
         json: jest.fn().mockResolvedValue({
           message: 'Validation failed',
           userMessage: 'Please check your input',
         }),
       } as any;

      await expect(handleFetchError(mockResponse, { userId: '123' }))
        .rejects
        .toThrow(APIError);

      const error = await handleFetchError(mockResponse, { userId: '123' }).catch(e => e);
      expect(error.status).toBe(400);
      expect(error.message).toBe('API Error 400: Validation failed');
      expect(error.userMessage).toBe('Please check your input');
    });

    it('should handle text error response', async () => {
             const mockResponse = {
         status: 500,
         statusText: 'Internal Server Error',
         url: 'https://api.example.com/test',
         headers: new Headers({ 'content-type': 'text/plain' }),
         text: jest.fn().mockResolvedValue('Server error occurred'),
       } as any;

      const error = await handleFetchError(mockResponse).catch(e => e);
      expect(error.status).toBe(500);
      expect(error.message).toBe('API Error 500: Server error occurred');
    });

    it('should handle response parsing failure', async () => {
             const mockResponse = {
         status: 502,
         statusText: 'Bad Gateway',
         url: 'https://api.example.com/test',
         headers: new Headers({ 'content-type': 'application/json' }),
         json: jest.fn().mockRejectedValue(new Error('Parse error')),
         text: jest.fn().mockRejectedValue(new Error('Parse error')),
       } as any;

      const error = await handleFetchError(mockResponse).catch(e => e);
      expect(error.status).toBe(502);
      expect(error.message).toBe('API Error 502: Bad Gateway');
    });
  });

  describe('createNetworkError', () => {
    it('should create NetworkError for fetch TypeError', () => {
      const fetchError = new TypeError('Failed to fetch');
      const networkError = createNetworkError(fetchError, { url: 'https://api.example.com' });

      expect(networkError).toBeInstanceOf(NetworkError);
      expect(networkError.message).toBe('Network Error: Failed to fetch data from server');
      expect(networkError.originalError).toBe(fetchError);
    });

    it('should create NetworkError for AbortError', () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      const networkError = createNetworkError(abortError);

      expect(networkError.message).toBe('Network Error: Request was cancelled');
    });

    it('should create NetworkError for generic error', () => {
      const genericError = new Error('Connection timeout');
      const networkError = createNetworkError(genericError);

      expect(networkError.message).toBe('Network Error: Connection timeout');
    });
  });

  describe('ErrorLogger', () => {
    beforeEach(() => {
      // Mock process.env using Object.defineProperty
      jest.spyOn(process.env, 'NODE_ENV', 'get').mockReturnValue('development');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should log error in development mode', () => {
      const error = new AppError(ErrorType.API_ERROR, 'Test error', 'User message', 'TEST_ERROR');
      ErrorLogger.log(error, 'error', { category: 'test' });

      expect(mockConsole.group).toHaveBeenCalledWith('🚨 ERROR: Test error');
      expect(mockConsole.error).toHaveBeenCalledWith('Error Object:', error);
      expect(mockConsole.groupEnd).toHaveBeenCalled();
    });

    it('should log OAuth error with specific method', () => {
      const oauthError = new OAuthError(OAuthErrorCode.ACCESS_DENIED);
      ErrorLogger.logOAuthError(oauthError, { userId: '123' });

      expect(mockConsole.group).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledWith('Error Object:', oauthError);
    });

    it('should log API error with specific method', () => {
      const apiError = new APIError(404, 'Not Found', 'Resource not found');
      ErrorLogger.logAPIError(apiError, { resource: 'user' });

      expect(mockConsole.group).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledWith('Error Object:', apiError);
    });

    it('should log network error with specific method', () => {
      const networkError = new NetworkError('Connection failed');
      ErrorLogger.logNetworkError(networkError, { url: 'https://api.example.com' });

      expect(mockConsole.group).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledWith('Error Object:', networkError);
    });
  });

  describe('handleGlobalError', () => {
    it('should handle AppError', () => {
      const appError = new AppError(ErrorType.API_ERROR, 'Test error', 'User message');
      handleGlobalError(appError, { componentStack: 'Stack trace' });

      expect(mockConsole.group).toHaveBeenCalled();
    });

    it('should wrap generic Error in AppError', () => {
      const genericError = new Error('Generic error');
      handleGlobalError(genericError);

      expect(mockConsole.group).toHaveBeenCalled();
    });
  });

  describe('isRecoverableError', () => {
    it('should return true for recoverable errors', () => {
      const networkError = new NetworkError('Connection failed');
      const apiError = new APIError(500, 'Server Error', 'Server error');

      expect(isRecoverableError(networkError)).toBe(true);
      expect(isRecoverableError(apiError)).toBe(true);
    });

    it('should return false for non-recoverable errors', () => {
      const forbiddenError = new APIError(403, 'Forbidden', 'Access denied');
      const csrfError = new CSRFError('CSRF token invalid');

      expect(isRecoverableError(forbiddenError)).toBe(false);
      expect(isRecoverableError(csrfError)).toBe(false);
    });

    it('should return false for generic errors', () => {
      const genericError = new Error('Generic error');

      expect(isRecoverableError(genericError)).toBe(false);
    });
  });

  describe('sanitizeErrorData', () => {
    it('should sanitize sensitive data', () => {
      const sensitiveData = {
        username: 'john',
        password: 'secret123',
        authorization: 'Bearer token123',
        nested: {
          apiKey: 'key123',
          publicData: 'safe',
        },
      };

      const sanitized = sanitizeErrorData(sensitiveData);

      expect(sanitized.username).toBe('john');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.authorization).toBe('[REDACTED]');
      expect(sanitized.nested.apiKey).toBe('[REDACTED]');
      expect(sanitized.nested.publicData).toBe('safe');
    });

    it('should handle non-object data', () => {
      expect(sanitizeErrorData('string')).toBe('string');
      expect(sanitizeErrorData(123)).toBe(123);
      expect(sanitizeErrorData(null)).toBe(null);
      expect(sanitizeErrorData(undefined)).toBe(undefined);
    });

    it('should handle arrays', () => {
      const arrayData = [
        { password: 'secret' },
        { publicData: 'safe' },
      ];

      const sanitized = sanitizeErrorData(arrayData);
      expect(sanitized[0].password).toBe('[REDACTED]');
      expect(sanitized[1].publicData).toBe('safe');
    });
  });
}); 