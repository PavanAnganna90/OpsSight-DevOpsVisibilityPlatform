/**
 * Security Provider Component
 * 
 * Provides centralized security context and utilities for the application
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { CSRFProtection, RateLimiter } from '@/utils/security';

interface SecurityContextType {
  csrfToken: string | null;
  generateCSRFToken: () => string;
  validateCSRFToken: (token: string) => boolean;
  isRateLimited: (key: string) => boolean;
  recordAttempt: (key: string) => void;
  clearAttempts: (key: string) => void;
  securityConfig: {
    csrfEnabled: boolean;
    rateLimitEnabled: boolean;
    inputValidationEnabled: boolean;
    maxLoginAttempts: number;
    loginRetryDelay: number;
  };
  updateSecurityConfig: (config: Partial<SecurityContextType['securityConfig']>) => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: ReactNode;
  initialConfig?: Partial<SecurityContextType['securityConfig']>;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ 
  children, 
  initialConfig = {} 
}) => {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [securityConfig, setSecurityConfig] = useState<SecurityContextType['securityConfig']>({
    csrfEnabled: true,
    rateLimitEnabled: true,
    inputValidationEnabled: true,
    maxLoginAttempts: 5,
    loginRetryDelay: 60000, // 1 minute
    ...initialConfig,
  });

  // Initialize CSRF token
  useEffect(() => {
    if (securityConfig.csrfEnabled) {
      const token = CSRFProtection.getToken() || CSRFProtection.generateToken();
      setCsrfToken(token);
    }
  }, [securityConfig.csrfEnabled]);

  // Set up security headers check
  useEffect(() => {
    const checkSecurityHeaders = () => {
      const missingHeaders: string[] = [];
      
      // Check for CSP
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (!cspMeta) {
        missingHeaders.push('Content-Security-Policy');
      }
      
      // Check for other security headers (these would be in response headers, not meta tags)
      // This is more of a development warning
      if (process.env.NODE_ENV === 'development' && missingHeaders.length > 0) {
        console.warn('Missing security headers:', missingHeaders);
      }
    };

    checkSecurityHeaders();
  }, []);

  // Generate CSRF token
  const generateCSRFToken = (): string => {
    if (!securityConfig.csrfEnabled) {
      return '';
    }
    
    const token = CSRFProtection.generateToken();
    setCsrfToken(token);
    return token;
  };

  // Validate CSRF token
  const validateCSRFToken = (token: string): boolean => {
    if (!securityConfig.csrfEnabled) {
      return true;
    }
    
    try {
      return CSRFProtection.validateToken(token);
    } catch {
      return false;
    }
  };

  // Check if action is rate limited
  const isRateLimited = (key: string): boolean => {
    if (!securityConfig.rateLimitEnabled) {
      return false;
    }
    
    return !RateLimiter.isAllowed(
      key,
      securityConfig.maxLoginAttempts,
      securityConfig.loginRetryDelay
    );
  };

  // Record attempt
  const recordAttempt = (key: string): void => {
    if (!securityConfig.rateLimitEnabled) {
      return;
    }
    
    RateLimiter.recordAttempt(
      key,
      securityConfig.maxLoginAttempts,
      securityConfig.loginRetryDelay
    );
  };

  // Clear attempts
  const clearAttempts = (key: string): void => {
    if (!securityConfig.rateLimitEnabled) {
      return;
    }
    
    RateLimiter.clearAttempts(key);
  };

  // Update security config
  const updateSecurityConfig = (config: Partial<SecurityContextType['securityConfig']>): void => {
    setSecurityConfig(prev => ({ ...prev, ...config }));
  };

  const contextValue: SecurityContextType = {
    csrfToken,
    generateCSRFToken,
    validateCSRFToken,
    isRateLimited,
    recordAttempt,
    clearAttempts,
    securityConfig,
    updateSecurityConfig,
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  );
};

/**
 * Hook to use security context
 */
export const useSecurity = (): SecurityContextType => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

/**
 * HOC to add security features to components
 */
export const withSecurity = <P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> => {
  return function WithSecurityComponent(props: P) {
    const security = useSecurity();
    
    return <Component {...props} security={security} />;
  };
};

/**
 * Security audit hook for development
 */
export const useSecurityAudit = () => {
  const security = useSecurity();
  
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const auditResults = {
        csrfEnabled: security.securityConfig.csrfEnabled,
        rateLimitEnabled: security.securityConfig.rateLimitEnabled,
        inputValidationEnabled: security.securityConfig.inputValidationEnabled,
        csrfTokenPresent: !!security.csrfToken,
        secureHeaders: {
          csp: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
          xFrameOptions: true, // Set in next.config.js
          contentTypeOptions: true, // Set in next.config.js
          xssProtection: true, // Set in next.config.js
        },
        localStorage: {
          hasTokens: !!(localStorage.getItem('opsight_access_token')),
          hasSecureStorage: typeof Storage !== 'undefined',
        },
        https: location.protocol === 'https:',
      };
      
      console.group('🔒 Security Audit Results');
      console.table(auditResults);
      
      // Security recommendations
      const recommendations: string[] = [];
      
      if (!auditResults.csrfEnabled) {
        recommendations.push('Enable CSRF protection');
      }
      
      if (!auditResults.rateLimitEnabled) {
        recommendations.push('Enable rate limiting');
      }
      
      if (!auditResults.https && location.hostname !== 'localhost') {
        recommendations.push('Use HTTPS in production');
      }
      
      if (!auditResults.secureHeaders.csp) {
        recommendations.push('Add Content Security Policy');
      }
      
      if (recommendations.length > 0) {
        console.warn('Security Recommendations:', recommendations);
      } else {
        console.log('✅ All security checks passed');
      }
      
      console.groupEnd();
    }
  }, [security]);
};

export default SecurityProvider;