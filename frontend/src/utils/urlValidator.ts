/**
 * Comprehensive URL validation utilities for the OpsSight platform.
 * Provides validation for different URL types and contexts.
 */

import React from 'react';

export interface URLValidationOptions {
  allowedProtocols?: string[];
  allowedDomains?: string[];
  allowedPorts?: number[];
  requireHTTPS?: boolean;
  allowLocalhost?: boolean;
  allowIPAddresses?: boolean;
  maxLength?: number;
}

export interface URLValidationResult {
  isValid: boolean;
  errors: string[];
  url?: URL;
}

export class URLValidator {
  private static readonly DEFAULT_OPTIONS: URLValidationOptions = {
    allowedProtocols: ['https:', 'http:'],
    requireHTTPS: false,
    allowLocalhost: true,
    allowIPAddresses: true,
    maxLength: 2048,
  };

  /**
   * Comprehensive URL validation
   * 
   * @param urlString - URL string to validate
   * @param options - Validation options
   * @returns Validation result with details
   */
  static validate(
    urlString: string,
    options: URLValidationOptions = {}
  ): URLValidationResult {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const errors: string[] = [];

    // Basic type and length checks
    if (typeof urlString !== 'string') {
      return { isValid: false, errors: ['URL must be a string'] };
    }

    if (urlString.length === 0) {
      return { isValid: false, errors: ['URL cannot be empty'] };
    }

    if (urlString.length > opts.maxLength!) {
      errors.push(`URL exceeds maximum length of ${opts.maxLength} characters`);
    }

    // Parse URL
    let url: URL;
    try {
      url = new URL(urlString.trim());
    } catch (error) {
      return { isValid: false, errors: ['Invalid URL format'] };
    }

    // Protocol validation
    if (opts.allowedProtocols && !opts.allowedProtocols.includes(url.protocol)) {
      errors.push(`Protocol '${url.protocol}' is not allowed. Allowed: ${opts.allowedProtocols.join(', ')}`);
    }

    // HTTPS requirement
    if (opts.requireHTTPS && url.protocol !== 'https:') {
      errors.push('HTTPS is required');
    }

    // Domain validation
    if (opts.allowedDomains && !opts.allowedDomains.includes(url.hostname)) {
      errors.push(`Domain '${url.hostname}' is not allowed`);
    }

    // Localhost validation
    if (!opts.allowLocalhost && this.isLocalhost(url.hostname)) {
      errors.push('Localhost URLs are not allowed');
    }

    // IP address validation
    if (!opts.allowIPAddresses && this.isIPAddress(url.hostname)) {
      errors.push('IP addresses are not allowed');
    }

    // Port validation
    if (opts.allowedPorts && url.port) {
      const port = parseInt(url.port, 10);
      if (!opts.allowedPorts.includes(port)) {
        errors.push(`Port ${port} is not allowed`);
      }
    }

    // Security checks
    const securityErrors = this.performSecurityChecks(url);
    errors.push(...securityErrors);

    return {
      isValid: errors.length === 0,
      errors,
      url: errors.length === 0 ? url : undefined,
    };
  }

  /**
   * Validate GitHub repository URL
   */
  static validateGitHubURL(urlString: string): URLValidationResult {
    const result = this.validate(urlString, {
      allowedProtocols: ['https:'],
      allowedDomains: ['github.com'],
      requireHTTPS: true,
      allowLocalhost: false,
      allowIPAddresses: false,
    });

    if (!result.isValid) {
      return result;
    }

    // GitHub-specific validation
    const path = result.url!.pathname;
    const githubRepoPattern = /^\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+\/?$/;
    
    if (!githubRepoPattern.test(path)) {
      return {
        isValid: false,
        errors: ['Invalid GitHub repository URL format. Expected: https://github.com/owner/repo'],
      };
    }

    return result;
  }

  /**
   * Validate webhook URL
   */
  static validateWebhookURL(urlString: string): URLValidationResult {
    return this.validate(urlString, {
      allowedProtocols: ['https:'],
      requireHTTPS: true,
      allowLocalhost: false,
      allowIPAddresses: false,
      maxLength: 1024,
    });
  }

