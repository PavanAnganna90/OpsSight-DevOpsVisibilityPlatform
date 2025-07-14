/**
 * Security utilities for OAuth flow and application security.
 * Provides CSRF protection, input validation, and secure token handling.
 */

import { CSRFError, ErrorLogger } from './errorHandling';

/**
 * Security configuration constants
 */
export const SECURITY_CONFIG = {
  // CSRF token length (bytes)
  CSRF_TOKEN_LENGTH: 32,
  
  // Maximum age for CSRF tokens (5 minutes)
  CSRF_TOKEN_MAX_AGE: 5 * 60 * 1000,
  
  // OAuth state parameter length (bytes)
  OAUTH_STATE_LENGTH: 32,
  
  // Maximum length for user input fields
  MAX_INPUT_LENGTH: 1000,
  
  // Allowed URL protocols
  ALLOWED_PROTOCOLS: ['https:', 'http:'],
  
  // Rate limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_RETRY_DELAY: 60 * 1000, // 1 minute
  
  // Token validation
  TOKEN_HEADER_PREFIX: 'Bearer ',
  
  // Content Security Policy
  CSP_NONCE_LENGTH: 16,
} as const;

/**
 * Generate cryptographically secure random bytes
 * 
 * @param length - Number of bytes to generate
 * @returns Base64 encoded random string
 */
