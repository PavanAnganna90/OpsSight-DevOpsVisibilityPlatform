'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outline';
  inputSize?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

/**
 * Input Component - OpsSight Design System
 * 
 * Features:
 * - Dark mode optimized colors
 * - Smooth transitions and focus states
 * - Icon support for better UX
 * - Error and validation states
 * - Loading indicators
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type = 'text',
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    variant = 'default',
    inputSize = 'md',
    isLoading = false,
    disabled,
    ...props
  }, ref) => {
    const inputId = React.useId();
    const errorId = React.useId();
    const helperId = React.useId();

    const baseClasses = 'block w-full rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantClasses = {
      default: cn(
        'bg-slate-800/50 border-slate-700 text-white placeholder-slate-400',
        'hover:border-slate-600 focus:border-cyan-500 focus:ring-cyan-500/20',
        error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
      ),
      filled: cn(
        'bg-slate-700 border-slate-600 text-white placeholder-slate-400',
        'hover:bg-slate-600/70 focus:bg-slate-800/50 focus:border-cyan-500 focus:ring-cyan-500/20',
        error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
      ),
      outline: cn(
        'bg-transparent border-2 border-slate-600 text-white placeholder-slate-400',
        'hover:border-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20',
        error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
      )
    };
    
    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-sm',
      lg: 'px-5 py-4 text-base'
    };
    
    const iconSizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    };
    
    const hasLeftIcon = leftIcon || isLoading;
    const hasRightIcon = rightIcon;
    
    const paddingClasses = cn(
      hasLeftIcon && (inputSize === 'sm' ? 'pl-9' : inputSize === 'md' ? 'pl-11' : 'pl-13'),
      hasRightIcon && (inputSize === 'sm' ? 'pr-9' : inputSize === 'md' ? 'pr-11' : 'pr-13')
    );

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-300 mb-2"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {hasLeftIcon && (
            <div className={cn(
              'absolute inset-y-0 left-0 flex items-center pointer-events-none',
              inputSize === 'sm' ? 'pl-3' : inputSize === 'md' ? 'pl-4' : 'pl-5'
            )}>
              {isLoading ? (
                <div className={cn('animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400', iconSizeClasses[inputSize])} />
              ) : (
                <span className={cn('text-slate-400', iconSizeClasses[inputSize])}>
                  {leftIcon}
                </span>
              )}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled || isLoading}
            aria-describedby={cn(
              error && errorId,
              helperText && helperId
            )}
            aria-invalid={error ? 'true' : 'false'}
            className={cn(
              baseClasses,
              variantClasses[variant],
              sizeClasses[inputSize],
              paddingClasses,
              className
            )}
            {...props}
          />
          
          {hasRightIcon && (
            <div className={cn(
              'absolute inset-y-0 right-0 flex items-center pointer-events-none',
              inputSize === 'sm' ? 'pr-3' : inputSize === 'md' ? 'pr-4' : 'pr-5'
            )}>
              <span className={cn('text-slate-400', iconSizeClasses[inputSize])}>
                {rightIcon}
              </span>
            </div>
          )}
        </div>
        
        {(error || helperText) && (
          <div className="mt-2 space-y-1">
            {error && (
              <p id={errorId} className="text-sm text-red-400 flex items-center">
                <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            )}
            {helperText && !error && (
              <p id={helperId} className="text-sm text-slate-400">
                {helperText}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

/**
 * Textarea Component with similar styling to Input
 */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'filled' | 'outline';
  inputSize?: 'sm' | 'md' | 'lg';
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    className,
    label,
    error,
    helperText,
    variant = 'default',
    inputSize = 'md',
    resize = 'vertical',
    disabled,
    ...props
  }, ref) => {
    const textareaId = React.useId();
    const errorId = React.useId();
    const helperId = React.useId();

    const baseClasses = 'block w-full rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed min-h-[100px]';
    
    const variantClasses = {
      default: cn(
        'bg-slate-800/50 border-slate-700 text-white placeholder-slate-400',
        'hover:border-slate-600 focus:border-cyan-500 focus:ring-cyan-500/20',
        error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
      ),
      filled: cn(
        'bg-slate-700 border-slate-600 text-white placeholder-slate-400',
        'hover:bg-slate-600/70 focus:bg-slate-800/50 focus:border-cyan-500 focus:ring-cyan-500/20',
        error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
      ),
      outline: cn(
        'bg-transparent border-2 border-slate-600 text-white placeholder-slate-400',
        'hover:border-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20',
        error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
      )
    };
    
    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-sm',
      lg: 'px-5 py-4 text-base'
    };
    
    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize'
    };

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={textareaId}
            className="block text-sm font-medium text-slate-300 mb-2"
          >
            {label}
          </label>
        )}
        
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          aria-describedby={cn(
            error && errorId,
            helperText && helperId
          )}
          aria-invalid={error ? 'true' : 'false'}
          className={cn(
            baseClasses,
            variantClasses[variant],
            sizeClasses[inputSize],
            resizeClasses[resize],
            className
          )}
          {...props}
        />
        
        {(error || helperText) && (
          <div className="mt-2 space-y-1">
            {error && (
              <p id={errorId} className="text-sm text-red-400 flex items-center">
                <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            )}
            {helperText && !error && (
              <p id={helperId} className="text-sm text-slate-400">
                {helperText}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

/**
 * Input Group for combining inputs with labels, buttons, etc.
 */
interface InputGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const InputGroup: React.FC<InputGroupProps> = ({ children, className }) => {
  return (
    <div className={cn('flex rounded-xl overflow-hidden border border-slate-700', className)}>
      {children}
    </div>
  );
};

/**
 * Input Group Addon for labels, buttons, etc.
 */
interface InputGroupAddonProps {
  children: React.ReactNode;
  className?: string;
  position?: 'left' | 'right';
}

export const InputGroupAddon: React.FC<InputGroupAddonProps> = ({ 
  children, 
  className,
  position = 'left' 
}) => {
  return (
    <div className={cn(
      'px-4 py-3 bg-slate-700 text-slate-300 text-sm font-medium flex items-center',
      position === 'left' && 'border-r border-slate-600',
      position === 'right' && 'border-l border-slate-600',
      className
    )}>
      {children}
    </div>
  );
}; 