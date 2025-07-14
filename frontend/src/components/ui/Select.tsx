/**
 * Select Component
 * 
 * Reusable select dropdown component with validation, error states, and accessibility features.
 * Provides consistent styling and behavior for select inputs across the application.
 */

import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  /** Array of options */
  options: SelectOption[];
  /** Selected value */
  value: string | null;
  /** Change handler */
  onChange: (value: string | null) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Field label */
  label?: string;
  /** Help text displayed below the select */
  description?: string;
  /** Error message */
  error?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Select size */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to allow clearing the selection */
  clearable?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Select ID */
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

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder = 'Select an option',
      label,
      description,
      error,
      required = false,
      disabled = false,
      size = 'md',
      clearable = false,
      className,
      id,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const selectRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const listboxId = `${selectId}-listbox`;
    const descriptionId = description ? `${selectId}-description` : undefined;
    const errorId = error ? `${selectId}-error` : undefined;

    const describedBy = [
      ariaDescribedBy,
      descriptionId,
      errorId
    ].filter(Boolean).join(' ') || undefined;

    const selectedOption = options.find(option => option.value === value);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setFocusedIndex(-1);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen]);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
            setFocusedIndex(value ? options.findIndex(opt => opt.value === value) : 0);
          } else if (focusedIndex >= 0) {
            const option = options[focusedIndex];
            if (!option.disabled) {
              onChange(option.value);
              setIsOpen(false);
              setFocusedIndex(-1);
            }
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
            setFocusedIndex(0);
          } else {
            setFocusedIndex(prev => {
              const nextIndex = prev + 1;
              return nextIndex >= options.length ? 0 : nextIndex;
            });
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
            setFocusedIndex(options.length - 1);
          } else {
            setFocusedIndex(prev => {
              const nextIndex = prev - 1;
              return nextIndex < 0 ? options.length - 1 : nextIndex;
            });
          }
          break;
      }
    };

    const handleOptionClick = (option: SelectOption) => {
      if (!option.disabled) {
        onChange(option.value);
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
    };

    return (
      <div ref={selectRef} className={cn('relative', className)}>
        {/* Label */}
        {label && (
          <label 
            htmlFor={selectId}
            className={cn(
              'block text-sm font-medium mb-2',
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
            className="text-sm text-gray-600 dark:text-gray-400 mb-2"
          >
            {description}
          </p>
        )}

        {/* Select Button */}
        <button
          ref={ref}
          type="button"
          id={selectId}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          aria-label={ariaLabel}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : 'false'}
          aria-required={required}
          className={cn(
            'relative w-full cursor-default rounded-lg border text-left transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'dark:text-gray-100',
            sizeClasses[size],
            error
              ? 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20'
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800',
            disabled 
              ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900' 
              : 'hover:border-gray-400 dark:hover:border-gray-500'
          )}
          {...props}
        >
          <span className="block truncate">
            {selectedOption ? selectedOption.label : (
              <span className="text-gray-500 dark:text-gray-400">
                {placeholder}
              </span>
            )}
          </span>
          
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            {clearable && value && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="pointer-events-auto rounded-full p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 mr-1"
                aria-label="Clear selection"
              >
                <span className="sr-only">Clear</span>
                ×
              </button>
            )}
            <ChevronDownIcon 
              className={cn(
                'h-5 w-5 text-gray-400 transition-transform duration-200',
                isOpen && 'transform rotate-180'
              )} 
            />
          </span>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={selectId}
            className={cn(
              'absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md',
              'bg-white dark:bg-gray-800 py-1 text-base shadow-lg',
              'ring-1 ring-black ring-opacity-5 dark:ring-gray-700',
              'focus:outline-none sm:text-sm'
            )}
          >
            {options.map((option, index) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                className={cn(
                  'relative cursor-default select-none py-2 pl-10 pr-4',
                  option.disabled
                    ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : index === focusedIndex
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                    : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700',
                  'transition-colors duration-150'
                )}
                onClick={() => handleOptionClick(option)}
              >
                <span className={cn(
                  'block truncate',
                  option.value === value ? 'font-medium' : 'font-normal'
                )}>
                  {option.label}
                </span>
                
                {option.value === value && (
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-blue-400">
                    <CheckIcon className="h-5 w-5" />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Error Message */}
        {error && (
          <p 
            id={errorId}
            className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 mt-2"
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

Select.displayName = 'Select';

export default Select; 