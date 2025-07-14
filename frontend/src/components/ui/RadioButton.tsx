/**
 * RadioButton and RadioGroup Components
 * 
 * Reusable radio button components with validation, error states, and accessibility features.
 * Supports grouped radio buttons with consistent styling across the application.
 */

import React, { forwardRef, createContext, useContext } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

// Radio Group Context
interface RadioGroupContextValue {
  name: string;
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

// RadioGroup Component
export interface RadioGroupProps {
  /** Group name attribute */
  name: string;
  /** Selected value */
  value: string | null;
  /** Change handler */
  onChange: (value: string) => void;
  /** Group label */
  label?: string;
  /** Help text displayed below the group */
  description?: string;
  /** Error message */
  error?: string;
  /** Whether the group is required */
  required?: boolean;
  /** Whether the group is disabled */
  disabled?: boolean;
  /** Radio button size */
  size?: 'sm' | 'md' | 'lg';
  /** Layout direction */
  orientation?: 'horizontal' | 'vertical';
  /** Custom CSS classes */
  className?: string;
  /** Children radio buttons */
  children: React.ReactNode;
}

export const RadioGroup = forwardRef<HTMLFieldSetElement, RadioGroupProps>(
  (
    {
      name,
      value,
      onChange,
      label,
      description,
      error,
      required = false,
      disabled = false,
      size = 'md',
      orientation = 'vertical',
      className,
      children,
      ...props
    },
    ref
  ) => {
    const groupId = `radiogroup-${Math.random().toString(36).substr(2, 9)}`;
    const descriptionId = description ? `${groupId}-description` : undefined;
    const errorId = error ? `${groupId}-error` : undefined;

    const contextValue: RadioGroupContextValue = {
      name,
      value,
      onChange,
      disabled,
      size
    };

    return (
      <fieldset
        ref={ref}
        className={cn('space-y-2', className)}
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={error ? 'true' : 'false'}
        {...props}
      >
        {/* Label */}
        {label && (
          <legend
            className={cn(
              'text-sm font-medium',
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
          </legend>
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

        {/* Radio Options */}
        <RadioGroupContext.Provider value={contextValue}>
          <div className={cn(
            'flex gap-4',
            orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'
          )}>
            {children}
          </div>
        </RadioGroupContext.Provider>

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
      </fieldset>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';

// RadioButton Component
export interface RadioButtonProps {
  /** Radio button value */
  value: string;
  /** Radio button label */
  label?: string;
  /** Help text displayed below the radio button */
  description?: string;
  /** Whether the radio button is disabled */
  disabled?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Radio button ID */
  id?: string;
  /** ARIA label for accessibility */
  'aria-label'?: string;
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

export const RadioButton = forwardRef<HTMLInputElement, RadioButtonProps>(
  (
    {
      value,
      label,
      description,
      disabled: propDisabled = false,
      className,
      id,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const context = useContext(RadioGroupContext);
    
    if (!context) {
      throw new Error('RadioButton must be used within a RadioGroup');
    }

    const { name, value: selectedValue, onChange, disabled: groupDisabled, size = 'md' } = context;
    const disabled = propDisabled || groupDisabled;
    const isChecked = selectedValue === value;

    const radioId = id || `radio-${name}-${value}`;
    const descriptionId = description ? `${radioId}-description` : undefined;

    return (
      <div className={cn('space-y-1', className)}>
        <div className="flex items-start gap-3">
          {/* Custom Radio Button */}
          <div className="relative flex items-center">
            <input
              ref={ref}
              type="radio"
              id={radioId}
              name={name}
              value={value}
              checked={isChecked}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              aria-label={ariaLabel}
              aria-describedby={descriptionId}
              className="sr-only" // Hide the default radio button
              {...props}
            />
            
            {/* Custom radio button appearance */}
            <div
              className={cn(
                'rounded-full border-2 transition-all duration-200 flex items-center justify-center',
                'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2',
                sizeClasses[size],
                isChecked
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600',
                disabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'cursor-pointer hover:border-blue-500'
              )}
              onClick={() => !disabled && onChange(value)}
            >
              {isChecked && (
                <div className={cn(
                  'rounded-full bg-white',
                  size === 'sm' ? 'h-1.5 w-1.5' : size === 'md' ? 'h-2 w-2' : 'h-2.5 w-2.5'
                )} />
              )}
            </div>
          </div>

          {/* Label and Content */}
          {label && (
            <div className="flex-1 min-w-0">
              <label
                htmlFor={radioId}
                className={cn(
                  'font-medium cursor-pointer',
                  'text-gray-700 dark:text-gray-300',
                  disabled && 'text-gray-400 dark:text-gray-600 cursor-not-allowed',
                  labelSizeClasses[size]
                )}
              >
                {label}
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
      </div>
    );
  }
);

RadioButton.displayName = 'RadioButton';

export default RadioGroup; 