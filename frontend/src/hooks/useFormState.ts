/**
 * useFormState Hook
 * 
 * Provides comprehensive form state management with validation, error handling,
 * and submission logic. Designed to work seamlessly with our UI form components.
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';

// Field validation function type
export type FieldValidator<T = any> = (value: T, allValues: Record<string, any>) => string | null;

// Form field configuration
export interface FormFieldConfig<T = any> {
  /** Initial value for the field */
  initialValue?: T;
  /** Validation function for the field */
  validator?: FieldValidator<T>;
  /** Whether the field is required */
  required?: boolean;
  /** Custom error message for required validation */
  requiredMessage?: string;
  /** Whether to validate on change (default: true) */
  validateOnChange?: boolean;
  /** Whether to validate on blur (default: true) */
  validateOnBlur?: boolean;
}

// Form configuration options
export interface UseFormStateOptions {
  /** Whether to persist form state in localStorage */
  persistState?: boolean;
  /** localStorage key for persisting state */
  storageKey?: string;
  /** Whether to validate all fields on submit */
  validateOnSubmit?: boolean;
  /** Callback called when form is submitted and valid */
  onSubmit?: (values: Record<string, any>) => void | Promise<void>;
  /** Callback called when form submission fails */
  onSubmitError?: (error: Error) => void;
  /** Whether to reset form after successful submission */
  resetOnSubmit?: boolean;
}

// Form state interface
export interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  submitCount: number;
}

// Return interface for the hook
export interface UseFormStateReturn {
  /** Current form state */
  state: FormState;
  /** Get value for a specific field */
  getValue: <T = any>(fieldName: string) => T;
  /** Set value for a specific field */
  setValue: <T = any>(fieldName: string, value: T) => void;
  /** Get error for a specific field */
  getError: (fieldName: string) => string | null;
  /** Set error for a specific field */
  setError: (fieldName: string, error: string | null) => void;
  /** Mark field as touched */
  setTouched: (fieldName: string, touched?: boolean) => void;
  /** Validate a specific field */
  validateField: (fieldName: string) => string | null;
  /** Validate all fields */
  validateAll: () => boolean;
  /** Submit the form */
  handleSubmit: (event?: React.FormEvent) => Promise<void>;
  /** Reset form to initial state */
  reset: () => void;
  /** Clear all errors */
  clearErrors: () => void;
  /** Check if a field is valid */
  isFieldValid: (fieldName: string) => boolean;
  /** Check if field has been touched */
  isFieldTouched: (fieldName: string) => boolean;
  /** Register a field with configuration */
  registerField: <T = any>(fieldName: string, config: FormFieldConfig<T>) => void;
  /** Unregister a field */
  unregisterField: (fieldName: string) => void;
}

/**
 * Custom hook for managing form state with validation and persistence
 * 
 * @param options - Configuration options for the form
 * @returns Form state and management functions
 */
