/**
 * State Store Utility
 * 
 * Provides a centralized state management solution that unifies React Query (server state),
 * Context API (client state), and localStorage (persistent state). This utility serves as
 * the foundation for state management across the OpsSight application.
 */

import { QueryClient } from '@tanstack/react-query';
import { getQueryClient } from './query-client';

// State store configuration
export interface StateStoreConfig {
  /** Whether to enable debug logging */
  debug?: boolean;
  /** Prefix for localStorage keys */
  storagePrefix?: string;
  /** Query client instance (optional, uses singleton if not provided) */
  queryClient?: QueryClient;
}

// Persistent state configuration
export interface PersistentStateConfig<T> {
  /** Storage key */
  key: string;
  /** Default value */
  defaultValue: T;
  /** Validation function */
  validator?: (value: any) => value is T;
  /** Serialization options */
  serializer?: {
    serialize: (value: T) => string;
    deserialize: (value: string) => T;
  };
  /** Whether to sync across tabs */
  syncAcrossTabs?: boolean;
}

// State store events
export type StateStoreEvent = 
  | { type: 'STORAGE_CHANGED'; key: string; newValue: any; oldValue: any }
  | { type: 'QUERY_INVALIDATED'; queryKey: string[] }
  | { type: 'CONTEXT_UPDATED'; contextName: string; newState: any };

// Event listener type
export type StateStoreListener = (event: StateStoreEvent) => void;

/**
 * Centralized State Store
 * 
 * Provides a unified interface for managing all types of application state:
 * - Server state (React Query)
 * - Client state (Context + localStorage)
 * - Persistent state (localStorage with validation)
 */
class StateStore {
  private config: StateStoreConfig;
  private queryClient: QueryClient;
  private listeners: Set<StateStoreListener> = new Set();
  private persistentStates: Map<string, any> = new Map();

  constructor(config: StateStoreConfig = {}) {
    this.config = {
      debug: process.env.NODE_ENV === 'development',
      storagePrefix: 'opsight',
      ...config
    };
    
    this.queryClient = config.queryClient || getQueryClient();
    this.initializeStorageListener();
  }

  /**
   * Initialize storage event listener for cross-tab synchronization
   */
  private initializeStorageListener() {
    if (typeof window === 'undefined') return;

    window.addEventListener('storage', (event) => {
      if (!event.key?.startsWith(this.config.storagePrefix!)) return;

      const key = event.key.replace(`${this.config.storagePrefix}_`, '');
      let newValue: any = null;
      let oldValue: any = null;

      try {
        if (event.newValue) {
          newValue = JSON.parse(event.newValue);
        }
        if (event.oldValue) {
          oldValue = JSON.parse(event.oldValue);
        }
      } catch (error) {
        this.log('Failed to parse storage event values:', error);
        return;
      }

      this.emit({
        type: 'STORAGE_CHANGED',
        key,
        newValue,
        oldValue
      });

      // Update local persistent state
      if (this.persistentStates.has(key)) {
        this.persistentStates.set(key, newValue);
      }
    });
  }

