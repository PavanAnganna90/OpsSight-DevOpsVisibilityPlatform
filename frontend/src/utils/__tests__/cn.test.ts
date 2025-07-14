/**
 * CN Utility Tests
 * 
 * Comprehensive test suite for the cn utility function that combines
 * clsx and tailwind-merge for intelligent class name handling.
 */

import { cn } from '../cn';

describe('CN Utility', () => {
  describe('Basic Functionality', () => {
    it('should combine multiple class strings', () => {
      const result = cn('class1', 'class2', 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('should handle single class string', () => {
      const result = cn('single-class');
      expect(result).toBe('single-class');
    });

    it('should handle empty inputs', () => {
      expect(cn()).toBe('');
      expect(cn('')).toBe('');
      expect(cn(null)).toBe('');
      expect(cn(undefined)).toBe('');
    });

    it('should filter out falsy values', () => {
      const result = cn('class1', false, 'class2', null, 'class3', undefined, '');
      expect(result).toBe('class1 class2 class3');
    });
  });

  describe('Conditional Classes', () => {
    it('should handle conditional classes with objects', () => {
      const result = cn({
        'active': true,
        'disabled': false,
        'loading': true,
      });
      expect(result).toBe('active loading');
    });

    it('should combine strings and conditional objects', () => {
      const result = cn('base-class', {
        'active': true,
        'disabled': false,
      }, 'another-class');
      expect(result).toBe('base-class active another-class');
    });

    it('should handle nested arrays', () => {
      const result = cn(['class1', 'class2'], ['class3', { 'class4': true }]);
      expect(result).toBe('class1 class2 class3 class4');
    });

    it('should handle complex conditional logic', () => {
      const isActive = true;
      const isDisabled = false;
      const variant = 'primary';
      
      const result = cn(
        'btn',
        {
          'btn-active': isActive,
          'btn-disabled': isDisabled,
        },
        variant && `btn-${variant}`,
        isActive && !isDisabled && 'btn-clickable'
      );
      
      expect(result).toBe('btn btn-active btn-primary btn-clickable');
    });
  });

  describe('Tailwind CSS Class Merging', () => {
    it('should merge conflicting Tailwind classes', () => {
      // Later classes should override earlier ones
      const result = cn('px-2 px-4');
      expect(result).toBe('px-4');
    });

    it('should merge multiple conflicting properties', () => {
      const result = cn('px-2 py-1 px-4 py-3');
      expect(result).toBe('px-4 py-3');
    });

    it('should handle responsive variants', () => {
      const result = cn('px-2 md:px-4 lg:px-6');
      expect(result).toBe('px-2 md:px-4 lg:px-6');
    });

    it('should merge conflicting responsive classes', () => {
      const result = cn('px-2 px-4 md:px-6 md:px-8');
      expect(result).toBe('px-4 md:px-8');
    });

    it('should handle state variants', () => {
      const result = cn('bg-blue-500 hover:bg-blue-600 focus:bg-blue-700');
      expect(result).toBe('bg-blue-500 hover:bg-blue-600 focus:bg-blue-700');
    });

    it('should merge conflicting state variants', () => {
      const result = cn('hover:bg-blue-500 hover:bg-red-500');
      expect(result).toBe('hover:bg-red-500');
    });

    it('should handle complex Tailwind class combinations', () => {
      const result = cn(
        'flex items-center justify-center',
        'p-2 p-4', // p-4 should win
        'text-sm text-lg', // text-lg should win
        'bg-blue-500 bg-red-500', // bg-red-500 should win
        'rounded rounded-lg' // rounded-lg should win
      );
      
      expect(result).toBe('flex items-center justify-center p-4 text-lg bg-red-500 rounded-lg');
    });
  });

  describe('Component Patterns', () => {
    it('should handle button component pattern', () => {
      const variant = 'primary';
      const size = 'lg';
      const isDisabled = false;
      
      const result = cn(
        'btn',
        `btn-${variant}`,
        `btn-${size}`,
        {
          'btn-disabled': isDisabled,
        }
      );
      
      expect(result).toBe('btn btn-primary btn-lg');
    });

    it('should handle card component pattern', () => {
      const elevated = true;
      const interactive = true;
      
      const result = cn(
        'card',
        'p-4 rounded-lg border',
        {
          'shadow-lg': elevated,
          'shadow-sm': !elevated,
          'hover:shadow-xl cursor-pointer': interactive,
        }
      );
      
      expect(result).toBe('card p-4 rounded-lg border shadow-lg hover:shadow-xl cursor-pointer');
    });

    it('should handle input component pattern', () => {
      const hasError = true;
      const isFocused = false;
      
      const result = cn(
        'input',
        'px-3 py-2 border rounded',
        {
          'border-red-500 text-red-900': hasError,
          'border-gray-300': !hasError,
          'ring-2 ring-blue-500': isFocused,
        }
      );
      
      expect(result).toBe('input px-3 py-2 border rounded border-red-500 text-red-900');
    });
  });

  describe('Edge Cases', () => {
    it('should handle duplicate classes', () => {
      const result = cn('class1 class1 class2 class1');
      // Note: clsx doesn't automatically deduplicate, but tailwind-merge does for conflicting classes
      expect(result).toBe('class1 class1 class2 class1');
    });

    it('should handle whitespace variations', () => {
      const result = cn('  class1  ', '  class2  ', '   ');
      expect(result).toBe('class1 class2');
    });

    it('should handle mixed input types', () => {
      const result = cn(
        'string-class',
        ['array-class1', 'array-class2'],
        { 'object-class': true, 'false-class': false },
        null,
        undefined,
        false,
        'another-string'
      );
      
      expect(result).toBe('string-class array-class1 array-class2 object-class another-string');
    });

    it('should handle very long class strings', () => {
      const longClasses = Array.from({ length: 100 }, (_, i) => `class-${i}`).join(' ');
      const result = cn(longClasses);
      expect(result).toContain('class-0');
      expect(result).toContain('class-99');
    });

    it('should handle special characters in class names', () => {
      const result = cn('class-with-dashes', 'class_with_underscores', 'class:with:colons');
      expect(result).toBe('class-with-dashes class_with_underscores class:with:colons');
    });
  });

  describe('Performance Considerations', () => {
    it('should handle many arguments efficiently', () => {
      const manyArgs = Array.from({ length: 50 }, (_, i) => `class-${i}`);
      const result = cn(...manyArgs);
      
      expect(result).toContain('class-0');
      expect(result).toContain('class-49');
      expect(result.split(' ')).toHaveLength(50);
    });

    it('should handle deeply nested arrays', () => {
      const nestedArray = [
        'class1',
        ['class2', ['class3', ['class4', 'class5']]],
        'class6'
      ];
      
      const result = cn(nestedArray);
      expect(result).toBe('class1 class2 class3 class4 class5 class6');
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should handle theme-based styling', () => {
      const getThemeClasses = (theme: 'light' | 'dark') => cn(
        'component',
        {
          'bg-white text-black': theme === 'light',
          'bg-black text-white': theme === 'dark',
        }
      );
      
      expect(getThemeClasses('dark')).toBe('component bg-black text-white');
      expect(getThemeClasses('light')).toBe('component bg-white text-black');
    });

    it('should handle responsive design patterns', () => {
      const result = cn(
        'grid',
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        'gap-4 md:gap-6 lg:gap-8',
        'p-4 md:p-6 lg:p-8'
      );
      
      expect(result).toBe('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 p-4 md:p-6 lg:p-8');
    });

    it('should handle state management patterns', () => {
      const state = {
        isLoading: false,
        isError: true,
        isSuccess: false,
      };
      
      const result = cn(
        'status-indicator',
        {
          'animate-spin text-blue-500': state.isLoading,
          'text-red-500': state.isError,
          'text-green-500': state.isSuccess,
        }
      );
      
      expect(result).toBe('status-indicator text-red-500');
    });

    it('should handle form validation patterns', () => {
      const validation = {
        isValid: false,
        isTouched: true,
        hasError: true,
      };
      
      const result = cn(
        'form-field',
        'border-2 rounded px-3 py-2',
        {
          'border-gray-300': !validation.isTouched,
          'border-green-500': validation.isTouched && validation.isValid,
          'border-red-500': validation.isTouched && validation.hasError,
        }
      );
      
      expect(result).toBe('form-field border-2 rounded px-3 py-2 border-red-500');
    });
  });

  describe('Integration with Component Libraries', () => {
    it('should work with component variant patterns', () => {
      type ButtonVariant = 'primary' | 'secondary' | 'danger';
      type ButtonSize = 'sm' | 'md' | 'lg';
      
      const getButtonClasses = (variant: ButtonVariant, size: ButtonSize, disabled = false) => {
        return cn(
          'btn',
          'font-medium rounded transition-colors',
          {
            // Variants
            'bg-blue-500 text-white hover:bg-blue-600': variant === 'primary',
            'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
            'bg-red-500 text-white hover:bg-red-600': variant === 'danger',
            
            // Sizes
            'px-2 py-1 text-sm': size === 'sm',
            'px-4 py-2 text-base': size === 'md',
            'px-6 py-3 text-lg': size === 'lg',
            
            // States
            'opacity-50 cursor-not-allowed': disabled,
          }
        );
      };
      
      const primaryLarge = getButtonClasses('primary', 'lg');
      expect(primaryLarge).toBe('btn font-medium rounded transition-colors bg-blue-500 text-white hover:bg-blue-600 px-6 py-3 text-lg');
      
      const secondarySmallDisabled = getButtonClasses('secondary', 'sm', true);
      expect(secondarySmallDisabled).toBe('btn font-medium rounded transition-colors bg-gray-200 text-gray-900 hover:bg-gray-300 px-2 py-1 text-sm opacity-50 cursor-not-allowed');
    });
  });
}); 