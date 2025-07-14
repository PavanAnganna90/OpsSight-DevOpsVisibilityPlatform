/**
 * TextArea Component
 * 
 * Reusable textarea component with validation, error states, and accessibility features.
 * Provides consistent styling and behavior for multi-line text inputs.
 */

import React, { forwardRef } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

export interface TextAreaProps {
  /** Textarea value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Field label */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Help text displayed below the textarea */
  description?: string;
  /** Error message */
  error?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is read-only */
  readOnly?: boolean;
  /** Textarea size */
  size?: 'sm' | 'md' | 'lg';
  /** Number of rows */
  rows?: number;
  /** Maximum length */
  maxLength?: number;
  /** Whether to auto-resize the textarea */
  autoResize?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Textarea ID */
  id?: string;
  /** ARIA label for accessibility */
  'aria-label'?: string;
  /** ARIA described by */
  'aria-describedby'?: string;
}

const sizeClasses = {
  sm: 'px-2 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base'
};

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      value,
      onChange,
      label,
      placeholder,
      description,
      error,
      required = false,
      disabled = false,
      readOnly = false,
      size = 'md',
      rows = 3,
      maxLength,
      autoResize = false,
      className,
      id,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const descriptionId = description ? `${textareaId}-description` : undefined;
    const errorId = error ? `${textareaId}-error` : undefined;

    const describedBy = [
      ariaDescribedBy,
      descriptionId,
      errorId
    ].filter(Boolean).join(' ') || undefined;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      
      // Auto-resize functionality
      if (autoResize) {
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
      }
    };

    return (
      <div className={cn('space-y-2', className)}>
        {/* Label */}
        {label && (
          <label 
            htmlFor={textareaId}
            className={cn(
              'block text-sm font-medium',
              error 
                ? 'text-red-700 dark:text-red-400' 
                : 'text-gray-700 dark:text-gray-300',
              disabled && 'text-gray-400 dark:text-gray-600'
            )}
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        {/* Description */}
        {description && (
          <p 
            id={descriptionId}
            className="text-sm text-gray-600 dark:text-gray-400"
          >
            {description}
          </p>
        )}

        {/* Character Count */}
        {maxLength && (
          <div className="flex justify-between items-center">
            <div /> {/* Spacer */}
            <span className={cn(
              'text-xs',
              value.length > maxLength * 0.9 
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-gray-500 dark:text-gray-400',
              value.length >= maxLength && 'text-red-600 dark:text-red-400'
            )}>
              {value.length}/{maxLength}
            </span>
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          rows={rows}
          maxLength={maxLength}
          aria-label={ariaLabel}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : 'false'}
          className={cn(
            'block w-full rounded-lg border transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'dark:text-gray-100 dark:placeholder-gray-400',
            'resize-vertical', // Allow vertical resize by default
            sizeClasses[size],
            error
              ? 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20'
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800',
            disabled && 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900',
            readOnly && 'bg-gray-50 dark:bg-gray-900 cursor-default',
            autoResize && 'resize-none' // Disable manual resize if auto-resize is enabled
          )}
          {...props}
        />

        {/* Error Message */}
        {error && (
          <p 
            id={errorId}
            className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
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

TextArea.displayName = 'TextArea';

export default TextArea; 