  /**
   * Debug logging utility
   */
  private log(...args: any[]) {
    if (this.config.debug) {
      console.log('[StateStore]', ...args);
    }
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: StateStoreEvent) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('State store listener error:', error);
      }
    });
  }

  /**
   * Add an event listener
   */
  subscribe(listener: StateStoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get the storage key with prefix
   */
  private getStorageKey(key: string): string {
    return `${this.config.storagePrefix}_${key}`;
  }

  /**
   * Manage persistent state with validation and synchronization
   */
  createPersistentState<T>(config: PersistentStateConfig<T>) {
    const storageKey = this.getStorageKey(config.key);
    const { defaultValue, validator, serializer, syncAcrossTabs = true } = config;

    // Default serializer
    const defaultSerializer = {
      serialize: JSON.stringify,
      deserialize: JSON.parse
    };
    const ser = serializer || defaultSerializer;

    // Load initial value
    let initialValue = defaultValue;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored !== null) {
          const parsed = ser.deserialize(stored);
          if (!validator || validator(parsed)) {
            initialValue = parsed;
          } else {
            this.log(`Invalid stored value for key "${config.key}", using default`);
          }
        }
      } catch (error) {
        this.log(`Failed to load persistent state "${config.key}":`, error);
      }
    }

    this.persistentStates.set(config.key, initialValue);

    return {
      /**
       * Get current value
       */
      getValue: (): T => {
        return this.persistentStates.get(config.key) ?? defaultValue;
      },

      /**
       * Set new value with validation and persistence
       */
      setValue: (value: T | ((prev: T) => T)): void => {
        const currentValue = this.persistentStates.get(config.key) ?? defaultValue;
        const newValue = typeof value === 'function' ? (value as (prev: T) => T)(currentValue) : value;

        // Validate if validator provided
        if (validator && !validator(newValue)) {
          throw new Error(`Invalid value for persistent state "${config.key}"`);
        }

        const oldValue = currentValue;
        this.persistentStates.set(config.key, newValue);

        // Persist to localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(storageKey, ser.serialize(newValue));
          } catch (error) {
            this.log(`Failed to persist state "${config.key}":`, error);
          }
        }

        this.emit({
          type: 'STORAGE_CHANGED',
          key: config.key,
          newValue,
          oldValue
        });

        this.log(`Persistent state "${config.key}" updated:`, { oldValue, newValue });
      },

      /**
       * Remove the persistent state
       */
      removeValue: (): void => {
        const oldValue = this.persistentStates.get(config.key);
        this.persistentStates.set(config.key, defaultValue);

        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(storageKey);
          } catch (error) {
            this.log(`Failed to remove persistent state "${config.key}":`, error);
          }
        }

        this.emit({
          type: 'STORAGE_CHANGED',
          key: config.key,
          newValue: defaultValue,
          oldValue
        });
      },

      /**
       * Subscribe to changes for this specific state
       */
      subscribe: (callback: (newValue: T, oldValue: T) => void): (() => void) => {
        const listener: StateStoreListener = (event) => {
          if (event.type === 'STORAGE_CHANGED' && event.key === config.key) {
            callback(event.newValue, event.oldValue);
          }
        };
        return this.subscribe(listener);
      }
    };
  }

  /**
   * Server state utilities (React Query wrappers)
   */
  server = {
    /**
     * Get query client instance
     */
    getClient: () => this.queryClient,

    /**
     * Invalidate queries with event emission
     */
    invalidateQueries: (queryKey: string[]) => {
      this.queryClient.invalidateQueries({ queryKey });
      this.emit({
        type: 'QUERY_INVALIDATED',
        queryKey
      });
      this.log('Queries invalidated:', queryKey);
    },

    /**
     * Clear all query cache
     */
    clearCache: () => {
      this.queryClient.clear();
      this.log('Query cache cleared');
    },

    /**
     * Get cached query data
     */
    getCachedData: <T = any>(queryKey: string[]): T | undefined => {
      return this.queryClient.getQueryData<T>(queryKey);
    },

    /**
     * Set query data manually
     */
    setQueryData: <T = any>(queryKey: string[], data: T) => {
      this.queryClient.setQueryData(queryKey, data);
      this.log('Query data set:', { queryKey, data });
    }
  };

  /**
   * Context state utilities
   */
  context = {
    /**
     * Emit context update event
     */
    notifyUpdate: (contextName: string, newState: any) => {
      this.emit({
        type: 'CONTEXT_UPDATED',
        contextName,
        newState
      });
      this.log(`Context "${contextName}" updated:`, newState);
    }
  };

  /**
   * Get all current persistent states (for debugging)
   */
  getAllPersistentStates(): Record<string, any> {
    return Object.fromEntries(this.persistentStates);
  }

  /**
   * Clear all persistent states
   */
  clearAllPersistentStates(): void {
    this.persistentStates.clear();
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(this.config.storagePrefix!)) {
          localStorage.removeItem(key);
        }
      });
    }
    this.log('All persistent states cleared');
  }
}

// Create singleton instance
let stateStoreInstance: StateStore | null = null;

/**
 * Get the global state store instance
 */
export function getStateStore(config?: StateStoreConfig): StateStore {
  if (!stateStoreInstance) {
    stateStoreInstance = new StateStore(config);
  }
  return stateStoreInstance;
}

/**
 * Create a persistent state with the global store
 */
export function createPersistentState<T>(config: PersistentStateConfig<T>) {
  return getStateStore().createPersistentState(config);
}

/**
 * Hook for accessing the state store in React components
 */
export function useStateStore() {
  return getStateStore();
} 