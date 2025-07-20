import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'primary' | 'danger' | 'success';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xs' | 'md' | 'xl';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', leftIcon, rightIcon, fullWidth, isLoading, children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
    
    const variantClasses = {
      default: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200',
      primary: 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700',
      destructive: 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700',
      danger: 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700',
      success: 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700',
      outline: 'border border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800',
      secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
      ghost: 'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100',
      link: 'text-slate-900 underline-offset-4 hover:underline dark:text-slate-100',
    };
    
    const sizeClasses = {
      xs: 'h-6 px-2 text-xs',
      sm: 'h-8 px-3 text-sm',
      default: 'h-10 px-4 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-11 px-6 text-base',
      xl: 'h-12 px-8 text-lg',
      icon: 'h-10 w-10',
    };
    
    const widthClasses = fullWidth ? 'w-full' : '';
    
    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClasses} ${className}`;
    
    return (
      <button
        className={classes}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <span className="flex-shrink-0 w-4 h-4 animate-spin">⚪</span>}
        {!isLoading && leftIcon && <span className="flex-shrink-0 w-4 h-4">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="flex-shrink-0 w-4 h-4">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export const buttonVariants = {
  default: 'bg-slate-900 text-white hover:bg-slate-800',
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  destructive: 'bg-red-500 text-white hover:bg-red-600',
  outline: 'border border-slate-300 bg-white hover:bg-slate-50',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
  ghost: 'hover:bg-slate-100 hover:text-slate-900',
  link: 'text-slate-900 underline-offset-4 hover:underline',
}; 