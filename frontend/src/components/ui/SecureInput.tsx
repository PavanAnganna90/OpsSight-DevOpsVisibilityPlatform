/**
 * Secure Input Component
 * 
 * Input component with built-in security features including input validation,
 * XSS protection, and rate limiting indicators.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { InputValidator } from '@/utils/security';

interface SecureInputProps {
  type?: 'text' | 'email' | 'password' | 'url' | 'tel' | 'search';
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  autoComplete?: string;
  className?: string;
  error?: string | null;
  touched?: boolean;
  showStrengthIndicator?: boolean;
  preventPaste?: boolean;
  sanitizeInput?: boolean;
  validateOnChange?: boolean;
  allowedCharacters?: RegExp;
  customValidation?: (value: string) => string | null;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

/**
 * Secure input component with validation and sanitization
 */
export const SecureInput: React.FC<SecureInputProps> = ({
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  label,
  required = false,
  disabled = false,
  maxLength,
  minLength,
  pattern,
  autoComplete,
  className = '',
  error,
  touched = false,
  showStrengthIndicator = false,
  preventPaste = false,
  sanitizeInput = true,
  validateOnChange = true,
  allowedCharacters,
  customValidation,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}) => {
  const [internalError, setInternalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Validate input value
  const validateInput = useCallback((inputValue: string): string | null => {
    if (!validateOnChange) return null;

    try {
      // Required field validation
      if (required && inputValue.trim() === '') {
        return 'This field is required';
      }

      // Length validation
      if (minLength && inputValue.length < minLength) {
        return `Minimum length is ${minLength} characters`;
      }

      if (maxLength && inputValue.length > maxLength) {
        return `Maximum length is ${maxLength} characters`;
      }

      // Pattern validation
      if (pattern && !new RegExp(pattern).test(inputValue)) {
        return 'Invalid format';
      }

      // Allowed characters validation
      if (allowedCharacters && !allowedCharacters.test(inputValue)) {
        return 'Contains invalid characters';
      }

      // Type-specific validation
      switch (type) {
        case 'email':
          if (inputValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputValue)) {
            return 'Please enter a valid email address';
          }
          break;
        case 'url':
          if (inputValue && !InputValidator.validateURL(inputValue)) {
            return 'Please enter a valid URL';
          }
          break;
        case 'password':
          if (inputValue.length >= 8) {
            // Calculate password strength
            let strength = 0;
            if (/[a-z]/.test(inputValue)) strength += 1;
            if (/[A-Z]/.test(inputValue)) strength += 1;
            if (/\d/.test(inputValue)) strength += 1;
            if (/[@$!%*?&]/.test(inputValue)) strength += 1;
            setPasswordStrength(strength);
          }
          break;
      }

      // Custom validation
      if (customValidation) {
        const customError = customValidation(inputValue);
        if (customError) return customError;
      }

      // Generic security validation
      if (sanitizeInput) {
        InputValidator.validateString(inputValue);
      }

      return null;
    } catch (validationError) {
      return validationError instanceof Error ? validationError.message : 'Invalid input';
    }
  }, [type, required, minLength, maxLength, pattern, allowedCharacters, customValidation, sanitizeInput, validateOnChange]);

  // Handle input change
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = event.target.value;

    // Sanitize input if enabled
    if (sanitizeInput) {
      newValue = InputValidator.validateString(newValue);
    }

    // Validate input
    const validationError = validateInput(newValue);
    setInternalError(validationError);

    // Call parent onChange
    onChange(name, newValue);
  }, [name, onChange, sanitizeInput, validateInput]);

  // Handle paste event
  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLInputElement>) => {
    if (preventPaste) {
      event.preventDefault();
      return;
    }

    if (sanitizeInput) {
      event.preventDefault();
      const pastedText = event.clipboardData.getData('text');
      const sanitizedText = InputValidator.validateString(pastedText);
      
      const newValue = value + sanitizedText;
      const validationError = validateInput(newValue);
      setInternalError(validationError);
      
      onChange(name, newValue);
    }
  }, [preventPaste, sanitizeInput, value, name, onChange, validateInput]);

  // Toggle password visibility
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  // Determine input type
  const inputType = type === 'password' && showPassword ? 'text' : type;

  // Determine if there's an error to display
  const displayError = error || internalError;
  const hasError = touched && displayError;

  // Base input classes
  const inputClasses = [
    'w-full px-3 py-2 border rounded-lg transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
    hasError
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-blue-500',
    'dark:bg-gray-700 dark:border-gray-600 dark:text-white',
    'dark:focus:ring-blue-400 dark:focus:border-blue-400',
    hasError
      ? 'dark:border-red-500 dark:focus:ring-red-400'
      : '',
    className,
  ].filter(Boolean).join(' ');

  // Password strength indicator
  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-yellow-500';
      case 3:
        return 'bg-blue-500';
      case 4:
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return 'Weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      default:
        return '';
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          id={name}
          name={name}
          type={inputType}
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          minLength={minLength}
          pattern={pattern}
          autoComplete={autoComplete}
          className={inputClasses}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-invalid={hasError}
        />

        {/* Password visibility toggle */}
        {type === 'password' && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M18.364 18.364L16.95 16.95m-2.12-2.12L12 12m6.364 6.364L21 21M3 3l18 18" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Password strength indicator */}
      {type === 'password' && showStrengthIndicator && value && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                style={{ width: `${(passwordStrength / 4) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {getPasswordStrengthText()}
            </span>
          </div>
        </div>
      )}

      {/* Error message */}
      {hasError && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
          {displayError}
        </p>
      )}

      {/* Character count */}
      {maxLength && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {value.length} / {maxLength} characters
        </p>
      )}
    </div>
  );
};

export default SecureInput;