export function useFormState(options: UseFormStateOptions = {}): UseFormStateReturn {
  const {
    persistState = false,
    storageKey = 'form-state',
    validateOnSubmit = true,
    onSubmit,
    onSubmitError,
    resetOnSubmit = false
  } = options;

  // Field configurations registry
  const fieldConfigs = useRef<Record<string, FormFieldConfig>>({});
  
  // Initial state
  const initialState: FormState = {
    values: {},
    errors: {},
    touched: {},
    isSubmitting: false,
    isValid: true,
    isDirty: false,
    submitCount: 0
  };

  // Main form state
  const [state, setState] = useState<FormState>(initialState);
  
  // Persistent storage (if enabled)
  const { value: persistedValues, setValue: setPersistedValues } = useLocalStorage(
    storageKey,
    {
      defaultValue: {},
      syncAcrossTabs: false
    }
  );

  /**
   * Get the current form values (including persisted if enabled)
   */
  const currentValues = useMemo(() => {
    if (persistState) {
      return { ...persistedValues, ...state.values };
    }
    return state.values;
  }, [persistState, persistedValues, state.values]);

  /**
   * Update form state with new values
   */
  const updateState = useCallback((updater: (prevState: FormState) => FormState) => {
    setState(prevState => {
      const newState = updater(prevState);
      
      // Persist values if enabled
      if (persistState) {
        setPersistedValues(newState.values);
      }
      
      return newState;
    });
  }, [persistState, setPersistedValues]);

  /**
   * Internal field validation function
   */
  const validateFieldInternal = useCallback((fieldName: string, value: any, allValues: Record<string, any>): string | null => {
    const config = fieldConfigs.current[fieldName];
    if (!config) return null;
    
    // Required validation
    if (config.required && (value === undefined || value === null || value === '')) {
      return config.requiredMessage || `${fieldName} is required`;
    }
    
    // Custom validation
    if (config.validator) {
      return config.validator(value, allValues);
    }
    
    return null;
  }, []);

  /**
   * Register a field with its configuration
   */
  const registerField = useCallback(<T = any>(fieldName: string, config: FormFieldConfig<T>) => {
    fieldConfigs.current[fieldName] = config;
    
    // Set initial value if provided and field doesn't have a value yet
    if (config.initialValue !== undefined && !(fieldName in currentValues)) {
      setValue(fieldName, config.initialValue);
    }
  }, [currentValues]);

  /**
   * Unregister a field
   */
  const unregisterField = useCallback((fieldName: string) => {
    delete fieldConfigs.current[fieldName];
    
    updateState(prevState => {
      const newValues = { ...prevState.values };
      const newErrors = { ...prevState.errors };
      const newTouched = { ...prevState.touched };
      
      delete newValues[fieldName];
      delete newErrors[fieldName];  
      delete newTouched[fieldName];
      
      return {
        ...prevState,
        values: newValues,
        errors: newErrors,
        touched: newTouched
      };
    });
  }, [updateState]);

  /**
   * Get value for a specific field
   */
  const getValue = useCallback(<T = any>(fieldName: string): T => {
    return currentValues[fieldName] as T;
  }, [currentValues]);

  /**
   * Set value for a specific field
   */
  const setValue = useCallback(<T = any>(fieldName: string, value: T) => {
    updateState(prevState => {
      const newValues = { ...prevState.values, [fieldName]: value };
      const config = fieldConfigs.current[fieldName];
      
      let newErrors = { ...prevState.errors };
      
      // Validate on change if configured
      if (config?.validateOnChange !== false) {
        const error = validateFieldInternal(fieldName, value, newValues);
        if (error) {
          newErrors[fieldName] = error;
        } else {
          delete newErrors[fieldName];
        }
      }
      
      return {
        ...prevState,
        values: newValues,
        errors: newErrors,
        isDirty: true,
        isValid: Object.keys(newErrors).length === 0
      };
    });
  }, [updateState, validateFieldInternal]);

  /**
   * Validate a specific field
   */
  const validateField = useCallback((fieldName: string): string | null => {
    const value = getValue(fieldName);
    const error = validateFieldInternal(fieldName, value, currentValues);
    
    updateState(prevState => {
      const newErrors = { ...prevState.errors };
      if (error) {
        newErrors[fieldName] = error;
      } else {
        delete newErrors[fieldName];
      }
      
      return {
        ...prevState,
        errors: newErrors,
        isValid: Object.keys(newErrors).filter(key => newErrors[key]).length === 0
      };
    });
    
    return error;
  }, [getValue, currentValues, validateFieldInternal, updateState]);

  /**
   * Validate all fields
   */
  const validateAll = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    
    Object.keys(fieldConfigs.current).forEach(fieldName => {
      const value = getValue(fieldName);
      const error = validateFieldInternal(fieldName, value, currentValues);
      if (error) {
        errors[fieldName] = error;
      }
    });
    
    updateState(prevState => ({
      ...prevState,
      errors,
      isValid: Object.keys(errors).length === 0
    }));
    
    return Object.keys(errors).length === 0;
  }, [getValue, currentValues, validateFieldInternal, updateState]);

  /**
   * Get error for a specific field
   */
  const getError = useCallback((fieldName: string): string | null => {
    return state.errors[fieldName] || null;
  }, [state.errors]);

  /**
   * Set error for a specific field
   */
  const setError = useCallback((fieldName: string, error: string | null) => {
    updateState(prevState => {
      const newErrors = { ...prevState.errors };
      if (error) {
        newErrors[fieldName] = error;
      } else {
        delete newErrors[fieldName];
      }
      
      return {
        ...prevState,
        errors: newErrors,
        isValid: Object.keys(newErrors).length === 0
      };
    });
  }, [updateState]);

  /**
   * Mark field as touched
   */
  const setTouched = useCallback((fieldName: string, touched = true) => {
    updateState(prevState => ({
      ...prevState,
      touched: { ...prevState.touched, [fieldName]: touched }
    }));
    
    // Validate on blur if configured
    if (touched) {
      const config = fieldConfigs.current[fieldName];
      if (config?.validateOnBlur !== false) {
        validateField(fieldName);
      }
    }
  }, [updateState, validateField]);

  /**
   * Submit the form
   */
  const handleSubmit = useCallback(async (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }
    
    updateState(prevState => ({
      ...prevState,
      isSubmitting: true,
      submitCount: prevState.submitCount + 1
    }));
    
    try {
      // Validate if required
      if (validateOnSubmit) {
        const isValid = validateAll();
        if (!isValid) {
          updateState(prevState => ({ ...prevState, isSubmitting: false }));
          return;
        }
      }
      
      // Call submit handler
      if (onSubmit) {
        await onSubmit(currentValues);
      }
      
      // Reset form if configured
      if (resetOnSubmit) {
        reset();
      }
      
    } catch (error) {
      if (onSubmitError) {
        onSubmitError(error as Error);
      }
      console.error('Form submission error:', error);
    } finally {
      updateState(prevState => ({ ...prevState, isSubmitting: false }));
    }
  }, [validateOnSubmit, validateAll, onSubmit, currentValues, resetOnSubmit, onSubmitError, updateState]);

  /**
   * Reset form to initial state
   */
  const reset = useCallback(() => {
    setState(initialState);
    if (persistState) {
      setPersistedValues({});
    }
  }, [persistState, setPersistedValues]);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    updateState(prevState => ({
      ...prevState,
      errors: {},
      isValid: true
    }));
  }, [updateState]);

  /**
   * Check if a field is valid
   */
  const isFieldValid = useCallback((fieldName: string): boolean => {
    return !state.errors[fieldName];
  }, [state.errors]);

  /**
   * Check if field has been touched
   */
  const isFieldTouched = useCallback((fieldName: string): boolean => {
    return !!state.touched[fieldName];
  }, [state.touched]);

  return {
    state: {
      ...state,
      values: currentValues
    },
    getValue,
    setValue,
    getError,
    setError,
    setTouched,
    validateField,
    validateAll,
    handleSubmit,
    reset,
    clearErrors,
    isFieldValid,
    isFieldTouched,
    registerField,
    unregisterField
  };
} 