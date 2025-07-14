'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { 
  generateAriaAttributes, 
  createKeyboardNavigation, 
  createFocusTrap, 
  announceToScreenReader,
  respectReducedMotion 
} from '@/utils/accessibility';
import { cn } from '@/utils/cn';

interface Option {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

interface AccessibleSelectProps {
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
}

/**
 * Fully accessible select component with keyboard navigation and ARIA support
 * Meets WCAG 2.1 AA standards with proper focus management
 */
export function AccessibleSelect({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  description,
  error,
  disabled = false,
  required = false,
  className,
  size = 'md',
  variant = 'default',
}: AccessibleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const selectRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  
  const selectId = useRef(`select-${Math.random().toString(36).substr(2, 9)}`);
  const listboxId = useRef(`listbox-${Math.random().toString(36).substr(2, 9)}`);
  const descriptionId = useRef(`desc-${Math.random().toString(36).substr(2, 9)}`);
  const errorId = useRef(`error-${Math.random().toString(36).substr(2, 9)}`);

  // Filter options based on search query
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase()) && !option.disabled
  );

  // Find currently selected option
  const selectedOption = options.find(option => option.value === value);
  
  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-3 text-lg',
  };

  // Variant classes
  const variantClasses = {
    default: 'bg-white border-gray-300 text-gray-900 hover:border-gray-400',
    ghost: 'bg-transparent border-transparent text-gray-700 hover:bg-gray-50',
    outline: 'bg-transparent border-gray-300 text-gray-900 hover:border-gray-400',
  };

  // Open/close handlers
  const openSelect = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setHighlightedIndex(0);
    announceToScreenReader(`${label || 'Select'} expanded`, 'polite');
  }, [disabled, label]);

  const closeSelect = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }
    buttonRef.current?.focus();
    announceToScreenReader(`${label || 'Select'} collapsed`, 'polite');
  }, [label, searchTimeout]);

  // Selection handler
  const selectOption = useCallback((option: Option) => {
    if (option.disabled) return;
    
    onChange(option.value);
    closeSelect();
    announceToScreenReader(`${option.label} selected`, 'polite');
  }, [onChange, closeSelect]);

  // Keyboard navigation setup
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!isOpen) {
          openSelect();
        } else if (filteredOptions[highlightedIndex]) {
          selectOption(filteredOptions[highlightedIndex]);
        }
        break;

      case 'Escape':
        event.preventDefault();
        closeSelect();
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          openSelect();
        } else {
          const nextIndex = Math.min(highlightedIndex + 1, filteredOptions.length - 1);
          setHighlightedIndex(nextIndex);
          optionRefs.current[nextIndex]?.focus();
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          const prevIndex = Math.max(highlightedIndex - 1, 0);
          setHighlightedIndex(prevIndex);
          optionRefs.current[prevIndex]?.focus();
        }
        break;

      case 'Home':
        if (isOpen) {
          event.preventDefault();
          setHighlightedIndex(0);
          optionRefs.current[0]?.focus();
        }
        break;

      case 'End':
        if (isOpen) {
          event.preventDefault();
          const lastIndex = filteredOptions.length - 1;
          setHighlightedIndex(lastIndex);
          optionRefs.current[lastIndex]?.focus();
        }
        break;

      default:
        // Type-ahead search
        if (isOpen && event.key.length === 1) {
          const newQuery = searchQuery + event.key;
          setSearchQuery(newQuery);
          
          if (searchTimeout) clearTimeout(searchTimeout);
          setSearchTimeout(setTimeout(() => setSearchQuery(''), 1000));
          
          const matchingIndex = filteredOptions.findIndex(option =>
            option.label.toLowerCase().startsWith(newQuery.toLowerCase())
          );
          
          if (matchingIndex !== -1) {
            setHighlightedIndex(matchingIndex);
            optionRefs.current[matchingIndex]?.focus();
          }
        }
        break;
    }
  }, [disabled, isOpen, openSelect, closeSelect, selectOption, filteredOptions, highlightedIndex, searchQuery, searchTimeout]);

  // Focus trap for the listbox
  useEffect(() => {
    if (isOpen && listboxRef.current) {
      const cleanup = createFocusTrap(listboxRef.current);
      return cleanup;
    }
  }, [isOpen]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        closeSelect();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, closeSelect]);

  // Animation variants
  const dropdownVariants = {
    hidden: { 
      opacity: 0, 
      y: respectReducedMotion(-10, 0),
      scale: respectReducedMotion(0.95, 1)
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: respectReducedMotion("spring", "tween"),
        stiffness: respectReducedMotion(300, 0),
        damping: respectReducedMotion(30, 0),
        duration: respectReducedMotion(0, 0.15)
      }
    },
    exit: { 
      opacity: 0, 
      y: respectReducedMotion(-10, 0),
      scale: respectReducedMotion(0.95, 1),
      transition: {
        duration: respectReducedMotion(0.2, 0.1)
      }
    }
  };

  const optionVariants = {
    hidden: { opacity: 0, x: respectReducedMotion(-20, 0) },
    visible: (index: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: respectReducedMotion(index * 0.05, 0),
        duration: respectReducedMotion(0.2, 0.1)
      }
    })
  };

  return (
    <div ref={selectRef} className={cn('relative', className)}>
      {/* Label */}
      {label && (
        <label
          htmlFor={selectId.current}
          className={cn(
            'block text-sm font-medium text-gray-700 mb-2',
            disabled && 'text-gray-400',
            error && 'text-red-600'
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}

      {/* Description */}
      {description && (
        <p
          id={descriptionId.current}
          className="text-sm text-gray-600 mb-2"
        >
          {description}
        </p>
      )}

      {/* Select Button */}
      <button
        ref={buttonRef}
        id={selectId.current}
        type="button"
        onClick={openSelect}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          'relative w-full cursor-default rounded-md border focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
          sizeClasses[size],
          variantClasses[variant],
          disabled && 'cursor-not-allowed opacity-50 bg-gray-50',
          error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
          'transition-colors duration-200'
        )}
        {...generateAriaAttributes('button', {
          expanded: isOpen,
          label: label,
          describedBy: [
            description ? descriptionId.current : undefined,
            error ? errorId.current : undefined
          ].filter(Boolean).join(' ') || undefined
        })}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId.current : undefined}
        aria-invalid={error ? 'true' : 'false'}
        aria-required={required}
      >
        <span className="flex items-center justify-between">
          <span className="flex items-center">
            {selectedOption?.icon && (
              <selectedOption.icon className="w-5 h-5 mr-2 text-gray-400" />
            )}
            <span className={cn(
              'block truncate',
              !selectedOption && 'text-gray-500'
            )}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </span>
          <ChevronDownIcon
            className={cn(
              'w-5 h-5 text-gray-400 transition-transform duration-200',
              isOpen && 'transform rotate-180'
            )}
            aria-hidden="true"
          />
        </span>
      </button>

      {/* Error Message */}
      {error && (
        <p
          id={errorId.current}
          className="mt-2 text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none"
          >
            <ul
              ref={listboxRef}
              id={listboxId.current}
              role="listbox"
              aria-labelledby={selectId.current}
              aria-activedescendant={filteredOptions[highlightedIndex] ? `option-${filteredOptions[highlightedIndex].value}` : undefined}
              tabIndex={-1}
            >
              {filteredOptions.length === 0 ? (
                <li className="px-4 py-2 text-gray-500 text-center">
                  No options available
                </li>
              ) : (
                filteredOptions.map((option, index) => (
                  <motion.li
                    key={option.value}
                                         ref={el => { optionRefs.current[index] = el; }}
                    id={`option-${option.value}`}
                    role="option"
                    aria-selected={option.value === value}
                    tabIndex={-1}
                    variants={optionVariants}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                    className={cn(
                      'cursor-pointer select-none relative py-2 pl-3 pr-9 transition-colors duration-150',
                      index === highlightedIndex ? 'bg-blue-600 text-white' : 'text-gray-900 hover:bg-gray-50',
                      option.disabled && 'cursor-not-allowed opacity-50'
                    )}
                    onClick={() => selectOption(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="flex items-center">
                      {option.icon && (
                        <option.icon className={cn(
                          'w-5 h-5 mr-3',
                          index === highlightedIndex ? 'text-white' : 'text-gray-400'
                        )} />
                      )}
                      <div className="flex flex-col">
                        <span className={cn(
                          'block truncate',
                          option.value === value ? 'font-semibold' : 'font-normal'
                        )}>
                          {option.label}
                        </span>
                        {option.description && (
                          <span className={cn(
                            'text-sm',
                            index === highlightedIndex ? 'text-blue-200' : 'text-gray-500'
                          )}>
                            {option.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {option.value === value && (
                      <span className={cn(
                        'absolute inset-y-0 right-0 flex items-center pr-4',
                        index === highlightedIndex ? 'text-white' : 'text-blue-600'
                      )}>
                        <CheckIcon className="w-5 h-5" aria-hidden="true" />
                      </span>
                    )}
                  </motion.li>
                ))
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 