import React, { useEffect } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

/**
 * Toast Component with CSS animations (lighter than framer-motion)
 */
interface ToastProps {
  message: string;
  type: 'success' | 'error';
  isVisible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={cn(
        'rounded-lg p-4 shadow-lg flex items-center gap-3 min-w-[300px]',
        'transform transition-all duration-300 ease-in-out',
        'animate-in slide-in-from-top-2 fade-in zoom-in-95',
        isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
        type === 'success' 
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
      )}>
        {type === 'success' ? (
          <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
        ) : (
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
        )}
        <p className={cn(
          'flex-1 text-sm font-medium',
          type === 'success' 
            ? 'text-green-800 dark:text-green-200'
            : 'text-red-800 dark:text-red-200'
        )}>
          {message}
        </p>
        <button
          onClick={onClose}
          className={cn(
            'rounded p-1 hover:bg-opacity-20 transition-colors duration-150',
            type === 'success' ? 'hover:bg-green-600' : 'hover:bg-red-600'
          )}
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}; 