/**
 * Secure Form Hook
 * 
 * Provides form validation with security features including input sanitization,
 * CSRF protection, and rate limiting.
 */

import { useState, useEffect, useCallback } from 'react';
import { CSRFProtection, InputValidator, RateLimiter } from '@/utils/security';

interface SecureFormOptions {
  csrfProtection?: boolean;
  rateLimiting?: {
    maxAttempts: number;
    windowMs: number;
    identifier: string;
  };
  inputValidation?: boolean;
}

interface FormField {
  value: string;
  error: string | null;
  touched: boolean;
}

interface SecureFormState {
  fields: Record<string, FormField>;
  isValid: boolean;
  isSubmitting: boolean;
  csrfToken: string | null;
  rateLimitInfo: {
    isBlocked: boolean;
    remainingAttempts: number;
  };
}

/**
 * Hook for secure form handling with built-in security features
 */
export const useSecureForm = (
  initialFields: Record<string, string>,
  options: SecureFormOptions = {}
) => {
  const {
    csrfProtection = true,
    rateLimiting,
    inputValidation = true,
  } = options;

  const [state, setState] = useState<SecureFormState>(() => {
    const fields: Record<string, FormField> = {};
    
    Object.keys(initialFields).forEach(key => {
      fields[key] = {
        value: initialFields[key],
        error: null,
        touched: false,
      };
    });

    return {
      fields,
      isValid: true,
      isSubmitting: false,
      csrfToken: null,
      rateLimitInfo: {
        isBlocked: false,
        remainingAttempts: 0,
      },
    };
  });

  // Initialize CSRF token
  useEffect(() => {
    if (csrfProtection) {
      const token = CSRFProtection.getToken() || CSRFProtection.generateToken();
      setState(prev => ({ ...prev, csrfToken: token }));
    }
  }, [csrfProtection]);

  // Update rate limit info
  useEffect(() => {
    if (rateLimiting) {
      const isBlocked = !RateLimiter.isAllowed(
        rateLimiting.identifier,
        rateLimiting.maxAttempts,
        rateLimiting.windowMs
      );
      
      setState(prev => ({
        ...prev,
        rateLimitInfo: {
          isBlocked,
          remainingAttempts: isBlocked ? 0 : rateLimiting.maxAttempts,
        },
      }));
    }
  }, [rateLimiting]);

  // Validate field value
  const validateField = useCallback((name: string, value: string): string | null => {
    if (!inputValidation) return null;

    try {
      // Basic validation
      if (value.trim() === '') {
        return 'This field is required';
      }

      // Field-specific validation
      switch (name) {
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return 'Please enter a valid email address';
          }
          break;
        case 'password':
          if (value.length < 8) {
            return 'Password must be at least 8 characters long';
          }
          break;
        case 'username':
          if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
            return 'Username can only contain letters, numbers, underscores, and hyphens';
          }
          break;
        case 'url':
          if (!InputValidator.validateURL(value)) {
            return 'Please enter a valid URL';
          }
          break;
        default:
          // Generic string validation
          try {
            InputValidator.validateString(value);
          } catch (error) {
            return error instanceof Error ? error.message : 'Invalid input';
          }
      }

      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Validation error';
    }
  }, [inputValidation]);

  // Update field value
  const updateField = useCallback((name: string, value: string) => {
    setState(prev => {
      const sanitizedValue = inputValidation ? InputValidator.validateString(value) : value;
      const error = validateField(name, sanitizedValue);
      
      const newFields = {
        ...prev.fields,
        [name]: {
          value: sanitizedValue,
          error,
          touched: true,
        },
      };

      // Check if form is valid
      const isValid = Object.values(newFields).every(field => !field.error);

      return {
        ...prev,
        fields: newFields,
        isValid,
      };
    });
  }, [validateField, inputValidation]);

  // Validate all fields
  const validateAllFields = useCallback(() => {
    setState(prev => {
      const newFields = { ...prev.fields };
      let isValid = true;

      Object.keys(newFields).forEach(name => {
        const field = newFields[name];
        const error = validateField(name, field.value);
        
        newFields[name] = {
          ...field,
          error,
          touched: true,
        };

        if (error) {
          isValid = false;
        }
      });

      return {
        ...prev,
        fields: newFields,
        isValid,
      };
    });
  }, [validateField]);

  // Submit form with security checks
  const submitForm = useCallback(async (
    onSubmit: (data: Record<string, string>, csrfToken: string | null) => Promise<void>
  ) => {
    // Check rate limiting
    if (rateLimiting && state.rateLimitInfo.isBlocked) {
      throw new Error('Too many attempts. Please try again later.');
    }

    // Validate all fields
    validateAllFields();

    // Check if form is valid
    if (!state.isValid) {
      throw new Error('Please fix the errors in the form');
    }

    setState(prev => ({ ...prev, isSubmitting: true }));

    try {
      // Record attempt for rate limiting
      if (rateLimiting) {
        RateLimiter.recordAttempt(
          rateLimiting.identifier,
          rateLimiting.maxAttempts,
          rateLimiting.windowMs
        );
      }

      // Prepare form data
      const formData: Record<string, string> = {};
      Object.keys(state.fields).forEach(key => {
        formData[key] = state.fields[key].value;
      });

      // Submit form
      await onSubmit(formData, state.csrfToken);

      // Clear rate limiting on success
      if (rateLimiting) {
        RateLimiter.clearAttempts(rateLimiting.identifier);
      }

    } catch (error) {
      // Update rate limiting info on error
      if (rateLimiting) {
        const isBlocked = !RateLimiter.isAllowed(
          rateLimiting.identifier,
          rateLimiting.maxAttempts,
          rateLimiting.windowMs
        );
        
        setState(prev => ({
          ...prev,
          rateLimitInfo: {
            isBlocked,
            remainingAttempts: isBlocked ? 0 : rateLimiting.maxAttempts,
          },
        }));
      }

      throw error;
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [state, validateAllFields, rateLimiting]);

  // Reset form
  const resetForm = useCallback(() => {
    setState(prev => {
      const fields: Record<string, FormField> = {};
      
      Object.keys(initialFields).forEach(key => {
        fields[key] = {
          value: initialFields[key],
          error: null,
          touched: false,
        };
      });

      return {
        ...prev,
        fields,
        isValid: true,
        isSubmitting: false,
      };
    });
  }, [initialFields]);

  return {
    fields: state.fields,
    isValid: state.isValid,
    isSubmitting: state.isSubmitting,
    csrfToken: state.csrfToken,
    rateLimitInfo: state.rateLimitInfo,
    updateField,
    validateAllFields,
    submitForm,
    resetForm,
  };
};

export default useSecureForm;