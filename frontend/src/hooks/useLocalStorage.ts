/**
 * useLocalStorage Hook
 *
 * Provides a persistent state solution using localStorage with full TypeScript support,
 * error handling, and SSR compatibility. This hook serves as the foundation for
 * client-side state persistence across the application.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Custom error for localStorage operations
export class LocalStorageError extends Error {
  constructor(message: string, public readonly operation: 'get' | 'set' | 'remove') {
    super(message);
    this.name = 'LocalStorageError';
  }
}

export interface UseLocalStorageOptions<T> {
  /** Default value if no stored value exists */
  defaultValue?: T;
  /** Custom serializer for complex data types */
  serializer?: {
    parse: (value: string) => T;
    stringify: (value: T) => string;
  };
  /** Whether to sync across browser tabs/windows */
  syncAcrossTabs?: boolean;
  /** Validation function for stored values */
  validator?: (value: any) => value is T;
  /** Error callback for handling localStorage errors */
  onError?: (error: LocalStorageError) => void;
}

export interface UseLocalStorageReturn<T> {
  /** Current stored value */
  value: T;
  /** Function to update the stored value */
  setValue: (value: T | ((prevValue: T) => T)) => void;
  /** Function to remove the stored value */
  removeValue: () => void;
  /** Whether localStorage is available and working */
  isSupported: boolean;
  /** Whether the hook is currently loading the initial value */
  isLoading: boolean;
  /** Last error that occurred, if any */
  error: LocalStorageError | null;
}

/**
 * Check if localStorage is available and functional
 */
function checkLocalStorageSupport(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const testKey = '__localStorage_test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Custom hook for managing localStorage state with TypeScript support
 *
 * @param key - The localStorage key
 * @param options - Configuration options
 * @returns Object with value, setter, remover, and utility properties
 */
export function useLocalStorage<T>(
  key: string,
  options: UseLocalStorageOptions<T> = {}
): UseLocalStorageReturn<T> {
  const {
    defaultValue,
    serializer = { parse: JSON.parse, stringify: JSON.stringify },
    syncAcrossTabs = true,
    validator,
    onError
  } = options;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<LocalStorageError | null>(null);
  const [isSupported] = useState(checkLocalStorageSupport);
  const [storedValue, setStoredValue] = useState<T>(defaultValue as T);

  // Keep track of the current key to handle key changes
  const currentKey = useRef(key);

  /**
   * Handle localStorage errors with proper error reporting
   */
  const handleError = useCallback((error: LocalStorageError) => {
    setError(error);
    onError?.(error);
    console.warn(`localStorage ${error.operation} failed:`, error.message);
  }, [onError]);

  /**
   * Read value from localStorage with validation and error handling
   */
  const readValue = useCallback((): T => {
    if (!isSupported) {
      return defaultValue as T;
    }

    try {
      const item = window.localStorage.getItem(key);

      if (item === null) {
        return defaultValue as T;
      }

      const parsed = serializer.parse(item);

      // Validate the parsed value if validator is provided
      if (validator && !validator(parsed)) {
        console.warn(`Invalid stored value for key \"${key}\", using default`);
        return defaultValue as T;
      }

      return parsed;
    } catch (error) {
      const localStorageError = new LocalStorageError(
        `Failed to parse stored value for key \"${key}\": ${error}`,
        'get'
      );
      handleError(localStorageError);
      return defaultValue as T;
    }
  }, [key, defaultValue, serializer, validator, isSupported, handleError]);

  /**
   * Write value to localStorage with error handling
   */
  const writeValue = useCallback((value: T) => {
    if (!isSupported) {
      setStoredValue(value);
      return;
    }

    try {
      const stringValue = serializer.stringify(value);
      window.localStorage.setItem(key, stringValue);
      setStoredValue(value);
      setError(null); // Clear any previous errors on successful write
    } catch (error) {
      const localStorageError = new LocalStorageError(
        `Failed to store value for key \"${key}\": ${error}`,
        'set'
      );
      handleError(localStorageError);
    }
  }, [key, serializer, isSupported, handleError]);

  /**
   * Remove value from localStorage
   */
  const removeValue = useCallback(() => {
    if (!isSupported) {
      setStoredValue(defaultValue as T);
      return;
    }

    try {
      window.localStorage.removeItem(key);
      setStoredValue(defaultValue as T);
      setError(null);
    } catch (error) {
      const localStorageError = new LocalStorageError(
        `Failed to remove value for key \"${key}\": ${error}`,
        'remove'
      );
      handleError(localStorageError);
    }
  }, [key, defaultValue, isSupported, handleError]);

  /**
   * Set value with support for functional updates
   */
  const setValue = useCallback((value: T | ((prevValue: T) => T)) => {
    try {
      const newValue = value instanceof Function ? value(storedValue) : value;
      writeValue(newValue);
    } catch (error) {
      const localStorageError = new LocalStorageError(
        `Failed to update value for key \"${key}\": ${error}`,
        'set'
      );
      handleError(localStorageError);
    }
  }, [key, storedValue, writeValue, handleError]);

  /**
   * Handle storage events for cross-tab synchronization
   */
  useEffect(() => {
    if (!syncAcrossTabs || !isSupported) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = serializer.parse(e.newValue);
          if (!validator || validator(newValue)) {
            setStoredValue(newValue);
          }
        } catch (error) {
          console.warn(`Failed to sync storage change for key \"${key}\":`, error);
        }
      } else if (e.key === key && e.newValue === null) {
        // Value was removed in another tab
        setStoredValue(defaultValue as T);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, serializer, validator, defaultValue, syncAcrossTabs, isSupported]);

  /**
   * Load initial value on mount and when key changes
   */
  useEffect(() => {
    if (currentKey.current !== key) {
      currentKey.current = key;
    }

    setIsLoading(true);
    const initialValue = readValue();
    setStoredValue(initialValue);
    setIsLoading(false);
  }, [key, readValue]);

  return {
    value: storedValue,
    setValue,
    removeValue,
    isSupported,
    isLoading,
    error
  };
}