  /**
   * Validate Slack webhook URL
   */
  static validateSlackWebhookURL(urlString: string): URLValidationResult {
    const result = this.validate(urlString, {
      allowedProtocols: ['https:'],
      allowedDomains: ['hooks.slack.com'],
      requireHTTPS: true,
      allowLocalhost: false,
      allowIPAddresses: false,
    });

    if (!result.isValid) {
      return result;
    }

    // Slack webhook specific validation
    const path = result.url!.pathname;
    if (!path.startsWith('/services/')) {
      return {
        isValid: false,
        errors: ['Invalid Slack webhook URL format'],
      };
    }

    return result;
  }

  /**
   * Validate API endpoint URL
   */
  static validateAPIEndpoint(urlString: string, allowLocalhost = true): URLValidationResult {
    return this.validate(urlString, {
      allowedProtocols: ['https:', 'http:'],
      requireHTTPS: process.env.NODE_ENV === 'production',
      allowLocalhost,
      allowIPAddresses: allowLocalhost,
    });
  }

  /**
   * Validate avatar/image URL
   */
  static validateImageURL(urlString: string): URLValidationResult {
    const result = this.validate(urlString, {
      allowedProtocols: ['https:', 'http:'],
      requireHTTPS: false,
      allowLocalhost: true,
      allowIPAddresses: true,
      maxLength: 512,
    });

    if (!result.isValid) {
      return result;
    }

    // Check for image file extensions
    const path = result.url!.pathname.toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const hasImageExtension = imageExtensions.some(ext => path.endsWith(ext));
    
    if (!hasImageExtension && !path.includes('avatar') && !path.includes('image')) {
      return {
        isValid: false,
        errors: ['URL does not appear to be an image'],
      };
    }

    return result;
  }

  /**
   * Check if hostname is localhost
   */
  private static isLocalhost(hostname: string): boolean {
    const localhostPatterns = [
      'localhost',
      '127.0.0.1',
      '::1',
      '0.0.0.0',
    ];
    return localhostPatterns.includes(hostname.toLowerCase());
  }

  /**
   * Check if hostname is an IP address
   */
  private static isIPAddress(hostname: string): boolean {
    // IPv4 pattern
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 pattern (simplified)
    const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Pattern.test(hostname) || ipv6Pattern.test(hostname);
  }

  /**
   * Perform security checks on URL
   */
  private static performSecurityChecks(url: URL): string[] {
    const errors: string[] = [];

    // Prevent javascript: URLs
    if (url.protocol === 'javascript:') {
      errors.push('JavaScript URLs are not allowed');
    }

    // Prevent data: URLs
    if (url.protocol === 'data:') {
      errors.push('Data URLs are not allowed');
    }

    // Check for suspicious patterns in the URL
    const urlString = url.toString().toLowerCase();
    const suspiciousPatterns = [
      '<script',
      'javascript:',
      'vbscript:',
      'onload=',
      'onerror=',
      'eval(',
    ];

    for (const pattern of suspiciousPatterns) {
      if (urlString.includes(pattern)) {
        errors.push('URL contains suspicious content');
        break;
      }
    }

    return errors;
  }

  /**
   * Quick validation for common use cases
   */
  static isValidURL(urlString: string): boolean {
    return this.validate(urlString).isValid;
  }

  static isValidHTTPSURL(urlString: string): boolean {
    return this.validate(urlString, { requireHTTPS: true }).isValid;
  }

  static isValidGitHubURL(urlString: string): boolean {
    return this.validateGitHubURL(urlString).isValid;
  }

  static isValidWebhookURL(urlString: string): boolean {
    return this.validateWebhookURL(urlString).isValid;
  }
  }

/**
 * React hook for URL validation
 */
export function useURLValidation(
  url: string,
  options?: URLValidationOptions
): URLValidationResult {
  const [result, setResult] = React.useState<URLValidationResult>({
    isValid: false,
    errors: [],
  });

  React.useEffect(() => {
    if (url) {
      const validationResult = URLValidator.validate(url, options);
      setResult(validationResult);
    } else {
      setResult({ isValid: false, errors: [] });
    }
  }, [url, options]);

  return result;
}

// Export for backward compatibility with existing security.ts
export const validateURL = URLValidator.isValidURL; 