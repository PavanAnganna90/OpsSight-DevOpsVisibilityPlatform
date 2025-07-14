/**
 * Checkbox Component
 * 
 * Reusable checkbox component with validation, error states, and accessibility features.
 * Supports various sizes and provides consistent styling across the application.
 */

import React, { forwardRef } from 'react';
import { CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

export interface CheckboxProps {
  /** Whether the checkbox is checked */
  checked: boolean;
  /** Change handler */
  onChange: (checked: boolean) => void;
  /** Checkbox label */
  label?: string;
  /** Help text displayed below the checkbox */
  description?: string;
  /** Error message */
  error?: string;
  /** Whether the checkbox is required */
  required?: boolean;
  /** Whether the checkbox is disabled */
  disabled?: boolean;
  /** Checkbox size */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the checkbox is indeterminate */
  indeterminate?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Checkbox ID */
  id?: string;
  /** ARIA label for accessibility */
  'aria-label'?: string;
  /** ARIA described by */
  'aria-describedby'?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6'
};

const labelSizeClasses = {
  sm: 'text-sm',
  md: 'text-sm',
  lg: 'text-base'
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      checked,
      onChange,
      label,
      description,
      error,
      required = false,
      disabled = false,
      size = 'md',
      indeterminate = false,
      className,
      id,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
    const descriptionId = description ? `${checkboxId}-description` : undefined;
    const errorId = error ? `${checkboxId}-error` : undefined;

    const describedBy = [
      ariaDescribedBy,
      descriptionId,
      errorId
    ].filter(Boolean).join(' ') || undefined;

    // Handle indeterminate state
    React.useEffect(() => {
      if (ref && typeof ref !== 'function' && ref.current) {
        ref.current.indeterminate = indeterminate;
      }
    }, [indeterminate, ref]);

    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-start gap-3">
          {/* Custom Checkbox */}
          <div className="relative flex items-center">
            <input
              ref={ref}
              type="checkbox"
              id={checkboxId}
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
              required={required}
              aria-label={ariaLabel}
              aria-describedby={describedBy}
              aria-invalid={error ? 'true' : 'false'}
              className="sr-only" // Hide the default checkbox
              {...props}
            />
            
            {/* Custom checkbox appearance */}
            <div
              className={cn(
                'flex items-center justify-center rounded border-2 transition-all duration-200',
                'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2',
                sizeClasses[size],
                checked || indeterminate
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600',
                error && 'border-red-500',
                disabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'cursor-pointer hover:border-blue-500'
              )}
              onClick={() => !disabled && onChange(!checked)}
            >
              {checked && !indeterminate && (
                <CheckIcon className={cn(
                  'text-white',
                  size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'
                )} />
              )}
              {indeterminate && (
                <div className={cn(
                  'bg-white rounded-sm',
                  size === 'sm' ? 'h-0.5 w-2' : size === 'md' ? 'h-0.5 w-3' : 'h-1 w-4'
                )} />
              )}
            </div>
          </div>

          {/* Label and Content */}
          {label && (
            <div className="flex-1 min-w-0">
              <label
                htmlFor={checkboxId}
                className={cn(
                  'font-medium cursor-pointer',
                  error 
                    ? 'text-red-700 dark:text-red-400' 
                    : 'text-gray-700 dark:text-gray-300',
                  disabled && 'text-gray-400 dark:text-gray-600 cursor-not-allowed',
                  labelSizeClasses[size]
                )}
              >
                {label}
                {required && (
                  <span className="text-red-500 ml-1" aria-label="required">
                    *
                  </span>
                )}
              </label>

              {/* Description */}
              {description && (
                <p 
                  id={descriptionId}
                  className="text-sm text-gray-600 dark:text-gray-400 mt-1"
                >
                  {description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p 
            id={errorId}
            className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 ml-8"
            role="alert"
          >
            <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox; 