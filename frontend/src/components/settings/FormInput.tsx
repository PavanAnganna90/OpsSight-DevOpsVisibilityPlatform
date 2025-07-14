import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

/**
 * Form Input Component for Settings
 */
interface FormInputProps {
  id: string;
  label: string;
  description?: string;
  type?: 'text' | 'email' | 'url';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

const FormInputComponent: React.FC<FormInputProps> = ({
  id,
  label,
  description,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  required = false
}) => {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block font-medium text-gray-900 dark:text-gray-100">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      )}
      <input
        type={type}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'block w-full rounded-lg border px-3 py-2 text-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          error
            ? 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800',
          disabled && 'opacity-50 cursor-not-allowed',
          'dark:text-gray-100'
        )}
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <ExclamationTriangleIcon className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * Memoized FormInput component to prevent unnecessary re-renders
 */
export const FormInput = React.memo(FormInputComponent); 