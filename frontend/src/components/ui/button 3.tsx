'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from './LoadingStates';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  href?: string;
}

/**
 * Button Component - OpsSight Design System
 * 
 * Implements consistent button styling with behavioral psychology principles:
 * - Confident colors for primary actions
 * - Subtle hover states for gentle interaction
 * - Loading states to maintain user confidence
 * - Icon support for better visual hierarchy
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    loadingText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    children,
    disabled,
    href,
    ...props 
  }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantClasses = {
      primary: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg hover:shadow-cyan-500/30 hover:-translate-y-0.5 hover:scale-105 focus:ring-cyan-500',
      secondary: 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600 hover:text-white focus:ring-slate-500',
      outline: 'border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-white focus:ring-cyan-500',
      ghost: 'text-slate-300 hover:bg-slate-800/50 hover:text-white focus:ring-slate-500',
      danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:shadow-red-500/30 hover:-translate-y-0.5 hover:scale-105 focus:ring-red-500',
      success: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 hover:scale-105 focus:ring-emerald-500',
      warning: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg hover:shadow-amber-500/30 hover:-translate-y-0.5 hover:scale-105 focus:ring-amber-500'
    };
    
    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-sm',
      lg: 'px-6 py-3 text-base',
      xl: 'px-8 py-4 text-lg'
    };
    
    const widthClasses = fullWidth ? 'w-full' : '';
    
    const loadingClasses = isLoading ? 'cursor-wait' : '';
    
    const buttonContent = (
      <>
        {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        <span className={isLoading ? 'opacity-70' : ''}>
          {isLoading && loadingText ? loadingText : children}
        </span>
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </>
    );
    
    const buttonClasses = cn(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      widthClasses,
      loadingClasses,
      className
    );
    
    if (href) {
      // Validate URL to prevent XSS
      const isValidUrl = (url: string) => {
        try {
          const urlObj = new URL(url, window.location.origin);
          return ['http:', 'https:', 'mailto:'].includes(urlObj.protocol);
        } catch {
          return false;
        }
      };

      if (!isValidUrl(href)) {
        console.error('Invalid URL provided to Button component:', href);
        return null;
      }

      return (
        <a
          href={href}
          className={buttonClasses}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {buttonContent}
        </a>
      );
    }
    
    return (
      <button
        className={buttonClasses}
        disabled={disabled || isLoading}
        ref={ref}
        {...props}
      >
        {buttonContent}
      </button>
    );
  }
);

Button.displayName = 'Button';

/**
 * Button Group Component for related actions
 */
interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'tight' | 'normal' | 'loose';
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  className,
  orientation = 'horizontal',
  spacing = 'normal'
}) => {
  const orientationClasses = {
    horizontal: 'flex-row',
    vertical: 'flex-col'
  };
  
  const spacingClasses = {
    tight: orientation === 'horizontal' ? 'space-x-1' : 'space-y-1',
    normal: orientation === 'horizontal' ? 'space-x-3' : 'space-y-3',
    loose: orientation === 'horizontal' ? 'space-x-6' : 'space-y-6'
  };
  
  return (
    <div className={cn(
      'flex',
      orientationClasses[orientation],
      spacingClasses[spacing],
      className
    )}>
      {children}
    </div>
  );
};

/**
 * Icon Button for compact actions
 */
interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon'> {
  icon: React.ReactNode;
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, className, size = 'md', ...props }, ref) => {
    const sizeClasses = {
      sm: 'p-2',
      md: 'p-3',
      lg: 'p-4',
      xl: 'p-5'
    };
    
    return (
      <Button
        ref={ref}
        className={cn('aspect-square', sizeClasses[size], className)}
        size={size}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton'; 