export function generateSecureRandom(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * CSRF protection utilities
 */
export class CSRFProtection {
  private static readonly STORAGE_KEY = 'opsight_csrf_token';
  private static readonly TIMESTAMP_KEY = 'opsight_csrf_timestamp';

  /**
   * Generate a new CSRF token
   * 
   * @returns CSRF token string
   */
  static generateToken(): string {
    const token = generateSecureRandom(SECURITY_CONFIG.CSRF_TOKEN_LENGTH);
    const timestamp = Date.now().toString();
    
    try {
      sessionStorage.setItem(this.STORAGE_KEY, token);
      sessionStorage.setItem(this.TIMESTAMP_KEY, timestamp);
    } catch (error) {
      ErrorLogger.log(new Error('Failed to store CSRF token'), 'warn', {
        category: 'csrf',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    
    return token;
  }

  /**
   * Get the current CSRF token
   * 
   * @returns CSRF token or null if not found/expired
   */
  static getToken(): string | null {
    try {
      const token = sessionStorage.getItem(this.STORAGE_KEY);
      const timestampStr = sessionStorage.getItem(this.TIMESTAMP_KEY);
      
      if (!token || !timestampStr) {
        return null;
      }
      
      const timestamp = parseInt(timestampStr, 10);
      const now = Date.now();
      
      // Check if token has expired
      if (now - timestamp > SECURITY_CONFIG.CSRF_TOKEN_MAX_AGE) {
        this.clearToken();
        return null;
      }
      
      return token;
    } catch (error) {
      ErrorLogger.log(new Error('Failed to retrieve CSRF token'), 'warn', {
        category: 'csrf',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Validate a CSRF token
   * 
   * @param token - Token to validate
   * @returns True if token is valid
   */
  static validateToken(token: string): boolean {
    const storedToken = this.getToken();
    
    if (!storedToken) {
      throw new CSRFError('No CSRF token found in session');
    }
    
    if (token !== storedToken) {
      throw new CSRFError('CSRF token mismatch');
    }
    
    return true;
  }

  /**
   * Clear stored CSRF token
   */
  static clearToken(): void {
    try {
      sessionStorage.removeItem(this.STORAGE_KEY);
      sessionStorage.removeItem(this.TIMESTAMP_KEY);
    } catch (error) {
      ErrorLogger.log(new Error('Failed to clear CSRF token'), 'warn', {
        category: 'csrf',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get or generate CSRF token for OAuth state
   * 
   * @returns CSRF token for OAuth state parameter
   */
  static getOAuthState(): string {
    let token = this.getToken();
    
    if (!token) {
      token = this.generateToken();
    }
    
    return token;
  }
}

/**
 * Input validation utilities
 */
export class InputValidator {
  /**
   * Validate string input for XSS protection
   * 
   * @param input - Input string to validate
   * @param maxLength - Maximum allowed length
   * @returns Sanitized input string
   */
  static validateString(input: string, maxLength: number = SECURITY_CONFIG.MAX_INPUT_LENGTH): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }
    
    if (input.length > maxLength) {
      throw new Error(`Input exceeds maximum length of ${maxLength} characters`);
    }
    
    // Basic XSS protection - remove potentially dangerous characters
    return input
      .replace(/[<>'"&]/g, (char) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;',
        };
        return entities[char] || char;
      })
      .trim();
  }

  /**
   * Validate URL for security
   * 
   * @param url - URL to validate
   * @param allowedDomains - Optional list of allowed domains
   * @returns True if URL is valid and safe
   */
  static validateURL(url: string, allowedDomains?: string[]): boolean {
    try {
      const urlObj = new URL(url);
      
      // Check protocol
      if (!SECURITY_CONFIG.ALLOWED_PROTOCOLS.includes(urlObj.protocol as 'https:' | 'http:')) {
        return false;
      }
      
      // Check domain if allowedDomains is provided
      if (allowedDomains && !allowedDomains.includes(urlObj.hostname)) {
        return false;
      }
      
      // Prevent javascript: and data: URLs
      if (urlObj.protocol === 'javascript:' || urlObj.protocol === 'data:') {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate OAuth callback parameters
   * 
   * @param params - URL search parameters
   * @returns Validation result
   */
  static validateOAuthCallback(params: URLSearchParams): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Check for required parameters
    const code = params.get('code');
    const state = params.get('state');
    
    if (!code) {
      errors.push('Authorization code is missing');
    }
    
    if (!state) {
      errors.push('State parameter is missing');
    }
    
    // Validate code format (GitHub authorization codes are alphanumeric)
    if (code && !/^[a-zA-Z0-9]+$/.test(code)) {
      errors.push('Authorization code format is invalid');
    }
    
    // Validate state parameter
    if (state) {
      try {
        CSRFProtection.validateToken(state);
      } catch (error) {
        errors.push('State parameter validation failed');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize user profile data
   * 
   * @param data - User profile data
   * @returns Sanitized profile data
   */
  static sanitizeUserProfile(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    const sanitized = { ...data };
    
    // Sanitize string fields
    const stringFields = ['name', 'email', 'company', 'location', 'bio', 'blog'];
    stringFields.forEach(field => {
      if (typeof sanitized[field] === 'string') {
        sanitized[field] = this.validateString(sanitized[field]);
      }
    });
    
    // Validate URLs
    if (sanitized.avatar_url && !this.validateURL(sanitized.avatar_url)) {
      delete sanitized.avatar_url;
    }
    
    if (sanitized.blog && !this.validateURL(sanitized.blog)) {
      delete sanitized.blog;
    }
    
    return sanitized;
  }
}

/**
 * Secure token handling utilities
 */
export class TokenSecurity {
  private static readonly ACCESS_TOKEN_KEY = 'opsight_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'opsight_refresh_token';
  private static readonly TOKEN_EXPIRY_KEY = 'opsight_token_expiry';

  /**
   * Securely store authentication tokens
   * 
   * @param tokens - Authentication tokens
   */
  static storeTokens(tokens: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  }): void {
    try {
      // Store access token
      localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.access_token);
      
      // Store refresh token if provided
      if (tokens.refresh_token) {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refresh_token);
      }
      
      // Calculate and store expiry time
      if (tokens.expires_in) {
        const expiryTime = Date.now() + (tokens.expires_in * 1000);
        localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
      }
    } catch (error) {
      ErrorLogger.log(new Error('Failed to store authentication tokens'), 'error', {
        category: 'token_storage',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Retrieve stored access token
   * 
   * @returns Access token or null if not found/expired
   */
  static getAccessToken(): string | null {
    try {
      const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
      
      if (!token) {
        return null;
      }
      
      // Check if token has expired
      if (this.isTokenExpired()) {
        this.clearTokens();
        return null;
      }
      
      return token;
    } catch (error) {
      ErrorLogger.log(new Error('Failed to retrieve access token'), 'warn', {
        category: 'token_retrieval',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Retrieve stored refresh token
   * 
   * @returns Refresh token or null if not found
   */
  static getRefreshToken(): string | null {
    try {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      ErrorLogger.log(new Error('Failed to retrieve refresh token'), 'warn', {
        category: 'token_retrieval',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Check if the current token is expired
   * 
   * @returns True if token is expired
   */
  static isTokenExpired(): boolean {
    try {
      const expiryStr = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
      
      if (!expiryStr) {
        return false; // No expiry set, assume token doesn't expire
      }
      
      const expiry = parseInt(expiryStr, 10);
      return Date.now() >= expiry;
    } catch (error) {
      ErrorLogger.log(new Error('Failed to check token expiry'), 'warn', {
        category: 'token_validation',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return true; // Assume expired on error
    }
  }

  /**
   * Clear all stored tokens
   */
  static clearTokens(): void {
    try {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
    } catch (error) {
      ErrorLogger.log(new Error('Failed to clear tokens'), 'warn', {
        category: 'token_cleanup',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get authorization header for API requests
   * 
   * @returns Authorization header value or null
   */
  static getAuthHeader(): string | null {
    const token = this.getAccessToken();
    return token ? `${SECURITY_CONFIG.TOKEN_HEADER_PREFIX}${token}` : null;
  }

  /**
   * Validate JWT token format (basic validation)
   * 
   * @param token - JWT token to validate
   * @returns True if token format is valid
   */
  static validateJWTFormat(token: string): boolean {
    if (typeof token !== 'string') {
      return false;
    }
    
    // JWT should have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }
    
    // Each part should be base64 encoded
    try {
      parts.forEach(part => {
        if (part.length === 0) {
          throw new Error('Empty JWT part');
        }
        // Try to decode base64
        atob(part.replace(/-/g, '+').replace(/_/g, '/'));
      });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Rate limiting utilities
 */
export class RateLimiter {
  private static readonly ATTEMPT_KEY_PREFIX = 'opsight_attempts_';
  private static readonly BLOCK_KEY_PREFIX = 'opsight_blocked_';

  /**
   * Check if an action is rate limited
   * 
   * @param key - Unique key for the action (e.g., 'login_user@example.com')
   * @param maxAttempts - Maximum number of attempts allowed
   * @param windowMs - Time window in milliseconds
   * @returns True if action is allowed, false if rate limited
   */
  static isAllowed(
    key: string,
    maxAttempts: number = SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS,
    windowMs: number = SECURITY_CONFIG.LOGIN_RETRY_DELAY
  ): boolean {
    try {
      const attemptKey = this.ATTEMPT_KEY_PREFIX + key;
      const blockKey = this.BLOCK_KEY_PREFIX + key;
      
      // Check if currently blocked
      const blockedUntil = localStorage.getItem(blockKey);
      if (blockedUntil && Date.now() < parseInt(blockedUntil, 10)) {
        return false;
      }
      
      // Get current attempts
      const attemptsData = localStorage.getItem(attemptKey);
      if (!attemptsData) {
        return true;
      }
      
      const { count, firstAttempt } = JSON.parse(attemptsData);
      const now = Date.now();
      
      // Reset if window has passed
      if (now - firstAttempt > windowMs) {
        localStorage.removeItem(attemptKey);
        localStorage.removeItem(blockKey);
        return true;
      }
      
      // Check if exceeded max attempts
      return count < maxAttempts;
    } catch (error) {
      ErrorLogger.log(new Error('Rate limiter check failed'), 'warn', {
        category: 'rate_limiting',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return true; // Allow on error
    }
  }

  /**
   * Record an attempt
   * 
   * @param key - Unique key for the action
   * @param maxAttempts - Maximum number of attempts allowed
   * @param windowMs - Time window in milliseconds
   */
  static recordAttempt(
    key: string,
    maxAttempts: number = SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS,
    windowMs: number = SECURITY_CONFIG.LOGIN_RETRY_DELAY
  ): void {
    try {
      const attemptKey = this.ATTEMPT_KEY_PREFIX + key;
      const blockKey = this.BLOCK_KEY_PREFIX + key;
      const now = Date.now();
      
      // Get or initialize attempts data
      const attemptsData = localStorage.getItem(attemptKey);
      let attempts = attemptsData 
        ? JSON.parse(attemptsData)
        : { count: 0, firstAttempt: now };
      
      // Reset if window has passed
      if (now - attempts.firstAttempt > windowMs) {
        attempts = { count: 0, firstAttempt: now };
      }
      
      attempts.count += 1;
      
      // Store updated attempts
      localStorage.setItem(attemptKey, JSON.stringify(attempts));
      
      // Block if exceeded max attempts
      if (attempts.count >= maxAttempts) {
        const blockUntil = now + windowMs;
        localStorage.setItem(blockKey, blockUntil.toString());
      }
    } catch (error) {
      ErrorLogger.log(new Error('Failed to record rate limit attempt'), 'warn', {
        category: 'rate_limiting',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Clear rate limiting data for a key
   * 
   * @param key - Unique key for the action
   */
  static clearAttempts(key: string): void {
    try {
      const attemptKey = this.ATTEMPT_KEY_PREFIX + key;
      const blockKey = this.BLOCK_KEY_PREFIX + key;
      
      localStorage.removeItem(attemptKey);
      localStorage.removeItem(blockKey);
    } catch (error) {
      ErrorLogger.log(new Error('Failed to clear rate limiting data'), 'warn', {
        category: 'rate_limiting',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Content Security Policy utilities
 */
export class CSPUtils {
  /**
   * Generate a nonce for CSP
   * 
   * @returns Base64 encoded nonce
   */
  static generateNonce(): string {
    return generateSecureRandom(SECURITY_CONFIG.CSP_NONCE_LENGTH);
  }

  /**
   * Create CSP meta tag with nonce
   * 
   * @param nonce - CSP nonce
   * @returns CSP meta tag HTML
   */
  static createCSPMetaTag(nonce: string): string {
    const cspDirectives = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' https://github.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.github.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://github.com",
    ];
    
    return `<meta http-equiv="Content-Security-Policy" content="${cspDirectives.join('; ')}">`;
  }
} 